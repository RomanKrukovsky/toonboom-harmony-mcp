from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, model_validator

class MLJobRequest(BaseModel):
    jobId: str
    provider: str
    modelId: str
    inputArtifacts: List[str]
    parameters: Dict[str, Any]

class MLJobResponse(BaseModel):
    jobId: str
    provider: str
    model: str
    modelVersion: str
    status: Literal["success", "blocked", "failed", "not_implemented", "no_person_detected"]
    realInferenceExecuted: bool
    simulated: bool
    inputArtifacts: List[str]
    outputArtifacts: List[str]
    pirArtifacts: List[str]
    confidence: Optional[float] = Field(None, description="Measured model score; null when inference did not run.")
    warnings: List[str]
    errors: List[str]
    device: str
    durationMs: float = Field(..., ge=0.0)
    peakMemoryMb: Optional[float] = Field(
        None, ge=0.0, description="Measured peak memory; null when it was not measured."
    )
    cacheHit: bool
    provenancePath: str
    executionReportPath: str
    correlationId: str

    @model_validator(mode="after")
    def _reject_false_success(self) -> "MLJobResponse":
        completed_statuses = {"success", "no_person_detected"}
        if self.status in completed_statuses and not self.realInferenceExecuted:
            raise ValueError(f"status={self.status!r} requires realInferenceExecuted=true")
        if self.realInferenceExecuted and self.status not in completed_statuses:
            raise ValueError(
                f"realInferenceExecuted=true is incompatible with status={self.status!r}"
            )
        if not self.realInferenceExecuted and self.confidence is not None:
            raise ValueError("confidence must be null when realInferenceExecuted=false")
        return self

class InbetweenRequest(BaseModel):
    frame_a_path: str
    frame_b_path: str
    count: int = 3

class InbetweenResponse(BaseModel):
    """Union of a real InbetweenPIR payload and an honest blocked envelope.

    The blocked provider deliberately omits PIR fields; every field therefore
    carries a default so the blocked path serialises as HTTP 200 instead of a
    ResponseValidationError (500).
    """
    # Real inference payload
    format: Optional[str] = None
    version: Optional[str] = None
    sourceKeyframes: List[Any] = []
    inbetweens: List[Dict[str, Any]] = []
    # Envelope shared by blocked and real results
    status: str = "completed"
    realInferenceExecuted: bool = True
    provider: str = "animeinbet"
    requestedCount: Optional[int] = None
    artifactCreated: bool = False
    blockingReason: Optional[str] = None

    @model_validator(mode="after")
    def _reject_false_success(self) -> "InbetweenResponse":
        if self.realInferenceExecuted and self.status not in ("completed", "success"):
            raise ValueError(
                f"realInferenceExecuted=true is incompatible with status={self.status!r}"
            )
        if not self.realInferenceExecuted:
            if self.inbetweens:
                raise ValueError("inbetweens must be empty when realInferenceExecuted=false")
            if self.artifactCreated:
                raise ValueError("artifactCreated must be false when realInferenceExecuted=false")
        return self

