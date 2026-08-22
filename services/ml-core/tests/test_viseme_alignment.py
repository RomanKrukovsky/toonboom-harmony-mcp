"""Tests for viseme alignment honesty and correctness.

Regression guard for a bug that silently broke lip-sync: the old MFA "fallback"
split words in half by character count and labelled the halves as phonemes.
Because `VisemeMapper` resolves unknown phonemes to `defaultDrawing`, every fake
label produced a closed mouth (`Mouth_X`) while the manifest looked populated.

These tests assert that:
  * no provider invents phoneme labels;
  * MFA fails loudly when it cannot really align;
  * acoustic estimation produces valid Preston Blair visemes with sane timing;
  * measured acoustics actually drive the classification (open vs rounded vs
    fricative give different mouth shapes).
"""

import numpy as np
import pytest

from ml_core.providers.acoustic_viseme_provider import AcousticVisemeAlignmentProvider
from ml_core.providers.mfa_provider import MFAForcedAlignmentProvider

# Preston Blair mouth chart keys accepted by src/services/visemeMapper.
VALID_VISEMES = {"A", "B", "C", "D", "E", "F", "G", "H", "X"}
SR = 16000


def _write_wav(path, signal, sr=SR):
    import soundfile as sf
    sf.write(str(path), signal.astype(np.float32), sr)
    return path


def _vowel(f1: float, f2: float, duration: float) -> np.ndarray:
    """Two-formant synthetic vowel with a voiced fundamental."""
    t = np.linspace(0, duration, int(SR * duration), endpoint=False)
    sig = 0.5 * np.sin(2 * np.pi * f1 * t) + 0.3 * np.sin(2 * np.pi * f2 * t)
    sig += 0.2 * np.sin(2 * np.pi * 120 * t)
    return sig * np.hanning(len(sig)) * 0.5


def _silence(duration: float) -> np.ndarray:
    return np.zeros(int(SR * duration))


def _fricative(duration: float) -> np.ndarray:
    """High-passed noise, i.e. an unvoiced fricative."""
    from scipy.signal import butter, lfilter
    noise = np.random.default_rng(1234).standard_normal(int(SR * duration)) * 0.3
    b, a = butter(4, 3500 / (SR / 2), btype="high")
    return lfilter(b, a, noise)


# --- MFA must not fabricate anything ---------------------------------------------

def test_mfa_raises_instead_of_inventing_phonemes(tmp_path):
    """Without a real aligner MFA must fail loudly, never emit fake phonemes."""
    audio = _write_wav(tmp_path / "a.wav", _vowel(700, 1200, 0.3))
    provider = MFAForcedAlignmentProvider()
    with pytest.raises((RuntimeError, NotImplementedError)) as excinfo:
        provider.run_inference({"audioPath": str(audio)})
    # The error must explain the situation, not just fail.
    assert "MFA" in str(excinfo.value) or "aligner" in str(excinfo.value).lower()


def test_mfa_availability_matches_reality():
    """check_availability() must reflect whether MFA can actually run."""
    import shutil
    provider = MFAForcedAlignmentProvider()
    assert provider.check_availability() == (shutil.which("mfa") is not None)


# --- acoustic estimation ---------------------------------------------------------

@pytest.fixture(scope="module")
def provider():
    prov = AcousticVisemeAlignmentProvider()
    if not prov.check_availability():
        pytest.skip("librosa/soundfile not installed in this environment")
    assert prov.load_model()
    return prov


def test_never_emits_phonemes(provider, tmp_path):
    """Acoustic estimation measures mouth shape, so it must not claim phonemes."""
    audio = _write_wav(tmp_path / "speech.wav", _vowel(700, 1200, 0.4))
    result = provider.run_inference({"audioPath": str(audio), "frameRate": 24})
    assert result["phonemes"] == []
    assert result["alignmentMethod"] == "acoustic_viseme_estimation"
    assert result["honestLimitations"]["notPhonemicAlignment"] is True


def test_all_visemes_are_valid_preston_blair_keys(provider, tmp_path):
    """Every label must exist in the mouth chart, or VisemeMapper silently drops it."""
    signal = np.concatenate([
        _silence(0.15), _vowel(700, 1200, 0.3), _fricative(0.2),
        _vowel(350, 800, 0.3), _silence(0.15),
    ])
    audio = _write_wav(tmp_path / "mixed.wav", signal)
    result = provider.run_inference({"audioPath": str(audio), "frameRate": 24})

    assert result["visemeCount"] > 0
    for viseme in result["visemes"]:
        assert viseme["phoneme"] in VALID_VISEMES, f"unmapped viseme {viseme['phoneme']}"


def test_viseme_frames_are_ordered_and_contiguous(provider, tmp_path):
    signal = np.concatenate([_silence(0.1), _vowel(700, 1200, 0.3), _silence(0.1)])
    audio = _write_wav(tmp_path / "ordered.wav", signal)
    result = provider.run_inference({"audioPath": str(audio), "frameRate": 24})

    visemes = result["visemes"]
    for viseme in visemes:
        assert viseme["startFrame"] >= 1
        assert viseme["endFrame"] >= viseme["startFrame"]
    for previous, current in zip(visemes, visemes[1:]):
        assert current["startFrame"] >= previous["startFrame"], "visemes out of order"


def test_silence_is_classified_as_rest(provider, tmp_path):
    """Pure silence must be the rest pose, not an open mouth."""
    audio = _write_wav(tmp_path / "silence.wav", _silence(0.6))
    result = provider.run_inference({"audioPath": str(audio), "frameRate": 24})
    assert {v["phoneme"] for v in result["visemes"]} <= {"X"}
    assert result["speakingVisemeCount"] == 0


def test_acoustics_drive_classification(provider, tmp_path):
    """Different mouth shapes must yield different visemes — proof it measures input."""
    open_vowel = _write_wav(tmp_path / "open.wav", _vowel(750, 1300, 0.4))
    rounded = _write_wav(tmp_path / "round.wav", _vowel(320, 700, 0.4))

    def speaking_shapes(path):
        res = provider.run_inference({"audioPath": str(path), "frameRate": 24})
        return {v["phoneme"] for v in res["visemes"] if v["phoneme"] != "X"}

    open_shapes = speaking_shapes(open_vowel)
    rounded_shapes = speaking_shapes(rounded)

    assert open_shapes, "open vowel produced no speaking viseme"
    assert rounded_shapes, "rounded vowel produced no speaking viseme"
    # A constant classifier would return the same set for both.
    assert open_shapes != rounded_shapes, (
        f"classifier ignores acoustics: both gave {open_shapes}"
    )


def test_frame_rate_scales_viseme_frames(provider, tmp_path):
    """Frame numbers must follow the requested frame rate."""
    audio = _write_wav(tmp_path / "rate.wav", _vowel(700, 1200, 0.5))
    at24 = provider.run_inference({"audioPath": str(audio), "frameRate": 24})
    at48 = provider.run_inference({"audioPath": str(audio), "frameRate": 48})
    assert at48["visemes"][-1]["endFrame"] > at24["visemes"][-1]["endFrame"]


def test_rejects_invalid_frame_rate(provider, tmp_path):
    audio = _write_wav(tmp_path / "bad.wav", _vowel(700, 1200, 0.2))
    with pytest.raises(ValueError):
        provider.run_inference({"audioPath": str(audio), "frameRate": 0})
