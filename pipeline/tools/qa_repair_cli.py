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

from ..moho.qa_repair import MohoVisualQARepairEngine, QADefect
from .moho_native_acceptance import NativeAcceptanceResult, accept_project


DIAGNOSTIC_FRAMES = [1, 12, 24, 36]


def _native_ok(result: Optional[NativeAcceptanceResult]) -> bool:
    return bool(
        result and result.opened and result.saved and result.reopened
        and not result.errors
    )


def run_qa_repair(
    project_path: str,
    max_passes: int = 5,
    auto_repair: bool = True,
    evidence_dir: Optional[str] = None,
) -> dict:
    """Repair a temporary candidate and promote it only after native recertification."""
    project = Path(project_path).resolve()
    if not project.is_file():
        return {
            "status": "failed", "projectId": project_path,
            "is_certified": False, "passes_executed": 0,
            "repairs_promoted": False,
            "log": [{"error": f"Project file not found: {project_path}"}],
            "final_acceptance": {
                "opened": False, "saved": False, "reopened": False,
                "errors": [f"Project file not found: {project_path}"],
            },
        }
    if max_passes < 1:
        raise ValueError("max_passes must be at least 1")
    evidence = (
        Path(evidence_dir).resolve()
        if evidence_dir else Path(tempfile.mkdtemp(prefix="moho-qa-evidence-"))
    )
    evidence.mkdir(parents=True, exist_ok=True)
    log: list[dict] = []
    applied_total = 0
    certified = False
    final_native: Optional[NativeAcceptanceResult] = None
    passes_executed = 0

    with tempfile.TemporaryDirectory(dir=project.parent, prefix=".moho-qa-") as temp_dir:
        candidate = Path(temp_dir) / "candidate.moho"
        shutil.copy2(project, candidate)
        engine = MohoVisualQARepairEngine(str(candidate), max_passes=max_passes)

        for pass_number in range(1, max_passes + 1):
            passes_executed = pass_number
            engine.current_pass = pass_number
            native = accept_project(
                str(candidate), str(evidence / f"pass-{pass_number}"),
                DIAGNOSTIC_FRAMES,
            )
            final_native = native
            roundtrip_frames = [
                path for path in native.rendered_frames
                if "roundtrip" in Path(path).name
            ]
            if not _native_ok(native):
                defects = [QADefect(
                    "native_corruption", 0, "critical",
                    "; ".join(native.errors) or "Native acceptance failed",
                )]
            else:
                defects = engine.audit_project_and_frames(
                    rendered_frames=roundtrip_frames,
                    frame_numbers=DIAGNOSTIC_FRAMES,
                )
            pass_log = {
                "pass": pass_number,
                "native": {
                    "opened": native.opened,
                    "saved": native.saved,
                    "reopened": native.reopened,
                    "errors": native.errors,
                    "rendered_frames": roundtrip_frames,
                },
                "defects": [asdict(defect) for defect in defects],
            }
            if not defects:
                pass_log.update({
                    "status": "certified",
                    "message": "Project certified by measured QA and native Moho acceptance.",
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
            pass_log["fixes_applied"] = fixes
            pass_log["repair_actions"] = [
                entry for entry in engine.repair_log if entry.get("pass") == pass_number
            ]
            if fixes == 0:
                pass_log.update({
                    "status": "failed",
                    "message": "Detected defects have no safe deterministic repair.",
                })
                log.append(pass_log)
                break
            pass_log["status"] = "repaired_pending_recheck"
            log.append(pass_log)

        repairs_promoted = certified and applied_total > 0
        if repairs_promoted:
            os.replace(candidate, project)

    final_acceptance = {
        "opened": bool(final_native and final_native.opened),
        "saved": bool(final_native and final_native.saved),
        "reopened": bool(final_native and final_native.reopened),
        "errors": final_native.errors if final_native else ["Native acceptance was not run"],
    }
    result = {
        "status": "success" if certified else "failed",
        "projectId": str(project),
        "is_certified": certified,
        "passes_executed": passes_executed,
        "repairs_promoted": repairs_promoted,
        "fixes_applied": applied_total,
        "log": log,
        "evidence_directory": str(evidence),
        "final_acceptance": final_acceptance,
    }
    (evidence / "qa-repair-report.json").write_text(
        json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8",
    )
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Moho Visual QA & Repair Tool")
    parser.add_argument("--project-id", required=True, help="Project path")
    parser.add_argument("--max-passes", type=int, default=5, help="Max repair passes")
    parser.add_argument("--auto-repair", action="store_true", help="Apply safe repairs")
    parser.add_argument("--evidence-dir", help="Evidence output directory")
    args = parser.parse_args()
    result = run_qa_repair(
        args.project_id, args.max_passes, args.auto_repair, args.evidence_dir,
    )
    print(json.dumps(result))


if __name__ == "__main__":
    main()
