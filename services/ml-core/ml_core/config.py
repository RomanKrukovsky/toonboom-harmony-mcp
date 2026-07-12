import os
from pathlib import Path

# Paths
ROOT_DIR = Path(__file__).resolve().parents[3]
DATA_ROOT = Path(os.environ.get("ML_DATA_ROOT", ROOT_DIR / "data")).resolve()
MODEL_ROOT = Path(os.environ.get("ML_MODEL_ROOT", DATA_ROOT / "models")).resolve()
CACHE_ROOT = Path(os.environ.get("ML_CACHE_ROOT", ROOT_DIR / "output" / "ml_cache")).resolve()

# Allowlisted paths for safety
ALLOWED_ROOTS_RAW = os.environ.get("HARMONY_ALLOWED_ROOTS", "")
ALLOWED_ROOTS = [Path(item.strip()).resolve() for item in ALLOWED_ROOTS_RAW.split(",") if item.strip()]
# Add project root and cache roots to allowed roots
ALLOWED_ROOTS.append(ROOT_DIR)
ALLOWED_ROOTS.append(CACHE_ROOT)
ALLOWED_ROOTS.append(DATA_ROOT)

def verify_path_access(path_str: str) -> Path:
    p = Path(path_str).resolve()
    # Check if path is within any allowed root
    for allowed in ALLOWED_ROOTS:
        try:
            if p == allowed or allowed in p.parents:
                return p
        except ValueError:
            pass
    raise ValueError(f"Access denied to path: {path_str} (outside allowed roots)")

# Remote GPU Worker
ALLOW_REMOTE_GPU = os.environ.get("ML_ALLOW_REMOTE_GPU", "false").lower() == "true"
REMOTE_GPU_URL = os.environ.get("ML_REMOTE_GPU_URL", "")
REMOTE_GPU_TOKEN = os.environ.get("ML_REMOTE_GPU_TOKEN", "")

# Limits
DOWNLOAD_BUDGET_GB = float(os.environ.get("ML_DOWNLOAD_BUDGET_GB", "20"))
