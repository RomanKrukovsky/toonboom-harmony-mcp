"""Tests for detector-reuse scheduling in the pose pipeline.

YOLOX-l runs a full 640x640 forward pass and is heavier than the pose model
itself (206 MB vs 128 MB), yet it used to run on every single frame. On a
single-character shot most of that work is redundant: the pose we already
computed localises the subject, so its padded bounding box is a valid crop for
the next frame.

`detect_every=N` runs the detector every Nth analysed frame and carries the box
in between. These tests pin the two things that matter:

  * the box geometry helper is correct and safe on degenerate input;
  * reuse is recorded honestly (`detectorBoxReused`) so evidence never presents a
    carried-over box as a fresh detection.

Default remains `detect_every=1`, so previously published evidence stays
reproducible.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pytest

RUNTIME_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RUNTIME_ROOT))

from pipelines.video_pose import _box_from_keypoints  # noqa: E402
from pipelines.video_pose_schema import VideoPoseFrame  # noqa: E402


# --- box derivation -------------------------------------------------------------

def test_box_encloses_all_keypoints():
    points = np.array([[100.0, 200.0], [300.0, 500.0], [150.0, 350.0]])
    box = _box_from_keypoints(points, 1920, 1080)
    assert box is not None
    x1, y1, x2, y2 = box
    for x, y in points:
        assert x1 <= x <= x2
        assert y1 <= y <= y2


def test_box_is_padded_beyond_the_pose():
    """A tight box would clip limbs that move outward on the next frame."""
    points = np.array([[100.0, 100.0], [200.0, 300.0]])
    box = _box_from_keypoints(points, 1920, 1080, padding=0.25)
    x1, y1, x2, y2 = box
    assert x1 < 100.0
    assert y1 < 100.0
    assert x2 > 200.0
    assert y2 > 300.0


def test_box_is_clamped_to_frame():
    """Padding near an edge must not produce out-of-frame coordinates."""
    points = np.array([[2.0, 2.0], [50.0, 60.0]])
    box = _box_from_keypoints(points, 640, 480)
    x1, y1, x2, y2 = box
    assert x1 >= 0.0
    assert y1 >= 0.0
    assert x2 <= 640.0
    assert y2 <= 480.0


def test_larger_padding_gives_a_larger_box():
    points = np.array([[100.0, 100.0], [300.0, 400.0]])
    small = _box_from_keypoints(points, 1920, 1080, padding=0.1)
    large = _box_from_keypoints(points, 1920, 1080, padding=0.5)
    small_area = (small[2] - small[0]) * (small[3] - small[1])
    large_area = (large[2] - large[0]) * (large[3] - large[1])
    assert large_area > small_area


@pytest.mark.parametrize(
    "points",
    [
        None,
        np.empty((0, 2)),
        # Degenerate: all points identical, so width/height collapse to zero.
        np.array([[5.0, 5.0], [5.0, 5.0]]),
    ],
)
def test_degenerate_input_returns_none(points):
    """None means 'fall back to a real detection', never a guessed box."""
    assert _box_from_keypoints(points, 1920, 1080) is None


def test_non_finite_coordinates_return_none():
    points = np.array([[np.nan, np.nan], [np.inf, np.inf]])
    assert _box_from_keypoints(points, 1920, 1080) is None


# --- honesty of the reuse flag --------------------------------------------------

def test_frames_default_to_not_reused():
    """A frame must not claim reuse unless it actually skipped the detector."""
    frame = VideoPoseFrame(
        frameIndex=0, timestampSeconds=0.0, sourceWidth=640, sourceHeight=480
    )
    assert frame.detectorBoxReused is False


def test_reuse_flag_is_serialisable():
    frame = VideoPoseFrame(
        frameIndex=3,
        timestampSeconds=0.125,
        sourceWidth=640,
        sourceHeight=480,
        detectorBoxReused=True,
    )
    assert frame.model_dump()["detectorBoxReused"] is True
