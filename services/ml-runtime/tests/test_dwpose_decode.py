"""
Regression tests for the DWPose SimCC decode.

These lock shut the Sprint 0 defect: per-keypoint confidence used to be computed as
`np.max(np.exp(simcc - np.max(simcc, axis=1, keepdims=True)), axis=1)`, which is
identically 1.0 for every keypoint, so the provider reported 133/133 keypoints as
visible with perfect confidence regardless of the image content.

The weight-dependent test is skipped when the ONNX files are absent; it never fabricates
a pass.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pytest

RUNTIME_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RUNTIME_ROOT))

from providers.dwpose_provider import (  # noqa: E402
    DWPoseProvider,
    WEIGHTS_DIR,
    get_simcc_maximum,
)

WEIGHTS_PRESENT = (WEIGHTS_DIR / "dw-ll_ucoco_384.onnx").exists() and (
    WEIGHTS_DIR / "yolox_l.onnx"
).exists()


def _broken_confidence(simcc: np.ndarray) -> np.ndarray:
    """The exact pre-fix formula, kept so the bug cannot silently return."""
    return np.max(np.exp(simcc - np.max(simcc, axis=1, keepdims=True)), axis=1)


def test_previous_formula_was_identically_one():
    """Documents why the old confidence was meaningless: it ignored the input entirely."""
    rng = np.random.default_rng(0)
    for _ in range(5):
        simcc = rng.normal(size=(133, 576)).astype(np.float32) * rng.uniform(0.1, 50.0)
        broken = _broken_confidence(simcc)
        assert np.allclose(broken, 1.0), "pre-fix formula is expected to collapse to 1.0"


def test_decode_produces_varying_scores():
    """The real decode must respond to the response magnitude, not return a constant."""
    rng = np.random.default_rng(7)
    simcc_x = rng.normal(size=(133, 576)).astype(np.float32)
    simcc_y = rng.normal(size=(133, 768)).astype(np.float32)
    # Make one keypoint unambiguous and another almost flat.
    simcc_x[0] = 0.0
    simcc_x[0, 100] = 9.0
    simcc_y[0] = 0.0
    simcc_y[0, 200] = 9.0

    locs, scores = get_simcc_maximum(simcc_x, simcc_y)

    assert locs.shape == (133, 2)
    assert scores.shape == (133,)
    assert len(np.unique(scores)) > 1, "scores must not be constant"
    assert scores[0] == pytest.approx(9.0, rel=1e-5)
    assert scores[0] > scores[1:].max()


def test_decode_locations_use_split_ratio():
    simcc_x = np.zeros((1, 576), dtype=np.float32)
    simcc_y = np.zeros((1, 768), dtype=np.float32)
    simcc_x[0, 100] = 5.0
    simcc_y[0, 240] = 5.0

    locs, _ = get_simcc_maximum(simcc_x, simcc_y)
    # SIMCC_SPLIT_RATIO is 2.0, so bins map to half-pixels of the model input.
    assert locs[0][0] == pytest.approx(50.0)
    assert locs[0][1] == pytest.approx(120.0)


def test_non_positive_response_scores_zero():
    simcc_x = np.full((2, 576), -1.0, dtype=np.float32)
    simcc_y = np.full((2, 768), -1.0, dtype=np.float32)
    simcc_x[1, 10] = 4.0
    simcc_y[1, 10] = 4.0

    _, scores = get_simcc_maximum(simcc_x, simcc_y)
    assert scores[0] == 0.0
    assert scores[1] > 0.0


def test_disabled_provider_blocks_honestly():
    result = DWPoseProvider({"enabled": False}).run("whatever.png", "/tmp/out")
    assert result["status"] == "blocked"
    assert result["realInferenceExecuted"] is False
    assert "blockingReason" in result


def test_missing_image_is_reported_not_faked(tmp_path: Path):
    if not WEIGHTS_PRESENT:
        pytest.skip("DWPose weights absent; nothing to verify honestly")
    provider = DWPoseProvider({"enabled": True, "device": "cpu"})
    result = provider.run(str(tmp_path / "does_not_exist.png"), str(tmp_path / "out"))
    assert result["status"] == "failed"
    assert result["realInferenceExecuted"] is False


@pytest.mark.skipif(not WEIGHTS_PRESENT, reason="DWPose/YOLOX weights not downloaded")
def test_real_inference_confidence_is_not_constant(tmp_path: Path):
    """
    End-to-end against the real ONNX models on the repository fixture.

    Asserts the property the old code violated: confidence must vary across keypoints and
    must not mark every keypoint visible.
    """
    fixture = RUNTIME_ROOT.parent.parent / "fixtures" / "character.png"
    if not fixture.exists():
        pytest.skip("fixtures/character.png missing")

    provider = DWPoseProvider({"enabled": True, "device": "cpu"})
    result = provider.run(str(fixture), str(tmp_path / "out"))

    assert result["status"] == "success"
    assert result["realInferenceExecuted"] is True
    assert result["peopleFound"] >= 1, "YOLOX must detect the person before pose runs"

    assert result["keypointsTotal"] == 133
    assert result["minConfidence"] < result["maxConfidence"], "confidence must not be constant"
    assert result["keypointsVisible"] < result["keypointsTotal"], (
        "not every keypoint should pass the visibility threshold"
    )
    # The old code reported a hardcoded 0.9 here.
    assert result["confidence"] == pytest.approx(result["meanConfidence"])

    for name in ("skeleton.json", "keypoints_overlay.png", "provenance.json"):
        assert (tmp_path / "out" / name).exists()
