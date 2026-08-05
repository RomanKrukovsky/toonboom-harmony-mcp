"""Content-addressed artifact store for the Python runtime.

Binary payloads never travel inside JSON. A provider receives artifact *references* and
resolves them here; every read re-hashes the file, so a swapped or truncated input is a hard
error instead of a quietly different result.
"""

from __future__ import annotations

import hashlib
import json
import mimetypes
import os
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from .security import SecurityError, verify_path

RUNTIME_ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = RUNTIME_ROOT.parent.parent


def artifact_root() -> Path:
    raw = os.environ.get("HARMONY_ARTIFACT_ROOT")
    return Path(raw).resolve() if raw else (PROJECT_ROOT / "artifacts")


@dataclass
class ArtifactReference:
    artifactId: str
    sha256: str
    sizeBytes: int
    mimeType: str
    relativePath: str
    role: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


class ArtifactStore:
    def __init__(self, root: Optional[Path] = None):
        self.root = Path(root) if root else artifact_root()

    def namespace_dir(self, namespace: str) -> Path:
        if "/" in namespace or ".." in namespace:
            raise SecurityError("ML_ARTIFACT_PATH_REJECTED", f"illegal namespace {namespace!r}")
        return self.root / namespace

    def resolve(self, namespace: str, relative_path: str) -> Path:
        base = self.namespace_dir(namespace)
        base.mkdir(parents=True, exist_ok=True)
        if Path(relative_path).is_absolute():
            raise SecurityError("ML_ARTIFACT_PATH_REJECTED", "artifact paths must be store-relative")
        return verify_path(str(base / relative_path), must_exist=False, roots=[base])

    def put_bytes(self, namespace: str, relative_path: str, data: bytes, role: str, mime_type: Optional[str] = None) -> ArtifactReference:
        target = self.resolve(namespace, relative_path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        digest = hashlib.sha256(data).hexdigest()
        return ArtifactReference(
            artifactId=f"art_{digest[:24]}",
            sha256=digest,
            sizeBytes=len(data),
            mimeType=mime_type or mimetypes.guess_type(target.name)[0] or "application/octet-stream",
            relativePath=relative_path.replace(os.sep, "/"),
            role=role,
        )

    def put_json(self, namespace: str, relative_path: str, value: Any, role: str) -> ArtifactReference:
        payload = json.dumps(value, indent=2, ensure_ascii=False).encode("utf-8")
        return self.put_bytes(namespace, relative_path, payload, role, "application/json")

    def register(self, namespace: str, relative_path: str, role: str, mime_type: Optional[str] = None) -> ArtifactReference:
        """Measures a file a provider already wrote, rather than trusting a reported digest."""
        target = self.resolve(namespace, relative_path)
        if not target.is_file():
            raise SecurityError("ML_ARTIFACT_NOT_FOUND", f"no artifact at {relative_path}")
        return ArtifactReference(
            artifactId=f"art_{sha256_file(target)[:24]}",
            sha256=sha256_file(target),
            sizeBytes=target.stat().st_size,
            mimeType=mime_type or mimetypes.guess_type(target.name)[0] or "application/octet-stream",
            relativePath=relative_path.replace(os.sep, "/"),
            role=role,
        )

    def read_verified(self, namespace: str, reference: Dict[str, Any]) -> bytes:
        target = self.resolve(namespace, reference["relativePath"])
        if not target.is_file():
            raise SecurityError("ML_ARTIFACT_NOT_FOUND", f"artifact {reference.get('artifactId')} is missing")
        data = target.read_bytes()
        actual = hashlib.sha256(data).hexdigest()
        if actual != reference["sha256"]:
            raise SecurityError(
                "ML_ARTIFACT_HASH_MISMATCH",
                f"artifact {reference.get('artifactId')}: expected {reference['sha256']}, measured {actual}",
            )
        return data

    def resolve_input(self, reference: Dict[str, Any], namespace: str = "ml-jobs") -> Path:
        """Verifies an input artifact and returns its path for providers that read from disk."""
        target = self.resolve(namespace, reference["relativePath"])
        if not target.is_file():
            raise SecurityError("ML_ARTIFACT_NOT_FOUND", f"artifact {reference.get('artifactId')} is missing")
        actual = sha256_file(target)
        if actual != reference["sha256"]:
            raise SecurityError(
                "ML_ARTIFACT_HASH_MISMATCH",
                f"artifact {reference.get('artifactId')}: expected {reference['sha256']}, measured {actual}",
            )
        return target

    def write_manifest(self, namespace: str, relative_path: str, entries: List[ArtifactReference], producer: str) -> ArtifactReference:
        payload = {
            "schemaVersion": "1.0",
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "producer": producer,
            "artifacts": [e.to_dict() for e in entries],
        }
        return self.put_json(namespace, relative_path, payload, "artifact_manifest")
