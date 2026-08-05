"""Asynchronous job manager for the V2 runtime.

Replaces the bare ``active_jobs = {}`` global, which had no lock, no persistence and no bound on
concurrency, so two simultaneous requests could corrupt each other's state and a restart lost
every in-flight job silently.

What this provides:
  * an ``asyncio.Lock`` around all shared state;
  * a bounded ``ThreadPoolExecutor`` so blocking inference never starves the event loop and the
    host cannot be asked to run ten models at once;
  * cooperative cancellation via a token the provider polls;
  * on-disk persistence, so ``/v2/jobs/{id}`` still answers after a restart and jobs that were
    running at the moment of a crash are reported as ``interrupted`` rather than ``running``
    forever;
  * a final honesty check: a result claiming real inference must carry the weights digests the
    loader actually measured.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import platform
import sys
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from .artifact_store import ArtifactStore
from .license_guard import LicenseGuard
from .provider_registry import ProviderRegistry
from .providers.base import (
    CancellationToken,
    ExecutionContext,
    JobCancelled,
    ProviderError,
    ProviderResult,
)
from .security import SecurityError

logger = logging.getLogger("ml-runtime.jobs")

RUNTIME_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_STATE_DIR = RUNTIME_ROOT / "artifacts" / "jobs"
MAX_WORKERS = int(os.environ.get("ML_RUNTIME_MAX_WORKERS", "2"))

TERMINAL = {"succeeded", "failed", "cancelled", "blocked", "interrupted"}
IN_FLIGHT = {"queued", "preparing", "loading_model", "running", "writing_artifacts"}


@dataclass
class JobRecord:
    jobId: str
    correlationId: str
    idempotencyKey: str
    taskType: str
    providerId: str
    modelId: str
    modelRevision: str
    executionMode: str
    commercialMode: str
    status: str
    attempt: int
    createdAt: str
    updatedAt: str
    timeoutMs: int
    licenseDecisionId: str
    request: Dict[str, Any]
    result: Optional[Dict[str, Any]] = None
    errorCode: Optional[str] = None
    errorMessage: Optional[str] = None
    warnings: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class JobManager:
    def __init__(
        self,
        registry: ProviderRegistry,
        store: Optional[ArtifactStore] = None,
        state_dir: Optional[Path] = None,
        license_guard: Optional[LicenseGuard] = None,
    ):
        self.registry = registry
        self.store = store or ArtifactStore()
        self.state_dir = Path(state_dir) if state_dir else DEFAULT_STATE_DIR
        self.state_dir.mkdir(parents=True, exist_ok=True)
        self.license_guard = license_guard or registry.license_guard
        self._jobs: Dict[str, JobRecord] = {}
        self._tokens: Dict[str, CancellationToken] = {}
        self._lock = asyncio.Lock()
        self._executor = ThreadPoolExecutor(max_workers=MAX_WORKERS, thread_name_prefix="ml-runtime")
        self._metrics = {
            "jobs_submitted": 0,
            "jobs_succeeded": 0,
            "jobs_failed": 0,
            "jobs_blocked": 0,
            "jobs_cancelled": 0,
            "cache_hits": 0,
            "license_blocks": 0,
            "oom_count": 0,
            "artifact_write_errors": 0,
        }
        self._recover()

    # ------------------------------------------------------------------ persistence --

    def _path(self, job_id: str) -> Path:
        safe = "".join(c for c in job_id if c.isalnum() or c in "._-")
        if not safe:
            raise SecurityError("ML_ARTIFACT_PATH_REJECTED", "illegal job id")
        return self.state_dir / f"{safe}.json"

    def _persist(self, record: JobRecord) -> None:
        try:
            self._path(record.jobId).write_text(json.dumps(record.to_dict(), indent=2), encoding="utf-8")
        except OSError as exc:
            self._metrics["artifact_write_errors"] += 1
            logger.error("could not persist job %s: %s", record.jobId, exc)

    def _recover(self) -> None:
        """Anything the disk still calls running cannot be: its process is gone."""
        for file in self.state_dir.glob("*.json"):
            try:
                data = json.loads(file.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError) as exc:
                logger.warning("skipping unreadable job state %s: %s", file.name, exc)
                continue
            record = JobRecord(**data)
            if record.status in IN_FLIGHT:
                record.status = "interrupted"
                record.errorCode = "ML_WORKER_CRASHED"
                record.errorMessage = "runtime restarted while the job was in flight"
                record.updatedAt = _now()
                self._persist(record)
            self._jobs[record.jobId] = record

    # ---------------------------------------------------------------------- submit --

    async def submit(self, request: Dict[str, Any]) -> Dict[str, Any]:
        provider_id = request["providerId"]
        job_id = request.get("jobId") or f"job_{uuid.uuid4()}"

        if not self.registry.has(provider_id):
            return self._blocked_result(request, job_id, "ML_PROVIDER_NOT_FOUND", f"provider {provider_id!r} is not registered in this runtime")

        descriptor = self.registry.descriptor(provider_id)

        # Idempotency: the same computation returns the stored success rather than re-running.
        async with self._lock:
            for existing in self._jobs.values():
                if (existing.idempotencyKey == request["idempotencyKey"]
                        and existing.providerId == provider_id
                        and existing.modelRevision == descriptor.modelRevision
                        and existing.status == "succeeded"
                        and existing.result is not None):
                    self._metrics["cache_hits"] += 1
                    cached = json.loads(json.dumps(existing.result))
                    cached["jobId"] = job_id
                    if cached.get("provenance"):
                        cached["provenance"]["cacheHit"] = True
                        cached["provenance"]["jobId"] = job_id
                    return cached

        verdict = self.license_guard.evaluate(descriptor.modelId, use="inference" if request.get("commercialMode") != "preview" else "preview")
        if not verdict.allowed:
            self._metrics["license_blocks"] += 1
            return self._blocked_result(request, job_id, "ML_LICENSE_BLOCKED", verdict.humanReason)

        provider = self.registry.get(provider_id)
        parameters = request.get("parameters", {})
        input_refs = request.get("inputArtifacts", [])

        problems = provider.validate_input(parameters, input_refs)
        if problems:
            return self._failed_result(request, job_id, "ML_INPUT_SCHEMA_INVALID", "; ".join(problems))

        weights = self.registry.verify_weights(provider_id)
        if not weights.verified and request.get("executionMode") == "real_ml":
            code = ("ML_WEIGHTS_HASH_MISMATCH" if weights.mismatched
                    else "ML_WEIGHTS_HASH_UNVERIFIED" if weights.untrusted
                    else "ML_MODEL_NOT_INSTALLED")
            return self._blocked_result(request, job_id, code, weights.blockingReason or "weights unavailable")

        record = JobRecord(
            jobId=job_id,
            correlationId=request.get("correlationId", job_id),
            idempotencyKey=request["idempotencyKey"],
            taskType=request["taskType"],
            providerId=provider_id,
            modelId=descriptor.modelId,
            modelRevision=descriptor.modelRevision,
            executionMode=request.get("executionMode", "real_ml"),
            commercialMode=request.get("commercialMode", "commercial"),
            status="running",
            attempt=1,
            createdAt=_now(),
            updatedAt=_now(),
            timeoutMs=int(request.get("timeoutMs", 600_000)),
            licenseDecisionId=request.get("licenseDecisionId") or f"lic_runtime_{uuid.uuid4()}",
            request=request,
        )
        token = CancellationToken()
        async with self._lock:
            self._jobs[job_id] = record
            self._tokens[job_id] = token
            self._metrics["jobs_submitted"] += 1
        self._persist(record)

        try:
            resolved_inputs = [self.store.resolve_input(ref) for ref in input_refs]
        except SecurityError as exc:
            return await self._finish_failed(record, exc.code, str(exc))

        context = ExecutionContext(
            jobId=job_id,
            correlationId=record.correlationId,
            executionMode=record.executionMode,
            commercialMode=record.commercialMode,
            device=_pick_device(descriptor.devices, request.get("requestedDevice", "auto")),
            seed=request.get("seed"),
            timeoutMs=record.timeoutMs,
            outputNamespace="ml-jobs",
            outputPrefix=f"{job_id}",
            store=self.store,
            token=token,
            licenseDecisionId=record.licenseDecisionId,
            weights=weights,
        )

        started_at = _now()
        started_perf = time.perf_counter()
        loop = asyncio.get_running_loop()
        try:
            result: ProviderResult = await asyncio.wait_for(
                loop.run_in_executor(self._executor, provider.execute, parameters, resolved_inputs, context),
                timeout=record.timeoutMs / 1000.0,
            )
        except asyncio.TimeoutError:
            token.cancel()
            return await self._finish_failed(record, "ML_TIMEOUT", f"job exceeded {record.timeoutMs} ms")
        except JobCancelled:
            self._metrics["jobs_cancelled"] += 1
            return await self._finish(record, "cancelled", None, "ML_CANCELLED", "job was cancelled")
        except ProviderError as exc:
            return await self._finish_failed(record, exc.code, str(exc))
        except SecurityError as exc:
            return await self._finish_failed(record, exc.code, str(exc))
        except MemoryError:
            self._metrics["oom_count"] += 1
            return await self._finish_failed(record, "ML_OOM", "worker exhausted memory")
        except Exception as exc:  # noqa: BLE001 - narrowed above; this is the crash path
            logger.exception("provider %s crashed on job %s", provider_id, job_id)
            return await self._finish_failed(record, "ML_WORKER_CRASHED", f"{type(exc).__name__}: {exc}")

        duration_ms = (time.perf_counter() - started_perf) * 1000.0

        # Final honesty check. A result may only claim real inference if the digests the loader
        # measured on disk are non-empty; a claim with no measured weights is rejected.
        measured = sorted(weights.measuredDigests.values())
        if result.real_inference_executed and not measured:
            return await self._finish_failed(
                record, "ML_OUTPUT_SCHEMA_INVALID",
                "provider claims real inference but no weights digest was measured for this model")

        if result.status == "blocked":
            self._metrics["jobs_blocked"] += 1
            return await self._finish(record, "blocked", None, result.error_code or "ML_MODEL_NOT_INSTALLED", result.error_message or "blocked")
        if result.status == "failed":
            return await self._finish_failed(record, result.error_code or "ML_WORKER_CRASHED", result.error_message or "provider reported failure")

        provenance = self._build_provenance(record, descriptor, result, weights, started_at, duration_ms, input_refs)

        # Providers cannot author provenance: they do not know the licence decision id, the job
        # timing or the measured weights digests. The manager stamps it onto the normalised PIR
        # here and rewrites the artifact, so the PIR on disk is complete and self-describing.
        if isinstance(result.normalized_pir, dict):
            result.normalized_pir["provenance"] = provenance
            rewritten = self.store.put_json(
                "ml-jobs", f"{job_id}/normalized-pir.json", result.normalized_pir, "normalized_pir")
            result.output_artifacts = [
                rewritten if a.role == "normalized_pir" else a for a in result.output_artifacts
            ]
            provenance["outputArtifactHashes"] = [a.sha256 for a in result.output_artifacts]

        payload = {
            "schemaVersion": "2.0",
            "jobId": job_id,
            "correlationId": record.correlationId,
            "idempotencyKey": record.idempotencyKey,
            "taskType": record.taskType,
            "status": "succeeded",
            "attempt": record.attempt,
            "outputArtifacts": [a.to_dict() for a in result.output_artifacts],
            "normalizedPir": result.normalized_pir,
            "error": None,
            "warnings": result.warnings,
            "provenance": provenance,
        }
        self._metrics["jobs_succeeded"] += 1
        return await self._finish(record, "succeeded", payload, None, None)

    # -------------------------------------------------------------------- lifecycle --

    async def get(self, job_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            record = self._jobs.get(job_id)
        if record is None:
            return None
        if record.result is not None:
            return record.result
        return {
            "schemaVersion": "2.0",
            "jobId": record.jobId,
            "correlationId": record.correlationId,
            "idempotencyKey": record.idempotencyKey,
            "taskType": record.taskType,
            "status": record.status,
            "attempt": max(1, record.attempt),
            "outputArtifacts": [],
            "normalizedPir": None,
            "error": ({"code": record.errorCode, "message": record.errorMessage or "", "retryable": record.errorCode in {"ML_OOM", "ML_WORKER_CRASHED", "ML_TRANSPORT_FAILED", "ML_RUNTIME_UNAVAILABLE"}}
                      if record.errorCode else None),
            "warnings": record.warnings,
            "provenance": None,
        }

    async def cancel(self, job_id: str) -> Dict[str, Any]:
        async with self._lock:
            record = self._jobs.get(job_id)
            token = self._tokens.get(job_id)
        if record is None:
            return {"cancelled": False, "status": "not_found"}
        if record.status in TERMINAL:
            return {"cancelled": False, "status": record.status}
        if token is not None:
            token.cancel()
        return {"cancelled": True, "status": "cancelling"}

    def metrics(self) -> Dict[str, float]:
        queue_depth = sum(1 for r in self._jobs.values() if r.status in IN_FLIGHT)
        return {**self._metrics, "queue_depth": queue_depth, "known_jobs": len(self._jobs)}

    # ---------------------------------------------------------------------- helpers --

    def _build_provenance(self, record, descriptor, result, weights, started_at, duration_ms, input_refs) -> Dict[str, Any]:
        entry = self.license_guard.catalog_entry(descriptor.modelId) or {}
        return {
            "providerId": descriptor.providerId,
            "modelId": descriptor.modelId,
            "modelRevision": descriptor.modelRevision,
            "repositoryUrl": entry.get("upstreamRepository"),
            "repositoryCommit": entry.get("upstreamCommit"),
            "weightsFiles": sorted(weights.resolvedPaths),
            "weightsSha256": sorted(weights.measuredDigests.values()),
            "runtimeName": descriptor.backend,
            "runtimeVersion": _backend_version(descriptor.backend),
            "pythonVersion": platform.python_version(),
            "device": result.device,
            "precision": result.precision,
            "startedAt": started_at,
            "completedAt": _now(),
            "durationMs": duration_ms,
            "peakMemoryMb": result.peak_memory_mb,
            "seed": record.request.get("seed"),
            "deterministic": result.deterministic,
            "inputArtifactHashes": [ref["sha256"] for ref in input_refs],
            "outputArtifactHashes": [a.sha256 for a in result.output_artifacts],
            "licenseDecisionId": record.licenseDecisionId,
            "commercialMode": record.commercialMode,
            "realInferenceExecuted": result.real_inference_executed,
            "simulated": result.simulated,
            "cacheHit": False,
            "correlationId": record.correlationId,
            "jobId": record.jobId,
        }

    async def _finish(self, record: JobRecord, status: str, payload: Optional[Dict[str, Any]], code: Optional[str], message: Optional[str]) -> Dict[str, Any]:
        async with self._lock:
            record.status = status
            record.updatedAt = _now()
            record.errorCode = code
            record.errorMessage = message
            record.result = payload
            self._tokens.pop(record.jobId, None)
        self._persist(record)
        if payload is not None:
            return payload
        return await self.get(record.jobId)  # type: ignore[return-value]

    async def _finish_failed(self, record: JobRecord, code: str, message: str) -> Dict[str, Any]:
        self._metrics["jobs_failed"] += 1
        logger.error("job=%s provider=%s model=%s stage=execute errorCode=%s", record.jobId, record.providerId, record.modelId, code)
        return await self._finish(record, "failed", None, code, message)

    def _blocked_result(self, request: Dict[str, Any], job_id: str, code: str, message: str) -> Dict[str, Any]:
        self._metrics["jobs_blocked"] += 1
        return _terminal_payload(request, job_id, "blocked", code, message)

    def _failed_result(self, request: Dict[str, Any], job_id: str, code: str, message: str) -> Dict[str, Any]:
        self._metrics["jobs_failed"] += 1
        return _terminal_payload(request, job_id, "failed", code, message)


def _terminal_payload(request: Dict[str, Any], job_id: str, status: str, code: str, message: str) -> Dict[str, Any]:
    return {
        "schemaVersion": "2.0",
        "jobId": job_id,
        "correlationId": request.get("correlationId", job_id),
        "idempotencyKey": request["idempotencyKey"],
        "taskType": request["taskType"],
        "status": status,
        "attempt": 1,
        "outputArtifacts": [],
        "normalizedPir": None,
        "error": {"code": code, "message": message, "retryable": code in {"ML_OOM", "ML_WORKER_CRASHED", "ML_TRANSPORT_FAILED"}},
        "warnings": [],
        "provenance": None,
    }


def _pick_device(supported, requested: str) -> str:
    from .hardware_probe import devices as host_devices

    if requested != "auto" and requested in supported and requested in host_devices():
        return requested
    for preferred in ("cuda", "mps", "cpu"):
        if preferred in supported and preferred in host_devices():
            return preferred
    return "cpu"


def _backend_version(backend: str) -> str:
    if backend == "onnxruntime":
        try:
            import onnxruntime  # type: ignore

            return onnxruntime.__version__
        except ImportError:
            return "not_installed"
    if backend == "pytorch":
        try:
            import torch  # type: ignore

            return torch.__version__
        except ImportError:
            return "not_installed"
    return sys.version.split()[0]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
