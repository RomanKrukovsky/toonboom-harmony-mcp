"""
test_audio.py — тесты звукового слоя. Без Harmony, без Blender.

Главный предмет проверки — переход СЕКУНДЫ -> КАДРЫ, где липсинк
обычно и ломается. При 24 fps кадр это 41.67 мс, а согласные бывают
короче 30 мс: наивное округление их либо стирает, либо растягивает
вдвое, и губы «почти совпадают» без объяснимой причины.

Здесь проверяется, что потери СЧИТАЮТСЯ и отдаются наружу, а не
происходят молча.
"""

from __future__ import annotations

from audio import (
    AudioTrack,
    align_phonemes_to_frames,
    check_sync,
    lipsync_channel,
)
from drawings import Phoneme

MOUTHS = {"AA": "mouth_A", "EE": "mouth_E", "M": "mouth_M", "F": "mouth_F",
          "rest": "flat"}


def line(*spans):
    return [Phoneme(s, a, b) for s, a, b in spans]


# ---------------------------------------------------------------------------
# Дорожка
# ---------------------------------------------------------------------------

def test_missing_file_rejected():
    try:
        AudioTrack("/nope/never.wav").validate()
        assert False
    except FileNotFoundError:
        pass


def test_bad_format_rejected(tmp=None):
    import tempfile
    from pathlib import Path
    d = Path(tempfile.mkdtemp())
    p = d / "voice.ogg"
    p.write_bytes(b"x")
    try:
        AudioTrack(str(p)).validate()
        assert False
    except ValueError as e:
        assert "format" in str(e)


def test_valid_track_accepted():
    import tempfile
    from pathlib import Path
    d = Path(tempfile.mkdtemp())
    p = d / "voice.wav"
    p.write_bytes(b"RIFF....WAVE")
    AudioTrack(str(p), start_frame=1, volume=1.0).validate()


def test_zero_based_start_rejected():
    import tempfile
    from pathlib import Path
    d = Path(tempfile.mkdtemp())
    p = d / "v.wav"
    p.write_bytes(b"x")
    try:
        AudioTrack(str(p), start_frame=0).validate()
        assert False
    except ValueError as e:
        assert "1-based" in str(e)


# ---------------------------------------------------------------------------
# Секунды -> кадры
# ---------------------------------------------------------------------------

def test_normal_speech_aligns_without_loss():
    r = align_phonemes_to_frames(
        line(("AA", 0.0, 0.20), ("EE", 0.20, 0.45), ("M", 0.45, 0.60)), fps=24)
    assert len(r.aligned) == 3
    assert r.dropped == []
    assert r.aligned[0].start_frame == 1


def test_frames_are_contiguous():
    """Между фонемами не должно быть щелей: рот не «выключается» на кадр."""
    r = align_phonemes_to_frames(
        line(("AA", 0.0, 0.15), ("EE", 0.15, 0.30), ("M", 0.30, 0.50)), fps=24)
    for a, b in zip(r.aligned, r.aligned[1:]):
        assert b.start_frame == a.end_frame + 1, (a, b)


def test_short_phoneme_kept_by_default():
    """Согласная 20 мс короче кадра. По умолчанию она НЕ теряется —
    получает один кадр, и это записано в отчёт."""
    r = align_phonemes_to_frames(
        line(("AA", 0.0, 0.20), ("M", 0.20, 0.22), ("EE", 0.22, 0.50)), fps=24)
    assert len(r.aligned) == 3
    m = next(a for a in r.aligned if a.phoneme == "M")
    assert m.duration_frames == 1
    assert any(s == "M" for s, _ in r.dropped), "потеря точности не записана"


def test_short_phoneme_can_be_dropped_explicitly():
    r = align_phonemes_to_frames(
        line(("AA", 0.0, 0.20), ("M", 0.20, 0.22), ("EE", 0.22, 0.50)),
        fps=24, on_short="drop")
    assert [a.phoneme for a in r.aligned] == ["AA", "EE"]
    assert r.dropped and r.dropped[0][0] == "M"


def test_report_explains_frame_length_in_ms():
    """Отчёт обязан говорить человеку, ПОЧЕМУ фонема не влезла."""
    r = align_phonemes_to_frames(line(("M", 0.0, 0.02)), fps=24)
    s = r.summary()
    assert abs(s["frame_ms"] - 41.67) < 0.1
    assert "ms" in s["note"]


def test_fast_speech_marks_merges():
    """Быстрая речь: фонемы наезжают, и это ОТМЕЧЕНО, а не скрыто."""
    fast = line(("AA", 0.00, 0.02), ("M", 0.02, 0.04), ("EE", 0.04, 0.06),
                ("F", 0.06, 0.08))
    r = align_phonemes_to_frames(fast, fps=24)
    assert r.merged, "наложение фонем не зафиксировано"


def test_higher_fps_loses_less():
    """При 48 fps кадр вдвое короче, значит короткая фонема влезает.
    Это и есть проверка, что перевод в кадры реально зависит от fps."""
    short = line(("AA", 0.0, 0.10), ("M", 0.10, 0.13), ("EE", 0.13, 0.30))
    lo = align_phonemes_to_frames(short, fps=12)
    hi = align_phonemes_to_frames(short, fps=48)
    assert len(hi.dropped) < len(lo.dropped)


def test_start_frame_offset_respected():
    r = align_phonemes_to_frames(line(("AA", 0.0, 0.2)), fps=24, start_frame=101)
    assert r.aligned[0].start_frame == 101


def test_bad_fps_rejected():
    for bad in (0, -24):
        try:
            align_phonemes_to_frames(line(("AA", 0, 0.2)), fps=bad)
            assert False
        except ValueError:
            pass


def test_empty_input_is_empty_output():
    r = align_phonemes_to_frames([], fps=24)
    assert r.aligned == [] and r.summary()["phonemes"] == 0


# ---------------------------------------------------------------------------
# Липсинк-канал
# ---------------------------------------------------------------------------

def test_channel_built_from_phonemes():
    r = align_phonemes_to_frames(
        line(("AA", 0.0, 0.2), ("M", 0.2, 0.35), ("EE", 0.35, 0.5)), fps=24)
    ch = lipsync_channel(r, MOUTHS)
    assert [a.drawing for a in ch[:3]] == ["mouth_A", "mouth_M", "mouth_E"]


def test_mouth_closes_after_last_phoneme():
    """Иначе персонаж застывает с открытым ртом до конца сцены."""
    r = align_phonemes_to_frames(line(("AA", 0.0, 0.2)), fps=24)
    ch = lipsync_channel(r, MOUTHS, default="flat")
    assert ch[-1].drawing == "flat"
    assert ch[-1].frame == r.aligned[-1].end_frame + 1


def test_unknown_phoneme_raises_instead_of_silent_default():
    """«Рот не открылся на половине слов» — дефект, который надо увидеть
    сразу, а не искать на просмотре."""
    r = align_phonemes_to_frames(line(("AA", 0.0, 0.2), ("ZZ", 0.2, 0.4)), fps=24)
    try:
        lipsync_channel(r, MOUTHS)
        assert False, "неизвестная фонема прошла молча"
    except KeyError as e:
        assert "ZZ" in str(e)


def test_empty_report_gives_empty_channel():
    r = align_phonemes_to_frames([], fps=24)
    assert lipsync_channel(r, MOUTHS) == []


# ---------------------------------------------------------------------------
# Проверка синхрона
# ---------------------------------------------------------------------------

def test_sync_check_reports_silent_tail():
    """Сцена длиннее звука: хвост будет немым — надо сказать заранее."""
    import shutil
    if shutil.which("ffprobe") is None:
        return          # без ffprobe эту проверку не сделать честно
    import subprocess
    import tempfile
    from pathlib import Path
    d = Path(tempfile.mkdtemp())
    wav = d / "tone.wav"
    subprocess.run(["ffmpeg", "-y", "-f", "lavfi", "-i", "sine=f=440:d=1",
                    str(wav)], capture_output=True)
    if not wav.exists():
        return
    r = check_sync(scene_frames=72, fps=24, audio_path=wav)   # 3с сцена, 1с звук
    assert r["in_sync"] is False
    assert "silent" in r["verdict"]


def test_sync_check_reports_cut_line():
    import shutil
    if shutil.which("ffprobe") is None:
        return
    import subprocess
    import tempfile
    from pathlib import Path
    d = Path(tempfile.mkdtemp())
    wav = d / "tone.wav"
    subprocess.run(["ffmpeg", "-y", "-f", "lavfi", "-i", "sine=f=440:d=3",
                    str(wav)], capture_output=True)
    if not wav.exists():
        return
    r = check_sync(scene_frames=24, fps=24, audio_path=wav)   # 1с сцена, 3с звук
    assert r["in_sync"] is False
    assert "cut off" in r["verdict"]


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
