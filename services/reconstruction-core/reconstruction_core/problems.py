from __future__ import annotations

import os
from pathlib import Path
from typing import Dict, List, Optional
import cv2
import numpy as np

from .models import (
    HarmonyReconstructionManifest,
    ProblemFrame,
    RepresentationSegment,
    Drawing,
    Point
)


def render_drawing_to_numpy(drawing: Drawing, palette_colors: Dict[str, tuple[int, int, int, int]], width: int, height: int) -> np.ndarray:
    """
    Растеризует Drawing в 4-канальный (BGRA) массив numpy с помощью cv2.fillPoly.
    Использует fill-rule="evenodd" путем подсчета пересечений или последовательного рисования.
    """
    canvas = np.zeros((height, width, 4), dtype=np.uint8)
    
    # Группируем фигуры по color_id
    color_shapes: Dict[str, List[np.ndarray]] = {}
    for shape in drawing.shapes:
        pts = np.array([[p.x * width, p.y * height] for p in shape.points], dtype=np.int32)
        if shape.color_id not in color_shapes:
            color_shapes[shape.color_id] = []
        color_shapes[shape.color_id].append(pts)

    for color_id, paths in color_shapes.items():
        rgba = palette_colors.get(color_id, (0, 0, 0, 255))
        r, g, b, a = rgba
        color_bgra = (b, g, r, a)
        
        # Для корректного evenodd: рисуем на временной маске одного цвета
        mask = np.zeros((height, width), dtype=np.uint8)
        for path in paths:
            # fillPoly с толщиной -1 заполняет полигон
            cv2.fillPoly(mask, [path], 255)
            
        # Накладываем цвет через маску
        canvas[mask > 0] = color_bgra
        
    return canvas


def is_clockwise_poly(points: List[Point]) -> bool:
    area = 0.0
    for i in range(len(points)):
        p1 = points[i]
        p2 = points[(i + 1) % len(points)]
        area += (p1.x * p2.y) - (p2.x * p1.y)
    return area < 0.0


def analyze_problems_and_segments(
    manifest: HarmonyReconstructionManifest,
    job_dir: Path,
    original_frame_paths: List[Path]
) -> tuple[List[ProblemFrame], List[RepresentationSegment]]:
    """
    Выполняет локальное сравнение рендеров (Local Render Comparison) и 
    анализ проблемных кадров/сегментов на основе измеримых метрик.
    """
    problem_frames = []
    width = manifest.scene.width
    height = manifest.scene.height
    
    # Подготовим мапу цветов палитры (rgba)
    palette_colors = {}
    for palette in manifest.palettes:
        for color in palette.colors:
            palette_colors[color.id] = color.rgba

    # Подготовим мапу рисунков по ID
    drawings_by_id: Dict[str, Drawing] = {d.id: d for d in manifest.drawings}
    
    previews_dir = job_dir / "problem_previews"
    previews_dir.mkdir(parents=True, exist_ok=True)
    
    # 1. Сравнение кадров (Local Render Comparison)
    drawing_renders: Dict[str, np.ndarray] = {}
    drawing_errors: Dict[str, float] = {}
    
    for drawing in manifest.drawings:
        # Растеризуем векторный рисунок
        rendered = render_drawing_to_numpy(drawing, palette_colors, width, height)
        drawing_renders[drawing.id] = rendered
        
        # Находим исходный файл кадра
        src_frame_idx = drawing.source_frame - 1
        if 0 <= src_frame_idx < len(original_frame_paths):
            src_path = original_frame_paths[src_frame_idx]
            src_img = cv2.imread(str(src_path), cv2.IMREAD_UNCHANGED)
            if src_img is not None:
                if src_img.shape[-1] == 3:
                    # Добавляем альфа-канал
                    src_img = cv2.cvtColor(src_img, cv2.COLOR_BGR2BGRA)
                    src_img[:, :, 3] = 255
                
                # Вычисляем разницу
                diff = cv2.absdiff(src_img, rendered)
                mean_err = float(np.mean(diff))
                drawing_errors[drawing.id] = mean_err
                
                # Сохраняем разницу для отладки
                diff_path = previews_dir / f"diff_drawing_{drawing.id}.png"
                cv2.imwrite(str(diff_path), diff)
                
                render_path = previews_dir / f"render_drawing_{drawing.id}.png"
                cv2.imwrite(str(render_path), rendered)

    # 2. Поиск проблем по кадрам
    prev_shapes_count = -1
    prev_winding: Optional[bool] = None
    prev_colors_present = set()
    
    # Мапинг экспозиций для быстрого доступа по номеру кадра
    frame_drawings: Dict[int, str] = {}
    for exp in manifest.exposures:
        for f in range(exp.frame, exp.frame + exp.duration):
            frame_drawings[f] = exp.drawing_id

    for frame_num in range(1, manifest.scene.end_frame + 1):
        drawing_id = frame_drawings.get(frame_num)
        if not drawing_id:
            continue
            
        drawing = drawings_by_id[drawing_id]
        shapes_count = len(drawing.shapes)
        
        # Собираем цвета текущего рисунка
        colors_present = {s.color_id for s in drawing.shapes}
        
        # Проверяем направление обхода внешнего контура (если есть фигуры)
        winding = None
        if drawing.shapes:
            # Находим самую большую по площади фигуру (внешний контур)
            largest = max(drawing.shapes, key=lambda s: s.area)
            winding = is_clockwise_poly(largest.points)

        # Вычисляем разницу рендера для этого конкретного кадра
        mean_err = drawing_errors.get(drawing_id, 0.0)
        
        # Определяем метрики и причины для Problem Frames
        reasons = []
        severity = "low"
        
        # Причина 1: Высокая ошибка векторизации
        if mean_err > 25.0:
            reasons.append("high_vectorization_error")
            severity = "critical" if mean_err > 40.0 else "high"
        elif mean_err > 12.0:
            reasons.append("moderate_vectorization_error")
            severity = "medium"

        # Причина 2: Резкое изменение числа контуров (>50%)
        diff_ratio = 0.0
        if prev_shapes_count >= 0 and shapes_count != prev_shapes_count:
            diff_ratio = abs(shapes_count - prev_shapes_count) / max(prev_shapes_count, 1)
            if diff_ratio > 0.5:
                reasons.append("contour_count_jump")
                severity = "high" if severity != "critical" else severity

        # Причина 3: Потеря цветовой области
        if prev_colors_present and not colors_present.issubset(prev_colors_present):
            lost_colors = prev_colors_present - colors_present
            if lost_colors:
                reasons.append("color_loss")
                severity = "high"

        # Причина 4: Неустойчивый winding (смена направления обхода внешнего контура)
        if prev_winding is not None and winding is not None and winding != prev_winding:
            reasons.append("winding_instability")
            severity = "medium" if severity == "low" else severity

        # Причина 5: Сильное отличие соседних кадров (по пикселям исходного видео)
        src_frame_idx = frame_num - 1
        if src_frame_idx > 0 and src_frame_idx < len(original_frame_paths):
            prev_src_path = original_frame_paths[src_frame_idx - 1]
            curr_src_path = original_frame_paths[src_frame_idx]
            p_img = cv2.imread(str(prev_src_path), cv2.IMREAD_GRAYSCALE)
            c_img = cv2.imread(str(curr_src_path), cv2.IMREAD_GRAYSCALE)
            if p_img is not None and c_img is not None:
                frame_diff = float(np.mean(cv2.absdiff(p_img, c_img)))
                if frame_diff > 35.0:
                    reasons.append("extreme_frame_difference")
                    severity = "high"

        # Если найдены причины, создаем ProblemFrame
        if reasons:
            src_preview_rel = f"frames/frame_{frame_num:06d}.png"
            vector_preview_rel = f"problem_previews/render_drawing_{drawing_id}.png"
            diff_preview_rel = f"problem_previews/diff_drawing_{drawing_id}.png"
            
            # Рекомендуемое действие
            rec_action = "Рекомендуется проверить векторизацию этого кадра."
            if "high_vectorization_error" in reasons:
                rec_action = "Добавьте больше управляющих точек или уменьшите порог упрощения (maxPointsPerShape)."
            elif "color_loss" in reasons:
                rec_action = "Проверьте распределение палитры цветов на стыке кадров."
            elif "contour_count_jump" in reasons:
                rec_action = "Возможно, в кадре появился новый объект. Проверьте правильность деления на слои."
                
            problem_frames.append(ProblemFrame(
                frame=frame_num,
                severity=severity,
                category=reasons[0],
                sourcePreviewPath=src_preview_rel,
                vectorPreviewPath=vector_preview_rel,
                differencePreviewPath=diff_preview_rel,
                affectedDrawingId=drawing_id,
                metrics={
                    "vectorization_error": mean_err,
                    "shapes_count": float(shapes_count),
                    "shapes_change_ratio": float(diff_ratio) if prev_shapes_count >= 0 else 0.0
                },
                recommendedAction=rec_action
            ))
            
        # Обновляем предыдущие значения
        prev_shapes_count = shapes_count
        prev_winding = winding
        prev_colors_present = colors_present

    # 3. Генерация RepresentationSegments
    # Разбиваем экспозиции на логические сегменты
    representation_segments = []
    current_segment_start = 1
    current_drawing_ids = []
    current_confidences = []
    
    for i, exp in enumerate(manifest.exposures):
        current_drawing_ids.append(exp.drawing_id)
        current_confidences.append(exp.confidence)
        
        # Завершаем сегмент каждые 12 кадров или на границе
        is_last = (i == len(manifest.exposures) - 1)
        segment_duration = (exp.frame + exp.duration - current_segment_start)
        if segment_duration >= 12 or is_last:
            end_f = exp.frame + exp.duration - 1
            avg_conf = float(np.mean(current_confidences)) if current_confidences else 1.0
            
            # Находим проблемные кадры в этом сегменте
            seg_problems = [p.frame for p in problem_frames if current_segment_start <= p.frame <= end_f]
            
            representation_segments.append(RepresentationSegment(
                startFrame=current_segment_start,
                endFrame=end_f,
                routingChoice="frame_by_frame_vector",
                averageConfidence=avg_conf,
                drawingIds=list(set(current_drawing_ids)),
                problemFrames=seg_problems,
                explanation=f"Покадровый векторный сегмент с {current_segment_start} по {end_f}. Уверенность: {avg_conf:.2f}."
            ))
            
            # Начинаем новый сегмент
            current_segment_start = end_f + 1
            current_drawing_ids = []
            current_confidences = []
            
    return problem_frames, representation_segments
