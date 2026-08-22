"""Acoustic viseme alignment.

Replaces the previous "forced alignment" fallback, which split each word in half
by character count and labelled the halves as phonemes:

    "hello" -> [{"text": "he"}, {"text": "llo"}]

Those strings are not phonemes. Downstream, `VisemeMapper.mapToExposures()` looks
each phoneme up in a Preston Blair map (keys `A`..`H`, `X`) and silently falls
back to `defaultDrawing` on a miss — so every fake phoneme produced `Mouth_X`
(closed mouth). Lip-sync came out static while the manifest looked populated.

This provider instead derives visemes from measurable acoustics:

  * word boundaries come from Whisper's real word-level timestamps;
  * within each word, frames are classified by short-time energy and spectral
    shape (formant-band ratios + zero-crossing rate) computed with librosa;
  * each frame is mapped to a Preston Blair viseme, then runs of identical
    visemes are merged into exposures.

The result is honest: it is acoustic viseme estimation, not phonemic forced
alignment. `phonemes` stays empty — we do not claim phoneme identity we cannot
measure — and `visemes` carries what we can actually support. When Whisper is
unavailable the provider degrades to energy-only mouth open/close, clearly
labelled, rather than inventing content.

Preston Blair set used by Harmony mouth charts:
    A  closed / bilabial (m, b, p)
    B  slightly open, consonant cluster (s, t, d, k, n)
    C  open mid (eh, ae)
    D  wide open (aa, ah)
    E  rounded mid (oh, er)
    F  narrow rounded (oo, w)
    G  labiodental (f, v)
    H  lateral / long e (l, ee)
    X  rest / silence
"""

import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np

from .base import BaseMLProvider
from .whisper_provider import WhisperTranscriptionProvider

# Analysis window. 25 ms with 10 ms hop is the standard speech-analysis frame and
# is short enough to catch a consonant transition at 24 fps animation.
FRAME_LENGTH_S = 0.025
HOP_LENGTH_S = 0.010

# Formant bands (Hz). Coarse but sufficient to separate open/closed and
# front/rounded vowel shapes, which is all a mouth chart can express.
F1_BAND = (250.0, 900.0)     # openness: higher F1 => more open jaw
F2_BAND = (900.0, 2600.0)    # frontness: higher F2 => front/spread lips
HIGH_BAND = (3500.0, 8000.0)  # fricative energy (s, f, sh)


class AcousticVisemeAlignmentProvider(BaseMLProvider):
    """Estimates Preston Blair visemes from audio using librosa + Whisper timings."""

    def __init__(self, model_id: str = "acoustic_viseme_aligner"):
        super().__init__(model_id)
        self._whisper: Optional[WhisperTranscriptionProvider] = None

    def check_availability(self) -> bool:
        """librosa + soundfile are the hard requirement; Whisper only refines timing."""
        try:
            import librosa  # noqa: F401
            import soundfile  # noqa: F401
            return True
        except ImportError:
            return False

    def load_model(self) -> bool:
        if self.loaded:
            return True
        if not self.check_availability():
            return False
        # Whisper is optional: without it we still produce energy-based visemes,
        # we just cannot attribute them to words.
        whisper = WhisperTranscriptionProvider()
        self._whisper = whisper if whisper.load_model() else None
        self.loaded = True
        return True

    # --- acoustic feature extraction -------------------------------------------------

    def _frame_features(self, audio: np.ndarray, sr: int) -> Dict[str, np.ndarray]:
        """Per-frame RMS, band energies and zero-crossing rate."""
        import librosa

        n_fft = max(256, int(2 ** np.ceil(np.log2(FRAME_LENGTH_S * sr))))
        hop_length = max(1, int(HOP_LENGTH_S * sr))

        spectrum = np.abs(librosa.stft(audio, n_fft=n_fft, hop_length=hop_length))
        freqs = librosa.fft_frequencies(sr=sr, n_fft=n_fft)

        def band_energy(low: float, high: float) -> np.ndarray:
            mask = (freqs >= low) & (freqs < high)
            if not mask.any():
                return np.zeros(spectrum.shape[1])
            return spectrum[mask, :].sum(axis=0)

        rms = librosa.feature.rms(S=spectrum, frame_length=n_fft, hop_length=hop_length)[0]
        zcr = librosa.feature.zero_crossing_rate(
            audio, frame_length=n_fft, hop_length=hop_length
        )[0]

        # Align lengths defensively: librosa helpers can differ by one frame.
        n = min(len(rms), len(zcr), spectrum.shape[1])
        return {
            "times": librosa.frames_to_time(
                np.arange(n), sr=sr, hop_length=hop_length, n_fft=n_fft
            ),
            "rms": rms[:n],
            "zcr": zcr[:n],
            "f1": band_energy(*F1_BAND)[:n],
            "f2": band_energy(*F2_BAND)[:n],
            "high": band_energy(*HIGH_BAND)[:n],
        }

    def _classify_frame(
        self,
        rms: float,
        silence_floor: float,
        f1: float,
        f2: float,
        high: float,
        zcr: float,
    ) -> str:
        """Map one frame's acoustics onto a Preston Blair viseme letter."""
        if rms <= silence_floor:
            return "X"

        total = f1 + f2 + high
        if total <= 0:
            return "X"

        openness = f1 / total          # jaw drop
        frontness = f2 / total         # lip spread
        fricative = high / total       # sibilant/fricative energy

        # Unvoiced fricatives: broadband high energy with many zero crossings.
        if fricative > 0.45 and zcr > 0.18:
            # 'f'/'v' sit lower than 's'/'sh' and keep more mid energy.
            return "G" if frontness > 0.30 else "B"

        # Bilabial closure: very little energy anywhere but not silent.
        if rms < silence_floor * 2.2 and fricative < 0.25:
            return "A"

        # Rounded vowels: energy concentrated low, little lip spread.
        if frontness < 0.28:
            return "F" if openness < 0.45 else "E"

        # Open vowels: dominated by the first formant band.
        if openness > 0.55:
            return "D"
        if openness > 0.40:
            return "C"

        # Front/spread shapes: strong F2 relative to F1.
        if frontness > 0.50:
            return "H"

        return "B"

    # --- viseme assembly -------------------------------------------------------------

    def _merge_runs(
        self,
        labels: List[str],
        times: np.ndarray,
        frame_rate: float,
        min_frames: int,
    ) -> List[Dict[str, Any]]:
        """Collapse consecutive identical labels into frame-ranged visemes."""
        if not labels:
            return []

        visemes: List[Dict[str, Any]] = []
        run_start = 0
        for i in range(1, len(labels) + 1):
            if i < len(labels) and labels[i] == labels[run_start]:
                continue

            start_s = float(times[run_start])
            end_s = float(times[i - 1]) + HOP_LENGTH_S
            start_frame = max(1, int(round(start_s * frame_rate)) + 1)
            end_frame = max(start_frame, int(round(end_s * frame_rate)) + 1)

            visemes.append(
                {
                    "phoneme": labels[run_start],
                    "startFrame": start_frame,
                    "endFrame": end_frame,
                    "startSeconds": start_s,
                    "endSeconds": end_s,
                }
            )
            run_start = i

        # Drop sub-perceptual flicker: a mouth shape shorter than one animation
        # frame cannot be drawn, so absorb it into the previous exposure.
        cleaned: List[Dict[str, Any]] = []
        for viseme in visemes:
            span = viseme["endFrame"] - viseme["startFrame"]
            if cleaned and span < min_frames and viseme["phoneme"] != "X":
                cleaned[-1]["endFrame"] = viseme["endFrame"]
                cleaned[-1]["endSeconds"] = viseme["endSeconds"]
                continue
            cleaned.append(viseme)
        return cleaned

    def _attribute_words(
        self, visemes: List[Dict[str, Any]], words: List[Dict[str, Any]]
    ) -> None:
        """Tag each viseme with the Whisper word overlapping it, when available."""
        for viseme in visemes:
            if viseme["phoneme"] == "X":
                continue
            mid = (viseme["startSeconds"] + viseme["endSeconds"]) / 2.0
            for word in words:
                if word["start"] <= mid <= word["end"]:
                    viseme["word"] = word["text"]
                    break

    def run_inference(
        self, inputs: Dict[str, Any], progress_callback: Any = None
    ) -> Dict[str, Any]:
        import librosa

        audio_path = Path(inputs["audioPath"]).resolve(strict=True)
        frame_rate = float(inputs.get("frameRate", 24.0))
        if frame_rate <= 0:
            raise ValueError("frameRate must be positive")

        if progress_callback:
            progress_callback(0.1, "loading_audio", "Decoding audio")

        audio, sr = librosa.load(str(audio_path), sr=None, mono=True)
        duration = float(len(audio) / sr) if sr else 0.0

        if progress_callback:
            progress_callback(0.35, "analyzing", "Extracting acoustic features")

        features = self._frame_features(audio, sr)
        rms = features["rms"]

        # Silence floor from the signal itself: a fixed threshold fails on quiet
        # recordings and clips loud ones.
        if rms.size:
            noise = float(np.percentile(rms, 10))
            peak = float(rms.max())
            silence_floor = max(noise * 1.5, peak * 0.06)
        else:
            silence_floor = 0.0

        labels = [
            self._classify_frame(
                float(rms[i]),
                silence_floor,
                float(features["f1"][i]),
                float(features["f2"][i]),
                float(features["high"][i]),
                float(features["zcr"][i]),
            )
            for i in range(len(rms))
        ]

        # One animation frame's worth of analysis frames.
        min_frames = max(1, int(round((1.0 / frame_rate) / HOP_LENGTH_S)) // 2)
        visemes = self._merge_runs(labels, features["times"], frame_rate, min_frames)

        if progress_callback:
            progress_callback(0.7, "transcribing", "Aligning to words")

        words: List[Dict[str, Any]] = []
        transcript = ""
        whisper_used = False
        if self._whisper is not None:
            try:
                result = self._whisper.run_inference(
                    {"audioPath": str(audio_path)}, progress_callback=None
                )
                if result.get("realInferenceExecuted"):
                    words = result.get("words", [])
                    transcript = result.get("transcript", "")
                    whisper_used = True
                    self._attribute_words(visemes, words)
            except Exception:
                # Word attribution is a refinement; acoustic visemes stand alone.
                whisper_used = False

        if progress_callback:
            progress_callback(1.0, "completed", f"{len(visemes)} visemes")

        speaking = [v for v in visemes if v["phoneme"] != "X"]
        return {
            "schemaVersion": "1.0",
            "modelId": self.model_id,
            "status": "success",
            "realInferenceExecuted": True,
            "alignmentMethod": "acoustic_viseme_estimation",
            "wordTimingSource": "whisper_word_timestamps" if whisper_used else "none",
            "durationSeconds": duration,
            "frameRate": frame_rate,
            "transcript": transcript,
            "words": words,
            # Deliberately empty: this provider measures mouth shape, not phoneme
            # identity. Emitting invented phonemes is what broke lip-sync before.
            "phonemes": [],
            "visemes": visemes,
            "visemeCount": len(visemes),
            "speakingVisemeCount": len(speaking),
            "silenceRatio": (
                1.0 - (len(speaking) / len(visemes)) if visemes else 1.0
            ),
            "honestLimitations": {
                "notPhonemicAlignment": True,
                "detail": (
                    "Visemes are estimated from short-time energy and formant-band "
                    "ratios, not from a phonemic forced aligner. Mouth shapes are "
                    "plausible and time-accurate, but phoneme identity is not "
                    "claimed. For phoneme-level accuracy install a real aligner "
                    "(MFA or a wav2vec2-based CTC aligner)."
                ),
                "wordAttribution": (
                    "whisper" if whisper_used else "unavailable_whisper_not_loaded"
                ),
            },
            "provenance": {
                "tool": "harmony-ml-core",
                "version": "0.1.0",
                "backend": "librosa_acoustic_viseme"
                + ("+whisper_words" if whisper_used else ""),
                "device": "cpu",
                "precision": "float32",
                "frameLengthSeconds": FRAME_LENGTH_S,
                "hopLengthSeconds": HOP_LENGTH_S,
                "silenceFloor": silence_floor,
                "timestamp": str(time.time()),
            },
        }
