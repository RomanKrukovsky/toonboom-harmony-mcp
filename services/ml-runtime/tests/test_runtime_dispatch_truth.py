from __future__ import annotations

import asyncio
import sys
from pathlib import Path

RUNTIME_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RUNTIME_ROOT))

import app as runtime_app  # noqa: E402
from schemas import MLJobRequest, MLJobResponse  # noqa: E402


def test_enabled_unknown_provider_is_blocked_without_fake_measurements(monkeypatch):
    monkeypatch.setattr(
        runtime_app,
        "CONFIG",
        {"models": {"unknown-model": {"enabled": True}}},
    )
    request = MLJobRequest(
        jobId="truth-check",
        provider="unknown_provider",
        modelId="unknown-model",
        inputArtifacts=[],
        parameters={},
    )

    response = asyncio.run(runtime_app.execute_job(request, None))

    assert isinstance(response, MLJobResponse)
    assert response.status == "blocked"
    assert response.realInferenceExecuted is False
    assert response.simulated is False
    assert response.confidence is None
    assert response.peakMemoryMb is None
    assert response.outputArtifacts == []
    assert response.errors == ["unsupported_provider"]


def test_schema_rejects_success_without_real_inference():
    try:
        MLJobResponse(
            jobId="false-success",
            provider="unknown_provider",
            model="unknown-model",
            modelVersion="unknown",
            status="success",
            realInferenceExecuted=False,
            simulated=False,
            inputArtifacts=[],
            outputArtifacts=[],
            pirArtifacts=[],
            confidence=None,
            warnings=[],
            errors=[],
            device="cpu",
            durationMs=0,
            peakMemoryMb=None,
            cacheHit=False,
            provenancePath="",
            executionReportPath="",
            correlationId="false-success",
        )
    except ValueError:
        return

    raise AssertionError("MLJobResponse accepted status=success with realInferenceExecuted=false")
