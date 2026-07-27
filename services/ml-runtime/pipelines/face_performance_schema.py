"""
Sprint 1 — Face performance sequence schema.

MediaPipe Face Landmarker in video mode returns, per frame:
  * 478 face landmarks in normalized image coordinates (x, y, z) plus a presence flag.
  * 52 facial blendshape coefficients in [0, 1].
  * A facial transformation matrix (4x4) describing head pose.

This Pydantic schema captures exactly that, with no fabrication channels. Rules:

  * Every timestamp is monotonic non-negative milliseconds from the source clock.
  * Every blendshape coefficient is the measured value from the model in [0, 1]; nothing
    is averaged, clamped, or interpolated silently. A missing frame is recorded as such,
    not filled in.
  * Landmarks that were not observed are recorded as observed=False and x/y/z=0.0 with
    confidence=0.0; they are never assigned a plausible neighbouring position.
  * The provenance block says which model produced the data and whether the runtime was
    real or whether inference was skipped (blocked). `realInferenceExecuted` mirrors the
    capability-registry contract: false means do not cite this bundle as evidence.
"""

from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field, model_validator

FACE_PERFORMANCE_SCHEMA_VERSION = "1.0.0"

# Canonical MediaPipe FaceLandmarker blendshape names (52), in the order the API returns
# them. Keeping the names here means a consumer never needs to guess the index of a given
# expression. The source is the official Google mediapipe.tasks.python.vision.face_landmarker
# FaceLandmarkerResult.blendshapes[i].category_name list.
FACE_BLENDSHAPE_NAMES = (
    "_neutral",
    "browDownLeft", "browDownRight", "browInnerUp",
    "browOuterUpLeft", "browOuterUpRight",
    "cheekPuff", "cheekSquintLeft", "cheekSquintRight",
    "eyeBlinkLeft", "eyeBlinkRight",
    "eyeLookDownLeft", "eyeLookDownRight",
    "eyeLookInLeft", "eyeLookInRight",
    "eyeLookOutLeft", "eyeLookOutRight",
    "eyeLookUpLeft", "eyeLookUpRight",
    "eyeSquintLeft", "eyeSquintRight",
    "eyeWideLeft", "eyeWideRight",
    "jawForward", "jawLeft", "jawOpen", "jawRight",
    "mouthClose", "mouthDimpleLeft", "mouthDimpleRight",
    "mouthFrownLeft", "mouthFrownRight",
    "mouthFunnel", "mouthLeft", "mouthLowerDownLeft", "mouthLowerDownRight",
    "mouthPressLeft", "mouthPressRight",
    "mouthPucker", "mouthRight",
    "mouthRollLower", "mouthRollUpper",
    "mouthShrugLower", "mouthShrugUpper",
    "mouthSmileLeft", "mouthSmileRight",
    "mouthStretchLeft", "mouthStretchRight",
    "mouthUpperLeft", "mouthUpperRight",
    "noseSneerLeft", "noseSneerRight",
)


class FaceLandmarkPoint(BaseModel):
    index: int = Field(..., ge=0, lt=478, description="MediaPipe landmark index 0..477")
    # Normalized image coordinates in the source video frame; z is a relative depth.
    x: float = Field(..., description="Normalized U coordinate in [0, 1]; 0.0 when not observed.")
    y: float = Field(..., description="Normalized V coordinate in [0, 1]; 0.0 when not observed.")
    z: float = Field(..., description="Relative depth; 0.0 when not observed.")
    # MediaPipe returns a presence score and a visibility score in [0, 1] only for static
    # detection; for the video landmarker the canonical field is presence, which may be 0.
    presence: float = Field(0.0, ge=0.0, le=1.0, description="Measured presence score, never assigned.")
    observed: bool = Field(..., description="False when the model did not localize this landmark.")


class FaceBlendshapeSample(BaseModel):
    # Measured coefficient in [0, 1]. One entry per name in FACE_BLENDSHAPE_NAMES; the
    # schema keeps the value and the name separately so the order is auditable.
    name: str = Field(..., description="One of the 52 canonical MediaPipe blendshape names.")
    value: float = Field(..., ge=0.0, le=1.0, description="Measured blendshape coefficient.")


class FacePerformanceFrame(BaseModel):
    frameIndex: int = Field(..., ge=0)
    # Monotonic milliseconds from the source clock (decoder timestamp). Always increasing
    # within a sequence.
    timestampMs: int = Field(..., ge=0)
    # Up to 478 landmarks; at least one must be observed for the frame to count.
    landmarks: List[FaceLandmarkPoint] = Field(default_factory=list)
    # Exactly 52 blendshapes when the model ran; empty when blocked.
    blendshapes: List[FaceBlendshapeSample] = Field(default_factory=list)
    # Row-major 4x4 head-pose transformation matrix the Face Landmarker produces; empty
    # means the model did not return one.
    transformationMatrix: List[float] = Field(
        default_factory=list,
        description="Row-major 4x4 matrix; 16 floats when present, 0 when absent.",
    )
    inferenceDurationMs: float = Field(0.0, ge=0.0)
    warnings: List[str] = Field(default_factory=list)


class Provenance(BaseModel):
    engine: Literal["mediapipe_face_landmarker"] = "mediapipe_face_landmarker"
    modelTask: str = Field(..., description="e.g. 'face_landmarker.task'.")
    modelSha256: Optional[str] = Field(
        None,
        description="Lowercase SHA-256 of the model task file; absent when no weights were loaded.",
    )
    # False on every blocked path. If false, downstream code MUST NOT cite this bundle as
    # if it carried real model output, and the capability registry may not be promoted.
    realInferenceExecuted: bool
    runnerVersion: str = Field("1.0.0")
    createdAt: str = Field(..., description="ISO-8601 timestamp the sequence was assembled.")


class FacePerformanceSequence(BaseModel):
    schemaVersion: Literal[FACE_PERFORMANCE_SCHEMA_VERSION] = FACE_PERFORMANCE_SCHEMA_VERSION
    sourceKind: Literal["video", "blocked"] = Field(
        ...,
        description="'blocked' when inference was never run; blendshapes and landmarks are empty.",
    )
    sourcePath: Optional[str] = Field(
        None, description="Repo-relative path when inference ran. Null on every blocked path."
    )
    sourceWidth: int = Field(0, ge=0, description="0 on blocked paths.")
    sourceHeight: int = Field(0, ge=0, description="0 on blocked paths.")
    analyzedFrames: int = Field(0, ge=0)
    framesWithFace: int = Field(0, ge=0)
    frames: List[FacePerformanceFrame] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    provenance: Provenance

    @model_validator(mode="after")
    def _check_source_kind_vs_inference(self) -> "FacePerformanceSequence":
        if self.sourceKind == "video" and not self.provenance.realInferenceExecuted:
            raise ValueError("sourceKind='video' requires provenance.realInferenceExecuted=true")
        if self.sourceKind == "blocked" and self.provenance.realInferenceExecuted:
            raise ValueError("sourceKind='blocked' must not have provenance.realInferenceExecuted=true")
        if self.sourceKind == "blocked":
            if self.frames or self.analyzedFrames != 0 or self.framesWithFace != 0:
                raise ValueError("sourceKind='blocked' must have empty frames, analyzedFrames=0, framesWithFace=0")
        return self


def blocked_sequence(reason: str, model_task: str, created_at: str) -> FacePerformanceSequence:
    """
    Build a sequence that honestly reports that no inference ran.

    The returned object is schema-valid and contains zero frames, zero landmarks and zero
    blendshapes. Its provenance.realInferenceExecuted is False and its `warnings` carry the
    exact blocking reason, so a consumer cannot mistake this for an empty result from a real
    run.
    """
    return FacePerformanceSequence(
        sourceKind="blocked",
        sourcePath=None,
        sourceWidth=0,
        sourceHeight=0,
        analyzedFrames=0,
        framesWithFace=0,
        frames=[],
        warnings=[reason],
        provenance=Provenance(
            engine="mediapipe_face_landmarker",
            modelTask=model_task,
            modelSha256=None,
            realInferenceExecuted=False,
            runnerVersion="1.0.0",
            createdAt=created_at,
        ),
    )