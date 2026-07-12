import sys
from pathlib import Path
import numpy as np
import cv2
import pytest

from reconstruction_core.factorization import (
    get_foreground_mask,
    sample_contour_points,
    align_points,
    estimate_affine_transform,
    decompose_transform,
    simplify_keyframes_rdp,
    apply_transform_to_image,
    run_motion_factorization_for_job
)
from reconstruction_core.models import (
    HarmonyReconstructionManifest,
    VideoMetadata,
    SceneSpec,
    Palette,
    PaletteColor,
    Element,
    Drawing,
    Exposure,
    Node,
    Connection,
    Diagnostics,
    Capability,
    VectorShape,
    Point,
    ShapeSource
)


def test_contour_sampling_and_alignment():
    # Создаем тестовую маску с квадратом 20x20
    mask_m = np.zeros((100, 100), dtype=np.uint8)
    cv2.rectangle(mask_m, (30, 30), (50, 50), 255, -1)
    
    # Создаем вторую маску со сдвинутым квадратом
    mask_t = np.zeros((100, 100), dtype=np.uint8)
    cv2.rectangle(mask_t, (35, 30), (55, 50), 255, -1)
    
    pts_m = sample_contour_points(mask_m, num_points=100)
    pts_t = sample_contour_points(mask_t, num_points=100)
    
    assert pts_m is not None
    assert pts_t is not None
    assert len(pts_m) == 100
    assert len(pts_t) == 100
    
    # Выравниваем точки
    pts_t_aligned = align_points(pts_m, pts_t)
    assert len(pts_t_aligned) == 100
    
    # Разница после выравнивания по Y должна быть близка к нулю, по X - около 5 пикселей
    mean_diff = np.mean(pts_t_aligned - pts_m, axis=0)
    assert abs(mean_diff[0] - 5.0) < 0.5
    assert abs(mean_diff[1] - 0.0) < 0.5


def test_estimate_and_decompose():
    mask_m = np.zeros((100, 100), dtype=np.uint8)
    cv2.rectangle(mask_m, (40, 40), (60, 60), 255, -1)
    
    # Чистый сдвиг прямоугольника на (3, -2)
    M_orig = np.array([[1.0, 0.0, 3.0], [0.0, 1.0, -2.0]], dtype=np.float32)
    
    mask_t = cv2.warpAffine(mask_m, M_orig, (100, 100), flags=cv2.INTER_NEAREST)
    
    M_est = estimate_affine_transform(mask_m, mask_t)
    assert M_est is not None
    
    tx, ty, rot, sx, sy, skew = decompose_transform(M_est)
    
    # Проверяем точность оценки сдвига
    assert abs(tx - 3.0) < 1.0
    assert abs(ty - (-2.0)) < 1.0
    assert abs(rot - 0.0) < 3.0
    assert abs(sx - 1.0) < 0.1
    assert abs(sy - 1.0) < 0.1


def test_keyframe_simplification():
    from reconstruction_core.models import TransformKeyframe
    # Создаем прямую траекторию из 10 ключей
    keys = []
    for f in range(1, 11):
        keys.append(TransformKeyframe(
            frame=f,
            positionX=float(f * 2.0),
            positionY=0.0,
            rotation=0.0,
            scaleX=1.0, scaleY=1.0, skew=0.0
        ))
        
    # Все промежуточные точки лежат на прямой, RDP должен сжать до 2 ключей (начальный и конечный)
    reduced = simplify_keyframes_rdp(keys, tolerance=0.1)
    assert len(reduced) == 2
    assert reduced[0].frame == 1
    assert reduced[-1].frame == 10
    
    # Добавим резкий изгиб на кадре 5 (jump)
    keys[4] = keys[4].model_copy(update={"position_y": 10.0})
    reduced_jump = simplify_keyframes_rdp(keys, tolerance=8.0)
    assert len(reduced_jump) == 3
    assert any(k.frame == 5 for k in reduced_jump)


def test_motion_factorization_end_to_end(tmp_path: Path):
    # Создаем фейковые кадры
    frame_dir = tmp_path / "frames"
    frame_dir.mkdir()
    
    # Движение прямоугольника 20x20 по оси X
    frame_paths = []
    for i in range(5):
        img = np.full((100, 100, 3), (245, 245, 245), dtype=np.uint8)
        x = 20 + i * 4
        cv2.rectangle(img, (x, 40), (x + 20, 60), (0, 0, 255), -1)
        path = frame_dir / f"frame_{i+1:06d}.png"
        cv2.imwrite(str(path), img)
        frame_paths.append(path)
        
    # Строим начальный манифест с 5 drawings
    drawings = []
    exposures = []
    for i in range(5):
        dr_id = f"drawing_{i+1:06d}"
        drawings.append(Drawing(
            id=dr_id,
            name=f"dr_{i+1}",
            sourceFrame=i+1,
            normalizedImagePath=f"dummy_{i+1}.png",
            shapes=[VectorShape(
                id=f"sh_{i+1}",
                colorId="col_1",
                points=[Point(x=10.0, y=10.0), Point(x=20.0, y=10.0), Point(x=20.0, y=20.0), Point(x=10.0, y=20.0)],
                closed=True,
                area=100.0,
                source=ShapeSource(frame=i+1, method="contour_trace")
            )],
            pointCount=4,
            confidence=1.0,
            uncertaintyCategories=[]
        ))
        exposures.append(Exposure(frame=i+1, duration=1, drawingId=dr_id))
        
    manifest = HarmonyReconstructionManifest(
        schemaVersion="2.0",
        manifestId="test_manifest_factorization",
        createdAt="2026-07-12T00:00:00Z",
        mode="frame_by_frame_vector",
        source=VideoMetadata(
            videoPath="test.mp4", sha256="abc" * 20, width=100, height=100, fps=24.0, frameCount=5, durationSeconds=0.2,
            timeBase="1/24", variableFrameRate=False, rotation=0, colorSpace="unknown", hasAlpha=True
        ),
        scene=SceneSpec(name="test_scene", width=100, height=100, fps=24.0, startFrame=1, endFrame=5),
        palettes=[Palette(
            id="pal_1", name="test_palette",
            colors=[PaletteColor(id="col_1", name="red", rgba=(0, 0, 255, 255), originalRgba=(0.0, 0.0, 1.0, 1.0), replacementError=0.0)]
        )],
        elements=[Element(id="el_1", name="layer", nodeName="layer_READ", drawingIds=[d.id for d in drawings])],
        drawings=drawings,
        exposures=exposures,
        nodes=[
            Node(id="node_read", name="layer_READ", type="READ", autoCreated=True),
            Node(id="node_composite", name="COMP", type="COMPOSITE", autoCreated=True),
            Node(id="node_display", name="DISP", type="DISPLAY", autoCreated=True)
        ],
        connections=[
            Connection(**{"from": "node_read", "to": "node_composite", "fromPort": 0, "toPort": 0}),
            Connection(**{"from": "node_composite", "to": "node_display", "fromPort": 0, "toPort": 0})
        ],
        diagnostics=Diagnostics(
            uniqueDrawingCount=5, duplicateFrameCount=0, paletteColorCount=1, totalPointCount=20, warnings=[], stageDurationsMs={},
            capability=Capability(vectorBackend="python_dom_shapes", lineArt=False, colourArt=True), problemFrames=[], representationSegments=[]
        )
    )
    
    # Запускаем факторизацию
    factorized = run_motion_factorization_for_job(manifest, tmp_path, frame_paths)
    
    # Должен быть создан transform_tracks
    assert len(factorized.transform_tracks) == 1
    track = factorized.transform_tracks[0]
    assert track.track_id == "peg_track_1"
    assert track.target_drawing_id == "drawing_000001"
    assert len(factorized.drawings) == 1
    assert len(factorized.exposures) == 1
    assert factorized.exposures[0].duration == 5
    
    # Проверим, что ключевые кадры имеют правильную линейную траекторию перемещения по X
    segment = track.segments[0]
    assert len(segment.keyframes) >= 2
    # Смещение по X на кадре 5 относительно кадра 1 (master) должно быть около (5-1)*4 = 16 пикселей
    kf_5 = next(k for k in segment.keyframes if k.frame == 5)
    assert abs(kf_5.position_x - 16.0) < 1.5
