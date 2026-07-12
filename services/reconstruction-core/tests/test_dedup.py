from pathlib import Path

import cv2
import numpy as np

from reconstruction_core.dedup import build_exposure_blocks, deduplicate


def write_frame(path: Path, x: int, flicker: int = 0) -> None:
    image = np.full((64, 96, 3), 240 + flicker, np.uint8)
    cv2.rectangle(image, (x, 20), (x + 20, 45), (20, 40 + flicker, 220), -1)
    assert cv2.imwrite(str(path), image)


def test_dedup_restores_holds_and_cycle(tmp_path: Path):
    positions = [10, 10, 10, 35, 35, 10]
    paths = []
    for index, x in enumerate(positions):
        path = tmp_path / f"{index}.png"
        write_frame(path, x, flicker=1 if index == 1 else 0)
        paths.append(path)
    representatives, mapping, _ = deduplicate(paths, threshold=0.02)
    assert len(representatives) == 2
    assert mapping == [0, 0, 0, 1, 1, 0]
    assert build_exposure_blocks(mapping) == [(1, 3, 0), (4, 2, 1), (6, 1, 0)]
