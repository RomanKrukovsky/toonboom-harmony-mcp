"""MangaNinjia line-art colorization provider.

MangaNinjia's weights are not installed in this repository. The provider exposes the V2
typed contract (palette IDs are required, output is restricted to approved palette
substitutions), but returns a blocked `ProviderResult` until real weights land.

When real weights land, the *only* safe colorization rule is: never invent a new RGB
triple. Every coloured region must map to one of the approved Harmony palette IDs, and
the post-processing in this module enforces that contract.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List

from .base import ExecutionContext, MlRuntimeProvider, ProviderDescriptor, ProviderResult

logger = logging.getLogger("ml-runtime.manganinjia")

STATUS = "blocked: MangaNinjia weights are not installed; install via scripts/ml/download_model.py once the licence has been signed off"


class MangaNinjiaProvider(MlRuntimeProvider):
    """V2-typed MangaNinjia colorization. Today: blocked."""

    cache_key: str = "manganinjia/manganinjia"

    @property
    def descriptor(self) -> ProviderDescriptor:
        return ProviderDescriptor(
            providerId="manganinjia",
            modelId="manganinjia",
            modelRevision="manganinjia",
            taskTypes=("line_art_colorization",),
            capabilities=("palette_constrained", "region_extraction", "perceptual_palette_match"),
            inputSchemaVersions=("2.0",),
            outputSchemaVersions=("2.0",),
            resultKind="ColorizationResultV2",
            backend="pytorch",
            devices=("cuda",),
            minRamGb=12.0,
            minVramGb=8.0,
            estimatedPeakMemoryMb=5200.0,
            supportsBatch=False,
            supportsCancellation=True,
            threadSafe=False,
            maxConcurrency=1,
            loadMode="lazy",
            unloadPolicy="on_memory_pressure",
            privacyClass="local_only",
            requiresPickle=True,
            requiredDependencies=("torch", "manganinjia"),
        )

    def detect(self) -> Dict[str, Any]:
        return {"status": "weights_missing", "message": STATUS,
                "weights_required": ["manganinjia.pth"], "license_status": "legal_review_required"}

    def validate_input(self, parameters, inputs):
        problems: List[str] = []
        if not inputs:
            problems.append("at least one input artifact (clean line art) is required")
        palette = parameters.get("approvedPaletteIds") or []
        if len(palette) == 0:
            problems.append("approvedPaletteIds is required and must contain at least one palette colour id")
        for colour_id in palette:
            if not (isinstance(colour_id, str) and colour_id.startswith("0x") and len(colour_id) == 18):
                problems.append(f"palette id {colour_id!r} is not a 16-hex-digit 0x colour id")
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
