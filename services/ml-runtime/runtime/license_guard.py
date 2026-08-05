"""Runtime-side licence gate.

The TypeScript `LicensePolicyEngine` is the authority, but the runtime refuses independently:
a job that reaches the Python process with a licence status the catalog does not clear is
blocked here too. Defence in depth matters because the runtime can also be driven directly
during development, and a second gate is cheaper than a leaked non-commercial checkpoint.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

RUNTIME_ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = RUNTIME_ROOT.parent.parent
CATALOG_PATH = PROJECT_ROOT / "data" / "models" / "registry" / "catalog.json"

NEVER_COMMERCIAL = {"preview_only", "research_only", "legal_review_required", "blocked", "unknown"}


@dataclass
class LicenseVerdict:
    modelId: str
    allowed: bool
    status: str
    reasonCodes: List[str] = field(default_factory=list)
    humanReason: str = ""
    commercialBuild: bool = True
    studioRegion: Optional[str] = None
    decidedAt: str = ""

    def to_dict(self) -> Dict[str, object]:
        return self.__dict__.copy()


class LicenseGuard:
    def __init__(self, catalog_path: Optional[Path] = None):
        self.catalog_path = catalog_path or CATALOG_PATH
        self._entries: Dict[str, dict] = {}
        self._load()

    def _load(self) -> None:
        if not self.catalog_path.is_file():
            # No catalog means nothing is cleared. Absence is never treated as permission.
            self._entries = {}
            return
        raw = json.loads(self.catalog_path.read_text(encoding="utf-8"))
        self._entries = {m["modelId"]: m for m in raw.get("models", [])}

    @property
    def commercial_build(self) -> bool:
        return os.environ.get("COMMERCIAL_BUILD", "true").lower() != "false"

    @property
    def studio_region(self) -> Optional[str]:
        raw = os.environ.get("STUDIO_REGION", "").strip()
        return raw.upper() or None

    @property
    def allow_legal_review_pending(self) -> bool:
        """Narrow escape hatch for *running* a model whose licence review is still open.

        It is unreadable unless the build is explicitly non-commercial, it never applies to
        packaging, and every decision it relaxes records LICENSE_REVIEW_PENDING_OVERRIDDEN so
        the evidence shows that a human chose to evaluate an uncleared model.
        """
        return (not self.commercial_build) and os.environ.get("ALLOW_LEGAL_REVIEW_PENDING", "false").lower() == "true"

    def evaluate(self, model_id: str, *, use: str = "inference") -> LicenseVerdict:
        now = datetime.now(timezone.utc).isoformat()
        entry = self._entries.get(model_id)
        if entry is None:
            return LicenseVerdict(
                modelId=model_id,
                allowed=False,
                status="unknown",
                reasonCodes=["MODEL_NOT_IN_CATALOG"],
                humanReason="model is not present in catalog.json; an unregistered model is refused, not assumed clear",
                commercialBuild=self.commercial_build,
                studioRegion=self.studio_region,
                decidedAt=now,
            )

        license_record = entry.get("license", {})
        status = license_record.get("status", "unknown")
        reasons: List[str] = []
        human: List[str] = []

        if status == "blocked":
            reasons.append("LICENSE_STATUS_BLOCKED")
            human.append("catalog marks this model blocked")
        if status == "unknown":
            reasons.append("LICENSE_STATUS_UNKNOWN")
            human.append("licence status unknown")
        overrides: List[str] = []
        if status == "legal_review_required":
            if self.allow_legal_review_pending and use in {"inference", "preview"}:
                overrides.append("LICENSE_REVIEW_PENDING_OVERRIDDEN")
            else:
                reasons.append("LICENSE_REVIEW_PENDING")
                human.append("licence not yet read and signed off")
        if status == "research_only" and os.environ.get("ALLOW_RESEARCH_MODELS", "false").lower() != "true":
            reasons.append("LICENSE_RESEARCH_ONLY")
            human.append("research-only model and ALLOW_RESEARCH_MODELS is not set")

        if self.commercial_build and status in NEVER_COMMERCIAL:
            if not (status == "preview_only" and use == "preview"):
                reasons.append("COMMERCIAL_BUILD_REQUIRES_CLEARED_LICENSE")
                human.append(f"COMMERCIAL_BUILD=true and status is {status}")

        territories = license_record.get("territorialRestrictions") or []
        if territories:
            if self.studio_region is None:
                reasons.append("STUDIO_REGION_UNDECLARED")
                human.append("territorially restricted licence with no declared STUDIO_REGION")
            elif self.studio_region not in [t.upper() for t in territories]:
                reasons.append("TERRITORY_NOT_PERMITTED")
                human.append(f"STUDIO_REGION={self.studio_region} not permitted")

        allowed = not reasons
        if allowed and overrides:
            human = ["allowed for technical evaluation only: licence review is still pending and "
                     "ALLOW_LEGAL_REVIEW_PENDING was set in a non-commercial build"]
        return LicenseVerdict(
            modelId=model_id,
            allowed=allowed,
            status=status,
            reasonCodes=overrides if allowed else reasons,
            humanReason=("; ".join(human) if (not allowed or overrides) else "all licence gates satisfied"),
            commercialBuild=self.commercial_build,
            studioRegion=self.studio_region,
            decidedAt=now,
        )

    def catalog_entry(self, model_id: str) -> Optional[dict]:
        return self._entries.get(model_id)

    def expected_weights(self, model_id: str) -> List[dict]:
        entry = self._entries.get(model_id)
        return list(entry.get("weightsFiles", [])) if entry else []
