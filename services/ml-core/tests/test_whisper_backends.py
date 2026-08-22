"""Tests for Whisper backend selection.

The provider used to hardcode `base` on CPU fp32 even when far better weights
were already cached on disk, and it reported `device: "cpu"` unconditionally.
These tests lock in the fixed behaviour:

  * the best locally available model is chosen automatically;
  * nothing is ever downloaded implicitly — selection is limited to what is
    already on disk and importable;
  * the reported backend/size/device reflect what actually ran, so a caller can
    tell a `tiny` CPU run from a `large-v3-turbo` Metal run;
  * `phonemes` stays empty (word timings are not phonemes).
"""

import subprocess
import shutil

import numpy as np
import pytest

from ml_core.providers.whisper_provider import (
    QUALITY_RANK,
    WhisperTranscriptionProvider,
)

SR = 16000


def _write_tone(path, duration=0.4):
    import soundfile as sf
    t = np.linspace(0, duration, int(SR * duration), endpoint=False)
    sf.write(str(path), (0.3 * np.sin(2 * np.pi * 440 * t)).astype(np.float32), SR)
    return path


@pytest.fixture(scope="module")
def spoken_wav(tmp_path_factory):
    """Real speech via macOS `say`, or skip when unavailable."""
    if not (shutil.which("say") and shutil.which("ffmpeg")):
        pytest.skip("`say`/`ffmpeg` not available to synthesise speech")
    out = tmp_path_factory.mktemp("speech")
    aiff, wav = out / "s.aiff", out / "s.wav"
    subprocess.run(
        ["say", "-o", str(aiff), "Animation requires precise mouth timing"], check=True
    )
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(aiff), "-ar", str(SR), "-ac", "1", str(wav)],
        capture_output=True, check=True,
    )
    return wav


# --- discovery ------------------------------------------------------------------

def test_inventory_reports_all_backends_and_cached_sizes():
    inventory = WhisperTranscriptionProvider().describe_available()
    for key in (
        "backends",
        "openaiCachedSizes",
        "mlxCachedSizes",
        "fasterWhisperCachedSizes",
    ):
        assert key in inventory
        assert isinstance(inventory[key], list)


def test_availability_requires_a_backend():
    provider = WhisperTranscriptionProvider()
    assert provider.check_availability() == bool(provider._available_backends())


def test_auto_selection_prefers_the_best_cached_model():
    """Auto mode must not settle for a worse model than what is on disk."""
    provider = WhisperTranscriptionProvider("whisper_auto")
    if not provider.load_model():
        pytest.skip("no whisper backend installed")

    inventory = provider.describe_available()
    reachable = set()
    if "mlx-whisper" in inventory["backends"]:
        reachable |= set(inventory["mlxCachedSizes"])
    if "faster-whisper" in inventory["backends"]:
        reachable |= set(inventory["fasterWhisperCachedSizes"])
    if "openai-whisper" in inventory["backends"]:
        reachable |= set(inventory["openaiCachedSizes"])

    assert provider.resolved_size in reachable
    best = next(s for s in QUALITY_RANK if s in reachable)
    assert provider.resolved_size == best, (
        f"selected {provider.resolved_size} while {best} was available"
    )


def test_explicit_size_request_is_honoured_when_cached():
    provider = WhisperTranscriptionProvider("whisper_tiny")
    if not provider.load_model():
        pytest.skip("no whisper backend installed")
    inventory = provider.describe_available()
    if "tiny" in inventory["openaiCachedSizes"] and "openai-whisper" in inventory["backends"]:
        assert provider.resolved_size == "tiny"


def test_unknown_size_falls_back_instead_of_failing():
    """A bogus size must degrade to auto-selection, not crash."""
    provider = WhisperTranscriptionProvider("whisper_nonexistent-size")
    if not provider.load_model():
        pytest.skip("no whisper backend installed")
    assert provider.resolved_size in set(QUALITY_RANK)


# --- reporting honesty ----------------------------------------------------------

def test_provenance_reports_the_backend_that_actually_ran(spoken_wav):
    provider = WhisperTranscriptionProvider("whisper_auto")
    if not provider.load_model():
        pytest.skip("no whisper backend installed")

    result = provider.run_inference({"audioPath": str(spoken_wav)})
    assert result["realInferenceExecuted"] is True
    assert result["backend"] == provider.backend
    assert result["whisperSize"] == provider.resolved_size
    assert result["provenance"]["backend"] == provider.backend
    # Device must not be hardcoded: an MLX run reports Metal, not cpu.
    assert result["provenance"]["device"] == provider.device
    if provider.backend == "mlx-whisper":
        assert provider.device == "gpu_metal"


def test_transcription_produces_word_timings(spoken_wav):
    provider = WhisperTranscriptionProvider("whisper_auto")
    if not provider.load_model():
        pytest.skip("no whisper backend installed")

    result = provider.run_inference({"audioPath": str(spoken_wav)})
    assert result["transcript"].strip()
    assert result["words"], "no word-level timings returned"
    for word in result["words"]:
        assert word["end"] >= word["start"]
        assert 0.0 <= word["confidence"] <= 1.0
    # Timings must be ordered.
    starts = [w["start"] for w in result["words"]]
    assert starts == sorted(starts)


def test_never_emits_phonemes(spoken_wav):
    """Word timings are not phonemes; inventing them broke lip-sync before."""
    provider = WhisperTranscriptionProvider("whisper_auto")
    if not provider.load_model():
        pytest.skip("no whisper backend installed")
    result = provider.run_inference({"audioPath": str(spoken_wav)})
    assert result["phonemes"] == []


def test_degraded_mode_returns_no_invented_transcript(tmp_path):
    """An unloaded provider must return empty text, not a plausible fake."""
    provider = WhisperTranscriptionProvider("whisper_auto")
    # Deliberately not calling load_model().
    result = provider.run_inference({"audioPath": str(_write_tone(tmp_path / "t.wav"))})
    assert result["realInferenceExecuted"] is False
    assert result["transcript"] == ""
    assert result["words"] == []
    assert result["status"] == "degraded_audio_metrics_only"
    # Real measurements are still reported.
    assert result["durationSeconds"] > 0
    assert result["energySamples"]


def test_audio_metrics_are_measured_not_stubbed(tmp_path):
    """Loud and quiet inputs must produce different measured energy."""
    import soundfile as sf
    loud, quiet = tmp_path / "loud.wav", tmp_path / "quiet.wav"
    t = np.linspace(0, 0.5, int(SR * 0.5), endpoint=False)
    sf.write(str(loud), (0.8 * np.sin(2 * np.pi * 300 * t)).astype(np.float32), SR)
    sf.write(str(quiet), (0.02 * np.sin(2 * np.pi * 300 * t)).astype(np.float32), SR)

    provider = WhisperTranscriptionProvider("whisper_auto")
    a = provider.run_inference({"audioPath": str(loud)})
    b = provider.run_inference({"audioPath": str(quiet)})
    assert a["peakRms"] > b["peakRms"]
