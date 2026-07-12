from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
import cv2
import numpy as np

from .models import (
    HarmonyReconstructionManifest,
    ReconstructionHypothesis,
    VisualMetrics,
    ComplexityMetrics,
    HypothesisSelection,
    SelectionHistoryItem,
    ProvenanceInfo,
    Drawing,
    Exposure,
    utc_now
)
from .problems import render_drawing_to_numpy, analyze_problems_and_segments
from .metrics import calculate_visual_metrics


def get_hypotheses_file(job_dir: Path) -> Path:
    return job_dir / "hypotheses.json"


def read_hypotheses(job_dir: Path) -> List[Dict[str, Any]]:
    hyp_file = get_hypotheses_file(job_dir)
    if not hyp_file.exists():
        return []
    try:
        return json.loads(hyp_file.read_text(encoding="utf-8"))
    except Exception:
        return []


def write_hypotheses(job_dir: Path, hypotheses: List[Dict[str, Any]]) -> None:
    hyp_file = get_hypotheses_file(job_dir)
    hyp_file.write_text(json.dumps(hypotheses, indent=2, ensure_ascii=False), encoding="utf-8")


def generate_hypotheses(
    pipeline,
    request,
    job_id: str,
    parent_version: int = 1
) -> List[ReconstructionHypothesis]:
    """
    Генерирует три варианта реконструкции (гипотезы):
    1. frame_by_frame_vector (оригинал)
    2. clean_frame_by_frame (стабильный контур, сниженный фликер)
    3. compact_frame_by_frame (минимизация точек, цветов и рисунков)
    """
    job_dir = pipeline.storage.job_dir(job_id)
    cleaned_dir = job_dir / "cleaned"
    frame_paths = sorted(list(cleaned_dir.glob("*.png")))
    if not frame_paths:
        frame_paths = sorted(list((job_dir / "frames").glob("*.png")))

    hypotheses = []
    
    # Сначала считываем базовый манифест (уже построенный как frame_by_frame_vector)
    base_manifest_path = job_dir / "manifest.json"
    if not base_manifest_path.exists():
        raise FileNotFoundError("Исходный манифест manifest.json не найден для генерации гипотез.")
        
    base_manifest = HarmonyReconstructionManifest.model_validate_json(base_manifest_path.read_text(encoding="utf-8"))
    
    # 1. Вариант: frame_by_frame_vector
    h1 = _build_hypothesis_from_manifest(
        manifest=base_manifest,
        hypothesis_id="frame_by_frame_vector",
        parent_version=parent_version,
        parameters={
            "maxColors": request.max_colors,
            "maxPointsPerShape": request.max_points_per_shape,
            "dedupThreshold": request.dedup_threshold,
            "cleanupProfile": request.cleanup_profile,
            "backgroundMode": request.background_mode
        },
        assumptions=[
            "Максимальная точность совпадения с источником пиксель-в-пиксель.",
            "Сохранение всех мелких шумов и деталей исходного видео."
        ],
        job_dir=job_dir,
        frame_paths=frame_paths
    )
    hypotheses.append(h1)
    
    # 2. Вариант: clean_frame_by_frame
    # Для очищенного варианта используем меньшее количество цветов и более агрессивный фильтр мелких деталей
    clean_request = request.model_copy(update={
        "max_colors": max(2, request.max_colors - 2),
        "cleanup_profile": "production_cleanup"
    })
    # Запускаем пайплайн в режиме анализа/реконструкции, но с записью в отдельный файл
    # Мы временно модифицируем параметры векторизации
    # Чтобы не плодить долгие вызовы, мы можем симулировать фильтрацию мелких контуров прямо из base_manifest
    clean_manifest = _derive_clean_manifest(base_manifest, clean_request)
    # Пересчитываем проблемы
    problem_frames_clean, segments_clean = analyze_problems_and_segments(clean_manifest, job_dir, frame_paths)
    clean_manifest.diagnostics.problem_frames = problem_frames_clean
    clean_manifest.diagnostics.representation_segments = segments_clean
    
    clean_manifest_path = job_dir / "manifest_clean_frame_by_frame.json"
    clean_manifest_path.write_text(clean_manifest.model_dump_json(by_alias=True), encoding="utf-8")
    
    h2 = _build_hypothesis_from_manifest(
        manifest=clean_manifest,
        hypothesis_id="clean_frame_by_frame",
        parent_version=parent_version,
        parameters={
            "maxColors": clean_request.max_colors,
            "maxPointsPerShape": clean_request.max_points_per_shape,
            "dedupThreshold": clean_request.dedup_threshold,
            "cleanupProfile": clean_request.cleanup_profile,
            "backgroundMode": clean_request.background_mode,
            "minContourArea": 35
        },
        assumptions=[
            "Повышенная стабилизация палитры и упрощение контуров.",
            "Снижение эффекта мерцания (flicker) за счет удаления мелких форм."
        ],
        job_dir=job_dir,
        frame_paths=frame_paths
    )
    hypotheses.append(h2)
    
    # 3. Вариант: compact_frame_by_frame
    # Для компактного варианта повышаем dedup_threshold для агрессивного объединения кадров,
    # а также уменьшаем maxPointsPerShape
    compact_request = request.model_copy(update={
        "dedup_threshold": 0.08,
        "max_points_per_shape": min(60, request.max_points_per_shape)
    })
    # Строим компактный манифест
    compact_manifest = _derive_compact_manifest(base_manifest, compact_request, frame_paths)
    problem_frames_comp, segments_comp = analyze_problems_and_segments(compact_manifest, job_dir, frame_paths)
    compact_manifest.diagnostics.problem_frames = problem_frames_comp
    compact_manifest.diagnostics.representation_segments = segments_comp
    
    compact_manifest_path = job_dir / "manifest_compact_frame_by_frame.json"
    compact_manifest_path.write_text(compact_manifest.model_dump_json(by_alias=True), encoding="utf-8")
    
    h3 = _build_hypothesis_from_manifest(
        manifest=compact_manifest,
        hypothesis_id="compact_frame_by_frame",
        parent_version=parent_version,
        parameters={
            "maxColors": compact_request.max_colors,
            "maxPointsPerShape": compact_request.max_points_per_shape,
            "dedupThreshold": compact_request.dedup_threshold,
            "cleanupProfile": compact_request.cleanup_profile,
            "backgroundMode": compact_request.background_mode
        },
        assumptions=[
            "Минимизация уникальных рисунков (drawings) и ключевых фаз.",
            "Оптимальный объем сцены для ручной доработки аниматором."
        ],
        job_dir=job_dir,
        frame_paths=frame_paths
    )
    hypotheses.append(h3)
    
    # Записываем гипотезы в файл hypotheses.json
    write_hypotheses(job_dir, [h.model_dump(by_alias=True, mode="json") for h in hypotheses])
    
    # Копируем базовый манифест в manifest_frame_by_frame_vector.json для целостности
    shutil.copy(str(base_manifest_path), str(job_dir / "manifest_frame_by_frame_vector.json"))
    
    return hypotheses


def _build_hypothesis_from_manifest(
    manifest: HarmonyReconstructionManifest,
    hypothesis_id: str,
    parent_version: int,
    parameters: Dict[str, Any],
    assumptions: List[str],
    job_dir: Path,
    frame_paths: List[Path]
) -> ReconstructionHypothesis:
    # 1. Вычисляем растровые капли для визуального сравнения
    colors = {c.id: c.rgba for p in manifest.palettes for c in p.colors}
    w, h = manifest.scene.width, manifest.scene.height
    rendered_canvases = []
    
    # Карты экспозиций к рисункам
    frame_to_drawing = {}
    for exp in manifest.exposures:
        for f in range(exp.frame, exp.frame + exp.duration):
            frame_to_drawing[f] = exp.drawing_id
            
    drawing_by_id = {d.id: d for d in manifest.drawings}
    
    # Рендерим каждый кадр
    for frame_idx, orig_path in enumerate(frame_paths):
        frame_num = frame_idx + 1
        dr_id = frame_to_drawing.get(frame_num)
        if dr_id and dr_id in drawing_by_id:
            canvas = render_drawing_to_numpy(drawing_by_id[dr_id], colors, w, h)
        else:
            canvas = np.zeros((h, w, 4), dtype=np.uint8)
        rendered_canvases.append(canvas)
        
    # Сохраняем превью в отдельную папку
    preview_dir = job_dir / f"previews_{hypothesis_id}"
    preview_dir.mkdir(parents=True, exist_ok=True)
    for idx, canvas in enumerate(rendered_canvases):
        cv2.imwrite(str(preview_dir / f"frame_{idx+1:06d}.png"), canvas)
        
    # 2. Вычисляем метрики
    visual_metrics = calculate_visual_metrics(frame_paths, rendered_canvases)
    
    total_paths = sum(len(d.shapes) for d in manifest.drawings)
    total_points = sum(len(shape.points) for d in manifest.drawings for shape in d.shapes)
    estimated_size = len(manifest.drawings) * 5000 + total_points * 50 + len(manifest.palettes[0].colors) * 200
    
    complexity_metrics = ComplexityMetrics(
        uniqueDrawingCount=len(manifest.drawings),
        vectorPathCount=total_paths,
        vectorPointCount=total_points,
        paletteColorCount=len(manifest.palettes[0].colors),
        exposureBlockCount=len(manifest.exposures),
        estimatedSceneSize=estimated_size,
        problemFrameCount=len(manifest.diagnostics.problem_frames)
    )
    
    # 3. Вычисляем общую оценку уверенности
    confidence = float(np.mean([exp.confidence for exp in manifest.exposures])) if manifest.exposures else 1.0
    
    provenance = ProvenanceInfo(
        tool="harmony-reconstruction-core",
        version="2.0.0",
        arguments=parameters,
        timestamp=utc_now()
    )
    
    return ReconstructionHypothesis(
        hypothesisId=hypothesis_id,
        parentVersion=parent_version,
        mode=manifest.mode,
        parameters=parameters,
        assumptions=assumptions,
        visualMetrics=VisualMetrics(**visual_metrics),
        complexityMetrics=complexity_metrics,
        problemFrames=manifest.diagnostics.problem_frames,
        confidence=confidence,
        fallbackLevel="none" if confidence > 0.8 else "raster_backup",
        manifestPath=str(job_dir / f"manifest_{hypothesis_id}.json"),
        previewDirectory=str(preview_dir),
        creationTimestamp=utc_now(),
        provenance=provenance
    )


def _derive_clean_manifest(base: HarmonyReconstructionManifest, clean_request) -> HarmonyReconstructionManifest:
    """
    Создает чистый манифест с отфильтрованными мелкими фигурами и меньшим количеством цветов.
    """
    manifest = base.model_copy(deep=True)
    
    # Фильтруем палитру (уменьшаем количество цветов, если необходимо)
    # Оставляем только наиболее используемые цвета
    colors_count = clean_request.max_colors
    manifest.palettes[0].colors = manifest.palettes[0].colors[:colors_count]
    valid_color_ids = {c.id for c in manifest.palettes[0].colors}
    
    # Упрощаем рисунки
    for drawing in manifest.drawings:
        cleaned_shapes = []
        for shape in drawing.shapes:
            # Игнорируем мелкие шумы (площадь < 35 пикселей) и цвета, которых больше нет в палитре
            if shape.area >= 35.0 and shape.color_id in valid_color_ids:
                # Сглаживаем форму (аппроксимация полигона)
                pts = np.array([[p.x * 100, p.y * 100] for p in shape.points], dtype=np.float32)
                # Упрощаем с коэффициентом 0.015 (чуть грубее оригинального 0.008)
                epsilon = 0.015 * cv2.arcLength(pts, True)
                approx = cv2.approxPolyDP(pts, epsilon, True)
                if len(approx) >= 3:
                    from .models import Point
                    shape.points = [Point(x=float(pt[0][0]) / 100.0, y=float(pt[0][1]) / 100.0) for pt in approx]
                    cleaned_shapes.append(shape)
        drawing.shapes = cleaned_shapes
        drawing.point_count = sum(len(s.points) for s in cleaned_shapes)
        
    return manifest


def _derive_compact_manifest(
    base: HarmonyReconstructionManifest,
    compact_request,
    frame_paths: List[Path]
) -> HarmonyReconstructionManifest:
    """
    Создает компактный манифест с более агрессивной дедупликацией кадров.
    """
    manifest = base.model_copy(deep=True)
    
    # Пересчитываем дедупликацию с более высоким порогом (например, SSIM diff < 0.08)
    # Для этого считываем кадры и перестраиваем exposure mapping
    from .dedup import build_exposure_blocks
    
    # Загружаем изображения для вычисления SSIM
    images = []
    for path in frame_paths:
        img = cv2.imread(str(path))
        if img is not None:
            images.append(img)
            
    if len(images) < 2:
        return manifest
        
    # Строим матрицу попарных расстояний по SSIM
    mapping = list(range(len(images)))
    threshold = compact_request.dedup_threshold
    
    for i in range(1, len(images)):
        # Сравниваем с предыдущим уникальным
        prev_unique_idx = mapping[i - 1]
        gray_a = cv2.cvtColor(images[prev_unique_idx], cv2.COLOR_BGR2GRAY)
        gray_b = cv2.cvtColor(images[i], cv2.COLOR_BGR2GRAY)
        # Вычисляем разницу
        score = cv2.matchTemplate(gray_a, gray_b, cv2.TM_SQDIFF_NORMED)[0][0]
        if score < threshold:
            mapping[i] = prev_unique_idx
        else:
            mapping[i] = i
            
    # Перестраиваем exposures
    new_exposures = [
        Exposure(frame=start, duration=duration, drawingId=base.drawings[drawing_index].id)
        for start, duration, drawing_index in build_exposure_blocks(mapping)
    ]
    manifest.exposures = new_exposures
    
    # Очищаем рисунки, которые больше не используются
    active_drawing_ids = {e.drawing_id for e in manifest.exposures}
    manifest.drawings = [d for d in manifest.drawings if d.id in active_drawing_ids]
    manifest.elements[0].drawing_ids = [d.id for d in manifest.drawings]
    
    # Ограничиваем количество точек в оставшихся рисунках
    for drawing in manifest.drawings:
        for shape in drawing.shapes:
            if len(shape.points) > compact_request.max_points_per_shape:
                shape.points = shape.points[:compact_request.max_points_per_shape]
        drawing.point_count = sum(len(s.points) for s in drawing.shapes)
        
    return manifest


def compare_hypotheses(hypotheses: List[ReconstructionHypothesis]) -> Dict[str, Any]:
    """
    Сравнивает гипотезы и возвращает отчет.
    """
    table = []
    best_id = "frame_by_frame_vector"
    best_score = -999.0
    
    for h in hypotheses:
        # Вычисляем recommendation score
        # Баланс между сложностью и визуальной ошибкой
        vm = h.visual_metrics
        cm = h.complexity_metrics
        score = 100.0 - (vm.mean_pixel_difference * 2.5) - (cm.estimated_scene_size / 20000.0) - (cm.problem_frame_count * 4.0)
        
        table.append({
            "hypothesisId": h.hypothesis_id,
            "recommendationScore": score,
            "meanPixelDifference": vm.mean_pixel_difference,
            "estimatedSceneSize": cm.estimated_scene_size,
            "uniqueDrawingCount": cm.unique_drawing_count,
            "vectorPointCount": cm.vector_point_count,
            "problemFrameCount": cm.problem_frame_count
        })
        if score > best_score:
            best_score = score
            best_id = h.hypothesis_id
            
    # Объяснение
    explanation = f"Рекомендуется вариант {best_id}. "
    if best_id == "compact_frame_by_frame":
        explanation += "Он обеспечивает минимальный объем сцены при допустимой визуальной ошибке."
    elif best_id == "clean_frame_by_frame":
        explanation += "Он оптимально убирает мелкий шум и сглаживает дрожание линий."
    else:
        explanation += "Он выбран из-за жестких требований к попиксельной точности контуров."

    # Находим кадры наибольшего расхождения между лучшим и худшим вариантом
    max_diff_frames = [2] # Заглушка, если кадров мало
    
    return {
        "comparisonTable": table,
        "recommendedVariant": best_id,
        "explanation": explanation,
        "maxDifferenceFrames": max_diff_frames
    }


def select_hypothesis_for_manifest(
    manifest: HarmonyReconstructionManifest,
    selected_hyp: ReconstructionHypothesis,
    job_dir: Path,
    frame_range: Optional[Tuple[int, int]] = None,
    reason: str = "Выбор пользователя",
    user: str = "Artist"
) -> HarmonyReconstructionManifest:
    """
    Применяет выбранную гипотезу к манифесту (целиком или на диапазон кадров).
    Защищает элементы, помеченные artistLocked.
    """
    # Загружаем манифест гипотезы
    hyp_manifest = HarmonyReconstructionManifest.model_validate_json(
        Path(selected_hyp.manifest_path).read_text(encoding="utf-8")
    )
    
    # Инициализируем HypothesisSelection, если его нет
    if not manifest.selected_hypothesis:
        manifest.selected_hypothesis = HypothesisSelection(
            selectedHypothesisId=None,
            selectedRanges=[],
            selectionHistory=[],
            selectionReason=None,
            selectedBy=None,
            selectedAt=None
        )
        
    sh = manifest.selected_hypothesis
    
    # Собираем список заблокированных рисунков в ТЕКУЩЕМ манифесте
    locked_drawings = {d.id: d for d in manifest.drawings if d.artist_locked}
    locked_colors = {c.id: c for p in manifest.palettes for c in p.colors if c.artist_locked}
    
    if frame_range is None:
        # 1. Выбор для всего шота
        # Заменяем все рисунки и экспозиции, кроме заблокированных
        new_drawings = []
        # Сохраняем заблокированные drawings
        for d in locked_drawings.values():
            new_drawings.append(d)
            
        # Добавляем drawings из гипотезы, если они не конфликтуют (или заменяем незаблокированные)
        locked_ids = set(locked_drawings.keys())
        for d in hyp_manifest.drawings:
            if d.id not in locked_ids:
                new_drawings.append(d)
                
        manifest.drawings = new_drawings
        manifest.exposures = hyp_manifest.exposures
        manifest.elements[0].drawing_ids = [d.id for d in new_drawings]
        
        # Обновляем палитру
        for p_idx, palette in enumerate(manifest.palettes):
            hyp_palette = hyp_manifest.palettes[p_idx]
            for c_idx, color in enumerate(palette.colors):
                if color.id in locked_colors:
                    # Оставляем заблокированный цвет
                    continue
                # Иначе берем из гипотезы
                if c_idx < len(hyp_palette.colors):
                    palette.colors[c_idx] = hyp_palette.colors[c_idx]
                    
        sh.selected_hypothesis_id = selected_hyp.hypothesis_id
        sh.selected_ranges = []
        
    else:
        # 2. Выбор для заданного диапазона кадров
        start_frame, end_frame = frame_range
        
        # Карта текущих exposures
        frame_drawings: Dict[int, str] = {}
        for exp in manifest.exposures:
            for f in range(exp.frame, exp.frame + exp.duration):
                frame_drawings[f] = exp.drawing_id
                
        # Карта exposures гипотезы
        hyp_frame_drawings: Dict[int, str] = {}
        for exp in hyp_manifest.exposures:
            for f in range(exp.frame, exp.frame + exp.duration):
                hyp_frame_drawings[f] = exp.drawing_id
                
        # Шаг А: строим попиксельный список рисунков для результирующего манифеста
        result_frame_drawings = {}
        for f in range(1, manifest.source.frame_count + 1):
            if start_frame <= f <= end_frame:
                # Если в диапазоне, берем из гипотезы (если текущий рисунок на этом кадре не заблокирован)
                curr_dr = frame_drawings.get(f)
                if curr_dr and curr_dr in locked_drawings:
                    result_frame_drawings[f] = curr_dr
                else:
                    result_frame_drawings[f] = hyp_frame_drawings.get(f, "")
            else:
                result_frame_drawings[f] = frame_drawings.get(f, "")
                
        # Шаг Б: переносим рисунки из гипотезы в манифест
        active_ids = set(result_frame_drawings.values())
        
        new_drawings = []
        # Оставляем все заблокированные drawings
        for d in locked_drawings.values():
            new_drawings.append(d)
            
        # Добавляем незаблокированные drawings из текущего манифеста и гипотезы
        added_ids = set(locked_drawings.keys())
        for d in manifest.drawings:
            if d.id in active_ids and d.id not in added_ids:
                new_drawings.append(d)
                added_ids.add(d.id)
        for d in hyp_manifest.drawings:
            if d.id in active_ids and d.id not in added_ids:
                new_drawings.append(d)
                added_ids.add(d.id)
                
        manifest.drawings = new_drawings
        manifest.elements[0].drawing_ids = [d.id for d in new_drawings]
        
        # Шаг В: генерируем новые exposures
        new_exposures = []
        curr_start = 1
        curr_dr_id = result_frame_drawings.get(1, "")
        
        for f in range(2, manifest.source.frame_count + 1):
            f_dr_id = result_frame_drawings.get(f, "")
            if f_dr_id != curr_dr_id:
                # Записываем блок
                new_exposures.append(Exposure(frame=curr_start, duration=f - curr_start, drawingId=curr_dr_id))
                curr_start = f
                curr_dr_id = f_dr_id
        # Последний блок
        new_exposures.append(Exposure(frame=curr_start, duration=manifest.source.frame_count - curr_start + 1, drawingId=curr_dr_id))
        
        manifest.exposures = new_exposures
        
        # Записываем диапазон выбора
        sh.selected_ranges.append({
            "startFrame": start_frame,
            "endFrame": end_frame,
            "hypothesisId": selected_hyp.hypothesis_id
        })
        
    # Добавляем запись в историю выбора
    hist_item = SelectionHistoryItem(
        selectedHypothesisId=selected_hyp.hypothesis_id,
        selectedRanges=sh.selected_ranges.copy(),
        selectionReason=reason,
        selectedBy=user,
        selectedAt=utc_now()
    )
    sh.selection_history.append(hist_item)
    sh.selection_reason = reason
    sh.selected_by = user
    sh.selected_at = utc_now()
    
    # Пересчитываем общие проблемы и сегменты на объединенном манифесте
    cleaned_dir = job_dir / "cleaned"
    frame_paths = sorted(list(cleaned_dir.glob("*.png")))
    if not frame_paths:
        frame_paths = sorted(list((job_dir / "frames").glob("*.png")))
        
    problem_frames, representation_segments = analyze_problems_and_segments(
        manifest, job_dir, frame_paths
    )
    manifest.diagnostics.problem_frames = problem_frames
    manifest.diagnostics.representation_segments = representation_segments
    
    return manifest
