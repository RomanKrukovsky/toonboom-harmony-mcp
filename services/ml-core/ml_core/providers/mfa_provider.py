import time
from typing import Any, Dict
from .base import BaseMLProvider
from .whisper_provider import WhisperTranscriptionProvider

class MFAForcedAlignmentProvider(BaseMLProvider):
    def __init__(self, model_id: str = "mfa_aligner"):
        super().__init__(model_id)

    def check_availability(self) -> bool:
        # Check if mfa is available in path or micromamba
        import shutil
        return shutil.which("mfa") is not None

    def load_model(self) -> bool:
        return self.check_availability()

    def run_inference(self, inputs: Dict[str, Any], progress_callback: Any = None) -> Dict[str, Any]:
        # Fall back to Whisper's word-level timestamps with a degraded alignment warning
        whisper = WhisperTranscriptionProvider()
        whisper.load_model()
        res = whisper.run_inference(inputs, progress_callback)
        
        # Add phoneme mappings as proportional syllable splits of the words for fallback demonstration
        phonemes = []
        for w in res.get("words", []):
            word_text = w["text"]
            # Simple heuristic syllable mapping (e.g. split into vowels/consonants)
            # This is a labeled fallback
            phonemes.append({
                "text": word_text[:len(word_text)//2] or word_text,
                "start": w["start"],
                "end": (w["start"] + w["end"]) / 2.0,
                "confidence": w["confidence"] * 0.9,
                "word": word_text
            })
            if len(word_text) > 2:
                phonemes.append({
                    "text": word_text[len(word_text)//2:],
                    "start": (w["start"] + w["end"]) / 2.0,
                    "end": w["end"],
                    "confidence": w["confidence"] * 0.9,
                    "word": word_text
                })

        res["phonemes"] = phonemes
        res["provenance"]["alignment"] = "degraded_whisper_timestamps"
        res["provenance"]["backend"] = "whisper_alignment_fallback"
        return res
