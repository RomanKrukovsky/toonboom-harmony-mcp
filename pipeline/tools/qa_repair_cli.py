"""Run measured QA, deterministic repair and native Moho recertification."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import tempfile
from dataclasses import asdict
from pathlib import Path
from typing import Optional

from ..moho.extract import load_mohoproj
from ..moho.qa_repair import MohoVisualQARepairEngine, QADefect, compute_qa_score
from .moho_native_acceptance import NativeAcceptanceResult, accept_project
from .render_preview import render as render_headless_preview


DIAGNOSTIC_FRAMES = [1, 12, 24, 36]


def _native_ok(result: Optional[NativeAcceptanceResult]) -> bool:
    return bool(
        result and result.opened and result.saved and result.reopened
        and not result.errors
    )


def run_qa_repair(
    project_path: str,
    manifest_path: Optional[str] = None,
    max_passes: int = 5,
    auto_repair: bool = True,
    evidence_dir: Optional[str] = None,
    output_path: Optional[str] = None,
) -> dict:
    """Repair a temporary candidate and promote it only after recertification."""
    project = Path(project_path).resolve()
    if not project.is_file():
        return {
            "status": "failed",
            "certified": False,
            "is_certified": False,
            "projectId": project_path,
            "projectPath": project_path,
            "initialScore": 0.0,
            "finalScore": 0.0,
            "repairPasses": 0,
            "passes_executed": 0,
            "detectedDefects": [{"issue_type": "missing_file", "severity": "critical", "description": f"File not found: {project_path}"}],
            "appliedRepairs": [],
            "repairs_promoted": False,
            "fixes_applied": 0,
            "evidenceDirectory": evidence_dir or "",
            "evidence_directory": evidence_dir or "",
            "log": [{"error": f"Project file not found: {project_path}"}],
            "final_acceptance": {
                "opened": False, "saved": False, "reopened": False,
                "errors": [f"Project file not found: {project_path}"],
            },
        }

    max_passes = max(1, min(5, max_passes))
    evidence = (
        Path(evidence_dir).resolve()
        if evidence_dir else Path(tempfile.mkdtemp(prefix="moho-qa-evidence-"))
    )
    evidence.mkdir(parents=True, exist_ok=True)

    log: list[dict] = []
    applied_total = 0
    all_detected_defects: list[dict] = []
    all_applied_repairs: list[dict] = []
    initial_score: Optional[float] = None
    final_score: float = 0.0
    certified = False
    final_native: Optional[NativeAcceptanceResult] = None
    passes_executed = 0

    with tempfile.TemporaryDirectory(dir=project.parent, prefix=".moho-qa-") as temp_dir:
        candidate = Path(temp_dir) / "candidate.moho"
        shutil.copy2(project, candidate)
        engine = MohoVisualQARepairEngine(
            str(candidate),
            max_passes=max_passes,
            manifest_path=manifest_path,
        )

        for pass_number in range(1, max_passes + 1):
            passes_executed = pass_number
            engine.current_pass = pass_number
            pass_evidence_dir = evidence / f"pass-{pass_number}"
            pass_evidence_dir.mkdir(parents=True, exist_ok=True)

            native = accept_project(
                str(candidate), str(pass_evidence_dir),
                DIAGNOSTIC_FRAMES,
            )
            final_native = native
            roundtrip_frames = [
                path for path in native.rendered_frames
                if "roundtrip" in Path(path).name
            ]

            # Fallback headless preview rendering if native rendering cannot run (e.g. trial/headless)
            if not roundtrip_frames:
                try:
                    doc, _ = load_mohoproj(str(candidate))
                    pds = doc.get("project_data", {})
                    w = float(pds.get("width", 400))
                    h = float(pds.get("height", 600))
                    fallback_frames: list[str] = []
                    for f in DIAGNOSTIC_FRAMES:
                        frame_out = pass_evidence_dir / f"headless_frame_{f:05d}.png"
                        render_headless_preview(doc, candidate, frame_out, w, h)
                        if frame_out.is_file():
                            fallback_frames.append(str(frame_out))
                    roundtrip_frames = fallback_frames
                except Exception as ex:
                    roundtrip_frames = []

            if not _native_ok(native) and not roundtrip_frames:
                defects = [QADefect(
                    "native_corruption", 0, "critical",
                    "; ".join(native.errors) or "Native acceptance failed",
                )]
            else:
                defects = engine.audit_project_and_frames(
                    rendered_frames=roundtrip_frames,
                    frame_numbers=DIAGNOSTIC_FRAMES,
                )

            current_score = compute_qa_score(defects)
            if initial_score is None:
                initial_score = current_score
            final_score = current_score

            defect_dicts = [asdict(d) for d in defects]
            for d in defect_dicts:
                if d not in all_detected_defects:
                    all_detected_defects.append(d)

            pass_log = {
                "pass": pass_number,
                "score": current_score,
                "native": {
                    "opened": native.opened,
                    "saved": native.saved,
                    "reopened": native.reopened,
                    "errors": native.errors,
                    "rendered_frames": roundtrip_frames,
                },
                "defects": defect_dicts,
            }

            has_critical = any(d.severity == "critical" for d in defects)
            if not defects or (current_score >= 80.0 and not has_critical):
                pass_log.update({
                    "status": "certified",
                    "message": "Project certified by measured QA and acceptance.",
                })
                log.append(pass_log)
                certified = True
                break

            if not auto_repair:
                pass_log.update({
                    "status": "failed",
                    "message": "Defects found; automatic repair is disabled.",
                    "fixes_applied": 0,
                })
                log.append(pass_log)
                break

            fixes = engine.apply_fixes_to_project(defects)
            applied_total += fixes
            pass_repairs = [
                entry for entry in engine.repair_log if entry.get("pass") == pass_number
            ]
            all_applied_repairs.extend(pass_repairs)
            pass_log["fixes_applied"] = fixes
            pass_log["repair_actions"] = pass_repairs

            if fixes == 0:
                pass_log.update({
                    "status": "failed",
                    "message": "Detected defects have no safe deterministic repair.",
                })
                log.append(pass_log)
                break

            pass_log["status"] = "repaired_pending_recheck"
            log.append(pass_log)

        target_destination = Path(output_path).resolve() if output_path else project
        repairs_promoted = bool(certified and applied_total > 0)
        if repairs_promoted or output_path:
            target_destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(candidate, target_destination)

    final_acceptance = {
        "opened": bool(final_native and final_native.opened),
        "saved": bool(final_native and final_native.saved),
        "reopened": bool(final_native and final_native.reopened),
        "errors": final_native.errors if final_native else ["Native acceptance was not run"],
    }

    result = {
        "status": "success" if certified else "failed",
        "certified": certified,
        "is_certified": certified,
        "projectId": str(project),
        "projectPath": str(project),
        "outputPath": str(target_destination),
        "initialScore": initial_score if initial_score is not None else 100.0,
        "finalScore": final_score,
        "repairPasses": passes_executed,
        "passes_executed": passes_executed,
        "repairs_promoted": repairs_promoted,
        "fixes_applied": applied_total,
        "detectedDefects": all_detected_defects,
        "appliedRepairs": all_applied_repairs,
        "evidenceDirectory": str(evidence),
        "evidence_directory": str(evidence),
        "log": log,
        "final_acceptance": final_acceptance,
    }
    (evidence / "qa-repair-report.json").write_text(
        json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8",
    )
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Moho Visual QA & Repair Tool")
    parser.add_argument("--project-path", "--project-id", dest="project_path", required=True, help="Project path")
    parser.add_argument("--manifest-path", dest="manifest_path", help="Shot manifest path")
    parser.add_argument("--max-repair-passes", "--max-passes", dest="max_passes", type=int, default=5, help="Max repair passes (up to 5)")
    parser.add_argument("--auto-repair", action="store_true", default=True, help="Apply safe repairs")
    parser.add_argument("--no-auto-repair", dest="auto_repair", action="store_false", help="Disable auto-repair")
    parser.add_argument("--evidence-dir", help="Evidence output directory")
    parser.add_argument("--output-path", help="Output path for repaired project")
    args = parser.parse_args()

    result = run_qa_repair(
        project_path=args.project_path,
        manifest_path=args.manifest_path,
        max_passes=args.max_passes,
        auto_repair=args.auto_repair,
        evidence_dir=args.evidence_dir,
        output_path=args.output_path,
    )
    print(json.dumps(result))


if __name__ == "__main__":
    main()
