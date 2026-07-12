import time
from typing import Any, Dict, List
from pathlib import Path
import numpy as np
import soundfile as sf
from .base import BaseMLProvider

class WhisperTranscriptionProvider(BaseMLProvider):
    def __init__(self, model_id: str = "whisper_base"):
        super().__init__(model_id)
        self.model = None

    def check_availability(self) -> bool:
        try:
            import whisper
            return True
        except ImportError:
            return False

    def load_model(self) -> bool:
        if self.loaded:
            return True
        try:
            import whisper
            from ..config import MODEL_ROOT
            
            checkpoint = MODEL_ROOT / "checkpoints" / "whisper_base.pt"
            if not checkpoint.is_file():
                # Whisper can load models automatically via cache
                # We try loading locally or falling back
                pass
            
            # Load whisper base model
            self.model = whisper.load_model("base")
            self.loaded = True
            return True
        except Exception:
            return False

    def run_inference(self, inputs: Dict[str, Any], progress_callback: Any = None) -> Dict[str, Any]:
        audio_path = inputs["audioPath"]
        audio_file = Path(audio_path).resolve(strict=True)

        # Basic audio properties using soundfile
        data, samplerate = sf.read(str(audio_file))
        duration = len(data) / samplerate
        
        # Calculate active ratios
        if len(data.shape) > 1:
            mono = data.mean(axis=1)
        else:
            mono = data
            
        hop = max(1, int(samplerate * 0.05))
        energy = [float(np.sqrt(np.mean(mono[i:i+hop]**2))) for i in range(0, len(mono), hop)]
        peak_rms = max(energy, default=0.0)
        active_frames = sum(1 for e in energy if e > max(0.005, peak_rms * 0.12))
        active_ratio = active_frames / max(1, len(energy))

        use_real = self.loaded and self.model is not None
        words_list = []
        transcript = ""

        if use_real and self.model:
            # Run whisper
            result = self.model.transcribe(str(audio_file), word_timestamps=True)
            transcript = result.get("text", "").strip()
            
            for segment in result.get("segments", []):
                for w in segment.get("words", []):
                    words_list.append({
                        "text": w["word"].strip(),
                        "start": float(w["start"]),
                        "end": float(w["end"]),
                        "confidence": float(w.get("probability", 1.0))
                    })
        else:
            # Fallback mock transcription generator
            transcript = "Привет, это тестовая фраза для анимации."
            # Split mock transcript into words with estimated timings
            words = transcript.split()
            word_dur = duration / max(1, len(words))
            for idx, w in enumerate(words):
                words_list.append({
                    "text": w,
                    "start": round(idx * word_dur, 4),
                    "end": round((idx + 1) * word_dur, 4),
                    "confidence": 0.85
                })

        provenance = {
            "tool": "harmony-ml-core",
            "version": "0.1.0",
            "backend": "whisper" if use_real else "degraded_mock_audio",
            "device": "cpu",
            "precision": "float32",
            "timestamp": str(time.time())
        }

        return {
            "schemaVersion": "1.0",
            "modelId": self.model_id,
            "durationSeconds": float(duration),
            "transcript": transcript,
            "words": words_list,
            "phonemes": [],
            "energySamples": energy,
            "peakRms": float(peak_rms),
            "activeRatio": float(active_ratio),
            "provenance": provenance
        }
