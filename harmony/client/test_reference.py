"""
test_reference.py — тесты обратной разработки референса. Без Harmony.

Синтетические референсы строим из тех же профилей, которыми потом
классифицируем, — и проверяем, что разбор узнаёт то, из чего собрано.
Это честный тест: если классификатор не узнаёт собственную библиотеку,
на чужом видео он безнадёжен.
"""

from __future__ import annotations

from columns import sample_profile
from reference import (
    analyze_track,
    apply_timing_to,
    classify_segment,
    detect_exposure,
    find_key_poses,
)


def synth(profile: str, n: int, lo: float = 0.0, hi: float = 100.0) -> list[float]:
    return [lo + (hi - lo) * v for v in sample_profile(profile, n)]  # type: ignore[arg-type]


def on_twos(track: list[float]) -> list[float]:
    """Пересъёмка по двойкам: каждое значение держится 2 кадра."""
    out = []
    for v in track:
        out.extend([v, v])
    return out


# ---------------------------------------------------------------------------
# Экспозиция
# ---------------------------------------------------------------------------

def test_ones_detected():
    assert detect_exposure(synth("linear", 48)) == 1


def test_twos_detected():
    assert detect_exposure(on_twos(synth("linear", 24))) == 2


def test_threes_detected():
    track = []
    for v in synth("linear", 16):
        track.extend([v, v, v])
    assert detect_exposure(track) == 3


# ---------------------------------------------------------------------------
# Ключевые позы
# ---------------------------------------------------------------------------

def test_extremes_found():
    """Туда-обратно: пик — ключевая поза."""
    track = synth("linear", 12) + synth("linear", 12, 100, 0)[1:]
    poses = find_key_poses(track)
    assert 0 in poses and len(track) - 1 in poses
    assert 11 in poses     # вершина


def test_hold_boundaries_found():
    track = synth("ease_out", 10) + [100.0] * 8 + synth("linear", 6, 100, 40)[1:]
    poses = find_key_poses(track, min_hold_frames=4)
    assert 9 in poses      # начало холда
    assert 17 in poses     # конец холда


def test_flat_track_two_poses():
    assert find_key_poses([5.0] * 20, min_hold_frames=4) == [0, 19]


# ---------------------------------------------------------------------------
# Классификация сегментов
# ---------------------------------------------------------------------------

def test_recognizes_own_library():
    for p in ("linear", "ease_in", "ease_out", "ease_in_out", "heavy_impact"):
        track = synth(p, 24)
        got, err = classify_segment(track, 0, 23)
        assert got == p, f"{p} classified as {got} (err={err})"
        assert err < 0.05


def test_hold_classified_as_hold():
    got, err = classify_segment([7.0] * 10, 0, 9)
    assert got == "hold"


def test_fit_error_honest_on_alien_motion():
    """Движение, которого нет в библиотеке (двугорбое), обязано получить
    ЗАМЕТНУЮ ошибку подгонки — ярлык без меры доверия это враньё."""
    import math
    alien = [50 * (1 - math.cos(2 * math.pi * i / 23)) for i in range(24)]
    _, err = classify_segment(alien, 0, 23)
    assert err > 0.15, err


# ---------------------------------------------------------------------------
# Полный разбор
# ---------------------------------------------------------------------------

def test_full_analysis_move_hold_move():
    track = (synth("ease_out", 12) + [100.0] * 8
             + synth("heavy_impact", 12, 100, 0)[1:])
    a = analyze_track(track)
    kinds = [s.kind for s in a.segments]
    assert kinds == ["move", "hold", "move"], a.segments
    assert a.segments[0].profile == "ease_out"
    assert a.segments[2].profile == "heavy_impact"
    assert a.exposure_hint == 1


def test_analysis_on_twos_recovers_profile():
    """Референс на двойках: профиль виден сквозь ступеньки экспозиции."""
    a = analyze_track(on_twos(synth("ease_in", 18)))
    assert a.exposure_hint == 2
    moves = [s for s in a.segments if s.kind == "move"]
    assert moves and moves[0].profile == "ease_in"
    assert "2s" in a.notes[0]


def test_gaps_interpolated():
    track: list = synth("linear", 20)
    track[5] = None
    track[6] = None
    a = analyze_track(track)
    assert a.segments        # не упало и что-то разобрало


def test_all_none_rejected():
    try:
        analyze_track([None, None, None])
        assert False
    except ValueError:
        pass


def test_poor_fit_noted():
    import math
    alien = [50 * (1 - math.cos(2 * math.pi * i / 23)) for i in range(24)]
    # добавим края, чтобы был один сегмент между экстремумами... вершина
    # в середине сама станет позой, поэтому проверяем на половине волны
    a = analyze_track(alien[:12])
    # если подгонка плохая — об этом сказано словами
    if any(s.fit_error > 0.15 for s in a.segments if s.kind == "move"):
        assert any("approximate" in n for n in a.notes)


# ---------------------------------------------------------------------------
# Перенос тайминга
# ---------------------------------------------------------------------------

def test_timing_transfer_keeps_proportions():
    track = synth("ease_out", 12) + [100.0] * 8 + synth("linear", 6, 100, 0)[1:]
    a = analyze_track(track)
    keys = apply_timing_to(a, target_from=0.0, target_to=-40.0, start_frame=101)
    # длительности сегментов сохранены
    assert keys[0].frame == 101
    assert keys[1].frame - keys[0].frame == a.segments[0].frames
    # амплитуда — наша: значения в [-40, 0]
    vals = [k.value for k in keys]
    assert min(vals) >= -40 - 1e-9 and max(vals) <= 0 + 1e-9
    # направление наше: старт в 0, финал в -... (референс шёл вверх)
    assert keys[0].value == 0.0


def test_timing_transfer_holds_survive():
    track = synth("linear", 10) + [100.0] * 10 + synth("linear", 10, 100, 0)[1:]
    a = analyze_track(track)
    keys = apply_timing_to(a, 0, 50)
    hold = next(s for s in a.segments if s.kind == "hold")
    # найдём пару ключей, соответствующую холду: значения равны
    frames = [k.frame for k in keys]
    i = frames.index(1 + (hold.from_frame - 1))
    assert abs(keys[i].value - keys[i + 1].value) < 1e-9


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
