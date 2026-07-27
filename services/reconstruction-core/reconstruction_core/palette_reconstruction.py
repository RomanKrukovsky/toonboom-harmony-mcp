from __future__ import annotations

import math
import numpy as np
import cv2
from typing import List, Tuple, Dict, Any, Optional
from .pir_models import PaletteItemPIR, ColorDefinitionPIR


def color_delta_e(c1: Tuple[int, int, int], c2: Tuple[int, int, int]) -> float:
    """
    Euclidean distance in RGB space as simple delta-E color difference approximation.
    """
    return math.sqrt((c1[0] - c2[0])**2 + (c1[1] - c2[1])**2 + (c1[2] - c2[2])**2)


def reconstruct_palette(
    image: np.ndarray,
    mode: str = "create_new_palette",
    max_colors: int = 16,
    color_threshold: float = 18.0,
    existing_palette: Optional[List[PaletteItemPIR]] = None
) -> Tuple[List[PaletteItemPIR], Dict[str, Any]]:
    """
    Extracts flat character colors, clusters close shades, and constructs stable palette.
    """
    report: Dict[str, Any] = {
        "mode": mode,
        "extractedColorCount": 0,
        "colorError": 0.0,
        "mappings": [],
        "warnings": []
    }

    if mode == "line_only":
        default_black = PaletteItemPIR(
            id="color_black",
            name="Line Art Black",
            color=ColorDefinitionPIR(r=0, g=0, b=0, a=255)
        )
        return [default_black], report

    # Reshape image to list of RGB pixels
    if image.shape[-1] == 4:
        alpha = image[:, :, 3]
        valid_pixels = image[alpha > 128][:, :3]
    else:
        valid_pixels = image.reshape(-1, 3)

    if len(valid_pixels) == 0:
        default_black = PaletteItemPIR(
            id="color_black",
            name="Line Art Black",
            color=ColorDefinitionPIR(r=0, g=0, b=0, a=255)
        )
        return [default_black], report

    # Perform K-Means clustering to get dominant flat colors
    k = min(max_colors, max(2, len(valid_pixels) // 100))
    pixels_f32 = valid_pixels.astype(np.float32)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 0.2)
    _, labels, centers = cv2.kmeans(pixels_f32, k, None, criteria, 5, cv2.KMEANS_PP_CENTERS)

    palette_items: List[PaletteItemPIR] = [
        PaletteItemPIR(
            id="color_black",
            name="Line Art Black",
            color=ColorDefinitionPIR(r=0, g=0, b=0, a=255)
        )
    ]

    idx = 1
    for center in centers:
        b, g, r = int(center[0]), int(center[1]), int(center[2])
        # Skip pure black as it is already added
        if color_delta_e((r, g, b), (0, 0, 0)) < color_threshold:
            continue

        item_id = f"color_{idx:03d}"
        palette_item = PaletteItemPIR(
            id=item_id,
            name=f"Color {idx:03d}",
            color=ColorDefinitionPIR(r=r, g=g, b=b, a=255)
        )
        palette_items.append(palette_item)
        idx += 1

    report["extractedColorCount"] = len(palette_items)

    if mode == "map_to_existing_palette" and existing_palette:
        mapped_palette: List[PaletteItemPIR] = []
        total_error = 0.0

        for item in palette_items:
            best_match = None
            min_dist = float("inf")
            rgb1 = (item.color.r, item.color.g, item.color.b)

            for ext in existing_palette:
                rgb2 = (ext.color.r, ext.color.g, ext.color.b)
                dist = color_delta_e(rgb1, rgb2)
                if dist < min_dist:
                    min_dist = dist
                    best_match = ext

            if best_match:
                mapped_palette.append(best_match)
                total_error += min_dist
                report["mappings"].append({
                    "sourceId": item.id,
                    "targetId": best_match.id,
                    "deltaE": min_dist
                })

        report["colorError"] = total_error / max(1, len(palette_items))
        return mapped_palette, report

    return palette_items, report
