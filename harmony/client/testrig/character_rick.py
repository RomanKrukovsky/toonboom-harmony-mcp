"""
character_rick.py — Дрик: учёный в стилистике Rick and Morty.

Черты стиля, переведённые в геометрию:
  - бледно-серая кожа, вытянутое лицо;
  - БОЛЬШИЕ овальные глаза вплотную друг к другу, зрачки-точки,
    тяжёлые полуприкрытые веки (вечно уставший взгляд);
  - монобровь-дуга;
  - растрёпанные «шипы» волос (голубовато-седые);
  - белый лаб-халат поверх голубой рубашки, коричневые брюки;
  - худые длинные конечности;
  - рот — широкая резиновая линия, вытягивается на пол-лица.

Иерархия та же, что у Гоши (совместимость с rigging.humanoid_spec):
master -> hips -> torso -> {head, arm_near, arm_far}, hips -> legs.

Substitution-словари:
  eyes:  open / half / closed / wide  (wide — паника, зрачки-бусины)
  mouth: flat / open / grit / yell / smug
  prop_near: none / gun / thing      (что в ближней руке)
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
SKIN = (222, 224, 214)          # бледная серо-зелёная кожа
COAT = (244, 244, 246)          # халат
SHIRT = (120, 170, 205)         # голубая рубашка
PANTS = (110, 88, 62)           # коричневые брюки
SHOE = (52, 48, 46)
HAIR = (168, 196, 210)          # голубовато-седой
WHITE = (252, 252, 250)
DROOL = (140, 200, 190)

HEAD_H = 0.56                   # вытянутое лицо: выше, чем шире
HEAD_W = 0.34
BODY_H = 0.85
LEG_L = 0.62
ARM_L = 0.56

GUN_BODY = (180, 184, 190)
GUN_GLOW = (120, 240, 120)
THING = (250, 120, 170)         # «штука» — розовый кристалл


def _eyes(state: str) -> list[Shape]:
    """Пара овальных глаз вплотную, в координатах головы.
    Центр лица x=0.06 (смотрит вправо), глаза на y≈HEAD_H*0.62."""
    y = HEAD_H * 0.62
    out: list[Shape] = []
    for cx in (-0.065, 0.20):
        if state == "closed":
            out.append(Shape(ellipse_points(0.115, 0.018, cx, y - 0.02),
                             fill=INK, outline=None))
            continue
        ry = {"open": 0.155, "half": 0.085, "wide": 0.185}[state]
        out.append(Shape(ellipse_points(0.125, ry, cx, y), fill=WHITE,
                         outline=INK, outline_units=0.03))
        pr = 0.055 if state == "wide" else 0.028
        out.append(Shape(ellipse_points(pr, pr, cx + 0.05, y - 0.01),
                         fill=INK, outline=None))
        if state == "half":     # тяжёлое веко — плоская крышка поверх белка
            out.append(Shape(
                rect_points(0.26, 0.09, cx, y + 0.10), fill=SKIN,
                outline=None))
            out.append(Shape(ellipse_points(0.125, 0.012, cx, y + 0.055),
                             fill=INK, outline=None))
    # монобровь
    out.append(Shape(ellipse_points(0.30, 0.022, 0.07, y + 0.20), fill=INK,
                     outline=None))
    return out


def _mouth(kind: str) -> list[Shape]:
    """Широкий резиновый рот в координатах головы."""
    y = HEAD_H * 0.18
    if kind == "flat":
        return [Shape(ellipse_points(0.14, 0.014, 0.10, y), fill=INK,
                      outline=None)]
    if kind == "open":
        return [Shape(ellipse_points(0.115, 0.085, 0.10, y - 0.03),
                      fill=(96, 40, 45), outline=INK, outline_units=0.028)]
    if kind == "yell":      # орёт на пол-лица
        return [
            Shape(ellipse_points(0.16, 0.14, 0.10, y - 0.06),
                  fill=(96, 40, 45), outline=INK, outline_units=0.028),
            Shape(ellipse_points(0.13, 0.028, 0.10, y + 0.05), fill=WHITE,
                  outline=None),   # верхние зубы
        ]
    if kind == "grit":
        return [
            Shape(rect_points(0.30, 0.08, 0.10, y - 0.01), fill=WHITE,
                  outline=INK, outline_units=0.028),
            Shape(rect_points(0.30, 0.006, 0.10, y - 0.01), fill=INK,
                  outline=None),
        ]
    if kind == "smug":      # самодовольная кривая ухмылка
        pts = [(-0.06, y - 0.02), (0.06, y - 0.05), (0.20, y + 0.02)]
        return [Shape(pts + pts[::-1], fill=None, outline=INK,
                      outline_units=0.03),
                Shape(ellipse_points(0.02, 0.035, -0.10, y - 0.045),
                      fill=DROOL, outline=None)]   # капля слюны у угла рта
    raise ValueError(f"unknown mouth {kind!r}")


def _hair(state: str = "spiky") -> list[Shape]:
    """Растрёпанные шипы вокруг макушки — фирменная черта.

    state="flat" — шипы примяты и обвисли (после удара по голове).
    Это ровно тот словарь подмен, о котором идея №24: причёска — не
    параметр деформации, а набор нарисованных вариантов.

    Регрессия, пойманная ЧИСЛАМИ (describe): первая версия «примятых»
    стягивала все углы к горизонтали, десять шипов накладывались друг
    на друга и площадь падала с 2860 до 432 пикселей — персонаж читался
    ЛЫСЫМ, а не пришибленным. Правильная примятость сохраняет угловой
    разброс: шипы РАСПОЛЗАЮТСЯ шире и обвисают вниз, оставаясь десятью
    отдельными шипами.
    """
    import math
    out = []
    cy = HEAD_H * 0.95
    for i, ang in enumerate((-60, -30, -5, 25, 55, 85, 115, 145, 175, 205)):
        a = math.radians(ang)
        r0 = 0.30
        tip = 0.30 + 0.17 + (0.06 if i % 2 else 0.0)
        cx, base_y = 0.03, cy + 0.08
        # squash_y < 0 роняет шип НИЖЕ линии макушки (обвис),
        # splay_x > 1 разводит его в стороны — объём сохраняется.
        squash_y, splay_x = (1.0, 1.0) if state == "spiky" else (-0.22, 1.28)
        p0 = (cx + r0 * math.cos(a) * 0.9 * splay_x,
              base_y + r0 * math.sin(a) * 0.7)
        p1 = (cx + tip * math.cos(a) * splay_x,
              base_y + tip * math.sin(a) * 0.85 * squash_y)
        # треугольный шип
        perp = (math.cos(a + math.pi / 2) * 0.075,
                math.sin(a + math.pi / 2) * 0.075)
        out.append(Shape(
            [(p0[0] - perp[0], p0[1] - perp[1]), p1,
             (p0[0] + perp[0], p0[1] + perp[1])],
            fill=HAIR, outline=INK, outline_units=0.028))
    return out


def _prop(kind: str) -> list[Shape]:
    """Предмет в кисти (координаты кисти, кисть в (0,-0.03))."""
    if kind == "none":
        return []
    if kind == "gun":       # портальная пушка: корпус + зелёная колба
        return [
            Shape(rect_points(0.26, 0.13, 0.13, -0.02), fill=GUN_BODY,
                  outline=INK, outline_units=0.032),
            Shape(ellipse_points(0.055, 0.055, 0.13, 0.07), fill=GUN_GLOW,
                  outline=INK, outline_units=0.028),
            Shape(rect_points(0.05, 0.10, 0.28, -0.02), fill=GUN_BODY,
                  outline=INK, outline_units=0.03),     # дуло
        ]
    if kind == "thing":     # «штука» — розовый кристалл
        return [Shape([(0.0, 0.16), (0.10, 0.02), (0.04, -0.10),
                       (-0.06, -0.08), (-0.10, 0.05)],
                      fill=THING, outline=INK, outline_units=0.032)]
    raise ValueError(f"unknown prop {kind!r}")


def build_drick(eyes: str = "half", mouth: str = "flat",
                prop_near: str = "none", hair: str = "spiky") -> Puppet:
    parts: dict[str, RPart] = {}
    parts["master"] = RPart("master", None, (0.0, 0.0), [])
    parts["hips"] = RPart("hips", "master", (0.0, LEG_L + 0.05), [])

    dim = lambda c, k=0.84: tuple(int(x * k) for x in c)   # noqa: E731

    parts["leg_far"] = RPart("leg_far", "hips", (-0.09, 0.0), [
        Shape(capsule_points(LEG_L - 0.05, 0.068), fill=dim(PANTS),
              outline=INK)])
    parts["shoe_far"] = RPart("shoe_far", "leg_far", (0.0, -(LEG_L - 0.05)), [
        Shape(ellipse_points(0.15, 0.075, 0.05, -0.015), fill=dim(SHOE),
              outline=INK)])
    parts["leg_near"] = RPart("leg_near", "hips", (0.09, 0.0), [
        Shape(capsule_points(LEG_L - 0.05, 0.068), fill=PANTS, outline=INK)])
    parts["shoe_near"] = RPart("shoe_near", "leg_near", (0.0, -(LEG_L - 0.05)), [
        Shape(ellipse_points(0.15, 0.075, 0.05, -0.015), fill=SHOE,
              outline=INK)])

    # Торс: рубашка + халат распахнут (два бортика по бокам)
    torso_shapes = [
        Shape(ellipse_points(0.235, BODY_H / 2, 0.0, BODY_H / 2), fill=SHIRT,
              outline=INK),
        # борта халата — вертикальные ленты по бокам торса
        Shape([(-0.30, 0.0), (-0.13, BODY_H * 0.98), (-0.02, BODY_H * 0.96),
               (-0.16, 0.0)], fill=COAT, outline=INK, outline_units=0.035),
        Shape([(0.34, 0.0), (0.17, BODY_H * 0.98), (0.06, BODY_H * 0.96),
               (0.20, 0.0)], fill=COAT, outline=INK, outline_units=0.035),
    ]
    parts["torso"] = RPart("torso", "hips", (0.0, 0.0), torso_shapes)

    parts["arm_far"] = RPart("arm_far", "torso", (-0.19, BODY_H - 0.10), [
        Shape(capsule_points(ARM_L, 0.055), fill=dim(COAT), outline=INK)])
    parts["hand_far"] = RPart("hand_far", "arm_far", (0.0, -ARM_L), [
        Shape(ellipse_points(0.075, 0.075, 0.0, -0.025), fill=dim(SKIN),
              outline=INK)])
    parts["arm_near"] = RPart("arm_near", "torso", (0.19, BODY_H - 0.10), [
        Shape(capsule_points(ARM_L, 0.055), fill=COAT, outline=INK)])
    hand_shapes = [Shape(ellipse_points(0.075, 0.075, 0.0, -0.025), fill=SKIN,
                         outline=INK)]
    hand_shapes += [Shape([(x, y - 0.03) for x, y in s.points], fill=s.fill,
                          outline=s.outline, outline_units=s.outline_units)
                    for s in _prop(prop_near)]
    parts["hand_near"] = RPart("hand_near", "arm_near", (0.0, -ARM_L),
                               hand_shapes)

    # Голова: вытянутый овал
    head_shapes = [Shape(
        ellipse_points(HEAD_W, HEAD_H, 0.02, HEAD_H * 0.92), fill=SKIN,
        outline=INK)]
    head_shapes += _hair(hair)
    for sh in _eyes(eyes):
        head_shapes.append(sh)
    # нос — маленькая клякса (у R&M носы скромные, не как у Гоши)
    head_shapes.append(Shape(
        ellipse_points(0.045, 0.03, HEAD_W * 0.82, HEAD_H * 0.42),
        fill=dim(SKIN, 0.92), outline=INK, outline_units=0.026))
    for sh in _mouth(mouth):
        head_shapes.append(sh)
    parts["head"] = RPart("head", "torso", (0.02, BODY_H - 0.02), head_shapes)

    draw_order = [
        "arm_far", "hand_far", "leg_far", "shoe_far",
        "torso", "leg_near", "shoe_near", "hips", "master",
        "head", "arm_near", "hand_near",
    ]
    return Puppet(parts, draw_order)


DRICK_REST = {
    "arm_far": {"rot": 10.0},
    "arm_near": {"rot": -8.0},
    "leg_far": {"rot": 2.0},
    "leg_near": {"rot": -2.0},
    "head": {"rot": -2.0},
}
