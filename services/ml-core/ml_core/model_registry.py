"""Model registry backed by the version-controlled catalog.

Two files, two lifetimes:

* ``catalog.json`` is committed. It holds upstream metadata only: URLs, revisions, pinned
  commits, licence findings and *published* digests. It never contains an absolute path, a
  machine name or an installation flag.
* ``local-state.json`` is per-machine and gitignored. It holds what this particular workstation
  has actually downloaded and verified.

Physical files live under ``$HARMONY_MODEL_CACHE`` (default ``<projectRoot>/.model-cache``),
addressed by the catalog's logical ``cacheKey``. Nothing in the committed tree hard-codes
``/Users/<somebody>/...`` any more.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from .config import DATA_ROOT

CATALOG_SCHEMA_VERSION = "2.0"


def project_root() -> Path:
    # ml_core/model_registry.py -> ml_core -> services/ml-core -> services -> <repo>
    return Path(__file__).resolve().parents[3]


def model_cache_root() -> Path:
    """Physical root for downloaded weights. Overridable, never committed."""
    raw = os.environ.get("HARMONY_MODEL_CACHE")
    return Path(raw).expanduser().resolve() if raw else (project_root() / ".model-cache")


class WeightsFile(BaseModel):
    role: str
    fileName: str
    url: str
    sizeBytes: Optional[int] = None
    format: str = "other"
    sha256: Optional[str] = None
    hashSource: str = "not_published_upstream"
    requiresQuarantineReview: bool = True


class LicenseRecord(BaseModel):
    codeLicense: str = "unverified"
    weightsLicense: str = "unverified"
    datasetLicense: str = "unverified"
    commercialUse: str = "unknown"
    derivativeWeights: str = "unknown"
    redistribution: str = "unknown"
    attribution: str = ""
    territorialRestrictions: List[str] = Field(default_factory=list)
    personalDataRisk: str = "unknown"
    biometricDataRisk: str = "unknown"
    consentRequired: bool = False
    status: str = "unknown"
    legalNotes: str = ""
    verifiedSourceUrls: List[str] = Field(default_factory=list)
    verifiedAt: Optional[str] = None
    verifiedBy: Optional[str] = None


class CatalogEntry(BaseModel):
    modelId: str
    providerId: str
    taskTypes: List[str]
    displayName: str
    upstreamRepository: Optional[str] = None
    upstreamCommit: Optional[str] = None
    revision: str
    cacheKey: str
    weightsFiles: List[WeightsFile] = Field(default_factory=list)
    runtime: Dict[str, Any] = Field(default_factory=dict)
    hardware: Dict[str, Any] = Field(default_factory=dict)
    license: LicenseRecord = Field(default_factory=LicenseRecord)
    maturity: str = "planned"
    notes: Optional[str] = None

    @property
    def provider(self) -> str:
        """Back-compat alias. Callers written against the pre-catalog registry used `.provider`."""
        return self.providerId

    @property
    def task(self) -> str:
        """Back-compat alias for the single-task field the old ModelDefinition exposed."""
        return self.taskTypes[0]

    def cache_dir(self) -> Path:
        return model_cache_root() / self.cacheKey

    def local_path(self, file_name: str) -> Path:
        return self.cache_dir() / file_name


class LocalModelState(BaseModel):
    """Per-machine installation state. Lives only in the gitignored local-state.json."""

    modelId: str
    installed: bool = False
    installedRevision: Optional[str] = None
    verifiedFiles: Dict[str, str] = Field(default_factory=dict)  # fileName -> sha256 actually measured
    importVerified: bool = False
    inferenceVerified: bool = False
    averageLatencyMs: Optional[float] = None
    peakMemoryMb: Optional[float] = None
    lastVerifiedAt: Optional[str] = None
    status: str = "not_installed"  # not_installed | quarantined | installed_unverified | ready | degraded | failed


class CatalogValidationError(RuntimeError):
    pass


class ModelRegistry:
    def __init__(self, registry_dir: Optional[Path] = None):
        self.registry_dir = registry_dir or (DATA_ROOT / "models" / "registry")
        self.registry_dir.mkdir(parents=True, exist_ok=True)
        self.catalog_path = self.registry_dir / "catalog.json"
        self.local_state_path = self.registry_dir / "local-state.json"
        self.catalog: Dict[str, CatalogEntry] = {}
        self.local: Dict[str, LocalModelState] = {}
        self.load()

    # ------------------------------------------------------------------ loading --

    def load(self) -> None:
        self.catalog = self._load_catalog()
        self.local = self._load_local_state()

    def _load_catalog(self) -> Dict[str, CatalogEntry]:
        if not self.catalog_path.is_file():
            raise CatalogValidationError(
                f"model catalog missing at {self.catalog_path}; it is version-controlled and "
                "must not be regenerated with invented defaults"
            )
        # A malformed catalog is a hard failure. The previous implementation swallowed the
        # exception and silently fabricated four models with placeholder digests.
        raw = json.loads(self.catalog_path.read_text(encoding="utf-8"))
        if raw.get("schemaVersion") != CATALOG_SCHEMA_VERSION:
            raise CatalogValidationError(
                f"catalog schemaVersion {raw.get('schemaVersion')!r} != {CATALOG_SCHEMA_VERSION!r}"
            )
        entries: Dict[str, CatalogEntry] = {}
        for item in raw.get("models", []):
            entry = CatalogEntry(**item)
            if entry.modelId in entries:
                raise CatalogValidationError(f"duplicate modelId {entry.modelId!r} in catalog")
            for wf in entry.weightsFiles:
                if wf.sha256 is None and not wf.requiresQuarantineReview:
                    raise CatalogValidationError(
                        f"{entry.modelId}/{wf.fileName}: no digest but quarantine review not required"
                    )
            entries[entry.modelId] = entry
        return entries

    def _load_local_state(self) -> Dict[str, LocalModelState]:
        if not self.local_state_path.is_file():
            return {}
        try:
            raw = json.loads(self.local_state_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise CatalogValidationError(f"local-state.json is corrupt: {exc}") from exc
        return {k: LocalModelState(**v) for k, v in raw.get("models", {}).items()}

    def save_local_state(self) -> None:
        payload = {
            "$comment": "PER-MACHINE state. Gitignored. Regenerate with `npm run ml:models:verify`.",
            "schemaVersion": "1.0",
            "modelCacheRoot": str(model_cache_root()),
            "models": {k: v.model_dump() for k, v in self.local.items()},
        }
        self.local_state_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    # ------------------------------------------------------------------- queries --

    def get_model(self, model_id: str) -> Optional[CatalogEntry]:
        return self.catalog.get(model_id)

    def list_models(self) -> List[CatalogEntry]:
        return list(self.catalog.values())

    def get_state(self, model_id: str) -> LocalModelState:
        return self.local.get(model_id) or LocalModelState(modelId=model_id)

    def models_for_task(self, task_type: str) -> List[CatalogEntry]:
        return [m for m in self.catalog.values() if task_type in m.taskTypes]

    def update_status(self, model_id: str, **kwargs: Any) -> LocalModelState:
        if model_id not in self.catalog:
            raise KeyError(f"unknown modelId {model_id!r}; add it to catalog.json first")
        state = self.local.get(model_id) or LocalModelState(modelId=model_id)
        for key, value in kwargs.items():
            if hasattr(state, key):
                setattr(state, key, value)
        state.lastVerifiedAt = datetime.now(timezone.utc).isoformat()
        self.local[model_id] = state
        self.save_local_state()
        return state
