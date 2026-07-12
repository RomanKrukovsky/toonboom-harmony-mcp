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


def calculate_visual_metrics(original_paths: List[Path], rendered_canvases: List[np.ndarray], threshold: float = 15.0) -> Dict[str, float]:
    """
    Вычисляет расширенные визуальные метрики между оригинальными кадрами и набором нарисованных векторов.
    """
    mean_diffs = []
    max_diffs = []
    sil_diffs = []
    cont_diffs = []
    col_diffs = []
    above_threshold_count = 0
    
    for idx, orig_path in enumerate(original_paths):
        if idx >= len(rendered_canvases):
            break
        rendered = rendered_canvases[idx]
        original = cv2.imread(str(orig_path), cv2.IMREAD_UNCHANGED)
        if original is None or rendered is None:
            continue
            
        # Нормализуем форму оригинального кадра к разрешению рендера
        if original.shape[:2] != rendered.shape[:2]:
            original = cv2.resize(original, (rendered.shape[1], rendered.shape[0]), interpolation=cv2.INTER_AREA)
            
        # Убеждаемся, что оба изображения 4-канальные
        if original.ndim == 2:
            original = cv2.cvtColor(original, cv2.COLOR_GRAY2BGRA)
        elif original.shape[-1] == 3:
            original = cv2.cvtColor(original, cv2.COLOR_BGR2BGRA)
            original[:, :, 3] = 255
            
        # 1. Попиксельная разница
        diff = cv2.absdiff(original, rendered)
        mean_diff = float(np.mean(diff))
        max_diff = float(np.max(diff))
        mean_diffs.append(mean_diff)
        max_diffs.append(max_diff)
        
        if mean_diff > threshold:
            above_threshold_count += 1
            
        # 2. Силуэтная разница (1.0 - IoU)
        mask_orig = original[:, :, 3] > 127
        mask_rend = rendered[:, :, 3] > 127
        union = np.logical_or(mask_orig, mask_rend).sum()
        intersection = np.logical_and(mask_orig, mask_rend).sum()
        iou = intersection / union if union > 0 else 1.0
        sil_diffs.append(1.0 - iou)
        
        # 3. Разница контуров
        edges_orig = cv2.Canny(original[:, :, :3], 60, 120)
        edges_rend = cv2.Canny(rendered[:, :, :3], 60, 120)
        edge_diff = np.abs(edges_orig.astype(np.float32) - edges_rend.astype(np.float32)) / 255.0
        cont_diffs.append(float(np.mean(edge_diff)))
        
        # 4. Разница цвета на пересечении масок
        mask_both = np.logical_or(mask_orig, mask_rend)
        if mask_both.sum() > 0:
            diff_color = np.linalg.norm(
                original[:, :, :3].astype(np.float32) - rendered[:, :, :3].astype(np.float32),
                axis=2
            )
            col_diffs.append(float(diff_color[mask_both].mean()))
        else:
            col_diffs.append(0.0)
            
    return {
        "meanPixelDifference": float(np.mean(mean_diffs)) if mean_diffs else 0.0,
        "maximumPixelDifference": float(np.max(max_diffs)) if max_diffs else 0.0,
        "silhouetteDifference": float(np.mean(sil_diffs)) if sil_diffs else 0.0,
        "contourDifference": float(np.mean(cont_diffs)) if cont_diffs else 0.0,
        "colorDifference": float(np.mean(col_diffs)) if col_diffs else 0.0,
        "numberOfFramesAboveThreshold": float(above_threshold_count)
    }
