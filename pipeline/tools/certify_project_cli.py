"""CLI tool to certify any Moho project against native acceptance and readiness scoring."""

from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
from pathlib import Path

from ..moho.extract import extract_from_file
from ..riggen.humanoid_manifest import build_humanoid_manifest
from .moho_readiness import score_project


def certify_project(project_path: str, evidence_dir: str = "", manifest_path: str = "") -> dict:
    proj_path = Path(project_path).resolve()
    if not proj_path.is_file():
        return {
            "status": "failed",
            "score": 0,
            "certified": False,
            "mandatory_passed": False,
            "errors": [f"File not found: {project_path}"],
            "evidence": {},
            "gates": [],
        }

    ev_dir = Path(evidence_dir).resolve() if evidence_dir else proj_path.parent / "evidence"
    ev_dir.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_dir_path = Path(temp_dir)
        actual_manifest_path = manifest_path

        if not actual_manifest_path or not os.path.isfile(actual_manifest_path):
            try:
                rig = extract_from_file(str(proj_path))
                manifest = build_humanoid_manifest(rig)
                generated_manifest = temp_dir_path / "manifest.json"
                with open(generated_manifest, "w", encoding="utf-8") as f:
                    json.dump(manifest, f, indent=2)
                actual_manifest_path = str(generated_manifest)
            except Exception as e:
                actual_manifest_path = str(temp_dir_path / "empty_manifest.json")
                with open(actual_manifest_path, "w", encoding="utf-8") as f:
                    json.dump({}, f)

        report = score_project(str(proj_path), actual_manifest_path, str(ev_dir))
        return {
            "status": "certified" if report.certified else "failed",
            "project_path": str(proj_path),
            "score": report.score,
            "certified": report.certified,
            "mandatory_passed": report.mandatory_passed,
            "gates": report.gates,
            "evidence_directory": str(ev_dir),
            "errors": report.errors,
        }


def main() -> None:
    parser = argparse.ArgumentParser(description="Certify a Moho project file")
    parser.add_argument("project_path", help="Path to .moho project")
    parser.add_argument("--evidence", default="", help="Evidence directory")
    parser.add_argument("--manifest", default="", help="Optional path to manifest.json")
    args = parser.parse_args()

    result = certify_project(args.project_path, args.evidence, args.manifest)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
