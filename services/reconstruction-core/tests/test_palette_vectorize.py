from pathlib import Path

import cv2
import numpy as np

from reconstruction_core.palette import normalize_palette
from reconstruction_core.vectorize import vectorize_frame


def test_palette_is_shared_and_shapes_are_editable(tmp_path: Path):
    inputs = tmp_path / "inputs"
    inputs.mkdir()
    paths = []
    for index, shift in enumerate((0, 2), start=1):
        image = np.full((60, 80, 3), (245, 245, 245), np.uint8)
        cv2.circle(image, (30 + shift, 30), 15, (30, 40 + shift, 220), -1)
        path = inputs / f"{index}.png"
        assert cv2.imwrite(str(path), image)
        paths.append(path)
    normalized, palette = normalize_palette(paths, tmp_path / "normalized", 2)
    assert len(palette) == 2
    shapes = vectorize_frame(normalized[0], palette, source_frame=1, max_points=24)
    assert shapes
    assert all(shape.closed and 3 <= len(shape.points) <= 24 for shape in shapes)
    assert {shape.color_id for shape in shapes}.issubset({colour.id for colour in palette})
