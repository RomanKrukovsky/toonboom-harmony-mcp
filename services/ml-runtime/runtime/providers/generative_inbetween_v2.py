"""Generic generative-inbetweening provider (ToonCrafter / AnimeInterp / AnimeInbet / ToonComposer).

These four are bundled into one Python module because they share the same V2 contract:
given two approved keyframes and an optional prompt or sketch, produce a raster sequence.
Real weights are absent for all of them, so every `execute()` returns a blocked result.

When real weights land, the provider is selected by `providerId`; the runtime keeps a
single registration point so adding a model does not mean adding a new endpoint.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List

from .base import ExecutionContext, MlRuntimeProvider, ProviderDescriptor, ProviderResult

logger = logging.getLogger("ml-runtime.inbetween")

STATUS_BY_PROVIDER = {
    "tooncrafter": "blocked: ToonCrafter weights are not installed and the licence has not been re-read in this session",
    "animeinterp": "blocked: AnimeInterp weights are not installed and the ATD-12K dataset licence has not been cleared",
    "animeinbet":  "blocked: AnimeInbet weights are not installed; the previous version of this provider returned fabricated /tmp/*.png paths and has been removed",
    "tooncomposer": "blocked: ToonComposer weights are not installed and the licence has not been re-read in this session",
}

DESCRIPTORS = {
    "tooncrafter": dict(
        modelId="tooncrafter",
        modelRevision="tooncrafter",
        resultKind="InbetweenResultV2",
        backend="pytorch",
        devices=("cuda",),
        minVramGb=16,
        peakMemMb=9000,
    ),
    "animeinterp": dict(
        modelId="animeinterp",
        modelRevision="animeinterp",
        resultKind="InbetweenResultV2",
        backend="pytorch",
        devices=("cuda",),
        minVramGb=12,
        peakMemMb=7000,
    ),
    "animeinbet": dict(
        modelId="animeinbet",
        modelRevision="animeinbet",
        resultKind="InbetweenResultV2",
        backend="pytorch",
        devices=("cuda",),
        minVramGb=8,
        peakMemMb=4500,
    ),
    "tooncomposer": dict(
        modelId="tooncomposer",
        modelRevision="tooncomposer",
        resultKind="InbetweenResultV2",
        backend="pytorch",
        devices=("cuda",),
        minVramGb=24,
        peakMemMb=16000,
    ),
}


class GenerativeInbetweenProvider(MlRuntimeProvider):
    """Honest blocked provider for one of the four generative-inbetweening models."""

    def __init__(self, provider_id: str):
        if provider_id not in STATUS_BY_PROVIDER:
            raise ValueError(f"unknown generative-inbetweening provider_id {provider_id!r}")
        self._provider_id = provider_id
        self._cache_key = f"{provider_id}/{DESCRIPTORS[provider_id]['modelRevision']}"

    @property
    def cache_key(self) -> str:
        # The base class declares `cache_key` as a read-only property derived from the
        # descriptor. This subclass overrides the default so the cache key includes the model
        # revision, which matters when two providers share a model id at different revisions.
        return self._cache_key

    @property
    def providerId(self) -> str:
        return self._provider_id

    @property
    def descriptor(self) -> ProviderDescriptor:
        d = DESCRIPTORS[self._provider_id]
        return ProviderDescriptor(
            providerId=self._provider_id,
            modelId=d["modelId"],
            modelRevision=d["modelRevision"],
            taskTypes=("inbetween_generation", "frame_interpolation"),
            capabilities=("raster_sequence", "editable_false", "needs_qa"),
            inputSchemaVersions=("2.0",),
            outputSchemaVersions=("2.0",),
            resultKind=d["resultKind"],
            backend=d["backend"],
            devices=d["devices"],
            minRamGb=8.0,
            minVramGb=d["minVramGb"],
            estimatedPeakMemoryMb=d["peakMemMb"],
            supportsBatch=False,
            supportsCancellation=True,
            threadSafe=False,
            maxConcurrency=1,
            loadMode="lazy",
            unloadPolicy="on_memory_pressure",
            privacyClass="local_only",
            requiresPickle=True,
            requiredDependencies=("torch", self._provider_id),
        )

    def detect(self) -> Dict[str, Any]:
        return {
            "status": "weights_missing",
            "message": STATUS_BY_PROVIDER[self._provider_id],
            "weights_required": [f"{self._provider_id}_weights.pth"],
            "license_status": "legal_review_required",
        }

    def validate_input(self, parameters: Dict[str, Any], inputs: List[Dict[str, Any]]) -> List[str]:
        problems: List[str] = []
        mode = parameters.get("mode")
        if mode not in {"two_keyframes", "color_reference_plus_sparse_sketch", "sketch_plus_prompt"}:
            problems.append(f"mode {mode!r} is not one of two_keyframes, color_reference_plus_sparse_sketch, sketch_plus_prompt")
        keys = parameters.get("approvedKeyframeIndices") or []
        if len(keys) < 2:
            problems.append("approvedKeyframeIndices needs at least two entries")
        return problems

    def execute(self, parameters: Dict[str, Any], inputs: List[Path], context: ExecutionContext) -> ProviderResult:
        return ProviderResult(
            status="blocked",
            real_inference_executed=False,
            simulated=False,
            error_code="ML_MODEL_NOT_INSTALLED",
            error_message=STATUS_BY_PROVIDER[self._provider_id],
            warnings=[STATUS_BY_PROVIDER[self._provider_id]],
            normalized_pir=None,
        )
