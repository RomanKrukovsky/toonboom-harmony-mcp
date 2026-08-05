"""VoxCPM TTS provider.

VoxCPM from OpenBMB is a TTS model that supports both stock voices and consent-gated voice
cloning. The provider here implements the V2 typed contract. Real weights and the consent
artifact store are absent on this host, so the provider is honest about being blocked rather
than fabricating audio.

TTS is the one task where fabricated output is dangerous: a single fake 16 kHz WAV file
captured on disk and replayed into a production slot can pass as a consented clone. There is
no shortcut here. The blocked message says so.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List

from .base import ExecutionContext, MlRuntimeProvider, ProviderDescriptor, ProviderResult

logger = logging.getLogger("ml-runtime.voxcpm")

STATUS_WEIGHTS = "blocked: VoxCPM weights are not installed; install via scripts/ml/download_model.py once the licence is cleared"
STATUS_CONSENT = "blocked: voice_clone mode requires a consentId with revoked=false and permittedUntil in the future"


class VoxcpmProvider(MlRuntimeProvider):
    """V2-typed VoxCPM TTS. Today: blocked. Tomorrow: real synthesis against verified weights."""

    cache_key: str = "voxcpm/voxcpm"

    @property
    def descriptor(self) -> ProviderDescriptor:
        return ProviderDescriptor(
            providerId="voxcpm",
            modelId="voxcpm",
            modelRevision="voxcpm",
            taskTypes=("tts",),
            capabilities=("multilingual", "stock_voice", "voice_clone_with_consent", "deterministic_seed"),
            inputSchemaVersions=("2.0",),
            outputSchemaVersions=("2.0",),
            resultKind="TtsResultV2",
            backend="pytorch",
            devices=("cpu", "mps", "cuda"),
            minRamGb=8.0,
            minVramGb=4.0,
            estimatedPeakMemoryMb=2800.0,
            supportsBatch=True,
            supportsCancellation=True,
            threadSafe=False,
            maxConcurrency=1,
            loadMode="lazy",
            unloadPolicy="after_job",
            privacyClass="remote_forbidden_personal_data",
            requiresPickle=False,
            requiredDependencies=("voxcpm",),
        )

    def detect(self) -> Dict[str, Any]:
        return {
            "status": "weights_missing",
            "message": STATUS_WEIGHTS,
            "weights_required": ["voxcpm.pt"],
            "license_status": "legal_review_required",
        }

    def validate_input(self, parameters: Dict[str, Any], inputs: List[Dict[str, Any]]) -> List[str]:
        problems: List[str] = []
        voice_mode = parameters.get("voiceMode")
        text = parameters.get("text")
        if not isinstance(text, str) or not text.strip():
            problems.append("text must be a non-empty string")
        if voice_mode not in {"licensed_stock_voice", "studio_owned_voice", "consented_clone", "synthetic_designed_voice"}:
            problems.append(f"voiceMode {voice_mode!r} is not recognised")
        if voice_mode == "consented_clone" and not parameters.get("consentId"):
            problems.append("consented_clone requires a consentId")
        if voice_mode != "consented_clone" and parameters.get("consentId") is not None:
            problems.append("consentId may only accompany consented_clone")
        language = parameters.get("language", "en")
        if not isinstance(language, str) or not language:
            problems.append("language must be a non-empty string")
        if not parameters.get("speakerProfileId"):
            problems.append("speakerProfileId is required")
        return problems

    def execute(self, parameters: Dict[str, Any], inputs: List[Path], context: ExecutionContext) -> ProviderResult:
        # Validate before declaring the failure: a missing consentId is a programming bug,
        # not a runtime error, so it should surface as `ML_CONSENT_MISSING` rather than as the
        # generic weights-missing message.
        problems = self.validate_input(parameters, [])
        if any("consentId" in p for p in problems):
            return ProviderResult(
                status="blocked",
                real_inference_executed=False,
                simulated=False,
                error_code="ML_CONSENT_MISSING",
                error_message=STATUS_CONSENT,
                warnings=[STATUS_CONSENT],
                normalized_pir=None,
            )
        return ProviderResult(
            status="blocked",
            real_inference_executed=False,
            simulated=False,
            error_code="ML_MODEL_NOT_INSTALLED",
            error_message=STATUS_WEIGHTS,
            warnings=[STATUS_WEIGHTS],
            normalized_pir=None,
        )
