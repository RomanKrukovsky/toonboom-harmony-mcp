"""Model cache and load policy.

Responsibilities:
  * resolve a catalog `cacheKey` to a physical directory under ``$HARMONY_MODEL_CACHE``;
  * re-hash weights before they are handed to a framework, every time a model is loaded;
  * refuse pickle checkpoints whose digest is not in the trusted manifest, because
    ``torch.load`` on an unverified pickle is arbitrary code execution;
  * keep one loaded model per key with an explicit unload path, so sequential loading on a
    memory-constrained host is possible instead of hoping the allocator copes.
"""

from __future__ import annotations

import logging
import os
import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from .artifact_store import sha256_file
from .hardware_probe import can_allocate
from .security import SecurityError

logger = logging.getLogger("ml-runtime.model_loader")

RUNTIME_ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = RUNTIME_ROOT.parent.parent

# DWPose weights were installed before the .model-cache layout existed and are hash-verified in
# place. Moving 335 MB of binaries would invalidate committed evidence for no benefit, so the
# loader searches the legacy directory for that model in addition to the cache root.
LEGACY_WEIGHT_DIRS: Dict[str, Path] = {
    "dwpose-ll-ucoco-384": RUNTIME_ROOT / "weights" / "dwpose",
}


def model_cache_root() -> Path:
    raw = os.environ.get("HARMONY_MODEL_CACHE")
    return Path(raw).expanduser().resolve() if raw else (PROJECT_ROOT / ".model-cache")


@dataclass
class WeightsVerification:
    modelId: str
    verified: bool
    resolvedPaths: Dict[str, str] = field(default_factory=dict)
    measuredDigests: Dict[str, str] = field(default_factory=dict)
    missing: List[str] = field(default_factory=list)
    mismatched: List[str] = field(default_factory=list)
    untrusted: List[str] = field(default_factory=list)
    blockingReason: Optional[str] = None

    def to_dict(self) -> dict:
        return self.__dict__.copy()


class ModelLoader:
    """Loads at most one instance per cache key, with explicit unloading."""

    def __init__(self) -> None:
        self._loaded: Dict[str, Any] = {}
        self._lock = threading.RLock()

    # ------------------------------------------------------------------ verification --

    def locate(self, model_id: str, cache_key: str, file_name: str) -> Optional[Path]:
        candidates = [model_cache_root() / cache_key / file_name]
        legacy = LEGACY_WEIGHT_DIRS.get(model_id)
        if legacy is not None:
            candidates.append(legacy / file_name)
        for candidate in candidates:
            if candidate.is_file():
                return candidate
        return None

    def verify_weights(self, model_id: str, cache_key: str, weights_files: List[dict]) -> WeightsVerification:
        result = WeightsVerification(modelId=model_id, verified=False)
        if not weights_files:
            result.blockingReason = "catalog declares no weights files; this integration is metadata only"
            return result

        for spec in weights_files:
            name = spec["fileName"]
            path = self.locate(model_id, cache_key, name)
            if path is None:
                result.missing.append(name)
                continue
            result.resolvedPaths[name] = str(path)
            expected = spec.get("sha256")
            if expected is None:
                result.untrusted.append(name)
                continue
            measured = sha256_file(path)
            result.measuredDigests[name] = measured
            if measured != expected:
                result.mismatched.append(name)

        if result.missing:
            result.blockingReason = f"weights not installed: {', '.join(result.missing)}"
        elif result.mismatched:
            result.blockingReason = f"digest mismatch: {', '.join(result.mismatched)}"
        elif result.untrusted:
            result.blockingReason = f"no trusted digest in catalog for: {', '.join(result.untrusted)}"
        else:
            result.verified = True
        return result

    def assert_safe_to_load(self, verification: WeightsVerification, *, requires_pickle: bool) -> None:
        """A pickle checkpoint may only be opened once its digest matches a trusted entry."""
        if requires_pickle and not verification.verified:
            raise SecurityError(
                "ML_WEIGHTS_HASH_UNVERIFIED",
                f"{verification.modelId} is a pickle checkpoint and cannot be deserialised "
                f"without a verified digest ({verification.blockingReason})",
            )
        if not verification.verified:
            raise SecurityError("ML_MODEL_NOT_INSTALLED", verification.blockingReason or "weights unavailable")

    # ------------------------------------------------------------------------ loading --

    def load(
        self,
        cache_key: str,
        factory: Callable[[], Any],
        *,
        estimated_mb: Optional[float] = None,
        device: str = "cpu",
    ) -> Any:
        with self._lock:
            if cache_key in self._loaded:
                return self._loaded[cache_key]
            if estimated_mb is not None and not can_allocate(estimated_mb, device):
                # Predicting the OOM is better than discovering it: free something first.
                freed = self.unload_all()
                if freed and not can_allocate(estimated_mb, device):
                    raise SecurityError(
                        "ML_INSUFFICIENT_MEMORY",
                        f"{estimated_mb} MB needed on {device}; still unavailable after unloading {freed} model(s)",
                    )
                if not freed:
                    raise SecurityError("ML_INSUFFICIENT_MEMORY", f"{estimated_mb} MB needed on {device}; host cannot supply it")
            instance = factory()
            self._loaded[cache_key] = instance
            logger.info("loaded model cache_key=%s device=%s", cache_key, device)
            return instance

    def is_loaded(self, cache_key: str) -> bool:
        return cache_key in self._loaded

    def unload(self, cache_key: str) -> bool:
        with self._lock:
            instance = self._loaded.pop(cache_key, None)
            if instance is None:
                return False
            closer = getattr(instance, "unload", None) or getattr(instance, "close", None)
            if callable(closer):
                try:
                    closer()
                except Exception as exc:  # noqa: BLE001 - logged with its cause, not hidden
                    logger.warning("unload hook for %s raised: %s", cache_key, exc)
            _release_framework_memory()
            logger.info("unloaded model cache_key=%s", cache_key)
            return True

    def unload_all(self) -> int:
        with self._lock:
            keys = list(self._loaded)
            for key in keys:
                self.unload(key)
            return len(keys)

    def loaded_keys(self) -> List[str]:
        return list(self._loaded)


def _release_framework_memory() -> None:
    import gc

    gc.collect()
    try:
        import torch  # type: ignore

        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        mps = getattr(torch, "mps", None)
        if mps is not None and hasattr(mps, "empty_cache"):
            mps.empty_cache()
    except ImportError:
        pass


MODEL_LOADER = ModelLoader()
