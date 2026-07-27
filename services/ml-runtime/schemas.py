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
    format: str
    version: str
    sourceKeyframes: List[Dict[str, Any]]
    inbetweens: List[Dict[str, Any]]

class VoxCPMRequest(BaseModel):
    text: str
    outputWavPath: str
    voiceDescription: Optional[str] = None
    referenceWavPath: Optional[str] = None
    instruct: Optional[str] = None
    guidanceScale: float = 2.0
    numSteps: int = 10

class VoxCPMResponse(BaseModel):
    status: str
    realInferenceExecuted: bool
    outputWavPath: Optional[str] = None
    sampleRate: int = 48000
    durationSec: float = 0.0
    provider: str = "voxcpm_provider"
    errors: List[str] = []
