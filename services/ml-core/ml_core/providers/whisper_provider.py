import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import soundfile as sf

from .base import BaseMLProvider


# Ranked best-to-worst. `large-v3-turbo` is ~8x faster than `large-v3` at nearly
# the same accuracy, which matters because this runs on-device.
QUALITY_RANK: Tuple[str, ...] = (
    "large-v3-turbo",
    "turbo",
    "large-v3",
    "large-v2",
    "large",
    "medium",
    "small",
    "base",
    "tiny",
)

# openai-whisper ships weights as a single .pt in ~/.cache/whisper.
OPENAI_CACHE = Path.home() / ".cache" / "whisper"
# MLX and faster-whisper (CTranslate2) weights live in the HuggingFace hub cache.
HF_HUB_CACHE = Path(
    os.environ.get("HF_HOME", Path.home() / ".cache" / "huggingface")
) / "hub"


def _hf_repo_dir(repo: str) -> Optional[Path]:
    """Resolve a HuggingFace repo id to its snapshot dir, if already downloaded."""
    candidate = HF_HUB_CACHE / f"models--{repo.replace('/', '--')}"
    if not candidate.is_dir():
        return None
    snapshots = candidate / "snapshots"
    if not snapshots.is_dir():
        return None
    revisions = [d for d in snapshots.iterdir() if d.is_dir()]
    if not revisions:
        return None
    # Newest revision wins when several are cached.
    return max(revisions, key=lambda d: d.stat().st_mtime)


class WhisperTranscriptionProvider(BaseMLProvider):
    """Speech transcription with backend auto-selection.

    Three backends are supported, preferred in this order:

      1. ``mlx-whisper`` — native Apple Silicon (Metal, unified memory).
      2. ``faster-whisper`` — CTranslate2, int8 quantised, strong on CPU.
      3. ``openai-whisper`` — the reference PyTorch implementation.

    Selection is driven by what is *actually installed and already on disk*: the
    provider never triggers a multi-gigabyte download behind the caller's back.
    Previously it hardcoded `base` on CPU fp32 even when far better weights were
    cached, so quality was left on the table — especially for non-English audio.

    `model_id` may be:
      * ``whisper_auto``  — pick the best locally available model (default);
      * ``whisper_large-v3-turbo`` / ``whisper_medium`` / ... — request a size;
      * ``whisper_base``  — explicit size, kept for backwards compatibility.
    """

    def __init__(self, model_id: str = "whisper_auto"):
        super().__init__(model_id)
        self.model = None
        self.backend: Optional[str] = None
        self.resolved_size: Optional[str] = None
        self.device: str = "cpu"
        self.precision: str = "float32"

    # --- discovery ------------------------------------------------------------------

    @staticmethod
    def _available_backends() -> List[str]:
        backends = []
        for module, name in (
            ("mlx_whisper", "mlx-whisper"),
            ("faster_whisper", "faster-whisper"),
            ("whisper", "openai-whisper"),
        ):
            try:
                __import__(module)
                backends.append(name)
            except ImportError:
                continue
        return backends

    @staticmethod
    def _local_openai_sizes() -> List[str]:
        if not OPENAI_CACHE.is_dir():
            return []
        return [p.stem for p in OPENAI_CACHE.glob("*.pt")]

    @staticmethod
    def _local_mlx_models() -> Dict[str, Path]:
        """Cached MLX whisper conversions, keyed by whisper size name."""
        found: Dict[str, Path] = {}
        for size in QUALITY_RANK:
            for repo in (f"mlx-community/whisper-{size}", f"mlx-community/whisper-{size}-mlx"):
                path = _hf_repo_dir(repo)
                if path and (path / "weights.safetensors").is_file():
                    found.setdefault(size, path)
        return found

    @staticmethod
    def _local_faster_models() -> Dict[str, Path]:
        found: Dict[str, Path] = {}
        for size in QUALITY_RANK:
            path = _hf_repo_dir(f"Systran/faster-whisper-{size}")
            if path and (path / "model.bin").is_file():
                found.setdefault(size, path)
        return found

    def describe_available(self) -> Dict[str, Any]:
        """Inventory of what could be used right now, without downloading."""
        return {
            "backends": self._available_backends(),
            "openaiCachedSizes": sorted(self._local_openai_sizes()),
            "mlxCachedSizes": sorted(self._local_mlx_models().keys()),
            "fasterWhisperCachedSizes": sorted(self._local_faster_models().keys()),
        }

    def _requested_size(self) -> Optional[str]:
        """Explicit size from model_id, or None when auto-selecting."""
        if not self.model_id.startswith("whisper_"):
            return None
        size = self.model_id.removeprefix("whisper_")
        if size in ("auto", ""):
            return None
        return size

    def _plan(self) -> Optional[Tuple[str, str, Any]]:
        """Choose (backend, size, source) from locally available options."""
        backends = self._available_backends()
        if not backends:
            return None

        mlx_models = self._local_mlx_models()
        faster_models = self._local_faster_models()
        openai_sizes = set(self._local_openai_sizes())

        requested = self._requested_size()
        # An explicit request is honoured if possible; otherwise fall through to
        # auto-selection rather than failing outright.
        sizes = [requested] if requested else list(QUALITY_RANK)

        for size in sizes:
            if "mlx-whisper" in backends and size in mlx_models:
                return ("mlx-whisper", size, mlx_models[size])
            if "faster-whisper" in backends and size in faster_models:
                return ("faster-whisper", size, faster_models[size])
            if "openai-whisper" in backends and size in openai_sizes:
                return ("openai-whisper", size, OPENAI_CACHE / f"{size}.pt")

        if requested:
            # Requested size is not cached; retry with auto-selection.
            self.model_id = "whisper_auto"
            return self._plan()
        return None

    def check_availability(self) -> bool:
        return bool(self._available_backends())

    # --- loading --------------------------------------------------------------------

    def load_model(self) -> bool:
        if self.loaded:
            return True

        plan = self._plan()
        if plan is None:
            return False
        backend, size, source = plan

        try:
            if backend == "mlx-whisper":
                import mlx_whisper  # noqa: F401
                # mlx-whisper is called functionally with a path; nothing to hold.
                self.model = str(source)
                self.device = "gpu_metal"
                self.precision = "float16"
            elif backend == "faster-whisper":
                from faster_whisper import WhisperModel
                self.model = WhisperModel(str(source), device="cpu", compute_type="int8")
                self.device = "cpu"
                self.precision = "int8"
            else:
                import whisper
                path = Path(source)
                self.model = whisper.load_model(
                    str(path) if path.is_file() else size
                )
                self.device = "cpu"
                self.precision = "float32"

            self.backend = backend
            self.resolved_size = size
            self.loaded = True
            return True
        except Exception:
            self.model = None
            self.backend = None
            return False

    # --- inference ------------------------------------------------------------------

    def _transcribe(self, audio_file: Path, language: Optional[str]) -> Tuple[str, List[Dict[str, Any]]]:
        words: List[Dict[str, Any]] = []

        if self.backend == "mlx-whisper":
            import mlx_whisper
            result = mlx_whisper.transcribe(
                str(audio_file),
                path_or_hf_repo=str(self.model),
                word_timestamps=True,
                language=language,
            )
            transcript = (result.get("text") or "").strip()
            for segment in result.get("segments", []):
                for word in segment.get("words", []) or []:
                    words.append({
                        "text": str(word.get("word", "")).strip(),
                        "start": float(word.get("start", 0.0)),
                        "end": float(word.get("end", 0.0)),
                        "confidence": float(word.get("probability", 1.0)),
                    })
            return transcript, words

        if self.backend == "faster-whisper":
            segments, _info = self.model.transcribe(
                str(audio_file), word_timestamps=True, language=language
            )
            parts: List[str] = []
            for segment in segments:
                parts.append(segment.text)
                for word in (segment.words or []):
                    words.append({
                        "text": word.word.strip(),
                        "start": float(word.start),
                        "end": float(word.end),
                        "confidence": float(getattr(word, "probability", 1.0)),
                    })
            return "".join(parts).strip(), words

        result = self.model.transcribe(
            str(audio_file), word_timestamps=True, language=language
        )
        transcript = (result.get("text") or "").strip()
        for segment in result.get("segments", []):
            for word in segment.get("words", []) or []:
                words.append({
                    "text": str(word.get("word", "")).strip(),
                    "start": float(word.get("start", 0.0)),
                    "end": float(word.get("end", 0.0)),
                    "confidence": float(word.get("probability", 1.0)),
                })
        return transcript, words

    def run_inference(self, inputs: Dict[str, Any], progress_callback: Any = None) -> Dict[str, Any]:
        audio_path = inputs["audioPath"]
        audio_file = Path(audio_path).resolve(strict=True)
        language = inputs.get("language")

        data, samplerate = sf.read(str(audio_file))
        duration = len(data) / samplerate if samplerate else 0.0
        mono = data.mean(axis=1) if len(data.shape) > 1 else data

        hop = max(1, int(samplerate * 0.05))
        energy = [
            float(np.sqrt(np.mean(mono[i:i + hop] ** 2)))
            for i in range(0, len(mono), hop)
        ]
        peak_rms = max(energy, default=0.0)
        active_frames = sum(1 for e in energy if e > max(0.005, peak_rms * 0.12))
        active_ratio = active_frames / max(1, len(energy))

        use_real = self.loaded and self.model is not None
        transcript = ""
        words_list: List[Dict[str, Any]] = []

        if use_real:
            if progress_callback:
                progress_callback(0.3, "transcribing", f"Running {self.backend}")
            transcript, words_list = self._transcribe(audio_file, language)

        provenance = {
            "tool": "harmony-ml-core",
            "version": "0.1.0",
            # Backend and size are reported truthfully: a caller must be able to
            # tell a `tiny` CPU run from a `large-v3-turbo` Metal run.
            "backend": self.backend if use_real else "degraded_audio_metrics_only",
            "whisperSize": self.resolved_size,
            "device": self.device if use_real else "cpu",
            "precision": self.precision if use_real else "float32",
            "timestamp": str(time.time()),
        }

        return {
            "schemaVersion": "1.0",
            "modelId": self.model_id,
            "status": "success" if use_real else "degraded_audio_metrics_only",
            "realInferenceExecuted": bool(use_real),
            "backend": self.backend,
            "whisperSize": self.resolved_size,
            "durationSeconds": float(duration),
            "transcript": transcript,
            "words": words_list,
            # Whisper gives word timings, not phonemes. Emitting invented phonemes
            # is what previously broke lip-sync, so this stays empty by contract.
            "phonemes": [],
            "energySamples": energy,
            "peakRms": float(peak_rms),
            "activeRatio": float(active_ratio),
            "provenance": provenance,
        }
