#!/usr/bin/env python3
"""Run the real 2D-cartoon pose slice and build a self-verifying evidence bundle."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict

REPO_ROOT = Path(__file__).resolve().parents[2]
RUNTIME_ROOT = REPO_ROOT / "services" / "ml-runtime"
sys.path.insert(0, str(RUNTIME_ROOT))

from pipelines.cartoon_motion_metrics import measure_cartoon_motion  # noqa: E402
from pipelines.video_pose import sha256_file, track_video_pose  # noqa: E402


def _portable_path(path: Path) -> str:
    try:
        return path.resolve().relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.name


def _write_json(path: Path, value: Dict[str, Any]) -> None:
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def _write_hashes(output_dir: Path) -> Dict[str, str]:
    hashes_path = output_dir / "hashes.json"
    if hashes_path.exists():
        hashes_path.unlink()
    hashes = {
        path.relative_to(output_dir).as_posix(): sha256_file(path)
        for path in sorted(output_dir.rglob("*"))
        if path.is_file()
    }
    _write_json(hashes_path, hashes)
    return hashes


def _verify_hashes(output_dir: Path, hashes: Dict[str, str]) -> None:
    for relative_path, expected in hashes.items():
        target = output_dir / relative_path
        if not target.is_file():
            raise RuntimeError(f"Hashed evidence file is missing: {relative_path}")
        actual = sha256_file(target)
        if actual != expected:
            raise RuntimeError(
                f"Evidence SHA-256 mismatch for {relative_path}: expected {expected}, got {actual}"
            )


def _write_blocked(output_dir: Path, reason: str) -> int:
    output_dir.mkdir(parents=True, exist_ok=True)
    report = {
        "status": "blocked",
        "realInferenceExecuted": False,
        "blockingReason": reason,
    }
    _write_json(output_dir / "blocked.json", report)
    hashes = _write_hashes(output_dir)
    _verify_hashes(output_dir, hashes)
    print(json.dumps(report))
    return 2


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--source-page", required=True)
    parser.add_argument("--license-url", required=True)
    parser.add_argument("--creator", required=True)
    parser.add_argument("--title", default="Boy Walking Cartoon Character")
    parser.add_argument("--download-url")
    return parser.parse_args()


def main() -> int:
    args = _parse_args()
    source = Path(args.video)
    output_dir = Path(args.output_dir)

    if not source.is_file():
        return _write_blocked(output_dir, f"Video not found: {_portable_path(source)}")
    if output_dir.exists() and any(output_dir.iterdir()):
        return _write_blocked(
            output_dir,
            "Output directory must be absent or empty to prevent stale evidence from being mixed.",
        )

    result = track_video_pose(str(source), str(output_dir), frame_stride=1)
    if result.get("status") != "success" or result.get("realInferenceExecuted") is not True:
        return _write_blocked(
            output_dir,
            str(result.get("blockingReason", "Real video pose inference did not complete.")),
        )

    smoothed_path = output_dir / "smoothed-keypoints.jsonl"
    frames = [
        json.loads(line)
        for line in smoothed_path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    raw_frames = [
        json.loads(line)
        for line in (output_dir / "raw-keypoints.jsonl").read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    cartoon_motion = measure_cartoon_motion(frames, raw_frames)
    _write_json(output_dir / "cartoon-motion-metrics.json", cartoon_motion)

    input_manifest = json.loads(
        (output_dir / "input-manifest.json").read_text(encoding="utf-8")
    )
    provenance = {
        "schemaVersion": "1.0.0",
        "kind": "Real2DAnimationSourceProvenance",
        "title": args.title,
        "creator": args.creator,
        "sourcePage": args.source_page,
        "downloadUrl": args.download_url,
        "license": {
            "name": "Pixabay Content License",
            "url": args.license_url,
            "attributionRequired": False,
            "attributionRetained": True,
        },
        "fixturePath": _portable_path(source),
        "sourceVideoSha256": input_manifest["sourceVideoSha256"],
        "codec": "h264",
        "sourceWidth": input_manifest["sourceWidth"],
        "sourceHeight": input_manifest["sourceHeight"],
        "fps": input_manifest["fps"],
        "totalFrames": input_manifest["totalFrames"],
        "mediaType": "published_two_dimensional_cartoon_animation",
        "realPersonVisible": False,
        "usage": "Local model acceptance fixture; do not present as project-generated media.",
    }
    _write_json(output_dir / "source-provenance.json", provenance)

    execution_path = output_dir / "execution-report.json"
    execution = json.loads(execution_path.read_text(encoding="utf-8"))
    overlay = execution.get("overlayVideo", {})
    execution["cartoonMotionAcceptance"] = {
        "status": "passed" if cartoon_motion["accepted"] else "failed",
        "path": "cartoon-motion-metrics.json",
    }
    execution["sourceProvenance"] = "source-provenance.json"
    execution["evidenceIntegrity"] = {
        "hashAlgorithm": "sha256",
        "hashesPath": "hashes.json",
        "verifiedAfterWrite": True,
    }
    _write_json(execution_path, execution)

    hashes = _write_hashes(output_dir)
    _verify_hashes(output_dir, hashes)

    accepted = (
        cartoon_motion["accepted"] is True
        and result["detectionRate"] > 0.8
        and overlay.get("status") == "ok"
        and overlay.get("decodable") is True
    )
    report = {
        "status": "success" if accepted else "blocked",
        "realInferenceExecuted": True,
        "accepted": accepted,
        "detectionRate": result["detectionRate"],
        "cartoonMotionMetrics": cartoon_motion,
        "overlayVideo": overlay,
        "artifactCount": len(hashes),
        "outputDir": _portable_path(output_dir),
    }
    print(json.dumps(report))
    return 0 if accepted else 2


if __name__ == "__main__":
    raise SystemExit(main())
