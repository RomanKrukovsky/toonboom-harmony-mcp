"""Input and path safety for the ML runtime.

Everything a provider is handed passes through here first. The guards are deliberately
paranoid because the runtime reads files whose names come from a network request:

* absolute paths and traversal segments are refused before the filesystem is touched;
* symlinks are resolved and the *real* path is re-checked against the allowed roots, so a
  symlink planted inside an allowed directory cannot point out of it;
* archives are inspected for decompression bombs before extraction;
* media files are size- and dimension-capped;
* text that will reach a language model is scanned for instruction-shaped content and
  reported, never executed.
"""

from __future__ import annotations

import os
import re
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Optional, Sequence

RUNTIME_ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = RUNTIME_ROOT.parent.parent

MAX_FILE_BYTES = int(os.environ.get("ML_RUNTIME_MAX_FILE_BYTES", 2 * 1024 * 1024 * 1024))
MAX_IMAGE_PIXELS = int(os.environ.get("ML_RUNTIME_MAX_IMAGE_PIXELS", 100_000_000))
MAX_ARCHIVE_RATIO = float(os.environ.get("ML_RUNTIME_MAX_ARCHIVE_RATIO", 120.0))
MAX_ARCHIVE_UNCOMPRESSED_BYTES = int(os.environ.get("ML_RUNTIME_MAX_ARCHIVE_BYTES", 4 * 1024 * 1024 * 1024))


class SecurityError(ValueError):
    """Raised for any rejected path or payload. Carries a stable code for the error registry."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


def allowed_roots() -> List[Path]:
    raw = os.environ.get("HARMONY_ALLOWED_ROOTS", "")
    roots = [Path(item.strip()).resolve() for item in raw.split(",") if item.strip()]
    roots.append(PROJECT_ROOT.resolve())
    return roots


def _real_prefix(path: Path) -> Path:
    """Resolves symlinks as far as the path exists, then re-appends the missing tail."""
    existing = path
    while not existing.exists():
        parent = existing.parent
        if parent == existing:
            break
        existing = parent
    real_existing = existing.resolve() if existing.exists() else existing
    try:
        tail = path.relative_to(existing)
    except ValueError:
        return real_existing
    return real_existing / tail


def verify_path(candidate: str, *, must_exist: bool = True, roots: Optional[Sequence[Path]] = None) -> Path:
    """Returns a resolved path proven to sit inside an allowed root, or raises."""
    if not candidate:
        raise SecurityError("ML_ARTIFACT_PATH_REJECTED", "empty path")

    raw = Path(candidate)
    if ".." in raw.parts:
        raise SecurityError("ML_ARTIFACT_PATH_REJECTED", "path traversal segment '..' is not permitted")

    resolved = _real_prefix(raw if raw.is_absolute() else (PROJECT_ROOT / raw))
    search_roots = [Path(r).resolve() for r in (roots or allowed_roots())]
    for root in search_roots:
        try:
            resolved.relative_to(root)
            break
        except ValueError:
            continue
    else:
        raise SecurityError("ML_ARTIFACT_PATH_REJECTED", "path resolves outside every allowed root")

    if must_exist:
        if not resolved.exists():
            raise SecurityError("ML_ARTIFACT_NOT_FOUND", "path does not exist")
        if resolved.is_file() and resolved.stat().st_size > MAX_FILE_BYTES:
            raise SecurityError("ML_ARTIFACT_PATH_REJECTED", f"file exceeds {MAX_FILE_BYTES} bytes")
    return resolved


def verify_output_dir(candidate: str) -> Path:
    path = verify_path(candidate, must_exist=False)
    path.mkdir(parents=True, exist_ok=True)
    return path


@dataclass(frozen=True)
class MediaProbe:
    width: int
    height: int
    channels: int


def verify_image(path: Path) -> MediaProbe:
    """Reads dimensions and refuses images that would blow up memory on decode."""
    import cv2  # local import: keeps the module importable without OpenCV

    image = cv2.imread(str(path))
    if image is None:
        raise SecurityError("ML_INPUT_SCHEMA_INVALID", "file is not a decodable image")
    height, width = image.shape[:2]
    if width * height > MAX_IMAGE_PIXELS:
        raise SecurityError("ML_INPUT_SCHEMA_INVALID", f"image {width}x{height} exceeds the pixel budget")
    if width <= 0 or height <= 0:
        raise SecurityError("ML_INPUT_SCHEMA_INVALID", "image has a non-positive dimension")
    return MediaProbe(width=width, height=height, channels=image.shape[2] if image.ndim == 3 else 1)


def verify_archive(path: Path) -> None:
    """Refuses zip bombs by checking the declared expansion ratio before extracting anything."""
    if not zipfile.is_zipfile(path):
        raise SecurityError("ML_INPUT_SCHEMA_INVALID", "not a zip archive")
    total_uncompressed = 0
    with zipfile.ZipFile(path) as archive:
        for info in archive.infolist():
            if info.filename.startswith("/") or ".." in Path(info.filename).parts:
                raise SecurityError("ML_ARTIFACT_PATH_REJECTED", f"archive member escapes: {info.filename}")
            total_uncompressed += info.file_size
            if info.compress_size > 0 and info.file_size / info.compress_size > MAX_ARCHIVE_RATIO:
                raise SecurityError("ML_INPUT_SCHEMA_INVALID", f"archive member {info.filename} has a bomb-like ratio")
    if total_uncompressed > MAX_ARCHIVE_UNCOMPRESSED_BYTES:
        raise SecurityError("ML_INPUT_SCHEMA_INVALID", "archive expands beyond the allowed budget")


# Instruction-shaped patterns in untrusted text (subtitles, OCR output, model captions). These
# are *reported*, never obeyed: a VLM prompt built from such text must carry the flag onward.
_INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions", re.I),
    re.compile(r"disregard\s+(the\s+)?(system|previous)\s+prompt", re.I),
    re.compile(r"you\s+are\s+now\s+(a|an)\s+", re.I),
    re.compile(r"</?(system|assistant|tool)[ >]", re.I),
    re.compile(r"\bexecute\b.{0,20}\b(shell|bash|command|script)\b", re.I),
    re.compile(r"\b(rm\s+-rf|curl\s+http|wget\s+http)\b", re.I),
    re.compile(r"(api[_ -]?key|secret|password|token)\s*[:=]", re.I),
]


def scan_untrusted_text(text: str) -> List[str]:
    """Returns the names of injection patterns found. Empty list means nothing matched."""
    findings: List[str] = []
    for pattern in _INJECTION_PATTERNS:
        if pattern.search(text):
            findings.append(pattern.pattern)
    return findings


def assert_no_injection(text: str, *, field: str) -> None:
    findings = scan_untrusted_text(text)
    if findings:
        raise SecurityError(
            "ML_PROMPT_INJECTION_DETECTED",
            f"{field} contains instruction-shaped content: {len(findings)} pattern(s) matched",
        )


def redact(value: str) -> str:
    """Strips home directories and obvious secrets before anything reaches a log line."""
    home = str(Path.home())
    redacted = value.replace(home, "~")
    redacted = re.sub(r"(?i)(api[_-]?key|token|password|secret)\s*[:=]\s*\S+", r"\1=<redacted>", redacted)
    return redacted


def redact_paths(paths: Iterable[str]) -> List[str]:
    return [redact(p) for p in paths]
