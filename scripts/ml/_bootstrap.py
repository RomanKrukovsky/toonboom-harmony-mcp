"""Shared path bootstrap for the scripts/ml/* tools.

Every script here must run from any working directory and without the package being installed,
so the repository root and the relevant service directories are put on sys.path explicitly
rather than relying on the caller's cwd.
"""

from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
ML_RUNTIME = PROJECT_ROOT / "services" / "ml-runtime"
ML_CORE = PROJECT_ROOT / "services" / "ml-core"
CATALOG_PATH = PROJECT_ROOT / "data" / "models" / "registry" / "catalog.json"
CATALOG_SCHEMA_PATH = PROJECT_ROOT / "data" / "models" / "registry" / "catalog.schema.json"
LOCAL_STATE_PATH = PROJECT_ROOT / "data" / "models" / "registry" / "local-state.json"


def add_paths() -> None:
    for path in (ML_RUNTIME, ML_CORE, PROJECT_ROOT):
        text = str(path)
        if text not in sys.path:
            sys.path.insert(0, text)


add_paths()
