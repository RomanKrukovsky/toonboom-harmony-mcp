"""Tests for the content-addressed result cache.

Before this existed, every job re-decoded the video and re-ran inference even
when the identical clip was submitted again — and the API's `cacheHit` field was
hardcoded to False because there was no cache at all.

Correctness matters more than speed here: a cache that serves a stale result for
changed input is worse than no cache. These tests pin down hit/miss semantics.
"""

import json

import pytest

from ml_core import result_cache


@pytest.fixture(autouse=True)
def isolated_cache(tmp_path, monkeypatch):
    """Point the cache at a temp dir so tests never touch real entries."""
    monkeypatch.setattr(result_cache, "CACHE_DIR", tmp_path / "results")
    yield


@pytest.fixture
def media(tmp_path):
    path = tmp_path / "clip.mp4"
    path.write_bytes(b"FAKE_VIDEO_CONTENT")
    return path


RESULT = {"realInferenceExecuted": True, "frames": 42}


# --- basic hit / miss -----------------------------------------------------------

def test_miss_on_empty_cache(media):
    assert result_cache.lookup(media, "pose_estimation", "m1") is None


def test_hit_after_store(media):
    result_cache.store(media, "pose_estimation", RESULT, "m1")
    assert result_cache.lookup(media, "pose_estimation", "m1") == RESULT


def test_different_task_is_a_miss(media):
    result_cache.store(media, "pose_estimation", RESULT, "m1")
    assert result_cache.lookup(media, "segmentation", "m1") is None


def test_different_model_is_a_miss(media):
    result_cache.store(media, "pose_estimation", RESULT, "m1")
    assert result_cache.lookup(media, "pose_estimation", "m2") is None


def test_different_params_is_a_miss(media):
    result_cache.store(media, "point_tracking", RESULT, "m1", {"queryPoints": [1]})
    assert result_cache.lookup(media, "point_tracking", "m1", {"queryPoints": [2]}) is None


def test_param_order_does_not_affect_the_key(media):
    result_cache.store(media, "t", RESULT, "m1", {"a": 1, "b": 2})
    assert result_cache.lookup(media, "t", "m1", {"b": 2, "a": 1}) == RESULT


# --- content addressing ---------------------------------------------------------

def test_edited_file_is_a_miss(media):
    """Same path, changed bytes: the old result must NOT be served."""
    result_cache.store(media, "pose_estimation", RESULT, "m1")
    media.write_bytes(b"DIFFERENT_CONTENT_ENTIRELY")
    assert result_cache.lookup(media, "pose_estimation", "m1") is None


def test_renamed_copy_still_hits(tmp_path, media):
    """Identical bytes under a new name should reuse the work."""
    result_cache.store(media, "pose_estimation", RESULT, "m1")
    copy = tmp_path / "renamed.mp4"
    copy.write_bytes(media.read_bytes())
    assert result_cache.lookup(copy, "pose_estimation", "m1") == RESULT


def test_missing_file_is_a_miss_not_an_error(tmp_path):
    """A cache must never break the pipeline."""
    assert result_cache.lookup(tmp_path / "nope.mp4", "t", "m") is None
    assert result_cache.store(tmp_path / "nope.mp4", "t", RESULT, "m") is None


# --- degraded results must not become sticky ------------------------------------

def test_degraded_results_are_not_cached(media):
    """Caching a degraded run would outlive the missing dependency."""
    degraded = {"realInferenceExecuted": False, "status": "degraded"}
    assert result_cache.store(media, "transcription", degraded, "m1") is None
    assert result_cache.lookup(media, "transcription", "m1") is None


# --- robustness -----------------------------------------------------------------

def test_corrupt_entry_is_treated_as_a_miss(media):
    key = result_cache.store(media, "t", RESULT, "m1")
    assert key is not None
    entry = result_cache.CACHE_DIR / key[:2] / f"{key}.json"
    entry.write_text("{ this is not valid json", encoding="utf-8")
    assert result_cache.lookup(media, "t", "m1") is None


def test_tampered_digest_is_rejected(media):
    key = result_cache.store(media, "t", RESULT, "m1")
    entry = result_cache.CACHE_DIR / key[:2] / f"{key}.json"
    payload = json.loads(entry.read_text())
    payload["inputDigest"] = "0" * 64
    entry.write_text(json.dumps(payload), encoding="utf-8")
    assert result_cache.lookup(media, "t", "m1") is None


def test_schema_version_bump_invalidates(media, monkeypatch):
    result_cache.store(media, "t", RESULT, "m1")
    monkeypatch.setattr(result_cache, "CACHE_SCHEMA_VERSION", "999")
    assert result_cache.lookup(media, "t", "m1") is None


def test_no_temp_files_left_behind(media):
    result_cache.store(media, "t", RESULT, "m1")
    assert list(result_cache.CACHE_DIR.rglob("*.tmp")) == []


# --- maintenance ----------------------------------------------------------------

def test_stats_and_clear(media):
    assert result_cache.stats()["entries"] == 0
    result_cache.store(media, "a", RESULT, "m1")
    result_cache.store(media, "b", RESULT, "m1")
    stats = result_cache.stats()
    assert stats["entries"] == 2
    assert stats["sizeBytes"] > 0

    assert result_cache.clear() == 2
    assert result_cache.stats()["entries"] == 0
