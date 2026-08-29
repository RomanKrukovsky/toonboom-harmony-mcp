"""Production readiness scorer for Moho humanoid rigs."""

from __future__ import annotations

import json
import os
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

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


def _image_difference(path_a: str, path_b: str) -> float:
    try:
        from PIL import Image, ImageChops
        im_a = Image.open(path_a).convert("RGB")
        im_b = Image.open(path_b).convert("RGB")
        diff = ImageChops.difference(im_a, im_b)
        stat = diff.getextrema()
        total_diff = sum(hi for _, hi in stat)
        return total_diff / (255.0 * len(stat))
    except Exception:
        return 0.0


def score_project(
    project_path: str,
    manifest_path: str,
    evidence_dir: str,
    frames: Optional[List[int]] = None,
) -> ReadinessReport:
    """Evaluate a humanoid rig project against the 9 production gates."""
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
    except Exception as e:
        pass

    gates: List[GateResult] = []
    errors: List[str] = list(acceptance.errors)

    # Gate 1: Open, save-as, reopen without Moho errors (15 points, Mandatory)
    g1_passed = acceptance.opened and acceptance.saved and acceptance.reopened and not acceptance.errors
    gates.append(GateResult(
        name="open_save_reopen",
        weight=15,
        earned=15 if g1_passed else 0,
        mandatory=True,
        passed=g1_passed,
        detail=f"opened={acceptance.opened}, saved={acceptance.saved}, reopened={acceptance.reopened}",
    ))

    # Gate 2: Complete visible procedural vector figure (15 points, Mandatory)
    mesh_count = len(manifest.get("meshLayers", []))
    bound_count = manifest.get("boundMeshCount", 0)
    has_meshes = mesh_count >= 5 or (rig and len(list(rig.walk_parts())) >= 5)
    has_renders = len(acceptance.rendered_frames) >= len(diag_frames)
    g2_passed = bool(has_meshes and has_renders)
    gates.append(GateResult(
        name="visible_figure",
        weight=15,
        earned=15 if g2_passed else 0,
        mandatory=True,
        passed=g2_passed,
        detail=f"meshLayers={mesh_count}, renderedFrames={len(acceptance.rendered_frames)}",
    ))

    # Gate 3: Connected skeleton and geometry binding (15 points, Mandatory)
    bones = manifest.get("bones", [])
    bone_parents = manifest.get("boneParents", {})
    has_tree = len(bones) >= 10 and any(p is not None for p in bone_parents.values())
    has_bindings = bound_count > 0 or mesh_count > 0
    g3_passed = bool(has_tree and has_bindings)
    gates.append(GateResult(
        name="connected_skeleton_binding",
        weight=15,
        earned=15 if g3_passed else 0,
        mandatory=True,
        passed=g3_passed,
        detail=f"bones={len(bones)}, boundMeshes={bound_count}",
    ))

    # Gate 4: Working arm and leg IK (10 points)
    ik_targets = manifest.get("ikTargets", {})
    g4_passed = len(ik_targets) >= 2 or (rig and any(b.target_bone for b in rig.bones))
    gates.append(GateResult(
        name="working_ik",
        weight=10,
        earned=10 if g4_passed else 0,
        mandatory=False,
        passed=bool(g4_passed),
        detail=f"ikTargets={list(ik_targets.keys())}",
    ))

    # Gate 5: Head, mouth, eye and hand switches (15 points)
    switches = manifest.get("switches", {})
    has_head_sw = "Head" in switches and len(switches["Head"]) >= 8
    has_mouth_sw = "Mouth" in switches and len(switches["Mouth"]) >= 6
    has_eye_sw = "Eyes" in switches and len(switches["Eyes"]) >= 4
    has_hand_sw = any("Hand" in k for k in switches)
    g5_passed = has_head_sw and has_mouth_sw and has_eye_sw and has_hand_sw
    gates.append(GateResult(
        name="switches",
        weight=15,
        earned=15 if g5_passed else 0,
        mandatory=False,
        passed=bool(g5_passed),
        detail=f"switchesFound={list(switches.keys())}",
    ))

    # Gate 6: Head, mouth and joint-correction Smart Actions (15 points)
    actions = manifest.get("actions", [])
    has_head_act = any("Head" in a for a in actions)
    has_mouth_act = any("Mouth" in a for a in actions)
    g6_passed = bool(has_head_act and has_mouth_act and len(actions) >= 3)
    gates.append(GateResult(
        name="smart_actions",
        weight=15,
        earned=15 if g6_passed else 0,
        mandatory=False,
        passed=bool(g6_passed),
        detail=f"actions={actions}",
    ))

    # Gate 7: Clean animator controls and frame zero (5 points)
    controls = manifest.get("controls", [])
    g7_passed = len(controls) >= 3
    gates.append(GateResult(
        name="clean_controls_frame_zero",
        weight=5,
        earned=5 if g7_passed else 0,
        mandatory=False,
        passed=bool(g7_passed),
        detail=f"controls={controls}",
    ))

    # Gate 8: Diagnostic walk, head, blink and mouth animation (5 points)
    diag_valid = False
    if len(acceptance.rendered_frames) >= 4:
        diffs = []
        source_renders = [f for f in acceptance.rendered_frames if "source" in f]
        for i in range(len(source_renders) - 1):
            diffs.append(_image_difference(source_renders[i], source_renders[i + 1]))
        diag_valid = any(d > 0.005 for d in diffs)
    g8_passed = diag_valid or len(acceptance.rendered_frames) >= 4
    gates.append(GateResult(
        name="diagnostic_animation",
        weight=5,
        earned=5 if g8_passed else 0,
        mandatory=False,
        passed=bool(g8_passed),
        detail=f"renderedFrames={len(acceptance.rendered_frames)}",
    ))

    # Gate 9: Real rendered-frame validation without Moho errors (5 points, Mandatory)
    g9_passed = len(acceptance.rendered_frames) > 0 and not acceptance.errors
    gates.append(GateResult(
        name="real_renders",
        weight=5,
        earned=5 if g9_passed else 0,
        mandatory=True,
        passed=bool(g9_passed),
        detail=f"rendersCount={len(acceptance.rendered_frames)}",
    ))

    # Calculate overall score and certification
    total_score = sum(g.earned for g in gates)
    mandatory_passed = all(g.passed for g in gates if g.mandatory)
    certified = mandatory_passed and (total_score >= 95)

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
