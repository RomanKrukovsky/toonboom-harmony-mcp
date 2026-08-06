"""
character.py — Гоша: нелепый человечек в стиле «толстый контур,
большие глаза, плоские цвета».

Дизайн-решения (стиль GF/R&M, переведённый в геометрию):
  - голова крупнее приличного: ~40% роста;
  - глаза — белые эллипсы в пол-лица, зрачки-точки;
  - нос — большой овал телесно-розового, торчит вбок (профильная черта);
  - тонкие руки-ноги (капсулы), ботинки-овалы;
  - туловище — груша.

Смотрит ВПРАВО (положительный X) — туда, где полка с печеньем.

Иерархия повторяет humanoid_spec из rigging.py: та же логика пивотов
(рука вращается в плече, голова в шее), тот же порядок отрисовки от
дальнего к ближнему. Это сознательно: перенос в Harmony — замена
рисовалки, не переделка персонажа.

Части с вариантами рисунка (substitution, идея №24):
  eyes:  open / half / closed  — для морганий (blink_assignments)
  mouth: smile / open / oh / grit — для актёрки
"""

from __future__ import annotations

from renderer import (
    Puppet,
    RPart,
    Shape,
    capsule_points,
    ellipse_points,
    rect_points,
)

# Палитра (плоские цвета, без градиентов — стиль)
INK = (26, 22, 24)
SKIN = (247, 205, 160)
NOSE = (238, 160, 130)
SHIRT = (98, 160, 108)      # зелёная футболка
PANTS = (84, 96, 140)       # синие штаны
SHOE = (120, 82, 60)
WHITE = (252, 252, 250)
HAIR = (92, 62, 40)

# Размеры (мировые единицы; персонаж ~2.0 ростом)
HEAD_R = 0.42
BODY_H = 0.72
LEG_L = 0.52
ARM_L = 0.48


def _eye(cx: float, state: str) -> list[Shape]:
    """Глаз в координатах головы. Гигантский белок + зрачок."""
    rx, ry = 0.155, 0.19
    if state == "closed":
        # закрытый глаз — дуга-веко, рисуем сплюснутый эллипс без белка
        return [Shape(ellipse_points(rx, 0.022, cx, 0.05), fill=INK,
                      outline=None)]
    squeeze = 0.5 if state == "half" else 1.0
    shapes = [Shape(ellipse_points(rx, ry * squeeze, cx, 0.05), fill=WHITE,
                    outline=INK, outline_units=0.032)]
    pupil_dy = 0.0 if state == "open" else -0.04
    shapes.append(Shape(ellipse_points(0.045, 0.055 * squeeze,
                                       cx + 0.055, 0.03 + pupil_dy),
                        fill=INK, outline=None))
    return shapes


def _mouth(kind: str) -> list[Shape]:
    """Рот в координатах головы, ниже носа."""
    y = -0.21
    if kind == "smile":
        pts = [(-0.10, y + 0.03), (0.0, y - 0.02), (0.12, y + 0.04)]
        return [Shape(pts + pts[::-1], fill=None, outline=INK,
                      outline_units=0.035)]
    if kind == "open":
        return [Shape(ellipse_points(0.09, 0.07, 0.02, y), fill=(120, 40, 45),
                      outline=INK, outline_units=0.032)]
    if kind == "oh":
        return [Shape(ellipse_points(0.055, 0.075, 0.02, y), fill=(120, 40, 45),
                      outline=INK, outline_units=0.032)]
    if kind == "grit":   # стиснутые зубы — усилие
        return [
            Shape(rect_points(0.24, 0.075, 0.02, y), fill=WHITE,
                  outline=INK, outline_units=0.032),
            Shape(rect_points(0.005, 0.075, 0.02, y), fill=INK, outline=None),
        ]
    raise ValueError(f"unknown mouth {kind!r}")


def build_gosha(eyes: str = "open", mouth: str = "smile") -> Puppet:
    """
    Собирает Гошу в позе покоя. eyes/mouth — активные варианты рисунка
    (substitution): сцена пересобирает марионетку на кадр из назначений.
    Дешёво: сборка — это списки точек, а не растр.
    """
    parts: dict[str, RPart] = {}

    # Мастер-пег: пивот в точке опоры (между ступней), y=0 — пол
    parts["master"] = RPart("master", None, (0.0, 0.0), [])

    # Бёдра — узел для ног и туловища
    parts["hips"] = RPart("hips", "master", (0.0, LEG_L + 0.06), [])

    # Ноги (капсулы вниз от бедра). Дальняя чуть темнее — глубина без градиентов
    far_pants = tuple(int(c * 0.82) for c in PANTS)
    parts["leg_far"] = RPart("leg_far", "hips", (-0.10, 0.0), [
        Shape(capsule_points(LEG_L - 0.06, 0.085), fill=far_pants,
              outline=INK),
    ])
    parts["shoe_far"] = RPart("shoe_far", "leg_far", (0.0, -(LEG_L - 0.06)), [
        Shape(ellipse_points(0.16, 0.085, 0.05, -0.02),
              fill=tuple(int(c * 0.82) for c in SHOE), outline=INK),
    ])
    parts["leg_near"] = RPart("leg_near", "hips", (0.10, 0.0), [
        Shape(capsule_points(LEG_L - 0.06, 0.085), fill=PANTS, outline=INK),
    ])
    parts["shoe_near"] = RPart("shoe_near", "leg_near", (0.0, -(LEG_L - 0.06)), [
        Shape(ellipse_points(0.16, 0.085, 0.05, -0.02), fill=SHOE,
              outline=INK),
    ])

    # Туловище-груша: пивот в бёдрах, растёт вверх
    torso_pts = (ellipse_points(0.26, BODY_H / 2, 0.0, BODY_H / 2))
    torso_pts = [(x * (1.0 + 0.35 * max(0.0, -(y - BODY_H / 2)) / BODY_H), y)
                 for x, y in torso_pts]      # низ шире верха
    parts["torso"] = RPart("torso", "hips", (0.0, 0.0), [
        Shape(torso_pts, fill=SHIRT, outline=INK),
    ])

    # Руки: пивоты в плечах (верх туловища)
    far_skin = tuple(int(c * 0.85) for c in SKIN)
    parts["arm_far"] = RPart("arm_far", "torso", (-0.20, BODY_H - 0.12), [
        Shape(capsule_points(ARM_L, 0.062), fill=far_skin, outline=INK),
    ])
    parts["hand_far"] = RPart("hand_far", "arm_far", (0.0, -ARM_L), [
        Shape(ellipse_points(0.085, 0.085, 0.0, -0.03), fill=far_skin,
              outline=INK),
    ])
    parts["arm_near"] = RPart("arm_near", "torso", (0.20, BODY_H - 0.12), [
        Shape(capsule_points(ARM_L, 0.062), fill=SKIN, outline=INK),
    ])
    parts["hand_near"] = RPart("hand_near", "arm_near", (0.0, -ARM_L), [
        Shape(ellipse_points(0.085, 0.085, 0.0, -0.03), fill=SKIN,
              outline=INK),
    ])

    # Голова: пивот в шее. Смотрит вправо
    head_shapes = [
        Shape(ellipse_points(HEAD_R, HEAD_R * 1.05, 0.0, HEAD_R * 0.95),
              fill=SKIN, outline=INK),
        # волосы — три пряди-полукруга сверху
        Shape(ellipse_points(0.30, 0.16, -0.08, HEAD_R * 1.75), fill=HAIR,
              outline=INK, outline_units=0.03),
    ]
    # глаза и рот в локальных координатах головы, центр лица ~ (0.1, 0.45)
    for sh in _eye(0.02, eyes):
        sh.points = [(x, y + HEAD_R * 0.95 + 0.12) for x, y in sh.points]
        head_shapes.append(sh)
    for sh in _eye(0.30, eyes):
        sh.points = [(x, y + HEAD_R * 0.95 + 0.12) for x, y in sh.points]
        head_shapes.append(sh)
    # нос — крупный овал, торчит вправо (профильная черта стиля)
    head_shapes.append(Shape(
        ellipse_points(0.115, 0.085, HEAD_R * 0.78, HEAD_R * 0.82),
        fill=NOSE, outline=INK, outline_units=0.035))
    for sh in _mouth(mouth):
        sh.points = [(x + 0.14, y + HEAD_R * 0.95) for x, y in sh.points]
        head_shapes.append(sh)

    parts["head"] = RPart("head", "torso", (0.02, BODY_H - 0.02), head_shapes)

    draw_order = [
        "arm_far", "hand_far", "leg_far", "shoe_far",       # дальний слой
        "torso", "leg_near", "shoe_near", "hips", "master",  # середина
        "head", "arm_near", "hand_near",                     # ближний слой
    ]
    return Puppet(parts, draw_order)


# Поза покоя: лёгкая асимметрия, чтобы не стоял по стойке смирно
REST_POSE = {
    "arm_far": {"rot": 12.0},
    "arm_near": {"rot": -10.0},
    "leg_far": {"rot": 3.0},
    "leg_near": {"rot": -2.0},
    "head": {"rot": 0.0},
}
