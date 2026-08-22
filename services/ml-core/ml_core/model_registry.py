import hashlib
import json
import os
import shutil
import tempfile
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from .config import DATA_ROOT, MODEL_ROOT

# Sentinel used where the upstream checksum is genuinely unknown. Previously the
# defaults carried invented digests like "...cf8cf8cf8cf8cf8", which is worse
# than no digest at all: it looks verifiable while guaranteeing a mismatch.
UNKNOWN_SHA256 = None

DOWNLOAD_CHUNK = 1 << 20  # 1 MiB


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
    # not_installed, downloading, installed_unverified, checksum_mismatch,
    # ready, degraded, unavailable, failed
    status: str = "not_installed"
    # Why a model is not usable, when that is the case.
    statusDetail: Optional[str] = None
    observedSha256: Optional[str] = None
    sizeBytes: Optional[int] = None


class RegistryError(RuntimeError):
    """Raised when an install/verify request cannot be satisfied honestly."""


class ModelRegistry:
    """Tracks model checkpoints with verifiable state.

    Honesty contract — a model may only reach ``status="ready"`` when:
      1. the checkpoint file exists on disk;
      2. its SHA-256 matches ``checkpointSha256`` (when a digest is known);
      3. its provider actually imported and ran inference at least once.

    The previous implementation set ``status="ready"``, ``installed=True`` and
    ``inferenceVerified=True`` on request without downloading, hashing or running
    anything, so a single POST turned a non-existent model into a verified one.
    """

    def __init__(self, registry_dir: Path = DATA_ROOT / "models" / "registry"):
        self.registry_dir = registry_dir
        self.registry_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = self.registry_dir / "models.json"
        self.parquet_path = self.registry_dir / "models.parquet"
        self.models: Dict[str, ModelDefinition] = {}
        self.load()

    # --- persistence ----------------------------------------------------------------

    def load(self):
        if self.db_path.is_file():
            try:
                data = json.loads(self.db_path.read_text(encoding="utf-8"))
                for key, value in data.items():
                    self.models[key] = ModelDefinition(**value)
                self._reconcile_with_disk()
                return
            except Exception:
                pass

        self._init_defaults()
        self._reconcile_with_disk()
        self.save()

    def _init_defaults(self):
        # checkpointPath is stored relative to MODEL_ROOT at rest and resolved on
        # load, so the registry file stays portable between machines. It used to
        # embed absolute /Users/<name>/... paths.
        defaults = [
            ModelDefinition(
                modelId="mediapipe_pose_heavy",
                provider="mediapipe",
                task="pose_estimation",
                sourceUrl=(
                    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
                    "pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task"
                ),
                checkpointPath="checkpoints/pose_landmarker_heavy.task",
                checkpointSha256=UNKNOWN_SHA256,
                backend="cpu",
                status="not_installed",
                statusDetail=(
                    "Upstream publishes no checksum for this artefact; integrity is "
                    "verified by size and successful inference only."
                ),
            ),
            ModelDefinition(
                modelId="sam2.1_hiera_tiny",
                provider="sam2",
                task="video_segmentation",
                sourceUrl=(
                    "https://dl.fbaipublicfiles.com/segment_anything_2/072824/"
                    "sam2.1_hiera_tiny.pt"
                ),
                checkpointPath="checkpoints/sam2.1_hiera_tiny.pt",
                checkpointSha256=UNKNOWN_SHA256,
                backend="cpu",
                status="not_installed",
            ),
            ModelDefinition(
                modelId="whisper_base",
                provider="whisper",
                task="transcription",
                sourceUrl=(
                    "https://openaipublic.azureedge.net/main/whisper/models/"
                    "ed3a0b6b245efebe5dc0f030193843f9c05e99f78d4d5d326bcba2ac9f5c76b0/base.pt"
                ),
                checkpointPath="checkpoints/whisper_base.pt",
                # This one is real: OpenAI embeds the digest in the URL itself.
                checkpointSha256=(
                    "ed3a0b6b245efebe5dc0f030193843f9c05e99f78d4d5d326bcba2ac9f5c76b0"
                ),
                backend="cpu",
                status="not_installed",
            ),
            ModelDefinition(
                modelId="rtmpose_m",
                provider="rtmpose",
                task="pose_estimation",
                sourceUrl=(
                    "https://download.openmmlab.com/mmpose/v1/projects/rtmpose/"
                    "rtmpose-m_simcc-body7_pt-aic-coco_270e-256x192-4dba183a_20230225.pth"
                ),
                checkpointPath="checkpoints/rtmpose-m.pth",
                checkpointSha256=UNKNOWN_SHA256,
                backend="cpu",
                status="not_installed",
                statusDetail="No inference implementation is wired up for RTMPose yet.",
            ),
        ]
        for model in defaults:
            self.models[model.modelId] = model

    def save(self):
        data = {}
        for key, model in self.models.items():
            dumped = model.model_dump()
            # Persist paths relative to MODEL_ROOT for portability.
            if dumped.get("checkpointPath"):
                try:
                    dumped["checkpointPath"] = str(
                        Path(dumped["checkpointPath"]).relative_to(MODEL_ROOT)
                    )
                except ValueError:
                    pass
            data[key] = dumped

        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.db_path.write_text(
            json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8"
        )

        try:
            import pandas as pd
            pd.DataFrame(data.values()).to_parquet(self.parquet_path)
        except Exception:
            pass

    # --- disk reconciliation ---------------------------------------------------------

    def resolved_path(self, model: ModelDefinition) -> Optional[Path]:
        if not model.checkpointPath:
            return None
        candidate = Path(model.checkpointPath)
        return candidate if candidate.is_absolute() else (MODEL_ROOT / candidate)

    def _reconcile_with_disk(self):
        """Downgrade any claim the filesystem does not support.

        Registry state is a cache, not a source of truth. If a checkpoint was
        deleted or a stale file claims to be ready, the claim is revoked here so a
        restart never resurrects a false "ready".
        """
        for model in self.models.values():
            path = self.resolved_path(model)
            exists = bool(path and path.is_file())

            if not exists:
                if model.installed or model.status == "ready":
                    model.installed = False
                    model.importVerified = False
                    model.inferenceVerified = False
                    model.status = "not_installed"
                    model.statusDetail = (
                        "Checkpoint file is missing on disk; previous 'ready' state "
                        "was revoked on load."
                    )
                    model.observedSha256 = None
                    model.sizeBytes = None
                continue

            model.installed = True
            model.sizeBytes = path.stat().st_size
            # Inference verification cannot survive a restart unless it was
            # recorded together with a matching digest.
            if model.status == "ready" and not model.inferenceVerified:
                model.status = "installed_unverified"

    @staticmethod
    def sha256_of(path: Path) -> str:
        digest = hashlib.sha256()
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(DOWNLOAD_CHUNK), b""):
                digest.update(chunk)
        return digest.hexdigest()

    # --- install --------------------------------------------------------------------

    def install(self, model_id: str, allow_download: bool = False) -> ModelDefinition:
        """Make a checkpoint present and integrity-checked on disk.

        Downloading is opt-in: silently pulling gigabytes because a status field
        was requested is not acceptable. Without ``allow_download`` this only
        adopts and verifies a file that is already there.
        """
        model = self.models.get(model_id)
        if model is None:
            raise RegistryError(f"Model {model_id} is not in the registry")

        path = self.resolved_path(model)
        if path is None:
            raise RegistryError(
                f"Model {model_id} has no checkpointPath, so it cannot be installed"
            )

        if not path.is_file():
            if not allow_download:
                self.update_status(
                    model_id,
                    installed=False,
                    status="not_installed",
                    statusDetail=(
                        "Checkpoint absent. Re-run with allowDownload=true to fetch "
                        f"it from {model.sourceUrl or 'an unspecified source'}."
                    ),
                )
                raise RegistryError(
                    f"Checkpoint for {model_id} is not on disk and downloads are "
                    "disabled (pass allowDownload=true to fetch it)"
                )
            if not model.sourceUrl:
                raise RegistryError(f"Model {model_id} has no sourceUrl to download from")
            self._download(model, path)

        observed = self.sha256_of(path)
        size = path.stat().st_size

        if model.checkpointSha256 and observed != model.checkpointSha256:
            self.update_status(
                model_id,
                installed=True,
                importVerified=False,
                inferenceVerified=False,
                observedSha256=observed,
                sizeBytes=size,
                status="checksum_mismatch",
                statusDetail=(
                    f"SHA-256 mismatch: expected {model.checkpointSha256}, "
                    f"got {observed}. The file is not trusted."
                ),
            )
            raise RegistryError(f"Checksum mismatch for {model_id}; refusing to mark ready")

        self.update_status(
            model_id,
            installed=True,
            observedSha256=observed,
            sizeBytes=size,
            # Present and hash-checked, but nothing has run yet.
            status="installed_unverified",
            statusDetail=(
                "Checkpoint present and checksum-verified. Run verify to confirm the "
                "provider can import and execute it."
                if model.checkpointSha256
                else "Checkpoint present. No upstream checksum is published, so "
                "integrity rests on successful inference."
            ),
        )
        return self.models[model_id]

    def _download(self, model: ModelDefinition, destination: Path) -> None:
        self.update_status(model.modelId, status="downloading", statusDetail=None)
        destination.parent.mkdir(parents=True, exist_ok=True)

        # Download to a temp file and move into place, so an interrupted transfer
        # never leaves a truncated checkpoint that looks installed.
        tmp_fd, tmp_name = tempfile.mkstemp(dir=str(destination.parent), suffix=".part")
        os.close(tmp_fd)
        tmp_path = Path(tmp_name)
        try:
            with urllib.request.urlopen(model.sourceUrl, timeout=60) as response:
                with tmp_path.open("wb") as out:
                    shutil.copyfileobj(response, out, DOWNLOAD_CHUNK)
            tmp_path.replace(destination)
        except (urllib.error.URLError, OSError, TimeoutError) as exc:
            tmp_path.unlink(missing_ok=True)
            self.update_status(
                model.modelId,
                installed=False,
                status="failed",
                statusDetail=f"Download failed: {exc}",
            )
            raise RegistryError(f"Download of {model.modelId} failed: {exc}") from exc

    # --- verify ---------------------------------------------------------------------

    def verify(self, model_id: str, probe: Optional[Any] = None) -> ModelDefinition:
        """Confirm the provider can import and actually execute the model.

        ``probe`` is a zero-argument callable that performs one real inference and
        returns truthy on success. Without a probe the model can reach at most
        ``installed_unverified``: importing is not executing.
        """
        model = self.models.get(model_id)
        if model is None:
            raise RegistryError(f"Model {model_id} is not in the registry")

        path = self.resolved_path(model)
        if path is None or not path.is_file():
            self.update_status(
                model_id,
                installed=False,
                importVerified=False,
                inferenceVerified=False,
                status="not_installed",
                statusDetail="Cannot verify a checkpoint that is not on disk.",
            )
            raise RegistryError(f"Checkpoint for {model_id} is not on disk")

        observed = self.sha256_of(path)
        if model.checkpointSha256 and observed != model.checkpointSha256:
            self.update_status(
                model_id,
                importVerified=False,
                inferenceVerified=False,
                observedSha256=observed,
                status="checksum_mismatch",
                statusDetail=(
                    f"SHA-256 mismatch: expected {model.checkpointSha256}, got {observed}."
                ),
            )
            raise RegistryError(f"Checksum mismatch for {model_id}")

        if probe is None:
            self.update_status(
                model_id,
                installed=True,
                observedSha256=observed,
                sizeBytes=path.stat().st_size,
                importVerified=False,
                inferenceVerified=False,
                status="installed_unverified",
                statusDetail=(
                    "No inference probe was supplied, so execution is unproven. "
                    "status='ready' requires a successful real inference."
                ),
            )
            return self.models[model_id]

        started = time.perf_counter()
        try:
            outcome = probe()
        except Exception as exc:
            self.update_status(
                model_id,
                installed=True,
                observedSha256=observed,
                importVerified=False,
                inferenceVerified=False,
                status="failed",
                statusDetail=f"Inference probe raised: {exc}",
            )
            raise RegistryError(f"Inference probe for {model_id} failed: {exc}") from exc

        latency_ms = (time.perf_counter() - started) * 1000.0

        if not outcome:
            self.update_status(
                model_id,
                installed=True,
                observedSha256=observed,
                importVerified=True,
                inferenceVerified=False,
                averageLatencyMs=latency_ms,
                status="degraded",
                statusDetail=(
                    "Provider imported the model but the inference probe returned a "
                    "falsy result, so execution is not proven."
                ),
            )
            return self.models[model_id]

        self.update_status(
            model_id,
            installed=True,
            observedSha256=observed,
            sizeBytes=path.stat().st_size,
            importVerified=True,
            inferenceVerified=True,
            averageLatencyMs=latency_ms,
            status="ready",
            statusDetail=None,
        )
        return self.models[model_id]

    # --- accessors ------------------------------------------------------------------

    def get_model(self, model_id: str) -> Optional[ModelDefinition]:
        return self.models.get(model_id)

    def list_models(self) -> List[ModelDefinition]:
        return list(self.models.values())

    def update_status(self, model_id: str, **kwargs):
        if model_id in self.models:
            model = self.models[model_id]
            for key, value in kwargs.items():
                if hasattr(model, key):
                    setattr(model, key, value)
            model.lastVerifiedAt = datetime.now(timezone.utc).isoformat()
            self.save()
