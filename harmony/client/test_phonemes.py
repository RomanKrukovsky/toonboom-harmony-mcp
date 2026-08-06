"""
test_phonemes.py — тесты сегментации звука. Без Harmony и без записей:
тестовый «голос» синтезируется из математики. Низкий тон обязан
распознаться как открытая гласная, писк — как узкая, шум — как согласная,
короткая пауза между речью — как смычка губ.
"""

from __future__ import annotations

import math
import random
import struct
import wave

from drawings import MouthSet, lipsync_assignments
from phonemes import analyze, phonemes_from_alignment, segment, wav_to_phonemes

RATE = 24000


def tone(freq: float, dur: float, amp: float = 0.5) -> list[float]:
    return [amp * math.sin(2 * math.pi * freq * i / RATE) for i in range(int(dur * RATE))]


def noise(dur: float, amp: float = 0.4, seed: int = 1) -> list[float]:
    r = random.Random(seed)
    return [amp * (r.random() * 2 - 1) for _ in range(int(dur * RATE))]


def silence(dur: float) -> list[float]:
    return [0.0] * int(dur * RATE)


def labels(samples):
    return [(p.sound, round(p.start_s, 2), round(p.end_s, 2))
            for p in segment(analyze(samples, RATE))]


def dominant(samples) -> str:
    """Самый длинный не-rest сегмент."""
    segs = [p for p in segment(analyze(samples, RATE)) if p.sound != "rest"]
    assert segs, "no speech detected at all"
    return max(segs, key=lambda p: p.end_s - p.start_s).sound


def test_low_tone_is_open_vowel():
    assert dominant(tone(180, 0.5)) == "AA"


def test_high_tone_is_narrow_vowel():
    assert dominant(tone(2200, 0.5)) == "IY"


def test_noise_is_consonant():
    assert dominant(noise(0.5)) == "S"


def test_silence_is_rest():
    segs = segment(analyze(silence(0.5), RATE))
    assert all(p.sound == "rest" for p in segs)


def test_short_gap_between_speech_is_labial():
    """Короткая пауза посреди слова = п/б/м. Самое ценное правило модуля."""
    s = tone(180, 0.3) + silence(0.08) + tone(180, 0.3)
    sounds = [p.sound for p in segment(analyze(s, RATE))]
    assert "M" in sounds, sounds


def test_long_gap_stays_rest():
    """Длинная пауза — это пауза между фразами, не смычка."""
    s = tone(180, 0.3) + silence(0.5) + tone(180, 0.3)
    segs = segment(analyze(s, RATE))
    mids = [p.sound for p in segs[1:-1]]
    assert "rest" in mids and "M" not in mids, mids


def test_sequence_order_and_timing():
    """«А — И — Ш» должно выйти в этом порядке и примерно в это время."""
    s = tone(180, 0.4) + tone(2200, 0.4) + noise(0.4)
    segs = [p for p in segment(analyze(s, RATE)) if p.sound != "rest"]
    kinds = [p.sound for p in segs]
    # допускаем дребезг на стыках, но порядок первых вхождений строгий
    order = []
    for k in kinds:
        if k not in order:
            order.append(k)
    assert order == ["AA", "IY", "S"], kinds
    first_aa = next(p for p in segs if p.sound == "AA")
    assert first_aa.start_s < 0.1


def test_quiet_recording_not_hallucinated():
    """Очень тихий шум пола не должен превращаться в речь."""
    s = noise(1.0, amp=0.002)
    segs = segment(analyze(s, RATE))
    assert all(p.sound == "rest" for p in segs), [p.sound for p in segs]


def test_wav_roundtrip(tmp_path=None):
    """Полный путь: WAV на диске -> фонемы -> рты. Стерео тоже."""
    import tempfile
    from pathlib import Path
    d = Path(tempfile.mkdtemp())
    s = tone(180, 0.4) + silence(0.08) + tone(2200, 0.4)

    for ch, name in ((1, "mono.wav"), (2, "stereo.wav")):
        p = d / name
        with wave.open(str(p), "wb") as w:
            w.setnchannels(ch)
            w.setsampwidth(2)
            w.setframerate(RATE)
            frames = b"".join(
                struct.pack("<h", max(-32767, min(32767, int(v * 32767)))) * ch
                for v in s
            )
            w.writeframes(frames)

        ph = wav_to_phonemes(p)
        sounds = [x.sound for x in ph]
        assert "AA" in sounds and "IY" in sounds, (name, sounds)

        # и до самого конца цепочки: рты назначаются без ошибок
        mouths = MouthSet({"rest": "r", "open": "o", "wide": "w",
                           "closed": "c", "narrow": "n"})
        plan = lipsync_assignments(ph, mouths, fps=24)
        assert plan and all(a.duration >= 2 for a in plan)


def test_alignment_adapter_strips_stress():
    ph = phonemes_from_alignment([
        {"phone": "AA1", "start": 0.0, "end": 0.2},
        {"phone": "M", "start": 0.2, "end": 0.3},
        {"phone": "", "start": 0.3, "end": 0.5},
    ])
    assert [p.sound for p in ph] == ["AA", "M", "rest"]


if __name__ == "__main__":
    import sys
    import traceback

    failures = 0
    for name, fn in sorted(globals().items()):
        if not name.startswith("test_") or not callable(fn):
            continue
        try:
            fn()
            print(f"  ok   {name}")
        except Exception:
            failures += 1
            print(f"  FAIL {name}")
            traceback.print_exc()
    print(f"\n{failures} failure(s)")
    sys.exit(1 if failures else 0)
