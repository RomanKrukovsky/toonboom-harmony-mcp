from __future__ import annotations

import json
from pathlib import Path
import numpy as np
import pytest
import cv2

from reconstruction_core.models import (
    HarmonyReconstructionManifest,
    Point,
    PaletteColor,
    Palette,
    Drawing,
    Exposure,
    Element,
    Node,
    Connection,
    Diagnostics,
    Capability,
    SceneSpec,
    VideoMetadata,
    VectorShape,
    ShapeSource
)
from reconstruction_core.problems import analyze_problems_and_segments, render_drawing_to_numpy
from reconstruction_core.versions import (
    read_versions,
    write_versions,
    add_version,
    rollback_to_version,
    set_element_lock,
    local_refine_range
)


def mock_manifest() -> HarmonyReconstructionManifest:
    # 2-кадровый синтетический манифест
    metadata = VideoMetadata(
        videoPath="/tmp/test.mp4",
        sha256="b" * 64,
        width=100,
        height=100,
        fps=12.0,
        timeBase="1/12",
        durationSeconds=0.1667,
        frameCount=2,
        variableFrameRate=False,
        rotation=0,
        colorSpace="unknown",
        hasAlpha=True
    )
    palette = [
        PaletteColor(id="COLOR_RED", name="RED", rgba=(255, 0, 0, 255), originalRgba=(255, 0, 0, 255), replacementError=0.0)
    ]
    shapes = [
        VectorShape(
            id="sh_1",
            colorId="COLOR_RED",
            closed=True,
            points=[Point(x=0.1, y=0.1), Point(x=0.9, y=0.1), Point(x=0.9, y=0.9), Point(x=0.1, y=0.9)],
            area=6400.0,
            source=ShapeSource(frame=1, method="contour_trace")
        )
    ]
    drawings = [
        Drawing(
            id="dr_1",
            name="F_000001",
            sourceFrame=1,
            normalizedImagePath="/tmp/frames/frame_000001.png",
            shapes=shapes,
            pointCount=4,
            locked=False,
            artistModified=False,
            artistLocked=False,
            confidence=1.0
        ),
        Drawing(
            id="dr_2",
            name="F_000002",
            sourceFrame=2,
            normalizedImagePath="/tmp/frames/frame_000002.png",
            shapes=[], # Пустой кадры для триггера проблемы
            pointCount=0,
            locked=False,
            artistModified=False,
            artistLocked=False,
            confidence=1.0
        )
    ]
    exposures = [
        Exposure(frame=1, duration=1, drawingId="dr_1", confidence=1.0),
        Exposure(frame=2, duration=1, drawingId="dr_2", confidence=1.0)
    ]
    
    return HarmonyReconstructionManifest(
        schemaVersion="2.0",
        manifestId="test_manifest_v2_123",
        createdAt="2026-07-12T12:00:00Z",
        mode="frame_by_frame_vector",
        source=metadata,
        scene=SceneSpec(name="SC_001", width=100, height=100, fps=12.0, startFrame=1, endFrame=2),
        palettes=[Palette(id="pal_1", name="SC_001_Palette", colors=palette)],
        elements=[Element(id="el_1", name="SC_001_Drawings", nodeName="SC_001_READ", drawingIds=["dr_1", "dr_2"])],
        drawings=drawings,
        exposures=exposures,
        nodes=[
            Node(id="node_read", name="SC_001_READ", type="READ", autoCreated=True),
            Node(id="node_composite", name="SC_001_COMPOSITE", type="COMPOSITE", autoCreated=True),
            Node(id="node_display", name="SC_001_DISPLAY", type="DISPLAY", autoCreated=True)
        ],
        connections=[
            Connection(**{"from": "node_read", "to": "node_composite", "fromPort": 0, "toPort": 0}),
            Connection(**{"from": "node_composite", "to": "node_display", "fromPort": 0, "toPort": 0})
        ],
        diagnostics=Diagnostics(
            uniqueDrawingCount=2,
            duplicateFrameCount=0,
            paletteColorCount=1,
            totalPointCount=4,
            warnings=[],
            stageDurationsMs={},
            capability=Capability(vectorBackend="python_dom_shapes", lineArt=False, colourArt=True),
            problemFrames=[],
            representationSegments=[]
        ),
        provenance=None
    )


def test_drawing_render_to_numpy():
    manifest = mock_manifest()
    colors = {"COLOR_RED": (255, 0, 0, 255)}
    drawing = manifest.drawings[0]
    
    rendered = render_drawing_to_numpy(drawing, colors, 100, 100)
    assert rendered.shape == (100, 100, 4)
    # Проверяем красный цвет в центре (OpenCV хранит как BGRA)
    assert list(rendered[50, 50]) == [0, 0, 255, 255]
    # Проверяем прозрачный угол
    assert list(rendered[0, 0]) == [0, 0, 0, 0]


def test_problem_frames_detection(tmp_path: Path):
    manifest = mock_manifest()
    
    # Создаем фиктивные исходные изображения кадров
    frame1 = tmp_path / "frame_000001.png"
    frame2 = tmp_path / "frame_000002.png"
    
    # Кадр 1: красный квадрат в центре
    img1 = np.zeros((100, 100, 4), dtype=np.uint8)
    cv2.rectangle(img1, (10, 10), (90, 90), (0, 0, 255, 255), -1)
    cv2.imwrite(str(frame1), img1)
    
    # Кадр 2: пустой (черный)
    img2 = np.zeros((100, 100, 4), dtype=np.uint8)
    cv2.imwrite(str(frame2), img2)
    
    original_frame_paths = [frame1, frame2]
    
    problem_frames, representation_segments = analyze_problems_and_segments(
        manifest, tmp_path, original_frame_paths
    )
    
    # Кадр 2 должен вызвать ошибку "contour_count_jump" или "color_loss",
    # так как на Кадре 1 был красный квадрат с 1 контуром, а на Кадре 2 — 0 контуров.
    assert len(problem_frames) > 0
    categories = [pf.category for pf in problem_frames]
    assert "contour_count_jump" in categories or "color_loss" in categories
    
    # Также проверим наличие representation segments
    assert len(representation_segments) > 0
    assert representation_segments[0].start_frame == 1
    assert representation_segments[0].end_frame == 2


def test_versions_log_and_rollback(tmp_path: Path):
    manifest = mock_manifest()
    manifest_path = tmp_path / "manifest.json"
    manifest_path.write_text(manifest.model_dump_json(by_alias=True), encoding="utf-8")
    
    plan_path = tmp_path / "command_plan.json"
    plan_path.write_text(json.dumps({"planId": "123", "commands": []}), encoding="utf-8")
    
    # 1. Записываем первую версию
    v1 = add_version(tmp_path, manifest_path, plan_path, "Версия 1")
    assert v1["version"] == 1
    
    versions = read_versions(tmp_path)
    assert len(versions) == 1
    assert versions[0]["comment"] == "Версия 1"
    
    # 2. Модифицируем манифест и записываем вторую версию
    manifest.scene.name = "SC_001_Modified"
    manifest_path.write_text(manifest.model_dump_json(by_alias=True), encoding="utf-8")
    v2 = add_version(tmp_path, manifest_path, plan_path, "Версия 2")
    assert v2["version"] == 2
    
    # 3. Откат к Версии 1
    rollback_to_version(tmp_path, 1, manifest_path, plan_path)
    
    # Проверяем, что манифест откатился (имя сцены снова "SC_001")
    restored = HarmonyReconstructionManifest.model_validate_json(manifest_path.read_text(encoding="utf-8"))
    assert restored.scene.name == "SC_001"
    
    # Проверяем, что в истории версий добавилась новая запись отката
    versions_after = read_versions(tmp_path)
    assert len(versions_after) == 3
    assert "Откат к версии 1" in versions_after[2]["comment"]


def test_element_lock():
    manifest = mock_manifest()
    
    # Элемент и drawings разблокированы по умолчанию
    assert not manifest.elements[0].artist_locked
    assert not manifest.drawings[0].artist_locked
    
    # Блокируем элемент
    updated = set_element_lock(manifest, "SC_001_Drawings", True)
    assert updated.elements[0].artist_locked
    assert updated.drawings[0].artist_locked
    
    # Разблокируем элемент
    updated_unlocked = set_element_lock(updated, "SC_001_Drawings", False)
    assert not updated_unlocked.elements[0].artist_locked
    assert not updated_unlocked.drawings[0].artist_locked


def test_local_refine_range(tmp_path: Path):
    manifest = mock_manifest()
    
    # Ставим блокировку на dr_1, чтобы проверить сохранение locked элементов
    manifest.drawings[0].artist_locked = True
    manifest.drawings[0].locked = True
    
    # Фиктивные кадры
    frame1 = tmp_path / "frame_000001.png"
    frame2 = tmp_path / "frame_000002.png"
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    cv2.imwrite(str(frame1), img)
    cv2.imwrite(str(frame2), img)
    
    # Mock callback для векторизации
    def mock_reconstruct_func(src_path, palette, frame):
        return [
            VectorShape(
                id="sh_refined",
                colorId="COLOR_RED",
                closed=True,
                points=[Point(x=0.2, y=0.2), Point(x=0.8, y=0.2), Point(x=0.8, y=0.8)],
                area=3000.0,
                source=ShapeSource(frame=frame, method="contour_trace")
            )
        ]
        
    # Запускаем локальный refine для диапазона 1-2
    # dr_1 (кадр 1) заблокирован, поэтому пересчитается только dr_2 (кадр 2)
    updated = local_refine_range(
        manifest,
        start_frame=1,
        end_frame=2,
        original_frame_paths=[frame1, frame2],
        job_dir=tmp_path,
        reconstruction_func=mock_reconstruct_func
    )
    
    # Убеждаемся, что заблокированный рисунок dr_1 сохранен
    assert any(d.id == "dr_1" for d in updated.drawings)
    
    # Убеждаемся, что кадр 2 пересчитан и добавлен новый рисунок
    assert any("refined_drawing_2" in d.id for d in updated.drawings)
