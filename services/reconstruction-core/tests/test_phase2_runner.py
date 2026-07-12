import importlib.util
import json
from pathlib import Path

import cv2
import numpy as np
import pytest


ROOT = Path(__file__).resolve().parents[3]
SPEC = importlib.util.spec_from_file_location("phase2_runner", ROOT / "scripts/python/harmony_phase2_runner.py")
RUNNER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(RUNNER)


def test_pure_python_png_comparison_uses_real_pixels(tmp_path: Path):
    bundle = tmp_path / "bundle"
    source_dir = bundle / "source_frames"
    render_dir = tmp_path / "render"
    source_dir.mkdir(parents=True)
    render_dir.mkdir()
    source = np.zeros((32, 48, 3), dtype=np.uint8)
    source[:, 8:30] = (20, 80, 220)
    rendered = source.copy()
    rendered[:, 10:32] = (20, 80, 220)
    cv2.imwrite(str(source_dir / "d1.png"), source)
    cv2.imwrite(str(render_dir / "preview_000001.png"), rendered)
    (bundle / "source_frame_map.json").write_text(json.dumps({"d1": "source_frames/d1.png"}))
    manifest = {"exposures": [{"frame": 1, "duration": 1, "drawingId": "d1"}]}
    report = RUNNER.compare_render(bundle, manifest, [render_dir / "preview_000001.png"])
    assert report[0]["sizesMatch"] is True
    assert report[0]["meanAbsoluteError"] > 0


def test_png_decoder_rejects_non_png(tmp_path: Path):
    bad = tmp_path / "bad.png"
    bad.write_text("not an image")
    with pytest.raises(ValueError, match="not_png"):
        RUNNER.png(bad)
