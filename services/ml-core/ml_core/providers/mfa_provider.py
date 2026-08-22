"""Forced-alignment provider (Montreal Forced Aligner).

MFA gives true phoneme-level boundaries, but requires a conda/micromamba install
plus language dictionaries and acoustic models. When it is absent this provider
reports that honestly instead of inventing phonemes.

History: this file used to "fall back" by splitting each word in half by
character count and labelling the halves as phonemes ("hello" -> "he", "llo").
Those are orthographic fragments, not phonemes. `VisemeMapper.mapToExposures()`
looks phonemes up in a Preston Blair map (`A`..`H`, `X`) and silently falls back
to `defaultDrawing`, so every fabricated phoneme resolved to `Mouth_X` — a closed
mouth. Lip-sync was static while the manifest looked fully populated.

For usable output without MFA, use `AcousticVisemeAlignmentProvider`, which
estimates mouth shapes from measured energy and formant-band ratios and does not
claim phoneme identity.
"""

import shutil
from typing import Any, Dict

from .base import BaseMLProvider


class MFAForcedAlignmentProvider(BaseMLProvider):
    def __init__(self, model_id: str = "mfa_aligner"):
        super().__init__(model_id)

    def check_availability(self) -> bool:
        return shutil.which("mfa") is not None

    def load_model(self) -> bool:
        return self.check_availability()

    def run_inference(
        self, inputs: Dict[str, Any], progress_callback: Any = None
    ) -> Dict[str, Any]:
        if not self.check_availability():
            raise RuntimeError(
                "[MODEL_NOT_INSTALLED] Montreal Forced Aligner is not on PATH, so "
                "phoneme-level alignment cannot be performed. This provider will not "
                "emit synthesised phonemes: fabricated phoneme labels do not match "
                "any Preston Blair viseme key and silently collapse lip-sync to a "
                "closed mouth. Either install MFA (conda-forge montreal-forced-aligner "
                "plus a dictionary and acoustic model for your language), or call "
                "task='viseme_alignment' to use AcousticVisemeAlignmentProvider, which "
                "estimates mouth shapes from real acoustics."
            )

        # MFA is installed but the corpus/dictionary pipeline is not wired up yet.
        # Failing loudly is correct: a half-working aligner that returns partial
        # phonemes would be indistinguishable from a working one.
        raise NotImplementedError(
            "[NOT_IMPLEMENTED] MFA binary detected but the alignment pipeline "
            "(corpus staging, dictionary selection, acoustic model download, "
            "TextGrid parsing) is not implemented. Use task='viseme_alignment' for "
            "acoustic viseme estimation in the meantime."
        )
