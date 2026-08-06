"""
imperfection.py — модуль антисовершенства (идея №45).

Машинная анимация выдаёт себя не ошибками, а их отсутствием: идеально
гладкие кривые, идеально стабильная линия, идеально одинаковые холды.
Живой рисунок дышит. Этот модуль добавляет три вида управляемой грязи:

  line_boil_cycle()   — «кипение» линии: рисунок держится, а контур
                        чуть гуляет. В cutout-риге реализуется через
                        ЦИКЛ ДУБЛЕЙ: 2-3 варианта одного рисунка
                        подменяются по кругу (substitution_set).
                        Классика: boil на двойках, не на единицах.

  jitter_curve()      — дребезг кривой: микрошум на ключи. НЕ белый
                        шум по кадрам (это тряска паркинсона), а
                        низкочастотный дрейф с сохранением ключевых поз.

  wobble_thickness()  — план колебания толщины линии для pencil-модулей
                        (значения для атрибута толщины по кадрам).

Всё детерминировано сидом — тот же принцип, что моргания: ретейк
соседнего слоя не должен перетрясти грязь этого. И у всей грязи есть
паспорт: apply-функции возвращают что и насколько испорчено, потому
что антисовершенство без учёта — это просто брак.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from typing import Sequence

from columns import Key
from drawings import Assignment


# ---------------------------------------------------------------------------
# Line boil: цикл дублей рисунка
# ---------------------------------------------------------------------------

def line_boil_cycle(drawing_variants: Sequence[str],
                    start_frame: int, end_frame: int,
                    hold: int = 2, seed: int = 0,
                    avoid_repeat: bool = True) -> list[Assignment]:
    """
    Раскладывает варианты рисунка (a, a2, a3 — один рисунок, перерисованный
    2-3 раза) по кадрам с шагом hold.

    hold=2 — стандарт: boil на единицах слишком нервный («шершавый экран»),
    на тройках слишком ленивый. Порядок вариантов — псевдослучайный без
    двух одинаковых подряд (иначе получается внезапный холд посреди кипения).

    Требует >= 2 вариантов: кипятить один рисунок нечем, и это ошибка
    вызова, а не тихая деградация — иначе шот молча выйдет стерильным.
    """
    variants = list(drawing_variants)
    if len(variants) < 2:
        raise ValueError(
            f"line boil needs >=2 drawing variants, got {len(variants)}; "
            f"draw the extra passes first")
    if hold < 1:
        raise ValueError("hold must be >= 1")
    if end_frame < start_frame:
        return []

    rng = random.Random(seed)
    out: list[Assignment] = []
    prev = None
    f = start_frame
    while f <= end_frame:
        pool = [v for v in variants if v != prev] if (avoid_repeat and prev) else variants
        d = rng.choice(pool)
        dur = min(hold, end_frame - f + 1)
        out.append(Assignment(frame=f, drawing=d, duration=dur))
        prev = d
        f += hold
    return out


# ---------------------------------------------------------------------------
# Дребезг кривой
# ---------------------------------------------------------------------------

def jitter_curve(keys: Sequence[Key], amplitude: float,
                 seed: int = 0, protect_extremes: bool = True,
                 wavelength_frames: float = 5.0) -> list[Key]:
    """
    Микрошум на значения ключей.

    Два правила, отличающие дребезг от порчи:

    - НЕ белый шум: соседние ключи получают КОРРЕЛИРОВАННОЕ смещение
      (сглаженный value-noise с длиной волны wavelength_frames).
      Белый шум по кадрам — это тряска, глаз читает её как болезнь
      персонажа, а не как живость линии.

    - protect_extremes: ключевые позы (локальные экстремумы кривой) не
      трогаются. Аниматор ставил их сознательно: смазать крайнюю точку
      замаха — значит смазать сам замах. Дребезжит путь МЕЖДУ позами.
    """
    ks = sorted(keys, key=lambda k: k.frame)
    if not ks or amplitude <= 0:
        return list(ks)

    rng = random.Random(seed)
    # опорные точки шума раз в wavelength_frames, между ними — косинус-лерп
    f0, f1 = ks[0].frame, ks[-1].frame
    n_anchor = max(2, int((f1 - f0) / wavelength_frames) + 2)
    anchors = [rng.uniform(-1, 1) for _ in range(n_anchor)]

    def noise_at(frame: float) -> float:
        t = (frame - f0) / wavelength_frames
        i = int(math.floor(t))
        i = max(0, min(i, n_anchor - 2))
        frac = t - i
        s = (1 - math.cos(math.pi * min(1.0, max(0.0, frac)))) / 2
        return anchors[i] * (1 - s) + anchors[i + 1] * s

    # экстремумы: знак приращения меняется
    extreme_idx: set[int] = set()
    if protect_extremes:
        extreme_idx.update((0, len(ks) - 1))     # края — тоже позы
        for i in range(1, len(ks) - 1):
            d1 = ks[i].value - ks[i - 1].value
            d2 = ks[i + 1].value - ks[i].value
            if d1 * d2 < 0:
                extreme_idx.add(i)

    out: list[Key] = []
    for i, k in enumerate(ks):
        if i in extreme_idx:
            out.append(k)
        else:
            out.append(Key(frame=k.frame,
                           value=k.value + amplitude * noise_at(k.frame),
                           handles=k.handles,
                           const_segment=k.const_segment,
                           continuity=k.continuity))
    return out


# ---------------------------------------------------------------------------
# Плавающая толщина линии
# ---------------------------------------------------------------------------

def wobble_thickness(base: float, start_frame: int, end_frame: int,
                     depth_pct: float = 8.0, period_frames: float = 20.0,
                     seed: int = 0, step: int = 2) -> list[Key]:
    """
    Толщина карандашной линии медленно гуляет вокруг базовой.

    depth_pct=8 — потолок приличия: до ~10% толщина читается как живая
    рука, дальше — как мигающий инструмент. Две несоизмеримые частоты
    (тот же приём, что в breathe_hold) — период не повторяется.

    Значения зажаты снизу: толщина не бывает <= 0 ни при каком сиде.
    """
    if depth_pct < 0 or depth_pct > 50:
        raise ValueError("depth_pct out of sane range (0..50)")
    if end_frame < start_frame:
        return []
    amp = base * depth_pct / 100.0
    phase = (seed % 89) * 0.17
    w1 = 2 * math.pi / period_frames
    w2 = 2 * math.pi / (period_frames * math.sqrt(3))

    out: list[Key] = []
    f = start_frame
    while f <= end_frame:
        v = base + amp * (0.7 * math.sin(w1 * (f - start_frame) + phase)
                          + 0.3 * math.sin(w2 * (f - start_frame) + phase * 2.3))
        out.append(Key(frame=f, value=max(base * 0.1, v)))
        f += step
    if out[-1].frame != end_frame:
        out.append(Key(frame=end_frame, value=base))
    return out


# ---------------------------------------------------------------------------
# Паспорт грязи
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class ImperfectionRecord:
    """Запись в реестр происхождения (стыкуется с provenance, идея №60):
    какая грязь, где, каким сидом. Антисовершенство без учёта — брак."""
    kind: str                # "line_boil" | "jitter" | "thickness_wobble"
    target: str              # нода/колонка
    frames: tuple[int, int]
    seed: int
    params: dict

    def as_dict(self) -> dict:
        return {"kind": self.kind, "target": self.target,
                "frames": list(self.frames), "seed": self.seed,
                "params": self.params}


class Imperfection:
    """Фасад: применяет грязь через мост и ведёт паспорт применённого."""

    def __init__(self, bridge):
        from columns import Columns
        from drawings import Drawings
        self.columns = Columns(bridge)
        self.drawings = Drawings(bridge)
        self.applied: list[ImperfectionRecord] = []

    def boil(self, node: str, variants: Sequence[str],
             start: int, end: int, hold: int = 2, seed: int = 0) -> dict:
        plan = line_boil_cycle(variants, start, end, hold, seed)
        res = self.drawings.set(node, plan)
        rec = ImperfectionRecord("line_boil", node, (start, end), seed,
                                 {"variants": list(variants), "hold": hold})
        self.applied.append(rec)
        res["imperfection"] = rec.as_dict()
        return res

    def jitter(self, column: str, amplitude: float, seed: int = 0) -> dict:
        keys = self.columns.get_curve(column)
        if not keys:
            return {"column": column, "keys_written": 0,
                    "note": "empty curve; nothing to jitter"}
        noisy = jitter_curve(keys, amplitude, seed)
        res = self.columns.set_curve(column, noisy, replace=True)
        rec = ImperfectionRecord("jitter", column,
                                 (int(keys[0].frame), int(keys[-1].frame)),
                                 seed, {"amplitude": amplitude})
        self.applied.append(rec)
        res["imperfection"] = rec.as_dict()
        return res
