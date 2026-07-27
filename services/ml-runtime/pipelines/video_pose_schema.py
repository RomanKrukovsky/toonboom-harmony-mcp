"""
Schemas for Sprint 1 video pose tracking.

A VideoPoseSequence records what was actually measured, per frame, with no fabricated
values. Rules encoded here:

  * Every confidence is a measured model score. Nothing is assigned by hand.
  * A keypoint that was not observed is never replaced by a body-proportion guess.
    It is either absent (`observed=False`) or explicitly `interpolated=True`.
  * Raw and smoothed coordinates are stored separately so a consumer can always see
    what the model returned before filtering.
  * Identity across frames is heuristic (IoU + pose similarity). The field is named
    `identityMethod` and the sequence carries `isTracking=False` so this is never
    mistaken for real multi-object tracking.
"""

from __future__ import annotations

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field

VIDEO_POSE_SCHEMA_VERSION = "1.0.0"

# COCO-WholeBody 133-keypoint layout. Indices used by the acceptance metrics.
KEYPOINT_INDEX = {
    "nose": 0,
    "left_shoulder": 5,
    "right_shoulder": 6,
    "left_elbow": 7,
    "right_elbow": 8,
    "left_wrist": 9,
    "right_wrist": 10,
    "left_hip": 11,
    "right_hip": 12,
}


class DetectorBox(BaseModel):
    """A YOLOX person detection in source-video pixel coordinates."""

    x1: float
    y1: float
    x2: float
    y2: float
    score: float = Field(..., ge=0.0, description="Measured detector score, never assigned.")


class Keypoint(BaseModel):
    index: int = Field(..., ge=0, lt=133)
    # Raw model output mapped back into source-video pixel space.
    x: float
    y: float
    confidence: float = Field(..., description="Measured SimCC response maximum.")
    observed: bool = Field(..., description="False when this keypoint was never localized.")
    interpolated: bool = Field(
        False,
        description="True when the value was held/interpolated across a gap rather than measured.",
    )
    # Present only after smoothing; None means the point was not smoothed (e.g. low confidence).
    smoothedX: Optional[float] = None
    smoothedY: Optional[float] = None


class VideoPoseFrame(BaseModel):
    frameIndex: int = Field(..., ge=0)
    timestampSeconds: float = Field(..., ge=0.0)
    sourceWidth: int = Field(..., gt=0)
    sourceHeight: int = Field(..., gt=0)
    detectorBox: Optional[DetectorBox] = None
    detectorConfidence: Optional[float] = None
    selectedPersonId: Optional[str] = None
    keypoints: List[Keypoint] = Field(default_factory=list)
    visibleKeypointCount: int = Field(0, ge=0)
    inferenceDurationMs: float = Field(0.0, ge=0.0)
    warnings: List[str] = Field(default_factory=list)


class JitterMetrics(BaseModel):
    """Median/mean per-frame displacement of high-confidence keypoints, in pixels."""

    medianPixelsPerFrame: float
    meanPixelsPerFrame: float
    p95PixelsPerFrame: float
    sampleCount: int


class SmoothingReport(BaseModel):
    filterApplied: str
    chosenBy: str = Field(..., description="How the filter was selected — measurement, not preference.")
    candidatesMeasured: Dict[str, float] = Field(
        default_factory=dict, description="candidate name -> resulting median jitter px/frame"
    )
    jitterBefore: JitterMetrics
    jitterAfter: JitterMetrics
    jitterReductionPercent: float
    confidenceThreshold: float = Field(
        ..., description="Keypoints below this are not smoothed as if they were reliable."
    )
    maxHoldFrames: int = Field(..., description="Upper bound on gap holding before a point is dropped.")
    smoothedKeypointCount: int
    skippedLowConfidenceCount: int
    interpolatedKeypointCount: int


class VideoPoseSequence(BaseModel):
    schemaVersion: Literal["1.0.0"] = VIDEO_POSE_SCHEMA_VERSION
    kind: Literal["VideoPoseSequence"] = "VideoPoseSequence"

    # Relative, portable path. Absolute paths are rejected by the writer.
    sourceVideo: str
    sourceVideoSha256: str
    sourceWidth: int
    sourceHeight: int
    fps: float
    totalFrames: int
    analyzedFrames: int
    frameStride: int = 1

    realInferenceExecuted: bool
    detectorModel: str
    poseModel: str
    detectorModelSha256: str
    poseModelSha256: str

    # Heuristic identity association, deliberately not called tracking.
    isTracking: bool = False
    identityMethod: str = "iou_plus_pose_similarity_single_person"
    identitySwitchCount: int = 0
    personCount: int = 1

    framesWithDetection: int = 0
    framesWithoutDetection: int = 0
    detectionRate: float = 0.0

    smoothing: Optional[SmoothingReport] = None
    warnings: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)
    requiresHumanReview: bool = False
    notCaptured: List[str] = Field(
        default_factory=lambda: ["multi_person_tracking", "face_expression", "hand_articulation_quality"]
    )
