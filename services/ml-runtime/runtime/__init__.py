"""Provider architecture for the Harmony ML runtime.

One job protocol (`/v2/jobs`), one provider contract (`providers.base.MlRuntimeProvider`), one
registry and one job manager. The legacy `/jobs/execute` and `/infer/*` endpoints survive only
as thin adapters that translate into a V2 job; they hold no business logic of their own.
"""

from .artifact_store import ArtifactStore
from .hardware_probe import probe as probe_hardware
from .job_manager import JobManager
from .license_guard import LicenseGuard
from .model_loader import MODEL_LOADER, ModelLoader
from .provider_registry import ProviderRegistry, build_default_registry

__all__ = [
    "ArtifactStore",
    "JobManager",
    "LicenseGuard",
    "MODEL_LOADER",
    "ModelLoader",
    "ProviderRegistry",
    "build_default_registry",
    "probe_hardware",
]
