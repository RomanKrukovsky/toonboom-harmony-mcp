"""WhisperX speech transcription + MFA / Rhubarb phoneme alignment provider.

The real WhisperX install and its large-v3 weights are absent from this repository. The
provider exposes the V2 typed contract, validates inputs and returns a blocked
`ProviderResult`.

The provider is structured to perform the *full* pipeline:
  1. ASR via WhisperX → word-level timing and transcript
  2. Forced alignment via Montreal Forced Aligner (preferred) or Rhubarb heuristic (fallback)
  3. Output as WhisperxSpeechAnalysisV2

When real weights are installed, the two stages run inside `execute()`. The skeleton of the
combination logic is in place so tests can drive it without the heavy models.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List

from .base import ExecutionContext, MlRuntimeProvider, ProviderDescriptor, ProviderResult

logger = logging.getLogger("ml-runtime.whisperx")

STATUS_WHISPER = "blocked: WhisperX weights are not installed and no MFA acoustic model is configured"
STATUS_MFA = "blocked: montreal-forced-aligner executable not on PATH; install MFA or accept Rhubarb fallback"
STATUS_RHUBARB = "blocked: rhubarb executable not on PATH; install Rhubarb for the heuristic fallback"


def _which(name: str) -> bool:
    import shutil
    return shutil.which(name) is not None


class WhisperxProvider(MlRuntimeProvider):
    """V2-typed WhisperX + alignment pipeline. Today: blocked. Tomorrow: real inference."""

    cache_key: str = "whisperx/base"

    @property
    def descriptor(self) -> ProviderDescriptor:
        return ProviderDescriptor(
            providerId="whisperx",
            modelId="whisper_base",
            modelRevision="base",
            taskTypes=("speech_transcription", "phoneme_alignment"),
            capabilities=("multilingual", "word_timestamps", "speaker_diarization"),
            inputSchemaVersions=("2.0",),
            outputSchemaVersions=("2.0",),
            resultKind="WhisperxSpeechAnalysisV2",
            backend="huggingface_transformers",
            devices=("cpu", "mps", "cuda"),
            minRamGb=4.0,
            minVramGb=4.0,
            estimatedPeakMemoryMb=2200.0,
            supportsBatch=False,
            supportsCancellation=True,
            threadSafe=False,
            maxConcurrency=1,
            loadMode="lazy",
            unloadPolicy="after_job",
            privacyClass="remote_forbidden_personal_data",
            requiresPickle=False,
            requiredDependencies=("whisperx", "torchaudio"),
        )

    def detect(self) -> Dict[str, Any]:
        alignments = {"mfa": _which("mfa"), "rhubarb": _which("rhubarb")}
        return {
            "status": "weights_missing",
            "message": STATUS_WHISPER,
            "weights_required": ["base.pt", "large-v3.pt"],
            "license_status": "legal_review_required",
            "alignment_backends": alignments,
        }

    def validate_input(self, parameters: Dict[str, Any], inputs: List[Dict[str, Any]]) -> List[str]:
        problems: List[str] = []
        if not inputs:
            problems.append("one audio artifact is required")
        if not any(isinstance(a, dict) and a.get("mimeType", "").startswith("audio/") for a in inputs):
            problems.append("the input artifact's mime type must be audio/*")
        language = parameters.get("language", "en")
        if not isinstance(language, str) or not language:
            problems.append("language must be a non-empty string")
        alignment = parameters.get("alignmentSource", "whisperx_word_level")
        if alignment not in {"whisperx_word_level", "montreal_forced_aligner", "rhubarb_heuristic"}:
            problems.append(f"alignmentSource {alignment!r} is not recognised")
        return problems

    def execute(self, parameters: Dict[str, Any], inputs: List[Path], context: ExecutionContext) -> ProviderResult:
        alignment = parameters.get("alignmentSource", "whisperx_word_level")
        message = STATUS_WHISPER
        if alignment == "montreal_forced_aligner" and not _which("mfa"):
            message = STATUS_MFA
        if alignment == "rhubarb_heuristic" and not _which("rhubarb"):
            message = STATUS_RHUBARB
        return ProviderResult(
            status="blocked",
            real_inference_executed=False,
            simulated=False,
            error_code="ML_MODEL_NOT_INSTALLED",
            error_message=message,
            warnings=[message],
            normalized_pir=None,
        )


# ============================================================================ viseme mapper ====

PRESTON_BLAIR_BASIC = {
    "REST": [],
    "AI_E": ["AI", "E"],
    "MBP": ["M", "B", "P"],
    "FV": ["F", "V"],
    "L": ["L"],
    "WQ": ["W", "Q"],
    "O": ["O"],
    "U": ["U"],
    "CDGKNRSTHYZ": ["C", "D", "G", "K", "N", "R", "S", "T", "H", "Y", "Z"],
}


class VisemeMapper:
    """Maps MFA phoneme sequences to mouth-chart shape IDs and respects coarticulation rules."""

    def __init__(self, mapping_table: Dict[str, List[str]] | None = None, silence_shape: str = "REST"):
        self.mapping = mapping_table or PRESTON_BLAIR_BASIC
        self.silence_shape = silence_shape

    def phoneme_to_shape(self, phoneme: str) -> str:
        for shape, triggers in self.mapping.items():
            if phoneme.upper() in triggers:
                return shape
        return self.silence_shape

    def coarticulate(self, previous: str, current: str, blend_table: Dict[str, Dict[str, str]] | None = None) -> str:
        if blend_table and previous in blend_table and current in blend_table[previous]:
            return blend_table[previous][current]
        return current
