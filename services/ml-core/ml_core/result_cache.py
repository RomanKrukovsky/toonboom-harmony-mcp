"""Content-addressed result cache for ML jobs.

Animators re-run the same clip repeatedly while iterating, and every run
previously re-decoded the video and re-ran inference from scratch — the
`cacheHit` field in the API response was hardcoded to `False` because no cache
existed at all.

The cache key is derived from what actually determines the result:

    sha256(input file bytes) + task + modelId + sorted(parameters)

Hashing content rather than the path means a renamed or copied file still hits,
while an edited file with the same name correctly misses. Entries record the
input digest so a stale entry can never be served for changed input.
"""

import hashlib
import json
import os
import time
from pathlib import Path
from typing import Any, Dict, Optional

from .config import CACHE_ROOT

CACHE_DIR = CACHE_ROOT / "results"
# Read in chunks: an input video can be far larger than RAM.
HASH_CHUNK = 1 << 20
# Cache format version. Bump to invalidate every entry after a provider change
# that alters output shape or semantics.
CACHE_SCHEMA_VERSION = "1"


def file_digest(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(HASH_CHUNK), b""):
            digest.update(chunk)
    return digest.hexdigest()


def compute_key(
    input_path: Path,
    task: str,
    model_id: Optional[str] = None,
    params: Optional[Dict[str, Any]] = None,
) -> Dict[str, str]:
    """Return {key, inputDigest} for a job."""
    input_digest = file_digest(input_path)
    # Sort params so key order never matters.
    canonical_params = json.dumps(params or {}, sort_keys=True, separators=(",", ":"))
    material = "|".join(
        [CACHE_SCHEMA_VERSION, task, model_id or "", input_digest, canonical_params]
    )
    return {
        "key": hashlib.sha256(material.encode("utf-8")).hexdigest(),
        "inputDigest": input_digest,
    }


def _entry_path(key: str) -> Path:
    # Two-level fan-out keeps directory sizes sane over thousands of entries.
    return CACHE_DIR / key[:2] / f"{key}.json"


def lookup(
    input_path: Path,
    task: str,
    model_id: Optional[str] = None,
    params: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    """Return a cached result, or None on miss.

    A corrupt or mismatched entry is treated as a miss rather than an error: a
    cache must never be able to break a pipeline.
    """
    try:
        identity = compute_key(input_path, task, model_id, params)
    except OSError:
        return None

    path = _entry_path(identity["key"])
    if not path.is_file():
        return None

    try:
        entry = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None

    # Defence in depth: the key already covers the digest, but verify explicitly
    # so a hash collision or hand-edited file cannot serve the wrong result.
    if entry.get("inputDigest") != identity["inputDigest"]:
        return None
    if entry.get("cacheSchemaVersion") != CACHE_SCHEMA_VERSION:
        return None

    return entry.get("result")


def store(
    input_path: Path,
    task: str,
    result: Dict[str, Any],
    model_id: Optional[str] = None,
    params: Optional[Dict[str, Any]] = None,
) -> Optional[str]:
    """Persist a result. Returns the cache key, or None when caching is impossible.

    Only genuine inference is cached: storing a degraded or simulated result would
    make the degradation sticky long after the missing dependency was installed.
    """
    if result.get("realInferenceExecuted") is False:
        return None

    try:
        identity = compute_key(input_path, task, model_id, params)
    except OSError:
        return None

    path = _entry_path(identity["key"])
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "cacheSchemaVersion": CACHE_SCHEMA_VERSION,
            "task": task,
            "modelId": model_id,
            "inputDigest": identity["inputDigest"],
            "inputPath": str(input_path),
            "params": params or {},
            "storedAt": time.time(),
            "result": result,
        }
        # Atomic write: a crash mid-write must not leave a truncated entry that
        # later reads as valid JSON.
        tmp = path.with_suffix(".tmp")
        tmp.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        os.replace(tmp, path)
        return identity["key"]
    except OSError:
        return None


def stats() -> Dict[str, Any]:
    """Entry count and total size on disk."""
    if not CACHE_DIR.is_dir():
        return {"entries": 0, "sizeBytes": 0, "path": str(CACHE_DIR)}
    entries = list(CACHE_DIR.rglob("*.json"))
    return {
        "entries": len(entries),
        "sizeBytes": sum(p.stat().st_size for p in entries),
        "path": str(CACHE_DIR),
    }


def clear() -> int:
    """Delete every entry. Returns how many were removed."""
    if not CACHE_DIR.is_dir():
        return 0
    removed = 0
    for path in CACHE_DIR.rglob("*.json"):
        try:
            path.unlink()
            removed += 1
        except OSError:
            continue
    return removed
