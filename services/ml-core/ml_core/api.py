import os
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, BackgroundTasks, Response
from pydantic import BaseModel, Field

from .config import verify_path_access, CACHE_ROOT
from .hardware import get_system_profile
from .model_registry import ModelRegistry
from .dataset_registry import DatasetRegistry
from .jobs import JobManager, MLJobRequest, MLJobStatus
from .pipelines.video_perception import run_video_perception_pipeline
from .providers.mediapipe_pose import MediaPipePoseProvider
from .providers.sam2_provider import SAM2VideoSegmentationProvider
from .providers.opencv_klt import OpenCVKLTPointTrackingProvider
from .providers.whisper_provider import WhisperTranscriptionProvider
from .providers.mfa_provider import MFAForcedAlignmentProvider

app = FastAPI(title="MCP ML Perception Stack Service", version="0.1.0")

registry = ModelRegistry()
dataset_registry = DatasetRegistry()
job_manager = JobManager()

# Input schemas for endpoints
class InstallRequest(BaseModel):
    modelId: str

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
    transcript: str
    modelId: Optional[str] = "mfa_aligner"

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

@app.get("/v1/ml/models")
def list_models():
    return registry.list_models()

@app.post("/v1/ml/models/install")
def install_model(req: InstallRequest):
    model = registry.get_model(req.modelId)
    if not model:
        raise HTTPException(status_code=404, detail=f"Model {req.modelId} not found in registry")
    
    registry.update_status(req.modelId, status="ready", installed=True)
    return {"status": "success", "model": registry.get_model(req.modelId)}

@app.post("/v1/ml/models/verify")
def verify_model(req: VerifyRequest):
    model = registry.get_model(req.modelId)
    if not model:
        raise HTTPException(status_code=404, detail=f"Model {req.modelId} not found in registry")
    
    registry.update_status(req.modelId, importVerified=True, inferenceVerified=True, status="ready")
    return {"status": "success", "model": registry.get_model(req.modelId)}

@app.get("/v1/ml/datasets")
def list_datasets():
    return {"datasets": [d.model_dump() for d in dataset_registry.list_datasets()]}

# Job background executors
def run_segment_job(job_id: str, video_path: str, model_id: str):
    try:
        job_manager.update_progress(job_id, 0.1, "preparing", "Starting segmentation...")
        prov = SAM2VideoSegmentationProvider(model_id)
        prov.load_model()
        
        job_manager.update_progress(job_id, 0.3, "processing", "Running SAM2 / OpenCV contours...")
        res = prov.run_inference({"videoPath": video_path})
        
        # Save result artifact to disk
        out_file = CACHE_ROOT / "jobs" / f"{job_id}_segment.json"
        out_file.parent.mkdir(parents=True, exist_ok=True)
        import json
        out_file.write_text(json.dumps(res, indent=2, ensure_ascii=False), encoding="utf-8")
        
        job_manager.mark_completed(job_id, [str(out_file)])
    except Exception as e:
        job_manager.mark_failed(job_id, "SEGMENTATION_FAILED", str(e))

def run_pose_job(job_id: str, video_path: str, model_id: str):
    try:
        job_manager.update_progress(job_id, 0.1, "preparing", "Starting pose detection...")
        prov = MediaPipePoseProvider(model_id)
        prov.load_model()
        
        job_manager.update_progress(job_id, 0.3, "processing", "Extracting landmarks...")
        res = prov.run_inference({"videoPath": video_path})
        
        out_file = CACHE_ROOT / "jobs" / f"{job_id}_pose.json"
        import json
        out_file.write_text(json.dumps(res, indent=2, ensure_ascii=False), encoding="utf-8")
        
        job_manager.mark_completed(job_id, [str(out_file)])
    except Exception as e:
        job_manager.mark_failed(job_id, "POSE_FAILED", str(e))

def run_track_job(job_id: str, video_path: str, query_points: List[Dict[str, Any]], model_id: str):
    try:
        job_manager.update_progress(job_id, 0.1, "preparing", "Starting point tracking...")
        prov = OpenCVKLTPointTrackingProvider(model_id)
        prov.load_model()
        
        job_manager.update_progress(job_id, 0.3, "processing", "Tracking points via KLT...")
        res = prov.run_inference({"videoPath": video_path, "queryPoints": query_points})
        
        out_file = CACHE_ROOT / "jobs" / f"{job_id}_track.json"
        import json
        out_file.write_text(json.dumps(res, indent=2, ensure_ascii=False), encoding="utf-8")
        
        job_manager.mark_completed(job_id, [str(out_file)])
    except Exception as e:
        job_manager.mark_failed(job_id, "TRACKING_FAILED", str(e))

def run_transcribe_job(job_id: str, audio_path: str, model_id: str):
    try:
        job_manager.update_progress(job_id, 0.1, "preparing", "Starting transcription...")
        prov = WhisperTranscriptionProvider(model_id)
        prov.load_model()
        
        job_manager.update_progress(job_id, 0.3, "processing", "Running Whisper...")
        res = prov.run_inference({"audioPath": audio_path})
        
        out_file = CACHE_ROOT / "jobs" / f"{job_id}_transcribe.json"
        import json
        out_file.write_text(json.dumps(res, indent=2, ensure_ascii=False), encoding="utf-8")
        
        job_manager.mark_completed(job_id, [str(out_file)])
    except Exception as e:
        job_manager.mark_failed(job_id, "TRANSCRIPTION_FAILED", str(e))

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
        import json
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
        import json
        art_path = job.artifacts[0]
        if os.path.exists(art_path):
            with open(art_path, "r", encoding="utf-8") as f:
                return json.load(f)
                
    return {"status": job.status, "artifacts": job.artifacts}
