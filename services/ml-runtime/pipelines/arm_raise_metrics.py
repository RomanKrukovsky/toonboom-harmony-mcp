"""Limb-vs-root motion acceptance metric.

Generalises the cartoon-motion acceptance: the question being answered is
"does a chosen limb move measurably relative to a chosen root joint, while
the root joint itself stays roughly stable?". The metric is named after the
canonical arm-raise test in Sprint 1 of the project roadmap, but it is not
restricted to arms — any limb/root pair declared in the COCO-WholeBody 133
keypoint schema can be measured the same way.

The acceptance test exists to prove the perception pipeline is observing
real articulation rather than emitting a fixed or synthetic skeleton. A
sequence in which the chosen limb and root move together by the same amount
(in lock-step, e.g. a translation of the whole body) will fail this metric,
because limb minus root cancels out.

Honesty rules:
  * No ML, no model weights. This module is pure numpy and the existing
    VideoPoseFrame / smoothed-keypoints JSONL produced by
    pipelines/video_pose.py.
  * Missing keypoints on either side of the pair are skipped, never
    substituted with body-proportion guesses.
  * The output schema is stable. Downstream consumers may rely on the
    field names and the literal `accepted` boolean.
"""

from __future__ import annotations

import math
from statistics import median
from typing import Any, Dict, List, Literal, Optional, Tuple

import numpy as np
from pydantic import BaseModel, Field

from pipelines.video_pose_schema import KEYPOINT_INDEX

MIN_MATCHED_FRAMES = 5
MIN_RELATIVE_MOTION_PIXELS = 40.0
MIN_RELATIVE_MOTION_BOX_RATIO = 0.05
MAX_ROOT_STDDEV_TO_AMPLITUDE = 1.0

# Default limb/root pairs. The arm-raise acceptance asks for one of the
# wrist-vs-shoulder pairs; a project that wants a leg acceptance can
# override through `limb_root_pairs`.
DEFAULT_LIMB_ROOT_PAIRS: Dict[str, Tuple[str, str]] = {
    "left_wrist_to_shoulder": ("left_wrist", "left_shoulder"),
    "right_wrist_to_shoulder": ("right_wrist", "right_shoulder"),
}


class LimbRelativeMotion(BaseModel):
    limb: str
    root: str
    relativeXAmplitude: float = Field(..., ge=0.0)
    relativeYAmplitude: float = Field(..., ge=0.0)
    relativeMotionAmplitude: float = Field(..., ge=0.0)
    relativeMotionBoxRatio: float = Field(0.0, ge=0.0)
    rootStdDev: float = Field(..., ge=0.0)
    frames: int = Field(..., ge=0)

    @property
    def is_accepted(self) -> bool:
        return (
            self.frames >= MIN_MATCHED_FRAMES
            and self.relativeMotionAmplitude > MIN_RELATIVE_MOTION_PIXELS
            and self.relativeMotionBoxRatio > MIN_RELATIVE_MOTION_BOX_RATIO
            and self.rootStdDev < self.relativeMotionAmplitude * MAX_ROOT_STDDEV_TO_AMPLITUDE
        )


class ArmRaiseAcceptance(BaseModel):
    schemaVersion: Literal["1.0.0"] = "1.0.0"
    kind: Literal["LimbRelativeMotionAcceptance"] = "LimbRelativeMotionAcceptance"
    accepted: bool
    minimumMatchedFrames: int = MIN_MATCHED_FRAMES
    minimumRelativeMotionPixels: float = MIN_RELATIVE_MOTION_PIXELS
    minimumRelativeMotionBoxRatio: float = MIN_RELATIVE_MOTION_BOX_RATIO
    medianDetectorBoxHeight: float = Field(0.0, ge=0.0)
    limbs: Dict[str, LimbRelativeMotion] = Field(default_factory=dict)
    bestLimb: Optional[LimbRelativeMotion] = None
    selectedArm: Optional[Literal["left", "right"]] = None
    blockingReason: Optional[str] = None


def _series_for_keypoint(
    frames: List[Dict[str, Any]], index: int
) -> Dict[int, Tuple[float, float]]:
    """Return {frameIndex: (x, y)} for a given keypoint index.

    The input is the JSONL record shape produced by pipelines/video_pose.py:
        {"frameIndex": int, "keypoints": [{"index": int, "smoothedX": float|None,
                                          "smoothedY": float|None}, ...]}
    Frames that do not carry the requested keypoint, or whose smoothedX/Y is
    None, are silently dropped.
    """
    points: Dict[int, Tuple[float, float]] = {}
    for frame in frames:
        keypoint = next(
            (item for item in frame.get("keypoints", []) if item.get("index") == index),
            None,
        )
        if keypoint is None:
            continue
        x = keypoint.get("smoothedX")
        y = keypoint.get("smoothedY")
        if x is None or y is None:
            continue
        points[int(frame["frameIndex"])] = (float(x), float(y))
    return points


def _median_box_height(raw_frames: List[Dict[str, Any]]) -> float:
    heights: List[float] = []
    for frame in raw_frames:
        box = frame.get("detectorBox")
        if box is not None:
            heights.append(float(box["y2"]) - float(box["y1"]))
    return float(median(heights)) if heights else 0.0


def _measure_pair(
    smoothed_frames: List[Dict[str, Any]],
    limb_name: str,
    root_name: str,
    box_height: float,
) -> Optional[LimbRelativeMotion]:
    limb_idx = KEYPOINT_INDEX[limb_name]
    root_idx = KEYPOINT_INDEX[root_name]

    limb_series = _series_for_keypoint(smoothed_frames, limb_idx)
    root_series = _series_for_keypoint(smoothed_frames, root_idx)
    common = sorted(set(limb_series) & set(root_series))
    if len(common) < MIN_MATCHED_FRAMES:
        return None

    relative = np.array(
        [
            (
                limb_series[i][0] - root_series[i][0],
                limb_series[i][1] - root_series[i][1],
            )
            for i in common
        ]
    )
    root_xy = np.array([root_series[i] for i in common])

    x_amplitude = float(relative[:, 0].max() - relative[:, 0].min())
    y_amplitude = float(relative[:, 1].max() - relative[:, 1].min())
    motion_amplitude = float(math.hypot(x_amplitude, y_amplitude))

    return LimbRelativeMotion(
        limb=limb_name,
        root=root_name,
        relativeXAmplitude=x_amplitude,
        relativeYAmplitude=y_amplitude,
        relativeMotionAmplitude=motion_amplitude,
        relativeMotionBoxRatio=(
            motion_amplitude / box_height if box_height > 0 else 0.0
        ),
        rootStdDev=float(np.linalg.norm(root_xy.std(axis=0))),
        frames=len(common),
    )


def measure_arm_raise(
    smoothed_frames: List[Dict[str, Any]],
    raw_frames: List[Dict[str, Any]],
    limb_root_pairs: Optional[Dict[str, Tuple[str, str]]] = None,
) -> Dict[str, Any]:
    """Run the limb-vs-root acceptance on a smoothed-keypoints sequence.

    Parameters
    ----------
    smoothed_frames:
        Sequence of JSONL records produced by pipelines/video_pose.py
        (the smoothed-keypoints stream).
    raw_frames:
        Same shape; only the per-frame detectorBox is read, to derive the
        median bounding-box height used as the amplitude-normalisation
        denominator. The carton's height is unchanged by smoothing.
    limb_root_pairs:
        Optional override of the limb/root pairs to test. Defaults to the
        two wrist-vs-shoulder pairs in COCO-WholeBody 133.

    Returns
    -------
    Dict[str, Any]
        The dumped ArmRaiseAcceptance model. `accepted` is True only when at
        least one of the measured pairs passes every threshold; otherwise
        `blockingReason` states which threshold failed.
    """
    pairs = limb_root_pairs or DEFAULT_LIMB_ROOT_PAIRS
    box_height = _median_box_height(raw_frames)

    limbs: Dict[str, LimbRelativeMotion] = {}
    for name, (limb_name, root_name) in pairs.items():
        measured = _measure_pair(smoothed_frames, limb_name, root_name, box_height)
        if measured is None:
            continue
        limbs[name] = measured

    if not limbs:
        return ArmRaiseAcceptance(
            accepted=False,
            medianDetectorBoxHeight=box_height,
            blockingReason=(
                "No limb/root pair has at least "
                f"{MIN_MATCHED_FRAMES} measured smoothed frames."
            ),
        ).model_dump()

    best = max(limbs.values(), key=lambda item: item.relativeMotionAmplitude)
    accepted = best.is_accepted

    selected_arm: Optional[Literal["left", "right"]] = None
    if best.limb == "left_wrist" and best.root == "left_shoulder":
        selected_arm = "left"
    elif best.limb == "right_wrist" and best.root == "right_shoulder":
        selected_arm = "right"

    if accepted:
        reason: Optional[str] = None
    else:
        reason = (
            "Measured limb-vs-root motion did not pass the thresholds: "
            f"amplitude={best.relativeMotionAmplitude:.3f}px "
            f"(min {MIN_RELATIVE_MOTION_PIXELS:.1f}), "
            f"bboxRatio={best.relativeMotionBoxRatio:.4f} "
            f"(min {MIN_RELATIVE_MOTION_BOX_RATIO:.4f}), "
            f"rootStdDev={best.rootStdDev:.3f}px, "
            f"matchedFrames={best.frames} "
            f"(min {MIN_MATCHED_FRAMES})."
        )

    return ArmRaiseAcceptance(
        accepted=accepted,
        medianDetectorBoxHeight=box_height,
        limbs=limbs,
        bestLimb=best,
        selectedArm=selected_arm,
        blockingReason=reason,
    ).model_dump()
