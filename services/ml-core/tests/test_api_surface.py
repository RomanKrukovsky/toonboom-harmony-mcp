"""API-surface tests for ml-core.

The perception-stack suite covers config paths, hardware, registries, the job
manager and provider availability. This module closes the remaining gaps that
had no coverage at all: the FastAPI endpoints, the path allowlist enforcement
that guards every job-submitting endpoint, and the manifest/dataset schemas.

These tests never execute real inference: model weights may be absent, so all
assertions target request validation, job bookkeeping and error contracts.
"""

import pytest
from fastapi.testclient import TestClient

from ml_core.api import app
from ml_core.config import ROOT_DIR, verify_path_access

client = TestClient(app)


# --- health & read-only endpoints -------------------------------------------------

def test_health_reports_service_metadata():
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body.get("status") in {"ok", "healthy", "ready"}


def test_system_endpoint_exposes_hardware_profile():
    res = client.get("/v1/ml/system")
    assert res.status_code == 200
    body = res.json()
    assert body["os"] in {"darwin", "linux", "windows"}
    assert body["architecture"] in {"arm64", "x86_64", "amd64"}


def test_models_endpoint_lists_registered_models():
    res = client.get("/v1/ml/models")
    assert res.status_code == 200
    models = res.json()
    assert isinstance(models, list)
    assert len(models) >= 4
    assert all("modelId" in m or "id" in m for m in models)


def test_datasets_endpoint_returns_registered_datasets():
    res = client.get("/v1/ml/datasets")
    assert res.status_code == 200
    body = res.json()
    assert isinstance(body, dict)
    assert isinstance(body["datasets"], list)
    for dataset in body["datasets"]:
        assert dataset["datasetId"]


# --- path allowlist enforcement --------------------------------------------------

OUTSIDE_PATH = "/etc/passwd"


def test_verify_path_access_accepts_paths_inside_project_root():
    resolved = verify_path_access(str(ROOT_DIR / "output" / "probe.mp4"))
    assert str(resolved).startswith(str(ROOT_DIR))


def test_verify_path_access_rejects_paths_outside_allowed_roots():
    with pytest.raises(ValueError):
        verify_path_access(OUTSIDE_PATH)


@pytest.mark.parametrize(
    "endpoint,payload",
    [
        ("/v1/ml/segment", {"videoPath": OUTSIDE_PATH}),
        ("/v1/ml/pose", {"videoPath": OUTSIDE_PATH}),
        ("/v1/ml/track/points", {"videoPath": OUTSIDE_PATH, "queryPoints": []}),
        ("/v1/ml/transcribe", {"audioPath": OUTSIDE_PATH}),
        ("/v1/ml/perceive-video", {"videoPath": OUTSIDE_PATH, "tasks": ["pose"]}),
    ],
)
def test_job_endpoints_refuse_paths_outside_the_allowlist(endpoint, payload):
    """Every job-submitting endpoint must run verify_path_access before queueing."""
    with pytest.raises(ValueError):
        client.post(endpoint, json=payload)


@pytest.mark.parametrize(
    "endpoint,payload",
    [
        ("/v1/ml/segment", {}),
        ("/v1/ml/pose", {}),
        ("/v1/ml/transcribe", {}),
        ("/v1/ml/track/points", {"videoPath": "x.mp4"}),
    ],
)
def test_job_endpoints_validate_required_fields(endpoint, payload):
    res = client.post(endpoint, json=payload)
    assert res.status_code == 422


# --- job lifecycle over HTTP -----------------------------------------------------

def test_unknown_job_returns_404():
    res = client.get("/v1/ml/jobs/does-not-exist")
    assert res.status_code == 404


def test_cancelling_unknown_job_returns_404():
    res = client.post("/v1/ml/jobs/does-not-exist/cancel")
    assert res.status_code == 404


def test_artifacts_for_unknown_job_returns_404():
    res = client.get("/v1/ml/jobs/does-not-exist/artifacts")
    assert res.status_code == 404


def test_pose_job_is_queued_and_readable_for_an_allowed_path(tmp_path):
    video = ROOT_DIR / "output" / "ml_core_api_test_probe.mp4"
    video.parent.mkdir(parents=True, exist_ok=True)
    video.write_bytes(b"not a real video")
    try:
        res = client.post("/v1/ml/pose", json={"videoPath": str(video)})
        assert res.status_code == 200
        job = res.json()
        assert job["jobId"]
        # The job must be immediately retrievable — bookkeeping happens before
        # the background task runs, so this holds even without model weights.
        follow_up = client.get(f"/v1/ml/jobs/{job['jobId']}")
        assert follow_up.status_code == 200
        assert follow_up.json()["jobId"] == job["jobId"]
    finally:
        video.unlink(missing_ok=True)


# --- manifest & dataset schemas --------------------------------------------------

def test_pose_manifest_roundtrips():
    from ml_core.manifests import PoseFrame, PoseSequence, Point3D, ProvenanceInfo

    seq = PoseSequence(
        modelId="mediapipe_pose_heavy",
        frameCount=1,
        fps=24.0,
        poses=[PoseFrame(frame=0, landmarks={"nose": Point3D(x=0.5, y=0.4)})],
        provenance=ProvenanceInfo(
            backend="mediapipe",
            device="cpu",
            precision="fp32",
            timestamp="2026-08-05T00:00:00Z",
        ),
    )
    restored = PoseSequence.model_validate(seq.model_dump())
    assert restored.poses[0].landmarks["nose"].x == 0.5
    # Defaults must survive a roundtrip so downstream consumers can rely on them.
    assert restored.poses[0].landmarks["nose"].visibility == 1.0
    assert restored.schemaVersion == "1.0"


def test_manifest_rejects_missing_required_fields():
    from pydantic import ValidationError
    from ml_core.manifests import PoseFrame

    with pytest.raises(ValidationError):
        PoseFrame()


def test_dataset_registry_definitions_are_wellformed():
    from ml_core.dataset_registry import DatasetRegistry

    registry = DatasetRegistry()
    datasets = registry.list_datasets()
    assert isinstance(datasets, list)
    for dataset in datasets:
        # Definitions come back as pydantic models or plain dicts depending on
        # the registry backend; both must carry a stable identifier.
        identifier = (
            dataset.get("datasetId") if isinstance(dataset, dict) else getattr(dataset, "datasetId", None)
        )
        assert identifier
