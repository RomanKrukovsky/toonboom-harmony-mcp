from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any
from .models import HarmonyReconstructionManifest, Exposure, Drawing


def get_versions_file(job_dir: Path) -> Path:
    return job_dir / "versions.json"


def read_versions(job_dir: Path) -> List[Dict[str, Any]]:
    versions_file = get_versions_file(job_dir)
    if not versions_file.exists():
        return []
    try:
        return json.loads(versions_file.read_text(encoding="utf-8"))
    except Exception:
        return []


def write_versions(job_dir: Path, versions: List[Dict[str, Any]]) -> None:
    versions_file = get_versions_file(job_dir)
    versions_file.write_text(json.dumps(versions, indent=2, ensure_ascii=False), encoding="utf-8")


def add_version(job_dir: Path, manifest_path: Path, plan_path: Optional[Path], comment: str) -> Dict[str, Any]:
    versions = read_versions(job_dir)
    new_version_num = len(versions) + 1
    
    # Копируем манифест и план во внутренние версии
    version_manifest_name = f"manifest_v{new_version_num}.json"
    version_manifest_path = job_dir / version_manifest_name
    version_manifest_path.write_text(manifest_path.read_text(encoding="utf-8"), encoding="utf-8")
    
    version_plan_name = None
    if plan_path and plan_path.exists():
        version_plan_name = f"command_plan_v{new_version_num}.json"
        version_plan_path = job_dir / version_plan_name
        version_plan_path.write_text(plan_path.read_text(encoding="utf-8"), encoding="utf-8")

    version_info = {
        "version": new_version_num,
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "comment": comment,
        "manifestPath": str(version_manifest_path),
        "planPath": str(version_plan_path) if version_plan_name else None
    }
    versions.append(version_info)
    write_versions(job_dir, versions)
    return version_info


def rollback_to_version(job_dir: Path, target_version: int, manifest_dest: Path, plan_dest: Optional[Path]) -> Dict[str, Any]:
    versions = read_versions(job_dir)
    found = next((v for v in versions if v["version"] == target_version), None)
    if not found:
        raise ValueError(f"Версия {target_version} не найдена в логах.")
        
    v_manifest = Path(found["manifestPath"])
    if not v_manifest.exists():
        raise FileNotFoundError(f"Файл манифеста версии {target_version} отсутствует на диске.")
    manifest_dest.write_text(v_manifest.read_text(encoding="utf-8"), encoding="utf-8")
    
    if plan_dest and found.get("planPath"):
        v_plan = Path(found["planPath"])
        if v_plan.exists():
            plan_dest.write_text(v_plan.read_text(encoding="utf-8"), encoding="utf-8")
            
    # Записываем новую версию-копию отката в историю
    new_v = add_version(
        job_dir,
        manifest_dest,
        plan_dest if (plan_dest and plan_dest.exists()) else None,
        f"Откат к версии {target_version}"
    )
    return new_v


def set_element_lock(manifest: HarmonyReconstructionManifest, element_id: str, locked: bool) -> HarmonyReconstructionManifest:
    """
    Блокирует или разблокирует элемент и все связанные с ним рисунки
    """
    found_elem = None
    for elem in manifest.elements:
        if elem.id == element_id or elem.name == element_id:
            elem.artist_locked = locked
            elem.locked = locked
            found_elem = elem
            break
            
    if not found_elem:
        raise ValueError(f"Элемент с ID/именем {element_id} не найден.")
        
    # Блокируем все drawings этого элемента
    drawing_ids_set = set(found_elem.drawing_ids)
    for drawing in manifest.drawings:
        if drawing.id in drawing_ids_set:
            drawing.artist_locked = locked
            drawing.locked = locked
            
    return manifest


def local_refine_range(
    manifest: HarmonyReconstructionManifest,
    start_frame: int,
    end_frame: int,
    original_frame_paths: List[Path],
    job_dir: Path,
    reconstruction_func # Callback для запуска векторизации отдельного кадра
) -> HarmonyReconstructionManifest:
    """
    Выполняет безопасный локальный refine_range для указанного интервала кадров.
    Сохраняет любые заблокированные (artist_locked == True) drawings.
    """
    # Собираем список заблокированных рисунков
    locked_drawings = {d.id: d for d in manifest.drawings if d.artist_locked}
    
    # 1. Для каждого кадра в диапазоне, который не заблокирован
    # экспозицией locked drawing, пересчитываем геометрию
    # Подготовим мапу экспозиций
    frame_drawings: Dict[int, str] = {}
    for exp in manifest.exposures:
        for f in range(exp.frame, exp.frame + exp.duration):
            frame_drawings[f] = exp.drawing_id

    # Карта цветов
    palette_colors = {}
    for palette in manifest.palettes:
        for color in palette.colors:
            palette_colors[color.id] = color
            
    palette_list = manifest.palettes[0].colors

    refined_drawings: Dict[str, Drawing] = {}
    
    for frame_num in range(start_frame, end_frame + 1):
        curr_drawing_id = frame_drawings.get(frame_num)
        # Если рисунок заблокирован, оставляем его без изменений
        if curr_drawing_id and curr_drawing_id in locked_drawings:
            continue
            
        # Иначе пересчитываем кадр
        frame_idx = frame_num - 1
        if 0 <= frame_idx < len(original_frame_paths):
            src_path = original_frame_paths[frame_idx]
            
            # Вызываем callback векторизации
            # Он должен вернуть список VectorShape
            new_shapes = reconstruction_func(src_path, palette_list, frame_num)
            
            # Создаем или обновляем Drawing
            new_drawing_id = f"refined_drawing_{frame_num}_{datetime.now().microsecond}"
            new_drawing = Drawing(
                id=new_drawing_id,
                name=f"R_F_{frame_num:06d}",
                sourceFrame=frame_num,
                normalizedImagePath=str(src_path),
                shapes=new_shapes,
                pointCount=sum(len(s.points) for s in new_shapes),
                locked=False,
                artistModified=True,
                artistLocked=False,
                confidence=0.9,
                provenance="local_refine_range"
            )
            refined_drawings[frame_num] = new_drawing

    # 2. Интегрируем изменения в манифест
    # Заменяем exposures в диапазоне на покадровое назначение пересчитанных рисунков
    new_exposures = []
    
    # Добавляем все exposures, которые идут до start_frame
    for exp in manifest.exposures:
        exp_end = exp.frame + exp.duration - 1
        if exp_end < start_frame:
            new_exposures.append(exp)
        elif exp.frame < start_frame <= exp_end:
            # Обрезаем exposure с правой стороны
            new_duration = start_frame - exp.frame
            new_exposures.append(Exposure(frame=exp.frame, duration=new_duration, drawingId=exp.drawing_id, confidence=exp.confidence))

    # Добавляем пересчитанные exposures по 1 кадру каждый
    for frame_num in range(start_frame, end_frame + 1):
        if frame_num in refined_drawings:
            refined_drawing = refined_drawings[frame_num]
            # Добавляем рисунок в список manifest.drawings
            manifest.drawings.append(refined_drawing)
            new_exposures.append(Exposure(
                frame=frame_num,
                duration=1,
                drawingId=refined_drawing.id,
                confidence=0.9
            ))
        else:
            # Рисунок был заблокирован, сохраняем оригинальное назначение
            orig_drawing_id = frame_drawings.get(frame_num, "")
            new_exposures.append(Exposure(
                frame=frame_num,
                duration=1,
                drawingId=orig_drawing_id,
                confidence=1.0
            ))

    # Добавляем все exposures после end_frame
    for exp in manifest.exposures:
        exp_end = exp.frame + exp.duration - 1
        if exp.frame > end_frame:
            new_exposures.append(exp)
        elif exp.frame <= end_frame < exp_end:
            # Обрезаем exposure с левой стороны
            new_start = end_frame + 1
            new_duration = exp_end - end_frame
            new_exposures.append(Exposure(frame=new_start, duration=new_duration, drawingId=exp.drawing_id, confidence=exp.confidence))

    # Сортируем новые exposures и обновляем манифест
    new_exposures.sort(key=lambda e: e.frame)
    
    # Сжимаем соседние одинаковые exposures, если они не заблокированы и ссылаются на один drawing
    compressed_exposures = []
    for exp in new_exposures:
        if compressed_exposures and compressed_exposures[-1].drawing_id == exp.drawing_id:
            # Сжимаем
            compressed_exposures[-1].duration += exp.duration
        else:
            compressed_exposures.append(exp)
            
    manifest.exposures = compressed_exposures
    
    # Чистим неиспользуемые рисунки
    active_drawing_ids = {e.drawing_id for e in manifest.exposures}
    manifest.drawings = [d for d in manifest.drawings if d.id in active_drawing_ids]
    manifest.elements[0].drawing_ids = [d.id for d in manifest.drawings]
    
    return manifest
