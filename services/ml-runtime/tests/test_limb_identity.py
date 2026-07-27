"""
Left/right limb identity stability.

Guards a failure that temporal smoothing cannot fix and that would silently corrupt
Sprint 2 retargeting: the pose model's `left_*` / `right_*` labels swapping between the
two physical limbs when they cross.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

RUNTIME_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = RUNTIME_ROOT.parent.parent
sys.path.insert(0, str(RUNTIME_ROOT))

from pipelines.limb_identity_metrics import (  # noqa: E402
    LIMB_PAIRS,
    measure_limb_identity,
)
from pipelines.video_pose_schema import KEYPOINT_INDEX  # noqa: E402

REAL_BUNDLE = REPO_ROOT / "docs" / "evidence" / "sprint1-video-pose-real"


def _frame(index, points):
    return {"frameIndex": index, "keypoints": [
        {"index": i, "x": x, "y": y, "observed": True, "confidence": 0.9}
        for i, (x, y) in points.items()
    ]}


def test_clean_sequence_is_reliable():
    L, R = KEYPOINT_INDEX["left_wrist"], KEYPOINT_INDEX["right_wrist"]
    frames = [_frame(i, {L: (100 + i, 200), R: (300 + i, 200)}) for i in range(10)]
    result = measure_limb_identity(frames, KEYPOINT_INDEX)
    assert result["pairs"]["wrist"]["swapExplainedJumps"] == 0
    assert result["pairs"]["wrist"]["sideStability"] == 1.0
    assert result["pairs"]["wrist"]["identityReliable"] is True


def test_synthetic_swap_is_detected():
    """Two keypoints that exchange positions must be reported as a swap, not as motion."""
    L, R = KEYPOINT_INDEX["left_ankle"], KEYPOINT_INDEX["right_ankle"]
    frames = [
        _frame(0, {L: (100, 500), R: (400, 500)}),
        _frame(1, {L: (400, 500), R: (100, 500)}),  # labels exchanged
        _frame(2, {L: (100, 500), R: (400, 500)}),
    ]
    result = measure_limb_identity(frames, KEYPOINT_INDEX)
    ankle = result["pairs"]["ankle"]
    assert ankle["swapExplainedJumps"] == 2
    assert ankle["identityReliable"] is False
    assert "ankle" in result["unreliablePairs"]


def test_fast_parallel_motion_is_not_called_a_swap():
    """Both limbs moving fast in the same direction is motion, not an identity error."""
    L, R = KEYPOINT_INDEX["left_wrist"], KEYPOINT_INDEX["right_wrist"]
    frames = [_frame(i, {L: (100 + i * 60, 200), R: (400 + i * 60, 200)}) for i in range(6)]
    result = measure_limb_identity(frames, KEYPOINT_INDEX)
    assert result["pairs"]["wrist"]["largeJumps"] > 0, "expected the moves to exceed the threshold"
    assert result["pairs"]["wrist"]["swapExplainedJumps"] == 0
    assert result["pairs"]["wrist"]["identityReliable"] is True


def test_every_configured_pair_is_reported():
    L, R = KEYPOINT_INDEX["left_wrist"], KEYPOINT_INDEX["right_wrist"]
    frames = [_frame(i, {L: (100, 200), R: (300, 200)}) for i in range(3)]
    result = measure_limb_identity(frames, KEYPOINT_INDEX)
    for name, (left, right) in LIMB_PAIRS.items():
        if left in KEYPOINT_INDEX and right in KEYPOINT_INDEX:
            assert name in result["pairs"]


@pytest.mark.skipif(not REAL_BUNDLE.exists(), reason="real evidence bundle not present")
def test_real_bundle_upper_body_identity_is_reliable():
    """
    The Sprint 1 acceptance metric uses right_wrist relative to right_shoulder. That claim is
    only meaningful if those labels track the same physical limb throughout the clip.
    """
    metrics = json.loads((REAL_BUNDLE / "limb-identity-metrics.json").read_text())
    for pair in ("shoulder", "elbow", "wrist", "hip"):
        assert metrics["pairs"][pair]["identityReliable"] is True, (
            f"{pair} identity is unreliable; the acceptance metric cannot be trusted"
        )


@pytest.mark.skipif(not REAL_BUNDLE.exists(), reason="real evidence bundle not present")
def test_real_bundle_records_the_known_ankle_instability():
    """
    Documents the measured defect rather than asserting it away: on this clip the ankle
    labels swap. Legs must not be bound to per-side rig controls until that is solved.
    """
    metrics = json.loads((REAL_BUNDLE / "limb-identity-metrics.json").read_text())
    ankle = metrics["pairs"]["ankle"]
    assert ankle["identityReliable"] is False
    assert ankle["swapExplainedJumps"] > 0
    assert "ankle" in metrics["unreliablePairs"]
    # If this ever becomes reliable, the registry knownFailure must be revisited.
    assert ankle["sideStability"] < 0.9
