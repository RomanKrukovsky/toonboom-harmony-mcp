"""
craft.py — принципы анимации как функции над ключами.

Идеи из списка:
  №21 overlap        — задержка по цепочке (волосы, ткань, уши)
  №26 антиципация    — контрдвижение перед большим перемещением
  №25 микродрейф     — лечение мёртвых холдов
  №27 физлинтер      — центр масс над опорой
  №28 выбор 1s/2s/3s — частота экспозиции по интенсивности движения

Всё — чистые функции над list[Key]. Harmony не нужен: вход и выход — те же
ключи, что ходят через columns.Columns. Поэтому каждое правило тестируется
за миллисекунды, а не за сеанс с открытой сценой.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Sequence

from columns import Key


# ---------------------------------------------------------------------------
# №21. Overlap: инерция как параметр, а не талант
# ---------------------------------------------------------------------------

def overlap_chain(keys: Sequence[Key], chain_length: int,
                  delay_frames: float = 1.5,
                  amplitude_falloff: float = 1.1) -> list[list[Key]]:
    """
    Из движения корня — движения всей цепочки (волосы, хвост, ткань).

    Каждое следующее звено:
      - отстаёт на delay_frames (инерция: кончик узнаёт о движении позже)
      - амплитуда * amplitude_falloff (свободный кончик машет ШИРЕ корня —
        частая ошибка делать наоборот: затухающий к кончику хвост выглядит
        деревянным; затухание уместно только для очень жёстких цепочек,
        тогда falloff < 1)

    Возвращает список кривых: [звено1, звено2, ...] — БЕЗ корня.
    Кривые смещены во времени и отмасштабированы по значению вокруг
    первой позиции.
    """
    if chain_length < 1:
        return []
    if not keys:
        return [[] for _ in range(chain_length)]

    base = keys[0].value
    out: list[list[Key]] = []
    for link in range(1, chain_length + 1):
        delay = delay_frames * link
        amp = amplitude_falloff ** link
        shifted = [
            Key(frame=k.frame + delay,
                value=base + (k.value - base) * amp,
                handles=k.handles,
                const_segment=k.const_segment,
                continuity=k.continuity)
            for k in keys
        ]
        out.append(shifted)
    return out


# ---------------------------------------------------------------------------
# №26. Антиципация: контрдвижение перед большим перемещением
# ---------------------------------------------------------------------------

def insert_anticipation(keys: Sequence[Key],
                        min_move: float = 30.0,
                        anticipation_frames: int = 4,
                        anticipation_pct: float = 10.0) -> list[Key]:
    """
    Находит большие перемещения (|Δvalue| >= min_move между соседними
    ключами) и вставляет ПЕРЕД ними замах в противоположную сторону.

    Правила, без которых это генератор мусора, а не антиципации:
      - замах не вставляется, если перед движением нет места (предыдущий
        ключ ближе anticipation_frames) — сдвигать чужие ключи нельзя,
        это уже чей-то тайминг;
      - замах не вставляется перед движением, которое само является
        возвратом из замаха (знак противоположен предыдущему сегменту
        и амплитуда меньше его) — иначе антиципация антиципации, и
        персонаж дрожит.
    """
    if len(keys) < 2:
        return list(keys)

    ks = sorted(keys, key=lambda k: k.frame)
    out: list[Key] = [ks[0]]
    for i in range(1, len(ks)):
        prev, cur = ks[i - 1], ks[i]
        delta = cur.value - prev.value

        big = abs(delta) >= min_move
        room = (prev.frame + anticipation_frames) < cur.frame if i >= 1 else False
        # это возврат из замаха?
        is_recovery = False
        if i >= 2:
            prev_delta = ks[i - 1].value - ks[i - 2].value
            if prev_delta * delta < 0 and abs(delta) < abs(prev_delta):
                is_recovery = True

        if big and room and not is_recovery:
            anti_val = prev.value - delta * (anticipation_pct / 100.0)
            anti_frame = cur.frame - anticipation_frames
            # замах ставится после prev, до cur
            if anti_frame > prev.frame:
                out.append(Key(frame=anti_frame, value=anti_val, continuity="SMOOTH"))
        out.append(cur)
    return out


# ---------------------------------------------------------------------------
# №25. Микродрейф: лечение мёртвых холдов
# ---------------------------------------------------------------------------

def breathe_hold(start_frame: int, end_frame: int, base_value: float,
                 amplitude: float = 0.4, period_frames: float = 36.0,
                 seed: int = 0) -> list[Key]:
    """
    Заполняет холд медленной квазислучайной волной вокруг base_value.

    Синус с двумя несоизмеримыми частотами: строгий синус глаз тоже ловит
    как метроном (та же болезнь, что регулярные моргания). Сумма двух
    несоизмеримых периодов не повторяется на длине любого реального холда.

    amplitude по умолчанию 0.4 — доли процента от типичных значений
    position: дрейф должен ЧУВСТВОВАТЬСЯ, а не видеться. Если дрейф видно —
    он уже не лечит мёртвый холд, а создаёт плавающий.
    """
    if end_frame <= start_frame:
        return []
    phase = (seed % 97) * 0.13
    w1 = 2 * math.pi / period_frames
    w2 = 2 * math.pi / (period_frames * math.sqrt(2))   # несоизмерим с w1
    out = []
    step = max(2, int(period_frames / 6))
    f = start_frame
    while f <= end_frame:
        v = base_value + amplitude * (
            0.6 * math.sin(w1 * (f - start_frame) + phase)
            + 0.4 * math.sin(w2 * (f - start_frame) + phase * 1.7)
        )
        out.append(Key(frame=f, value=v, continuity="SMOOTH"))
        f += step
    # последний ключ возвращает точно в base: холд кончается там же, где начался
    if out and out[-1].frame != end_frame:
        out.append(Key(frame=end_frame, value=base_value, continuity="SMOOTH"))
    else:
        out[-1] = Key(frame=end_frame, value=base_value, continuity="SMOOTH")
    return out


# ---------------------------------------------------------------------------
# №27. Физический линтер: центр масс над опорой
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class BalanceSample:
    frame: int
    com_x: float          # центр масс, X
    support_min: float    # левый край опоры (например, пятка задней ноги)
    support_max: float    # правый край опоры


def lint_balance(samples: Sequence[BalanceSample],
                 margin: float = 0.0,
                 airborne_frames: Sequence[int] = ()) -> list[dict]:
    """
    Проверяет: центр масс — над полигоном опоры (в 2D — отрезком).

    airborne_frames — кадры, где персонаж в воздухе: там проверка
    не имеет смысла (в прыжке ЦМ и должен быть вне опоры).

    Ловит «плавающие проходки»: ЦМ вне опоры дольше 3 кадров подряд
    при контакте с землёй — это поза, в которой человек падает.
    Одиночные кадры дисбаланса легальны: перенос веса так и выглядит.
    """
    air = set(airborne_frames)
    findings: list[dict] = []
    run_start = None
    run_side = None

    def close_run(end_frame: int) -> None:
        nonlocal run_start, run_side
        if run_start is not None and end_frame - run_start >= 3:
            findings.append({
                "rule": "off-balance", "severity": "warning",
                "from": run_start, "to": end_frame,
                "message": f"centre of mass beyond support ({run_side}) for "
                           f"{end_frame - run_start} frames while grounded — figure would fall",
            })
        run_start, run_side = None, None

    for s in samples:
        if s.frame in air:
            close_run(s.frame)
            continue
        lo, hi = s.support_min - margin, s.support_max + margin
        if s.com_x < lo or s.com_x > hi:
            side = "left" if s.com_x < lo else "right"
            if run_start is None:
                run_start, run_side = s.frame, side
            elif side != run_side:
                close_run(s.frame)
                run_start, run_side = s.frame, side
        else:
            close_run(s.frame)
    if samples:
        close_run(samples[-1].frame + 1)
    return findings


# ---------------------------------------------------------------------------
# №28. Выбор экспозиции: 1s / 2s / 3s по интенсивности движения
# ---------------------------------------------------------------------------

@dataclass
class ExposurePlan:
    segments: list[dict]        # {from, to, ones: 1|2|3, reason}

    def as_ranges(self) -> list[tuple[int, int, int]]:
        return [(s["from"], s["to"], s["ones"]) for s in self.segments]


def choose_exposure(velocity: Sequence[float | None], start_frame: int = 1,
                    fast: float = 8.0, slow: float = 1.5,
                    min_segment: int = 8) -> ExposurePlan:
    """
    Классика ремесла, формализованная:
      быстрое движение  -> по единицам (1s): на двойках стробит;
      среднее           -> по двойкам (2s): стандарт индустрии, дешевле вдвое;
      почти статика     -> по тройкам (3s): никто не заметит.

    velocity — модуль скорости ведущей кривой (обычно позиция корневого пега),
    берётся из curve_sample.

    min_segment: частота не дёргается туда-сюда каждые 3 кадра — смена
    экспозиции сама по себе видна, поэтому сегменты короче min_segment
    поглощаются соседним более БЫСТРЫМ (безопасная сторона: лучше лишние
    единицы, чем строб).

    reason в каждом сегменте — письменная защита выбора (как в идее №28
    и просилось: «решает и письменно защищает»).
    """
    if not velocity:
        return ExposurePlan([])

    def rate(v: float | None) -> int:
        if v is None:
            return 2
        a = abs(v)
        if a >= fast:
            return 1
        if a >= slow:
            return 2
        return 3

    # 1. Посегментно
    raw: list[list] = []
    for i, v in enumerate(velocity):
        r = rate(v)
        if raw and raw[-1][0] == r:
            raw[-1][2] = i
        else:
            raw.append([r, i, i])

    # 2. Короткие сегменты поглощаются более быстрым соседом
    changed = True
    while changed and len(raw) > 1:
        changed = False
        for i, seg in enumerate(raw):
            if seg[2] - seg[1] + 1 >= min_segment:
                continue
            neighbours = []
            if i > 0:
                neighbours.append(raw[i - 1])
            if i < len(raw) - 1:
                neighbours.append(raw[i + 1])
            target = min(neighbours, key=lambda s: s[0])   # меньший ones = быстрее
            target[1] = min(target[1], seg[1])
            target[2] = max(target[2], seg[2])
            raw.pop(i)
            changed = True
            break

    # склейка одинаковых соседей после поглощений
    merged: list[list] = []
    for seg in raw:
        if merged and merged[-1][0] == seg[0]:
            merged[-1][2] = seg[2]
        else:
            merged.append(seg)

    reasons = {
        1: "fast action: twos would strobe",
        2: "moderate movement: industry-standard twos",
        3: "near-still: threes are invisible here and 3x cheaper",
    }
    return ExposurePlan([
        {"from": start_frame + a, "to": start_frame + b, "ones": r,
         "reason": reasons[r]}
        for r, a, b in merged
    ])


def exposure_to_assignments(plan: ExposurePlan, drawings_in_order: Sequence[str],
                            column_hint: str = "") -> list[dict]:
    """
    План экспозиции -> правки xsheet_set: рисунки из списка раскладываются
    по кадрам с шагом ones. Используется, когда фазы уже нарисованы и
    вопрос только «как часто менять картинку».
    """
    edits: list[dict] = []
    di = 0
    for a, b, ones in plan.as_ranges():
        f = a
        while f <= b and di < len(drawings_in_order):
            dur = min(ones, b - f + 1)
            edits.append({"column": column_hint, "frame": f,
                          "value": drawings_in_order[di], "duration": dur})
            f += ones
            di += 1
    return edits
