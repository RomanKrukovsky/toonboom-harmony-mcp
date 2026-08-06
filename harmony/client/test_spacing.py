"""
test_spacing.py — тесты математики профилей спейсинга.

Работают БЕЗ Harmony: это единственная часть xsheet/curve-слоя, которую можно
проверить без запущенного приложения, и одновременно та, где ошибка обходится
дороже всего — неверный профиль не падает, он даёт тихо неправильный тайминг.

Запуск:  python3 -m pytest test_spacing.py -q
   или:  python3 test_spacing.py
"""

from __future__ import annotations

import math

from columns import Handles, Key, _bezier_1d, _solve_bezier_t_for_x, sample_profile

MONOTONIC = ["linear", "ease_in", "ease_out", "ease_in_out", "heavy_impact"]
ALL = MONOTONIC + ["settle", "anticipation_overshoot"]


def velocity(s: list[float]) -> list[float]:
    return [s[i + 1] - s[i] for i in range(len(s) - 1)]


def test_endpoints_and_length():
    for p in ALL:
        for n in (2, 3, 6, 24, 120):
            s = sample_profile(p, n)
            assert len(s) == n, f"{p}/{n}: length {len(s)}"
            assert abs(s[-1] - 1.0) < 1e-9, f"{p}/{n}: end {s[-1]}"
            assert all(math.isfinite(v) for v in s), f"{p}/{n}: non-finite"


def test_monotonic_profiles_never_go_backwards():
    for p in MONOTONIC:
        s = sample_profile(p, 60)
        assert all(s[i + 1] >= s[i] - 1e-9 for i in range(59)), f"{p}: reverses"


def test_linear_is_linear():
    s = sample_profile("linear", 21)
    assert max(abs(s[i] - i / 20) for i in range(21)) < 0.02


def test_heavy_impact_is_gravity():
    """
    Тяжёлое падение = свободное падение = s ~ t².

    Регрессия: первый вариант (0.55, 0.06, 0.90, 0.99) выглядел похоже по
    позиции, но терял скорость на последних кадрах — тело перед ударом
    притормаживало. Это читается как всплытие и убивает вес. Поэтому здесь
    проверяется не только близость к t², но и монотонный рост скорости.
    """
    n = 13
    s = sample_profile("heavy_impact", n)
    assert max(abs(s[i] - (i / (n - 1)) ** 2) for i in range(n)) < 0.01, "deviates from t^2"

    v = velocity(s)
    assert all(v[i + 1] >= v[i] - 1e-9 for i in range(len(v) - 1)), f"decelerates: {v}"
    assert v[-1] > v[0] * 5, "impact velocity too low to read as weight"


def test_velocity_direction():
    for p, should_grow in (("ease_in", True), ("ease_out", False)):
        v = velocity(sample_profile(p, 25))
        assert (v[-1] > v[0]) is should_grow, f"{p}: wrong velocity trend"


def test_ease_in_out_is_symmetric():
    s = sample_profile("ease_in_out", 21)
    assert max(abs(s[i] - (1 - s[20 - i])) for i in range(21)) < 0.02


def test_anticipation_dips_then_overshoots():
    s = sample_profile("anticipation_overshoot", 40)
    assert min(s) < -0.01, "no anticipation (no counter-movement)"
    assert max(s) > 1.01, "no overshoot"
    assert s.index(min(s)) < len(s) // 3, "anticipation dip happens too late"


def test_settle_oscillates_around_target():
    s = sample_profile("settle", 40)
    assert max(s) > 1.0, "settle never crosses the target"
    v = velocity(s)
    flips = sum(1 for i in range(1, len(v)) if v[i] * v[i - 1] < 0)
    assert flips >= 1, "settle does not reverse — that is not a settle"


def test_custom_velocity():
    s = sample_profile("custom", 7, {"custom_velocity": [1, 3, 3, 1]})
    assert abs(s[-1] - 1.0) < 1e-9
    assert all(s[i + 1] >= s[i] - 1e-9 for i in range(len(s) - 1))


def test_bezier_solver_accuracy():
    for cx1, cx2 in ((0.42, 1.0), (0.0, 0.58), (0.33, 0.67), (0.55, 0.9)):
        for x in (0.0, 0.13, 0.5, 0.87, 1.0):
            t = _solve_bezier_t_for_x(cx1, cx2, x)
            assert abs(_bezier_1d(0.0, cx1, cx2, 1.0, t) - x) < 1e-4


def test_key_roundtrip_preserves_handle_absence():
    """
    Ключ без хендлов должен остаться без хендлов после round-trip.
    Иначе curve_set решит, что мы синтезируем хендлы, и потребует калибровки
    там, где она не нужна.
    """
    assert Key.from_dict({"frame": 1, "value": 0}).handles is None
    k = Key(5, 10.0, Handles(0, 0, 2, 3))
    assert Key.from_dict(k.as_dict()).handles.rx == 2


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
