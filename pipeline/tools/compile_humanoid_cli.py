"""CLI entry point for compiling and certifying a production humanoid rig."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import tempfile
from pathlib import Path

from ..moho.extract import extract_from_file
from ..riggen.humanoid_manifest import build_humanoid_manifest
from ..riggen.master_character_compiler import compile_master_character
from .moho_readiness import score_project


def _atomic_promote(source: Path, target: Path) -> None:
    """Replace the target only after a complete copy exists beside it."""
    with tempfile.NamedTemporaryFile(
        dir=target.parent,
        prefix=f".{target.name}.",
        suffix=".promoting",
        delete=False,
    ) as pending_file:
        pending_path = Path(pending_file.name)
    try:
        shutil.copyfile(source, pending_path)
        os.replace(pending_path, target)
    finally:
        if pending_path.exists():
            pending_path.unlink()


def main() -> None:
    parser = argparse.ArgumentParser(description="Compile and certify a Moho humanoid rig")
    parser.add_argument("--name", default="Stage1Hero", help="Character name")
    parser.add_argument("--gender", default="neutral", choices=["male", "female", "neutral"], help="Gender")
    parser.add_argument("--skin-rgb", nargs=3, type=float, default=[0.95, 0.78, 0.67], help="Skin RGB")
    parser.add_argument("--hair-rgb", nargs=3, type=float, default=[0.90, 0.45, 0.18], help="Hair RGB")
    parser.add_argument("--shirt-rgb", nargs=3, type=float, default=[0.84, 0.31, 0.51], help="Shirt RGB")
    parser.add_argument("--pants-rgb", nargs=3, type=float, default=[0.94, 0.94, 0.94], help="Pants RGB")
    parser.add_argument("--shoes-rgb", nargs=3, type=float, default=[0.12, 0.12, 0.12], help="Shoes RGB")
    parser.add_argument("--canvas-width", type=int, default=1920, help="Canvas width")
    parser.add_argument("--canvas-height", type=int, default=1080, help="Canvas height")
    parser.add_argument("--output", required=True, help="Target output .moho file")
    parser.add_argument("--evidence", default="", help="Evidence directory")
    parser.add_argument("--min-score", type=int, default=95, help="Minimum score for certification")

    args = parser.parse_args()

    target_output = Path(args.output).resolve()
    target_output.parent.mkdir(parents=True, exist_ok=True)

    evidence_dir = Path(args.evidence).resolve() if args.evidence else target_output.parent / "evidence"
    evidence_dir.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_dir_path = Path(temp_dir)
        temp_moho = temp_dir_path / f"{args.name}_temp.moho"
        temp_manifest = temp_dir_path / "manifest.json"

        try:
            compile_master_character(
                name=args.name,
                gender=args.gender,
                skin_rgb=tuple(args.skin_rgb),
                hair_rgb=tuple(args.hair_rgb),
                shirt_rgb=tuple(args.shirt_rgb),
                pants_rgb=tuple(args.pants_rgb),
                shoes_rgb=tuple(args.shoes_rgb),
                out_path=str(temp_moho),
                canvas_w=args.canvas_width,
                canvas_h=args.canvas_height,
            )

            rig = extract_from_file(str(temp_moho))
            manifest = build_humanoid_manifest(rig)
            with open(temp_manifest, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2)

            manifest_copy = evidence_dir / "manifest.json"
            shutil.copyfile(temp_manifest, manifest_copy)

            report = score_project(str(temp_moho), str(temp_manifest), str(evidence_dir))

            is_certified = report.certified and (report.score >= args.min_score)

            if is_certified:
                _atomic_promote(temp_moho, target_output)
                status = "certified"
            else:
                status = "failed"

            result_errors = list(report.errors)
            if report.score < args.min_score:
                result_errors.append(
                    f"Readiness score {report.score} is below required {args.min_score}"
                )
            if not report.certified and not report.errors:
                result_errors.append("Mandatory production readiness gates did not pass")

            result = {
                "status": status,
                "outputPath": str(target_output),
                "score": report.score,
                "certified": is_certified,
                "mandatoryPassed": report.mandatory_passed,
                "gates": report.gates,
                "evidenceDirectory": str(evidence_dir),
                "errors": result_errors,
            }
            print(json.dumps(result, indent=2))
        except Exception as e:
            result = {
                "status": "failed",
                "outputPath": str(target_output),
                "score": 0,
                "certified": False,
                "mandatoryPassed": False,
                "gates": [],
                "evidenceDirectory": str(evidence_dir),
                "errors": [f"Compilation error: {str(e)}"],
            }
            print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
