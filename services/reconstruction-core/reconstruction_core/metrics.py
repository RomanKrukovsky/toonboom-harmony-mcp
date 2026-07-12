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
    Вычисляет расширенные визуальные, пространственные переднего плана (foreground-aware)
    и временные (temporal fidelity) метрики между исходным видео и векторной реконструкцией.
    """
    mean_diffs = []
    max_diffs = []
    col_diffs = []
    above_threshold_count = 0
    
    # Списки масок и центроидов для временных метрик
    orig_masks = []
    rend_masks = []
    orig_centroids = []
    rend_centroids = []
    orig_grays = []
    rend_grays = []
    
    fg_errors = []
    mv_errors = []
    sil_ious = []
    cont_dists = []
    bbox_errors = []
    area_errors = []
    
    for idx, orig_path in enumerate(original_paths):
        if idx >= len(rendered_canvases):
            break
        rendered = rendered_canvases[idx]
        original = cv2.imread(str(orig_path), cv2.IMREAD_UNCHANGED)
        if original is None or rendered is None:
            continue
            
        # Нормализуем размер оригинального кадра к рендеру
        if original.shape[:2] != rendered.shape[:2]:
            original = cv2.resize(original, (rendered.shape[1], rendered.shape[0]), interpolation=cv2.INTER_AREA)
            
        if original.ndim == 2:
            original = cv2.cvtColor(original, cv2.COLOR_GRAY2BGRA)
        elif original.shape[-1] == 3:
            original = cv2.cvtColor(original, cv2.COLOR_BGR2BGRA)
            original[:, :, 3] = 255
            
        if rendered.ndim == 2:
            rendered = cv2.cvtColor(rendered, cv2.COLOR_GRAY2BGRA)
        elif rendered.shape[-1] == 3:
            rendered = cv2.cvtColor(rendered, cv2.COLOR_BGR2BGRA)
            rendered[:, :, 3] = 255
            
        orig_gray = cv2.cvtColor(original[:, :, :3], cv2.COLOR_BGR2GRAY)
        rend_gray = cv2.cvtColor(rendered[:, :, :3], cv2.COLOR_BGR2GRAY)
        orig_grays.append(orig_gray)
        rend_grays.append(rend_gray)
            
        # 1. Вычисляем цвет фона (периметр)
        h, w = original.shape[:2]
        border = []
        border.extend(original[0:2, :, :3].reshape(-1, 3))
        border.extend(original[h-2:h, :, :3].reshape(-1, 3))
        border.extend(original[:, 0:2, :3].reshape(-1, 3))
        border.extend(original[:, w-2:w, :3].reshape(-1, 3))
        bg_color = np.median(np.array(border), axis=0)
        
        # 2. Маски переднего плана (разница с фоном)
        diff_orig_bg = np.linalg.norm(original[:, :, :3].astype(np.float32) - bg_color, axis=2)
        diff_rend_bg = np.linalg.norm(rendered[:, :, :3].astype(np.float32) - bg_color, axis=2)
        
        # Маска переднего плана: цвет отличается от фона И пиксель непрозрачный
        mask_orig = (diff_orig_bg > 15.0) & (original[:, :, 3] > 15)
        mask_rend = (diff_rend_bg > 15.0) & (rendered[:, :, 3] > 15)
        
        orig_masks.append(mask_orig)
        rend_masks.append(mask_rend)
        
        # Центроиды
        m_orig = cv2.moments(mask_orig.astype(np.uint8) * 255)
        m_rend = cv2.moments(mask_rend.astype(np.uint8) * 255)
        
        c_orig = (m_orig["m10"]/m_orig["m00"], m_orig["m01"]/m_orig["m00"]) if m_orig["m00"] > 0 else (0.0, 0.0)
        c_rend = (m_rend["m10"]/m_rend["m00"], m_rend["m01"]/m_rend["m00"]) if m_rend["m00"] > 0 else (0.0, 0.0)
        
        orig_centroids.append(c_orig)
        rend_centroids.append(c_rend)
        
        # 3. Полная попиксельная разница
        diff = cv2.absdiff(original, rendered)
        mean_diff = float(np.mean(diff))
        mean_diffs.append(mean_diff)
        max_diffs.append(float(np.max(diff)))
        if mean_diff > threshold:
            above_threshold_count += 1
            
        # 4. Silhouette IoU
        union = np.logical_or(mask_orig, mask_rend).sum()
        intersection = np.logical_and(mask_orig, mask_rend).sum()
        iou = intersection / union if union > 0 else 1.0
        sil_ious.append(iou)
        
        # 5. Foreground Mean Error
        if union > 0:
            fg_errors.append(float(np.mean(diff[np.logical_or(mask_orig, mask_rend)])))
        else:
            fg_errors.append(0.0)
            
        # 6. Contour Distance
        edges_orig = cv2.Canny(original[:, :, :3], 60, 120)
        edges_rend = cv2.Canny(rendered[:, :, :3], 60, 120)
        edge_diff = np.abs(edges_orig.astype(np.float32) - edges_rend.astype(np.float32)) / 255.0
        cont_dists.append(float(np.mean(edge_diff)))
        
        # 7. Bounding Box Error (IoU of Bounding Boxes)
        x1, y1, w1, h1 = cv2.boundingRect(mask_orig.astype(np.uint8) * 255)
        x2, y2, w2, h2 = cv2.boundingRect(mask_rend.astype(np.uint8) * 255)
        if w1 * h1 > 0 or w2 * h2 > 0:
            bi_x = max(x1, x2)
            bi_y = max(y1, y2)
            bi_w = max(0, min(x1 + w1, x2 + w2) - bi_x)
            bi_h = max(0, min(y1 + h1, y2 + h2) - bi_y)
            intersection_bbox = bi_w * bi_h
            union_bbox = w1 * h1 + w2 * h2 - intersection_bbox
            bbox_iou = intersection_bbox / union_bbox if union_bbox > 0 else 1.0
            bbox_errors.append(1.0 - bbox_iou)
        else:
            bbox_errors.append(0.0)
            
        # 8. Area Error
        area_errors.append(abs(int(mask_orig.sum()) - int(mask_rend.sum())))
        
        # Color error
        if intersection > 0:
            diff_color = np.linalg.norm(
                original[:, :, :3].astype(np.float32) - rendered[:, :, :3].astype(np.float32),
                axis=2
            )
            col_diffs.append(float(diff_color[mask_orig & mask_rend].mean()))
        else:
            col_diffs.append(0.0)

    # Временные (Temporal) метрики
    frame_diff_preservations = []
    centroid_errors = []
    orig_velocities = []
    rend_velocities = []
    
    temporal_sil_diffs = []
    
    lost_motion_events = 0
    frozen_motion_count = 0
    motion_events_count = 0
    
    for idx in range(len(orig_masks)):
        c_orig = orig_centroids[idx]
        c_rend = rend_centroids[idx]
        centroid_errors.append(np.linalg.norm(np.array(c_orig) - np.array(c_rend)))
        
        if idx > 0:
            # 1. Сохранение разницы кадров (frameDifferencePreservation)
            d_orig = cv2.absdiff(orig_grays[idx], orig_grays[idx - 1])
            d_rend = cv2.absdiff(rend_grays[idx], rend_grays[idx - 1])
            diff_sim = 1.0 - float(np.mean(cv2.absdiff(d_orig, d_rend))) / 255.0
            frame_diff_preservations.append(diff_sim)
            
            # Скорости центроидов
            v_orig = np.array(orig_centroids[idx]) - np.array(orig_centroids[idx - 1])
            v_rend = np.array(rend_centroids[idx]) - np.array(rend_centroids[idx - 1])
            orig_velocities.append(v_orig)
            rend_velocities.append(v_rend)
            
            v_orig_mag = float(np.linalg.norm(v_orig))
            v_rend_mag = float(np.linalg.norm(v_rend))
            
            # Проверяем потерю движения (если исходный сдвиг > 1.5 пикселя, а вектор стоит на месте < 0.2 пикселя)
            if v_orig_mag > 1.5:
                motion_events_count += 1
                if v_rend_mag < 0.2:
                    frozen_motion_count += 1
                    lost_motion_events += 1
                    
            # Temporal Silhouette Difference
            change_orig = orig_masks[idx].astype(np.float32) - orig_masks[idx - 1].astype(np.float32)
            change_rend = rend_masks[idx].astype(np.float32) - rend_masks[idx - 1].astype(np.float32)
            temporal_sil_diffs.append(float(np.mean(np.abs(change_orig - change_rend))))

    # Ускорения центроидов
    orig_accels = []
    rend_accels = []
    for idx in range(1, len(orig_velocities)):
        orig_accels.append(orig_velocities[idx] - orig_velocities[idx - 1])
        rend_accels.append(rend_velocities[idx] - rend_velocities[idx - 1])
        
    vel_errors = [np.linalg.norm(v1 - v2) for v1, v2 in zip(orig_velocities, rend_velocities)]
    acc_errors = [np.linalg.norm(a1 - a2) for a1, a2 in zip(orig_accels, rend_accels)]
    
    frozen_ratio = (frozen_motion_count / motion_events_count) if motion_events_count > 0 else 0.0

    # Собираем результирующий словарь
    full_frame_error = float(np.mean(mean_diffs)) if mean_diffs else 0.0
    fg_error = float(np.mean(fg_errors)) if fg_errors else 0.0
    
    # Moving region error (на маске изменений оригинальных кадров)
    mv_errors_list = []
    for idx in range(1, len(orig_grays)):
        d_orig = cv2.absdiff(orig_grays[idx], orig_grays[idx - 1])
        motion_mask = d_orig > 10
        if motion_mask.sum() > 0:
            diff_frame = cv2.absdiff(orig_grays[idx], rend_grays[idx])
            mv_errors_list.append(float(np.mean(diff_frame[motion_mask])))
    mv_error = float(np.mean(mv_errors_list)) if mv_errors_list else 0.0

    return {
        # Наследуемые (Legacy) метрики
        "meanPixelDifference": full_frame_error,
        "maximumPixelDifference": float(np.max(max_diffs)) if max_diffs else 0.0,
        "silhouetteDifference": 1.0 - float(np.mean(sil_ious)) if sil_ious else 0.0,
        "contourDifference": float(np.mean(cont_dists)) if cont_dists else 0.0,
        "colorDifference": float(np.mean(col_diffs)) if col_diffs else 0.0,
        "numberOfFramesAboveThreshold": float(above_threshold_count),
        
        # Новые Foreground-Aware метрики
        "fullFrameMeanError": full_frame_error,
        "foregroundMeanError": fg_error,
        "movingRegionMeanError": mv_error,
        "silhouetteIoU": float(np.mean(sil_ious)) if sil_ious else 1.0,
        "contourDistance": float(np.mean(cont_dists)) if cont_dists else 0.0,
        "centroidError": float(np.mean(centroid_errors)) if centroid_errors else 0.0,
        "boundingBoxError": float(np.mean(bbox_errors)) if bbox_errors else 0.0,
        "areaError": float(np.mean(area_errors)) if area_errors else 0.0,
        
        # Новые Временные (Temporal) метрики
        "frameDifferencePreservation": float(np.mean(frame_diff_preservations)) if frame_diff_preservations else 1.0,
        "centroidTrajectoryError": float(np.mean(centroid_errors)) if centroid_errors else 0.0,
        "velocityError": float(np.mean(vel_errors)) if vel_errors else 0.0,
        "accelerationError": float(np.mean(acc_errors)) if acc_errors else 0.0,
        "opticalFlowConsistency": float(np.mean(frame_diff_preservations)) if frame_diff_preservations else 1.0, # Как CPU fallback
        "temporalSilhouetteDifference": float(np.mean(temporal_sil_diffs)) if temporal_sil_diffs else 0.0,
        "frozenMotionRatio": frozen_ratio,
        "numberOfLostMotionEvents": int(lost_motion_events)
    }
