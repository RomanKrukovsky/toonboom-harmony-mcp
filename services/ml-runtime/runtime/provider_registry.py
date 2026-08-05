"""Single registration point for every provider in this runtime.

Adding a model means adding one entry here, not adding an HTTP endpoint. `/v2/jobs` dispatches
through this registry, and `/v2/providers` reports exactly what it contains — including the
providers that are registered but blocked, with the reason, rather than pretending they do not
exist.
"""

from __future__ import annotations

import logging
from typing import Callable, Dict, List, Optional

from .license_guard import LicenseGuard
from .model_loader import MODEL_LOADER, WeightsVerification
from .providers.base import MlRuntimeProvider, ProviderDescriptor

logger = logging.getLogger("ml-runtime.registry")

ProviderFactory = Callable[[], MlRuntimeProvider]


class ProviderConflict(Exception):
    pass


class ProviderRegistry:
    def __init__(self, license_guard: Optional[LicenseGuard] = None):
        self._factories: Dict[str, ProviderFactory] = {}
        self._instances: Dict[str, MlRuntimeProvider] = {}
        self._descriptors: Dict[str, ProviderDescriptor] = {}
        self.license_guard = license_guard or LicenseGuard()

    def register(self, provider_id: str, factory: ProviderFactory, descriptor: ProviderDescriptor) -> None:
        if provider_id in self._factories:
            raise ProviderConflict(f"provider {provider_id!r} is already registered")
        if descriptor.providerId != provider_id:
            raise ProviderConflict(f"descriptor id {descriptor.providerId!r} != registration id {provider_id!r}")
        for existing in self._descriptors.values():
            if existing.modelId == descriptor.modelId and existing.modelRevision != descriptor.modelRevision:
                raise ProviderConflict(
                    f"{provider_id} pins {descriptor.modelId}@{descriptor.modelRevision} while "
                    f"{existing.providerId} pins @{existing.modelRevision}"
                )
        self._factories[provider_id] = factory
        self._descriptors[provider_id] = descriptor
        logger.info("registered provider=%s model=%s revision=%s", provider_id, descriptor.modelId, descriptor.modelRevision)

    def has(self, provider_id: str) -> bool:
        return provider_id in self._factories

    def get(self, provider_id: str) -> MlRuntimeProvider:
        if provider_id not in self._factories:
            raise KeyError(provider_id)
        if provider_id not in self._instances:
            self._instances[provider_id] = self._factories[provider_id]()
        return self._instances[provider_id]

    def descriptor(self, provider_id: str) -> ProviderDescriptor:
        return self._descriptors[provider_id]

    def descriptors(self) -> List[ProviderDescriptor]:
        return list(self._descriptors.values())

    def provider_ids(self) -> List[str]:
        return list(self._factories)

    def for_task(self, task_type: str) -> List[str]:
        return [pid for pid, d in self._descriptors.items() if task_type in d.taskTypes]

    # ---------------------------------------------------------------- readiness --

    def verify_weights(self, provider_id: str) -> WeightsVerification:
        descriptor = self._descriptors[provider_id]
        entry = self.license_guard.catalog_entry(descriptor.modelId)
        if entry is None:
            return WeightsVerification(
                modelId=descriptor.modelId,
                verified=False,
                blockingReason=f"{descriptor.modelId} is not in catalog.json",
            )
        return MODEL_LOADER.verify_weights(descriptor.modelId, entry["cacheKey"], entry.get("weightsFiles", []))

    def readiness(self, provider_id: str) -> Dict[str, object]:
        descriptor = self._descriptors[provider_id]
        verdict = self.license_guard.evaluate(descriptor.modelId)
        weights = self.verify_weights(provider_id)

        blocking: Optional[str] = None
        if not verdict.allowed:
            blocking = f"license: {verdict.humanReason}"
        elif not weights.verified:
            blocking = weights.blockingReason

        return {
            "providerId": provider_id,
            "modelId": descriptor.modelId,
            "modelRevision": descriptor.modelRevision,
            "taskTypes": list(descriptor.taskTypes),
            "backend": descriptor.backend,
            "devices": list(descriptor.devices),
            "ready": blocking is None,
            "blockingReason": blocking,
            "licenseStatus": verdict.status,
            "weightsSha256": sorted(weights.measuredDigests.values()),
            "loaded": MODEL_LOADER.is_loaded(self._descriptors[provider_id].providerId),
        }

    def unload(self, provider_id: str) -> bool:
        instance = self._instances.get(provider_id)
        if instance is None:
            return False
        return instance.unload()


def build_default_registry() -> ProviderRegistry:
    """Registers every provider that has a real implementation in this repository.

    Providers whose weights are absent are still registered: `/v2/providers` then reports them
    with an honest `blockingReason` instead of leaving the caller to guess whether the model is
    missing or the integration was never written.
    """
    registry = ProviderRegistry()

    from .providers.dwpose_v2 import DWPoseV2Provider
    from .providers.sam2_v2 import Sam2Provider
    from .providers.cotracker_v2 import CotrackerProvider
    from .providers.whisperx_v2 import WhisperxProvider
    from .providers.voxcpm_v2 import VoxcpmProvider
    from .providers.generative_inbetween_v2 import GenerativeInbetweenProvider
    from .providers.face_performance_v2 import LivePortraitProvider, MediapipeFaceLandmarkerProvider
    from .providers.manganinjia_v2 import MangaNinjiaProvider
    from .providers.qwen3_vl_v2 import Qwen3VlVisualCritic

    dwpose = DWPoseV2Provider()
    registry.register("dwpose", lambda: DWPoseV2Provider(), dwpose.descriptor)

    sam2 = Sam2Provider()
    registry.register("sam2", lambda: Sam2Provider(), sam2.descriptor)

    cotracker = CotrackerProvider()
    registry.register("cotracker", lambda: CotrackerProvider(), cotracker.descriptor)

    whisperx = WhisperxProvider()
    registry.register("whisperx", lambda: WhisperxProvider(), whisperx.descriptor)

    voxcpm = VoxcpmProvider()
    registry.register("voxcpm", lambda: VoxcpmProvider(), voxcpm.descriptor)

    for pid in ("tooncrafter", "animeinterp", "animeinbet", "tooncomposer"):
        provider = GenerativeInbetweenProvider(pid)
        registry.register(pid, lambda pid=pid: GenerativeInbetweenProvider(pid), provider.descriptor)

    liveportrait = LivePortraitProvider()
    registry.register("liveportrait", lambda: LivePortraitProvider(), liveportrait.descriptor)

    mediapipe = MediapipeFaceLandmarkerProvider()
    registry.register("mediapipe_face_landmarker", lambda: MediapipeFaceLandmarkerProvider(), mediapipe.descriptor)

    manganinjia = MangaNinjiaProvider()
    registry.register("manganinjia", lambda: MangaNinjiaProvider(), manganinjia.descriptor)

    qwen = Qwen3VlVisualCritic()
    registry.register("qwen3-vl", lambda: Qwen3VlVisualCritic(), qwen.descriptor)

    return registry
