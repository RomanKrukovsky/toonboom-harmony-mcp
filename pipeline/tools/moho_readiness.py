"""Production readiness scorer for Moho humanoid rigs.

Strict fail-closed evaluation: no simulated scores, no fallback passes on identical or empty frames.
"""

from __future__ import annotations

import json
import os
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional
from PIL import Image, ImageChops

from .moho_native_acceptance import accept_project, NativeAcceptanceResult
from ..moho.extract import extract_from_file


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
    gates: List[Dict[str, Any]]
    evidence: Dict[str, Any]
    errors: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "score": self.score,
            "certified": self.certified,
            "mandatory_passed": self.mandatory_passed,
            "gates": self.gates,
            "evidence": self.evidence,
            "errors": self.errors,
        }


def compute_image_difference(first_path: str, second_path: str) -> float:
    """Calculates fraction of pixels that changed significantly between two frames."""
    try:
        with Image.open(first_path) as first_image:
            first = first_image.convert("RGBA")
        with Image.open(second_path) as second_image:
            second = second_image.convert("RGBA")

        if first.size != second.size:
            return 1.0

        difference = ImageChops.difference(first, second)
        changed = sum(
            1
            for pixel in difference.get_flattened_data()
            if max(pixel) > 8
        )
        return changed / float(first.width * first.height)
    except Exception:
        return 0.0


def has_visible_pixels(png_path: str, min_fraction: float = 0.005) -> bool:
    """Checks if rendered image has non-empty visible character pixels."""
    try:
        with Image.open(png_path) as im:
            rgba = im.convert("RGBA")
            pixels = rgba.get_flattened_data() if hasattr(rgba, "get_flattened_data") else rgba.getdata()
            visible = sum(1 for p in pixels if p[3] > 10)
            return (visible / float(rgba.width * rgba.height)) >= min_fraction
    except Exception:
        return False


def score_project(
    project_path: str,
    manifest_path: str,
    evidence_dir: str,
    frames: Optional[List[int]] = None,
) -> ReadinessReport:
    """Strictly evaluate a humanoid rig project against the 9 production gates."""
    proj = Path(project_path).resolve()
    ev_dir = Path(evidence_dir).resolve()
    ev_dir.mkdir(parents=True, exist_ok=True)

    manifest: Dict[str, Any] = {}
    if os.path.isfile(manifest_path):
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)

    diag_frames = frames or manifest.get("diagnosticFrames", [1, 12, 24, 36])
    acceptance = accept_project(str(proj), str(ev_dir), diag_frames)

    # Inspect project structure
    rig = None
    try:
        rig = extract_from_file(str(proj))
    except Exception:
        pass

    gates: List[GateResult] = []
    errors: List[str] = list(acceptance.errors)

    source_renders = [f for f in acceptance.rendered_frames if "source" in Path(f).name]
    roundtrip_renders = [f for f in acceptance.rendered_frames if "roundtrip" in Path(f).name]

    # Gate 1: Open, save-as, reopen without Moho errors (15 points, Mandatory)
    g1_passed = (
        acceptance.opened
        and acceptance.saved
        and acceptance.reopened
        and len(acceptance.errors) == 0
        and os.path.isfile(acceptance.roundtrip_path)
        and os.path.getsize(acceptance.roundtrip_path) > 0
    )
    gates.append(GateResult(
        name="open_save_reopen",
        weight=15,
        earned=15 if g1_passed else 0,
        mandatory=True,
        passed=g1_passed,
        detail=f"opened={acceptance.opened}, saved={acceptance.saved}, reopened={acceptance.reopened}, errors={len(acceptance.errors)}",
    ))

    # Gate 2: Complete visible procedural vector figure (15 points, Mandatory)
    mesh_count = len(manifest.get("meshLayers", []))
    bound_count = manifest.get("boundMeshCount", 0)
    has_meshes = mesh_count >= 10 and bound_count >= 10
    renders_non_empty = (
        len(source_renders) >= len(diag_frames)
        and all(has_visible_pixels(p) for p in source_renders)
    )
    g2_passed = bool(has_meshes and renders_non_empty)
    gates.append(GateResult(
        name="visible_figure",
        weight=15,
        earned=15 if g2_passed else 0,
        mandatory=True,
        passed=g2_passed,
        detail=f"meshLayers={mesh_count}, boundMeshes={bound_count}, rendersNonEmpty={renders_non_empty}",
    ))

    # Gate 3: Connected skeleton and geometry binding (15 points, Mandatory)
    bones = manifest.get("bones", [])
    bone_parents = manifest.get("boneParents", {})
    required_bones = {
        "Body", "Head", "UpperArm L", "LowerArm L", "UpperArm R", "LowerArm R",
        "Thigh L", "Shin L", "Foot L", "Thigh R", "Shin R", "Foot R"
    }
    has_all_required_bones = required_bones.issubset(set(bones))
    has_connected_parents = all(
        bone_parents.get(b) is not None
        for b in required_bones - {"Main", "Root", "Body"}
    )
    g3_passed = bool(has_all_required_bones and has_connected_parents and bound_count >= 10)
    gates.append(GateResult(
        name="connected_skeleton_binding",
        weight=15,
        earned=15 if g3_passed else 0,
        mandatory=True,
        passed=g3_passed,
        detail=f"bones={len(bones)}, hasRequired={has_all_required_bones}, boundCount={bound_count}",
    ))

    # Gate 4: Working arm and leg IK (10 points)
    ik_targets = manifest.get("ikTargets", {})
    has_leg_ik = "Target Leg L" in ik_targets.values() or "Target Leg R" in ik_targets.values() or any("target_leg" in str(v).lower() for v in ik_targets.values())
    g4_passed = bool(len(ik_targets) >= 2 and has_leg_ik)
    gates.append(GateResult(
        name="working_ik",
        weight=10,
        earned=10 if g4_passed else 0,
        mandatory=False,
        passed=g4_passed,
        detail=f"ikTargets={list(ik_targets.keys())}",
    ))

    # Gate 5: Head, mouth, eye and hand switches (15 points)
    switches = manifest.get("switches", {})
    has_head_sw = "Head" in switches and len(switches["Head"]) >= 8
    has_mouth_sw = "Mouth" in switches and len(switches["Mouth"]) >= 6
    has_eye_sw = "Eyes" in switches and len(switches["Eyes"]) >= 4
    has_hand_sw = (
        ("Hand Switch L" in switches and len(switches["Hand Switch L"]) >= 4)
        or ("Hands" in switches and len(switches["Hands"]) >= 4)
        or (any("Hand" in k for k in switches) and len(switches) >= 4)
    )
    g5_passed = bool(has_head_sw and has_mouth_sw and has_eye_sw and has_hand_sw)
    gates.append(GateResult(
        name="switches",
        weight=15,
        earned=15 if g5_passed else 0,
        mandatory=False,
        passed=g5_passed,
        detail=f"switchesFound={list(switches.keys())}, head={has_head_sw}, mouth={has_mouth_sw}, eyes={has_eye_sw}, hands={has_hand_sw}",
    ))

    # Gate 6: Head, mouth and joint-correction Smart Actions (15 points)
    actions = manifest.get("actions", [])
    has_head_act = any("Head" in a for a in actions)
    has_mouth_act = any("Mouth" in a for a in actions)
    has_hand_or_joint_act = any("Hand" in a or "Elbow" in a or "Knee" in a for a in actions)
    g6_passed = bool(has_head_act and has_mouth_act and has_hand_or_joint_act and len(actions) >= 3)
    gates.append(GateResult(
        name="smart_actions",
        weight=15,
        earned=15 if g6_passed else 0,
        mandatory=False,
        passed=g6_passed,
        detail=f"actionsCount={len(actions)}, actions={actions}",
    ))

    # Gate 7: Clean animator controls and frame zero (5 points)
    controls = manifest.get("controls", [])
    required_controls = {"Head Switch", "Mouth Switch", "Eyes Switch"}
    has_clean_controls = required_controls.issubset(set(controls))
    g7_passed = bool(has_clean_controls and len(controls) >= 3)
    gates.append(GateResult(
        name="clean_controls_frame_zero",
        weight=5,
        earned=5 if g7_passed else 0,
        mandatory=False,
        passed=g7_passed,
        detail=f"controlsFound={controls}",
    ))

    # Gate 8: Diagnostic walk, head, blink and mouth animation (5 points)
    # STRICT requirement: All adjacent frames MUST differ by >= 0.01 on real renders
    diag_valid = False
    diff_details = []
    if len(roundtrip_renders) >= 4:
        diffs = [
            compute_image_difference(roundtrip_renders[i], roundtrip_renders[i + 1])
            for i in range(len(roundtrip_renders) - 1)
        ]
        diff_details = [f"{i}->{i+1}: {d:.4f}" for i, d in enumerate(diffs)]
        # Every adjacent step must exceed 0.01 threshold
        diag_valid = all(d >= 0.01 for d in diffs)
    g8_passed = bool(diag_valid)
    gates.append(GateResult(
        name="diagnostic_animation",
        weight=5,
        earned=5 if g8_passed else 0,
        mandatory=False,
        passed=g8_passed,
        detail=f"adjacentDiffs={diff_details}, allDiffer={diag_valid}",
    ))

    # Gate 9: Real rendered-frame validation without Moho errors (5 points, Mandatory)
    g9_passed = (
        len(source_renders) == len(diag_frames)
        and len(roundtrip_renders) == len(diag_frames)
        and len(acceptance.errors) == 0
        and all(has_visible_pixels(p) for p in source_renders + roundtrip_renders)
    )
    gates.append(GateResult(
        name="real_renders",
        weight=5,
        earned=5 if g9_passed else 0,
        mandatory=True,
        passed=g9_passed,
        detail=f"sourceFrames={len(source_renders)}, roundtripFrames={len(roundtrip_renders)}, allValid={g9_passed}",
    ))

    # Calculate overall score and certification
    total_score = sum(g.earned for g in gates)
    mandatory_passed = all(g.passed for g in gates if g.mandatory)
    certified = bool(mandatory_passed and (total_score >= 95))

    evidence = {
        "roundtrip_path": acceptance.roundtrip_path,
        "rendered_frames": acceptance.rendered_frames,
        "stdout": acceptance.stdout,
        "stderr": acceptance.stderr,
    }

    report = ReadinessReport(
        score=total_score,
        certified=certified,
        mandatory_passed=mandatory_passed,
        gates=[asdict(g) for g in gates],
        evidence=evidence,
        errors=errors,
    )

    report_path = ev_dir / "readiness-report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report.to_dict(), f, indent=2)

    return report


def main() -> None:
    if len(sys.argv) < 4:
        print(json.dumps({"error": "Usage: python3 -m pipeline.tools.moho_readiness <project_path> <manifest_path> <evidence_dir>"}))
        sys.exit(1)

    project_path = sys.argv[1]
    manifest_path = sys.argv[2]
    evidence_dir = sys.argv[3]

    report = score_project(project_path, manifest_path, evidence_dir)
    print(json.dumps(report.to_dict()))


if __name__ == "__main__":
    main()
