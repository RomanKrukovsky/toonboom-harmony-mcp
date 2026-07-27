"""Measured articulated-motion acceptance metrics for a real 2D cartoon clip."""

from __future__ import annotations

import math
from statistics import median
from typing import Any, Dict, List, Literal, Optional

import numpy as np
from pydantic import BaseModel, Field

from pipelines.video_pose_schema import KEYPOINT_INDEX

MIN_MATCHED_FRAMES = 5
MIN_RELATIVE_MOTION_PIXELS = 40.0
MIN_RELATIVE_MOTION_BOX_RATIO = 0.05

LIMB_ROOT_PAIRS = {
    "left_wrist_to_shoulder": ("left_wrist", "left_shoulder"),
    "right_wrist_to_shoulder": ("right_wrist", "right_shoulder"),
    "left_ankle_to_hip": ("left_ankle", "left_hip"),
    "right_ankle_to_hip": ("right_ankle", "right_hip"),
}


class CartoonLimbMotion(BaseModel):
    limb: str
    root: str
    relativeXAmplitude: float = Field(..., ge=0.0)
    relativeYAmplitude: float = Field(..., ge=0.0)
    relativeMotionAmplitude: float = Field(..., ge=0.0)
    relativeMotionBoxRatio: float = Field(..., ge=0.0)
    rootStdDev: float = Field(..., ge=0.0)
    frames: int = Field(..., ge=MIN_MATCHED_FRAMES)


class CartoonMotionMetrics(BaseModel):
    schemaVersion: Literal["1.0.0"] = "1.0.0"
    kind: Literal["CartoonArticulatedMotionAcceptanceMetrics"] = (
        "CartoonArticulatedMotionAcceptanceMetrics"
    )
    accepted: bool
    minimumMatchedFrames: int = MIN_MATCHED_FRAMES
    minimumRelativeMotionPixels: float = MIN_RELATIVE_MOTION_PIXELS
    minimumRelativeMotionBoxRatio: float = MIN_RELATIVE_MOTION_BOX_RATIO
    medianDetectorBoxHeight: float = Field(0.0, ge=0.0)
    limbs: Dict[str, CartoonLimbMotion] = Field(default_factory=dict)
    bestLimb: Optional[CartoonLimbMotion] = None
    blockingReason: Optional[str] = None


def _series(frames: List[Dict[str, Any]], index: int) -> Dict[int, tuple[float, float]]:
    points: Dict[int, tuple[float, float]] = {}
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
    heights = []
    for frame in raw_frames:
        box = frame.get("detectorBox")
        if box is not None:
            heights.append(float(box["y2"]) - float(box["y1"]))
    return float(median(heights)) if heights else 0.0


def measure_cartoon_motion(
    smoothed_frames: List[Dict[str, Any]],
    raw_frames: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Measure limb motion relative to torso joints without inventing missing points."""
    box_height = _median_box_height(raw_frames)
    limbs: Dict[str, CartoonLimbMotion] = {}

    for name, (limb_name, root_name) in LIMB_ROOT_PAIRS.items():
        limb = _series(smoothed_frames, KEYPOINT_INDEX[limb_name])
        root = _series(smoothed_frames, KEYPOINT_INDEX[root_name])
        common = sorted(set(limb) & set(root))
        if len(common) < MIN_MATCHED_FRAMES:
            continue

        relative = np.array(
            [
                (
                    limb[index][0] - root[index][0],
                    limb[index][1] - root[index][1],
                )
                for index in common
            ]
        )
        root_xy = np.array([root[index] for index in common])
        x_amplitude = float(relative[:, 0].max() - relative[:, 0].min())
        y_amplitude = float(relative[:, 1].max() - relative[:, 1].min())
        motion_amplitude = float(math.hypot(x_amplitude, y_amplitude))
        limbs[name] = CartoonLimbMotion(
            limb=limb_name,
            root=root_name,
            relativeXAmplitude=x_amplitude,
            relativeYAmplitude=y_amplitude,
            relativeMotionAmplitude=motion_amplitude,
            relativeMotionBoxRatio=motion_amplitude / box_height if box_height > 0 else 0.0,
            rootStdDev=float(np.linalg.norm(root_xy.std(axis=0))),
            frames=len(common),
        )

    if not limbs:
        return CartoonMotionMetrics(
            accepted=False,
            medianDetectorBoxHeight=box_height,
            blockingReason=(
                "No limb/root pair has at least "
                f"{MIN_MATCHED_FRAMES} measured smoothed frames."
            ),
        ).model_dump()

    best = max(limbs.values(), key=lambda item: item.relativeMotionAmplitude)
    accepted = (
        best.relativeMotionAmplitude > MIN_RELATIVE_MOTION_PIXELS
        and best.relativeMotionBoxRatio > MIN_RELATIVE_MOTION_BOX_RATIO
        and best.rootStdDev < best.relativeMotionAmplitude
    )
    reason = None
    if not accepted:
        reason = (
            "Measured articulation did not pass the thresholds: "
            f"amplitude={best.relativeMotionAmplitude:.3f}px, "
            f"bboxRatio={best.relativeMotionBoxRatio:.4f}, "
            f"rootStdDev={best.rootStdDev:.3f}px."
        )

    return CartoonMotionMetrics(
        accepted=accepted,
        medianDetectorBoxHeight=box_height,
        limbs=limbs,
        bestLimb=best,
        blockingReason=reason,
    ).model_dump()
