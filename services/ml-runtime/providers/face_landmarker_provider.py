"""
Sprint 1 — MediaPipe Face Landmarker provider (video mode).

P0 production face provider per the project capability roadmap. The provider is written
strictly: it yields real model output *only* when the official FaceLandmarker `.task` model
file is present and the `mediapipe` package is importable; on every other path it returns
an honest `blocked` sequence with realInferenceExecuted=False, the exact reason and the
model-task file name, and NOTHING is written or fabricated.

Honesty rules enforced:

  * No fake blendshape coefficients. A blocked sequence has zero entries, not 52 zero
    rows that look like real model output.
  * No fake landmarks. A blocked sequence has zero landmark entries.
  * No placeholder timestamps. A blocked sequence has zero frames and analyzedFrames=0.
  * The model file's SHA-256 is recorded in provenance when a run succeeded; null on
    the blocked path.
  * The model is resolved via a repo-relative path; never an absolute /Users/... path.
    The default location is services/ml-runtime/weights/mediapipe/face_landmarker.task
    but the caller may override it with HARMONY_FACE_LANDMARKER_TASK.

The provider never raises on missing weights/packages; it returns blocked, so callers
(test harness, MCP tool, registry promotion) can drive it safely in any environment.
"""

from __future__ import annotations

import datetime
import hashlib
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from pipelines.face_performance_schema import (  # noqa: E402
    FACE_BLENDSHAPE_NAMES,
    FaceBlendshapeSample,
    FaceLandmarkPoint,
    FacePerformanceFrame,
    FacePerformanceSequence,
    Provenance,
    blocked_sequence,
)

logger = logging.getLogger("ml-runtime.face_landmarker")

# Repo-relative weight location. We never embed the resolved absolute path in warnings or
# evidence so the bundle stays portable; callers see
# services/ml-runtime/weights/mediapipe/face_landmarker.task regardless of checkout path.
_REPO_RELATIVE_WEIGHTS_DIR = "services/ml-runtime/weights/mediapipe"
WEIGHTS_ROOT = Path(__file__).resolve().parent.parent / "weights" / "mediapipe"
DEFAULT_MODEL_TASK = "face_landmarker.task"
DEFAULT_TASK_PATH = WEIGHTS_ROOT / DEFAULT_MODEL_TASK


def _repo_relative_task_path(path: Path) -> str:
    """Render a task path so the candidate a user has to populate is repo-relative when it
    lives under the checkout, and only falls back to the absolute path for out-of-tree
    overrides."""
    try:
        rel = path.relative_to(REPO_ROOT_FALLBACK)
        return rel.as_posix()
    except ValueError:
        return str(path)


# Best-effort repo root = 3 levels above this file (providers -> ml-runtime -> services -> repo).
REPO_ROOT_FALLBACK = Path(__file__).resolve().parents[3]


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _env_task_path() -> Optional[Path]:
    raw = os.environ.get("HARMONY_FACE_LANDMARKER_TASK")
    if not raw:
        return None
    candidate = Path(raw).expanduser()
    if not candidate.is_absolute():
        candidate = (Path.cwd() / candidate).resolve()
    return candidate


def resolve_model_task() -> Tuple[Optional[Path], str, Optional[str]]:
    """
    Find the FaceLandmarker model-task file. Returns (path_or_None, failure_reason, sha256).

    A None path is the honest signal that no inference can run. The reason is the exact
    requirement that an operator must satisfy; a caller may surface it verbatim.
    """
    candidate = _env_task_path() or DEFAULT_TASK_PATH

    if not candidate.exists():
        return None, (
            f"MediaPipe FaceLandmarker model task file not found at "
            f"{_repo_relative_task_path(candidate)}. "
            "Download face_landmarker.task from "
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task "
            "and place it under services/ml-runtime/weights/mediapipe/, or set "
            "HARMONY_FACE_LANDMARKER_TASK to an absolute path."
        ), None

    return candidate, "", _sha256(candidate)


def _import_mediapipe():
    """Import mediapipe lazily so the module still loads in environments without it."""
    try:
        from mediapipe.tasks.python.vision.face_landmarker import (
            FaceLandmarker,
            FaceLandmarkerOptions,
        )
        from mediapipe.tasks.python.vision import RunningMode
        return FaceLandmarker, FaceLandmarkerOptions, RunningMode
    except Exception as exc:  # pragma: no cover - exercised by tests via stubs
        return None, None, None, exc  # type: ignore[return-value]


def _blocked(reason: str, task_name: str) -> FacePerformanceSequence:
    return blocked_sequence(reason=reason, model_task=task_name, created_at=_now_utc_iso())


def _now_utc_iso() -> str:
    # timezone-aware UTC ISO timestamp; avoids the deprecated datetime.utcnow().
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def _now_utc_epoch() -> float:
    return datetime.datetime.now(datetime.timezone.utc).timestamp()


def track_face_performance(video_path: Path, num_frames: Optional[int] = None) -> FacePerformanceSequence:
    """
    Run the Face Landmarker over a video. Returns a FacePerformanceSequence.

    On every blocked path (missing weights, missing mediapipe, unreadable clip) the return
    is a blocked_sequence with realInferenceExecuted=False; NOTHING is fabricated.
    """
    task_path, reason, task_sha = resolve_model_task()
    task_name = task_path.name if task_path else DEFAULT_MODEL_TASK

    if task_path is None:
        logger.info("face_landmarker blocked: %s", reason)
        return _blocked(reason, task_name)

    mediapipe_import = _import_mediapipe()
    if len(mediapipe_import) == 4:
        # mediapipe is not installed. Honest blocked; do NOT pretend we ran the model.
        _, _, _, err = mediapipe_import
        msg = f"mediapipe package is not importable: {err}. Install mediapipe>=0.10 to run face performance."
        logger.info("face_landmarker blocked: %s", msg)
        return _blocked(msg, task_name)

    FaceLandmarker, FaceLandmarkerOptions, RunningMode = mediapipe_import  # type: ignore[misc]

    if not video_path.exists():
        msg = f"video not found: {video_path}"
        logger.info("face_landmarker blocked: %s", msg)
        return _blocked(msg, task_name)

    # Defer cv2 import to keep the blocked path side-effect free of heavy deps.
    import cv2  # noqa: WPS433

    options = FaceLandmarkerOptions(
        base_options=__detach_base_options(task_path),
        running_mode=RunningMode.VIDEO,
        num_faces=1,
    )

    frames: List[FacePerformanceFrame] = []
    frames_with_face = 0
    width = 0
    height = 0

    with FaceLandmarker.create_from_options(options) as landmarker:  # pragma: no cover - requires model
        cap = cv2.VideoCapture(str(video_path))
        try:
            if not cap.isOpened():
                msg = f"could not open video {video_path}"
                logger.info("face_landmarker blocked: %s", msg)
                return _blocked(msg, task_name)

            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
            start_ms = 0
            frame_index = 0

            while True:
                ok, frame = cap.read()
                if not ok:
                    break
                if num_frames is not None and frame_index >= num_frames:
                    break
                ts_ms = max(start_ms + int(frame_index * 1000.0 / fps), 0)
                mp_image = __cv2_to_mediapipe(frame)
                t0 = _now_utc_epoch()
                result = landmarker.detect_for_video(mp_image, ts_ms)
                dt = (_now_utc_epoch() - t0) * 1000.0
                fr = __frame_from_result(result, frame_index, ts_ms, dt)
                if fr.landmarks:
                    frames_with_face += 1
                frames.append(fr)
                frame_index += 1
        finally:
            cap.release()  # pragma: no cover

    provenance = Provenance(
        engine="mediapipe_face_landmarker",
        modelTask=task_name,
        modelSha256=task_sha,
        realInferenceExecuted=True,
        runnerVersion="1.0.0",
        createdAt=_now_utc_iso(),
    )
    return FacePerformanceSequence(
        schemaVersion="1.0.0",
        sourceKind="video",
        sourcePath=str(video_path),
        sourceWidth=width,
        sourceHeight=height,
        analyzedFrames=len(frames),
        framesWithFace=frames_with_face,
        frames=frames,
        warnings=[],
        provenance=provenance,
    )  # pragma: no cover - executed only with a model installed


def __detach_base_options(task_path: Path):  # pragma: no cover
    # mediapipe provides BaseOptions(model_asset_path=...). We keep this thin wrapper so
    # the lazy import surface above stays readable and the model path is always a Path.
    from mediapipe.tasks.python import BaseOptions
    return BaseOptions(model_asset_path=str(task_path))


def __cv2_to_mediapipe(frame):  # pragma: no cover - exercised only with a model installed
    from mediapipe import Image
    from mediapipe.tasks.python.vision import RunningMode  # noqa: F401
    import numpy as np
    return Image(image_format=__guess_image_format(frame), data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))  # type: ignore[arg-type]


def __guess_image_format(frame):  # pragma: no cover
    from mediapipe.tasks.python.components.containers.image import ImageFormat
    return ImageFormat.SRGB


def __frame_from_result(result, frame_index: int, ts_ms: int, dt_ms: float) -> FacePerformanceFrame:
    """Translate one FaceLandmarkerResult into a schema-valid FacePerformanceFrame.

    When no face was detected the result's face_landmarks/face_blendshapes/
    facial_transformation_matrixes are empty. The frame is still recorded (analysed frames
    > framesWithFace) but carries empty landmarks, empty blendshapes and empty matrix.
    """
    warnings: List[str] = []
    landmarks: List[FaceLandmarkPoint] = []
    blendshapes: List[FaceBlendshapeSample] = []
    matrix: List[float] = []

    no_faces = not result.face_landmarks
    if no_faces:
        warnings.append("no_face_detected")
    else:
        face = result.face_landmarks[0]
        for index, lm in enumerate(face):
            observed = bool(lm.presence) and (lm.presence > 0.0)
            landmarks.append(
                FaceLandmarkPoint(
                    index=index,
                    x=float(lm.x),
                    y=float(lm.y),
                    z=float(lm.z),
                    presence=float(lm.presence),
                    observed=observed,
                )
            )
        if result.face_blendshapes and result.face_blendshapes[0].categories is not None:
            cats = result.face_blendshapes[0].categories
            for cat in cats:
                name = str(cat.category_name)
                blendshapes.append(FaceBlendshapeSample(name=name, value=float(cat.score)))
        else:
            warnings.append("blendshapes_missing")
        if result.facial_transformation_matrixes:
            mat = result.facial_transformation_matrixes[0].data
            matrix = [float(x) for x in (mat or [])]
        else:
            warnings.append("transformation_matrix_missing")

    return FacePerformanceFrame(
        frameIndex=frame_index,
        timestampMs=ts_ms,
        landmarks=landmarks,
        blendshapes=blendshapes,
        transformationMatrix=matrix,
        inferenceDurationMs=dt_ms,
        warnings=warnings,
    )  # pragma: no cover