"""Core Moho animation engine and certification gates."""

from __future__ import annotations

import json
import math
import os
import tempfile
from pathlib import Path
from typing import Any, Optional

from ..moho.emit import emit
from ..moho.extract import extract_from_file
from ..pir.schema import Bone, Channel, Part, Rig
from ..tools.moho_native_acceptance import accept_project
from ..tools.moho_readiness import (
    REQUIRED_IK,
    REQUIRED_MESHES,
    diagnostic_differences,
    foreground_metrics,
    structural_snapshot,
)
from .cycles import (
    add_angle_keyframes,
    add_pos_keyframes,
    apply_idle_cycle,
    apply_run_cycle,
    apply_walk_cycle,
)
from .lipsync import apply_phonemes_to_rig

INTERP_SMOOTH = {"im": 1, "v1": -1.0, "v2": -1.0, "in": 1, "h": 0, "s": False, "t": 0}
INTERP_STEP = {"im": 0, "v1": 0.1, "v2": 0.5, "in": 1, "h": 0, "s": False, "t": 0}


def find_bone(rig: Rig, name: str) -> Optional[Bone]:
    return next((b for b in rig.bones if b.id == name), None)


def find_switch(rig: Rig, name: str) -> Optional[Part]:
    return next(
        (p for p in rig.walk_parts() if p.type == "switch" and p.name == name),
        None,
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
        if switch.switch_channel
        else [switch.switch_states[0]]
    )
    pairs = dict(zip(existing_when, existing_val))
    state_lookup = {state.casefold(): state for state in switch.switch_states}
    for keyframe in keyframes:
        requested = str(keyframe["state"])
        state = state_lookup.get(requested.casefold())
        if state is None:
            # Try fuzzy fallback
            for s in switch.switch_states:
                if requested.casefold() in s.casefold() or s.casefold() in requested.casefold():
                    state = s
                    break
        if state is None:
            return False
        pairs[int(keyframe["frame"])] = state

    sorted_pairs = sorted(pairs.items())
    switch.switch_channel = Channel(
        type="String",
        when=[pair[0] for pair in sorted_pairs],
        val=[pair[1] for pair in sorted_pairs],
        interp=[dict(INTERP_STEP) for _ in sorted_pairs],
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
        "interp": [dict(INTERP_SMOOTH) for _ in when],
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
    """Apply complete animation pass to a Moho project according to the structured plan."""
    try:
        rig = extract_from_file(project_path)
    except Exception as exc:
        return {"status": "failed", "errors": [f"failed to load rig: {exc}"], "applied": []}

    errors: list[str] = []
    applied: list[str] = []

    required_bones = (
        set(REQUIRED_IK)
        | set(REQUIRED_IK.values())
        | {
            "UpperArm L",
            "UpperArm R",
            "Body",
            "Head",
            "Head Switch",
            "Eyes Switch",
            "Mouth Switch",
            "Hair Helper",
        }
    )
    bone_map = _require_bones(rig, required_bones, errors)
    if errors:
        return {"status": "failed", "errors": errors, "applied": applied}

    # 1. Locomotion & Idle Action Passes
    for action in plan.get("actions", []):
        action_type = action.get("type", "idle").lower()
        start = int(action.get("startFrame", 1))
        end = int(action.get("endFrame", 40))
        if end <= start:
            errors.append(f"{action_type} endFrame must be greater than startFrame")
            continue

        if action_type == "walk":
            ops = apply_walk_cycle(bone_map, start, end)
            applied.extend(ops)
        elif action_type == "run":
            ops = apply_run_cycle(bone_map, start, end)
            applied.extend(ops)
        elif action_type == "idle":
            ops = apply_idle_cycle(bone_map, start, end)
            applied.extend(ops)
        else:
            errors.append(f"unsupported action type: {action_type}")

    # 2. Blinks on Eyes Switch
    eyes = bone_map.get("Eyes Switch")
    if eyes:
        for blink in plan.get("blinks", []):
            frame = int(blink.get("frame", 24))
            duration = max(1, int(blink.get("duration", 3)))
            add_angle_keyframes(
                eyes,
                [
                    {"frame": frame, "value": _dial_value(eyes, 1)},
                    {"frame": frame + duration, "value": _dial_value(eyes, 0)},
                ],
            )
            applied.append(f"blink:{frame}")

    # 3. 6+1 Lip-Sync Pass
    mouth_bone = bone_map.get("Mouth Switch")
    phonemes = plan.get("phonemes", [])
    if phonemes:
        lp_ops = apply_phonemes_to_rig(rig, mouth_bone, phonemes)
        applied.extend(lp_ops)

    # 4. Hand Switches & Gestures
    for gesture in plan.get("gestures", []):
        gtype = gesture.get("type", "hand-swap")
        frame = int(gesture.get("frame", 1))
        state = str(gesture.get("newHand", "Relaxed"))
        if gtype == "hand-swap":
            left_ok = add_switch_keyframes(rig, "Hand Switch L", [{"frame": frame, "state": state}])
            right_ok = add_switch_keyframes(rig, "Hand Switch R", [{"frame": frame, "state": state}])
            if left_ok or right_ok:
                applied.append(f"hands:{state}:{frame}")
            else:
                errors.append(f"hand pose is unavailable: {state}")
        else:
            errors.append(f"unsupported gesture type: {gtype}")

    # 5. Look Target / Gaze Pass
    head_switch = bone_map.get("Head Switch")
    for gaze in plan.get("gaze", []):
        target = gaze.get("target", "camera").lower()
        start = int(gaze.get("startFrame", 1))
        end = int(gaze.get("endFrame", start + 1))
        middle = start + max(1, (end - start) // 2)

        if head_switch:
            if target == "camera":
                add_angle_keyframes(
                    head_switch,
                    [
                        {"frame": start, "value": _dial_value(head_switch, 0, head_switch.angle)},
                        {"frame": middle, "value": _dial_value(head_switch, 3, head_switch.angle)},
                        {"frame": end, "value": _dial_value(head_switch, 0, head_switch.angle)},
                    ],
                )
            elif target == "left":
                add_angle_keyframes(
                    head_switch,
                    [
                        {"frame": start, "value": _dial_value(head_switch, 0, head_switch.angle)},
                        {"frame": middle, "value": _dial_value(head_switch, 1, head_switch.angle)},
                        {"frame": end, "value": _dial_value(head_switch, 0, head_switch.angle)},
                    ],
                )
            elif target == "right":
                add_angle_keyframes(
                    head_switch,
                    [
                        {"frame": start, "value": _dial_value(head_switch, 0, head_switch.angle)},
                        {"frame": middle, "value": _dial_value(head_switch, 2, head_switch.angle)},
                        {"frame": end, "value": _dial_value(head_switch, 0, head_switch.angle)},
                    ],
                )
            else:
                add_angle_keyframes(
                    head_switch,
                    [
                        {"frame": start, "value": head_switch.angle},
                        {"frame": middle, "value": head_switch.angle},
                        {"frame": end, "value": head_switch.angle},
                    ],
                )
            applied.append(f"gaze:{target}:{start}-{end}")

    # 6. Key Poses & Emotions
    for pose in plan.get("keyPoses", []):
        frame = int(pose.get("frame", 1))
        emotion = str(pose.get("pose", "neutral")).casefold()
        emotion_angles = {
            "neutral": 0.0,
            "happy": math.radians(-4),
            "sad": math.radians(5),
            "angry": math.radians(-7),
            "surprised": math.radians(3),
            "scheming": math.radians(-5),
            "sarcastic": math.radians(4),
        }
        if emotion not in emotion_angles:
            errors.append(f"unsupported key pose: {emotion}")
            continue
        body = bone_map.get("Body")
        head = bone_map.get("Head")
        if body and head:
            add_angle_keyframes(body, [{"frame": frame, "value": body.angle + emotion_angles[emotion]}])
            add_angle_keyframes(head, [{"frame": frame, "value": head.angle - emotion_angles[emotion]}])
            applied.append(f"pose:{emotion}:{frame}")

    # 7. Secondary Motion (Hair / Overlap)
    for motion in plan.get("secondaryMotion", []):
        mtype = motion.get("type")
        if mtype != "hair-follow-through":
            errors.append(f"unsupported secondary motion: {mtype}")
            continue
        magnitude = max(0.0, min(1.0, float(motion.get("magnitude", 0.5))))
        helper = bone_map.get("Hair Helper")
        if helper:
            inspection = [
                int(f)
                for f in plan.get(
                    "diagnosticFrames",
                    plan.get("inspectionFrames", [1, 12, 24]),
                )
            ]
            start, end = min(inspection), max(inspection)
            middle = start + max(1, (end - start) // 2)
            add_angle_keyframes(
                helper,
                [
                    {"frame": start, "value": helper.angle},
                    {"frame": middle, "value": helper.angle + math.radians(18) * magnitude},
                    {"frame": end, "value": helper.angle},
                ],
            )
            applied.append("hair-follow-through")

    # 8. IK Targets Foot Pinning Lock
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

    # 9. Camera Choreography
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
                rig,
                "camera_zoom",
                "Val",
                [0, start, end],
                [2.0, 2.0, 2.0 + amount],
            )
        elif camera_type in {"whip-pan", "tracking"}:
            offset = float(camera.get("offsetX", 0.6))
            _set_animated_value(
                rig,
                "camera_track",
                "Vec3",
                [0, start, middle, end],
                [
                    {"x": 0.0, "y": 0.0, "z": 3.732051},
                    {"x": 0.0, "y": 0.0, "z": 3.732051},
                    {"x": offset, "y": 0.0, "z": 3.732051},
                    {
                        "x": offset if camera_type == "tracking" else 0.0,
                        "y": 0.0,
                        "z": 3.732051,
                    },
                ],
            )
        else:
            errors.append(f"unsupported camera move: {camera_type}")
            continue
        applied.append(f"camera:{camera_type}")

    if errors:
        return {"status": "failed", "errors": errors, "applied": applied}

    # Ensure project timeline length accommodates animation
    project_data = rig.extras.setdefault("project_data", {})
    all_frames = [
        int(f)
        for f in plan.get(
            "diagnosticFrames",
            plan.get("inspectionFrames", []),
        )
        if int(f) > 0
    ]
    for action in plan.get("actions", []):
        all_frames.append(int(action.get("endFrame", 1)))
    if all_frames:
        project_data["end_frame"] = max(
            int(project_data.get("end_frame", 1)), max(all_frames)
        )

    emit(rig, output_path)
    return {"status": "success", "errors": [], "applied": applied}


def _same_rig_structure(before: dict[str, Any], after: dict[str, Any]) -> bool:
    keys = (
        "bones",
        "boneParents",
        "ikTargets",
        "switches",
        "meshLayers",
        "boundMeshCount",
    )
    return all(before.get(key) == after.get(key) for key in keys)


def animate_and_certify(
    project_path: str,
    plan: dict[str, Any],
    output_path: str,
    evidence_dir: str,
) -> dict[str, Any]:
    """Apply animation plan and certify via the 5 fail-closed gates."""
    source = Path(project_path).resolve()
    output = Path(output_path).resolve()
    evidence = Path(evidence_dir).resolve()
    evidence.mkdir(parents=True, exist_ok=True)
    errors: list[str] = []
    gates: list[dict[str, Any]] = []

    if not source.is_file():
        return {
            "status": "failed",
            "certified": False,
            "score": 0,
            "output_path": str(output),
            "evidence_directory": str(evidence),
            "errors": [f"input project does not exist: {source}"],
            "gates": [],
            "frame_differences": [],
            "applied": [],
        }

    output.parent.mkdir(parents=True, exist_ok=True)

    input_ready = False
    before: dict[str, Any] = {}
    try:
        before = structural_snapshot(extract_from_file(str(source)))
        input_ready = (
            REQUIRED_MESHES.issubset(set(before.get("boundMeshNames", [])))
            and all(
                before.get("ikTargets", {}).get(key) == value
                for key, value in REQUIRED_IK.items()
            )
        )
    except Exception as exc:
        errors.append(f"could not read input rig structure: {exc}")

    gates.append({
        "name": "certified_input_rig",
        "weight": 15,
        "earned": 15 if input_ready else 0,
        "mandatory": True,
        "passed": input_ready,
        "detail": "Required bound meshes and arm/leg IK are present" if input_ready else "Input rig validation failed",
    })
    if not input_ready and not errors:
        errors.append("input project is not a complete production humanoid rig")

    differences: list[float] = []
    applied_list: list[str] = []

    with tempfile.TemporaryDirectory(
        dir=output.parent, prefix=".moho-animation-"
    ) as temp_dir:
        candidate = Path(temp_dir) / "candidate.moho"
        application = (
            apply_animation_plan(str(source), plan, str(candidate))
            if input_ready
            else {"status": "failed", "errors": [], "applied": []}
        )
        errors.extend(application.get("errors", []))
        applied_list = application.get("applied", [])
        applied_ok = application.get("status") == "success" and candidate.is_file()
        gates.append({
            "name": "plan_application",
            "weight": 25,
            "earned": 25 if applied_ok else 0,
            "mandatory": True,
            "passed": applied_ok,
            "detail": f"Applied operations: {applied_list}",
        })

        after: dict[str, Any] = {}
        structure_ok = False
        if applied_ok:
            try:
                after = structural_snapshot(extract_from_file(str(candidate)))
                structure_ok = _same_rig_structure(before, after)
            except Exception as exc:
                structure_ok = False
                errors.append(f"candidate structure check failed: {exc}")

        gates.append({
            "name": "rig_structure_preserved",
            "weight": 15,
            "earned": 15 if structure_ok else 0,
            "mandatory": True,
            "passed": structure_ok,
            "detail": "Bones, bindings, switches and meshes match input",
        })
        if applied_ok and not structure_ok:
            errors.append("animation changed the rig structure")

        frames = sorted({
            int(frame)
            for frame in plan.get(
                "diagnosticFrames",
                plan.get("inspectionFrames", []),
            )
            if int(frame) > 0
        })
        if len(frames) < 3:
            errors.append("animation plan requires at least three inspection frames")

        native = None
        if applied_ok and structure_ok and len(frames) >= 3:
            native = accept_project(str(candidate), str(evidence / "native"), frames)
            if native and native.errors:
                errors.extend(native.errors)

        native_ok = bool(
            native
            and native.opened
            and native.saved
            and native.reopened
            and not native.errors
        )
        gates.append({
            "name": "native_open_save_reopen",
            "weight": 25,
            "earned": 25 if native_ok else 0,
            "mandatory": True,
            "passed": native_ok,
            "detail": (
                f"opened={native.opened}, saved={native.saved}, reopened={native.reopened}"
                if native
                else "Native acceptance was not run"
            ),
        })

        roundtrip_frames = (
            [
                path
                for path in native.rendered_frames
                if "roundtrip" in Path(path).name
            ]
            if native
            else []
        )
        differences = diagnostic_differences(roundtrip_frames)
        silhouette = (
            foreground_metrics(roundtrip_frames[0])
            if roundtrip_frames
            else {"fraction": 0.0}
        )
        threshold = max(0.001, silhouette["fraction"] * 0.02)
        motion_ok = (
            len(roundtrip_frames) == len(frames)
            and len(differences) == len(frames) - 1
            and all(value >= threshold for value in differences)
        )
        gates.append({
            "name": "visible_motion",
            "weight": 20,
            "earned": 20 if motion_ok else 0,
            "mandatory": True,
            "passed": motion_ok,
            "detail": f"differences={differences}, threshold={threshold:.6f}",
        })

        score = sum(gate["earned"] for gate in gates)
        certified = (
            all(gate["passed"] for gate in gates if gate["mandatory"])
            and score >= 95
        )
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
        "applied": applied_list,
    }
    (evidence / "animation-report.json").write_text(
        json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    return result
