"""Qwen3-VL visual critic.

Qwen3-VL's weights are not installed in this repository. The provider exposes the V2 typed
contract and returns a blocked `ProviderResult`.

Qwen3-VL's VLM is a *critic*, never a producer of Harmony commands. The provider contract
binds it to the four allowed output types (`ReviewNotePIR`, `RetakeSuggestionPIR`,
`ShotCompositionPIR`, `VisualIssuePIR`); the orchestrator treats any other JSON shape as
a prompt-injection attempt.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List

from .base import ExecutionContext, MlRuntimeProvider, ProviderDescriptor, ProviderResult

logger = logging.getLogger("ml-runtime.qwen3-vl")

STATUS = "blocked: Qwen3-VL weights are not installed; install via scripts/ml/download_model.py after the licence has been cleared"

ALLOWED_OUTPUT_KINDS = ("ReviewNotePIR", "RetakeSuggestionPIR", "ShotCompositionPIR", "VisualIssuePIR")


class Qwen3VlVisualCritic(MlRuntimeProvider):
    """V2-typed Qwen3-VL visual critic. Today: blocked."""

    cache_key: str = "qwen3-vl/qwen3-vl"

    @property
    def descriptor(self) -> ProviderDescriptor:
        return ProviderDescriptor(
            providerId="qwen3-vl",
            modelId="qwen3-vl",
            modelRevision="qwen3-vl",
            taskTypes=("visual_quality_review",),
            capabilities=("VisualIssuePIR", "ReviewNotePIR", "RetakeSuggestionPIR", "ShotCompositionPIR", "prompt_injection_detection"),
            inputSchemaVersions=("2.0",),
            outputSchemaVersions=("2.0",),
            resultKind="VisualCriticReportV2",
            backend="huggingface_transformers",
            devices=("cuda",),
            minRamGb=24.0,
            minVramGb=24.0,
            estimatedPeakMemoryMb=22000.0,
            supportsBatch=False,
            supportsCancellation=True,
            threadSafe=False,
            maxConcurrency=1,
            loadMode="lazy",
            unloadPolicy="on_memory_pressure",
            privacyClass="remote_allowed",
            requiresPickle=False,
            requiredDependencies=("transformers", "torch"),
        )

    def detect(self) -> Dict[str, Any]:
        return {"status": "weights_missing", "message": STATUS,
                "weights_required": ["qwen3-vl.safetensors"], "license_status": "legal_review_required"}

    def validate_input(self, parameters, inputs):
        problems: List[str] = []
        if not inputs:
            problems.append("at least one input image is required")
        return problems

    def execute(self, parameters, inputs, context):
        return ProviderResult(
            status="blocked",
            real_inference_executed=False,
            simulated=False,
            error_code="ML_MODEL_NOT_INSTALLED",
            error_message=STATUS,
            warnings=[STATUS],
            normalized_pir=None,
        )


def validate_vlm_payload(payload_kind: str, payload: str) -> List[str]:
    """A VLM payload is a structured JSON string. Outside the whitelist it is treated as injection."""
    import json as _json
    problems: List[str] = []
    if payload_kind not in ALLOWED_OUTPUT_KINDS:
        problems.append(f"VLM payload kind {payload_kind!r} is not in the allowed whitelist")
    try:
        parsed = _json.loads(payload)
    except _json.JSONDecodeError as exc:
        return [f"VLM payload is not valid JSON: {exc}"]
    if not isinstance(parsed, dict):
        problems.append("VLM payload must be a JSON object")
    return problems
