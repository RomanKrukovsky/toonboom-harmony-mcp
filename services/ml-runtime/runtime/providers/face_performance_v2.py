"""LivePortrait / MediaPipe face landmarker provider.

LivePortrait is published under a research-only licence that, in addition, transitively depends
on the InsightFace detector whose weights are released under a separate, non-commercial
licence. The catalog therefore marks LivePortrait as `preview_only` until the transitive
dependency chain has been re-read and the operator signs it off in `catalog.json`.

`preview_only` means: `LicensePolicyEngine` will *block* commercial use, but the orchestrator
will still accept the provider for `commercialMode: 'preview'` jobs. The provider returns
`ML_LICENSE_BLOCKED` whenever a job asks for commercial delivery.

MediaPipe face_landmarker is the production-first geometric source. Its weights are also
absent from this host (the `.task` file is not in `.model-cache`), so this provider is
honestly blocked until `scripts/ml/download_model.py --model mediapipe_face_landmarker`
actually downloads the file and verifies its digest.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List

from .base import ExecutionContext, MlRuntimeProvider, ProviderDescriptor, ProviderResult

logger = logging.getLogger("ml-runtime.face_performance")

STATUS_LIVEPORTRAIT = "blocked: LivePortrait is preview_only — the transitive InsightFace licence has not been cleared"
STATUS_MEDIAPIPE = "blocked: MediaPipe face_landmarker.task is not installed; download via scripts/ml/download_model.py --model mediapipe_face_landmarker"


class LivePortraitProvider(MlRuntimeProvider):
    """V2-typed LivePortrait face performance provider. Today: blocked."""

    cache_key: str = "liveportrait/liveportrait"

    @property
    def descriptor(self) -> ProviderDescriptor:
        return ProviderDescriptor(
            providerId="liveportrait",
            modelId="liveportrait",
            modelRevision="liveportrait",
            taskTypes=("face_performance_extraction",),
            capabilities=("blendshape_coefficients", "rotation_pitch_yaw_roll", "calibration_clip"),
            inputSchemaVersions=("2.0",),
            outputSchemaVersions=("2.0",),
            resultKind="FacePerformanceResultV2",
            backend="pytorch",
            devices=("cuda",),
            minRamGb=12.0,
            minVramGb=8.0,
            estimatedPeakMemoryMb=5400.0,
            supportsBatch=False,
            supportsCancellation=True,
            threadSafe=False,
            maxConcurrency=1,
            loadMode="lazy",
            unloadPolicy="on_memory_pressure",
            privacyClass="remote_forbidden_personal_data",
            requiresPickle=True,
            requiredDependencies=("torch", "liveportrait", "insightface"),
        )

    def detect(self) -> Dict[str, Any]:
        return {"status": "license_restricted", "message": STATUS_LIVEPORTRAIT,
                "weights_required": ["liveportrait.pth", "insightface_detector.onnx"],
                "license_status": "preview_only"}

    def validate_input(self, parameters, inputs):
        return []

    def execute(self, parameters, inputs, context):
        return ProviderResult(
            status="blocked",
            real_inference_executed=False,
            simulated=False,
            error_code="ML_LICENSE_BLOCKED",
            error_message=STATUS_LIVEPORTRAIT,
            warnings=[STATUS_LIVEPORTRAIT],
            normalized_pir=None,
        )


class MediapipeFaceLandmarkerProvider(MlRuntimeProvider):
    """V2-typed MediaPipe face landmarker provider. Today: blocked."""

    cache_key: str = "mediapipe/face_landmarker"

    @property
    def descriptor(self) -> ProviderDescriptor:
        return ProviderDescriptor(
            providerId="mediapipe_face_landmarker",
            modelId="mediapipe_face_landmarker",
            modelRevision="face_landmarker",
            taskTypes=("face_performance_extraction",),
            capabilities=("blendshapes", "transform_landmarks", "geometric_only"),
            inputSchemaVersions=("2.0",),
            outputSchemaVersions=("2.0",),
            resultKind="FacePerformanceResultV2",
            backend="mediapipe",
            devices=("cpu", "mps", "cuda"),
            minRamGb=4.0,
            minVramGb=2.0,
            estimatedPeakMemoryMb=1200.0,
            supportsBatch=False,
            supportsCancellation=False,
            threadSafe=False,
            maxConcurrency=1,
            loadMode="lazy",
            unloadPolicy="after_job",
            privacyClass="local_only",
            requiresPickle=False,
            requiredDependencies=("mediapipe",),
        )

    def detect(self) -> Dict[str, Any]:
        return {"status": "weights_missing", "message": STATUS_MEDIAPIPE,
                "weights_required": ["face_landmarker.task"], "license_status": "legal_review_required"}

    def validate_input(self, parameters, inputs):
        problems: List[str] = []
        if not inputs:
            problems.append("at least one input artifact is required")
        return problems

    def execute(self, parameters, inputs, context):
        return ProviderResult(
            status="blocked",
            real_inference_executed=False,
            simulated=False,
            error_code="ML_MODEL_NOT_INSTALLED",
            error_message=STATUS_MEDIAPIPE,
            warnings=[STATUS_MEDIAPIPE],
            normalized_pir=None,
        )
