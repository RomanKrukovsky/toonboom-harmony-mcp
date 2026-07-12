from __future__ import annotations

from pathlib import Path
from typing import Dict, List

import cv2
import numpy as np


def _load(path: str) -> np.ndarray:
    image = cv2.imread(str(Path(path).resolve()), cv2.IMREAD_UNCHANGED)
    if image is None:
        raise ValueError(f"Не удалось прочитать изображение: {path}")
    return image


def _bgr(image: np.ndarray) -> np.ndarray:
    if image.ndim == 2:
        return cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
    if image.shape[2] == 4:
        return image[:, :, :3]
    return image


def _ssim(a: np.ndarray, b: np.ndarray) -> float:
    gray_a = cv2.cvtColor(a, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
    gray_b = cv2.cvtColor(b, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
    c1, c2 = 0.01**2, 0.03**2
    mu_a, mu_b = float(gray_a.mean()), float(gray_b.mean())
    var_a, var_b = float(gray_a.var()), float(gray_b.var())
    covariance = float(np.mean((gray_a - mu_a) * (gray_b - mu_b)))
    denominator = (mu_a**2 + mu_b**2 + c1) * (var_a + var_b + c2)
    return float(((2 * mu_a * mu_b + c1) * (2 * covariance + c2)) / denominator) if denominator else 1.0


def compare_images(source_path: str, render_path: str, frame: int) -> Dict[str, object]:
    source_raw = _load(source_path)
    render_raw = _load(render_path)
    source = _bgr(source_raw)
    render = _bgr(render_raw)
    source_size = [int(source.shape[1]), int(source.shape[0])]
    render_size = [int(render.shape[1]), int(render.shape[0])]
    size_matches = source_size == render_size
    if not size_matches:
        source = cv2.resize(source, tuple(render_size), interpolation=cv2.INTER_AREA)
    source_f = source.astype(np.float32) / 255.0
    render_f = render.astype(np.float32) / 255.0
    colour_error = float(np.mean(np.abs(source_f - render_f)))
    source_edges = cv2.Canny(source, 60, 120).astype(np.float32) / 255.0
    render_edges = cv2.Canny(render, 60, 120).astype(np.float32) / 255.0
    edge_error = float(np.mean(np.abs(source_edges - render_edges)))
    return {
        "frame": frame,
        "sourcePath": str(Path(source_path).resolve()),
        "renderPath": str(Path(render_path).resolve()),
        "sourceSize": source_size,
        "renderSize": render_size,
        "sizeMatches": size_matches,
        "sourceHasAlpha": source_raw.ndim == 3 and source_raw.shape[2] == 4,
        "renderHasAlpha": render_raw.ndim == 3 and render_raw.shape[2] == 4,
        "meanColourError": colour_error,
        "edgeError": edge_error,
        "ssim": _ssim(source, render),
    }


def compare_pairs(pairs: List[Dict[str, object]]) -> Dict[str, object]:
    frames = [compare_images(str(pair["sourcePath"]), str(pair["renderPath"]), int(pair["frame"])) for pair in pairs]
    return {
        "status": "success",
        "frameCount": len(frames),
        "frames": frames,
        "allImagesReadable": len(frames) == len(pairs),
        "allSizesMatch": all(bool(item["sizeMatches"]) for item in frames),
        "meanColourError": float(np.mean([item["meanColourError"] for item in frames])) if frames else 0.0,
        "meanEdgeError": float(np.mean([item["edgeError"] for item in frames])) if frames else 0.0,
        "meanSsim": float(np.mean([item["ssim"] for item in frames])) if frames else 1.0,
    }
