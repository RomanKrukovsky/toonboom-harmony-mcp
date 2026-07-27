import os
import tempfile
import numpy as np
import cv2
import pytest

from reconstruction_core.pir_models import DrawingStrokePIR, CharacterDrawingPIR
from reconstruction_core.vector_preprocessing import preprocess_image
from reconstruction_core.stroke_extractor import fit_cubic_bezier_segment, LegalGate, ClassicalStrokeExtractor
from reconstruction_core.vector_cleanup import cleanup_strokes, compute_stroke_length, compute_rms_error
from reconstruction_core.palette_reconstruction import reconstruct_palette
from reconstruction_core.native_vectorizer import run_native_vectorization


def test_fit_cubic_bezier_segment():
    pts = np.array([[0.0, 0.0], [0.5, 0.5], [1.0, 1.0]])
    seg = fit_cubic_bezier_segment(pts)
    assert seg.start_point.x == 0.0
    assert seg.end_point.x == 1.0
    assert seg.control_point1.x > 0.0


def test_legal_gate():
    allowed, msg = LegalGate.check_provider_allowed("classical_fallback")
    assert allowed is True

    allowed_unknown, _ = LegalGate.check_provider_allowed("unknown_provider")
    assert allowed_unknown is False


def test_preprocess_and_vectorize_synthetic_image():
    # Create a synthetic 100x100 B&W image with a black line
    img = np.full((100, 100, 3), 255, dtype=np.uint8)
    cv2.line(img, (20, 20), (80, 80), (0, 0, 0), thickness=3)

    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp_path = tmp.name
        cv2.imwrite(tmp_path, img)

    try:
        pir, report = run_native_vectorization(
            tmp_path,
            character_id="test_char",
            drawing_name="test_draw",
            vectorization_mode="black_and_white_lineart",
            quality_preset="production"
        )
        assert isinstance(pir, CharacterDrawingPIR)
        assert pir.character_id == "test_char"
        assert pir.deterministic_hash is not None
        assert len(pir.layers[0].strokes) > 0
        assert pir.quality_metrics.total_strokes > 0
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
