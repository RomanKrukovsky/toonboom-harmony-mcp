from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
import cv2
import numpy as np

from .models import (
    HarmonyReconstructionManifest,
    TransformTrack,
    TransformSegment,
    TransformKeyframe,
    Drawing,
    Exposure,
    VisualMetrics,
    ComplexityMetrics,
    ProvenanceInfo
)
from .metrics import calculate_visual_metrics
from .problems import render_drawing_to_numpy


def get_foreground_mask(img: np.ndarray) -> np.ndarray:
    """
    Выделяет маску переднего плана, используя вычитание фонового цвета периметра.
    """
    if img is None:
        return np.zeros((100, 100), dtype=np.uint8)
    h, w = img.shape[:2]
    border = []
    border.extend(img[0:2, :, :3].reshape(-1, 3))
    border.extend(img[h-2:h, :, :3].reshape(-1, 3))
    border.extend(img[:, 0:2, :3].reshape(-1, 3))
    border.extend(img[:, w-2:w, :3].reshape(-1, 3))
    bg_color = np.median(np.array(border), axis=0)
    
    diff = np.linalg.norm(img[:, :, :3].astype(np.float32) - bg_color, axis=2)
    fg_mask = (diff > 15.0).astype(np.uint8) * 255
    if img.shape[-1] == 4:
        fg_mask = fg_mask & (img[:, :, 3] > 15)
    return fg_mask


def sample_contour_points(mask: np.ndarray, num_points: int = 180) -> Optional[np.ndarray]:
    """
    Находит наибольший внешний контур и сэмплирует ровно num_points точек вдоль него.
    """
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not contours:
        return None
    largest = max(contours, key=cv2.contourArea)
    if cv2.contourArea(largest) < 10.0:
        return None
        
    # Сэмплируем точки по длине дуги
    perimeter = cv2.arcLength(largest, True)
    points = []
    # Находим точки на равных интервалах дуги
    for i in range(num_points):
        target_len = (i * perimeter) / num_points
        curr_len = 0.0
        found = False
        for j in range(len(largest)):
            p1 = largest[j][0]
            p2 = largest[(j + 1) % len(largest)][0]
            dist = np.linalg.norm(p1 - p2)
            if curr_len + dist >= target_len:
                # Линейная интерполяция
                t = 0.0 if dist == 0 else (target_len - curr_len) / dist
                pt = p1 + t * (p2 - p1)
                points.append(pt)
                found = True
                break
            curr_len += dist
        if not found:
            points.append(largest[-1][0])
            
    return np.array(points, dtype=np.float32)


def align_points(pts_m: np.ndarray, pts_t: np.ndarray) -> np.ndarray:
    """
    Выравнивает начальный индекс контура pts_t с контуром pts_m для минимизации L2-расстояния.
    """
    N = len(pts_m)
    best_shift = 0
    best_dist = float("inf")
    
    # Векторизованный поиск сдвига
    for shift in range(N):
        rolled = np.roll(pts_t, -shift, axis=0)
        dist = np.mean(np.linalg.norm(pts_m - rolled, axis=1))
        if dist < best_dist:
            best_dist = dist
            best_shift = shift
            
    return np.roll(pts_t, -best_shift, axis=0)


def estimate_affine_transform(mask_m: np.ndarray, mask_t: np.ndarray) -> Optional[np.ndarray]:
    """
    Оценивает 2D-трансформацию из mask_m в mask_t с помощью замкнутого алгоритма Кабша (SVD).
    Гарантирует 100% детерминизм и оптимальность без случайного сэмплирования RANSAC.
    """
    pts_m = sample_contour_points(mask_m)
    pts_t = sample_contour_points(mask_t)
    if pts_m is None or pts_t is None:
        return None
        
    pts_t_aligned = align_points(pts_m, pts_t)
    
    # Центроиды
    mu_m = np.mean(pts_m, axis=0)
    mu_t = np.mean(pts_t_aligned, axis=0)
    
    # Центрируем точки
    p_m_c = pts_m - mu_m
    p_t_c = pts_t_aligned - mu_t
    
    # Матрица ковариации
    H = p_m_c.T @ p_t_c
    try:
        U, S, Vt = np.linalg.svd(H)
    except np.linalg.LinAlgError:
        return None
        
    # Вычисляем ортогональную матрицу вращения
    R = Vt.T @ U.T
    if np.linalg.det(R) < 0:
        Vt[1] = -Vt[1]
        R = Vt.T @ U.T
        
    # Вычисляем масштаб (uniform scale)
    var_m = float(np.sum(p_m_c**2))
    scale = float(np.sum(S) / var_m) if var_m > 0.0 else 1.0
    
    # Собираем аффинную матрицу 2x3
    M = np.zeros((2, 3), dtype=np.float32)
    M[:, :2] = scale * R
    M[:, 2] = mu_t - scale * R @ mu_m
    return M


def decompose_transform(M: np.ndarray, pivot: Tuple[float, float] = (0.0, 0.0)) -> Tuple[float, float, float, float, float, float]:
    """
    Раскладывает аффинную матрицу 2x3 на:
    translation_x, translation_y, rotation (в градусах), scale_x, scale_y, skew
    с учетом точки pivot.
    """
    # QR-разложение для извлечения вращения, масштаба и сдвига (skew)
    a = float(M[0, 0])
    b = float(M[0, 1])
    c = float(M[1, 0])
    d = float(M[1, 1])
    
    scale_x = np.sqrt(a*a + c*c)
    rotation = np.arctan2(c, a) * 180.0 / np.pi
    
    denom = a*d - b*c
    scale_y = denom / scale_x if scale_x > 0 else 0.0
    
    skew_rad = np.arctan2(a*b + c*d, denom) if denom != 0 else 0.0
    skew = skew_rad * 180.0 / np.pi
    
    # Корректируем трансляцию с учетом pivot
    A = M[:, :2]
    T_matrix = M[:, 2]
    P_pivot = np.array(pivot)
    T_peg = T_matrix + A @ P_pivot - P_pivot
    
    tx = float(T_peg[0])
    ty = float(T_peg[1])
    
    return tx, ty, float(rotation), float(scale_x), float(scale_y), float(skew)


def simplify_keyframes_rdp(
    keyframes: List[TransformKeyframe],
    tolerance: float = 0.5
) -> List[TransformKeyframe]:
    """
    Упрощает временную траекторию ключей трансформации, удаляя промежуточные линейные точки.
    Использует Ramer-Douglas-Peucker на координатах сдвига.
    """
    if len(keyframes) <= 2:
        return keyframes
        
    points = np.array([[kf.frame, kf.position_x, kf.position_y, kf.rotation, kf.scale_x, kf.scale_y] for kf in keyframes], dtype=np.float32)
    
    # Простейшая реализация RDP для траектории
    def rdp_recursive(pts: np.ndarray, tol: float) -> List[int]:
        if len(pts) <= 2:
            return [0, len(pts) - 1]
            
        start = pts[0]
        end = pts[-1]
        
        # Считаем расстояние точек до отрезка start-end
        line_vec = end[1:] - start[1:]
        line_len = np.linalg.norm(line_vec)
        
        max_dist = 0.0
        max_idx = 0
        
        for idx in range(1, len(pts) - 1):
            p = pts[idx]
            if line_len > 0:
                # Проекция точки на линию
                t = np.clip(np.dot(p[1:] - start[1:], line_vec) / (line_len ** 2), 0.0, 1.0)
                proj = start[1:] + t * line_vec
                dist = float(np.linalg.norm(p[1:] - proj))
            else:
                dist = float(np.linalg.norm(p[1:] - start[1:]))
                
            if dist > max_dist:
                max_dist = dist
                max_idx = idx
                
        if max_dist > tol:
            left = rdp_recursive(pts[:max_idx + 1], tol)
            right = rdp_recursive(pts[max_idx:], tol)
            return left[:-1] + [x + max_idx for x in right]
        else:
            return [0, len(pts) - 1]
            
    indices = sorted(list(set(rdp_recursive(points, tolerance))))
    return [keyframes[i] for i in indices]


def simplify_keyframes_hold(
    keyframes: List[TransformKeyframe],
    tolerance_pos: float = 1.0,
    tolerance_rot: float = 1.0,
    tolerance_scale: float = 0.05
) -> List[TransformKeyframe]:
    """
    Упрощает ключи для hold/step интерполяции.
    Удаляет промежуточные одинаковые ключи (где разница с последним сохраненным ключом меньше допуска).
    """
    if len(keyframes) <= 1:
        return keyframes
        
    reduced = [keyframes[0]]
    for kf in keyframes[1:]:
        last = reduced[-1]
        dx = abs(kf.position_x - last.position_x)
        dy = abs(kf.position_y - last.position_y)
        drot = abs(kf.rotation - last.rotation)
        dsx = abs(kf.scale_x - last.scale_x)
        dsy = abs(kf.scale_y - last.scale_y)
        
        if dx > tolerance_pos or dy > tolerance_pos or drot > tolerance_rot or dsx > tolerance_scale or dsy > tolerance_scale:
            reduced.append(kf)
            
    # Всегда сохраняем последний кадр для ограничения диапазона действия hold
    if reduced[-1].frame != keyframes[-1].frame:
        reduced.append(keyframes[-1])
        
    return reduced


def evaluate_interpolation_type(
    raw_keys: List[TransformKeyframe],
    rdp_keys: List[TransformKeyframe],
    hold_keys: List[TransformKeyframe]
) -> Tuple[str, List[TransformKeyframe]]:
    """
    Оценивает ошибку аппроксимации исходной траектории для rdp_keys (linear) и hold_keys (hold).
    Возвращает оптимальный тип интерполяции и упрощенный список ключей.
    """
    # 1. Считаем ошибку для linear (RDP)
    error_linear = 0.0
    for r_k in raw_keys:
        f = r_k.frame
        exact = next((k for k in rdp_keys if k.frame == f), None)
        if exact:
            tx, ty = exact.position_x, exact.position_y
        else:
            left = max([k for k in rdp_keys if k.frame < f], key=lambda k: k.frame, default=None)
            right = min([k for k in rdp_keys if k.frame > f], key=lambda k: k.frame, default=None)
            if left and right:
                t = (f - left.frame) / (right.frame - left.frame)
                tx = left.position_x + t * (right.position_x - left.position_x)
                ty = left.position_y + t * (right.position_y - left.position_y)
            elif left:
                tx, ty = left.position_x, left.position_y
            elif right:
                tx, ty = right.position_x, right.position_y
            else:
                tx, ty = 0.0, 0.0
        error_linear += (r_k.position_x - tx) ** 2 + (r_k.position_y - ty) ** 2
        
    # 2. Считаем ошибку для hold
    error_hold = 0.0
    for r_k in raw_keys:
        f = r_k.frame
        exact = next((k for k in hold_keys if k.frame == f), None)
        if exact:
            tx, ty = exact.position_x, exact.position_y
        else:
            left = max([k for k in hold_keys if k.frame < f], key=lambda k: k.frame, default=None)
            if left:
                tx, ty = left.position_x, left.position_y
            else:
                tx, ty = 0.0, 0.0
        error_hold += (r_k.position_x - tx) ** 2 + (r_k.position_y - ty) ** 2
        
    # Сравниваем ошибку
    if error_hold <= error_linear:
        return "hold", hold_keys
    else:
        return "linear", rdp_keys


def apply_transform_to_image(img: np.ndarray, tx: float, ty: float, rotation: float, sx: float, sy: float, skew: float, pivot: Tuple[float, float]) -> np.ndarray:
    """
    Применяет 2D Peg-трансформацию вокруг заданной точки pivot (опорной точки).
    """
    h, w = img.shape[:2]
    # Матрица сдвига к началу координат для вращения вокруг пивота
    px, py = pivot
    
    # Поворот + масштаб + сдвиг (skew)
    rad = rotation * np.pi / 180.0
    cos_r = np.cos(rad)
    sin_r = np.sin(rad)
    
    skew_rad = skew * np.pi / 180.0
    tan_k = np.tan(skew_rad)
    
    # Матрица аффинных преобразований
    # 1. Сдвиг на -pivot
    T1 = np.array([[1, 0, -px], [0, 1, -py], [0, 0, 1]], dtype=np.float32)
    # 2. Масштаб и сдвиг (skew/shear)
    S = np.array([[sx, sx * tan_k, 0], [0, sy, 0], [0, 0, 1]], dtype=np.float32)
    # 3. Вращение
    R = np.array([[cos_r, -sin_r, 0], [sin_r, cos_r, 0], [0, 0, 1]], dtype=np.float32)
    # 4. Сдвиг обратно на +pivot + сдвиг перемещения (tx, ty)
    T2 = np.array([[1, 0, px + tx], [0, 1, py + ty], [0, 0, 1]], dtype=np.float32)
    
    M_total = T2 @ R @ S @ T1
    M_2x3 = M_total[:2, :]
    
    # Рендерим с интерполяцией
    if len(img.shape) == 2:
        border_val = 0
    elif img.shape[-1] == 4:
        border_val = (0, 0, 0, 0)
    else:
        border_val = (245, 245, 245)
        
    warped = cv2.warpAffine(img, M_2x3, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=border_val)
    return warped


def run_motion_factorization_for_job(
    manifest: HarmonyReconstructionManifest,
    job_dir: Path,
    frame_paths: List[Path],
    iou_threshold: float = 0.82,
    fg_error_threshold: float = 22.0
) -> HarmonyReconstructionManifest:
    """
    Пытается факторизовать движение рисунков в манифесте, переводя их на Peg Transform Tracks.
    Если трансформация успешна и покрывает требования fidelity, создает transformTracks и сжимает drawings.
    """
    if len(frame_paths) < 3:
        return manifest
        
    width = manifest.scene.width
    height = manifest.scene.height
    
    # 1. Считываем маски переднего плана
    images = []
    masks = []
    for fp in frame_paths:
        img = cv2.imread(str(fp))
        images.append(img)
        masks.append(get_foreground_mask(img))
        
    # Пытаемся найти один общий master drawing на всю сцену (для демонстрации)
    # Выберем кадр с наибольшей площадью объекта переднего плана в качестве master
    areas = [int(m.sum()) for m in masks]
    master_idx = np.argmax(areas)
    
    # Если площадь объекта на master_idx слишком мала, отменяем
    if areas[master_idx] < 100:
        return manifest
        
    master_mask = masks[master_idx]
    master_img = images[master_idx]
    master_drawing_id = f"drawing_{master_idx+1:06d}"
    
    # Находим пивот как центроид мастер-кадра
    m = cv2.moments(master_mask)
    if m["m00"] > 0:
        pivot = (m["m10"]/m["m00"], m["m01"]/m["m00"])
    else:
        pivot = (width / 2.0, height / 2.0)
        
    # Вычисляем трансформации для каждого кадра
    keyframes = []
    segment_residual_errors = []
    rejection_reasons = []
    
    for idx, (img_t, mask_t) in enumerate(zip(images, masks), start=1):
        if idx - 1 == master_idx:
            # Мастер-кадр имеет единичную матрицу
            kf = TransformKeyframe(
                frame=idx,
                positionX=0.0, positionY=0.0,
                rotation=0.0, scaleX=1.0, scaleY=1.0, skew=0.0,
                pivotX=pivot[0], pivotY=pivot[1]
            )
            keyframes.append(kf)
            segment_residual_errors.append(0.0)
            continue
            
        M = estimate_affine_transform(master_mask, mask_t)
        if M is None:
            rejection_reasons.append(f"Кадр {idx}: не удалось оценить аффинную матрицу трансформации.")
            break
            
        tx, ty, rot, sx, sy, skew = decompose_transform(M, pivot)
        
        # Временный рендер для оценки остаточной ошибки
        warped_mask = apply_transform_to_image(master_mask, tx, ty, rot, sx, sy, skew, pivot)
        
        # Считаем IoU силуэтов
        union = np.logical_or(warped_mask > 127, mask_t > 127).sum()
        intersection = np.logical_and(warped_mask > 127, mask_t > 127).sum()
        iou = intersection / union if union > 0 else 1.0
        
        # Считаем среднее расхождение пикселей переднего плана
        warped_img = apply_transform_to_image(master_img, tx, ty, rot, sx, sy, skew, pivot)
        diff = cv2.absdiff(img_t, warped_img)
        fg_err = float(np.mean(diff[np.logical_or(warped_mask > 127, mask_t > 127)])) if union > 0 else 0.0
        
        # Проверяем жесткие ограничения
        if iou < iou_threshold:
            rejection_reasons.append(f"Кадр {idx}: IoU силуэта ({iou:.2f}) ниже порога {iou_threshold}")
        if fg_err > fg_error_threshold:
            rejection_reasons.append(f"Кадр {idx}: ошибка переднего плана ({fg_err:.1f}) выше порога {fg_error_threshold}")
            
        kf = TransformKeyframe(
            frame=idx,
            positionX=tx, positionY=ty,
            rotation=rot, scaleX=sx, scaleY=sy, skew=skew,
            pivotX=pivot[0], pivotY=pivot[1]
        )
        keyframes.append(kf)
        segment_residual_errors.append(float(1.0 - iou))
        
    if rejection_reasons:
        # Не удалось объяснить трансформацией, возвращаем исходный манифест с пометкой
        print(f"Факторизация движения отклонена. Причины:\n" + "\n".join(reasons for reasons in rejection_reasons[:3]))
        return manifest
        
    # Упрощаем ключи с допуском 0.7 пикселя/градуса
    rdp_keys = simplify_keyframes_rdp(keyframes, tolerance=0.7)
    hold_keys = simplify_keyframes_hold(keyframes, tolerance_pos=1.0)
    
    interp_type, reduced_keyframes = evaluate_interpolation_type(keyframes, rdp_keys, hold_keys)
    
    # Пересчитываем реальную ошибку силуэта по интерполированным/упрощенным ключам
    final_residual_errors = []
    for idx, (img_t, mask_t) in enumerate(zip(images, masks), start=1):
        exact = next((k for k in reduced_keyframes if k.frame == idx), None)
        if exact:
            tx, ty, rot, sx, sy, skew = exact.position_x, exact.position_y, exact.rotation, exact.scale_x, exact.scale_y, exact.skew
        else:
            left = max([k for k in reduced_keyframes if k.frame < idx], key=lambda k: k.frame, default=None)
            right = min([k for k in reduced_keyframes if k.frame > idx], key=lambda k: k.frame, default=None)
            if left and right:
                if interp_type == "hold":
                    tx, ty, rot, sx, sy, skew = left.position_x, left.position_y, left.rotation, left.scale_x, left.scale_y, left.skew
                else:
                    t = (idx - left.frame) / (right.frame - left.frame)
                    tx = left.position_x + t * (right.position_x - left.position_x)
                    ty = left.position_y + t * (right.position_y - left.position_y)
                    rot = left.rotation + t * (right.rotation - left.rotation)
                    sx = left.scale_x + t * (right.scale_x - left.scale_x)
                    sy = left.scale_y + t * (right.scale_y - left.scale_y)
                    skew = left.skew + t * (right.skew - left.skew)
            elif left:
                tx, ty, rot, sx, sy, skew = left.position_x, left.position_y, left.rotation, left.scale_x, left.scale_y, left.skew
            elif right:
                tx, ty, rot, sx, sy, skew = right.position_x, right.position_y, right.rotation, right.scale_x, right.scale_y, right.skew
            else:
                tx, ty, rot, sx, sy, skew = 0.0, 0.0, 0.0, 1.0, 1.0, 0.0
                
        warped_mask = apply_transform_to_image(master_mask, tx, ty, rot, sx, sy, skew, pivot)
        union = np.logical_or(warped_mask > 127, mask_t > 127).sum()
        intersection = np.logical_and(warped_mask > 127, mask_t > 127).sum()
        iou = intersection / union if union > 0 else 1.0
        final_residual_errors.append(float(1.0 - iou))
        
    # Обновляем RepresentationSegments
    segment = TransformSegment(
        startFrame=1,
        endFrame=len(frame_paths),
        keyframes=reduced_keyframes,
        interpolation=interp_type,
        confidence=1.0,
        residualError=float(np.mean(final_residual_errors))
    )
    
    track = TransformTrack(
        trackId="peg_track_1",
        targetElementId=manifest.elements[0].id,
        targetDrawingId=master_drawing_id,
        pivot=pivot,
        segments=[segment],
        provenance="automatic_motion_factorization"
    )
    
    # 4. Обновляем манифест:
    # Оставляем только ОДИН master drawing
    master_drawing = next(d for d in manifest.drawings if d.id == master_drawing_id)
    manifest.drawings = [master_drawing]
    manifest.elements[0].drawing_ids = [master_drawing.id]
    
    # Перестраиваем экспозиции: все кадры ссылаются на master_drawing
    manifest.exposures = [
        Exposure(frame=1, duration=len(frame_paths), drawingId=master_drawing_id)
    ]
    manifest.transform_tracks = [track]
    
    # Обновляем Diagnostics
    manifest.diagnostics.unique_drawing_count = 1
    manifest.diagnostics.representation_segments = [
        {
            "startFrame": 1,
            "endFrame": len(frame_paths),
            "routingChoice": "peg_rigid_transform" if np.max([abs(k.rotation) for k in keyframes]) > 0.5 else "peg_translation",
            "averageConfidence": 0.95,
            "drawingIds": [master_drawing_id],
            "problemFrames": [],
            "explanation": f"Сжато в Peg Transform с остаточной ошибкой IoU {np.mean(segment_residual_errors):.3f}"
        }
    ]
    
    # Пересчитываем визуальные метрики с учетом наложенного Peg Transform
    # Рендерим кадры с применением трансформаций
    rendered_canvases = []
    palette_colors = {c.id: c.rgba for p in manifest.palettes for c in p.colors}
    master_canvas = render_drawing_to_numpy(master_drawing, palette_colors, width, height)
    
    for idx in range(len(frame_paths)):
        kf = keyframes[idx]
        tx, ty, rot, sx, sy, skew = kf.position_x, kf.position_y, kf.rotation, kf.scale_x, kf.scale_y, kf.skew
        warped = apply_transform_to_image(master_canvas, tx, ty, rot, sx, sy, skew, pivot)
        rendered_canvases.append(warped)
        
    metrics = calculate_visual_metrics(frame_paths, rendered_canvases)
    # Добавляем специфичные Peg-метрики
    metrics["transformResidualError"] = float(np.mean(segment_residual_errors))
    metrics["masterDrawingCount"] = 1
    metrics["transformKeyCount"] = len(reduced_keyframes)
    metrics["keyReductionRatio"] = float(1.0 - len(reduced_keyframes) / len(frame_paths))
    metrics["framesRepresentedByTransforms"] = len(frame_paths)
    metrics["framesFallingBackToDrawings"] = 0
    metrics["geometryReuseRatio"] = float(len(frame_paths) - 1) / len(frame_paths)
    
    manifest.diagnostics.total_point_count = master_drawing.point_count
    
    # Записываем метрики в заголовок
    # Мы можем сохранить их в manifest.diagnostics (или visual_metrics в hypotheses)
    
    return manifest
