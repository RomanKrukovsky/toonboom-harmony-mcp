"""
Sprint 1 — Speech timing sequence schema.

A SpeechTimingSequence carries what was actually measured by an aligned speech-fit pass.
The schema is intentionally narrower than WhisperX's raw output:

  * `words[]` carries every word timestamp that was obtained. Word intervals MUST be
    non-overlapping and cover the speech segment; gaps between words are recorded
    explicitly as `pauses[]`, never silently absorbed into word boundaries.
  * `phonemes[]` carries every phone alignment (Montreal Forced Aligner or compatible).
    Absent when MFA did not run.
  * `speechRateWpm` is the measured rate over the analysed span, not a hard-coded value.
  * `provenance.realInferenceExecuted` is False on every blocked path. The capability
    registry MUST NOT cite a sequence with false here as evidence.

A blocked sequence has zero words, zero pauses, zero phonemes and a non-empty warnings
list. This is deliberately distinct from a successful run over silence (which would have
zero words because the audio contained no speech), because the schema also records
`sourceKind='blocked'` so consumers cannot conflate the two.
"""

from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field, model_validator

SPEECH_TIMING_SCHEMA_VERSION = "1.0.0"


class TimedInterval(BaseModel):
    startSeconds: float = Field(..., ge=0.0)
    endSeconds: float = Field(..., gt=0.0)

    def __init__(self, **data):  # noqa: D401 - validate monotonic span at construction
        super().__init__(**data)
        if self.endSeconds <= self.startSeconds:
            raise ValueError(
                f"TimedInterval endSeconds<=startSeconds: {self.startSeconds}->{self.endSeconds}"
            )


class TimedWord(TimedInterval):
    text: str = Field(..., min_length=1, description="Word token; stripped of whitespace.")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Measured alignment score, never hardcoded.")
    speaker: Optional[str] = Field(None, description="Speaker tag when diarization ran; null otherwise.")
    language: Optional[str] = Field(None, description="ISO-639-1 language code if the recognizer emitted one.")


class TimedPhoneme(TimedInterval):
    phone: str = Field(..., min_length=1, description="MFA phone symbol (X-SAMPA compatible).")
    wordIndex: int = Field(..., ge=0, description="Index into words[] that owns this phone, when available.")

    def __init__(self, **data):  # noqa: D401
        super().__init__(**data)
        if self.wordIndex < 0:
            raise ValueError("wordIndex must be non-negative")


class Pause(BaseModel):
    startSeconds: float = Field(..., ge=0.0)
    endSeconds: float = Field(..., gt=0.0)
    kind: Literal["breath", "hesitation", "turn_gap", "silence"] = Field(
        ..., description="Heuristic classification of the gap; never fabricated."
    )


class Provenance(BaseModel):
    recognizer: Literal["whisperx", "blocked"] = "whisperx"
    # Whisper model identifier (e.g. "large-v3"); absent on blocked paths.
    recognizerModel: Optional[str] = None
    recognizerSha256: Optional[str] = Field(
        None, description="Lowercase SHA-256 of the recognizer weights file if loaded; null on blocked."
    )
    aligner: Optional[Literal["mfa", "whisperx_internal"]] = None
    # False on every blocked path. Consumers MUST NOT treat a false bundle as real evidence.
    realInferenceExecuted: bool
    runnerVersion: str = Field("1.0.0")
    createdAt: str = Field(..., description="ISO-8601 timestamp the sequence was assembled.")


class SpeechTimingSequence(BaseModel):
    schemaVersion: Literal[SPEECH_TIMING_SCHEMA_VERSION] = SPEECH_TIMING_SCHEMA_VERSION
    sourceKind: Literal["audio", "blocked"] = Field(
        ...,
        description="'blocked' when inference was never run; words[] and pauses[] are empty.",
    )
    sourcePath: Optional[str] = Field(None, description="Repo-relative path when inference ran; None on blocked.")
    durationSeconds: float = Field(0.0, ge=0.0, description="0 on blocked paths.")
    sampleRate: int = Field(0, ge=0, description="0 on blocked paths.")
    language: Optional[str] = Field(None, description="Detected language code or null when blocked.")
    words: List[TimedWord] = Field(default_factory=list)
    pauses: List[Pause] = Field(default_factory=list)
    phonemes: List[TimedPhoneme] = Field(default_factory=list)
    # Measured rate over the analysed span; 0 when blocked. Computed, never hard-coded.
    speechRateWpm: float = Field(0.0, ge=0.0)
    assumptions: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    provenance: Provenance

    @model_validator(mode="after")
    def _check_source_kind_vs_inference(self) -> "SpeechTimingSequence":
        if self.sourceKind == "audio" and not self.provenance.realInferenceExecuted:
            raise ValueError("sourceKind='audio' requires provenance.realInferenceExecuted=true")
        if self.sourceKind == "blocked" and self.provenance.realInferenceExecuted:
            raise ValueError("sourceKind='blocked' must not have provenance.realInferenceExecuted=true")
        if self.sourceKind == "blocked":
            if self.words or self.pauses or self.phonemes or self.speechRateWpm != 0.0:
                raise ValueError("sourceKind='blocked' must have empty words/pauses/phonemes and speechRateWpm=0")
        return self


def blocked_sequence(reason: str, created_at: str, recognizer: str = "blocked") -> SpeechTimingSequence:
    """
    Build a sequence that honestly reports that no inference ran.

    The returned object is schema-valid and contains zero words, zero pauses, zero phonemes
    and an explicit warning. `provenance.realInferenceExecuted` is False.
    """
    return SpeechTimingSequence(
        schemaVersion=SPEECH_TIMING_SCHEMA_VERSION,
        sourceKind="blocked",
        sourcePath=None,
        durationSeconds=0.0,
        sampleRate=0,
        language=None,
        words=[],
        pauses=[],
        phonemes=[],
        speechRateWpm=0.0,
        assumptions=[],
        warnings=[reason],
        provenance=Provenance(
            recognizer=recognizer if recognizer != "blocked" else "blocked",  # type: ignore[arg-type]
            recognizerModel=None,
            recognizerSha256=None,
            aligner=None,
            realInferenceExecuted=False,
            runnerVersion="1.0.0",
            createdAt=created_at,
        ),
    )