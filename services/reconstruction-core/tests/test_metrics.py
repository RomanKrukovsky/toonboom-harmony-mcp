from pathlib import Path

import cv2
import numpy as np

from reconstruction_core.metrics import compare_images, compare_pairs


def test_render_metrics_report_size_colour_edges_and_ssim(tmp_path: Path):
    source = np.full((48, 64, 3), 240, np.uint8)
    cv2.rectangle(source, (12, 10), (36, 34), (20, 80, 220), -1)
    changed = source.copy()
    changed[10:18, 12:20] = (0, 0, 0)
    source_path = tmp_path / "source.png"
    same_path = tmp_path / "same.png"
    changed_path = tmp_path / "changed.png"
    assert cv2.imwrite(str(source_path), source)
    assert cv2.imwrite(str(same_path), source)
    assert cv2.imwrite(str(changed_path), changed)

    same = compare_images(str(source_path), str(same_path), 1)
    assert same["sizeMatches"] is True
    assert same["meanColourError"] == 0
    assert same["edgeError"] == 0
    assert same["ssim"] == 1

    report = compare_pairs([{"frame": 2, "sourcePath": str(source_path), "renderPath": str(changed_path)}])
    assert report["allImagesReadable"] is True
    assert report["allSizesMatch"] is True
    assert report["meanColourError"] > 0
    assert report["meanSsim"] < 1
