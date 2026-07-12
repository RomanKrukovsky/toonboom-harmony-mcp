from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field

class ProvenanceInfo(BaseModel):
    tool: str = "harmony-ml-core"
    version: str = "0.1.0"
    backend: str
    device: str
    precision: str
    timestamp: str

class MLSystemManifest(BaseModel):
    os: str
    architecture: str
    cpuModel: str
    ramGb: float
    freeDiskGb: float
    recommendedProfile: str

class ModelRegistryManifest(BaseModel):
    models: List[Dict[str, Any]]

class DatasetRegistryManifest(BaseModel):
    datasets: List[Dict[str, Any]]

# Video Pose schemas
class Point3D(BaseModel):
    x: float
    y: float
    z: float = 0.0
    visibility: float = 1.0

class PoseFrame(BaseModel):
    frame: int
    landmarks: Dict[str, Point3D]

class PoseSequence(BaseModel):
    schemaVersion: str = "1.0"
    modelId: str
    frameCount: int
    fps: float
    poses: List[PoseFrame]
    provenance: ProvenanceInfo

# Segmentations
class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float

class SegmentationObject(BaseModel):
    objectId: str
    label: str
    bbox: BoundingBox
    maskPath: str
    confidence: float

class SegmentationFrame(BaseModel):
    frame: int
    objects: List[SegmentationObject]

class SegmentationManifest(BaseModel):
    schemaVersion: str = "1.0"
    modelId: str
    frameCount: int
    fps: float
    frames: List[SegmentationFrame]
    provenance: ProvenanceInfo

# Point tracking
class TrackedPoint(BaseModel):
    pointId: str
    x: float
    y: float
    visible: bool
    confidence: float

class PointTrackingFrame(BaseModel):
    frame: int
    points: List[TrackedPoint]

class PointTrackingManifest(BaseModel):
    schemaVersion: str = "1.0"
    modelId: str
    points: List[PointTrackingFrame]
    provenance: ProvenanceInfo

# Speech & alignment
class SpeechWord(BaseModel):
    text: str
    start: float
    end: float
    confidence: float

class SpeechPhoneme(BaseModel):
    text: str
    start: float
    end: float
    confidence: float
    word: str

class SpeechAnalysisManifest(BaseModel):
    schemaVersion: str = "1.0"
    modelId: str
    durationSeconds: float
    transcript: str
    words: List[SpeechWord]
    phonemes: List[SpeechPhoneme] = Field(default_factory=list)
    energySamples: List[float] = Field(default_factory=list)
    peakRms: float = 0.0
    activeRatio: float = 0.0
    provenance: ProvenanceInfo

class VideoPerceptionManifest(BaseModel):
    schemaVersion: str = "1.0"
    videoPath: str
    audioPath: Optional[str] = None
    width: int
    height: int
    fps: float
    frameCount: int
    durationSeconds: float
    pose: Optional[PoseSequence] = None
    segmentation: Optional[SegmentationManifest] = None
    pointTracking: Optional[PointTrackingManifest] = None
    speech: Optional[SpeechAnalysisManifest] = None
    warnings: List[str] = Field(default_factory=list)
    provenance: ProvenanceInfo
