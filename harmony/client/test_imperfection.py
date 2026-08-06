"""
test_imperfection.py — тесты управляемой грязи. Без Harmony.

Парадокс модуля: тесты проверяют, что несовершенство ДОСТАТОЧНО
несовершенно (не метроном, не стерильно) и при этом НЕ РАЗРУШИТЕЛЬНО
(позы целы, толщина положительна, всё воспроизводимо сидом).
"""

from __future__ import annotations

from columns import Key
from imperfection import (
    ImperfectionRecord,
    jitter_curve,
    line_boil_cycle,
    wobble_thickness,
)


# ---------------------------------------------------------------------------
# Line boil
# ---------------------------------------------------------------------------

def test_boil_covers_range_on_twos():
    plan = line_boil_cycle(["a", "a2", "a3"], 1, 24, hold=2, seed=1)
    assert plan[0].frame == 1
    covered = sum(a.duration for a in plan)
    assert covered == 24
    assert all(a.duration == 2 for a in plan[:-1])


def test_boil_no_two_same_in_a_row():
    """Два одинаковых подряд = внезапный холд посреди кипения."""
    plan = line_boil_cycle(["a", "a2", "a3"], 1, 200, hold=2, seed=7)
    for x, y in zip(plan, plan[1:]):
        assert x.drawing != y.drawing


def test_boil_two_variants_alternate():
    """С двумя вариантами без повторов остаётся строгое чередование —
    это легально (классический two-stroke boil)."""
    plan = line_boil_cycle(["a", "b"], 1, 20, hold=2, seed=3)
    assert [x.drawing for x in plan[:4]] == ["a", "b", "a", "b"] or \
           [x.drawing for x in plan[:4]] == ["b", "a", "b", "a"]


def test_boil_single_variant_is_an_error():
    """Кипятить один рисунок нечем — и это громкая ошибка, не тихая
    стерильность."""
    try:
        line_boil_cycle(["a"], 1, 10)
        assert False
    except ValueError as e:
        assert "variants" in str(e)


def test_boil_seed_reproducible():
    a = line_boil_cycle(["a", "b", "c"], 1, 50, seed=5)
    b = line_boil_cycle(["a", "b", "c"], 1, 50, seed=5)
    c = line_boil_cycle(["a", "b", "c"], 1, 50, seed=6)
    assert a == b
    assert a != c


def test_boil_empty_range():
    assert line_boil_cycle(["a", "b"], 10, 5) == []


# ---------------------------------------------------------------------------
# Jitter
# ---------------------------------------------------------------------------

def ramp(n=25, lo=0.0, hi=100.0):
    return [Key(frame=i + 1, value=lo + (hi - lo) * i / (n - 1)) for i in range(n)]


def test_jitter_moves_middle_keys():
    keys = ramp()
    noisy = jitter_curve(keys, amplitude=2.0, seed=1)
    moved = sum(1 for a, b in zip(keys, noisy) if a.value != b.value)
    assert moved > len(keys) // 2, "jitter did almost nothing"


def test_jitter_protects_extremes():
    """Крайние точки замаха — сознательные позы. Их не трогаем."""
    keys = [Key(1, 0), Key(5, 50), Key(10, -30), Key(15, 80), Key(20, 10)]
    noisy = jitter_curve(keys, amplitude=5.0, seed=2)
    # все внутренние ключи здесь экстремумы (знак меняется на каждом) + края
    assert [k.value for k in noisy] == [0, 50, -30, 80, 10]


def test_jitter_bounded_by_amplitude():
    keys = ramp(50)
    noisy = jitter_curve(keys, amplitude=1.5, seed=3)
    for a, b in zip(keys, noisy):
        assert abs(a.value - b.value) <= 1.5 + 1e-9


def test_jitter_is_correlated_not_white():
    """Соседние смещения похожи (низкочастотный дрейф), а не прыгают.
    Белый шум = тряска = болезнь, не живость."""
    keys = ramp(60)
    noisy = jitter_curve(keys, amplitude=2.0, seed=4, protect_extremes=False,
                         wavelength_frames=8.0)
    offs = [b.value - a.value for a, b in zip(keys, noisy)]
    # средний шаг между соседними смещениями много меньше полного размаха
    steps = [abs(offs[i + 1] - offs[i]) for i in range(len(offs) - 1)]
    assert max(offs) - min(offs) > 0.5
    assert sum(steps) / len(steps) < (max(offs) - min(offs)) / 3


def test_jitter_zero_amplitude_identity():
    keys = ramp()
    assert jitter_curve(keys, amplitude=0.0) == keys


def test_jitter_seed_reproducible():
    keys = ramp()
    assert jitter_curve(keys, 2.0, seed=9) == jitter_curve(keys, 2.0, seed=9)
    assert jitter_curve(keys, 2.0, seed=9) != jitter_curve(keys, 2.0, seed=10)


# ---------------------------------------------------------------------------
# Толщина
# ---------------------------------------------------------------------------

def test_thickness_stays_near_base():
    ks = wobble_thickness(3.0, 1, 100, depth_pct=8.0, seed=1)
    for k in ks:
        assert abs(k.value - 3.0) <= 3.0 * 0.08 + 1e-9


def test_thickness_never_non_positive():
    """Ни при каком сиде толщина не уходит в ноль/минус."""
    for seed in range(20):
        ks = wobble_thickness(0.5, 1, 60, depth_pct=50.0, seed=seed)
        assert all(k.value > 0 for k in ks)


def test_thickness_actually_wobbles():
    ks = wobble_thickness(3.0, 1, 100, depth_pct=8.0, seed=2)
    vals = {round(k.value, 4) for k in ks}
    assert len(vals) > len(ks) // 2, "thickness barely moves"


def test_thickness_insane_depth_rejected():
    try:
        wobble_thickness(3.0, 1, 10, depth_pct=80.0)
        assert False
    except ValueError:
        pass


def test_thickness_ends_on_base():
    ks = wobble_thickness(3.0, 1, 97, depth_pct=8.0, step=2)
    assert ks[-1].frame == 97


# ---------------------------------------------------------------------------
# Паспорт
# ---------------------------------------------------------------------------

def test_record_serializes():
    r = ImperfectionRecord("line_boil", "Top/head", (1, 48), 7,
                           {"variants": ["a", "a2"], "hold": 2})
    d = r.as_dict()
    assert d["kind"] == "line_boil"
    assert d["frames"] == [1, 48]
    assert d["seed"] == 7


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
