from __future__ import annotations

import cv2
import numpy as np
from typing import Tuple, Dict, Any, List


def preprocess_image(
    image: np.ndarray,
    mode: str = "black_and_white_lineart",
    background_removal: str = "auto",
    gap_threshold: int = 3,
    min_noise_area: int = 8
) -> Tuple[np.ndarray, np.ndarray, Dict[str, Any]]:
    """
    Preprocesses raster image for vectorization.
    Returns: (processed_binary_or_rgb, alpha_mask, metadata_report)
    """
    if image is None or image.size == 0:
        raise ValueError("Invalid image input to vector preprocessing")

    height, width = image.shape[:2]
    report: Dict[str, Any] = {
        "mode": mode,
        "width": width,
        "height": height,
        "warnings": [],
        "requiresHumanReview": False,
        "status": "success"
    }

    # Extract or infer alpha channel
    if image.shape[-1] == 4:
        alpha = image[:, :, 3]
        bgr = image[:, :, :3]
    else:
        bgr = image if len(image.shape) == 3 else cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
        # If background is plain white, generate alpha mask
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        if background_removal in ("auto", "transparent"):
            _, alpha = cv2.threshold(gray, 250, 255, cv2.THRESH_BINARY_INV)
        else:
            alpha = np.full((height, width), 255, dtype=np.uint8)

    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

    if mode == "black_and_white_lineart":
        # Otsu thresholding or adaptive thresholding for line-art
        blur = cv2.GaussianBlur(gray, (3, 3), 0)
        _, binary = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        # Mask out alpha = 0 areas
        binary = cv2.bitwise_and(binary, binary, mask=alpha)

        # 1. Remove small noise specks
        if min_noise_area > 0:
            num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(binary)
            clean_binary = np.zeros_like(binary)
            for i in range(1, num_labels):
                if stats[i, cv2.CC_STAT_AREA] >= min_noise_area:
                    clean_binary[labels == i] = 255
            binary = clean_binary

        # 2. Safe micro-gap closing
        if gap_threshold > 0:
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (gap_threshold, gap_threshold))
            binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)

        return binary, alpha, report

    elif mode == "flat_colour_character":
        # Color quantization / bilateral filter to preserve sharp color boundaries
        filtered = cv2.bilateralFilter(bgr, 9, 75, 75)
        return filtered, alpha, report

    elif mode == "coloured_illustration":
        # Complex illustration with potential shadows / textures
        report["warnings"].append("Coloured illustration detected: complex shadows may require human review.")
        report["requiresHumanReview"] = True
        report["status"] = "partial_success"
        filtered = cv2.bilateralFilter(bgr, 5, 50, 50)
        return filtered, alpha, report

    elif mode == "manual_guided":
        return gray, alpha, report

    else:
        raise ValueError(f"Unknown vectorization mode: {mode}")
