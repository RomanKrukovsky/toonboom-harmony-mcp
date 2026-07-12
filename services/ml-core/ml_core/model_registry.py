import json
import os
from pathlib import Path
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from .config import DATA_ROOT, MODEL_ROOT

class ModelDefinition(BaseModel):
    modelId: str
    provider: str
    task: str
    sourceUrl: Optional[str] = None
    checkpointPath: Optional[str] = None
    checkpointSha256: Optional[str] = None
    backend: str = "cpu"
    precision: str = "float32"
    installed: bool = False
    importVerified: bool = False
    inferenceVerified: bool = False
    averageLatencyMs: float = 0.0
    peakMemoryMb: float = 0.0
    lastVerifiedAt: Optional[str] = None
    status: str = "not_installed"  # not_installed, downloading, installed_unverified, ready, degraded, unavailable, failed

class ModelRegistry:
    def __init__(self, registry_dir: Path = DATA_ROOT / "models" / "registry"):
        self.registry_dir = registry_dir
        self.registry_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = self.registry_dir / "models.json"
        self.parquet_path = self.registry_dir / "models.parquet"
        self.models: Dict[str, ModelDefinition] = {}
        self.load()

    def load(self):
        # Load from parquet if available and pandas is installed, otherwise fallback to json
        if self.db_path.is_file():
            try:
                data = json.loads(self.db_path.read_text(encoding="utf-8"))
                for k, v in data.items():
                    self.models[k] = ModelDefinition(**v)
                return
            except Exception:
                pass

        # If no file, initialize defaults
        self._init_defaults()
        self.save()

    def _init_defaults(self):
        defaults = [
            ModelDefinition(
                modelId="mediapipe_pose_heavy",
                provider="mediapipe",
                task="pose_estimation",
                sourceUrl="https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task",
                checkpointPath=str(MODEL_ROOT / "checkpoints" / "pose_landmarker_heavy.task"),
                checkpointSha256="d04c4dbb75a1c028ba49156a02b3769c7cc45a90ac8cf8cf8cf8cf8cf8cf8cf8", # dummy/placeholder sha for default
                backend="cpu",
                status="not_installed"
            ),
            ModelDefinition(
                modelId="sam2.1_hiera_tiny",
                provider="sam2",
                task="video_segmentation",
                sourceUrl="https://dl.fbaipublicfiles.com/segment_anything_2/072824/sam2.1_hiera_tiny.pt",
                checkpointPath=str(MODEL_ROOT / "checkpoints" / "sam2.1_hiera_tiny.pt"),
                checkpointSha256="a28b030438cfceee1534b1239aa8dfce00124a91924192419241924192419241",
                backend="cpu",
                status="not_installed"
            ),
            ModelDefinition(
                modelId="whisper_base",
                provider="whisper",
                task="transcription",
                sourceUrl="https://openaipublic.azureedge.net/main/whisper/models/ed3a0b6b245efebe5dc0f030193843f9c05e99f78d4d5d326bcba2ac9f5c76b0/base.pt",
                checkpointPath=str(MODEL_ROOT / "checkpoints" / "whisper_base.pt"),
                checkpointSha256="ed3a0b6b245efebe5dc0f030193843f9c05e99f78d4d5d326bcba2ac9f5c76b0",
                backend="cpu",
                status="not_installed"
            ),
            ModelDefinition(
                modelId="rtmpose_m",
                provider="rtmpose",
                task="pose_estimation",
                sourceUrl="https://download.openmmlab.com/mmpose/v1/projects/rtmpose/rtmpose-m_simcc-body7_pt-aic-coco_270e-256x192-4dba183a_20230225.pth",
                checkpointPath=str(MODEL_ROOT / "checkpoints" / "rtmpose-m.pth"),
                checkpointSha256="4dba183a6b8cd7d66ceee1534b1239aa8dfce00124a9192419241924192419241",
                backend="cpu",
                status="not_installed"
            )
        ]
        for m in defaults:
            self.models[m.modelId] = m

    def save(self):
        # Save to JSON
        data = {k: m.model_dump() for k, m in self.models.items()}
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.db_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

        # Save to parquet if pandas and pyarrow are available
        try:
            import pandas as pd
            df = pd.DataFrame(data.values())
            df.to_parquet(self.parquet_path)
        except Exception:
            pass

    def get_model(self, model_id: str) -> Optional[ModelDefinition]:
        return self.models.get(model_id)

    def list_models(self) -> List[ModelDefinition]:
        return list(self.models.values())

    def update_status(self, model_id: str, **kwargs):
        if model_id in self.models:
            m = self.models[model_id]
            for k, v in kwargs.items():
                if hasattr(m, k):
                    setattr(m, k, v)
            m.lastVerifiedAt = datetime.now(timezone.utc).isoformat()
            self.save()
