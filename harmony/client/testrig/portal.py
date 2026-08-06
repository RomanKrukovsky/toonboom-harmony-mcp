"""
portal.py — зелёный портал: главный визуальный аттракцион R&M-стиля.

Строится как марионетка из концентрических колец. Ключ к тому, чтобы
это читалось воронкой, а не мишенью: кольца ВРАЩАЮТСЯ С РАЗНОЙ
СКОРОСТЬЮ и слегка эллиптичны. Внешнее медленно, внутреннее быстро —
глаз собирает это в закручивание. Одна скорость на все кольца даёт
мёртвый значок.

Кольца — не круги, а «рваные» многоугольники со случайным, но
ДЕТЕРМИНИРОВАННЫМ по сиду дребезгом радиуса: у портала неровный
плазменный край. Тот же принцип, что line boil, но в геометрии, а не
в контуре.

Открытие/закрытие: канал portal.s (масштаб) от 0 до 1. Профиль
открытия — ease_out со лёгким перелётом (портал «хлопает» в
существование), закрытие — ease_in, схлопывается в точку.
"""

from __future__ import annotations

import math
import random

from renderer import Puppet, RPart, Shape

# Палитра портала: от тёмного ореола к яркому кислотному ядру.
#
# Регрессия, пойманная ASCII-просмотром: ядро было почти белым
# (244,255,230) и совпадало с кремовым фоном (245,240,230) — самая
# яркая часть портала оказалась НЕВИДИМОЙ. Ловушка коварна тем, что
# в коде всё правильно, полигон рисуется, тест на геометрию проходит;
# ошибка чисто визуальная и находится только глазом. Теперь ядро
# насыщенно-зелёное, а сцена играется на тёмном фоне гаража.
RING_COLORS = [
    (28, 92, 36),       # тёмный внешний ореол
    (58, 158, 56),
    (106, 214, 84),
    (162, 244, 106),
    (214, 255, 128),    # яркое кислотное ядро (НЕ белое)
]
SPLAT = (44, 130, 46)   # брызги-капли вокруг


def _ragged_ring(radius: float, seed: int, segments: int = 34,
                 raggedness: float = 0.055,
                 squash: float = 0.92) -> list[tuple[float, float]]:
    """Кольцо с неровным плазменным краем. Замкнутый многоугольник."""
    rng = random.Random(seed)
    pts = []
    for i in range(segments):
        a = 2 * math.pi * i / segments
        r = radius * (1.0 + rng.uniform(-raggedness, raggedness))
        pts.append((r * math.cos(a), r * math.sin(a) * squash))
    return pts


def build_portal(seed: int = 0, radius: float = 1.0) -> Puppet:
    """
    Марионетка портала. Части: ring0 (внешнее) .. ring4 (ядро) + splats.
    Все кольца — дети "core", так что канал core.sx/sy открывает портал
    целиком, а ringN.rot крутит слои по отдельности.
    """
    parts: dict[str, RPart] = {"core": RPart("core", None, (0.0, 0.0), [])}
    order = ["core"]

    n = len(RING_COLORS)
    for i, col in enumerate(RING_COLORS):
        r = radius * (1.0 - i / n * 0.82)
        # Внешние кольца рванее внутренних: плазма к центру «успокаивается»
        rag = 0.075 * (1.0 - i / n) + 0.012
        shape = Shape(_ragged_ring(r, seed * 131 + i * 17, raggedness=rag),
                      fill=col,
                      outline=None,      # у портала нет чернильного контура:
                      boil=False)        # он светится, а не нарисован тушью
        name = f"ring{i}"
        parts[name] = RPart(name, "core", (0.0, 0.0), [shape])
        order.append(name)

    # Брызги: капли, разлетающиеся от края (статичная геометрия,
    # анимируются масштабом вместе с core)
    rng = random.Random(seed * 7919)
    splats = []
    for _ in range(11):
        a = rng.uniform(0, 2 * math.pi)
        d = radius * rng.uniform(1.02, 1.30)
        sr = radius * rng.uniform(0.035, 0.095)
        cx, cy = d * math.cos(a), d * math.sin(a) * 0.92
        splats.append(Shape(
            [(cx + sr * math.cos(t), cy + sr * math.sin(t))
             for t in [2 * math.pi * k / 9 for k in range(9)]],
            fill=SPLAT, outline=None, boil=False))
    parts["splats"] = RPart("splats", "core", (0.0, 0.0), splats)
    order.insert(1, "splats")      # брызги ПОД кольцами

    return Puppet(parts, order)


def portal_spin_pose(frame: int, open_scale: float,
                     base_speed: float = 5.0) -> dict[str, dict[str, float]]:
    """
    Поза портала на кадре: открытость + разноскоростное вращение колец.

    Внутренние кольца крутятся быстрее и в ту же сторону — это то, что
    делает воронку. Проверено ASCII-просмотром: при равных скоростях
    портал выглядит как плоская мишень.
    """
    pose: dict[str, dict[str, float]] = {
        "core": {"sx": open_scale, "sy": open_scale},
    }
    for i in range(len(RING_COLORS)):
        speed = base_speed * (1.0 + i * 0.85)
        pose[f"ring{i}"] = {"rot": frame * speed}
    pose["splats"] = {"rot": -frame * base_speed * 0.45}   # брызги против
    return pose
