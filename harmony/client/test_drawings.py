"""
test_drawings.py — тесты липсинка и морганий. Без Harmony.

Каждое правило здесь из разряда «нарушение не падает, а выглядит не так»:
однокадровый рот мерцает, регулярные моргания читаются метрономом,
пропавшая смычка губ превращает «мама» в «ааа». Глазами это ловится
на просмотре — то есть поздно. Поэтому тестами.

Запуск:  python3 test_drawings.py   (или pytest)
"""

from __future__ import annotations

from drawings import (
    Assignment,
    MouthSet,
    Phoneme,
    blink_assignments,
    lipsync_assignments,
)

MOUTHS = MouthSet({
    "rest": "m_rest", "closed": "m_mbp", "narrow": "m_etc",
    "wide": "m_ee", "open": "m_aa", "round": "m_oo",
    "teeth": "m_fv", "tongue": "m_th",
})


def say(*items: tuple[str, float, float]) -> list[Phoneme]:
    return [Phoneme(s, a, b) for s, a, b in items]


# ---------------------------------------------------------------------------
# Липсинк
# ---------------------------------------------------------------------------

def test_no_single_frame_mouths():
    """Однокадровый рот на 24 fps мерцает, а не читается. Никогда."""
    # нарочно очень быстрая речь: фонемы по 1.5 кадра
    ph = say(("AA", 0.00, 0.06), ("M", 0.06, 0.12), ("IY", 0.12, 0.18),
             ("F", 0.18, 0.24), ("OW", 0.24, 0.30))
    plan = lipsync_assignments(ph, MOUTHS, fps=24)
    assert all(a.duration >= 2 for a in plan), [a.duration for a in plan]


def test_labial_closure_survives_fast_speech():
    """
    Смычка губ (М/Б/П) обязана быть видна даже в скороговорке.
    Если поглотить её как обычную короткую фонему, «мама» станет «ааа» —
    и зритель увидит, что рот врёт, даже не понимая почему.
    """
    ph = say(("AA", 0.00, 0.05), ("M", 0.05, 0.09), ("AA", 0.09, 0.30))
    plan = lipsync_assignments(ph, MOUTHS, fps=24)
    assert any(a.drawing == "m_mbp" for a in plan), plan


def test_mouth_leads_sound():
    """Рот опережает звук: артикуляция видна ДО звука, иначе кажется отставанием."""
    ph = say(("AA", 1.0, 1.5))
    plan = lipsync_assignments(ph, MOUTHS, fps=24, lead_frames=1, start_frame=1)
    # звук на кадре 1 + 24 = 25, рот должен встать на 24
    assert plan[0].frame == 24, plan[0]


def test_lead_is_tunable_for_comedy():
    """Идея №22: намеренный рассинхрон — это просто другой lead_frames."""
    ph = say(("AA", 1.0, 1.5))
    late = lipsync_assignments(ph, MOUTHS, fps=24, lead_frames=-6)
    ontime = lipsync_assignments(ph, MOUTHS, fps=24, lead_frames=0)
    assert late[0].frame - ontime[0].frame == 6


def test_same_mouth_merges():
    """Две подряд гласные одного класса — один рот, не два назначения."""
    ph = say(("AA", 0.0, 0.2), ("AH", 0.2, 0.4), ("M", 0.4, 0.6))
    plan = lipsync_assignments(ph, MOUTHS, fps=24)
    opens = [a for a in plan if a.drawing == "m_aa"]
    assert len(opens) == 1, plan


def test_durations_tile_without_gaps():
    """Назначения покрывают время встык: дыра = пустой кадр = мигание рта."""
    ph = say(("AA", 0.0, 0.3), ("M", 0.3, 0.5), ("IY", 0.5, 1.0))
    plan = lipsync_assignments(ph, MOUTHS, fps=24)
    for a, b in zip(plan, plan[1:]):
        assert a.frame + a.duration >= b.frame, (a, b)


def test_empty_input():
    assert lipsync_assignments([], MOUTHS) == []


def test_unknown_phoneme_falls_back():
    """Неизвестный звук не роняет пайплайн, а даёт нейтральный рот."""
    plan = lipsync_assignments(say(("XQ", 0.0, 0.5)), MOUTHS, fps=24)
    assert plan and plan[0].drawing == "m_etc"


# ---------------------------------------------------------------------------
# MouthSet: fallback и угадывание
# ---------------------------------------------------------------------------

def test_mouthset_fallback_chain():
    """Бедный риг из трёх ртов должен выражать все 8 канонических позиций."""
    poor = MouthSet({"rest": "a", "open": "b", "closed": "c"})
    for canon in ("tongue", "teeth", "round", "wide", "narrow", "open", "closed", "rest"):
        assert poor.resolve(canon) in ("a", "b", "c")


def test_mouthset_guess_from_names():
    lib = ["mouth_open", "mouth_closed_MBP", "mouth_EE_wide", "mouth_rest", "mouth_OO"]
    ms = MouthSet.guess_from_library(lib)
    assert ms.mapping["open"] == "mouth_open"
    assert ms.mapping["closed"] == "mouth_closed_MBP"
    assert ms.mapping["rest"] == "mouth_rest"


def test_mouthset_numeric_names_dont_pretend():
    """Риг с именами '1'..'8' угадать нельзя — и врать о угадывании нельзя.
    Допустим только честный минимум: rest = первый рисунок."""
    ms = MouthSet.guess_from_library(["1", "2", "3"])
    assert set(ms.mapping) == {"rest"}


# ---------------------------------------------------------------------------
# Моргания
# ---------------------------------------------------------------------------

EYES = dict(eye_open="e_open", eye_half="e_half", eye_closed="e_closed")


def blinks(dur=20.0, **kw):
    return blink_assignments(dur, seed=42, **{**EYES, **kw})


def blink_starts(plan):
    return [a.frame for a in plan if a.drawing == "e_closed"]


def test_blinks_are_not_metronome():
    """Главное правило: интервалы НЕ равны. Метроном = мёртвая анимация."""
    starts = blink_starts(blinks(60.0, state="calm"))
    assert len(starts) >= 5
    gaps = [b - a for a, b in zip(starts, starts[1:])]
    assert len(set(gaps)) > 1, f"metronome detected: {gaps}"


def test_blinks_reproducible_by_seed():
    """Тот же сид — те же моргания. Ретейк ртов не должен трясти глаза."""
    a = blink_assignments(30.0, seed=7, **EYES)
    b = blink_assignments(30.0, seed=7, **EYES)
    assert a == b
    c = blink_assignments(30.0, seed=8, **EYES)
    assert a != c


def test_nervous_blinks_more_than_focused():
    """Состояние управляет частотой: нервный моргает чаще сосредоточенного."""
    n = len(blink_starts(blinks(120.0, state="nervous")))
    f = len(blink_starts(blinks(120.0, state="focused")))
    assert n > f * 1.5, (n, f)


def test_tired_holds_longer():
    """У уставшего веки тяжёлые: closed держится дольше."""
    tired = [a for a in blinks(60.0, state="tired") if a.drawing == "e_closed"]
    calm = [a for a in blinks(60.0, state="calm") if a.drawing == "e_closed"]
    assert tired and calm
    assert tired[0].duration > calm[0].duration


def test_blink_has_half_frames():
    """half -> closed -> half -> open: без полукадров моргание — щелчок."""
    plan = blinks(20.0)
    assert plan
    seq = [a.drawing for a in plan[:4]]
    assert seq == ["e_half", "e_closed", "e_half", "e_open"], seq


def test_avoid_frames_respected():
    """Моргание не попадает в запретные кадры (акценты игры)."""
    forbidden = set(range(40, 60))
    plan = blink_assignments(10.0, seed=3, avoid_frames=sorted(forbidden), **EYES)
    for a in plan:
        for k in range(a.duration):
            assert (a.frame + k) not in forbidden, a


def test_blinks_dont_overlap():
    plan = blinks(60.0, state="nervous")
    starts = blink_starts(plan)
    ends = [a.frame + a.duration for a in plan if a.drawing == "e_open"]
    for e, s in zip(ends, starts[1:]):
        assert s >= e, (e, s)


def test_zero_duration():
    assert blink_assignments(0.0, **EYES) == []


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
