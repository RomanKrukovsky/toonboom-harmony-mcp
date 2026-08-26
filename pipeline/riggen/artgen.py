"""Машинная отрисовка персонажа по правилам MOUTH_AND_FACE_STANDARD_V1.

Сам рисует: 8 видов головы (геометрия ракурсов), рты-фонемы (только на
видимых видах), глаза с блинком и направлениями взгляда, брови, части тела.

Стиль: чистый flat-мультяшный персонаж с контуром и кожей, выровненный
по суставам JOINTS (тот же вход, что у скелета). Все части рисуются на
полном холсте 400x600 с прозрачными краями и удерживаются translation
по пиксельному центру — поэтому центр части задаётся в px напрямую.
"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw

SKIN = (242, 200, 170)
SKIN_DARK = (206, 158, 128)
SHIRT = (64, 108, 168)
SHIRT_DARK = (48, 86, 138)
PANTS = (52, 56, 68)
PANTS_DARK = (38, 40, 50)
SHOE = (38, 40, 46)
HAIR = (86, 58, 40)
HAIR_DARK = (66, 44, 30)
LINE = (34, 28, 24)
EYE_WHITE = (252, 252, 250)
IRIS = (86, 62, 40)
MOUTH_DARK = (110, 46, 52)
LIP = (196, 110, 120)

# Голова по JOINTS: head_base=(200,185) -> head_top=(200,90)
HEAD_CX, HEAD_CY, HEAD_R = 200, 134, 50
NECK_TOP, NECK_BOTTOM = 196, 212
# Лицо на фронте
EYE_Y = 134
EYE_DX = 22
BROW_Y = 116
MOUTH_Y = 168


def _img(size=(400, 600)) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def _safe(name: str) -> str:
    return name.replace(' ', '_').replace('/', '-').replace('.', '')


def _save(img: Image.Image, path: Path) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    # Обрезаем по непрозрачному содержимому. Арт рисуется в абсолютных
    # координатах холста, а риг монтирует слой ЦЕНТРОМ в точку центра части;
    # если не обрезать, в позицию отправляется центр полного холста и всё
    # разъезжается. После кропа центр содержимого == центр монтирования.
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    img.save(path)
    return str(path)


def _face_geometry(view: str) -> dict:
    """Модель лица для ракурса: сдвиг черт, видимость, профиль."""
    v = view.lower()
    g = {"shift": 0.0, "squeeze": 1.0, "profile": False,
         "face_visible": True, "ears": True}
    if "back" in v:
        g["face_visible"] = False
        g["ears"] = True
    elif "side r" in v or v == "side_r":
        g.update(shift=26, squeeze=0.35, profile=True)
    elif "side l" in v or v == "side_l":
        g.update(shift=-26, squeeze=0.35, profile=True)
    elif "1/4 r" in v or "1-4 r" in v:
        g.update(shift=16, squeeze=0.7)
    elif "1/4 l" in v or "1-4 l" in v:
        g.update(shift=-16, squeeze=0.7)
    elif "3/4 r" in v or "3-4 r" in v:
        g.update(shift=10, squeeze=0.82)
    elif "3/4 l" in v or "3-4 l" in v:
        g.update(shift=-10, squeeze=0.82)
    return g


def draw_head_skull(view: str, assets: Path) -> str:
    img, d = _img()
    cx, cy, r = HEAD_CX, HEAD_CY, HEAD_R
    g = _face_geometry(view)
    sx, shift = g["squeeze"], g["shift"]
    box = [cx - r * sx + shift, cy - r, cx + r * sx + shift, cy + r]

    # шея (под головой, чуть шире) — соединяет с торсом
    d.rounded_rectangle([cx - 15 + shift, NECK_TOP, cx + 15 + shift,
                         NECK_BOTTOM + 4], 8, fill=SKIN, outline=LINE,
                        width=3)

    # уши
    if g["ears"]:
        ex = r * sx
        for sgn in (-1, 1):
            d.ellipse([cx + sgn * ex - 8 + shift, cy - 4,
                       cx + sgn * ex + 6 + shift, cy + 16],
                      fill=SKIN, outline=LINE, width=2)

    # голова
    d.ellipse(box, fill=SKIN, outline=LINE, width=3)

    # профиль — нос
    if g["profile"]:
        nx = cx + math.copysign(r * sx, shift) + shift
        d.polygon([(nx - math.copysign(7, shift), cy - 2),
                   (nx + math.copysign(14, shift), cy + 8),
                   (nx - math.copysign(4, shift), cy + 16)],
                  fill=SKIN, outline=LINE)

    # волосы-шапка с затылочным переходом
    hair = d.chord([box[0], box[1], box[2], box[1] + r], 180, 360,
                   fill=HAIR, outline=LINE)
    d.pieslice([box[0] - 4, box[1] - 6, box[2] + 4, box[1] + 24], 180, 360,
               fill=HAIR_DARK)
    # чёлка
    d.arc([box[0], box[1], box[2], box[1] + 30], 10, 170, fill=HAIR_DARK,
          width=6)
    # ухо-контур поверх волос у спины
    return _save(img, assets / f"head_{_safe(view)}.png")


def draw_mouth(phoneme: str, assets: Path) -> str:
    img, d = _img()
    cx, cy, w = HEAD_CX, MOUTH_Y, 34

    def lips(open_h, lip_h):
        d.ellipse([cx - w // 2, cy - open_h, cx + w // 2, cy + open_h],
                  fill=MOUTH_DARK)
        d.arc([cx - w // 2, cy - open_h, cx + w // 2, cy + open_h],
              25, 155, fill=LINE, width=4)

    if phoneme == "Closed":
        d.line([cx - w // 2, cy, cx + w // 2, cy], fill=LIP, width=4)
        d.line([cx - w // 2, cy + 1, cx + w // 2, cy + 1], fill=LINE, width=2)
    elif phoneme in ("A",):
        lips(12, 4)
    elif phoneme == "O":
        d.ellipse([cx - 10, cy - 10, cx + 10, cy + 10], fill=MOUTH_DARK)
        d.ellipse([cx - 10, cy - 10, cx + 10, cy + 10], outline=LIP, width=3)
    elif phoneme in ("I", "E"):
        d.rounded_rectangle([cx - w // 2, cy - 5, cx + w // 2, cy + 5], 5,
                            fill=MOUTH_DARK)
        d.line([cx - w // 2, cy, cx - w // 2 + 10, cy - 8], fill=LIP,
               width=4)
        d.line([cx + w // 2, cy, cx + w // 2 - 10, cy - 8], fill=LIP,
               width=4)
    elif phoneme == "U":
        d.ellipse([cx - 9, cy - 10, cx + 9, cy + 10], fill=MOUTH_DARK)
        d.ellipse([cx - 9, cy - 10, cx + 9, cy + 10], outline=LIP, width=3)
    elif phoneme == "F":
        d.line([cx - w // 2, cy - 2, cx + w // 2, cy - 2], fill=LIP, width=5)
        d.arc([cx - 13, cy - 10, cx + 13, cy + 8], 25, 155, fill=MOUTH_DARK,
              width=3)
    else:
        d.line([cx - w // 2, cy, cx + w // 2, cy], fill=LIP, width=5)
    return _save(img, assets / f"mouth_{phoneme}.png")


EYE_STATES = ["open", "half", "closed", "up", "down", "left", "right",
              "squint"]


def draw_eyes(state: str, view: str, assets: Path) -> str | None:
    if not _face_geometry(view)["face_visible"]:
        return None
    img, d = _img()
    g = _face_geometry(view)
    sx, dx = g["squeeze"], EYE_DX * g["squeeze"]
    cx = HEAD_CX + g["shift"]

    def eye(ex, mirror):
        rx, ry = 13 * max(sx, 0.5), 15
        if state == "closed":
            d.arc([ex - rx, EYE_Y - 6, ex + rx, EYE_Y + 6], 20, 160,
                  fill=LINE, width=4)
            return
        if state == "squint":
            ry = 6
        d.ellipse([ex - rx, EYE_Y - ry, ex + rx, EYE_Y + ry],
                  fill=EYE_WHITE, outline=LINE, width=2)
        # зрачок
        ox, oy = 0, 0
        shift = {"up": (0, -5), "down": (0, 4), "left": (-5, 0),
                 "right": (5, 0)}.get(state, (0, 0))
        ox, oy = shift
        pr = 5
        d.ellipse([ex + ox - pr, EYE_Y + oy - pr + 1,
                   ex + ox + pr, EYE_Y + oy + pr + 1], fill=IRIS)
        d.ellipse([ex + ox - 3, EYE_Y + oy - 3 + 1,
                   ex + ox + 3, EYE_Y + oy + 3 + 1], fill=LINE)
        # блик
        d.ellipse([ex + ox - 1, EYE_Y + oy - 6, ex + ox + 4,
                   EYE_Y + oy + 0], fill=EYE_WHITE)
        # верхнее веко
        d.arc([ex - rx, EYE_Y - ry - 2, ex + rx, EYE_Y + ry], 180, 360,
              fill=LINE, width=3)

    if g["profile"]:
        eye(cx + math.copysign(EYE_DX * 0.35, g["shift"]), True)
    else:
        eye(cx - dx, True)
        eye(cx + dx, False)
    return _save(img, assets / f"eyes_{state}_{_safe(view)}.png")


BROW_STATES = ["neutral", "angry", "raised", "sad"]


def draw_brows(state: str, view: str, assets: Path) -> str | None:
    if not _face_geometry(view)["face_visible"]:
        return None
    img, d = _img()
    g = _face_geometry(view)
    sx, dx = g["squeeze"], EYE_DX * g["squeeze"]
    cx = HEAD_CX + g["shift"]

    def brow(bx, mirror):
        ang = {"neutral": 0, "raised": -10, "angry": 10, "sad": -8}[state]
        inner = {"neutral": 0, "angry": 8, "sad": -8, "raised": 0}[state]
        # конец брови выше/ниже в зависимости от наклона
        ly = BROW_Y
        x0, x1 = bx - 14 * sx, bx + 14 * sx
        y0, y1 = ly, ly
        if mirror:
            y1 += ang
            y0 += inner
        else:
            y0 += ang
            y1 += inner
        d.line([x0, y0, x1, y1], fill=LINE, width=6)
        d.ellipse([x0 - 3, y0 - 4, x0 + 3, y0 + 2], fill=LINE)

    if g["profile"]:
        brow(cx + math.copysign(dx * 0.4, g["shift"]), True)
    else:
        brow(cx - dx, True)
        brow(cx + dx, False)
    return _save(img, assets / f"brows_{state}_{_safe(view)}.png")


def _limb(d: ImageDraw.ImageDraw, pts: list[tuple[float, float]],
          width: float) -> None:
    """Сглаженная конечность: округлые суставы, контур, внутренняя заливка."""
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    d.line(pts, fill=LINE, width=int(width) + 6, joint="curve")
    d.line(pts, fill=SKIN, width=int(width), joint="curve")


def draw_body_part(part: str, assets: Path) -> str:
    img, d = _img()
    if part == "Torso":
        # куртка: плечи + грудь + таз, соединяется с шеей и штанами.
        # трапеция туловища + плечевые скосы без отдельных "ушей".
        d.polygon([(200, 214), (144, 228), (138, 344), (262, 344),
                   (256, 228)], fill=SHIRT, outline=LINE)
        # скруглить плечи (внутри контура, не торчат выше)
        d.pieslice([144, 214, 200, 246], 90, 270, fill=SHIRT)
        d.pieslice([200, 214, 256, 246], 270, 90, fill=SHIRT)
        # ворот (под шеей) — затемняём вырез
        d.pieslice([186, 204, 214, 232], 0, 180, fill=SHIRT_DARK)
        d.arc([144, 228, 256, 258], 12, 168, fill=LINE, width=5)
        # планка с кнопками
        d.line([200, 236, 200, 340], fill=SHIRT_DARK, width=4)
        for y in (254, 286, 318):
            d.ellipse([196, y - 3, 204, y + 3], fill=LINE)
        # низ куртки
        d.arc([138, 320, 262, 350], 0, 180, fill=LINE, width=5)
    elif part == "LArm":
        # левый рукав: плечо(150,225)->локоть(140,285)->запястье(135,325)
        _limb(d, [(150, 230), (140, 285), (135, 322)], 20)
        # рукав поверх плеча
        d.line([(146, 228), (142, 278)], fill=SHIRT, width=22, joint="curve")
        d.pieslice([130, 216, 162, 248], 90, 270, fill=SHIRT, outline=LINE,
                   width=3)
        # кисть
        d.ellipse([135 - 8, 316 - 5, 135 + 8, 334 - 5], fill=SKIN,
                  outline=LINE, width=2)
    elif part == "RArm":
        _limb(d, [(250, 230), (260, 285), (265, 322)], 20)
        d.line([(254, 228), (258, 278)], fill=SHIRT, width=22, joint="curve")
        d.pieslice([238, 216, 270, 248], 270, 90, fill=SHIRT, outline=LINE,
                   width=3)
        d.ellipse([265 - 8, 316 - 5, 265 + 8, 334 - 5], fill=SKIN,
                  outline=LINE, width=2)
    elif part == "LLeg":
        # левая нога: бедро(180,342)->колено(178,450)->щиколотка(176,545)->носок(150,562)
        d.line([(180, 344), (178, 450)], fill=LINE, width=31, joint="curve")
        d.line([(180, 344), (178, 450)], fill=PANTS, width=25, joint="curve")
        d.line([(178, 450), (176, 540)], fill=LINE, width=27, joint="curve")
        d.line([(178, 450), (176, 540)], fill=PANTS_DARK, width=21,
               joint="curve")
        d.line([(176, 540), (176, 556)], fill=LINE, width=25)
        d.line([(176, 540), (176, 556)], fill=SKIN, width=19)
        # носок/обувь
        d.pieslice([148, 540, 200, 580], 300, 120, fill=SHOE, outline=LINE,
                   width=3)
        d.line([(152, 556), (198, 556)], fill=LINE, width=4)
    elif part == "RLeg":
        d.line([(220, 344), (222, 450)], fill=LINE, width=31, joint="curve")
        d.line([(220, 344), (222, 450)], fill=PANTS, width=25, joint="curve")
        d.line([(222, 450), (224, 540)], fill=LINE, width=27, joint="curve")
        d.line([(222, 450), (224, 540)], fill=PANTS_DARK, width=21,
               joint="curve")
        d.line([(224, 540), (224, 556)], fill=LINE, width=25)
        d.line([(224, 540), (224, 556)], fill=SKIN, width=19)
        d.pieslice([196, 540, 248, 580], 300, 120, fill=SHOE, outline=LINE,
                   width=3)
        d.line([(200, 556), (246, 556)], fill=LINE, width=4)
    return _save(img, assets / f"{part}.png")


HEAD_VIEWS = ["Front", "3/4 R", "Side R", "1/4 R", "Back",
              "1/4 L", "Side L", "3/4 L"]
MOUTH_VIEWS = ["Front", "3/4 R", "3/4 L"]
FACE_VIEWS = ["Front", "3/4 R", "Side R", "Side L", "3/4 L"]
PHONEMES = ["Closed", "A", "O", "I", "U", "E"]


def generate_all_vector_art() -> dict:
    """Генерирует полный комплект векторного арта (MeshLayer) для всех частей персонажа."""
    from .vector_shapes import (generate_head_skull_mesh, generate_eye_mesh,
                                generate_brow_mesh, generate_mouth_mesh,
                                generate_torso_mesh, generate_limb_mesh,
                                generate_hand_mesh, add_point_morph_action,
                                HAND_POSES)

    heads = {v: generate_head_skull_mesh(v) for v in HEAD_VIEWS}
    mouths = {p: generate_mouth_mesh(p) for p in PHONEMES}
    eyes = {}
    for s in EYE_STATES:
        for v in FACE_VIEWS:
            eyes[(s, v)] = generate_eye_mesh("R", state=s, view=v)

    brows = {}
    for s in BROW_STATES:
        for v in FACE_VIEWS:
            brows[(s, v)] = generate_brow_mesh("R", state=s, view=v)

    larm = generate_limb_mesh("LArm")
    rarm = generate_limb_mesh("RArm")
    lleg = generate_limb_mesh("LLeg")
    rleg = generate_limb_mesh("RLeg")

    # Сглаживание сгибов локтей и коленей (point morphing в смарт-экшенах)
    add_point_morph_action(larm, "Arm Bend L", {
        1: [(0.0, 0.0), (-0.03, 0.02), (0.03, -0.02)],
        2: [(0.0, 0.0), (-0.02, -0.02), (0.02, 0.02)]
    })
    add_point_morph_action(rarm, "Arm Bend R", {
        1: [(0.0, 0.0), (0.03, 0.02), (-0.03, -0.02)],
        2: [(0.0, 0.0), (0.02, -0.02), (-0.02, 0.02)]
    })
    add_point_morph_action(lleg, "Leg Bend L", {
        1: [(0.0, 0.0), (-0.04, 0.03), (0.02, -0.01)],
        2: [(0.0, 0.0), (-0.02, -0.02), (0.01, 0.01)]
    })
    add_point_morph_action(rleg, "Leg Bend R", {
        1: [(0.0, 0.0), (0.04, 0.03), (-0.02, -0.01)],
        2: [(0.0, 0.0), (0.02, -0.02), (-0.01, 0.01)]
    })

    hands = {
        "L": {p: generate_hand_mesh("L", p) for p in HAND_POSES},
        "R": {p: generate_hand_mesh("R", p) for p in HAND_POSES},
    }

    body = {
        "Torso": generate_torso_mesh(),
        "LArm": larm,
        "RArm": rarm,
        "LLeg": lleg,
        "RLeg": rleg,
    }

    return {"heads": heads, "mouths": mouths, "eyes": eyes,
            "brows": brows, "body": body, "hands": hands}


def draw_all(out_dir: Path) -> dict:
    """Рисует весь комплект арта. Возвращает словарь путей."""
    assets = out_dir / "assets"
    heads = {v: draw_head_skull(v, assets) for v in HEAD_VIEWS}
    mouths = {p: draw_mouth(p, assets) for p in PHONEMES}
    eyes = {}
    for s in EYE_STATES:
        for v in FACE_VIEWS:
            r = draw_eyes(s, v, assets)
            if r:
                eyes[(s, v)] = r
    brows = {}
    for s in BROW_STATES:
        for v in FACE_VIEWS:
            r = draw_brows(s, v, assets)
            if r:
                brows[(s, v)] = r
    body = {p: draw_body_part(p, assets)
            for p in ("Torso", "LArm", "RArm", "LLeg", "RLeg")}
    return {"heads": heads, "mouths": mouths, "eyes": eyes,
            "brows": brows, "body": body}
