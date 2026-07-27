"""
Sprint 1 — Speech timing provider tests.

These tests prove the blocked semantics: when WhisperX weights or the whisperx package are
absent, the provider returns an honest blocked sequence rather than fabricating one word or
one phone timestamp. They can never claim real inference by construction, because no weights
ship with the repository and the whisperx python package is not listed as a dependency.

The contract is enforced twice:

  1. The returned SpeechTimingSequence parses against the Pydantic schema.
  2. Its `provenance.realInferenceExecuted` is False, `sourceKind='blocked'`, words=[],
     phonemes=[], pauses=[], speechRateWpm=0.0, and warnings is non-empty.
"""

from __future__ import annotations

import sys
import pathlib
from pathlib import Path

import pytest

RUNTIME_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = RUNTIME_ROOT.parent.parent
sys.path.insert(0, str(RUNTIME_ROOT))

from pipelines.speech_timing_schema import (  # noqa: E402
    SpeechTimingSequence,
    SPEECH_TIMING_SCHEMA_VERSION,
)
from providers.whisperx_provider import (  # noqa: E402
    DEFAULT_WHISPER_MODEL,
    WHISPER_DIR,
    transcribe_audio,
)


def _has_whisper_weights() -> bool:
    return any((WHISPER_DIR / DEFAULT_WHISPER_MODEL).glob("*.pt")) if (WHISPER_DIR / DEFAULT_WHISPER_MODEL).exists() else False


def test_blocked_when_audio_file_missing():
    seq = transcribe_audio(Path("does/not/exist.wav"))
    assert isinstance(seq, SpeechTimingSequence)
    assert seq.schemaVersion == SPEECH_TIMING_SCHEMA_VERSION
    assert seq.sourceKind == "blocked"
    assert seq.provenance.realInferenceExecuted is False
    assert seq.words == []
    assert seq.pauses == []
    assert seq.phonemes == []
    assert seq.speechRateWpm == 0.0
    assert seq.sourcePath is None
    assert seq.warnings, "blocked sequence must declare the blocking reason"
    assert "audio file not found" in seq.warnings[0]


def test_blocked_when_weights_dir_missing(tmp_path, monkeypatch):
    # Provide a tiny empty "audio" file so the weights path is the only blocker.
    audio = tmp_path / "clip.wav"
    audio.write_bytes(b"RIFF\x00\x00\x00\x00WAVE")

    # Point WhisperX to a clearly-empty directory.
    monkeypatch.setenv("HARMONY_WHISPER_MODEL_PATH", str(tmp_path / "missing.pt"))
    seq = transcribe_audio(audio)
    assert seq.sourceKind == "blocked"
    assert seq.provenance.realInferenceExecuted is False
    assert "HARMONY_WHISPER_MODEL_PATH=" in seq.warnings[0]
    assert "missing.pt" in seq.warnings[0]


def test_blocked_when_weights_dir_unset_and_no_managed_weights(tmp_path, monkeypatch):
    audio = tmp_path / "clip.wav"
    audio.write_bytes(b"RIFF\x00\x00\x00\x00WAVE")
    monkeypatch.delenv("HARMONY_WHISPER_MODEL_PATH", raising=False)
    monkeypatch.delenv("HF_HOME", raising=False)
    monkeypatch.delenv("HF_HUB_CACHE", raising=False)
    if _has_whisper_weights():
        pytest.skip("Managed WhisperX weights are present in this checkout; blocked path unavailable here.")
    seq = transcribe_audio(audio)
    assert seq.sourceKind == "blocked"
    assert seq.provenance.realInferenceExecuted is False
    assert "WhisperX weights" in seq.warnings[0]
    assert "services/ml-runtime/weights/whisperx" in seq.warnings[0]


def test_blocked_sequence_has_no_absolute_user_paths():
    audio = Path("does/not/exist.wav")
    seq = transcribe_audio(audio)
    blob = seq.model_dump_json()
    assert "/Users/" not in blob
    assert "/home/" not in blob