import json
import os
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, BackgroundTasks, Response
from pydantic import BaseModel, Field

from .config import verify_path_access, CACHE_ROOT
from . import result_cache
from .hardware import get_system_profile
from .model_registry import ModelRegistry, RegistryError
from .dataset_registry import DatasetRegistry
from .jobs import JobManager, MLJobRequest, MLJobStatus
from .pipelines.video_perception import run_video_perception_pipeline
from .providers.mediapipe_pose import MediaPipePoseProvider
from .providers.sam2_provider import SAM2VideoSegmentationProvider
from .providers.opencv_klt import OpenCVKLTPointTrackingProvider
from .providers.whisper_provider import WhisperTranscriptionProvider
from .providers.mfa_provider import MFAForcedAlignmentProvider
from .providers.acoustic_viseme_provider import AcousticVisemeAlignmentProvider

app = FastAPI(title="MCP ML Perception Stack Service", version="0.1.0")

registry = ModelRegistry()
dataset_registry = DatasetRegistry()
job_manager = JobManager()

# Input schemas for endpoints
class InstallRequest(BaseModel):
    modelId: str
    # Downloads are opt-in: requesting a status must never trigger a multi-GB fetch.
    allowDownload: bool = False

class VerifyRequest(BaseModel):
    modelId: str

class SegmentRequest(BaseModel):
    videoPath: str
    modelId: Optional[str] = "sam2.1_hiera_tiny"

class PoseRequest(BaseModel):
    videoPath: str
    modelId: Optional[str] = "mediapipe_pose_heavy"

class PointTrackRequest(BaseModel):
    videoPath: str
    queryPoints: List[Dict[str, Any]]
    modelId: Optional[str] = "opencv_klt"

class TranscribeRequest(BaseModel):
    audioPath: str
    modelId: Optional[str] = "whisper_base"

class AlignRequest(BaseModel):
    audioPath: str
    # Optional: acoustic viseme estimation does not need a transcript. It is only
    # used by a real phonemic aligner (MFA) when one is installed.
    transcript: Optional[str] = None
    frameRate: Optional[float] = 24.0
    modelId: Optional[str] = "acoustic_viseme_aligner"

class PerceiveVideoRequest(BaseModel):
    videoPath: str
    tasks: List[str] = Field(default_factory=lambda: ["pose", "segmentation", "point_tracking"])
    audioPath: Optional[str] = None
    profile: Optional[str] = "auto"
    quality: Optional[str] = "balanced"

@app.get("/health")
def health():
    profile = get_system_profile()
    return {
        "status": "ready",
        "service": "ml-core-perception",
        "recommendedProfile": profile.recommendedProfile,
        "mpsAvailable": profile.mpsAvailable,
        "cudaAvailable": profile.cudaAvailable
    }

@app.get("/v1/ml/system")
def get_system():
    return get_system_profile()

@app.get("/v1/ml/cache")
def cache_stats():
    """Entry count and size of the content-addressed result cache."""
    return result_cache.stats()

@app.delete("/v1/ml/cache")
def cache_clear():
    """Drop every cached result. Use after changing a provider's behaviour."""
    return {"status": "success", "removed": result_cache.clear()}

@app.get("/v1/ml/models")
def list_models():
    return registry.list_models()

def _inference_probe(model_id: str):
    """Return a callable that performs one real inference, or None if unsupported.

    The probe is what separates `installed_unverified` from `ready`: a model is
    only "verified" once its provider has actually executed it here.
    """
    model = registry.get_model(model_id)
    if model is None:
        return None

    provider_name = model.provider

    def probe_whisper() -> bool:
        prov = WhisperTranscriptionProvider(model_id)
        if not prov.load_model():
            return False
        # Synthesise a tiny silent clip inside the cache root so the probe needs
        # no fixtures and touches nothing outside allowed paths.
        import numpy as np
        import soundfile as sf
        probe_dir = CACHE_ROOT / "probes"
        probe_dir.mkdir(parents=True, exist_ok=True)
        wav = probe_dir / f"{model_id}_probe.wav"
        sf.write(str(wav), np.zeros(16000, dtype="float32"), 16000)
        result = prov.run_inference({"audioPath": str(wav)})
        return bool(result.get("realInferenceExecuted"))

    def probe_pose() -> bool:
        prov = MediaPipePoseProvider(model_id)
        return bool(prov.load_model())

    def probe_sam2() -> bool:
        prov = SAM2VideoSegmentationProvider(model_id)
        return bool(prov.load_model())

    return {
        "whisper": probe_whisper,
        "mediapipe": probe_pose,
        "sam2": probe_sam2,
    }.get(provider_name)


@app.post("/v1/ml/models/install")
def install_model(req: InstallRequest):
    """Ensure the checkpoint is on disk and its checksum matches.

    Does not mark the model verified: presence is not execution. Downloading is
    opt-in via `allowDownload` so a status request never silently pulls GBs.
    """
    if registry.get_model(req.modelId) is None:
        raise HTTPException(status_code=404, detail=f"Model {req.modelId} not found in registry")
    try:
        model = registry.install(req.modelId, allow_download=bool(req.allowDownload))
    except RegistryError as exc:
        # 409: the registry state is now accurate, the request just cannot succeed.
        raise HTTPException(status_code=409, detail=str(exc))
    return {"status": "success", "model": model}


@app.post("/v1/ml/models/verify")
def verify_model(req: VerifyRequest):
    """Re-hash the checkpoint and run one real inference through its provider."""
    if registry.get_model(req.modelId) is None:
        raise HTTPException(status_code=404, detail=f"Model {req.modelId} not found in registry")
    try:
        model = registry.verify(req.modelId, probe=_inference_probe(req.modelId))
    except RegistryError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    return {"status": "success", "model": model}

@app.get("/v1/ml/datasets")
def list_datasets():
    return {"datasets": [d.model_dump() for d in dataset_registry.list_datasets()]}

# Job background executors
def _write_artifact(job_id: str, suffix: str, result: Dict[str, Any]) -> Path:
    out_file = CACHE_ROOT / "jobs" / f"{job_id}_{suffix}.json"
    out_file.parent.mkdir(parents=True, exist_ok=True)
    out_file.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    return out_file


def _run_cached_job(
    job_id: str,
    suffix: str,
    input_path: str,
    task: str,
    model_id: Optional[str],
    params: Optional[Dict[str, Any]],
    compute,
    error_code: str,
) -> None:
    """Run a job through the content-addressed cache.

    Iterating on a shot means re-submitting the same file repeatedly; without this
    every submission re-decoded the video and re-ran inference, and the API's
    `cacheHit` field was hardcoded False because no cache existed.
    """
    try:
        source = Path(input_path)
        cached = result_cache.lookup(source, task, model_id, params)
        if cached is not None:
            job_manager.update_progress(job_id, 1.0, "cached", "Reused cached result")
            out_file = _write_artifact(job_id, suffix, cached)
            job_manager.mark_completed(job_id, [str(out_file)])
            return

        result = compute()
        out_file = _write_artifact(job_id, suffix, result)
        # Only real inference is cached — see result_cache.store().
        result_cache.store(source, task, result, model_id, params)
        job_manager.mark_completed(job_id, [str(out_file)])
    except Exception as e:
        job_manager.mark_failed(job_id, error_code, str(e))


def run_segment_job(job_id: str, video_path: str, model_id: str):
    def compute():
        job_manager.update_progress(job_id, 0.1, "preparing", "Starting segmentation...")
        prov = SAM2VideoSegmentationProvider(model_id)
        prov.load_model()
        job_manager.update_progress(job_id, 0.3, "processing", "Running SAM2 / OpenCV contours...")
        return prov.run_inference({"videoPath": video_path})

    _run_cached_job(
        job_id, "segment", video_path, "segmentation", model_id, None,
        compute, "SEGMENTATION_FAILED",
    )

def run_pose_job(job_id: str, video_path: str, model_id: str):
    def compute():
        job_manager.update_progress(job_id, 0.1, "preparing", "Starting pose detection...")
        prov = MediaPipePoseProvider(model_id)
        prov.load_model()
        job_manager.update_progress(job_id, 0.3, "processing", "Extracting landmarks...")
        return prov.run_inference({"videoPath": video_path})

    _run_cached_job(
        job_id, "pose", video_path, "pose_estimation", model_id, None,
        compute, "POSE_FAILED",
    )

def run_track_job(job_id: str, video_path: str, query_points: List[Dict[str, Any]], model_id: str):
    def compute():
        job_manager.update_progress(job_id, 0.1, "preparing", "Starting point tracking...")
        prov = OpenCVKLTPointTrackingProvider(model_id)
        prov.load_model()
        job_manager.update_progress(job_id, 0.3, "processing", "Tracking points via KLT...")
        return prov.run_inference({"videoPath": video_path, "queryPoints": query_points})

    # Query points are part of the identity: different seeds give different tracks.
    _run_cached_job(
        job_id, "track", video_path, "point_tracking", model_id,
        {"queryPoints": query_points}, compute, "TRACKING_FAILED",
    )

def run_transcribe_job(job_id: str, audio_path: str, model_id: str):
    def compute():
        job_manager.update_progress(job_id, 0.1, "preparing", "Starting transcription...")
        prov = WhisperTranscriptionProvider(model_id)
        prov.load_model()
        job_manager.update_progress(job_id, 0.3, "processing", "Running Whisper...")
        result = prov.run_inference({"audioPath": audio_path})
        # Record which backend/size actually ran so a cached entry from `base` is
        # not reused after a better model becomes available.
        result.setdefault("_cacheIdentity", {
            "backend": prov.backend,
            "whisperSize": prov.resolved_size,
        })
        return result

    _run_cached_job(
        job_id, "transcribe", audio_path, "transcription", model_id, None,
        compute, "TRANSCRIPTION_FAILED",
    )

def run_viseme_alignment_job(job_id: str, audio_path: str, frame_rate: float):
    """Acoustic viseme estimation: real mouth shapes from measured audio.

    Prefers MFA when it is installed (true phonemes); otherwise falls back to
    formant/energy-based viseme estimation. Never fabricates phoneme labels.
    """
    try:
        job_manager.update_progress(job_id, 0.1, "preparing", "Loading aligner...")

        mfa = MFAForcedAlignmentProvider()
        if mfa.load_model():
            try:
                res = mfa.run_inference({"audioPath": audio_path})
            except (RuntimeError, NotImplementedError):
                res = None
        else:
            res = None

        if res is None:
            prov = AcousticVisemeAlignmentProvider()
            if not prov.load_model():
                raise RuntimeError(
                    "[MODEL_NOT_INSTALLED] Acoustic viseme estimation needs librosa "
                    "and soundfile, which are not installed in this environment."
                )
            res = prov.run_inference(
                {"audioPath": audio_path, "frameRate": frame_rate},
                progress_callback=lambda p, stage, msg: job_manager.update_progress(
                    job_id, 0.1 + p * 0.85, stage, msg
                ),
            )

        out_file = CACHE_ROOT / "jobs" / f"{job_id}_visemes.json"
        out_file.write_text(json.dumps(res, indent=2, ensure_ascii=False), encoding="utf-8")

        job_manager.mark_completed(job_id, [str(out_file)])
    except Exception as e:
        job_manager.mark_failed(job_id, "VISEME_ALIGNMENT_FAILED", str(e))

def run_perceive_video_job(job_id: str, video_path: str, tasks: List[str], audio_path: Optional[str]):
    try:
        job_manager.update_progress(job_id, 0.1, "preparing", "Starting perceive video pipeline...")
        res = run_video_perception_pipeline(
            video_path_str=video_path,
            tasks=tasks,
            audio_path_str=audio_path,
            progress_callback=lambda p: job_manager.update_progress(job_id, 0.1 + p * 0.8, "processing", f"Processing pipeline tasks: {round(p*100)}%")
        )
        
        out_file = CACHE_ROOT / "jobs" / f"{job_id}_perceive.json"
        out_file.write_text(json.dumps(res, indent=2, ensure_ascii=False), encoding="utf-8")
        
        job_manager.mark_completed(job_id, [str(out_file)])
    except Exception as e:
        job_manager.mark_failed(job_id, "PERCEIVE_VIDEO_FAILED", str(e))

@app.post("/v1/ml/segment")
def segment(req: SegmentRequest, background_tasks: BackgroundTasks):
    v = verify_path_access(req.videoPath)
    job_req = MLJobRequest(task="segmentation", params={"videoPath": str(v), "modelId": req.modelId})
    job = job_manager.create_job(job_req)
    background_tasks.add_task(run_segment_job, job.jobId, str(v), req.modelId)
    return job

@app.post("/v1/ml/pose")
def pose(req: PoseRequest, background_tasks: BackgroundTasks):
    v = verify_path_access(req.videoPath)
    job_req = MLJobRequest(task="pose_estimation", params={"videoPath": str(v), "modelId": req.modelId})
    job = job_manager.create_job(job_req)
    background_tasks.add_task(run_pose_job, job.jobId, str(v), req.modelId)
    return job

@app.post("/v1/ml/track/points")
def track_points(req: PointTrackRequest, background_tasks: BackgroundTasks):
    v = verify_path_access(req.videoPath)
    job_req = MLJobRequest(task="point_tracking", params={"videoPath": str(v), "queryPoints": req.queryPoints, "modelId": req.modelId})
    job = job_manager.create_job(job_req)
    background_tasks.add_task(run_track_job, job.jobId, str(v), req.queryPoints, req.modelId)
    return job

@app.post("/v1/ml/transcribe")
def transcribe(req: TranscribeRequest, background_tasks: BackgroundTasks):
    a = verify_path_access(req.audioPath)
    job_req = MLJobRequest(task="transcription", params={"audioPath": str(a), "modelId": req.modelId})
    job = job_manager.create_job(job_req)
    background_tasks.add_task(run_transcribe_job, job.jobId, str(a), req.modelId)
    return job

@app.post("/v1/ml/align")
def align(req: AlignRequest, background_tasks: BackgroundTasks):
    """Estimate mouth visemes (Preston Blair A..H, X) from audio.

    Uses MFA for true phoneme alignment when installed, otherwise acoustic
    estimation from energy and formant bands. Returns frame-ranged visemes ready
    for VisemeMapper; `phonemes` stays empty unless a real aligner produced them.
    """
    a = verify_path_access(req.audioPath)
    frame_rate = req.frameRate or 24.0
    job_req = MLJobRequest(
        task="viseme_alignment",
        params={
            "audioPath": str(a),
            "frameRate": frame_rate,
            "modelId": req.modelId,
        },
    )
    job = job_manager.create_job(job_req)
    background_tasks.add_task(run_viseme_alignment_job, job.jobId, str(a), frame_rate)
    return job

@app.post("/v1/ml/perceive-video")
def perceive_video(req: PerceiveVideoRequest, background_tasks: BackgroundTasks):
    v = verify_path_access(req.videoPath)
    a = verify_path_access(req.audioPath) if req.audioPath else None
    
    job_req = MLJobRequest(task="perceive_video", params={
        "videoPath": str(v),
        "tasks": req.tasks,
        "audioPath": str(a) if a else None,
        "profile": req.profile,
        "quality": req.quality
    })
    job = job_manager.create_job(job_req)
    background_tasks.add_task(run_perceive_video_job, job.jobId, str(v), req.tasks, str(a) if a else None)
    return job

@app.get("/v1/ml/jobs/{jobId}")
def get_job(jobId: str):
    job = job_manager.get_job(jobId)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {jobId} not found")
    return job

@app.post("/v1/ml/jobs/{jobId}/cancel")
def cancel_job(jobId: str):
    job = job_manager.get_job(jobId)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {jobId} not found")
    job_manager.cancel_job(jobId)
    return job_manager.get_job(jobId)

@app.get("/v1/ml/jobs/{jobId}/artifacts")
def get_job_artifacts(jobId: str):
    job = job_manager.get_job(jobId)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {jobId} not found")
    
    # Read first json artifact content if completed
    if job.status == "completed" and job.artifacts:
        art_path = job.artifacts[0]
        if os.path.exists(art_path):
            with open(art_path, "r", encoding="utf-8") as f:
                return json.load(f)
                
    return {"status": job.status, "artifacts": job.artifacts}
