"""
character_morty.py — Ворти: подросток-компаньон в стилистике R&M.

Отличия от Дрика, читаемые силуэтом в один взгляд (главный тест
дизайна пары: узнаваемость по контуру без цвета):
  - НИЖЕ на четверть, голова относительно тела БОЛЬШЕ (детская пропорция);
  - лицо круглое, а не вытянутое;
  - волосы — гладкий каштановый шлем без шипов;
  - жёлтая футболка, синие джинсы;
  - брови высоко и врозь (вечная тревога), а не монобровь;
  - рот маленький, дрожащий.

Иерархия совпадает с Дриком и Гошей: master -> hips -> torso ->
{head, arm_near, arm_far}; hips -> legs. Один и тот же аниматор-код
двигает всех трёх.
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

INK = (26, 22, 24)
SKIN = (238, 206, 172)          # тёплая кожа (не серая, как у Дрика)
SHIRT = (238, 212, 92)          # жёлтая футболка
JEANS = (74, 104, 152)
SHOE = (232, 232, 228)
HAIR = (122, 84, 52)            # каштановый шлем
WHITE = (252, 252, 250)

HEAD_H = 0.40                   # круглая голова: почти равна ширине
HEAD_W = 0.36
BODY_H = 0.62                   # короткий торс
LEG_L = 0.44
ARM_L = 0.40


def _eyes(state: str) -> list[Shape]:
    y = HEAD_H * 0.58
    out: list[Shape] = []
    for cx in (-0.075, 0.175):
        if state == "closed":
            out.append(Shape(ellipse_points(0.10, 0.016, cx, y - 0.02),
                             fill=INK, outline=None))
            continue
        ry = {"open": 0.125, "half": 0.070, "wide": 0.165}[state]
        out.append(Shape(ellipse_points(0.105, ry, cx, y), fill=WHITE,
                         outline=INK, outline_units=0.028))
        pr = 0.048 if state == "wide" else 0.026
        out.append(Shape(ellipse_points(pr, pr, cx + 0.035, y - 0.01),
                         fill=INK, outline=None))
        if state == "half":
            out.append(Shape(rect_points(0.22, 0.08, cx, y + 0.085),
                             fill=SKIN, outline=None))
            out.append(Shape(ellipse_points(0.105, 0.011, cx, y + 0.048),
                             fill=INK, outline=None))
    # брови ВРОЗЬ и высоко — тревога (у Дрика монобровь-дуга)
    for cx, tilt in ((-0.075, 0.030), (0.175, -0.030)):
        out.append(Shape([(cx - 0.10, y + 0.175 - tilt),
                          (cx + 0.10, y + 0.175 + tilt),
                          (cx + 0.10, y + 0.150 + tilt),
                          (cx - 0.10, y + 0.150 - tilt)],
                         fill=INK, outline=None))
    return out


def _mouth(kind: str) -> list[Shape]:
    y = HEAD_H * 0.13
    if kind == "flat":
        return [Shape(ellipse_points(0.075, 0.012, 0.05, y), fill=INK,
                      outline=None)]
    if kind == "open":
        return [Shape(ellipse_points(0.070, 0.060, 0.05, y - 0.02),
                      fill=(110, 52, 56), outline=INK, outline_units=0.026)]
    if kind == "yell":
        return [Shape(ellipse_points(0.095, 0.105, 0.05, y - 0.04),
                      fill=(110, 52, 56), outline=INK, outline_units=0.026)]
    if kind == "worry":     # дрожащая волна — визитная карточка
        pts = [(-0.035, y), (0.015, y - 0.028), (0.065, y + 0.010),
               (0.115, y - 0.022)]
        return [Shape(pts + pts[::-1], fill=None, outline=INK,
                      outline_units=0.026)]
    if kind == "smile":
        return [Shape([(-0.045, y + 0.025), (0.05, y - 0.045),
                       (0.145, y + 0.025), (0.05, y - 0.012)],
                      fill=INK, outline=None)]
    raise ValueError(f"unknown mouth {kind!r}")


def _hair() -> list[Shape]:
    """Гладкий шлем: полуовал поверх макушки + короткая чёлка справа."""
    cy = HEAD_H * 0.92
    return [
        Shape(ellipse_points(HEAD_W * 1.03, HEAD_H * 0.62, 0.02, cy + 0.10),
              fill=HAIR, outline=INK, outline_units=0.030),
        Shape([(HEAD_W * 0.20, cy + 0.24), (HEAD_W * 1.00, cy + 0.10),
               (HEAD_W * 0.96, cy - 0.06), (HEAD_W * 0.34, cy + 0.10)],
              fill=HAIR, outline=INK, outline_units=0.028),
    ]


def build_vorty(eyes: str = "open", mouth: str = "worry") -> Puppet:
    parts: dict[str, RPart] = {}
    dim = lambda c, k=0.84: tuple(int(x * k) for x in c)   # noqa: E731

    parts["master"] = RPart("master", None, (0.0, 0.0), [])
    parts["hips"] = RPart("hips", "master", (0.0, LEG_L + 0.04), [])

    parts["leg_far"] = RPart("leg_far", "hips", (-0.075, 0.0), [
        Shape(capsule_points(LEG_L - 0.04, 0.062), fill=dim(JEANS),
              outline=INK)])
    parts["shoe_far"] = RPart("shoe_far", "leg_far", (0.0, -(LEG_L - 0.04)), [
        Shape(ellipse_points(0.125, 0.068, 0.04, -0.012), fill=dim(SHOE),
              outline=INK)])
    parts["leg_near"] = RPart("leg_near", "hips", (0.075, 0.0), [
        Shape(capsule_points(LEG_L - 0.04, 0.062), fill=JEANS, outline=INK)])
    parts["shoe_near"] = RPart("shoe_near", "leg_near", (0.0, -(LEG_L - 0.04)), [
        Shape(ellipse_points(0.125, 0.068, 0.04, -0.012), fill=SHOE,
              outline=INK)])

    parts["torso"] = RPart("torso", "hips", (0.0, 0.0), [
        Shape(ellipse_points(0.205, BODY_H / 2, 0.0, BODY_H / 2), fill=SHIRT,
              outline=INK)])

    parts["arm_far"] = RPart("arm_far", "torso", (-0.165, BODY_H - 0.08), [
        Shape(capsule_points(ARM_L, 0.050), fill=dim(SHIRT), outline=INK)])
    parts["hand_far"] = RPart("hand_far", "arm_far", (0.0, -ARM_L), [
        Shape(ellipse_points(0.068, 0.068, 0.0, -0.022), fill=dim(SKIN),
              outline=INK)])
    parts["arm_near"] = RPart("arm_near", "torso", (0.165, BODY_H - 0.08), [
        Shape(capsule_points(ARM_L, 0.050), fill=SHIRT, outline=INK)])
    parts["hand_near"] = RPart("hand_near", "arm_near", (0.0, -ARM_L), [
        Shape(ellipse_points(0.068, 0.068, 0.0, -0.022), fill=SKIN,
              outline=INK)])

    head_shapes = [Shape(ellipse_points(HEAD_W, HEAD_H, 0.02, HEAD_H * 0.90),
                         fill=SKIN, outline=INK)]
    head_shapes += _hair()
    head_shapes += _eyes(eyes)
    head_shapes.append(Shape(
        ellipse_points(0.040, 0.028, HEAD_W * 0.78, HEAD_H * 0.36),
        fill=dim(SKIN, 0.94), outline=INK, outline_units=0.024))
    head_shapes += _mouth(mouth)
    parts["head"] = RPart("head", "torso", (0.02, BODY_H - 0.02), head_shapes)

    draw_order = [
        "arm_far", "hand_far", "leg_far", "shoe_far",
        "torso", "leg_near", "shoe_near", "hips", "master",
        "head", "arm_near", "hand_near",
    ]
    return Puppet(parts, draw_order)


VORTY_REST = {
    "arm_far": {"rot": 14.0},
    "arm_near": {"rot": -12.0},
    "leg_far": {"rot": 2.0},
    "leg_near": {"rot": -2.0},
    "head": {"rot": 3.0},
}
