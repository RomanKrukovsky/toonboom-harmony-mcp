"""
garage.py — фон: гараж-лаборатория. Тёмный, чтобы портал светился.

Композиция кадра (мировые единицы, пол y=0, камера смотрит на x≈0..4):
  - задняя стена в тёмно-синем, пол темнее стены;
  - верстак справа (x 2.6..4.4) со хламом: пробирки, банка, тостер;
  - полка с колбами слева высоко;
  - гаражные ворота-секции по всей стене (горизонтальные полосы);
  - лампа сверху с конусом света в центре — куда встанет портал.

Всё рисуется процедурно в draw_bg. Это фон, он не анимируется,
поэтому марионеткой быть не должен: лишние 40 полигонов в
world_transforms на каждом из 720 кадров — это на минуту рендера.
"""

from __future__ import annotations

WALL = (44, 52, 66)
WALL_DARK = (34, 40, 52)
FLOOR = (28, 32, 42)
FLOOR_LINE = (52, 60, 74)
DOOR_LINE = (58, 68, 84)
BENCH = (74, 60, 48)
BENCH_TOP = (96, 78, 60)
GLASS = (126, 168, 178)
GLASS_GREEN = (110, 190, 120)
GLASS_PINK = (206, 128, 168)
METAL = (108, 114, 124)
LAMP = (240, 232, 190)
LIGHT_CONE = (66, 74, 88)
INK = (18, 16, 20)

FLOOR_Y = 0.0
WALL_TOP = 4.6


def draw_garage(d, proj, unit_px) -> None:
    w = max(1, int(0.035 * unit_px))

    # --- стена и пол ---------------------------------------------------------
    p_tl, p_br = proj((-6.0, WALL_TOP)), proj((10.0, FLOOR_Y))
    d.rectangle([p_tl[0], p_tl[1], p_br[0], p_br[1]], fill=WALL)
    f_tl, f_br = proj((-6.0, FLOOR_Y)), proj((10.0, -3.0))
    d.rectangle([f_tl[0], f_tl[1], f_br[0], f_br[1]], fill=FLOOR)
    d.line([proj((-6.0, FLOOR_Y)), proj((10.0, FLOOR_Y))], fill=FLOOR_LINE,
           width=max(2, w * 2))

    # секции гаражных ворот: горизонтальные линии по стене
    for i in range(1, 8):
        y = FLOOR_Y + i * (WALL_TOP - FLOOR_Y) / 8
        d.line([proj((-6.0, y)), proj((10.0, y))], fill=DOOR_LINE, width=w)

    # конус света от лампы над центром (x≈1.6) — сюда встанет портал
    cone = [proj((1.45, WALL_TOP - 0.15)), proj((1.75, WALL_TOP - 0.15)),
            proj((3.5, FLOOR_Y)), proj((-0.4, FLOOR_Y))]
    d.polygon(cone, fill=LIGHT_CONE)
    lamp_c = proj((1.6, WALL_TOP - 0.22))
    rr = 0.22 * unit_px
    d.ellipse([lamp_c[0] - rr, lamp_c[1] - rr * 0.5,
               lamp_c[0] + rr, lamp_c[1] + rr * 0.5], fill=LAMP, outline=INK,
              width=w)
    d.line([proj((1.6, WALL_TOP)), proj((1.6, WALL_TOP - 0.22))], fill=INK,
           width=w)

    # --- верстак справа ------------------------------------------------------
    # Сдвинут вправо (было 2.7..4.9): ASCII-просмотр показал, что Ворти
    # останавливается ровно на верстаке и его силуэт тонет в хламе.
    # Персонаж должен стоять на ЧИСТОЙ стене — иначе поза не читается.
    bx0, bx1, by = 4.35, 6.55, 1.15
    tl, br = proj((bx0, by)), proj((bx1, by - 0.14))
    d.rectangle([tl[0], tl[1], br[0], br[1]], fill=BENCH_TOP, outline=INK,
                width=w)
    tl, br = proj((bx0 + 0.1, by - 0.14)), proj((bx1 - 0.1, FLOOR_Y))
    d.rectangle([tl[0], tl[1], br[0], br[1]], fill=BENCH, outline=INK, width=w)

    # хлам на верстаке: три пробирки и колба
    for x, col, h in ((4.60, GLASS_GREEN, 0.34), (4.80, GLASS, 0.26),
                      (4.99, GLASS_PINK, 0.40)):
        tl, br = proj((x - 0.055, by + h)), proj((x + 0.055, by))
        d.rectangle([tl[0], tl[1], br[0], br[1]], fill=col, outline=INK,
                    width=w)
    fc = proj((5.40, by + 0.20))
    fr = 0.20 * unit_px
    d.ellipse([fc[0] - fr, fc[1] - fr, fc[0] + fr, fc[1] + fr],
              fill=GLASS_GREEN, outline=INK, width=w)
    d.rectangle([*proj((5.36, by + 0.52)), *proj((5.44, by + 0.34))],
                fill=GLASS_GREEN, outline=INK, width=w)
    # тостер-хлам
    d.rectangle([*proj((5.90, by + 0.28)), *proj((6.33, by))], fill=METAL,
                outline=INK, width=w)

    # --- полка слева ---------------------------------------------------------
    sx0, sx1, sy = -2.75, -1.05, 2.45
    d.rectangle([*proj((sx0, sy)), *proj((sx1, sy - 0.10))], fill=BENCH_TOP,
                outline=INK, width=w)
    for x, col in ((-2.50, GLASS), (-2.27, GLASS_PINK), (-2.03, GLASS_GREEN),
                   (-1.70, GLASS)):
        d.rectangle([*proj((x - 0.05, sy + 0.30)), *proj((x + 0.05, sy))],
                    fill=col, outline=INK, width=w)
    # кронштейн
    d.line([proj((sx0 + 0.3, sy)), proj((sx0 + 0.3, sy - 0.45))], fill=INK,
           width=w)

    # --- ящики на полу слева -------------------------------------------------
    d.rectangle([*proj((-2.95, 0.72)), *proj((-2.20, FLOOR_Y))], fill=BENCH,
                outline=INK, width=w)
    d.rectangle([*proj((-2.25, 0.48)), *proj((-1.65, FLOOR_Y))],
                fill=BENCH_TOP, outline=INK, width=w)


BG_COLOR = WALL
