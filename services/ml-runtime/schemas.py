from typing import Dict, Any, List, Optional
from pydantic import BaseModel

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
    status: str
    realInferenceExecuted: bool
    simulated: bool
    inputArtifacts: List[str]
    outputArtifacts: List[str]
    pirArtifacts: List[str]
    confidence: float
    warnings: List[str]
    errors: List[str]
    device: str
    durationMs: int
    peakMemoryMb: int
    cacheHit: bool
    provenancePath: str
    executionReportPath: str
    correlationId: str

class InbetweenRequest(BaseModel):
    frame_a_path: str
    frame_b_path: str
    count: int = 3

class InbetweenResponse(BaseModel):
    format: str
    version: str
    sourceKeyframes: List[Dict[str, Any]]
    inbetweens: List[Dict[str, Any]]
