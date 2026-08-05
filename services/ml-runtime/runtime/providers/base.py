"""The single provider contract every model in this runtime implements.

Before this existed, `/jobs/execute` dispatched DWPose inline while AnimeInbet and VoxCPM hung
off their own `/infer/*` endpoints with separate business logic. Adding a model meant adding an
endpoint, and no two models agreed on what a result looked like.

A provider now supplies:
  * a `ProviderDescriptor` — everything the router and the licence gate need *without* loading
    weights;
  * `validate_input` — its own contract, checked before anything expensive happens;
  * `execute` — the work, given verified artifact paths and a cancellation token;
  * `unload` — releasing memory on demand.

`ProviderResult.real_inference_executed` may only be True when a checkpoint actually ran. The
`JobManager` cross-checks it against the measured weights digests, so the claim is not merely a
convention.
"""

from __future__ import annotations

import threading
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

from ..artifact_store import ArtifactReference, ArtifactStore
from ..model_loader import MODEL_LOADER, WeightsVerification


@dataclass(frozen=True)
class ProviderDescriptor:
    providerId: str
    modelId: str
    modelRevision: str
    taskTypes: Sequence[str]
    capabilities: Sequence[str]
    inputSchemaVersions: Sequence[str]
    outputSchemaVersions: Sequence[str]
    resultKind: str
    backend: str
    devices: Sequence[str]
    minRamGb: float
    minVramGb: Optional[float]
    estimatedPeakMemoryMb: Optional[float]
    supportsBatch: bool
    supportsCancellation: bool
    threadSafe: bool
    maxConcurrency: int
    loadMode: str            # eager | lazy | per_call
    unloadPolicy: str        # never | after_job | idle_timeout | on_memory_pressure
    privacyClass: str        # local_only | remote_allowed | remote_forbidden_personal_data
    requiresPickle: bool
    requiredDependencies: Sequence[str] = field(default_factory=tuple)

    def to_dict(self) -> Dict[str, Any]:
        data = self.__dict__.copy()
        for key, value in list(data.items()):
            if isinstance(value, tuple):
                data[key] = list(value)
        return data


class CancellationToken:
    """Cooperative cancellation. Long loops call `raise_if_cancelled()` between chunks."""

    def __init__(self) -> None:
        self._event = threading.Event()

    def cancel(self) -> None:
        self._event.set()

    @property
    def cancelled(self) -> bool:
        return self._event.is_set()

    def raise_if_cancelled(self) -> None:
        if self._event.is_set():
            raise JobCancelled("job was cancelled")


class JobCancelled(RuntimeError):
    pass


class ProviderError(RuntimeError):
    """Provider failure carrying a stable code from the shared error registry."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


@dataclass
class ExecutionContext:
    jobId: str
    correlationId: str
    executionMode: str
    commercialMode: str
    device: str
    seed: Optional[int]
    timeoutMs: int
    outputNamespace: str
    outputPrefix: str
    store: ArtifactStore
    token: CancellationToken
    licenseDecisionId: str
    weights: WeightsVerification


@dataclass
class ProviderResult:
    status: str                          # succeeded | failed | blocked | cancelled
    real_inference_executed: bool
    simulated: bool
    output_artifacts: List[ArtifactReference] = field(default_factory=list)
    normalized_pir: Optional[Dict[str, Any]] = None
    warnings: List[str] = field(default_factory=list)
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    device: str = "cpu"
    peak_memory_mb: Optional[float] = None
    deterministic: bool = False
    precision: str = "float32"

    def __post_init__(self) -> None:
        # The dishonest combination is rejected at construction rather than reviewed later.
        if self.status == "succeeded" and not self.real_inference_executed and not self.simulated:
            raise ValueError("a succeeded result must be either a real inference or explicitly simulated")
        if self.real_inference_executed and self.simulated:
            raise ValueError("real_inference_executed and simulated cannot both be true")
        if self.status in {"failed", "blocked"} and not self.error_code:
            raise ValueError(f"status={self.status} requires an error_code")


class MlRuntimeProvider(ABC):
    """Base class. Subclasses declare a descriptor and implement validate/execute."""

    @property
    @abstractmethod
    def descriptor(self) -> ProviderDescriptor:
        ...

    @property
    def cache_key(self) -> str:
        return self.descriptor.providerId

    @abstractmethod
    def validate_input(self, parameters: Dict[str, Any], inputs: List[Dict[str, Any]]) -> List[str]:
        """Returns a list of human-readable problems. Empty means the input is acceptable."""

    @abstractmethod
    def execute(self, parameters: Dict[str, Any], inputs: List[Path], context: ExecutionContext) -> ProviderResult:
        ...

    def detect(self) -> Dict[str, Any]:
        """Reports installability without loading anything. Overridable per provider."""
        return {"status": "installed_unverified", "message": "provider did not implement detect()"}

    def unload(self) -> bool:
        return MODEL_LOADER.unload(self.cache_key)

    # ---------------------------------------------------------------------- helpers --

    @staticmethod
    def now() -> str:
        return datetime.now(timezone.utc).isoformat()
