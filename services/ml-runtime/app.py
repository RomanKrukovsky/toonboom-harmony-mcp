import asyncio
import logging
import time
from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel

from config import CONFIG, verify_path_access
from providers.animeinbet_provider import AnimeInbetProvider
from providers.dwpose_provider import DWPoseProvider
from providers.voxcpm_provider import VoxCPMProvider
from schemas import (
    InbetweenRequest,
    InbetweenResponse,
    MLJobRequest,
    MLJobResponse,
    VoxCPMRequest,
    VoxCPMResponse,
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("ml-runtime")

app = FastAPI(title="Harmony ML Runtime")

class HealthResponse(BaseModel):
    status: str
    version: str

@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="ok", version="1.0.0")

active_jobs = {}


def blocked_job_response(
    request: MLJobRequest,
    *,
    reason: str,
    error_code: str,
) -> MLJobResponse:
    return MLJobResponse(
        jobId=request.jobId,
        provider=request.provider,
        model=request.modelId,
        modelVersion="unavailable",
        status="blocked",
        realInferenceExecuted=False,
        simulated=False,
        inputArtifacts=request.inputArtifacts,
        outputArtifacts=[],
        pirArtifacts=[],
        confidence=None,
        warnings=[reason],
        errors=[error_code],
        device="cpu",
        durationMs=0.0,
        peakMemoryMb=None,
        cacheHit=False,
        provenancePath="",
        executionReportPath="",
        correlationId=request.jobId,
    )


@app.get("/readiness")
async def readiness_check():
    models = CONFIG.get("models", {})
    any_enabled = any(m.get("enabled", False) for m in models.values())
    if not any_enabled:
        return {"runtimeReady": True, "inferenceReady": False, "status": "degraded"}
    return {"runtimeReady": True, "inferenceReady": True, "status": "ready"}

@app.get("/models")
async def list_models():
    return {"models": CONFIG.get("models", {})}

@app.post("/jobs/execute", response_model=MLJobResponse)
async def execute_job(request: MLJobRequest, req: Request):
    logger.info(f"Processing job {request.jobId} for provider {request.provider}")
    started = time.perf_counter()
    
    # Track job
    active_jobs[request.jobId] = {"cancelled": False}
    
    try:
        if request.parameters.get("simulate_timeout"):
            # Real async wait that can be interrupted
            for _ in range(50):
                if active_jobs.get(request.jobId, {}).get("cancelled"):
                    raise HTTPException(status_code=499, detail="Job cancelled")
                await asyncio.sleep(0.1)
                
        model_settings = CONFIG.get("models", {}).get(request.modelId, {})
        if not model_settings.get("enabled", False):
            return blocked_job_response(
                request,
                reason="Model is disabled or its managed weights are unavailable.",
                error_code="weights_missing_or_disabled",
            )

        # Execute DWPose
        if request.provider == "dwpose_provider":
            provider = DWPoseProvider(model_settings)
            
            output_dir = request.parameters.get("outputDir", "./output")
            image_path = request.parameters.get("imagePath", "")
            
            res = provider.run(image_path, output_dir)
            real_inference_executed = bool(res.get("realInferenceExecuted", False))
            artifact_candidates = [
                res.get("skeletonPath"),
                res.get("overlayPath"),
                res.get("executionReportPath"),
            ]
            output_artifacts = [
                str(candidate)
                for candidate in artifact_candidates
                if candidate and Path(str(candidate)).is_file()
            ]
            return MLJobResponse(
                jobId=request.jobId,
                provider=request.provider,
                model=request.modelId,
                modelVersion="managed-onnx",
                status=res.get("status", "failed"),
                realInferenceExecuted=real_inference_executed,
                simulated=False,
                inputArtifacts=request.inputArtifacts,
                outputArtifacts=output_artifacts,
                pirArtifacts=[],
                confidence=res.get("confidence") if real_inference_executed else None,
                warnings=[res["blockingReason"]] if res.get("blockingReason") else [],
                errors=res.get("errors", []),
                device="cpu",
                durationMs=(time.perf_counter() - started) * 1000.0,
                peakMemoryMb=None,
                cacheHit=False,
                provenancePath=res.get("provenancePath", ""),
                executionReportPath=res.get("executionReportPath", ""),
                correlationId=request.jobId
            )

        return blocked_job_response(
            request,
            reason=f"Provider {request.provider!r} is not connected to a real inference backend.",
            error_code="unsupported_provider",
        )
    finally:
        active_jobs.pop(request.jobId, None)

@app.post("/jobs/cancel/{job_id}")
async def cancel_job(job_id: str):
    logger.info(f"Canceling job {job_id}")
    if job_id in active_jobs:
        active_jobs[job_id]["cancelled"] = True
        return {"status": "cancelled", "jobId": job_id}
    return {"status": "not_found", "jobId": job_id}

animeinbet_provider = AnimeInbetProvider()
voxcpm_provider = VoxCPMProvider()

@app.post("/infer/animeinbet", response_model=InbetweenResponse)
async def infer_animeinbet(req: InbetweenRequest):
    # Пути из запроса проходят allowlist до любого файлового I/O.
    try:
        frame_a_path = str(verify_path_access(req.frame_a_path))
        frame_b_path = str(verify_path_access(req.frame_b_path))
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    try:
        result = animeinbet_provider.generate_inbetweens(
            frame_a_path=frame_a_path,
            frame_b_path=frame_b_path,
            count=req.count
        )
        return result
    except Exception:
        # Полный traceback остаётся в логах сервера; клиенту внутренние детали не отдаются.
        logger.exception("animeinbet inference failed")
        raise HTTPException(status_code=500, detail="animeinbet inference failed; see server logs")

@app.post("/infer/voxcpm", response_model=VoxCPMResponse)
async def infer_voxcpm(req: VoxCPMRequest):
    # Пути из запроса проходят allowlist до любого файлового I/O.
    try:
        output_wav_path = str(verify_path_access(req.outputWavPath))
        reference_wav_path = str(verify_path_access(req.referenceWavPath)) if req.referenceWavPath else None
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    try:
        result = voxcpm_provider.generate_tts(
            text=req.text,
            output_wav_path=output_wav_path,
            voice_description=req.voiceDescription,
            reference_wav_path=reference_wav_path,
            instruct=req.instruct,
            guidance_scale=req.guidanceScale,
            num_steps=req.numSteps
        )
        return result
    except Exception:
        # Полный traceback остаётся в логах сервера; клиенту внутренние детали не отдаются.
        logger.exception("voxcpm inference failed")
        raise HTTPException(status_code=500, detail="voxcpm inference failed; see server logs")

if __name__ == "__main__":
    # Локальный ML-сервис без аутентификации: слушаем только loopback.
    # Для сетевого доступа задайте ML_RUNTIME_HOST осознанно.
    import os
    uvicorn.run(app, host=os.environ.get("ML_RUNTIME_HOST", "127.0.0.1"), port=8000)
