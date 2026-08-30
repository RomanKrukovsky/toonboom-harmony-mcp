"""Apply an animation plan and certify the result in native Moho."""

from __future__ import annotations

import argparse
import json
import math
import os
import tempfile
from pathlib import Path
from typing import Any, Optional

from ..moho.emit import emit
from ..moho.extract import extract_from_file
from ..pir.schema import Bone, Channel, Part, Rig
from .moho_native_acceptance import accept_project
from .moho_readiness import (
    REQUIRED_IK,
    REQUIRED_MESHES,
    diagnostic_differences,
    foreground_metrics,
    structural_snapshot,
)


INTERP = {
    "im": 1, "v1": -1.0, "v2": -1.0,
    "in": 1, "h": 0, "s": False, "t": 0,
}


def find_bone(rig: Rig, name: str) -> Optional[Bone]:
    return next((bone for bone in rig.bones if bone.id == name), None)


def find_switch(rig: Rig, name: str) -> Optional[Part]:
    return next(
        (
            part for part in rig.walk_parts()
            if part.type == "switch" and part.name == name
        ),
        None,
    )


def add_angle_keyframes(bone: Bone, keyframes: list[dict[str, Any]]) -> None:
    existing_when = list(bone.angle_channel.when) if bone.angle_channel else [0]
    existing_val = list(bone.angle_channel.val) if bone.angle_channel else [bone.angle]
    pairs = dict(zip(existing_when, existing_val))
    for keyframe in keyframes:
        pairs[int(keyframe["frame"])] = float(keyframe["value"])
    sorted_pairs = sorted(pairs.items())
    bone.angle_channel = Channel(
        type="Val",
        when=[pair[0] for pair in sorted_pairs],
        val=[pair[1] for pair in sorted_pairs],
        interp=[dict(INTERP) for _ in sorted_pairs],
    )


def add_pos_keyframes(bone: Bone, keyframes: list[dict[str, Any]]) -> None:
    existing_when = list(bone.pos_channel.when) if bone.pos_channel else [0]
    existing_val = (
        list(bone.pos_channel.val)
        if bone.pos_channel
        else [{"x": bone.position[0], "y": bone.position[1]}]
    )
    pairs: dict[int, tuple[float, float]] = {}
    for frame, value in zip(existing_when, existing_val):
        if isinstance(value, dict):
            pairs[int(frame)] = (float(value["x"]), float(value["y"]))
        else:
            pairs[int(frame)] = bone.position
    for keyframe in keyframes:
        pairs[int(keyframe["frame"])] = (
            float(keyframe.get("x", bone.position[0])),
            float(keyframe.get("y", bone.position[1])),
        )
    sorted_pairs = sorted(pairs.items())
    bone.pos_channel = Channel(
        type="Vec2",
        when=[pair[0] for pair in sorted_pairs],
        val=[{"x": pair[1][0], "y": pair[1][1]} for pair in sorted_pairs],
        interp=[dict(INTERP) for _ in sorted_pairs],
    )


def add_switch_keyframes(
    rig: Rig,
    switch_name: str,
    keyframes: list[dict[str, Any]],
) -> bool:
    switch = find_switch(rig, switch_name)
    if switch is None or not switch.switch_states:
        return False
    existing_when = list(switch.switch_channel.when) if switch.switch_channel else [0]
    existing_val = (
        list(switch.switch_channel.val)
        if switch.switch_channel else [switch.switch_states[0]]
    )
    pairs = dict(zip(existing_when, existing_val))
    state_lookup = {state.casefold(): state for state in switch.switch_states}
    for keyframe in keyframes:
        requested = str(keyframe["state"])
        state = state_lookup.get(requested.casefold())
        if state is None:
            return False
        pairs[int(keyframe["frame"])] = state
    sorted_pairs = sorted(pairs.items())
    switch.switch_channel = Channel(
        type="String",
        when=[pair[0] for pair in sorted_pairs],
        val=[pair[1] for pair in sorted_pairs],
        interp=[{**INTERP, "im": 0} for _ in sorted_pairs],
    )
    return True


def _dial_value(bone: Bone, index: int, fallback: float = 0.0) -> float:
    for action in bone.dial_actions or []:
        pose = action.get("pose") or {}
        values = pose.get("val", [])
        if 0 <= index < len(values):
            return float(values[index])
    return fallback


def _set_animated_value(
    rig: Rig,
    name: str,
    channel_type: str,
    when: list[int],
    values: list[Any],
) -> None:
    animated_values = rig.extras.setdefault("animatedValues", {})
    animated_values[name] = {
        "type": channel_type,
        "when": when,
        "val": values,
        "interp": [dict(INTERP) for _ in when],
    }


def _require_bones(rig: Rig, names: set[str], errors: list[str]) -> dict[str, Bone]:
    bone_map = {bone.id: bone for bone in rig.bones}
    missing = sorted(names - set(bone_map))
    if missing:
        errors.append("missing required bones: " + ", ".join(missing))
    return bone_map


def apply_animation_plan(
    project_path: str,
    plan: dict[str, Any],
    output_path: str,
) -> dict[str, Any]:
    """Apply every supported request, failing when a requested feature is unavailable."""
    rig = extract_from_file(project_path)
    errors: list[str] = []
    applied: list[str] = []
    bone_map = _require_bones(
        rig,
        set(REQUIRED_IK) | set(REQUIRED_IK.values()) | {
            "UpperArm L", "UpperArm R", "Body", "Head",
            "Head Switch", "Eyes Switch", "Mouth Switch", "Hair Helper",
        },
        errors,
    )
    if errors:
        return {"status": "failed", "errors": errors, "applied": applied}

    for action in plan.get("actions", []):
        action_type = action.get("type")
        if action_type != "walk":
            errors.append(f"unsupported action type: {action_type}")
            continue
        start = int(action.get("startFrame", 1))
        end = int(action.get("endFrame", 40))
        if end <= start:
            errors.append("walk endFrame must be greater than startFrame")
            continue
        quarter = max(1, (end - start) // 4)
        for side, phase in (("L", 0), ("R", 2)):
            target = bone_map[f"Target Leg {side}"]
            frames = [start, start + quarter, start + 2 * quarter,
                      start + 3 * quarter, end]
            offsets = [0.0, 0.28, 0.0, -0.12, 0.0]
            offsets = offsets[phase:] + offsets[:phase] if phase else offsets
            add_pos_keyframes(target, [
                {
                    "frame": frame,
                    "x": target.position[0] + offset,
                    "y": target.position[1] + (0.10 if offset > 0 else 0.0),
                }
                for frame, offset in zip(frames, offsets)
            ])
        for side, direction in (("L", -1.0), ("R", 1.0)):
            arm = bone_map[f"UpperArm {side}"]
            add_angle_keyframes(arm, [
                {"frame": start, "value": arm.angle},
                {"frame": start + quarter, "value": arm.angle + direction * math.radians(35)},
                {"frame": start + 2 * quarter, "value": arm.angle},
                {"frame": start + 3 * quarter, "value": arm.angle - direction * math.radians(20)},
                {"frame": end, "value": arm.angle},
            ])
        applied.append("walk")

    eyes = bone_map["Eyes Switch"]
    for blink in plan.get("blinks", []):
        frame = int(blink.get("frame", 24))
        duration = max(1, int(blink.get("duration", 3)))
        add_angle_keyframes(eyes, [
            {"frame": frame, "value": _dial_value(eyes, 1)},
            {"frame": frame + duration, "value": _dial_value(eyes, 0)},
        ])
        applied.append(f"blink:{frame}")

    mouth = bone_map["Mouth Switch"]
    phoneme_index = {"rest": 0, "closed": 0, "a": 1, "o": 2, "i": 3, "u": 4, "e": 5}
    for phrase in plan.get("phonemes", []):
        start = int(phrase.get("startFrame", 1))
        end = int(phrase.get("endFrame", start + 1))
        sequence = phrase.get("phonemeSequence", ["rest"])
        if not sequence or end <= start:
            errors.append("phoneme phrase must have a non-empty sequence and positive duration")
            continue
        step = max(1, (end - start) // len(sequence))
        keys: list[dict[str, Any]] = []
        for index, phoneme in enumerate(sequence):
            normalized = str(phoneme).casefold()
            if normalized not in phoneme_index:
                errors.append(f"unsupported phoneme: {phoneme}")
                continue
            keys.append({
                "frame": start + index * step,
                "value": _dial_value(mouth, phoneme_index[normalized]),
            })
        add_angle_keyframes(mouth, keys)
        applied.append(f"phonemes:{start}-{end}")

    for gesture in plan.get("gestures", []):
        if gesture.get("type") != "hand-swap":
            errors.append(f"unsupported gesture type: {gesture.get('type')}")
            continue
        frame = int(gesture.get("frame", 1))
        state = str(gesture.get("newHand", "Relaxed"))
        left_ok = add_switch_keyframes(
            rig, "Hand Switch L", [{"frame": frame, "state": state}],
        )
        right_ok = add_switch_keyframes(
            rig, "Hand Switch R", [{"frame": frame, "state": state}],
        )
        if not left_ok or not right_ok:
            errors.append(f"hand pose is unavailable: {state}")
        else:
            applied.append(f"hands:{state}:{frame}")

    head_switch = bone_map["Head Switch"]
    for gaze in plan.get("gaze", []):
        if gaze.get("target") != "camera":
            errors.append(f"unsupported gaze target: {gaze.get('target')}")
            continue
        start = int(gaze.get("startFrame", 1))
        end = int(gaze.get("endFrame", start + 1))
        middle = start + max(1, (end - start) // 2)
        add_angle_keyframes(head_switch, [
            {"frame": start, "value": _dial_value(head_switch, 0, head_switch.angle)},
            {"frame": middle, "value": _dial_value(head_switch, 3, head_switch.angle)},
            {"frame": end, "value": _dial_value(head_switch, 0, head_switch.angle)},
        ])
        applied.append(f"gaze:{start}-{end}")

    for pose in plan.get("keyPoses", []):
        frame = int(pose.get("frame", 1))
        emotion = str(pose.get("pose", "neutral")).casefold()
        emotion_angles = {
            "neutral": 0.0, "happy": math.radians(-4), "sad": math.radians(5),
            "angry": math.radians(-7), "surprised": math.radians(3),
        }
        if emotion not in emotion_angles:
            errors.append(f"unsupported key pose: {emotion}")
            continue
        body = bone_map["Body"]
        head = bone_map["Head"]
        add_angle_keyframes(body, [{"frame": frame, "value": body.angle + emotion_angles[emotion]}])
        add_angle_keyframes(head, [{"frame": frame, "value": head.angle - emotion_angles[emotion]}])
        applied.append(f"pose:{emotion}:{frame}")

    for motion in plan.get("secondaryMotion", []):
        if motion.get("type") != "hair-follow-through":
            errors.append(f"unsupported secondary motion: {motion.get('type')}")
            continue
        magnitude = max(0.0, min(1.0, float(motion.get("magnitude", 0.5))))
        helper = bone_map["Hair Helper"]
        inspection = [int(frame) for frame in plan.get("inspectionFrames", [1, 12, 24])]
        start, end = min(inspection), max(inspection)
        middle = start + max(1, (end - start) // 2)
        add_angle_keyframes(helper, [
            {"frame": start, "value": helper.angle},
            {"frame": middle, "value": helper.angle + math.radians(18) * magnitude},
            {"frame": end, "value": helper.angle},
        ])
        applied.append("hair-follow-through")

    for target_spec in plan.get("ikTargets", []):
        requested = str(target_spec.get("bone", ""))
        normalized = requested.replace("_", " ")
        aliases = {"Foot L": "Foot L", "Foot R": "Foot R"}
        target_bone = bone_map.get(aliases.get(normalized, normalized))
        if target_bone is None:
            errors.append(f"IK lock bone is unavailable: {requested}")
            continue
        target_bone.ik_lock = bool(target_spec.get("lock", True))
        applied.append(f"ik-lock:{target_bone.id}")

    for camera in plan.get("camera", []):
        camera_type = camera.get("type", "static")
        start = int(camera.get("startFrame", 1))
        end = int(camera.get("endFrame", start + 1))
        middle = start + max(1, (end - start) // 2)
        if camera_type == "static":
            _set_animated_value(rig, "camera_zoom", "Val", [0], [2.0])
        elif camera_type == "push-in":
            amount = max(0.05, min(1.0, float(camera.get("scaleZ", 0.5))))
            _set_animated_value(
                rig, "camera_zoom", "Val",
                [0, start, end], [2.0, 2.0, 2.0 + amount],
            )
        elif camera_type in {"whip-pan", "tracking"}:
            offset = float(camera.get("offsetX", 0.6))
            _set_animated_value(
                rig, "camera_track", "Vec3", [0, start, middle, end],
                [
                    {"x": 0.0, "y": 0.0, "z": 3.732051},
                    {"x": 0.0, "y": 0.0, "z": 3.732051},
                    {"x": offset, "y": 0.0, "z": 3.732051},
                    {"x": offset if camera_type == "tracking" else 0.0,
                     "y": 0.0, "z": 3.732051},
                ],
            )
        else:
            errors.append(f"unsupported camera move: {camera_type}")
            continue
        applied.append(f"camera:{camera_type}")

    if errors:
        return {"status": "failed", "errors": errors, "applied": applied}
    project_data = rig.extras.setdefault("project_data", {})
    all_frames = [
        int(frame) for frame in plan.get("inspectionFrames", []) if int(frame) > 0
    ]
    if all_frames:
        project_data["end_frame"] = max(int(project_data.get("end_frame", 1)), max(all_frames))
    emit(rig, output_path)
    return {"status": "success", "errors": [], "applied": applied}


def _same_rig_structure(before: dict[str, Any], after: dict[str, Any]) -> bool:
    keys = ("bones", "boneParents", "ikTargets", "switches", "meshLayers", "boundMeshCount")
    return all(before.get(key) == after.get(key) for key in keys)


def animate_and_certify(
    project_path: str,
    plan: dict[str, Any],
    output_path: str,
    evidence_dir: str,
) -> dict[str, Any]:
    source = Path(project_path).resolve()
    output = Path(output_path).resolve()
    evidence = Path(evidence_dir).resolve()
    evidence.mkdir(parents=True, exist_ok=True)
    errors: list[str] = []
    gates: list[dict[str, Any]] = []
    if not source.is_file():
        return {
            "status": "failed", "certified": False, "score": 0,
            "output_path": str(output), "evidence_directory": str(evidence),
            "errors": [f"input project does not exist: {source}"], "gates": [],
            "frame_differences": [], "applied": [],
        }
    output.parent.mkdir(parents=True, exist_ok=True)
    before = structural_snapshot(extract_from_file(str(source)))
    input_ready = (
        REQUIRED_MESHES.issubset(set(before.get("boundMeshNames", [])))
        and all(before.get("ikTargets", {}).get(key) == value for key, value in REQUIRED_IK.items())
    )
    gates.append({
        "name": "certified_input_rig", "weight": 15, "earned": 15 if input_ready else 0,
        "mandatory": True, "passed": input_ready,
        "detail": "Required bound meshes and arm/leg IK are present",
    })
    if not input_ready:
        errors.append("input project is not a complete production humanoid rig")

    with tempfile.TemporaryDirectory(dir=output.parent, prefix=".moho-animation-") as temp_dir:
        candidate = Path(temp_dir) / "candidate.moho"
        application = (
            apply_animation_plan(str(source), plan, str(candidate))
            if input_ready else {"status": "failed", "errors": [], "applied": []}
        )
        errors.extend(application.get("errors", []))
        applied_ok = application.get("status") == "success" and candidate.is_file()
        gates.append({
            "name": "plan_application", "weight": 25, "earned": 25 if applied_ok else 0,
            "mandatory": True, "passed": applied_ok,
            "detail": f"Applied operations: {application.get('applied', [])}",
        })

        after: dict[str, Any] = {}
        structure_ok = False
        if applied_ok:
            after = structural_snapshot(extract_from_file(str(candidate)))
            structure_ok = _same_rig_structure(before, after)
        gates.append({
            "name": "rig_structure_preserved", "weight": 15,
            "earned": 15 if structure_ok else 0, "mandatory": True,
            "passed": structure_ok, "detail": "Bones, bindings, switches and meshes match input",
        })
        if applied_ok and not structure_ok:
            errors.append("animation changed the rig structure")

        frames = sorted({
            int(frame) for frame in plan.get("inspectionFrames", []) if int(frame) > 0
        })
        if len(frames) < 3:
            errors.append("animation plan requires at least three inspection frames")
        native = None
        if applied_ok and structure_ok and len(frames) >= 3:
            native = accept_project(str(candidate), str(evidence / "native"), frames)
            errors.extend(native.errors)
        native_ok = bool(
            native and native.opened and native.saved and native.reopened and not native.errors
        )
        gates.append({
            "name": "native_open_save_reopen", "weight": 25,
            "earned": 25 if native_ok else 0, "mandatory": True,
            "passed": native_ok,
            "detail": (
                f"opened={native.opened}, saved={native.saved}, reopened={native.reopened}"
                if native else "Native acceptance was not run"
            ),
        })

        roundtrip_frames = (
            [path for path in native.rendered_frames if "roundtrip" in Path(path).name]
            if native else []
        )
        differences = diagnostic_differences(roundtrip_frames)
        silhouette = (
            foreground_metrics(roundtrip_frames[0])
            if roundtrip_frames else {"fraction": 0.0}
        )
        threshold = max(0.001, silhouette["fraction"] * 0.02)
        motion_ok = (
            len(roundtrip_frames) == len(frames)
            and len(differences) == len(frames) - 1
            and all(value >= threshold for value in differences)
        )
        gates.append({
            "name": "visible_motion", "weight": 20, "earned": 20 if motion_ok else 0,
            "mandatory": True, "passed": motion_ok,
            "detail": f"differences={differences}, threshold={threshold:.6f}",
        })

        score = sum(gate["earned"] for gate in gates)
        certified = all(gate["passed"] for gate in gates if gate["mandatory"]) and score >= 95
        if certified and candidate.is_file():
            os.replace(candidate, output)
        elif not errors:
            errors.append("animation certification gates did not pass")

    result = {
        "status": "certified" if certified else "failed",
        "certified": certified,
        "score": score,
        "output_path": str(output),
        "evidence_directory": str(evidence),
        "errors": errors,
        "gates": gates,
        "frame_differences": differences,
        "applied": application.get("applied", []),
    }
    (evidence / "animation-report.json").write_text(
        json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8",
    )
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Animate and certify a Moho project")
    parser.add_argument("input_path")
    parser.add_argument("plan_path")
    parser.add_argument("output_path")
    parser.add_argument("--evidence", default="")
    args = parser.parse_args()
    plan = json.loads(Path(args.plan_path).read_text(encoding="utf-8"))
    evidence = args.evidence or str(Path(args.output_path).resolve().parent / "evidence")
    result = animate_and_certify(args.input_path, plan, args.output_path, evidence)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
