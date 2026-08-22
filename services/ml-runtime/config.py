import logging
import os

import yaml

logger = logging.getLogger(__name__)

# Дефолт не должен зависеть от CWD: считаем путь от расположения этого файла
# (services/ml-runtime/config.py -> <repo>/config/ml-models.example.yaml).
_DEFAULT_CONFIG_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "config",
    "ml-models.example.yaml",
)


def load_config(path: str | None = None) -> dict:
    resolved = path or os.environ.get("ML_RUNTIME_CONFIG") or _DEFAULT_CONFIG_PATH
    try:
        with open(resolved, "r") as f:
            return yaml.safe_load(f) or {"models": {}}
    except FileNotFoundError:
        logger.warning("ml-runtime config not found at %s; using empty model map", resolved)
        return {"models": {}}
    except Exception:
        logger.exception("Failed to load ml-runtime config from %s; using empty model map", resolved)
        return {"models": {}}


CONFIG = load_config()

# --- Path allowlist (same contract as ml-core/config.py) ---
# Пути на запись/чтение из запросов ограничены корнем репозитория, либо
# явным списком из ML_RUNTIME_ALLOWED_ROOTS (разделитель — двоеточие/точка с запятой).
from pathlib import Path  # noqa: E402

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent

def _parse_allowed_roots() -> list:
    raw = os.environ.get("ML_RUNTIME_ALLOWED_ROOTS", "")
    roots = [Path(p).resolve() for p in raw.replace(";", ":").split(":") if p.strip()]
    return roots or [_REPO_ROOT]

ALLOWED_ROOTS = _parse_allowed_roots()


def verify_path_access(path_str: str) -> Path:
    p = Path(path_str).resolve()
    for allowed in ALLOWED_ROOTS:
        if p == allowed or allowed in p.parents:
            return p
    raise ValueError(f"Access denied to path: {path_str} (outside allowed roots)")
