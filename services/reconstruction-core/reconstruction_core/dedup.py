from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Sequence, Tuple

import cv2
import numpy as np


@dataclass(frozen=True)
class FrameSignature:
    gray: np.ndarray
    edges: np.ndarray
    mean_colour: np.ndarray
    fg_mask: np.ndarray
    centroid: Tuple[float, float]
    area: float


def signature(path: Path) -> FrameSignature:
    image = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if image is None:
        raise ValueError(f"Не удалось прочитать {path}")
    if image.shape[-1] == 4:
        bgr = image[:, :, :3]
    else:
        bgr = image
        
    h, w = bgr.shape[:2]
    # Находим цвет фона
    border = []
    border.extend(bgr[0:2, :, :].reshape(-1, 3))
    border.extend(bgr[h-2:h, :, :].reshape(-1, 3))
    border.extend(bgr[:, 0:2, :].reshape(-1, 3))
    border.extend(bgr[:, w-2:w, :].reshape(-1, 3))
    bg_color = np.median(np.array(border), axis=0)
    
    # Строим маску переднего плана
    diff = np.linalg.norm(bgr.astype(np.float32) - bg_color, axis=2)
    fg_mask = (diff > 15.0).astype(np.uint8) * 255
    
    # Находим центроид и площадь
    moments = cv2.moments(fg_mask)
    if moments["m00"] > 0:
        centroid = (moments["m10"] / moments["m00"], moments["m01"] / moments["m00"])
        area = float(moments["m00"] / 255.0)
    else:
        centroid = (0.0, 0.0)
        area = 0.0
        
    small = cv2.resize(bgr, (64, 64), interpolation=cv2.INTER_AREA)
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
    edges = cv2.Canny((gray * 255).astype(np.uint8), 60, 120).astype(np.float32) / 255.0
    
    return FrameSignature(
        gray=gray,
        edges=edges,
        mean_colour=small.reshape(-1, 3).mean(axis=0) / 255.0,
        fg_mask=fg_mask,
        centroid=centroid,
        area=area
    )


def compare(a: FrameSignature, b: FrameSignature) -> Dict[str, float]:
    luminance = float(np.mean(np.abs(a.gray - b.gray)))
    edge = float(np.mean(np.abs(a.edges - b.edges)))
    colour = float(np.mean(np.abs(a.mean_colour - b.mean_colour)))
    c1, c2 = 0.01 ** 2, 0.03 ** 2
    mu_a, mu_b = float(a.gray.mean()), float(b.gray.mean())
    var_a, var_b = float(a.gray.var()), float(b.gray.var())
    covariance = float(np.mean((a.gray - mu_a) * (b.gray - mu_b)))
    ssim = ((2 * mu_a * mu_b + c1) * (2 * covariance + c2)) / ((mu_a**2 + mu_b**2 + c1) * (var_a + var_b + c2))
    shift, response = cv2.phaseCorrelate(a.gray, b.gray)
    motion = min(1.0, (abs(shift[0]) + abs(shift[1])) / 32.0) * max(0.0, min(1.0, response))
    score = 0.35 * luminance + 0.35 * edge + 0.15 * colour + 0.10 * (1.0 - max(-1.0, min(1.0, ssim))) + 0.05 * motion
    return {"score": score, "luminance": luminance, "edge": edge, "colour": colour, "ssim": ssim, "motion": motion}


def deduplicate(
    frame_paths: Sequence[Path],
    threshold: float,
    candidate_window: int = 48,
    key_pose_protection: bool = True
) -> Tuple[List[int], List[int], List[Dict[str, float]]]:
    signatures = [signature(path) for path in frame_paths]
    representatives: List[int] = []
    mapping: List[int] = []
    metrics: List[Dict[str, float]] = []
    
    for frame_index, current in enumerate(signatures):
        best_rep = None
        best = None
        
        for drawing_index in range(max(0, len(representatives) - candidate_window), len(representatives)):
            rep_idx = representatives[drawing_index]
            rep_sig = signatures[rep_idx]
            
            # Считаем разницу центроидов, площадей и IoU силуэтов
            c_dist = np.linalg.norm(np.array(current.centroid) - np.array(rep_sig.centroid))
            area_diff = abs(current.area - rep_sig.area) / max(current.area, rep_sig.area, 1.0)
            
            intersection = np.logical_and(current.fg_mask, rep_sig.fg_mask).sum()
            union = np.logical_or(current.fg_mask, rep_sig.fg_mask).sum()
            iou = intersection / union if union > 0 else 1.0
            
            # Защита ключевых поз (Key-Pose Protection)
            # Если объект сместился больше чем на 1.5 пикселя, площадь изменилась > 15%, или IoU силуэтов < 0.85
            # то мы ЗАПРЕЩАЕМ дедупликацию с этим кандидатом!
            if key_pose_protection and (current.area > 50.0 or rep_sig.area > 50.0):
                if c_dist > 1.5 or area_diff > 0.15 or iou < 0.85:
                    continue
                    
            candidate = compare(current, rep_sig)
            if best is None or candidate["score"] < best["score"]:
                best, best_rep = candidate, drawing_index
                
        if best is not None and best["score"] <= threshold:
            mapping.append(int(best_rep))
            metrics.append(best)
        else:
            representatives.append(frame_index)
            mapping.append(len(representatives) - 1)
            metrics.append(best or {"score": 1.0, "luminance": 1.0, "edge": 1.0, "colour": 1.0, "ssim": 0.0, "motion": 1.0})
            
    return representatives, mapping, metrics


def build_exposure_blocks(mapping: Sequence[int]) -> List[Tuple[int, int, int]]:
    blocks = []
    start = 1
    current = mapping[0]
    for frame, drawing in enumerate(mapping[1:], start=2):
        if drawing != current:
            blocks.append((start, frame - start, current))
            start, current = frame, drawing
    blocks.append((start, len(mapping) + 1 - start, current))
    return blocks
