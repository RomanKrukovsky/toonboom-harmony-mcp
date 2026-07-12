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
        
        job_dir = storage.job_dir(job_id)
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
        job_dir = storage.job_dir(job_id)
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
        job_dir = storage.job_dir(job_id)
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
        job_dir = storage.job_dir(job_id)
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


@app.get("/v1/jobs/{job_id}/variants")
def list_variants(job_id: str):
    try:
        job_dir = storage.job_dir(job_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Job не найден")
        
    from .hypotheses import read_hypotheses
    return read_hypotheses(job_dir)


@app.post("/v1/jobs/{job_id}/variants/propose")
def propose_variants(job_id: str):
    try:
        job = storage.read_job(job_id)
        job_dir = storage.job_dir(job_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Job не найден")
        
    try:
        from .hypotheses import generate_hypotheses
        # Считываем аргументы из джобы (или дефолтные)
        from .models import ReconstructionRequest
        # Создаем фиктивный request на основе сохраненных параметров
        manifest_path = Path(job["manifestPath"])
        from .models import HarmonyReconstructionManifest
        manifest = HarmonyReconstructionManifest.model_validate_json(manifest_path.read_text(encoding="utf-8"))
        
        args = manifest.provenance.arguments if manifest.provenance else {}
        req = ReconstructionRequest(
            videoPath=manifest.source.video_path,
            maxColors=args.get("maxColors", 12),
            maxPointsPerShape=args.get("maxPointsPerShape", 120),
            dedupThreshold=args.get("dedupThreshold", 0.035),
            cleanupProfile=args.get("cleanupProfile", "production_cleanup"),
            backgroundMode=args.get("backgroundMode", "keep")
        )
        
        # Получаем версию из истории версий
        from .versions import read_versions
        versions = read_versions(job_dir)
        parent_v = len(versions)
        
        hypotheses = generate_hypotheses(pipeline, req, job_id, parent_version=parent_v)
        return [h.model_dump(by_alias=True, mode="json") for h in hypotheses]
    except Exception as exc:
        raise HTTPException(status_code=422, detail={"code": "PROPOSE_VARIANTS_FAILED", "message": str(exc)})


@app.get("/v1/jobs/{job_id}/variants/{variant_id}")
def get_variant(job_id: str, variant_id: str):
    try:
        job_dir = storage.job_dir(job_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Job не найден")
        
    from .hypotheses import read_hypotheses
    hyps = read_hypotheses(job_dir)
    found = next((h for h in hyps if h["hypothesisId"] == variant_id), None)
    if not found:
        raise HTTPException(status_code=404, detail=f"Гипотеза {variant_id} не найдена")
    return found


@app.get("/v1/jobs/{job_id}/variants-compare")
def compare_variants_endpoint(job_id: str):
    try:
        job_dir = storage.job_dir(job_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Job не найден")
        
    from .hypotheses import read_hypotheses, compare_hypotheses, ReconstructionHypothesis
    hyps = [ReconstructionHypothesis(**h) for h in read_hypotheses(job_dir)]
    if not hyps:
        raise HTTPException(status_code=404, detail="Гипотезы отсутствуют. Сначала запустите propose.")
    return compare_hypotheses(hyps)


@app.post("/v1/jobs/{job_id}/variants/select")
def select_variant_endpoint(job_id: str, payload: dict):
    variant_id = payload.get("variantId")
    if not variant_id:
        raise HTTPException(status_code=422, detail="Не указан variantId")
        
    start_frame = payload.get("startFrame")
    end_frame = payload.get("endFrame")
    reason = payload.get("reason", "Выбор пользователя")
    user = payload.get("user", "Artist")
    
    try:
        job = storage.read_job(job_id)
        job_dir = storage.job_dir(job_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Job не найден")
        
    manifest_path = Path(job["manifestPath"])
    if not manifest_path.exists():
        raise HTTPException(status_code=404, detail="Манифест отсутствует")
        
    try:
        from .models import HarmonyReconstructionManifest, ReconstructionHypothesis
        from .hypotheses import read_hypotheses, select_hypothesis_for_manifest
        from .versions import add_version
        
        manifest = HarmonyReconstructionManifest.model_validate_json(manifest_path.read_text(encoding="utf-8"))
        
        # Находим выбранную гипотезу
        hyps = read_hypotheses(job_dir)
        matching_hyp = next((h for h in hyps if h["hypothesisId"] == variant_id), None)
        if not matching_hyp:
            raise HTTPException(status_code=404, detail=f"Вариант {variant_id} не найден")
            
        selected_hyp_obj = ReconstructionHypothesis(**matching_hyp)
        
        frame_range = None
        if start_frame is not None and end_frame is not None:
            frame_range = (start_frame, end_frame)
            
        updated_manifest = select_hypothesis_for_manifest(
            manifest=manifest,
            selected_hyp=selected_hyp_obj,
            job_dir=job_dir,
            frame_range=frame_range,
            reason=reason,
            user=user
        )
        
        # Сохраняем обновленный манифест
        manifest_path.write_text(updated_manifest.model_dump_json(by_alias=True), encoding="utf-8")
        
        range_str = f"диапазона {start_frame}-{end_frame}" if frame_range else "для всего шота"
        version_info = add_version(
            job_dir,
            manifest_path,
            None,
            f"Выбор варианта {variant_id} {range_str}"
        )
        
        job["report"] = updated_manifest.diagnostics.model_dump(by_alias=True, mode="json")
        storage.write_job(job_id, job)
        
        return {
            "status": "completed",
            "selectedHypothesisId": variant_id,
            "versionInfo": version_info,
            "report": job["report"]
        }
    except Exception as exc:
        raise HTTPException(status_code=422, detail={"code": "SELECT_VARIANT_FAILED", "message": str(exc)})


@app.post("/v1/jobs/{job_id}/variants/discard")
def discard_variant_endpoint(job_id: str, payload: dict):
    variant_id = payload.get("variantId")
    if not variant_id:
        raise HTTPException(status_code=422, detail="Не указан variantId")
        
    try:
        job_dir = storage.job_dir(job_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Job не найден")
        
    try:
        # Удаляем файлы гипотезы
        manifest_file = job_dir / f"manifest_{variant_id}.json"
        if manifest_file.exists():
            manifest_file.unlink()
            
        preview_dir = job_dir / f"previews_{variant_id}"
        if preview_dir.exists():
            shutil.rmtree(str(preview_dir))
            
        # Удаляем из hypotheses.json
        from .hypotheses import read_hypotheses, write_hypotheses
        hyps = read_hypotheses(job_dir)
        filtered = [h for h in hyps if h["hypothesisId"] != variant_id]
        write_hypotheses(job_dir, filtered)
        
        return {"status": "success", "discardedVariantId": variant_id}
    except Exception as exc:
        raise HTTPException(status_code=422, detail={"code": "DISCARD_VARIANT_FAILED", "message": str(exc)})


@app.post("/v1/jobs/{job_id}/variants/rollback-selection")
def rollback_selection_endpoint(job_id: str):
    try:
        job = storage.read_job(job_id)
        job_dir = storage.job_dir(job_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Job не найден")
        
    manifest_path = Path(job["manifestPath"])
    plan_path = manifest_path.parent / "command_plan.json"
    
    # Считываем лог версий, чтобы найти предыдущую версию
    from .versions import read_versions, rollback_to_version
    versions = read_versions(job_dir)
    if len(versions) < 2:
        raise HTTPException(status_code=422, detail="Отсутствуют предыдущие версии для отката.")
        
    # Ищем версию до последней
    target_v = len(versions) - 1
    
    try:
        from .models import HarmonyReconstructionManifest
        new_v = rollback_to_version(job_dir, target_v, manifest_path, plan_path)
        
        manifest = HarmonyReconstructionManifest.model_validate_json(manifest_path.read_text(encoding="utf-8"))
        job["report"] = manifest.diagnostics.model_dump(by_alias=True, mode="json")
        storage.write_job(job_id, job)
        
        return {
            "status": "completed",
            "versionInfo": new_v,
            "report": job["report"]
        }
    except Exception as exc:
        raise HTTPException(status_code=422, detail={"code": "ROLLBACK_SELECTION_FAILED", "message": str(exc)})


@app.post("/v1/jobs/{job_id}/motion-factorization")
def analyze_motion_factorization(job_id: str, payload: dict = None):
    try:
        job = storage.read_job(job_id)
        job_dir = storage.job_dir(job_id)
    except Exception:
        raise HTTPException(status_code=404, detail=f"Job {job_id} не найден")
        
    manifest_path = Path(job["manifestPath"])
    if not manifest_path.exists():
        raise HTTPException(status_code=404, detail="Манифест не найден")
        
    try:
        from .models import HarmonyReconstructionManifest
        manifest = HarmonyReconstructionManifest.model_validate_json(manifest_path.read_text(encoding="utf-8"))
        
        cleaned_dir = job_dir / "cleaned"
        frame_paths = sorted(list(cleaned_dir.glob("*.png")))
        if not frame_paths:
            frame_paths = sorted(list((job_dir / "frames").glob("*.png")))
            
        from .factorization import run_motion_factorization_for_job
        # Делаем копию манифеста для сухого анализа
        base_manifest = manifest.model_copy(deep=True)
        factorized = run_motion_factorization_for_job(base_manifest, job_dir, frame_paths)
        
        # Если transform_tracks не пуст, значит факторизация успешна
        success = len(factorized.transform_tracks) > 0
        
        # Вычисляем разницу
        before_drawings = len(manifest.drawings)
        after_drawings = len(factorized.drawings)
        
        # Собираем отчет
        report = {
            "factorized": success,
            "beforeDrawingCount": before_drawings,
            "afterDrawingCount": after_drawings,
            "drawingReductionRatio": float(1.0 - after_drawings / before_drawings) if before_drawings > 0 else 0.0,
            "transformTracksCount": len(factorized.transform_tracks)
        }
        if success:
            track = factorized.transform_tracks[0]
            report.update({
                "keyframeCount": len(track.segments[0].keyframes),
                "residualError": track.segments[0].residual_error,
                "pivot": track.pivot
            })
        return report
    except Exception as exc:
        raise HTTPException(status_code=422, detail={"code": "FACTORIZATION_ANALYSIS_FAILED", "message": str(exc)})


@app.post("/v1/jobs/{job_id}/preview-transform")
def preview_transform_reconstruction(job_id: str, payload: dict = None):
    try:
        job = storage.read_job(job_id)
        job_dir = storage.job_dir(job_id)
    except Exception:
        raise HTTPException(status_code=404, detail=f"Job {job_id} не найден")
        
    manifest_path = Path(job["manifestPath"])
    if not manifest_path.exists():
        raise HTTPException(status_code=404, detail="Манифест не найден")
        
    try:
        from .models import HarmonyReconstructionManifest
        manifest = HarmonyReconstructionManifest.model_validate_json(manifest_path.read_text(encoding="utf-8"))
        
        cleaned_dir = job_dir / "cleaned"
        frame_paths = sorted(list(cleaned_dir.glob("*.png")))
        if not frame_paths:
            frame_paths = sorted(list((job_dir / "frames").glob("*.png")))
            
        from .factorization import run_motion_factorization_for_job
        base_manifest = manifest.model_copy(deep=True)
        factorized = run_motion_factorization_for_job(base_manifest, job_dir, frame_paths)
        
        if not factorized.transform_tracks:
            raise ValueError("Не удалось выполнить факторизацию движения для превью.")
            
        preview_dir = job_dir / "previews_peg_factorized"
        preview_dir.mkdir(parents=True, exist_ok=True)
        
        colors = {c.id: c.rgba for p in factorized.palettes for c in p.colors}
        w, h = factorized.scene.width, factorized.scene.height
        
        from .problems import render_drawing_to_numpy
        from .factorization import apply_transform_to_image
        
        master_drawing = factorized.drawings[0]
        master_canvas = render_drawing_to_numpy(master_drawing, colors, w, h)
        
        track = factorized.transform_tracks[0]
        segment = track.segments[0]
        
        for frame_idx in range(len(frame_paths)):
            frame_num = frame_idx + 1
            kf = next((k for k in segment.keyframes if k.frame == frame_num), None)
            if not kf:
                kfs = sorted(segment.keyframes, key=lambda k: k.frame)
                left = max([k for k in kfs if k.frame < frame_num], key=lambda k: k.frame, default=None)
                right = min([k for k in kfs if k.frame > frame_num], key=lambda k: k.frame, default=None)
                if left and right:
                    t = (frame_num - left.frame) / (right.frame - left.frame)
                    tx = left.position_x + t * (right.position_x - left.position_x)
                    ty = left.position_y + t * (right.position_y - left.position_y)
                    rot = left.rotation + t * (right.rotation - left.rotation)
                    sx = left.scale_x + t * (right.scale_x - left.scale_x)
                    sy = left.scale_y + t * (right.scale_y - left.scale_y)
                    skew = left.skew + t * (right.skew - left.skew)
                elif left:
                    tx, ty, rot, sx, sy, skew = left.position_x, left.position_y, left.rotation, left.scale_x, left.scale_y, left.skew
                elif right:
                    tx, ty, rot, sx, sy, skew = right.position_x, right.position_y, right.rotation, right.scale_x, right.scale_y, right.skew
                else:
                    tx, ty, rot, sx, sy, skew = 0.0, 0.0, 0.0, 1.0, 1.0, 0.0
            else:
                tx, ty, rot, sx, sy, skew = kf.position_x, kf.position_y, kf.rotation, kf.scale_x, kf.scale_y, kf.skew
                
            warped = apply_transform_to_image(master_canvas, tx, ty, rot, sx, sy, skew, track.pivot)
            cv2.imwrite(str(preview_dir / f"frame_{frame_num:06d}.png"), warped)
            
        return {
            "status": "completed",
            "previewDirectory": str(preview_dir),
            "keyframeCount": len(segment.keyframes)
        }
    except Exception as exc:
        raise HTTPException(status_code=422, detail={"code": "PREVIEW_TRANSFORM_FAILED", "message": str(exc)})


@app.post("/v1/jobs/{job_id}/apply-transform")
def apply_transform_representation(job_id: str, payload: dict = None):
    try:
        job = storage.read_job(job_id)
        job_dir = storage.job_dir(job_id)
    except Exception:
        raise HTTPException(status_code=404, detail=f"Job {job_id} не найден")
        
    manifest_path = Path(job["manifestPath"])
    if not manifest_path.exists():
        raise HTTPException(status_code=404, detail="Манифест не найден")
        
    try:
        from .models import HarmonyReconstructionManifest
        manifest = HarmonyReconstructionManifest.model_validate_json(manifest_path.read_text(encoding="utf-8"))
        
        cleaned_dir = job_dir / "cleaned"
        frame_paths = sorted(list(cleaned_dir.glob("*.png")))
        if not frame_paths:
            frame_paths = sorted(list((job_dir / "frames").glob("*.png")))
            
        from .factorization import run_motion_factorization_for_job
        updated_manifest = run_motion_factorization_for_job(manifest, job_dir, frame_paths)
        
        if not updated_manifest.transform_tracks:
            raise ValueError("Не удалось применить Peg Transform: не пройдены hard constraints.")
            
        # Записываем обновленный манифест
        manifest_path.write_text(updated_manifest.model_dump_json(by_alias=True), encoding="utf-8")
        
        # Добавляем в историю версий
        from .versions import add_version
        version_info = add_version(
            job_dir,
            manifest_path,
            None,
            "Применение Peg Transform факторизации движения"
        )
        
        job["report"] = updated_manifest.diagnostics.model_dump(by_alias=True, mode="json")
        storage.write_job(job_id, job)
        
        return {
            "status": "completed",
            "versionInfo": version_info,
            "report": job["report"]
        }
    except Exception as exc:
        raise HTTPException(status_code=422, detail={"code": "APPLY_TRANSFORM_FAILED", "message": str(exc)})


@app.post("/v1/jobs/{job_id}/reject-transform")
def reject_transform_representation(job_id: str, payload: dict = None):
    return {"status": "completed", "message": "Факторизация движения отклонена пользователем. Сохранен покадровый вариант."}


@app.post("/v1/retarget/analyze")
def retarget_analyze(payload: dict):
    try:
        from .retargeting_models import RigProfile, JointMapping
        from .retargeting_core import run_motion_retargeting, JsonPoseProvider
        
        raw_landmarks = payload.get("landmarks", {})
        landmarks_data = {}
        for k, v in raw_landmarks.items():
            try:
                parsed_frame_lms = {}
                for l_name, coords in v.items():
                    parsed_frame_lms[l_name] = (coords[0], coords[1], coords[2], coords[3] if len(coords) > 3 else 1.0)
                landmarks_data[int(k)] = parsed_frame_lms
            except ValueError:
                pass
                
        provider = JsonPoseProvider(landmarks_data)
        
        rig_profile_raw = payload.get("rigProfile")
        if not rig_profile_raw:
            raise ValueError("rigProfile is required")
        rig_profile = RigProfile.model_validate(rig_profile_raw)
        
        mappings_raw = payload.get("mappings", [])
        mappings = [JointMapping.model_validate(m) for m in mappings_raw]
        
        start_frame = int(payload.get("startFrame", 1))
        end_frame = int(payload.get("endFrame", max(landmarks_data.keys()) if landmarks_data else 1))
        fps = float(payload.get("fps", 24.0))
        tolerance = float(payload.get("tolerance", 1.0))
        mirror = bool(payload.get("mirror", False))
        bg_landmarks = payload.get("bgLandmarks", [])
        foot_locking = bool(payload.get("footLocking", True))
        
        manifest = run_motion_retargeting(
            provider=provider,
            rig_profile=rig_profile,
            mappings=mappings,
            start_frame=start_frame,
            end_frame=end_frame,
            fps=fps,
            tolerance=tolerance,
            mirror=mirror,
            bg_landmarks=bg_landmarks,
            foot_locking=foot_locking
        )
        return manifest.model_dump(by_alias=True)
    except Exception as exc:
        raise HTTPException(status_code=422, detail={"code": "RETARGET_ANALYZE_FAILED", "message": str(exc)})


@app.post("/v1/retarget/preview")
def retarget_preview(payload: dict):
    try:
        from .retargeting_models import RetargetingManifest
        from .retargeting_preview import generate_svg_previews
        
        manifest_raw = payload.get("manifest")
        if not manifest_raw:
            raise ValueError("manifest is required")
        manifest = RetargetingManifest.model_validate(manifest_raw)
        
        raw_landmarks = payload.get("landmarks", {})
        landmarks_data = {}
        for k, v in raw_landmarks.items():
            try:
                parsed_frame_lms = {}
                for l_name, coords in v.items():
                    parsed_frame_lms[l_name] = (coords[0], coords[1], coords[2], coords[3] if len(coords) > 3 else 1.0)
                landmarks_data[int(k)] = parsed_frame_lms
            except ValueError:
                pass
                
        output_dir_str = payload.get("outputDir")
        if not output_dir_str:
            raise ValueError("outputDir is required")
            
        output_dir = Path(output_dir_str).expanduser().resolve()
        generate_svg_previews(manifest, landmarks_data, output_dir)
        
        svg_files = sorted([str(p) for p in output_dir.glob("*.svg")])
        return {"status": "success", "previewFiles": svg_files}
    except Exception as exc:
        raise HTTPException(status_code=422, detail={"code": "RETARGET_PREVIEW_FAILED", "message": str(exc)})


@app.post("/v1/retarget/apply")
def retarget_apply(payload: dict):
    try:
        from .retargeting_models import RetargetingManifest
        from .retargeting_plan import compile_harmony_command_plan
        
        manifest_raw = payload.get("manifest")
        if not manifest_raw:
            raise ValueError("manifest is required")
        manifest = RetargetingManifest.model_validate(manifest_raw)
        
        command_plan = compile_harmony_command_plan(manifest)
        return command_plan
    except Exception as exc:
        raise HTTPException(status_code=422, detail={"code": "RETARGET_APPLY_FAILED", "message": str(exc)})


