from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
RUNNER = REPO_ROOT / "scripts" / "ml" / "run_video_pose_acceptance.py"


def test_cli_blocks_honestly_when_video_is_missing(tmp_path):
    output_dir = tmp_path / "evidence"
    process = subprocess.run(
        [
            sys.executable,
            str(RUNNER),
            "--video",
            str(tmp_path / "missing.mp4"),
            "--output-dir",
            str(output_dir),
            "--source-page",
            "https://example.invalid/source",
            "--license-url",
            "https://example.invalid/license",
            "--creator",
            "Test Creator",
        ],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        timeout=60,
    )

    assert process.returncode == 2
    report = json.loads((output_dir / "blocked.json").read_text(encoding="utf-8"))
    assert report["status"] == "blocked"
    assert report["realInferenceExecuted"] is False
    assert "not found" in report["blockingReason"].lower()
    assert not (output_dir / "tracking-metrics.json").exists()
