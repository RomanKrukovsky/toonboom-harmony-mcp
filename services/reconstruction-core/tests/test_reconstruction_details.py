from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path
import cv2
import numpy as np
import pytest

from reconstruction_core.video import probe_video, extract_frames, VideoError
from reconstruction_core.palette import normalize_palette
from reconstruction_core.vectorize import vectorize_frame
from reconstruction_core.dedup import deduplicate, build_exposure_blocks
from reconstruction_core.preview import render_drawing_to_svg
from reconstruction_core.models import HarmonyReconstructionManifest, Point


def create_solid_color_video(path: Path, frames_dir: Path, frames_count: int, size: tuple[int, int], color: tuple[int, int, int], fps: int = 12) -> None:
    frames_dir.mkdir(parents=True, exist_ok=True)
    for i in range(1, frames_count + 1):
        img = np.full((size[1], size[0], 3), color, dtype=np.uint8)
        # Добавим движение для избежания полной идентичности
        cv2.rectangle(img, (10 + i * 2, 10), (30 + i * 2, 30), (0, 0, 255), -1)
        cv2.imwrite(str(frames_dir / f"frame_{i:06d}.png"), img)
        
    cmd = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-framerate", str(fps),
        "-i", str(frames_dir / "frame_%06d.png"),
        "-c:v", "libx264", "-pix_fmt", "yuv420p", str(path)
    ]
    subprocess.run(cmd, check=True)


def test_mp4_ingest_verification(tmp_path: Path):
    # 1. Проверка работы с путями, содержащими пробелы и спецсимволы
    spaced_dir = tmp_path / "spaced path name"
    spaced_video = spaced_dir / "test video spaced.mp4"
    create_solid_color_video(spaced_video, spaced_dir / "frames", 5, (160, 120), (255, 0, 0))
    
    metadata = probe_video(str(spaced_video))
    assert metadata.width == 160
    assert metadata.height == 120
    assert metadata.frame_count == 5
    assert not metadata.has_alpha
    
    # 2. Проверка извлечения кадров с путями с пробелами
    out_frames, _ = extract_frames(str(spaced_video), spaced_dir / "extracted")
    assert len(out_frames) == 5
    for f in out_frames:
         assert f.exists()
         
    # 3. Безопасность командной строки (Shell Injection)
    # Попытка инъекции команд через имя файла: subprocess.run должен безопасно экранировать
    injection_video = spaced_dir / "inject;ls.mp4"
    shutil.copy(spaced_video, injection_video)
    metadata_inj = probe_video(str(injection_video))
    assert metadata_inj.frame_count == 5


def test_transparency_verification(tmp_path: Path):
    # Создаем синтетические RGBA кадры с прозрачным фоном
    frames_dir = tmp_path / "rgba_frames"
    frames_dir.mkdir()
    paths = []
    
    for i in range(1, 4):
        # 4-канальный RGBA холст (прозрачный черный)
        img = np.zeros((100, 100, 4), dtype=np.uint8)
        # Рисуем непрозрачный красный квадрат в центре
        # CV2 использует порядок BGRA
        cv2.rectangle(img, (30, 30), (70, 70), (0, 0, 255, 255), -1)
        path = frames_dir / f"frame_{i:06d}.png"
        cv2.imwrite(str(path), img)
        paths.append(path)
        
    # Нормализуем палитру
    normalized, palette = normalize_palette(paths, tmp_path / "normalized", max_colors=4)
    
    # Проверяем, что прозрачный цвет фона не вошел в палитру
    # В палитре должен быть только один цвет (красный)
    assert len(palette) == 1
    red_color = palette[0]
    assert red_color.rgba[0] >= 250  # R
    assert red_color.rgba[1] <= 5    # G
    assert red_color.rgba[2] <= 5    # B
    
    # Проверяем, что нормализованные кадры сохранили альфа-канал
    for norm_path in normalized:
        norm_img = cv2.imread(str(norm_path), cv2.IMREAD_UNCHANGED)
        assert norm_img.shape[-1] == 4
        # Проверяем прозрачность угла
        assert norm_img[0, 0, 3] == 0
        # Проверяем непрозрачность центра
        assert norm_img[50, 50, 3] == 255
        
    # Векторизуем первый кадр и проверяем отсутствие прозрачной зоны
    shapes = vectorize_frame(normalized[0], palette, source_frame=1, max_points=100)
    # Должна быть только одна фигура (красный квадрат)
    assert len(shapes) == 1
    assert shapes[0].color_id == red_color.id
    # Проверим, что площадь векторизованной фигуры близка к площади 40x40 квадрата
    assert 1500 < shapes[0].area < 1700


def is_clockwise(points: list[Point]) -> bool:
    # Вычисление направления обхода контура (Winding Order)
    # Формула Гаусса для площади (знаковый результат)
    area = 0.0
    for i in range(len(points)):
        p1 = points[i]
        p2 = points[(i + 1) % len(points)]
        area += (p1.x * p2.y) - (p2.x * p1.y)
    return area < 0.0


def test_holes_and_hierarchy_verification(tmp_path: Path):
    # Создаем изображение с кольцом (внешний и внутренний контуры)
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    # Внешний белый квадрат
    cv2.rectangle(img, (20, 20), (80, 80), (255, 255, 255), -1)
    # Внутреннее черное отверстие
    cv2.rectangle(img, (40, 40), (60, 60), (0, 0, 0), -1)
    
    path = tmp_path / "ring.png"
    cv2.imwrite(str(path), img)
    
    # Палитра содержит только белый цвет (черный - фоновый, но в данном случае он непрозрачный)
    # Сделаем белый цвет палитры
    from reconstruction_core.models import PaletteColor
    palette = [
        PaletteColor(id="COLOR_WHITE", name="WHITE", rgba=(255, 255, 255, 255), originalRgba=(255, 255, 255, 255), replacementError=0.0)
    ]
    
    shapes = vectorize_frame(path, palette, source_frame=1, max_points=100)
    
    # Должно быть 2 фигуры: внешняя и внутреннее отверстие
    assert len(shapes) == 2
    
    # Сортируем фигуры по площади: первая должна быть больше (внешняя), вторая меньше (отверстие)
    shapes_sorted = sorted(shapes, key=lambda s: s.area, reverse=True)
    outer = shapes_sorted[0]
    inner = shapes_sorted[1]
    
    assert outer.area > inner.area
    
    # Проверяем классификацию обхода (winding direction)
    # По правилам OpenCV, внешние контуры и отверстия имеют противоположное направление
    assert is_clockwise(outer.points) != is_clockwise(inner.points)
    
    # Проверяем рендеринг в SVG
    svg_path = tmp_path / "preview.svg"
    palette_colors = {"COLOR_WHITE": "#ffffff"}
    render_drawing_to_svg(
        drawing=type('DrawingMock', (object,), {"shapes": shapes})(),
        palette_colors=palette_colors,
        width=100,
        height=100,
        dest_path=svg_path
    )
    
    svg_content = svg_path.read_text(encoding="utf-8")
    assert '<path' in svg_content
    assert 'fill-rule="evenodd"' in svg_content
    # Должен быть составной путь с двумя 'M'
    d_attr = svg_content.split('d="')[1].split('"')[0]
    assert d_attr.count('M') == 2
    assert d_attr.count('Z') == 2


def test_vectorization_quality_and_metrics(tmp_path: Path):
    # Генерируем круг
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    cv2.circle(img, (50, 50), 30, (255, 255, 255), -1)
    path = tmp_path / "circle.png"
    cv2.imwrite(str(path), img)
    
    from reconstruction_core.models import PaletteColor
    palette = [
        PaletteColor(id="COLOR_WHITE", name="WHITE", rgba=(255, 255, 255, 255), originalRgba=(255, 255, 255, 255), replacementError=0.0)
    ]
    
    # Проверяем уменьшение числа точек с пределом max_points
    shapes_limited = vectorize_frame(path, palette, source_frame=1, max_points=12)
    assert len(shapes_limited) == 1
    shape = shapes_limited[0]
    assert len(shape.points) <= 12
    assert shape.closed
    
    # Проверяем отсутствие NaN или недопустимых координат
    for pt in shape.points:
        assert 0.0 <= pt.x <= 1.0
        assert 0.0 <= pt.y <= 1.0
        assert not np.isnan(pt.x)
        assert not np.isnan(pt.y)


def test_deduplication_exposure_patterns(tmp_path: Path):
    # Тест на распознавание различных анимационных таймингов
    
    # 1. Animation on ones (движение каждый кадр)
    positions_ones = [10, 15, 20, 25, 30]
    paths_ones = []
    for i, x in enumerate(positions_ones):
        p = tmp_path / f"ones_{i}.png"
        img = np.zeros((50, 100, 3), np.uint8)
        cv2.rectangle(img, (x, 10), (x + 10, 30), (255, 255, 255), -1)
        cv2.imwrite(str(p), img)
        paths_ones.append(p)
        
    reps, mapping, _ = deduplicate(paths_ones, threshold=0.01)
    # Должны быть уникальными все 5 кадров
    assert len(reps) == 5
    assert mapping == [0, 1, 2, 3, 4]
    
    # 2. Animation on twos (смена каждые два кадра)
    positions_twos = [10, 10, 20, 20, 30, 30]
    paths_twos = []
    for i, x in enumerate(positions_twos):
        p = tmp_path / f"twos_{i}.png"
        img = np.zeros((50, 100, 3), np.uint8)
        cv2.rectangle(img, (x, 10), (x + 10, 30), (255, 255, 255), -1)
        cv2.imwrite(str(p), img)
        paths_twos.append(p)
        
    reps, mapping, _ = deduplicate(paths_twos, threshold=0.01)
    assert len(reps) == 3
    assert mapping == [0, 0, 1, 1, 2, 2]
    
    # 3. Flicker: небольшое мерцание цвета не должно создавать новые drawings
    paths_flicker = []
    for i in range(4):
        p = tmp_path / f"flicker_{i}.png"
        img = np.zeros((50, 100, 3), np.uint8)
        # Меняем цвет на +-2 единицы
        color_val = 250 + (i % 2) * 2
        cv2.rectangle(img, (10, 10), (30, 30), (color_val, color_val, color_val), -1)
        cv2.imwrite(str(p), img)
        paths_flicker.append(p)
        
    reps, mapping, _ = deduplicate(paths_flicker, threshold=0.02)
    assert len(reps) == 1
    assert mapping == [0, 0, 0, 0]
