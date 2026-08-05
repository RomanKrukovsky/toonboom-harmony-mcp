"""Harmony ML Runtime — versioned provider architecture.

Every model is reached through one endpoint, `/v2/jobs`, dispatched by `runtime.ProviderRegistry`
and executed by `runtime.JobManager`. The pre-existing `/jobs/execute`, `/infer/animeinbet` and
`/infer/voxcpm` endpoints remain as **deprecated adapters**: they translate an old request into a
V2 job and return the old response shape. They contain no inference logic of their own, so there
is exactly one code path per model.

Network posture: the default bind is `127.0.0.1`. Listening on an external interface requires
`ML_RUNTIME_ALLOW_REMOTE=true` *and* an API key, and the process refuses to start otherwise —
a runtime that loads arbitrary checkpoints and reads local files must not be reachable by
default.
"""

from __future__ import annotations

import logging
import os
import sys
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Request
from pydantic import BaseModel

RUNTIME_ROOT = Path(__file__).resolve().parent
if str(RUNTIME_ROOT) not in sys.path:
    sys.path.insert(0, str(RUNTIME_ROOT))

from config import CONFIG  # noqa: E402
from runtime.artifact_store import ArtifactStore  # noqa: E402
from runtime.hardware_probe import probe as probe_hardware  # noqa: E402
from runtime.job_manager import JobManager  # noqa: E402
from runtime.model_loader import MODEL_LOADER  # noqa: E402
from runtime.provider_registry import build_default_registry  # noqa: E402
from runtime.security import redact  # noqa: E402
from schemas import (  # noqa: E402
    InbetweenRequest,
    InbetweenResponse,
    MLJobRequest,
    MLJobResponse,
    VoxCPMRequest,
    VoxCPMResponse,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("ml-runtime")

RUNTIME_VERSION = "2.0.0"

app = FastAPI(title="Harmony ML Runtime", version=RUNTIME_VERSION)

REGISTRY = build_default_registry()
STORE = ArtifactStore()
JOBS = JobManager(REGISTRY, STORE)


# --------------------------------------------------------------------------- security --

def require_api_key(request: Request) -> None:
    """Enforced only when the runtime is deliberately exposed beyond loopback."""
    expected = os.environ.get("ML_RUNTIME_API_KEY", "")
    if not _remote_allowed():
        return
    supplied = request.headers.get("x-api-key", "")
    if not expected or supplied != expected:
        raise HTTPException(status_code=401, detail={"code": "ML_UNAUTHORIZED", "message": "valid x-api-key required"})


def _remote_allowed() -> bool:
    return os.environ.get("ML_RUNTIME_ALLOW_REMOTE", "false").lower() == "true"


# ------------------------------------------------------------------------ health/meta --

class HealthResponse(BaseModel):
    status: str
    version: str
    pythonVersion: str


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return HealthResponse(status="ok", version=RUNTIME_VERSION, pythonVersion=sys.version.split()[0])


@app.get("/readiness")
async def readiness_check() -> Dict[str, Any]:
    ready: List[str] = []
    blocked: Dict[str, str] = {}
    for provider_id in REGISTRY.provider_ids():
        state = REGISTRY.readiness(provider_id)
        if state["ready"]:
            ready.append(provider_id)
        else:
            blocked[provider_id] = str(state["blockingReason"])
    return {
        "runtimeReady": True,
        "inferenceReady": bool(ready),
        "status": "ready" if ready else "degraded",
        "readyProviders": ready,
        "blockedProviders": blocked,
    }


@app.get("/metrics")
async def metrics() -> Dict[str, float]:
    hardware = probe_hardware()
    return {
        **JOBS.metrics(),
        "loaded_models": float(len(MODEL_LOADER.loaded_keys())),
        "host_ram_gb": hardware.ramGb,
        "host_free_disk_gb": hardware.freeDiskGb,
    }


@app.get("/v2/hardware")
async def hardware() -> Dict[str, Any]:
    return probe_hardware().to_dict()


@app.get("/v2/providers")
async def list_providers() -> Dict[str, Any]:
    return {"providers": [REGISTRY.readiness(pid) for pid in REGISTRY.provider_ids()]}


@app.get("/v2/models")
async def list_models_v2() -> Dict[str, Any]:
    models: List[Dict[str, Any]] = []
    for provider_id in REGISTRY.provider_ids():
        descriptor = REGISTRY.descriptor(provider_id)
        weights = REGISTRY.verify_weights(provider_id)
        models.append({
            "modelId": descriptor.modelId,
            "revision": descriptor.modelRevision,
            "installed": not weights.missing and bool(weights.resolvedPaths),
            "hashVerified": weights.verified,
            "blockingReason": weights.blockingReason,
        })
    return {"models": models}


@app.post("/v2/models/{model_id}/unload")
async def unload_model(model_id: str, _: None = Depends(require_api_key)) -> Dict[str, Any]:
    unloaded = False
    for provider_id in REGISTRY.provider_ids():
        if REGISTRY.descriptor(provider_id).modelId == model_id:
            unloaded = REGISTRY.unload(provider_id) or unloaded
    return {"unloaded": unloaded, "freedMb": None}


# --------------------------------------------------------------------------- v2 jobs --

@app.post("/v2/artifacts")
async def upload_artifact_v2(payload: Dict[str, Any], _: None = Depends(require_api_key)) -> Dict[str, Any]:
    """Loopback-only artifact upload.

    Lets a TypeScript caller put bytes into the runtime's content-addressed store without
    touching the filesystem. The body is multipart-shaped JSON: bytes are sent base64, the
    store hashes them, and the resulting ArtifactReference is what the caller then sends to
    /v2/jobs. The endpoint is intentionally minimal — bytes only, no streaming, no presigned
    URLs — because the only legitimate client today is the in-process TypeScript orchestrator.
    """
    data_b64 = payload.get("base64")
    namespace = payload.get("namespace") or "ml-jobs"
    relative_path = payload.get("relativePath")
    role = payload.get("role") or "input"
    mime_type = payload.get("mimeType")
    if not data_b64 or not relative_path:
        raise HTTPException(status_code=400, detail={"code": "ML_INPUT_SCHEMA_INVALID", "message": "base64 and relativePath are required"})
    import base64
    try:
        data = base64.b64decode(data_b64, validate=True)
    except Exception as exc:
        raise HTTPException(status_code=400, detail={"code": "ML_INPUT_SCHEMA_INVALID", "message": f"base64 decode failed: {exc}"})
    reference = STORE.put_bytes(namespace, relative_path, data, role, mime_type)
    return reference.to_dict()


@app.post("/v2/jobs")
async def submit_job_v2(request: Dict[str, Any], _: None = Depends(require_api_key)) -> Dict[str, Any]:
    for required in ("idempotencyKey", "taskType", "providerId"):
        if required not in request:
            raise HTTPException(status_code=400, detail={"code": "ML_INPUT_SCHEMA_INVALID", "message": f"missing {required}"})
    logger.info(
        "job submit jobId=%s correlationId=%s providerId=%s taskType=%s stage=submit",
        request.get("jobId"), request.get("correlationId"), request["providerId"], request["taskType"],
    )
    return await JOBS.submit(request)


@app.get("/v2/jobs/{job_id}")
async def get_job_v2(job_id: str) -> Dict[str, Any]:
    result = await JOBS.get(job_id)
    if result is None:
        raise HTTPException(status_code=404, detail={"code": "ML_JOB_NOT_FOUND", "message": f"no job {job_id}"})
    return result


@app.post("/v2/jobs/{job_id}/cancel")
async def cancel_job_v2(job_id: str, _: None = Depends(require_api_key)) -> Dict[str, Any]:
    return await JOBS.cancel(job_id)


# ------------------------------------------------------- deprecated v1 adapters ------
# These exist so nothing that already calls the old shapes breaks. They translate into a V2
# job and translate the answer back. No inference decision is made here.

def _v1_to_v2(request: MLJobRequest) -> Dict[str, Any]:
    parameters = dict(request.parameters)
    image_path = parameters.pop("imagePath", None)
    inputs: List[Dict[str, Any]] = []
    if image_path:
        # The old contract passed a bare filesystem path. Register it as an artifact so the V2
        # path still gets a verified digest rather than trusting the string.
        source = Path(image_path)
        if source.is_file():
            relative = f"legacy/{request.jobId}/{source.name}"
            reference = STORE.put_bytes("ml-jobs", relative, source.read_bytes(), "input_image")
            inputs.append(reference.to_dict())
    parameters.setdefault("inputMode", "image")
    return {
        "schemaVersion": "2.0",
        "jobId": request.jobId,
        "correlationId": request.jobId,
        "idempotencyKey": f"legacy_{request.jobId}_{uuid.uuid4().hex[:12]}",
        "taskType": "pose_estimation",
        "providerId": "dwpose" if request.provider == "dwpose_provider" else request.provider,
        "modelId": request.modelId,
        "modelRevision": "legacy",
        "executionMode": "real_ml",
        "commercialMode": "commercial",
        "inputArtifacts": inputs,
        "parameters": parameters,
        "timeoutMs": 600_000,
        "seed": None,
        "requestedDevice": "auto",
    }


@app.post("/jobs/execute", response_model=MLJobResponse, deprecated=True)
async def execute_job(request: MLJobRequest, req: Request = None) -> MLJobResponse:  # type: ignore[assignment]
    """Deprecated. Use POST /v2/jobs. Kept as a pure translation layer.

    The name and the unused `req` parameter are retained because existing callers and
    `tests/test_runtime_dispatch_truth.py` invoke `app.execute_job(request, None)` directly.
    """
    started = time.perf_counter()
    model_settings = CONFIG.get("models", {}).get(request.modelId, {})
    if not model_settings.get("enabled", False):
        return _legacy_blocked(request, "Model is disabled or its managed weights are unavailable.", "weights_missing_or_disabled")

    v2_request = _v1_to_v2(request)
    if not REGISTRY.has(v2_request["providerId"]):
        return _legacy_blocked(request, f"Provider {request.provider!r} is not connected to a real inference backend.", "unsupported_provider")

    result = await JOBS.submit(v2_request)
    status_map = {"succeeded": "success", "blocked": "blocked", "failed": "failed", "cancelled": "failed", "interrupted": "failed"}
    provenance = result.get("provenance") or {}
    real = bool(provenance.get("realInferenceExecuted", False))
    pir = result.get("normalizedPir") or {}
    frames = pir.get("frames") or []
    no_person = bool(frames) and all(not f.get("keypoints") for f in frames)
    status = "no_person_detected" if (real and no_person) else status_map.get(result["status"], "failed")

    return MLJobResponse(
        jobId=request.jobId,
        provider=request.provider,
        model=request.modelId,
        modelVersion=provenance.get("modelRevision", "unavailable"),
        status=status,
        realInferenceExecuted=real,
        simulated=bool(provenance.get("simulated", False)),
        inputArtifacts=request.inputArtifacts,
        outputArtifacts=[a["relativePath"] for a in result.get("outputArtifacts", [])],
        pirArtifacts=[a["relativePath"] for a in result.get("outputArtifacts", []) if a.get("role") == "normalized_pir"],
        confidence=_mean_confidence(pir) if real else None,
        warnings=result.get("warnings", []),
        errors=[result["error"]["code"]] if result.get("error") else [],
        device=provenance.get("device", "cpu"),
        durationMs=(time.perf_counter() - started) * 1000.0,
        peakMemoryMb=provenance.get("peakMemoryMb"),
        cacheHit=bool(provenance.get("cacheHit", False)),
        provenancePath="",
        executionReportPath="",
        correlationId=request.jobId,
    )


def _legacy_blocked(request: MLJobRequest, reason: str, error_code: str) -> MLJobResponse:
    return MLJobResponse(
        jobId=request.jobId, provider=request.provider, model=request.modelId,
        modelVersion="unavailable", status="blocked", realInferenceExecuted=False, simulated=False,
        inputArtifacts=request.inputArtifacts, outputArtifacts=[], pirArtifacts=[], confidence=None,
        warnings=[reason], errors=[error_code], device="cpu", durationMs=0.0, peakMemoryMb=None,
        cacheHit=False, provenancePath="", executionReportPath="", correlationId=request.jobId,
    )


def _mean_confidence(pir: Dict[str, Any]) -> Optional[float]:
    scores = [kp["confidence"] for frame in pir.get("frames", []) for kp in frame.get("keypoints", []) if not kp.get("interpolated")]
    return sum(scores) / len(scores) if scores else None


@app.post("/jobs/cancel/{job_id}", deprecated=True)
async def cancel_job_legacy(job_id: str) -> Dict[str, Any]:
    """Deprecated. Use POST /v2/jobs/{jobId}/cancel."""
    outcome = await JOBS.cancel(job_id)
    if not outcome["cancelled"] and outcome["status"] == "not_found":
        return {"status": "not_found", "jobId": job_id}
    return {"status": "cancelled", "jobId": job_id}


@app.post("/infer/animeinbet", response_model=InbetweenResponse, deprecated=True)
async def infer_animeinbet(req: InbetweenRequest) -> InbetweenResponse:
    """Deprecated. AnimeInbet has no registered V2 provider: its weights are not installed and
    its licence has not been cleared, so this refuses instead of returning a fabricated result."""
    raise HTTPException(
        status_code=412,
        detail={
            "code": "ML_MODEL_NOT_INSTALLED",
            "message": "AnimeInbet is catalogued but not installed and its licence is legal_review_required. "
                       "Register a V2 provider and clear the licence before calling this.",
        },
    )


@app.post("/infer/voxcpm", response_model=VoxCPMResponse, deprecated=True)
async def infer_voxcpm(req: VoxCPMRequest) -> VoxCPMResponse:
    """Deprecated. VoxCPM must go through the TtsProvider interface with a consent artifact."""
    raise HTTPException(
        status_code=412,
        detail={
            "code": "ML_CONSENT_MISSING",
            "message": "Speech synthesis now runs through the V2 TTS provider contract, which requires an "
                       "explicit voice mode and, for cloning, a ConsentArtifact. Use POST /v2/jobs.",
        },
    )


# ------------------------------------------------------------------------ entrypoint --

def resolve_bind() -> tuple[str, int]:
    """Loopback by default. Exposing the runtime is an explicit, authenticated decision."""
    port = int(os.environ.get("ML_RUNTIME_PORT", "8000"))
    if not _remote_allowed():
        return "127.0.0.1", port
    if not os.environ.get("ML_RUNTIME_API_KEY"):
        raise SystemExit(
            "ML_RUNTIME_ALLOW_REMOTE=true requires ML_RUNTIME_API_KEY. A runtime that loads "
            "checkpoints and reads local files must not listen on an external interface unauthenticated."
        )
    host = os.environ.get("ML_RUNTIME_HOST", "0.0.0.0")
    logger.warning("ML runtime is binding to %s: ensure TLS termination or a trusted closed network", redact(host))
    return host, port


if __name__ == "__main__":
    bind_host, bind_port = resolve_bind()
    uvicorn.run(app, host=bind_host, port=bind_port)
