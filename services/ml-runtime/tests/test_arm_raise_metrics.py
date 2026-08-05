"""Deterministic tests for arm_raise_metrics acceptance.

These tests use synthetic smoothed-keypoint sequences constructed by hand, not
recorded video, so they run in milliseconds and never depend on model
weights. The Sprint 1 acceptance is exercised end-to-end on a real cartoon
clip by scripts/ml/run_video_pose_acceptance.py; this file covers the metric
logic itself.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

RUNTIME_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RUNTIME_ROOT))

from pipelines.arm_raise_metrics import (  # noqa: E402
    DEFAULT_LIMB_ROOT_PAIRS,
    MIN_MATCHED_FRAMES,
    MIN_RELATIVE_MOTION_BOX_RATIO,
    MIN_RELATIVE_MOTION_PIXELS,
    measure_arm_raise,
)
from pipelines.video_pose_schema import KEYPOINT_INDEX

LEFT_WRIST = KEYPOINT_INDEX["left_wrist"]
LEFT_SHOULDER = KEYPOINT_INDEX["left_shoulder"]
RIGHT_WRIST = KEYPOINT_INDEX["right_wrist"]
RIGHT_SHOULDER = KEYPOINT_INDEX["right_shoulder"]

FIXTURE_DIR = Path(__file__).resolve().parents[3] / "fixtures" / "arm_raise_metrics"


def _frame(frame_index: int, detector_height: float, keypoints: dict) -> dict:
    """Construct one smoothed-keypoints JSONL record."""
    half = detector_height / 2.0
    box = {"x1": 100.0, "y1": half, "x2": 300.0, "y2": half + detector_height, "score": 0.9}
    return {
        "frameIndex": frame_index,
        "detectorBox": box,
        "keypoints": [
            {"index": idx, "smoothedX": x, "smoothedY": y, "confidence": 0.9}
            for idx, (x, y) in keypoints.items()
        ],
    }


def _arm_raise_frames(num_frames: int = 30, detector_height: float = 800.0) -> tuple:
    """
    Synthesise a stable shoulder, rising wrist sequence.

    Shoulder is parked near (200, 400) for every frame; the wrist starts at
    (200, 600) and rises linearly to (200, 200). The relative wrist-to-shoulder
    Y-amplitude is therefore ~400 px, well above MIN_RELATIVE_MOTION_PIXELS
    and well above MIN_RELATIVE_MOTION_BOX_RATIO (400 / 800 = 0.5).

    Returns (smoothed_frames, raw_frames); raw carries the same frames but is
    only used for the median detector-box height.
    """
    smoothed, raw = [], []
    for i in range(num_frames):
        progress = i / max(num_frames - 1, 1)
        wrist_y = 600.0 - 400.0 * progress
        smoothed.append(
            _frame(
                i,
                detector_height,
                {
                    LEFT_SHOULDER: (200.0, 400.0),
                    LEFT_WRIST: (200.0, wrist_y),
                    RIGHT_SHOULDER: (300.0, 400.0),
                    RIGHT_WRIST: (300.0, 400.0),
                },
            )
        )
        raw.append(smoothed[-1])
    return smoothed, raw


def test_arm_raising_subject_is_accepted() -> None:
    smoothed, raw = _arm_raise_frames()
    result = measure_arm_raise(smoothed, raw)

    assert result["accepted"] is True, json.dumps(result, indent=2)
    assert result["blockingReason"] is None
    assert result["selectedArm"] == "left"

    left = result["limbs"]["left_wrist_to_shoulder"]
    assert left["frames"] == len(smoothed)
    assert left["relativeMotionAmplitude"] >= MIN_RELATIVE_MOTION_PIXELS
    assert left["relativeMotionBoxRatio"] >= MIN_RELATIVE_MOTION_BOX_RATIO
    assert left["rootStdDev"] < left["relativeMotionAmplitude"], (
        "Root (shoulder) must be measurably more stable than the wrist motion it is "
        "compared against; otherwise we are measuring a translation of the whole body."
    )

    right = result["limbs"]["right_wrist_to_shoulder"]
    assert right["frames"] == len(smoothed)
    assert right["relativeMotionAmplitude"] < MIN_RELATIVE_MOTION_PIXELS, (
        "Right wrist did not move in this fixture, so this limb alone must not pass."
    )

    best = result["bestLimb"]
    assert best["limb"] == "left_wrist"


def test_pure_translation_is_rejected() -> None:
    """
    If the whole body translates by the same delta as the wrist, limb minus root
    cancels out and the acceptance must report blocked.
    """
    num_frames = 30
    detector_height = 800.0
    smoothed, raw = [], []
    for i in range(num_frames):
        offset = 10.0 * i
        smoothed.append(
            _frame(
                i,
                detector_height,
                {
                    LEFT_SHOULDER: (200.0 + offset, 400.0),
                    LEFT_WRIST: (200.0 + offset, 600.0),
                    RIGHT_SHOULDER: (300.0 + offset, 400.0),
                    RIGHT_WRIST: (300.0 + offset, 600.0),
                },
            )
        )
        raw.append(smoothed[-1])

    result = measure_arm_raise(smoothed, raw)
    assert result["accepted"] is False
    assert result["blockingReason"] is not None
    for limb in result["limbs"].values():
        assert limb["relativeMotionAmplitude"] < MIN_RELATIVE_MOTION_PIXELS
        assert limb["rootStdDev"] >= limb["relativeMotionAmplitude"]


def test_static_pose_is_rejected() -> None:
    """Limb does not move at all. Acceptance must fail."""
    smoothed, raw = [], []
    for i in range(30):
        smoothed.append(
            _frame(
                i,
                800.0,
                {
                    LEFT_SHOULDER: (200.0, 400.0),
                    LEFT_WRIST: (200.0, 600.0),
                    RIGHT_SHOULDER: (300.0, 400.0),
                    RIGHT_WRIST: (300.0, 600.0),
                },
            )
        )
        raw.append(smoothed[-1])

    result = measure_arm_raise(smoothed, raw)
    assert result["accepted"] is False
    assert result["blockingReason"] is not None
    for limb in result["limbs"].values():
        assert limb["relativeMotionAmplitude"] == 0.0
        assert limb["rootStdDev"] == 0.0


def test_too_few_matched_frames_is_rejected() -> None:
    """With only MIN_MATCHED_FRAMES - 1 wrist frames, the pair is dropped."""
    smoothed, raw = [], []
    for i in range(MIN_MATCHED_FRAMES - 1):
        smoothed.append(
            _frame(
                i,
                800.0,
                {
                    LEFT_SHOULDER: (200.0, 400.0),
                    LEFT_WRIST: (200.0, 600.0 - 10.0 * i),
                    RIGHT_SHOULDER: (300.0, 400.0),
                    RIGHT_WRIST: (300.0, 400.0),
                },
            )
        )
        raw.append(smoothed[-1])

    result = measure_arm_raise(smoothed, raw)
    assert result["accepted"] is False
    assert "limb/root pair" in result["blockingReason"]
    assert result["limbs"] == {}


def test_missing_keypoints_are_skipped_not_guessed() -> None:
    """If a keypoint is absent, it is dropped, never substituted by a guess."""
    smoothed, raw = [], []
    for i in range(10):
        kp = {
            LEFT_SHOULDER: (200.0, 400.0),
            RIGHT_SHOULDER: (300.0, 400.0),
        }
        if i % 2 == 0:
            kp[LEFT_WRIST] = (200.0, 600.0 - 50.0 * i)
        # Right wrist present on i=0..9 with i % 3 == 0 → 4 frames; below MIN_MATCHED_FRAMES
        # so the pair is dropped entirely rather than reported with a guess.
        if i % 3 == 0:
            kp[RIGHT_WRIST] = (300.0, 600.0 - 30.0 * i)
        smoothed.append(_frame(i, 800.0, kp))
        raw.append(smoothed[-1])

    result = measure_arm_raise(smoothed, raw)
    assert "left_wrist_to_shoulder" in result["limbs"]
    left = result["limbs"]["left_wrist_to_shoulder"]
    assert left["frames"] == 5
    # The right-wrist pair only overlaps on 4 frames; the metric drops it instead of guessing.
    assert "right_wrist_to_shoulder" not in result["limbs"]


def test_default_limb_root_pairs_match_documented_armraise_pairs() -> None:
    """The default pair set is the two wrist-vs-shoulder pairs in the Sprint 1 doc."""
    assert set(DEFAULT_LIMB_ROOT_PAIRS) == {
        "left_wrist_to_shoulder",
        "right_wrist_to_shoulder",
    }


def test_schema_dump_is_json_serializable() -> None:
    """The acceptance result must serialise to JSON without surprises."""
    smoothed, raw = _arm_raise_frames(num_frames=8)
    payload = json.dumps(measure_arm_raise(smoothed, raw))
    parsed = json.loads(payload)
    assert parsed["schemaVersion"] == "1.0.0"
    assert parsed["kind"] == "LimbRelativeMotionAcceptance"


def test_carried_arm_with_shoulder_drift_is_handled_honestly() -> None:
    """
    If the wrist moves but the shoulder also shakes by a comparable amount
    (the subject is being carried rather than articulating), the acceptance
    must reject because the relative amplitude is no longer larger than
    the root jitter.
    """
    # Two independent jitter sequences applied additively to the shoulder so the
    # root stddev is a mix of a slow linear drift and a per-frame oscillation,
    # while the wrist relative-to-shoulder cancels most of the shared motion.
    smoothed, raw = [], []
    for i in range(30):
        shoulder_drift = 6.0 * i  # linear 0..174 px — high stddev across the sequence
        shoulder_jitter = 30.0 * (1 if i % 2 == 0 else -1)  # ±30 px frame-to-frame
        smoothed.append(
            _frame(
                i,
                800.0,
                {
                    LEFT_SHOULDER: (200.0, 400.0 + shoulder_drift + shoulder_jitter),
                    LEFT_WRIST: (200.0, 600.0 + shoulder_drift + shoulder_jitter),
                    RIGHT_SHOULDER: (300.0, 400.0),
                    RIGHT_WRIST: (300.0, 400.0),
                },
            )
        )
        raw.append(smoothed[-1])

    result = measure_arm_raise(smoothed, raw)
    left = result["limbs"]["left_wrist_to_shoulder"]
    # The wrist carries the same drift + jitter as the shoulder, so the relative
    # motion collapses and the acceptance must reject on either the pixel
    # amplitude or the rootStdDev-vs-amplitude ratio.
    assert left["relativeMotionAmplitude"] < MIN_RELATIVE_MOTION_PIXELS
    assert result["accepted"] is False
