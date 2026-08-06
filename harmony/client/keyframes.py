"""
keyframes.py — общие помощники для сборки плотных ключей в сценах.

Вынесено из scene_cookie.py: каждая сцена — самостоятельный файл шота
(как .xstage в Harmony), но эти две функции нужны всем.

Идея `dense`: вся семантика изинга живёт в ЗНАЧЕНИЯХ ключей, кадр за
кадром. Рендереру достаточно линейной интерполяции, и профиль нельзя
случайно потерять при round-trip через мост.
"""

from __future__ import annotations

from columns import Key, sample_profile


def dense(profile: str, f0: int, f1: int, v0: float, v1: float,
          params: dict | None = None) -> list[Key]:
    n = f1 - f0 + 1
    if n < 2:
        return [Key(frame=f0, value=v1)]
    s = sample_profile(profile, n, params)  # type: ignore[arg-type]
    return [Key(frame=f0 + i, value=v0 + (v1 - v0) * s[i]) for i in range(n)]


def hold(f0: int, f1: int, v: float) -> list[Key]:
    return [Key(frame=f0, value=v), Key(frame=f1, value=v)]


def follow(keys: list[Key], lag: int, amount: float, base: float,
           last_frame: int, first_frame: int = 1) -> list[Key]:
    """
    Overlap: канал повторяет ведущий с задержкой lag кадров и амплитудой
    amount от его отклонения относительно base.

    Это ручная версия craft.overlap_chain для случая, когда ведущий канал
    уже собран плотными ключами.

    Края достраиваются обязательно. Регрессия, пойманная тестом на
    покрытие сцены: сдвиг на lag оставлял канал без ключей на первых
    кадрах и обрывал его за lag до конца. Рендерер в таких случаях
    молча берёт крайний ключ — то есть дальняя рука ЗАМИРАЛА на
    последних кадрах, пока ближняя продолжала двигаться. Дефект тихий:
    выглядит как «немного деревянная анимация», а не как ошибка.
    """
    if not keys:
        return []
    out = []
    for k in keys:
        f = k.frame + lag
        if f > last_frame:
            break
        out.append(Key(frame=f, value=base + (k.value - base) * amount))
    if not out:
        return []
    if out[0].frame > first_frame:
        out.insert(0, Key(frame=first_frame, value=out[0].value))
    if out[-1].frame < last_frame:
        out.append(Key(frame=last_frame, value=out[-1].value))
    return out
