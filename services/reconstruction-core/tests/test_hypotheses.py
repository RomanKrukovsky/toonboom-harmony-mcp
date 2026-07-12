from __future__ import annotations

import json
from pathlib import Path
import pytest
import numpy as np
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
from reconstruction_core.hypotheses import (
    generate_hypotheses,
    compare_hypotheses,
    select_hypothesis_for_manifest,
    read_hypotheses,
    write_hypotheses
)
from reconstruction_core.versions import add_version, read_versions, rollback_to_version


def mock_manifest_for_hyp() -> HarmonyReconstructionManifest:
    metadata = VideoMetadata(
        videoPath="/tmp/test.mp4",
        sha256="c" * 64,
        width=100,
        height=100,
        fps=10.0,
        timeBase="1/10",
        durationSeconds=0.5,
        frameCount=5,
        variableFrameRate=False,
        rotation=0,
        colorSpace="unknown",
        hasAlpha=True
    )
    palette = [
        PaletteColor(id="C_1", name="RED", rgba=(255, 0, 0, 255), originalRgba=(255, 0, 0, 255), replacementError=0.0),
        PaletteColor(id="C_2", name="BLUE", rgba=(0, 0, 255, 255), originalRgba=(0, 0, 255, 255), replacementError=0.0)
    ]
    
    # 5 drawings
    drawings = []
    for i in range(1, 6):
        shapes = [
            VectorShape(
                id=f"sh_{i}",
                colorId="C_1" if i % 2 == 1 else "C_2",
                closed=True,
                points=[Point(x=0.2, y=0.2), Point(x=0.8, y=0.2), Point(x=0.8, y=0.8)],
                area=3000.0,
                source=ShapeSource(frame=i, method="contour_trace")
            )
        ]
        drawings.append(Drawing(
            id=f"dr_{i}",
            name=f"F_{i:06d}",
            sourceFrame=i,
            normalizedImagePath=f"/tmp/frames/frame_{i:06d}.png",
            shapes=shapes,
            pointCount=3,
            locked=False,
            artistModified=False,
            artistLocked=False,
            confidence=1.0
        ))
        
    exposures = [Exposure(frame=i, duration=1, drawingId=f"dr_{i}") for i in range(1, 6)]
    
    return HarmonyReconstructionManifest(
        schemaVersion="2.0",
        manifestId="manifest_hyp_test_123",
        createdAt="2026-07-12T12:00:00Z",
        mode="frame_by_frame_vector",
        source=metadata,
        scene=SceneSpec(name="SC_002", width=100, height=100, fps=10.0, startFrame=1, endFrame=5),
        palettes=[Palette(id="pal_1", name="SC_002_Palette", colors=palette)],
        elements=[Element(id="el_1", name="SC_002_Drawings", nodeName="SC_002_READ", drawingIds=[d.id for d in drawings])],
        drawings=drawings,
        exposures=exposures,
        nodes=[
            Node(id="node_read", name="SC_002_READ", type="READ", autoCreated=True),
            Node(id="node_composite", name="SC_002_COMPOSITE", type="COMPOSITE", autoCreated=True),
            Node(id="node_display", name="SC_002_DISPLAY", type="DISPLAY", autoCreated=True)
        ],
        connections=[
            Connection(**{"from": "node_read", "to": "node_composite", "fromPort": 0, "toPort": 0}),
            Connection(**{"from": "node_composite", "to": "node_display", "fromPort": 0, "toPort": 0})
        ],
        diagnostics=Diagnostics(
            uniqueDrawingCount=5,
            duplicateFrameCount=0,
            paletteColorCount=2,
            totalPointCount=15,
            warnings=[],
            stageDurationsMs={},
            capability=Capability(vectorBackend="python_dom_shapes", lineArt=False, colourArt=True),
            problemFrames=[],
            representationSegments=[]
        ),
        provenance=None
    )


def test_propose_and_compare_hypotheses(tmp_path: Path):
    manifest = mock_manifest_for_hyp()
    
    # Записываем манифест на диск
    manifest_path = tmp_path / "manifest.json"
    manifest_path.write_text(manifest.model_dump_json(by_alias=True), encoding="utf-8")
    
    # Создаем фиктивные оригинальные кадры
    frame_dir = tmp_path / "cleaned"
    frame_dir.mkdir()
    frame_paths = []
    for i in range(1, 6):
        p = frame_dir / f"frame_{i:06d}.png"
        img = np.zeros((100, 100, 4), dtype=np.uint8)
        # Нарисуем прямоугольники одинакового цвета для успешной дедупликации в компактной гипотезе
        cv2.rectangle(img, (20, 20), (80, 80), (0, 0, 255, 255), -1)
        cv2.imwrite(str(p), img)
        frame_paths.append(p)
        
    class MockPipeline:
        def __init__(self, storage):
            self.storage = storage
            
    class MockStorage:
        def job_dir(self, j_id):
            return tmp_path
            
    class MockRequest:
        max_colors = 12
        max_points_per_shape = 120
        dedup_threshold = 0.035
        cleanup_profile = "production_cleanup"
        background_mode = "keep"
        
        def model_copy(self, update):
            r = MockRequest()
            for k, v in update.items():
                setattr(r, k, v)
            return r

    pipeline = MockPipeline(MockStorage())
    request = MockRequest()
    
    # 1. Генерируем 3 гипотезы
    hyps = generate_hypotheses(pipeline, request, "job_test", parent_version=1)
    
    assert len(hyps) == 3
    hyp_ids = {h.hypothesis_id for h in hyps}
    assert "frame_by_frame_vector" in hyp_ids
    assert "clean_frame_by_frame" in hyp_ids
    assert "compact_frame_by_frame" in hyp_ids
    
    # Проверяем, что параметры отличаются
    clean_hyp = next(h for h in hyps if h.hypothesis_id == "clean_frame_by_frame")
    compact_hyp = next(h for h in hyps if h.hypothesis_id == "compact_frame_by_frame")
    
    assert clean_hyp.parameters["maxColors"] == 10
    assert compact_hyp.parameters["dedupThreshold"] == 0.08
    
    # Проверяем, что компактная гипотеза снизила сложность (меньше уникальных рисунков)
    assert compact_hyp.complexity_metrics.unique_drawing_count < manifest.diagnostics.unique_drawing_count
    
    # 2. Сравниваем гипотезы
    comp = compare_hypotheses(hyps)
    assert comp["recommendedVariant"] in ["compact_frame_by_frame", "clean_frame_by_frame", "frame_by_frame_vector"]
    assert len(comp["comparisonTable"]) == 3


def test_select_hypothesis_and_range_rollback(tmp_path: Path):
    manifest = mock_manifest_for_hyp()
    manifest_path = tmp_path / "manifest.json"
    manifest_path.write_text(manifest.model_dump_json(by_alias=True), encoding="utf-8")
    
    # Подготовим гипотезу
    # Скопируем компактный манифест
    hyp_manifest = manifest.model_copy(deep=True)
    # Сделаем в ней 1 drawing с удержанием 5 кадров (компактная)
    hyp_manifest.drawings = [manifest.drawings[0]]
    hyp_manifest.exposures = [Exposure(frame=1, duration=5, drawingId="dr_1")]
    hyp_manifest.elements[0].drawing_ids = ["dr_1"]
    
    hyp_manifest_path = tmp_path / "manifest_compact.json"
    hyp_manifest_path.write_text(hyp_manifest.model_dump_json(by_alias=True), encoding="utf-8")
    
    from reconstruction_core.models import VisualMetrics, ComplexityMetrics, ProvenanceInfo, ReconstructionHypothesis
    vm = VisualMetrics(
        meanPixelDifference=1.5,
        maximumPixelDifference=20.0,
        silhouetteDifference=0.01,
        contourDifference=0.01,
        colorDifference=0.5,
        numberOfFramesAboveThreshold=0
    )
    cm = ComplexityMetrics(
        uniqueDrawingCount=1,
        vectorPathCount=1,
        vectorPointCount=3,
        paletteColorCount=2,
        exposureBlockCount=1,
        estimatedSceneSize=5000,
        problemFrameCount=0
    )
    prov = ProvenanceInfo(tool="test", version="1.0", timestamp="2026")
    
    selected_hyp = ReconstructionHypothesis(
        hypothesisId="compact_frame_by_frame",
        parentVersion=1,
        mode="frame_by_frame_vector",
        parameters={},
        assumptions=[],
        visualMetrics=vm,
        complexityMetrics=cm,
        problemFrames=[],
        confidence=1.0,
        fallbackLevel="none",
        manifestPath=str(hyp_manifest_path),
        previewDirectory=str(tmp_path),
        creationTimestamp="2026",
        provenance=prov
    )
    
    # Создаем фиктивные кадры для анализа проблем при слиянии
    frame_dir = tmp_path / "cleaned"
    frame_dir.mkdir(exist_ok=True)
    frame_paths = []
    for i in range(1, 6):
        p = frame_dir / f"frame_{i:06d}.png"
        img = np.zeros((100, 100, 4), dtype=np.uint8)
        cv2.imwrite(str(p), img)
        frame_paths.append(p)
        
    # Инициализируем версионирование
    versions = []
    versions_file = tmp_path / "versions.json"
    versions_file.write_text(json.dumps(versions), encoding="utf-8")
    add_version(tmp_path, manifest_path, None, "v1")
    
    # 1. Тест: Выбор гипотезы целиком
    selected_all = select_hypothesis_for_manifest(
        manifest=manifest.model_copy(deep=True),
        selected_hyp=selected_hyp,
        job_dir=tmp_path,
        frame_range=None
    )
    
    # Вся сцена сведена к 1 drawing
    assert len(selected_all.drawings) == 1
    assert selected_all.exposures[0].duration == 5
    assert selected_all.selected_hypothesis.selected_hypothesis_id == "compact_frame_by_frame"
    
    # 2. Тест: Выбор гипотезы для диапазона кадров (например, 2-3 кадры)
    # Исходная сцена: dr_1(f1), dr_2(f2), dr_3(f3), dr_4(f4), dr_5(f5)
    # После выбора compact ("dr_1") на 2-3: dr_1(f1), dr_1(f2), dr_1(f3), dr_4(f4), dr_5(f5)
    # exposures должны корректно объединиться:
    # dr_1 (f1-3, duration=3), dr_4 (f4, duration=1), dr_5 (f5, duration=1)
    # Общее число exposures = 3, без пропущенных кадров, непрерывно!
    selected_range = select_hypothesis_for_manifest(
        manifest=manifest.model_copy(deep=True),
        selected_hyp=selected_hyp,
        job_dir=tmp_path,
        frame_range=(2, 3)
    )
    
    assert len(selected_range.exposures) == 3
    assert selected_range.exposures[0].frame == 1
    assert selected_range.exposures[0].duration == 3 # f1, f2, f3 сшились!
    assert selected_range.exposures[0].drawing_id == "dr_1"
    assert selected_range.exposures[1].frame == 4
    assert selected_range.exposures[2].frame == 5
    
    # Проверяем отсутствие пропусков (покрывает 5 кадров)
    total_dur = sum(e.duration for e in selected_range.exposures)
    assert total_dur == 5
    
    # 3. Тест: Сохранение artist locks
    # Поставим замок на dr_2
    locked_manifest = manifest.model_copy(deep=True)
    locked_manifest.drawings[1].artist_locked = True # dr_2
    
    # Выбираем гипотезу на диапазон 2-3
    # dr_2 заблокирован, поэтому на кадре 2 останется dr_2, а на кадре 3 применится dr_1 из гипотезы
    selected_locked = select_hypothesis_for_manifest(
        manifest=locked_manifest,
        selected_hyp=selected_hyp,
        job_dir=tmp_path,
        frame_range=(2, 3)
    )
    
    # f1 -> dr_1, f2 -> dr_2 (locked!), f3 -> dr_1, f4 -> dr_4, f5 -> dr_5
    # exposures:
    # 1. dr_1 (f1, duration=1)
    # 2. dr_2 (f2, duration=1)
    # 3. dr_1 (f3, duration=1)
    # 4. dr_4 (f4, duration=1)
    # 5. dr_5 (f5, duration=1)
    assert len(selected_locked.exposures) == 5
    assert selected_locked.exposures[1].drawing_id == "dr_2" # Сохранен!
