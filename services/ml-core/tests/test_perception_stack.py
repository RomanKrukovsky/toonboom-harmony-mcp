import os
from pathlib import Path
from ml_core.config import ROOT_DIR, DATA_ROOT, MODEL_ROOT, CACHE_ROOT
from ml_core.hardware import get_system_profile
from ml_core.model_registry import ModelRegistry
from ml_core.jobs import JobManager, MLJobRequest
from ml_core.providers.mediapipe_pose import MediaPipePoseProvider
from ml_core.providers.sam2_provider import SAM2VideoSegmentationProvider
from ml_core.providers.opencv_klt import OpenCVKLTPointTrackingProvider
from ml_core.providers.whisper_provider import WhisperTranscriptionProvider
from ml_core.providers.mfa_provider import MFAForcedAlignmentProvider
from ml_core.providers.embeddings import VisualEmbeddingProvider, TextEmbeddingProvider

def test_config_paths():
    assert DATA_ROOT is not None
    assert MODEL_ROOT is not None
    assert CACHE_ROOT is not None

def test_hardware_profile():
    profile = get_system_profile()
    assert profile.os in ["darwin", "linux", "windows"]
    assert profile.architecture in ["arm64", "x86_64", "amd64"]

def test_model_registry():
    reg = ModelRegistry()
    models = reg.list_models()
    assert len(models) >= 4
    sam = reg.get_model("sam2.1_hiera_tiny")
    assert sam is not None
    assert sam.provider == "sam2"

def test_job_manager(tmp_path):
    mgr = JobManager(jobs_dir=tmp_path)
    req = MLJobRequest(task="pose_estimation", params={"videoPath": "test.mp4"})
    job = mgr.create_job(req)
    assert job.status == "queued"
    
    mgr.update_progress(job.jobId, 0.5, "processing", "Running...")
    updated = mgr.get_job(job.jobId)
    assert updated.progress == 0.5
    assert updated.stage == "processing"
    
    mgr.mark_completed(job.jobId, ["artifact.json"])
    final_job = mgr.get_job(job.jobId)
    assert final_job.status == "completed"
    assert "artifact.json" in final_job.artifacts

def test_providers_availability():
    pose = MediaPipePoseProvider()
    assert pose.check_availability() in [True, False]
    
    sam = SAM2VideoSegmentationProvider()
    assert sam.check_availability() in [True, False]
    
    klt = OpenCVKLTPointTrackingProvider()
    assert klt.check_availability() is True
    
    whisper = WhisperTranscriptionProvider()
    assert whisper.check_availability() in [True, False]
    
    mfa = MFAForcedAlignmentProvider()
    assert mfa.check_availability() in [True, False]

    visual = VisualEmbeddingProvider()
    assert visual.check_availability() is True

    text = TextEmbeddingProvider()
    assert text.check_availability() is True
