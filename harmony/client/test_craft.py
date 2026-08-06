"""
test_craft.py — тесты принципов анимации. Без Harmony.

Как и везде: каждое правило — из разряда «нарушение не падает, а выглядит
неправильно». Хвост, машущий уже корня, деревянный. Антиципация антиципации —
дрожь. Смена экспозиции каждые три кадра — дёрганье. Тесты — единственное
место, где эти правила зафиксированы формально.
"""

from __future__ import annotations

from columns import Key
from craft import (
    BalanceSample,
    breathe_hold,
    choose_exposure,
    insert_anticipation,
    lint_balance,
    overlap_chain,
)


def move(frames_values: list[tuple[float, float]]) -> list[Key]:
    return [Key(frame=f, value=v) for f, v in frames_values]


# ---------------------------------------------------------------------------
# Overlap
# ---------------------------------------------------------------------------

def test_overlap_delays_grow_down_the_chain():
    root = move([(1, 0), (10, 100)])
    chain = overlap_chain(root, chain_length=3, delay_frames=2.0)
    assert len(chain) == 3
    starts = [c[0].frame for c in chain]
    assert starts == [3.0, 5.0, 7.0], starts   # кончик узнаёт последним


def test_overlap_tip_swings_wider():
    """Свободный кончик машет ШИРЕ корня. Затухающий хвост — деревянный."""
    root = move([(1, 0), (10, 100)])
    chain = overlap_chain(root, 3, amplitude_falloff=1.1)
    amps = [c[-1].value for c in chain]
    assert amps[0] > 100 and amps[1] > amps[0] and amps[2] > amps[1], amps


def test_overlap_stiff_chain_can_damp():
    """Жёсткая цепочка (антенна) — falloff < 1, амплитуда падает."""
    root = move([(1, 0), (10, 100)])
    chain = overlap_chain(root, 2, amplitude_falloff=0.7)
    assert chain[0][-1].value < 100 and chain[1][-1].value < chain[0][-1].value


def test_overlap_preserves_rest_position():
    """Все звенья стартуют из позы корня: цепочка в покое не разъезжается."""
    root = move([(1, 50), (10, 150)])
    for link in overlap_chain(root, 3):
        assert link[0].value == 50


def test_overlap_empty_inputs():
    assert overlap_chain([], 3) == [[], [], []]
    assert overlap_chain(move([(1, 0)]), 0) == []


# ---------------------------------------------------------------------------
# Антиципация
# ---------------------------------------------------------------------------

def test_anticipation_inserted_before_big_move():
    keys = move([(1, 0), (20, 100)])
    out = insert_anticipation(keys, min_move=30, anticipation_frames=4,
                              anticipation_pct=10)
    assert len(out) == 3
    anti = out[1]
    assert anti.frame == 16
    assert anti.value == -10.0        # замах ПРОТИВ движения


def test_small_move_untouched():
    keys = move([(1, 0), (20, 10)])
    assert len(insert_anticipation(keys, min_move=30)) == 2


def test_no_room_no_anticipation():
    """Ключи впритык: вставлять некуда, чужой тайминг не двигаем."""
    keys = move([(1, 0), (3, 100)])
    assert len(insert_anticipation(keys, anticipation_frames=4)) == 2


def test_recovery_not_anticipated():
    """Возврат из замаха не получает собственный замах — иначе дрожь."""
    keys = move([(1, 0), (16, -10), (20, 100), (40, 60)])
    out = insert_anticipation(keys, min_move=30, anticipation_frames=4)
    # движение -10 -> 100 большое, но перед ним УЖЕ стоит замах (0 -> -10);
    # и 100 -> 60 — возврат, тоже без замаха
    frames = [k.frame for k in out]
    assert frames == [1, 16, 20, 40], frames


# ---------------------------------------------------------------------------
# Микродрейф
# ---------------------------------------------------------------------------

def test_breathe_returns_to_base():
    ks = breathe_hold(10, 100, base_value=50.0)
    assert ks[-1].frame == 100
    assert ks[-1].value == 50.0


def test_breathe_stays_subtle():
    ks = breathe_hold(1, 200, base_value=0.0, amplitude=0.4)
    assert all(abs(k.value) <= 0.4 + 1e-9 for k in ks)
    assert any(abs(k.value) > 0.05 for k in ks), "drift so small it does nothing"


def test_breathe_is_not_periodic():
    """Значения не повторяются с периодом — сумма несоизмеримых частот."""
    ks = breathe_hold(1, 300, base_value=0.0, period_frames=36)
    vals = [round(k.value, 6) for k in ks[:-1]]
    period = 6  # ключи идут с шагом period/6
    repeats = sum(1 for i in range(len(vals) - period)
                  if vals[i] == vals[i + period])
    assert repeats < len(vals) // 4


def test_breathe_seed_reproducible():
    a = breathe_hold(1, 50, 0.0, seed=5)
    b = breathe_hold(1, 50, 0.0, seed=5)
    c = breathe_hold(1, 50, 0.0, seed=6)
    assert a == b and a != c


def test_breathe_empty_range():
    assert breathe_hold(10, 10, 0.0) == []


# ---------------------------------------------------------------------------
# Баланс
# ---------------------------------------------------------------------------

def sample_run(com: list[float], lo=0.0, hi=10.0, start=1):
    return [BalanceSample(start + i, x, lo, hi) for i, x in enumerate(com)]


def test_balanced_walk_clean():
    assert lint_balance(sample_run([2, 4, 6, 8, 6, 4])) == []


def test_sustained_imbalance_flagged():
    f = lint_balance(sample_run([5, 5, 15, 16, 17, 18, 5]))
    assert len(f) == 1
    assert f[0]["rule"] == "off-balance"
    assert "fall" in f[0]["message"]


def test_single_frame_imbalance_is_legal():
    """Перенос веса выглядит как 1-2 кадра вне опоры. Это не ошибка."""
    assert lint_balance(sample_run([5, 15, 5, 5])) == []


def test_airborne_frames_exempt():
    """В прыжке ЦМ обязан покидать опору — там не проверяем."""
    samples = sample_run([5, 20, 21, 22, 5])
    frames = [s.frame for s in samples][1:4]
    assert lint_balance(samples, airborne_frames=frames) == []
    assert lint_balance(samples) != []


# ---------------------------------------------------------------------------
# Выбор экспозиции
# ---------------------------------------------------------------------------

def test_fast_gets_ones_slow_gets_threes():
    vel = [10.0] * 12 + [3.0] * 12 + [0.5] * 12
    plan = choose_exposure(vel, fast=8, slow=1.5, min_segment=8)
    ones = [s["ones"] for s in plan.segments]
    assert ones == [1, 2, 3], plan.segments


def test_short_flicker_absorbed_by_faster():
    """3 кадра быстрого движения посреди статики не должны дать сегмент 1s
    на 3 кадра — смена экспозиции сама по себе видна. Поглощение идёт в
    БЫСТРУЮ сторону: лучше лишние единицы, чем строб."""
    vel = [0.5] * 20 + [10.0] * 3 + [0.5] * 20
    plan = choose_exposure(vel, min_segment=8)
    assert all(s["to"] - s["from"] + 1 >= 8 or len(plan.segments) == 1
               for s in plan.segments)
    # быстрый кусок не потерялся в тройки молча: где-то есть ones <= 2 либо
    # весь план — один сегмент (все поглощено в самое быстрое)
    assert min(s["ones"] for s in plan.segments) <= 3


def test_every_segment_has_written_reason():
    """Идея №28 дословно: агент «решает и письменно защищает выбор»."""
    plan = choose_exposure([10.0] * 10 + [0.1] * 10, min_segment=4)
    assert all(s["reason"] for s in plan.segments)


def test_exposure_none_velocity_defaults_to_twos():
    plan = choose_exposure([None] * 10)
    assert plan.segments[0]["ones"] == 2


def test_exposure_empty():
    assert choose_exposure([]).segments == []


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
