"""End-to-end runner for the limb-vs-root acceptance metric on a real video pose bundle.

This is the Sprint-1 acceptance closure: it reads a previously-generated
evidence bundle (raw-keypoints.jsonl + smoothed-keypoints.jsonl), runs the
arm-raise metric from pipelines/arm_raise_metrics.py against the real
measurement, and writes the result next to the bundle as
`arm-raise-metrics.json`, then refreshes `hashes.json` so the evidence gate
sees the new file.

Run from the repo root:

    .venv-ml/bin/python scripts/ml/run_arm_raise_acceptance.py \
        --bundle docs/evidence/sprint1-video-pose-real

The script returns exit 0 even when the acceptance fails — the metric is
written either way so the gate can compare real numbers. The shell exits
non-zero only on I/O failure or when the bundle is missing required files.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
RUNTIME_ROOT = REPO_ROOT / "services" / "ml-runtime"
sys.path.insert(0, str(RUNTIME_ROOT))

from pipelines.arm_raise_metrics import measure_arm_raise  # noqa: E402


def _load_jsonl(path: Path) -> list[dict]:
    out: list[dict] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            stripped = line.strip()
            if not stripped:
                continue
            out.append(json.loads(stripped))
    return out


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _refresh_hashes(bundle_dir: Path) -> None:
    hashes_path = bundle_dir / "hashes.json"
    if not hashes_path.exists():
        return
    hashes = {}
    for path in sorted(bundle_dir.rglob("*")):
        if path.is_file() and path.name != "hashes.json":
            hashes[path.relative_to(bundle_dir).as_posix()] = _sha256(path)
    hashes_path.write_text(json.dumps(hashes, indent=2), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--bundle",
        required=True,
        type=Path,
        help="Directory containing raw-keypoints.jsonl and smoothed-keypoints.jsonl",
    )
    args = parser.parse_args()

    bundle_dir: Path = args.bundle.resolve()
    smoothed_path = bundle_dir / "smoothed-keypoints.jsonl"
    raw_path = bundle_dir / "raw-keypoints.jsonl"
    if not smoothed_path.exists():
        print(f"missing {smoothed_path}", file=sys.stderr)
        return 2
    if not raw_path.exists():
        print(f"missing {raw_path}", file=sys.stderr)
        return 2

    smoothed_frames = _load_jsonl(smoothed_path)
    raw_frames = _load_jsonl(raw_path)
    if not smoothed_frames:
        print("smoothed-keypoints.jsonl is empty", file=sys.stderr)
        return 2

    result = measure_arm_raise(smoothed_frames, raw_frames)

    out_path = bundle_dir / "arm-raise-metrics.json"
    out_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    _refresh_hashes(bundle_dir)

    summary = {
        "bundle": bundle_dir.relative_to(REPO_ROOT).as_posix(),
        "result": "arm-raise-metrics.json",
        "accepted": result["accepted"],
        "selectedArm": result.get("selectedArm"),
        "limbs": {
            name: {
                "relativeMotionAmplitude": limb["relativeMotionAmplitude"],
                "relativeMotionBoxRatio": limb["relativeMotionBoxRatio"],
                "rootStdDev": limb["rootStdDev"],
                "frames": limb["frames"],
            }
            for name, limb in result["limbs"].items()
        },
    }
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
