import os
import json
import logging
from pathlib import Path
import numpy as np

logger = logging.getLogger("ml-runtime.voxcpm")

class VoxCPMProvider:
    """
    OpenBMB VoxCPM2 Provider (Studio 48 kHz Voice Synthesis & Voice Design).
    Integrates VoxCPM2 into the Harmony ML Runtime.
    """
    def __init__(self, config: dict = None):
        self.config = config or {}
        self.enabled = self.config.get("enabled", True)
        self.model_id = self.config.get("model_id", "openbmb/VoxCPM2")
        self.device = self.config.get("device", "cpu")
        self.model = None

    def detect(self) -> dict:
        try:
            import voxcpm
            return {"status": "installed_verified", "version": getattr(voxcpm, "__version__", "2.0"), "device": self.device}
        except ImportError:
            return {
                "status": "weights_missing",
                "message": "voxcpm package not installed. Install with `pip install voxcpm`"
            }

    def load_model(self):
        if self.model is not None:
            return

        try:
            from voxcpm import VoxCPM
            checkpoint = os.environ.get("OMNIVOICE_VOXCPM_MODEL", self.model_id)
            logger.info(f"Loading VoxCPM2 model from {checkpoint}...")
            self.model = VoxCPM.from_pretrained(checkpoint, load_denoiser=False)
            logger.info("VoxCPM2 model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load VoxCPM2 model: {e}")
            raise RuntimeError(f"VoxCPM2 load failed: {e}")

    def generate_tts(
        self,
        text: str,
        output_wav_path: str,
        voice_description: str = None,
        reference_wav_path: str = None,
        instruct: str = None,
        guidance_scale: float = 2.0,
        num_steps: int = 10
    ) -> dict:
        """
        Synthesizes TTS audio using VoxCPM2.
        Supports both Voice Design (voice_description) and Voice Cloning (reference_wav_path).
        """
        self.load_model()

        try:
            import torch
            import scipy.io.wavfile as wavfile

            prompt = text
            if instruct:
                prompt = f"({instruct}){text}"

            out_dir = Path(output_wav_path).parent
            out_dir.mkdir(parents=True, exist_ok=True)

            if voice_description and not reference_wav_path:
                logger.info(f"VoxCPM2 Voice Design mode for description: '{voice_description}'")
                wav = self.model.generate(
                    text=prompt,
                    voice_description=voice_description,
                    cfg_value=guidance_scale,
                    inference_timesteps=num_steps
                )
            else:
                logger.info(f"VoxCPM2 Voice Cloning / Standard mode for text: '{prompt}'")
                wav = self.model.generate(
                    text=prompt,
                    cfg_value=guidance_scale,
                    inference_timesteps=num_steps,
                    reference_wav_path=reference_wav_path
                )

            if isinstance(wav, torch.Tensor):
                wav_np = wav.cpu().numpy()
            elif isinstance(wav, np.ndarray):
                wav_np = wav
            else:
                wav_np = np.array(wav)

            if wav_np.ndim > 1:
                wav_np = np.squeeze(wav_np)

            # Normalize audio float32 to int16 for standard 48kHz WAV export
            wav_int16 = (wav_np * 32767.0).astype(np.int16)
            wavfile.write(output_wav_path, 48000, wav_int16)

            duration_sec = len(wav_int16) / 48000.0

            return {
                "status": "success",
                "realInferenceExecuted": True,
                "outputWavPath": str(output_wav_path),
                "sampleRate": 48000,
                "durationSec": round(duration_sec, 2),
                "provider": "voxcpm_provider"
            }
        except Exception as e:
            logger.error(f"VoxCPM generation error: {e}")
            return {
                "status": "failed",
                "realInferenceExecuted": False,
                "errors": [str(e)]
            }
