from __future__ import annotations

from pathlib import Path
from typing import List, Sequence

import cv2
import numpy as np

from .models import PaletteColor, Point, ShapeSource, VectorShape


def vectorize_frame(path: Path, palette: Sequence[PaletteColor], source_frame: int, max_points: int) -> List[VectorShape]:
    image = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if image is None:
        raise ValueError(f"Не удалось прочитать {path}")
    height, width = image.shape[:2]
    shapes: List[VectorShape] = []
    shape_index = 0
    for colour in palette:
        r, g, b, _ = colour.rgba
        if image.shape[-1] == 4:
            bgr_image = image[:, :, :3]
            alpha = image[:, :, 3]
            mask = cv2.inRange(bgr_image, np.array([b, g, r], np.uint8), np.array([b, g, r], np.uint8))
            mask = cv2.bitwise_and(mask, mask, mask=(alpha >= 127).astype(np.uint8))
        else:
            mask = cv2.inRange(image, np.array([b, g, r], np.uint8), np.array([b, g, r], np.uint8))
            
        contours, hierarchy = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
        if hierarchy is None:
            continue
        for contour_index, contour in enumerate(contours):
            # Обрабатываем как внешние контуры, так и внутренние отверстия.
            # Благодаря WINDING-правилам в Toon Boom Harmony, противоположное направление
            # обхода контура (которое OpenCV нативно задаёт для отверстий в режиме RETR_CCOMP)
            # автоматически создаст отверстие при закраске.
            area = float(cv2.contourArea(contour))
            if area < max(4.0, width * height * 0.00001):
                continue
            perimeter = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, max(0.75, perimeter * 0.0025), True).reshape(-1, 2)
            if len(approx) > max_points:
                indices = np.linspace(0, len(approx) - 1, max_points, dtype=np.int64)
                approx = approx[indices]
            if len(approx) < 3:
                continue
            shape_index += 1
            points = [Point(x=float(x) / width, y=float(y) / height) for x, y in approx]
            shapes.append(VectorShape(
                id=f"shape_{source_frame:06d}_{shape_index:04d}", colorId=colour.id,
                points=points, area=area, source=ShapeSource(frame=source_frame)
            ))
    return shapes
