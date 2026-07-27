"""
Sprint 1 — Face landmarker provider tests.

These tests prove the blocked semantics: when the MediaPipe `.task` weights or the
mediapipe package are absent, the provider returns an honest blocked sequence rather than
fabricating one landmark, one blendshape coefficient, or one timestamp.

They can never claim real inference by construction, because no `.task` file ships with
the repository.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

RUNTIME_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = RUNTIME_ROOT.parent.parent
sys.path.insert(0, str(RUNTIME_ROOT))

from pipelines.face_performance_schema import (  # noqa: E402
    FACE_BLENDSHAPE_NAMES,
    FACE_PERFORMANCE_SCHEMA_VERSION,
    FacePerformanceSequence,
)
from providers.face_landmarker_provider import (  # noqa: E402
    DEFAULT_TASK_PATH,
    track_face_performance,
)


def _has_task_file() -> bool:
    return DEFAULT_TASK_PATH.exists()


def test_blocked_when_video_file_missing():
    seq = track_face_performance(Path("does/not/exist.mp4"))
    assert isinstance(seq, FacePerformanceSequence)
    assert seq.schemaVersion == FACE_PERFORMANCE_SCHEMA_VERSION
    assert seq.sourceKind == "blocked"
    assert seq.provenance.realInferenceExecuted is False
    assert seq.frames == []
    assert seq.analyzedFrames == 0
    assert seq.framesWithFace == 0
    assert seq.sourceWidth == 0
    assert seq.sourceHeight == 0
    assert seq.sourcePath is None
    assert seq.provenance.modelSha256 is None
    assert seq.warnings, "blocked sequence must declare the blocking reason"


def test_blendshape_name_table_matches_mediapipe():
    # 52 canonical blendshape names (the _neutral entry plus 51 expression categories).
    assert len(FACE_BLENDSHAPE_NAMES) == 52
    assert FACE_BLENDSHAPE_NAMES[0] == "_neutral"
    assert "eyeBlinkLeft" in FACE_BLENDSHAPE_NAMES
    assert "mouthSmileLeft" in FACE_BLENDSHAPE_NAMES
    assert "noseSneerRight" in FACE_BLENDSHAPE_NAMES
    # No duplicates.
    assert len(set(FACE_BLENDSHAPE_NAMES)) == len(FACE_BLENDSHAPE_NAMES)


def test_blocked_sequence_has_no_absolute_user_paths():
    seq = track_face_performance(Path("does/not/exist.mp4"))
    blob = seq.model_dump_json()
    assert "/Users/" not in blob
    assert "/home/" not in blob


def test_blocked_when_weights_absent_and_video_exists(tmp_path, monkeypatch):
    # Build a tiny "video" file so the only blocker is the task file path.
    video = tmp_path / "clip.mp4"
    video.write_bytes(b"\x00\x00\x00\x20ftypmp42")

    monkeypatch.delenv("HARMONY_FACE_LANDMARKER_TASK", raising=False)
    if _has_task_file():
        pytest.skip("MediaPipe face_landmarker.task is present in this checkout; blocked path unavailable here.")
    seq = track_face_performance(video)
    assert seq.sourceKind == "blocked"
    assert seq.provenance.realInferenceExecuted is False
    assert "face_landmarker.task" in seq.warnings[0]
    assert "weights/mediapipe" in seq.warnings[0]