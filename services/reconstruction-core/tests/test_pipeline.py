import json
import subprocess
from pathlib import Path

import cv2
import numpy as np

from reconstruction_core.models import HarmonyReconstructionManifest, ReconstructionRequest
from reconstruction_core.pipeline import ReconstructionPipeline
from reconstruction_core.storage import JobStorage


def test_mp4_to_valid_manifest(tmp_path: Path):
    frames = tmp_path / "source"
    frames.mkdir()
    for index, x in enumerate((10, 10, 30, 30, 10), start=1):
        image = np.full((64, 96, 3), 250, np.uint8)
        cv2.rectangle(image, (x, 20), (x + 20, 44), (30, 80, 220), -1)
        assert cv2.imwrite(str(frames / f"frame_{index:06d}.png"), image)
    video = tmp_path / "input.mp4"
    completed = subprocess.run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-framerate", "12",
        "-i", str(frames / "frame_%06d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", str(video)
    ], capture_output=True, text=True, check=False)
    assert completed.returncode == 0, completed.stderr
    pipeline = ReconstructionPipeline(JobStorage(tmp_path / "cache"), "ffmpeg", "ffprobe", (30, 1000, 1000))
    result = pipeline.reconstruct(ReconstructionRequest(
        videoPath=str(video), maxColors=3, maxPointsPerShape=30, dedupThreshold=0.02
    ))
    assert result["status"] == "completed"
    manifest = HarmonyReconstructionManifest.model_validate_json(Path(result["manifestPath"]).read_text())
    assert manifest.source.frame_count == 5
    assert len(manifest.drawings) == 2
    assert sum(exposure.duration for exposure in manifest.exposures) == 5
    assert all(drawing.shapes for drawing in manifest.drawings)
    second = pipeline.reconstruct(ReconstructionRequest(
        videoPath=str(video), maxColors=3, maxPointsPerShape=30, dedupThreshold=0.02
    ))
    assert second["jobId"] == result["jobId"]
    assert second["manifestPath"] == result["manifestPath"]
