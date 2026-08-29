"""Fail-closed production readiness certification for native Moho rigs."""

from __future__ import annotations

import json
import sys
import uuid
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Optional

from PIL import Image, ImageChops

from ..moho.extract import extract_from_file
from ..pir.schema import Bone, Rig
from ..riggen.humanoid_manifest import build_humanoid_manifest
from .moho_native_acceptance import NativeAcceptanceResult, accept_project


REQUIRED_MESHES = {
    "Torso", "Pelvis", "Neck",
    "UpperArm L", "LowerArm L", "UpperArm R", "LowerArm R",
    "Thigh L", "Shin L", "Foot L", "Thigh R", "Shin R", "Foot R",
}
REQUIRED_PARENTS = {
    "Pelvis": "Main", "Body": "Pelvis", "Neck": "Body", "Head": "Neck",
    "UpperArm L": "Body", "LowerArm L": "UpperArm L",
    "UpperArm R": "Body", "LowerArm R": "UpperArm R",
    "Thigh L": "Pelvis", "Shin L": "Thigh L", "Foot L": "Shin L",
    "Thigh R": "Pelvis", "Shin R": "Thigh R", "Foot R": "Shin R",
}
REQUIRED_IK = {
    "LowerArm L": "Target Arm L", "LowerArm R": "Target Arm R",
    "Shin L": "Target Leg L", "Shin R": "Target Leg R",
}
REQUIRED_CONTROLS = {
    "Head Switch", "Mouth Switch", "Eyes Switch",
    "Hand Switch L", "Hand Switch R",
    "Elbow Correct L", "Elbow Correct R", "Knee Correct L", "Knee Correct R",
    "Target Arm L", "Target Arm R", "Target Leg L", "Target Leg R",
}
REQUIRED_CORRECTIONS = {
    "Elbow Correct L", "Elbow Correct R", "Knee Correct L", "Knee Correct R",
}
MANIFEST_KEYS = (
    "bones", "boneParents", "ikTargets", "switches", "actions", "controls",
    "meshLayers", "boundMeshCount", "diagnosticFrames",
)


@dataclass
class GateResult:
    name: str
    weight: int
    earned: int
    mandatory: bool
    passed: bool
    detail: str = ""


@dataclass
class ReadinessReport:
    score: int
    certified: bool
    mandatory_passed: bool
    gates: list[dict[str, Any]]
    evidence: dict[str, Any]
    errors: list[str]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def compute_image_difference(first_path: str, second_path: str) -> float:
    """Return the fraction of pixels whose RGBA values changed materially."""
    try:
        with Image.open(first_path) as source:
            first = source.convert("RGBA")
        with Image.open(second_path) as source:
            second = source.convert("RGBA")
        if first.size != second.size:
            return 1.0
        difference = ImageChops.difference(first, second)
        changed = sum(
            1 for pixel in difference.get_flattened_data() if max(pixel) > 8
        )
        return changed / float(first.width * first.height)
    except (OSError, ValueError):
        return 0.0


def diagnostic_differences(frame_paths: list[str]) -> list[float]:
    return [
        compute_image_difference(first, second)
        for first, second in zip(frame_paths, frame_paths[1:])
    ]


def foreground_metrics(png_path: str) -> dict[str, float]:
    """Measure a character silhouette against the render's corner background."""
    try:
        with Image.open(png_path) as source:
            image = source.convert("RGB")
        background = image.getpixel((0, 0))
        mask = Image.new("1", image.size)
        foreground = [
            max(
                abs(channel - background[index])
                for index, channel in enumerate(pixel)
            ) > 12
            for pixel in image.get_flattened_data()
        ]
        mask.putdata(foreground)
        bounds = mask.getbbox()
        if bounds is None:
            return {"fraction": 0.0, "width": 0.0, "height": 0.0}
        return {
            "fraction": sum(foreground) / float(image.width * image.height),
            "width": (bounds[2] - bounds[0]) / float(image.width),
            "height": (bounds[3] - bounds[1]) / float(image.height),
        }
    except (OSError, ValueError):
        return {"fraction": 0.0, "width": 0.0, "height": 0.0}


def has_visible_pixels(png_path: str, min_fraction: float = 0.005) -> bool:
    return foreground_metrics(png_path)["fraction"] >= min_fraction


def _point_action_counts(rig: Rig) -> dict[str, int]:
    counts: dict[str, int] = {}
    for part in rig.walk_parts():
        if part.type != "mesh":
            continue
        for point in (part.geometry_raw or {}).get("points", []):
            for action in (point.get("position") or {}).get("actions", []):
                name = action.get("name")
                pose = action.get("pose") or {}
                if isinstance(name, str) and len(pose.get("when", [])) >= 2:
                    counts[name] = counts.get(name, 0) + 1
    return counts


def _bound_mesh_names(rig: Rig) -> list[str]:
    bound: list[str] = []
    bone_count = len(rig.bones)
    for part in rig.walk_parts():
        if part.type != "mesh":
            continue
        points = (part.geometry_raw or {}).get("points", [])
        if points and all(
            isinstance(point.get("parent"), int)
            and 0 <= point["parent"] < bone_count
            for point in points
        ):
            bound.append(part.name)
    return bound


def _frame_zero_ready(rig: Rig) -> bool:
    for bone in rig.bones:
        for channel in (bone.angle_channel, bone.pos_channel):
            if channel is not None and channel.when and channel.when[0] != 0:
                return False
    return True


def structural_snapshot(rig: Rig) -> dict[str, Any]:
    """Derive certification facts from the actual .moho archive only."""
    snapshot = build_humanoid_manifest(rig)
    snapshot.update({
        "boundMeshNames": _bound_mesh_names(rig),
        "pointActionCounts": _point_action_counts(rig),
        "dialLinks": sorted({
            (link.dial_bone_id, link.dial_action_name, link.switch_part_id)
            for link in rig.dial_links
        }),
        "helpers": sorted(bone.id for bone in rig.bones if bone.hidden or bone.shy),
        "frameZeroReady": _frame_zero_ready(rig),
    })
    return snapshot


def _canonical_manifest_value(key: str, value: Any) -> Any:
    if key in {"bones", "actions", "controls", "meshLayers", "diagnosticFrames"}:
        return sorted(value) if isinstance(value, list) else value
    if key == "switches" and isinstance(value, dict):
        return {name: states for name, states in sorted(value.items())}
    if isinstance(value, dict):
        return dict(sorted(value.items()))
    return value


def compare_manifest(
    manifest: dict[str, Any],
    actual: dict[str, Any],
) -> tuple[bool, list[str]]:
    """Cross-check claims against the file; the manifest can never create facts."""
    mismatches = [
        key for key in MANIFEST_KEYS
        if _canonical_manifest_value(key, manifest.get(key))
        != _canonical_manifest_value(key, actual.get(key))
    ]
    return not mismatches, mismatches


def _load_manifest(path: Path) -> tuple[dict[str, Any], Optional[str]]:
    if not path.is_file():
        return {}, f"manifest does not exist: {path}"
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        return {}, f"manifest is invalid: {error}"
    if not isinstance(payload, dict):
        return {}, "manifest root must be an object"
    return payload, None


def _bone_channel_moves(bone: Optional[Bone], frames: list[int]) -> bool:
    if bone is None or bone.pos_channel is None:
        return False
    keyed = {
        int(frame): value
        for frame, value in zip(bone.pos_channel.when, bone.pos_channel.val)
        if int(frame) in frames
    }
    serialized = {json.dumps(value, sort_keys=True) for value in keyed.values()}
    return len(keyed) >= 2 and len(serialized) >= 2


def _render_paths(
    acceptance: NativeAcceptanceResult,
    label: str,
) -> list[str]:
    return [
        path for path in acceptance.rendered_frames if label in Path(path).name
    ]


def score_project(
    project_path: str,
    manifest_path: str,
    evidence_dir: str,
    frames: Optional[list[int]] = None,
) -> ReadinessReport:
    """Evaluate nine production gates with native Moho and measured evidence."""
    project = Path(project_path).resolve()
    manifest_file = Path(manifest_path).resolve()
    evidence_root = Path(evidence_dir).resolve()
    evidence_root.mkdir(parents=True, exist_ok=True)
    errors: list[str] = []

    rig: Optional[Rig] = None
    actual: dict[str, Any] = {}
    try:
        rig = extract_from_file(str(project))
        actual = structural_snapshot(rig)
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as error:
        errors.append(f"project structure could not be read: {error}")

    manifest, manifest_error = _load_manifest(manifest_file)
    if manifest_error:
        errors.append(manifest_error)
    manifest_matches = False
    manifest_mismatches: list[str] = list(MANIFEST_KEYS)
    if actual and not manifest_error:
        manifest_matches, manifest_mismatches = compare_manifest(manifest, actual)
        if not manifest_matches:
            errors.append(
                "manifest does not match project: " + ", ".join(manifest_mismatches)
            )

    actual_frames = actual.get("diagnosticFrames", [])
    requested_frames = frames if frames is not None else actual_frames
    diagnostic_frames = sorted({int(frame) for frame in requested_frames if int(frame) > 0})
    if len(diagnostic_frames) < 4:
        errors.append("project must contain at least four diagnostic frames")
        diagnostic_frames = [1, 12, 24, 36]

    native_dir = evidence_root / f"native-{uuid.uuid4().hex[:8]}"
    acceptance = accept_project(str(project), str(native_dir), diagnostic_frames)
    errors.extend(acceptance.errors)
    source_renders = _render_paths(acceptance, "source")
    roundtrip_renders = _render_paths(acceptance, "roundtrip")
    gates: list[GateResult] = []

    gate_1 = (
        acceptance.opened and acceptance.saved and acceptance.reopened
        and not acceptance.errors and Path(acceptance.roundtrip_path).is_file()
    )
    gates.append(GateResult(
        "open_save_reopen", 15, 15 if gate_1 else 0, True, gate_1,
        f"opened={acceptance.opened}, saved={acceptance.saved}, "
        f"reopened={acceptance.reopened}, errors={len(acceptance.errors)}",
    ))

    bound_names = set(actual.get("boundMeshNames", []))
    neutral_metrics = (
        foreground_metrics(roundtrip_renders[0])
        if roundtrip_renders
        else {"fraction": 0.0, "width": 0.0, "height": 0.0}
    )
    project_data = (rig.extras.get("project_data") or {}) if rig else {}
    canvas_width = float(project_data.get("width", 1) or 1)
    canvas_height = float(project_data.get("height", 1) or 1)
    minimum_width = 0.25 * min(1.0, canvas_height / canvas_width)
    gate_2 = (
        REQUIRED_MESHES.issubset(set(actual.get("meshLayers", [])))
        and REQUIRED_MESHES.issubset(bound_names)
        and neutral_metrics["fraction"] >= 0.02
        and neutral_metrics["width"] >= minimum_width
        and neutral_metrics["height"] >= 0.55
    )
    gates.append(GateResult(
        "visible_figure", 15, 15 if gate_2 else 0, True, gate_2,
        f"requiredMeshes={len(REQUIRED_MESHES & bound_names)}/{len(REQUIRED_MESHES)}, "
        f"silhouette={neutral_metrics}, minimumWidth={minimum_width:.4f}",
    ))

    parents = actual.get("boneParents", {})
    gate_3 = (
        all(parents.get(name) == parent for name, parent in REQUIRED_PARENTS.items())
        and REQUIRED_MESHES.issubset(bound_names)
    )
    gates.append(GateResult(
        "connected_skeleton_binding", 15, 15 if gate_3 else 0, True, gate_3,
        f"hierarchy={sum(parents.get(name) == parent for name, parent in REQUIRED_PARENTS.items())}"
        f"/{len(REQUIRED_PARENTS)}, boundMeshes={len(bound_names)}",
    ))

    bone_map = {bone.id: bone for bone in rig.bones} if rig else {}
    actual_ik = actual.get("ikTargets", {})
    moving_targets = {
        target for target in REQUIRED_IK.values()
        if _bone_channel_moves(bone_map.get(target), diagnostic_frames)
    }
    gate_4 = (
        all(actual_ik.get(bone) == target for bone, target in REQUIRED_IK.items())
        and moving_targets == set(REQUIRED_IK.values())
    )
    gates.append(GateResult(
        "working_ik", 10, 10 if gate_4 else 0, False, gate_4,
        f"targets={actual_ik}, movingTargets={sorted(moving_targets)}",
    ))

    switches = actual.get("switches", {})
    switch_counts = {name: len(states) for name, states in switches.items()}
    gate_5 = (
        switch_counts.get("Head", 0) >= 8
        and switch_counts.get("Mouth", 0) >= 6
        and switch_counts.get("Eyes", 0) >= 4
        and switch_counts.get("Hand Switch L", 0) >= 4
        and switch_counts.get("Hand Switch R", 0) >= 4
    )
    gates.append(GateResult(
        "switches", 15, 15 if gate_5 else 0, False, gate_5,
        f"states={switch_counts}",
    ))

    actions = set(actual.get("actions", []))
    linked_actions = {link[1] for link in actual.get("dialLinks", [])}
    point_actions = actual.get("pointActionCounts", {})
    switch_actions = {
        "Head Switch", "Mouth Switch", "Eyes Switch",
        "Hand Switch L", "Hand Switch R",
    }
    gate_6 = (
        switch_actions.issubset(actions)
        and switch_actions.issubset(linked_actions)
        and REQUIRED_CORRECTIONS.issubset(actions)
        and all(point_actions.get(action, 0) >= 4 for action in REQUIRED_CORRECTIONS)
    )
    gates.append(GateResult(
        "smart_actions", 15, 15 if gate_6 else 0, False, gate_6,
        f"linked={sorted(linked_actions)}, pointActions={point_actions}",
    ))

    clean_controls = {
        bone.id for bone in (rig.bones if rig else [])
        if bone.strength == 0.0 and not bone.hidden
    }
    helper = bone_map.get("Hair Helper")
    gate_7 = (
        REQUIRED_CONTROLS.issubset(clean_controls)
        and helper is not None and helper.hidden and helper.shy
        and bool(actual.get("frameZeroReady"))
    )
    gates.append(GateResult(
        "clean_controls_frame_zero", 5, 5 if gate_7 else 0, False, gate_7,
        f"controls={len(REQUIRED_CONTROLS & clean_controls)}/{len(REQUIRED_CONTROLS)}, "
        f"helperHidden={bool(helper and helper.hidden and helper.shy)}, "
        f"frameZero={actual.get('frameZeroReady', False)}",
    ))

    differences = diagnostic_differences(roundtrip_renders)
    diagnostic_threshold = max(0.002, neutral_metrics["fraction"] * 0.04)
    gate_8 = (
        len(roundtrip_renders) == len(diagnostic_frames)
        and len(differences) == len(diagnostic_frames) - 1
        and all(difference >= diagnostic_threshold for difference in differences)
    )
    gates.append(GateResult(
        "diagnostic_animation", 5, 5 if gate_8 else 0, False, gate_8,
        f"adjacentDifferences={[round(value, 5) for value in differences]}, "
        f"threshold={diagnostic_threshold:.5f}",
    ))

    all_renders = source_renders + roundtrip_renders
    gate_9 = (
        len(source_renders) == len(diagnostic_frames)
        and len(roundtrip_renders) == len(diagnostic_frames)
        and not acceptance.errors
        and all(has_visible_pixels(path) for path in all_renders)
    )
    gates.append(GateResult(
        "real_renders", 5, 5 if gate_9 else 0, True, gate_9,
        f"source={len(source_renders)}/{len(diagnostic_frames)}, "
        f"roundtrip={len(roundtrip_renders)}/{len(diagnostic_frames)}",
    ))

    score = sum(gate.earned for gate in gates)
    mandatory_passed = (
        all(gate.passed for gate in gates if gate.mandatory)
        and manifest_matches and rig is not None
    )
    certified = mandatory_passed and score >= 95
    stdout_path = evidence_root / "moho-stdout.txt"
    stderr_path = evidence_root / "moho-stderr.txt"
    stdout_path.write_text(acceptance.stdout, encoding="utf-8")
    stderr_path.write_text(acceptance.stderr, encoding="utf-8")
    evidence = {
        "roundtrip_path": acceptance.roundtrip_path,
        "rendered_frames": acceptance.rendered_frames,
        "stdout_path": str(stdout_path),
        "stderr_path": str(stderr_path),
        "actual_structure": actual,
        "manifest_matches": manifest_matches,
        "manifest_mismatches": manifest_mismatches,
        "diagnostic_frames": diagnostic_frames,
        "diagnostic_differences": differences,
        "neutral_silhouette": neutral_metrics,
    }
    report = ReadinessReport(
        score=score,
        certified=certified,
        mandatory_passed=mandatory_passed,
        gates=[asdict(gate) for gate in gates],
        evidence=evidence,
        errors=errors,
    )
    (evidence_root / "readiness-report.json").write_text(
        json.dumps(report.to_dict(), indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    return report


def main() -> None:
    if len(sys.argv) < 4:
        print(json.dumps({
            "error": "Usage: python3 -m pipeline.tools.moho_readiness "
            "<project_path> <manifest_path> <evidence_dir>",
        }))
        raise SystemExit(1)
    report = score_project(sys.argv[1], sys.argv[2], sys.argv[3])
    print(json.dumps(report.to_dict()))
    if not report.certified:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
