"""Tests for model-registry honesty.

The registry previously granted `status="ready"`, `installed=True` and
`inferenceVerified=True` on request, without downloading, hashing or executing
anything — one POST turned a non-existent model into a verified one. Three of the
four default entries also carried invented SHA-256 digests
(`...cf8cf8cf8cf8cf8`), which is worse than none: it looks verifiable while
guaranteeing a mismatch.

Invariants locked in here:
  * no fabricated checksums ship in the defaults;
  * `ready` requires file present + checksum match + a successful inference probe;
  * a tampered file is detected;
  * claims are revoked when the filesystem stops supporting them;
  * downloads never happen implicitly.
"""

import json

import pytest

from ml_core.model_registry import ModelRegistry, RegistryError


@pytest.fixture
def registry(tmp_path, monkeypatch):
    """Registry rooted in a temp dir so tests never touch real checkpoints."""
    model_root = tmp_path / "models"
    model_root.mkdir()
    monkeypatch.setattr("ml_core.model_registry.MODEL_ROOT", model_root)
    return ModelRegistry(registry_dir=tmp_path / "registry")


def _write_checkpoint(registry, model_id, payload=b"WEIGHTS"):
    model = registry.get_model(model_id)
    path = registry.resolved_path(model)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(payload)
    return path


# --- defaults must not lie ------------------------------------------------------

def test_no_fabricated_checksums_in_defaults(registry):
    """Placeholder digests like '...cf8cf8cf8' must not exist."""
    for model in registry.list_models():
        digest = model.checkpointSha256
        if digest is None:
            continue
        assert len(digest) == 64, f"{model.modelId} has a malformed digest"
        assert "cf8cf8cf8" not in digest, f"{model.modelId} ships a fake digest"
        assert "92419241" not in digest, f"{model.modelId} ships a fake digest"
        int(digest, 16)  # must be real hex


def test_defaults_start_not_installed(registry):
    for model in registry.list_models():
        assert model.status == "not_installed"
        assert model.installed is False
        assert model.inferenceVerified is False


def test_checkpoint_paths_are_portable(registry, tmp_path):
    """Persisted paths must not hardcode a developer's home directory."""
    registry.save()
    raw = json.loads((tmp_path / "registry" / "models.json").read_text())
    for model_id, entry in raw.items():
        path = entry.get("checkpointPath")
        if path:
            assert not path.startswith("/Users/"), f"{model_id} embeds an absolute path"


# --- install --------------------------------------------------------------------

def test_install_refuses_when_file_absent_and_downloads_disabled(registry):
    with pytest.raises(RegistryError):
        registry.install("sam2.1_hiera_tiny")
    model = registry.get_model("sam2.1_hiera_tiny")
    assert model.status == "not_installed"
    assert model.installed is False
    assert model.inferenceVerified is False


def test_install_never_downloads_implicitly(registry, monkeypatch):
    """A status request must not trigger a multi-GB fetch."""
    def explode(*args, **kwargs):
        raise AssertionError("install attempted a download without allow_download")

    monkeypatch.setattr("ml_core.model_registry.urllib.request.urlopen", explode)
    with pytest.raises(RegistryError):
        registry.install("sam2.1_hiera_tiny")


def test_install_adopts_existing_file_but_does_not_claim_verified(registry):
    _write_checkpoint(registry, "sam2.1_hiera_tiny")
    model = registry.install("sam2.1_hiera_tiny")
    assert model.installed is True
    assert model.observedSha256 and len(model.observedSha256) == 64
    assert model.sizeBytes > 0
    # Present is not verified.
    assert model.status == "installed_unverified"
    assert model.inferenceVerified is False


def test_install_detects_tampered_file(registry):
    """whisper_base has a real published digest, so a wrong file must be caught."""
    _write_checkpoint(registry, "whisper_base", b"NOT_THE_REAL_WEIGHTS")
    with pytest.raises(RegistryError):
        registry.install("whisper_base")
    model = registry.get_model("whisper_base")
    assert model.status == "checksum_mismatch"
    assert model.inferenceVerified is False
    assert "mismatch" in (model.statusDetail or "").lower()


# --- verify ---------------------------------------------------------------------

def test_verify_without_probe_cannot_reach_ready(registry):
    _write_checkpoint(registry, "sam2.1_hiera_tiny")
    registry.install("sam2.1_hiera_tiny")
    model = registry.verify("sam2.1_hiera_tiny", probe=None)
    assert model.status == "installed_unverified"
    assert model.inferenceVerified is False


def test_verify_with_successful_probe_reaches_ready(registry):
    _write_checkpoint(registry, "sam2.1_hiera_tiny")
    registry.install("sam2.1_hiera_tiny")
    model = registry.verify("sam2.1_hiera_tiny", probe=lambda: True)
    assert model.status == "ready"
    assert model.importVerified is True
    assert model.inferenceVerified is True
    assert model.averageLatencyMs >= 0.0


def test_verify_with_failing_probe_records_failure(registry):
    _write_checkpoint(registry, "sam2.1_hiera_tiny")
    registry.install("sam2.1_hiera_tiny")
    with pytest.raises(RegistryError):
        registry.verify(
            "sam2.1_hiera_tiny",
            probe=lambda: (_ for _ in ()).throw(RuntimeError("sam2 package missing")),
        )
    model = registry.get_model("sam2.1_hiera_tiny")
    assert model.status == "failed"
    assert model.inferenceVerified is False


def test_verify_with_falsy_probe_is_degraded_not_ready(registry):
    _write_checkpoint(registry, "sam2.1_hiera_tiny")
    registry.install("sam2.1_hiera_tiny")
    model = registry.verify("sam2.1_hiera_tiny", probe=lambda: False)
    assert model.status == "degraded"
    assert model.inferenceVerified is False


def test_verify_refuses_when_file_absent(registry):
    with pytest.raises(RegistryError):
        registry.verify("sam2.1_hiera_tiny", probe=lambda: True)
    assert registry.get_model("sam2.1_hiera_tiny").status == "not_installed"


# --- state cannot outlive the filesystem ----------------------------------------

def test_ready_is_revoked_when_checkpoint_disappears(registry, tmp_path, monkeypatch):
    path = _write_checkpoint(registry, "sam2.1_hiera_tiny")
    registry.install("sam2.1_hiera_tiny")
    assert registry.verify("sam2.1_hiera_tiny", probe=lambda: True).status == "ready"

    path.unlink()
    monkeypatch.setattr("ml_core.model_registry.MODEL_ROOT", registry.resolved_path(
        registry.get_model("sam2.1_hiera_tiny")
    ).parent.parent)
    reloaded = ModelRegistry(registry_dir=tmp_path / "registry")
    model = reloaded.get_model("sam2.1_hiera_tiny")
    assert model.status == "not_installed"
    assert model.installed is False
    assert model.inferenceVerified is False
    assert "missing" in (model.statusDetail or "").lower()


def test_unknown_model_raises(registry):
    with pytest.raises(RegistryError):
        registry.install("no-such-model")
    with pytest.raises(RegistryError):
        registry.verify("no-such-model")
