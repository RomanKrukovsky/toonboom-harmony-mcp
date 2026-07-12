from __future__ import annotations

import os
import platform
import shutil
from pathlib import Path

import cv2
from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv

from . import __version__
from .metrics import compare_pairs
from .models import ReconstructionRequest, RenderComparisonRequest
from .pipeline import ReconstructionPipeline
from .storage import JobStorage


load_dotenv(Path.cwd() / ".env", override=False)

cache_root = Path(os.environ.get("RECONSTRUCTION_CACHE_ROOT", Path.cwd() / "output" / "reconstruction-cache")).resolve()
storage = JobStorage(cache_root)
pipeline = ReconstructionPipeline(
    storage,
    os.environ.get("FFMPEG_PATH", "ffmpeg"),
    os.environ.get("FFPROBE_PATH", "ffprobe"),
    (
        int(os.environ.get("RECONSTRUCTION_MAX_DURATION_SECONDS", "300")),
        int(os.environ.get("RECONSTRUCTION_MAX_WIDTH", "4096")),
        int(os.environ.get("RECONSTRUCTION_MAX_HEIGHT", "4096")),
    ),
)

app = FastAPI(title="Harmony Reconstruction Core", version=__version__)


def _allowed_roots():
    configured = os.environ.get("HARMONY_ALLOWED_ROOTS", "")
    roots = [Path(item.strip()).expanduser().resolve() for item in configured.split(",") if item.strip()]
    roots.append(cache_root)
    return roots


def _checked_image_path(value: str) -> str:
    candidate = Path(value).expanduser().resolve(strict=True)
    if not candidate.is_file():
        raise ValueError(f"Изображение не найдено: {candidate}")
    if not any(candidate == root or root in candidate.parents for root in _allowed_roots()):
        raise ValueError(f"Путь изображения вне HARMONY_ALLOWED_ROOTS: {candidate}")
    return str(candidate)


@app.get("/health")
def health():
    cuda_devices = 0
    try:
        cuda_devices = cv2.cuda.getCudaEnabledDeviceCount()
    except Exception:
        pass
    return {
        "status": "ready" if shutil.which(pipeline.ffmpeg_path) and shutil.which(pipeline.ffprobe_path) else "not_ready",
        "version": __version__,
        "python": platform.python_version(),
        "opencv": cv2.__version__,
        "ffmpeg": shutil.which(pipeline.ffmpeg_path),
        "ffprobe": shutil.which(pipeline.ffprobe_path),
        "cudaDeviceCount": cuda_devices,
        "device": os.environ.get("RECONSTRUCTION_DEVICE", "cpu"),
        "models": [],
        "supportedModes": ["frame_by_frame_vector"],
        "cacheRoot": str(cache_root),
    }


def _run(operation, request: ReconstructionRequest):
    try:
        return operation(request)
    except Exception as exc:
        raise HTTPException(status_code=422, detail={"code": "RECONSTRUCTION_FAILED", "message": str(exc)}) from exc


@app.post("/v1/analyze")
def analyze(request: ReconstructionRequest):
    return _run(pipeline.analyze, request)


@app.post("/v1/reconstruct")
def reconstruct(request: ReconstructionRequest):
    return _run(pipeline.reconstruct, request)


@app.post("/v1/compare-render")
def compare_render(request: RenderComparisonRequest):
    try:
        pairs = [
            {
                "frame": item.frame,
                "sourcePath": _checked_image_path(item.source_path),
                "renderPath": _checked_image_path(item.render_path),
            }
            for item in request.pairs
        ]
        return compare_pairs(pairs)
    except Exception as exc:
        raise HTTPException(status_code=422, detail={"code": "RENDER_COMPARISON_FAILED", "message": str(exc)}) from exc


@app.get("/v1/jobs/{job_id}")
def get_job(job_id: str):
    try:
        return storage.read_job(job_id)
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=404, detail={"code": "JOB_NOT_FOUND", "message": f"Job {job_id} not found"}) from exc


@app.post("/v1/jobs/{job_id}/cancel")
def cancel_job(job_id: str):
    try:
        job = storage.read_job(job_id)
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=404, detail={"code": "JOB_NOT_FOUND", "message": f"Job {job_id} not found"}) from exc
    if job["status"] in {"completed", "failed", "cancelled"}:
        return job
    job.update({"status": "cancelled", "stage": "cancelled", "progress": job.get("progress", 0)})
    storage.write_job(job_id, job)
    return job
