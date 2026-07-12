import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any, Callable
from pydantic import BaseModel, Field
from .config import CACHE_ROOT

class MLJobRequest(BaseModel):
    task: str
    params: Dict[str, Any] = Field(default_factory=dict)

class MLJobStatus(BaseModel):
    jobId: str
    status: str = "queued"  # queued, preparing, downloading, loading_model, processing, writing_artifacts, completed, failed, cancelled
    stage: str = "queued"
    progress: float = 0.0
    artifacts: List[str] = Field(default_factory=list)
    error: Optional[Dict[str, str]] = None
    createdAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updatedAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    logs: List[str] = Field(default_factory=list)

class JobManager:
    def __init__(self, jobs_dir: Path = CACHE_ROOT / "jobs"):
        self.jobs_dir = jobs_dir
        self.jobs_dir.mkdir(parents=True, exist_ok=True)
        self.active_jobs: Dict[str, MLJobStatus] = {}

    def _job_file(self, job_id: str) -> Path:
        return self.jobs_dir / f"{job_id}.json"

    def create_job(self, request: MLJobRequest) -> MLJobStatus:
        job_id = str(uuid.uuid4())
        job = MLJobStatus(jobId=job_id)
        job.logs.append(f"Job created for task '{request.task}' at {job.createdAt}")
        self.active_jobs[job_id] = job
        self.save_job(job)
        return job

    def save_job(self, job: MLJobStatus):
        job.updatedAt = datetime.now(timezone.utc).isoformat()
        self.active_jobs[job.jobId] = job
        file_path = self._job_file(job.jobId)
        file_path.write_text(job.model_dump_json(indent=2), encoding="utf-8")

    def get_job(self, job_id: str) -> Optional[MLJobStatus]:
        if job_id in self.active_jobs:
            return self.active_jobs[job_id]
        
        file_path = self._job_file(job_id)
        if file_path.is_file():
            try:
                job = MLJobStatus.model_validate_json(file_path.read_text(encoding="utf-8"))
                self.active_jobs[job_id] = job
                return job
            except Exception:
                pass
        return None

    def update_progress(self, job_id: str, progress: float, stage: str, log_msg: Optional[str] = None):
        job = self.get_job(job_id)
        if job:
            job.progress = round(progress, 4)
            job.stage = stage
            if log_msg:
                job.logs.append(f"[{datetime.now(timezone.utc).isoformat()}] {log_msg}")
            self.save_job(job)

    def mark_completed(self, job_id: str, artifacts: List[str] = None):
        job = self.get_job(job_id)
        if job:
            job.status = "completed"
            job.stage = "completed"
            job.progress = 1.0
            if artifacts:
                job.artifacts.extend(artifacts)
            job.logs.append(f"[{datetime.now(timezone.utc).isoformat()}] Job completed successfully.")
            self.save_job(job)

    def mark_failed(self, job_id: str, error_code: str, error_msg: str):
        job = self.get_job(job_id)
        if job:
            job.status = "failed"
            job.stage = "failed"
            job.error = {"code": error_code, "message": error_msg}
            job.logs.append(f"[{datetime.now(timezone.utc).isoformat()}] Job failed with code {error_code}: {error_msg}")
            self.save_job(job)

    def cancel_job(self, job_id: str):
        job = self.get_job(job_id)
        if job and job.status not in ["completed", "failed", "cancelled"]:
            job.status = "cancelled"
            job.stage = "cancelled"
            job.logs.append(f"[{datetime.now(timezone.utc).isoformat()}] Job cancelled by user.")
            self.save_job(job)
