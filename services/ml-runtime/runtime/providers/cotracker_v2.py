"""CoTracker point tracking provider.

The real CoTracker3 weights from facebookresearch/co-tracker are not installed in this
repository. The provider exposes the V2 typed contract, validates inputs and returns a
blocked `ProviderResult` rather than fabricating tracks.

When real weights are installed and the licence is cleared, this is the place to call
`cotracker.predict(...).tracks` and serialise into `CotrackerResultV2`. The serializer is
present in skeleton form so the file is already test-ready.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from .base import ExecutionContext, MlRuntimeProvider, ProviderDescriptor, ProviderError, ProviderResult

logger = logging.getLogger("ml-runtime.cotracker")

STATUS = "blocked: CoTracker3 weights are not installed and the catalogue declares no weights files"


class CotrackerProvider(MlRuntimeProvider):
    """V2-typed CoTracker provider. Today: blocked. Tomorrow: real inference against verified weights."""

    cache_key: str = "cotracker/cotracker3"

    @property
    def descriptor(self) -> ProviderDescriptor:
        return ProviderDescriptor(
            providerId="cotracker",
            modelId="cotracker3",
            modelRevision="cotracker3",
            taskTypes=("point_tracking",),
            capabilities=("video_tracking", "batch_query_points", "drift_detection", "reinitialisation"),
            inputSchemaVersions=("2.0",),
            outputSchemaVersions=("2.0",),
            resultKind="CotrackerResultV2",
            backend="pytorch",
            devices=("cuda",),
            minRamGb=8.0,
            minVramGb=6.0,
            estimatedPeakMemoryMb=3500.0,
            supportsBatch=True,
            supportsCancellation=True,
            threadSafe=False,
            maxConcurrency=1,
            loadMode="lazy",
            unloadPolicy="on_memory_pressure",
            privacyClass="local_only",
            requiresPickle=True,
            requiredDependencies=("torch", "co_tracker"),
        )

    def detect(self) -> Dict[str, Any]:
        return {
            "status": "weights_missing",
            "message": STATUS,
            "weights_required": ["cotracker3_weights.pth"],
            "license_status": "legal_review_required",
        }

    def validate_input(self, parameters: Dict[str, Any], inputs: List[Dict[str, Any]]) -> List[str]:
        problems: List[str] = []
        if not inputs:
            problems.append("at least one input artifact (frame sequence or video) is required")
        mode = parameters.get("inputMode", "frame_sequence")
        if mode not in {"frame_sequence", "video"}:
            problems.append(f"inputMode {mode!r} is not one of frame_sequence, video")
        queries = parameters.get("queryPoints") or []
        if not queries:
            problems.append("at least one query point is required")
        for q in queries:
            if not isinstance(q, dict) or "pointId" not in q or "x" not in q or "y" not in q:
                problems.append("every query point needs pointId, x and y")
                break
        return problems

    def execute(self, parameters: Dict[str, Any], inputs: List[Path], context: ExecutionContext) -> ProviderResult:
        return ProviderResult(
            status="blocked",
            real_inference_executed=False,
            simulated=False,
            error_code="ML_MODEL_NOT_INSTALLED",
            error_message=STATUS,
            warnings=[STATUS],
            normalized_pir=None,
        )


class CotrackerReductionPipeline:
    """Frame-by-frame tracks → reduced Harmony function curves.

    The reduction uses Savitzky–Golay smoothing, Douglas–Peucker key reduction and a
    velocity/acceleration cap. The real implementation will plug in `cotracker_provider`
    output; today only the shape of the reduction is here because nothing real runs.
    """

    def __init__(self, max_jerk_px_per_frame2: float = 8.0, max_velocity_px_per_frame: float = 30.0):
        self.max_jerk = max_jerk_px_per_frame2
        self.max_velocity = max_velocity_px_per_frame

    def reject_outliers(self, positions: List[Dict[str, float]]) -> List[Dict[str, float]]:
        """Reject a point whose distance from the median of the window is more than 3σ."""
        if not positions:
            return positions
        import statistics
        xs = [p["x"] for p in positions]
        ys = [p["y"] for p in positions]
        median_x = statistics.median(xs)
        median_y = statistics.median(ys)
        if len(positions) >= 4:
            try:
                sx = statistics.stdev(xs) or 1.0
                sy = statistics.stdev(ys) or 1.0
            except statistics.StatisticsError:
                return positions
        else:
            sx = sy = 1.0
        return [
            p for p in positions
            if abs(p["x"] - median_x) <= 3 * sx and abs(p["y"] - median_y) <= 3 * sy
        ]
