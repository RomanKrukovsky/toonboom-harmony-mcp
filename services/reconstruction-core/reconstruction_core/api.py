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


@app.post("/v1/jobs/{job_id}/refine-range")
def refine_range(job_id: str, payload: dict):
    start_frame = payload.get("startFrame")
    end_frame = payload.get("endFrame")
    if start_frame is None or end_frame is None or start_frame > end_frame:
        raise HTTPException(status_code=422, detail="Неверные параметры startFrame и endFrame")
        
    try:
        job = storage.read_job(job_id)
    except Exception:
        raise HTTPException(status_code=404, detail=f"Job {job_id} не найден")
        
    manifest_path = Path(job["manifestPath"])
    if not manifest_path.exists():
        raise HTTPException(status_code=404, detail="Файл манифеста не найден")
        
    try:
        from .models import HarmonyReconstructionManifest, Exposure, Drawing
        manifest = HarmonyReconstructionManifest.model_validate_json(manifest_path.read_text(encoding="utf-8"))
        
        job_dir = storage.get_job_dir(job_id)
        cleaned_dir = job_dir / "cleaned"
        frame_paths = sorted(list(cleaned_dir.glob("*.png")))
        if not frame_paths:
            frame_paths = sorted(list((job_dir / "frames").glob("*.png")))
            
        from .vectorize import vectorize_frame
        max_pts = payload.get("maxPointsPerShape", manifest.provenance.arguments.get("maxPointsPerShape", 120) if manifest.provenance else 120)
        
        def reconstruction_func(src_path: Path, palette_list: list, frame_num: int):
            return vectorize_frame(src_path, palette_list, source_frame=frame_num, max_points=max_pts)
            
        from .versions import local_refine_range, add_version
        updated_manifest = local_refine_range(manifest, start_frame, end_frame, frame_paths, job_dir, reconstruction_func)
        
        from .problems import analyze_problems_and_segments
        problem_frames, representation_segments = analyze_problems_and_segments(updated_manifest, job_dir, frame_paths)
        updated_manifest.diagnostics.problem_frames = problem_frames
        updated_manifest.diagnostics.representation_segments = representation_segments
        
        manifest_path.write_text(updated_manifest.model_dump_json(by_alias=True), encoding="utf-8")
        
        version_info = add_version(
            job_dir,
            manifest_path,
            None,
            f"Локальный refine_range диапазона {start_frame}-{end_frame}"
        )
        
        job["report"] = updated_manifest.diagnostics.model_dump(by_alias=True, mode="json")
        storage.write_job(job_id, job)
        
        return {
            "status": "completed",
            "versionInfo": version_info,
            "report": job["report"]
        }
    except Exception as exc:
        raise HTTPException(status_code=422, detail={"code": "REFINE_RANGE_FAILED", "message": str(exc)})


@app.get("/v1/jobs/{job_id}/versions")
def get_versions(job_id: str):
    try:
        job_dir = storage.get_job_dir(job_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Job не найден")
    from .versions import read_versions
    return read_versions(job_dir)


@app.post("/v1/jobs/{job_id}/rollback")
def rollback_job(job_id: str, payload: dict):
    target_version = payload.get("version")
    if target_version is None:
        raise HTTPException(status_code=422, detail="Не указан параметр version")
        
    try:
        job = storage.read_job(job_id)
        job_dir = storage.get_job_dir(job_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Job не найден")
        
    manifest_path = Path(job["manifestPath"])
    plan_path = manifest_path.parent / "command_plan.json"
    
    from .versions import rollback_to_version
    try:
        from .models import HarmonyReconstructionManifest
        new_v = rollback_to_version(job_dir, target_version, manifest_path, plan_path)
        
        manifest = HarmonyReconstructionManifest.model_validate_json(manifest_path.read_text(encoding="utf-8"))
        job["report"] = manifest.diagnostics.model_dump(by_alias=True, mode="json")
        storage.write_job(job_id, job)
        
        return {
            "status": "completed",
            "versionInfo": new_v,
            "report": job["report"]
        }
    except Exception as exc:
        raise HTTPException(status_code=422, detail={"code": "ROLLBACK_FAILED", "message": str(exc)})


@app.post("/v1/jobs/{job_id}/lock-elements")
def lock_elements(job_id: str, payload: dict):
    element_id = payload.get("elementId")
    locked = payload.get("locked", True)
    if not element_id:
        raise HTTPException(status_code=422, detail="Не указан elementId")
        
    try:
        job = storage.read_job(job_id)
        job_dir = storage.get_job_dir(job_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Job не найден")
        
    manifest_path = Path(job["manifestPath"])
    if not manifest_path.exists():
        raise HTTPException(status_code=404, detail="Манифест отсутствует")
        
    try:
        from .models import HarmonyReconstructionManifest
        manifest = HarmonyReconstructionManifest.model_validate_json(manifest_path.read_text(encoding="utf-8"))
        
        from .versions import set_element_lock, add_version
        updated_manifest = set_element_lock(manifest, element_id, locked)
        
        manifest_path.write_text(updated_manifest.model_dump_json(by_alias=True), encoding="utf-8")
        
        action = "Блокировка" if locked else "Разблокировка"
        version_info = add_version(
            job_dir,
            manifest_path,
            None,
            f"{action} элемента {element_id}"
        )
        
        job["report"] = updated_manifest.diagnostics.model_dump(by_alias=True, mode="json")
        storage.write_job(job_id, job)
        
        return {
            "status": "completed",
            "locked": locked,
            "versionInfo": version_info
        }
    except Exception as exc:
        raise HTTPException(status_code=422, detail={"code": "LOCK_FAILED", "message": str(exc)})

