"""
reference.py — обратная разработка референса (идея №59).

Показываешь секунду чужой анимации — получаешь разбор ПРИНЦИПОВ:
где ключевые позы, какие изинги между ними, где холды, на каких
частотах экспозиция. Без копирования рисунка: вход — только траектория
(позиция чего-то отслеживаемого по кадрам), выход — та же структура,
которой оперирует весь остальной пайплайн (Key, профили, ExposurePlan).

Откуда берётся траектория — не забота модуля: трекер в видеоредакторе,
ротоскоп-клики человека, CV-модель. Вход — list[float | None]
(None = кадр, где точку не удалось отследить).

Цепочка использования:
    track = [...]                        # позиции по кадрам
    analysis = analyze_track(track)
    analysis.keys                        # готово для curve_set
    analysis.segments[i].profile         # 'ease_in' / 'heavy_impact' / ...
    apply_timing_to(analysis, my_keys)   # перенос ТАЙМИНГА на свою амплитуду
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Sequence

from columns import Key, sample_profile


# ---------------------------------------------------------------------------
# Разбор траектории
# ---------------------------------------------------------------------------

@dataclass
class Segment:
    """Кусок движения между двумя ключевыми позами."""
    from_frame: int
    to_frame: int
    from_value: float
    to_value: float
    profile: str          # ближайший профиль из библиотеки
    fit_error: float      # насколько профиль похож (0 = точь-в-точь)
    kind: str             # "move" | "hold"

    @property
    def frames(self) -> int:
        return self.to_frame - self.from_frame


@dataclass
class TrackAnalysis:
    keys: list[Key]                 # ключевые позы (экстремумы + края)
    segments: list[Segment]
    exposure_hint: int              # 1/2/3: на чём снят референс
    notes: list[str] = field(default_factory=list)


def _fill_gaps(track: Sequence[float | None]) -> list[float]:
    """Линейная интерполяция пропусков трекера. Пропуски по краям
    заполняются ближайшим известным значением."""
    vals = list(track)
    known = [i for i, v in enumerate(vals) if v is not None]
    if not known:
        raise ValueError("track has no valid samples at all")
    for i in range(len(vals)):
        if vals[i] is not None:
            continue
        prev = max((k for k in known if k < i), default=None)
        nxt = min((k for k in known if k > i), default=None)
        if prev is None:
            vals[i] = vals[nxt]
        elif nxt is None:
            vals[i] = vals[prev]
        else:
            t = (i - prev) / (nxt - prev)
            vals[i] = vals[prev] * (1 - t) + vals[nxt] * t
    return vals  # type: ignore[return-value]


def detect_exposure(track: Sequence[float]) -> int:
    """
    На чём снят референс: по единицам, двойкам или тройкам.

    Признак: доля кадров, где значение НЕ изменилось против предыдущего.
    На двойках каждый второй кадр повторяет предыдущий (~50% повторов),
    на тройках ~66%. Порог с зазором: >55% -> 3, >30% -> 2, иначе 1.
    """
    if len(track) < 4:
        return 1
    repeats = sum(1 for a, b in zip(track, track[1:]) if abs(b - a) < 1e-9)
    ratio = repeats / (len(track) - 1)
    if ratio > 0.55:
        return 3
    if ratio > 0.30:
        return 2
    return 1


def find_key_poses(track: Sequence[float], min_hold_frames: int = 4,
                   noise: float = 1e-6) -> list[int]:
    """
    Индексы ключевых поз: края + экстремумы + границы холдов.
    Экстремум — смена знака скорости; холд — подряд >= min_hold_frames
    кадров без движения (его начало и конец — обе позы).
    """
    n = len(track)
    if n < 2:
        return list(range(n))
    poses = {0, n - 1}

    # экстремумы
    prev_sign = 0
    for i in range(1, n):
        d = track[i] - track[i - 1]
        if abs(d) <= noise:
            continue
        sign = 1 if d > 0 else -1
        if prev_sign and sign != prev_sign:
            poses.add(i - 1)
        prev_sign = sign

    # холды
    run = 0
    for i in range(1, n):
        if abs(track[i] - track[i - 1]) <= noise:
            run += 1
        else:
            if run >= min_hold_frames:
                poses.add(i - 1 - run)
                poses.add(i - 1)
            run = 0
    if run >= min_hold_frames:
        poses.add(n - 1 - run)
    return sorted(poses)


_PROFILES = ["linear", "ease_in", "ease_out", "ease_in_out", "heavy_impact"]


def classify_segment(track: Sequence[float], a: int, b: int) -> tuple[str, float]:
    """
    Кусок траектории -> ближайший профиль из библиотеки.
    Нормализуем кусок в [0,1]x[0,1] и меряем среднеквадратичное расхождение
    с каждым профилем. Возвращаем лучший + ошибку подгонки.

    fit_error честно отдаётся наружу: если 0.15+ — референс делает что-то,
    чего в библиотеке нет (например, двойной удар), и полагаться на ярлык
    нельзя. Ярлык без меры доверия — это враньё с уверенным лицом.
    """
    n = b - a + 1
    if n < 3:
        return "linear", 0.0
    v0, v1 = track[a], track[b]
    span = v1 - v0

    # Холд — это когда неподвижен ВЕСЬ путь, а не когда совпали концы.
    # Регрессия, пойманная тестом: прыжок «вверх на 100 и обратно» имеет
    # начало == конец и классифицировался как hold с ошибкой 0.0 —
    # разбор говорил «стоял на месте» про сальто. Теперь мерим размах
    # всего куска.
    seg = [track[a + i] for i in range(n)]
    travel = max(seg) - min(seg)
    if travel < 1e-9:
        return "hold", 0.0
    if abs(span) < 1e-9:
        # вернулся в исходную точку, но двигался: ни один монотонный
        # профиль это не опишет. Честный ярлык + максимальная ошибка.
        return "round-trip", 1.0

    norm = [(track[a + i] - v0) / span for i in range(n)]

    best, best_err = "linear", math.inf
    for p in _PROFILES:
        ref = sample_profile(p, n)  # type: ignore[arg-type]
        err = math.sqrt(sum((x - y) ** 2 for x, y in zip(norm, ref)) / n)
        if err < best_err:
            best, best_err = p, err
    return best, best_err


def analyze_track(track: Sequence[float | None], start_frame: int = 1,
                  min_hold_frames: int = 4) -> TrackAnalysis:
    filled = _fill_gaps(track)
    exposure = detect_exposure(filled)

    # на двойках/тройках анализируем по «настоящим» кадрам, иначе холды
    # экспозиции притворяются ключевыми позами
    step = exposure
    thinned = filled[::step]
    poses = find_key_poses(thinned, max(2, min_hold_frames // step))

    keys = [Key(frame=start_frame + i * step, value=thinned[i]) for i in poses]

    segments: list[Segment] = []
    notes: list[str] = [f"reference shot on {exposure}s"]
    for i in range(len(poses) - 1):
        a, b = poses[i], poses[i + 1]
        profile, err = classify_segment(thinned, a, b)
        kind = "hold" if profile == "hold" else "move"
        segments.append(Segment(
            from_frame=start_frame + a * step,
            to_frame=start_frame + b * step,
            from_value=thinned[a], to_value=thinned[b],
            profile=profile, fit_error=round(err, 4), kind=kind,
        ))
        if err > 0.15 and kind == "move":
            notes.append(
                f"segment f{start_frame + a * step}-f{start_frame + b * step}: "
                f"poor fit ({err:.2f}) — reference does something outside "
                f"the profile library; label {profile!r} is approximate")
    return TrackAnalysis(keys, segments, exposure, notes)


# ---------------------------------------------------------------------------
# Перенос тайминга на свою амплитуду
# ---------------------------------------------------------------------------

def apply_timing_to(analysis: TrackAnalysis,
                    target_from: float, target_to: float,
                    start_frame: int = 1) -> list[Key]:
    """
    Суть «без копирования рисунка»: берём ИЗ референса только тайминг и
    изинги (когда и как), амплитуду и направление — свои. Пропорции длин
    сегментов сохраняются, значения растягиваются на target-диапазон.

    Холды остаются холдами (это тоже тайминг), значения — с нашей шкалы.
    """
    if not analysis.segments:
        return [Key(frame=start_frame, value=target_from)]

    ref_lo = min(min(s.from_value, s.to_value) for s in analysis.segments)
    ref_hi = max(max(s.from_value, s.to_value) for s in analysis.segments)
    ref_span = ref_hi - ref_lo

    def remap(v: float) -> float:
        if ref_span < 1e-9:
            return target_from
        t = (v - ref_lo) / ref_span
        return target_from + (target_to - target_from) * t

    keys: list[Key] = []
    f = start_frame
    first = analysis.segments[0]
    keys.append(Key(frame=f, value=remap(first.from_value)))
    for s in analysis.segments:
        f += s.frames
        keys.append(Key(frame=f, value=remap(s.to_value)))
    return keys
