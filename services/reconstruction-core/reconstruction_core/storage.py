from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict


class JobStorage:
    def __init__(self, root: str | Path):
        self.root = Path(root).expanduser().resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def job_dir(self, job_id: str) -> Path:
        if not job_id or any(ch not in "0123456789abcdef" for ch in job_id):
            raise ValueError("Invalid job id")
        candidate = (self.root / job_id).resolve()
        if os.path.commonpath([str(self.root), str(candidate)]) != str(self.root):
            raise ValueError("Job path escaped cache root")
        candidate.mkdir(parents=True, exist_ok=True)
        return candidate

    def write_json(self, job_id: str, name: str, value: Dict[str, Any]) -> Path:
        path = self.job_dir(job_id) / name
        temporary = path.with_suffix(path.suffix + ".tmp")
        temporary.write_text(json.dumps(value, indent=2, ensure_ascii=False), encoding="utf-8")
        temporary.replace(path)
        return path

    def read_job(self, job_id: str) -> Dict[str, Any]:
        path = self.job_dir(job_id) / "job.json"
        if not path.exists():
            raise FileNotFoundError(job_id)
        return json.loads(path.read_text(encoding="utf-8"))

    def write_job(self, job_id: str, value: Dict[str, Any]) -> Path:
        return self.write_json(job_id, "job.json", value)
