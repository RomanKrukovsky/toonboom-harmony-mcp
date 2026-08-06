"""
scene_portal.py — 30 секунд в стилистике Rick and Morty. 720 кадров, 24 fps.

Гэг построен на разворотe: тот, кто владеет инструментом, становится его
жертвой, а робкий получает последний взгляд. Классическая комическая
структура «эскалация + колбэк».

РАСКАДРОВКА (кадры при 24 fps):
    1- 48  Гараж. Дрик стоит, полуприкрытые глаза, скука. Дышит.
   20- 96  Ворти входит справа, тревожный, останавливается.
   96-128  Дрик поднимает портальную пушку: замах назад (96-112), взмах (112-128).
  130-148  ВЫСТРЕЛ. Портал распахивается с перелётом («хлопает» в бытие).
  148-200  Портал крутится. Оба смотрят. Дрик самодоволен (smug + слюна).
  200-248  Дрик жестом «после тебя» — рука в сторону портала.
  248-292  Ворти делает один нерешительный шаг. Глаза круглые.
  292-318  ИЗ портала вылетает розовый кристалл: баллистическая дуга.
  318-338  БОНК по голове Дрика. Шипы волос ПРИМЯТЫ (навсегда). Тряска.
  338-398  Дрик оглушён, качается. Ворти застыл. Кристалл на полу.
  398-438  Дрик в ярости: стиснул зубы, наводит пушку ВНИЗ, на кристалл.
  440-462  Второй портал открывается У НЕГО ПОД НОГАМИ.
  462-498  Дрик проваливается. Портал 2 закрывается.
  498-556  Ворти один. Моргает. Смотрит на портал. Пауза — она и есть шутка.
  556-596  Дрик ВЫПАДАЕТ из первого портала (петля!) — heavy_impact.
  596-616  Плашмя на спину. Сквош, тряска.
  616-648  Второй кристалл вылетает и бонкает его снова (колбэк).
  648-720  Ворти ухмыляется. Портал закрывается. Конец.

Задействовано: portal.py (разноскоростные кольца), garage.py (тёмный сет,
чтобы портал светился), character_rick/morty (пара, читаемая силуэтом),
sample_profile (все изинги), heavy_impact (три падения, t²), settle
(приземления), breathe_hold (скука и оглушение), blink_assignments
(Пуассон), jitter_curve (две тряски камеры), boil на двойках, provenance.
"""

from __future__ import annotations

import _bootstrap  # noqa: F401  (ставит harmony/client в sys.path)

import math
import subprocess
from pathlib import Path

from asciiview import frame_to_ascii
from camera import CameraMove, shot_plan
from character_morty import VORTY_REST, build_vorty
from character_rick import build_drick
from columns import Key
from craft import breathe_hold
from drawings import Assignment, blink_assignments
from garage import BG_COLOR, draw_garage
from imperfection import jitter_curve
from keyframes import dense, follow, hold
from portal import build_portal, portal_spin_pose
from provenance import Ledger
from renderer import (
    Camera,
    Puppet,
    RPart,
    Renderer,
    Shape,
    drawing_at,
    ellipse_points,
    eval_keys,
    eval_pose,
)

FPS = 24
FRAMES = 720
OUT_DIR = Path("/tmp/portal_shot")

# --- геометрия сцены -------------------------------------------------------
# Раскладка по x подобрана под кадр 1280x720 при scale≈0.94: Дрик слева
# от центра, портал в конусе света, Ворти справа на ЧИСТОЙ стене (не на
# верстаке — иначе его силуэт тонет в хламе).
PORTAL_X, PORTAL_Y = 1.85, 1.20      # центр портала 1
PORTAL_R = 0.92
P2_X, P2_Y = 0.00, 0.18              # портал 2 — под ногами Дрика
DRICK_X = 0.00
VORTY_START, VORTY_STOP, VORTY_STEP = 4.60, 3.35, 2.80
HEAD_TOP = 2.58                      # куда падает кристалл
CRYSTAL = (250, 120, 170)
INK = (26, 22, 24)


def build_crystal() -> Puppet:
    c = RPart("crystal", None, (0.0, 0.0), [
        Shape([(0.0, 0.17), (0.11, 0.02), (0.05, -0.12),
               (-0.07, -0.09), (-0.11, 0.06)],
              fill=CRYSTAL, outline=INK, outline_units=0.035),
        Shape(ellipse_points(0.030, 0.045, -0.01, 0.04),
              fill=(255, 190, 215), outline=None),      # блик-грань
    ])
    return Puppet({"crystal": c}, ["crystal"])


# ---------------------------------------------------------------------------
# Дрик
# ---------------------------------------------------------------------------

def drick_channels() -> dict[str, list[Key]]:
    ch: dict[str, list[Key]] = {}

    # --- корень: x -----------------------------------------------------------
    x = hold(1, 497, DRICK_X)
    # пока он ПОД полом (498-555) — телепорт к порталу 1: зритель не видит
    x += hold(498, 555, PORTAL_X)
    x += dense("heavy_impact", 556, 596, PORTAL_X, PORTAL_X - 0.55)
    x += hold(596, FRAMES, PORTAL_X - 0.55)
    ch["master.x"] = x

    # --- корень: y -----------------------------------------------------------
    y = hold(1, 461, 0.0)
    y += dense("ease_in", 462, 498, 0.0, -3.40)        # провалился
    y += hold(498, 555, -3.40)
    y += dense("heavy_impact", 556, 596, PORTAL_Y, 0.0)  # выпал из портала
    y += dense("settle", 596, 616, 0.0, 0.0,
               {"settle_cycles": 2.0, "damping": 5.0})[1:]
    y += hold(616, FRAMES, 0.0)
    ch["master.y"] = y

    # --- корень: наклон (падение плашмя на спину) ----------------------------
    rot = hold(1, 461, 0.0)
    rot += dense("linear", 462, 498, 0.0, -22.0)       # заваливается в дыру
    rot += hold(498, 555, -22.0)
    rot += dense("ease_out", 556, 594, 40.0, 84.0)     # кувырок в полёте
    rot += dense("settle", 594, 618, 84.0, 80.0,
                 {"settle_cycles": 1.5, "damping": 6.0})[1:]
    rot += hold(618, FRAMES, 80.0)                     # лежит на спине
    ch["master.rot"] = rot

    # --- сквош/стретч --------------------------------------------------------
    sy = hold(1, 317, 1.0)
    sy += dense("linear", 318, 324, 1.0, 0.80)         # сквош от бонка
    sy += dense("settle", 324, 344, 0.80, 1.0,
                {"settle_cycles": 2.5, "damping": 4.5})[1:]
    sy += hold(344, 555, 1.0)
    sy += dense("linear", 556, 590, 1.0, 1.14)         # стретч в падении
    sy += dense("linear", 590, 598, 1.14, 0.74)[1:]    # сквош удара о пол
    sy += dense("settle", 598, 622, 0.74, 1.0,
                {"settle_cycles": 2.5, "damping": 4.0})[1:]
    sy += hold(622, 644, 1.0)
    sy += dense("linear", 645, 650, 1.0, 0.86)         # сквош второго бонка
    sy += dense("settle", 650, 672, 0.86, 1.0,
                {"settle_cycles": 2.0, "damping": 5.0})[1:]
    sy += hold(672, FRAMES, 1.0)
    ch["hips.sy"] = sy
    ch["hips.sx"] = [Key(frame=k.frame, value=1.0 + (1.0 - k.value) * 0.55)
                     for k in sy]

    # --- ближняя рука (с пушкой) --------------------------------------------
    # Конвенция (унаследована из scene_cookie): капсула висит вниз при 0°,
    # ПОЛОЖИТЕЛЬНЫЙ угол ведёт руку вперёд-вправо, куда персонаж смотрит.
    arm = hold(1, 95, -14.0)                       # пушка опущена, скука
    arm += dense("ease_in", 96, 112, -14.0, -52.0)  # ЗАМАХ назад (антиципация)
    arm += hold(112, 116, -52.0)                    # микрохолд — вес замаха
    arm += dense("ease_out", 117, 130, -52.0, 96.0)  # взмах: наводит на портал
    arm += hold(130, 198, 96.0)                     # держит на прицеле
    arm += dense("ease_in_out", 199, 224, 96.0, 128.0)   # жест «после тебя»
    arm += hold(224, 316, 128.0)
    arm += dense("heavy_impact", 317, 336, 128.0, 22.0)  # рука падает от бонка
    arm += dense("settle", 336, 356, 22.0, -8.0,
                 {"settle_cycles": 2.0, "damping": 5.0})[1:]
    arm += hold(356, 397, -8.0)
    arm += dense("ease_in", 398, 420, -8.0, -34.0)   # злой замах
    arm += dense("ease_out", 421, 438, -34.0, 62.0)  # наводит ВНИЗ, на кристалл
    arm += hold(438, 497, 62.0)
    arm += hold(498, 555, 20.0)
    arm += dense("linear", 556, 592, 150.0, 44.0)    # машет в падении
    arm += dense("settle", 592, 618, 44.0, 16.0)[1:]
    arm += hold(618, FRAMES, 16.0)
    ch["arm_near.rot"] = arm

    # дальняя рука: overlap — узнаёт о движении на 3 кадра позже, амплитуда 0.65
    ch["arm_far.rot"] = follow(arm, lag=3, amount=0.65, base=12.0,
                               last_frame=FRAMES)

    # --- ноги ----------------------------------------------------------------
    legs = hold(1, 95, -3.0)
    legs += dense("ease_in", 96, 116, -3.0, 16.0)     # чуть присел на замахе
    legs += dense("ease_out", 117, 134, 16.0, -6.0)
    legs += hold(134, 317, -6.0)
    legs += dense("linear", 318, 326, -6.0, 26.0)     # колени подогнулись
    legs += dense("settle", 326, 348, 26.0, -4.0)[1:]
    legs += hold(348, 461, -4.0)
    legs += dense("linear", 462, 498, -4.0, 34.0)     # болтаются в дыре
    legs += hold(498, 555, 34.0)
    legs += dense("linear", 556, 594, 52.0, 12.0)
    legs += dense("settle", 594, 618, 12.0, -2.0)[1:]
    legs += hold(618, FRAMES, -2.0)
    ch["leg_near.rot"] = legs
    ch["leg_far.rot"] = [Key(frame=k.frame, value=-k.value * 0.8) for k in legs]

    # --- голова --------------------------------------------------------------
    head = breathe_hold(1, 60, -2.0, amplitude=1.6, period_frames=34.0, seed=4)
    head += dense("ease_in_out", 61, 78, head[-1].value, 9.0)   # глянул на Ворти
    head += hold(78, 128, 9.0)
    head += dense("ease_in_out", 129, 146, 9.0, -4.0)           # на портал
    head += hold(146, 316, -4.0)
    head += dense("linear", 317, 324, -4.0, -19.0)              # бонк вниз
    head += dense("settle", 324, 341, -19.0, 0.0)[1:]
    # оглушение: широкое качание головой.
    # Регрессия, пойманная тестом на конфликтующие ключи: settle
    # заканчивался на 342 и breathe_hold начинался с 342 — два разных
    # значения на одном кадре, порядок в списке молча решал исход.
    # Видно это было бы только как дёрганье головы на просмотре.
    daze = breathe_hold(342, 396, 0.0, amplitude=8.0,
                        period_frames=17.0, seed=9)
    head += daze
    head += dense("ease_in", 397, 420, daze[-1].value, -14.0)   # взгляд вниз, зло
    head += hold(420, 497, -14.0)
    head += hold(498, 555, 0.0)
    head += dense("linear", 556, 596, 12.0, -6.0)
    head += dense("settle", 596, 620, -6.0, 2.0)[1:]
    head += hold(620, 644, 2.0)
    head += dense("linear", 645, 652, 2.0, -12.0)               # второй бонк
    head += dense("settle", 652, 676, -12.0, 0.0)[1:]
    head += hold(676, FRAMES, 0.0)
    ch["head.rot"] = head

    # микродрейф торса на длинном холде скуки — лечение мёртвого холда
    ch["torso.y"] = (breathe_hold(1, 95, 0.0, amplitude=0.010,
                                  period_frames=31.0, seed=6)
                     + hold(96, FRAMES, 0.0))
    return ch


# ---------------------------------------------------------------------------
# Ворти
# ---------------------------------------------------------------------------

def vorty_channels() -> dict[str, list[Key]]:
    ch: dict[str, list[Key]] = {}
    # зеркалим: Ворти смотрит ВЛЕВО, на Дрика
    ch["master.sx"] = hold(1, FRAMES, -1.0)

    x = hold(1, 19, VORTY_START)
    x += dense("ease_out", 20, 96, VORTY_START, VORTY_STOP)   # вошёл и встал
    x += hold(96, 247, VORTY_STOP)
    x += dense("ease_in_out", 248, 292, VORTY_STOP, VORTY_STEP)  # робкий шаг
    x += hold(292, 316, VORTY_STEP)
    x += dense("ease_out", 317, 340, VORTY_STEP, VORTY_STOP + 0.22)  # отскочил
    x += hold(340, FRAMES, VORTY_STOP + 0.22)
    ch["master.x"] = x

    # походка: подпрыгивание корпуса + альтернация ног, пока идёт
    bob, l_near, l_far = [], [], []
    for f in range(1, FRAMES + 1):
        walking = 20 <= f <= 96 or 248 <= f <= 292
        if walking:
            ph = 2 * math.pi * f / 12.0
            bob.append(Key(frame=f, value=0.035 * abs(math.sin(ph))))
            l_near.append(Key(frame=f, value=22.0 * math.sin(ph)))
            l_far.append(Key(frame=f, value=-22.0 * math.sin(ph)))
        else:
            bob.append(Key(frame=f, value=0.0))
            l_near.append(Key(frame=f, value=-2.0))
            l_far.append(Key(frame=f, value=2.0))
    ch["master.y"] = bob
    ch["leg_near.rot"] = l_near
    ch["leg_far.rot"] = l_far

    # руки: прижаты к себе (тревога), вскидываются на бонке
    arm = hold(1, 291, -16.0)
    arm += dense("ease_out", 292, 312, -16.0, 118.0)    # всплеснул руками
    arm += hold(312, 400, 118.0)
    arm += dense("ease_in_out", 401, 430, 118.0, -10.0)
    arm += hold(430, 645, -10.0)
    arm += dense("ease_in_out", 646, 668, -10.0, 34.0)  # развёл руками: «ну вот»
    arm += hold(668, FRAMES, 34.0)
    ch["arm_near.rot"] = arm
    ch["arm_far.rot"] = follow(arm, lag=2, amount=0.7, base=14.0,
                               last_frame=FRAMES)

    # голова: следит за Дриком, потом за порталом, в финале — на камеру
    head = hold(1, 96, 4.0)
    head += dense("ease_in_out", 97, 132, 4.0, -8.0)     # смотрит на пушку
    head += hold(132, 200, -8.0)
    head += dense("ease_in_out", 201, 230, -8.0, 10.0)   # на портал
    head += hold(230, 316, 10.0)
    head += dense("linear", 317, 330, 10.0, -12.0)       # дёрнулся на бонк
    head += dense("settle", 330, 352, -12.0, 2.0)[1:]
    head += hold(352, 497, 2.0)
    head += breathe_hold(498, 552, 2.0, amplitude=3.0,
                         period_frames=26.0, seed=12)    # один, растерян
    head += dense("ease_in_out", 553, 570, 2.0, -6.0)
    head += hold(570, 645, -6.0)
    head += dense("ease_in_out", 646, 670, -6.0, 8.0)
    head += hold(670, FRAMES, 8.0)
    ch["head.rot"] = head
    return ch


# ---------------------------------------------------------------------------
# Порталы и кристаллы
# ---------------------------------------------------------------------------

def portal1_open() -> list[Key]:
    """Открытие с перелётом: портал ХЛОПАЕТ в существование, а не
    вырастает. Перелёт 1.18 и обратный доводчик — это то, что делает
    появление событием."""
    k = hold(1, 129, 0.0)
    k += dense("ease_out", 130, 142, 0.0, 1.18)
    k += dense("ease_in_out", 142, 152, 1.18, 1.0)[1:]
    k += hold(152, 689, 1.0)
    k += dense("ease_in", 690, 716, 1.0, 0.0)      # схлопнулся в точку
    k += hold(716, FRAMES, 0.0)
    return k


def portal2_open() -> list[Key]:
    k = hold(1, 439, 0.0)
    k += dense("ease_out", 440, 452, 0.0, 1.12)
    k += dense("ease_in_out", 452, 462, 1.12, 1.0)[1:]
    k += hold(462, 479, 1.0)
    k += dense("ease_in", 480, 505, 1.0, 0.0)
    k += hold(505, FRAMES, 0.0)
    return k


def crystal_channels(out_frame: int, bonk_frame: int, land_x: float,
                     rest_x: float, apex: float,
                     spin: float = 620.0) -> dict[str, list[Key]]:
    """
    Кристалл вылетает из портала 1, описывает честную параболу из двух
    профилей (вверх ease_out — гаснет; вниз heavy_impact — ускоряется),
    бонкает голову и падает на пол.

    Ключ к тому, что это читается как «вылетело ИЗ портала»: старт
    строго в центре портала и первые кадры — почти вертикально вверх.
    """
    hidden = -12.0
    ch: dict[str, list[Key]] = {}
    fall_end = bonk_frame + 26

    x = hold(1, out_frame - 1, hidden)
    x += dense("ease_out", out_frame, bonk_frame, PORTAL_X, land_x)
    x += dense("linear", bonk_frame, fall_end, land_x, rest_x)[1:]
    x += hold(fall_end, FRAMES, rest_x)
    ch["crystal.x"] = x

    up_end = out_frame + (bonk_frame - out_frame) // 2
    y = hold(1, out_frame - 1, hidden)
    y += dense("ease_out", out_frame, up_end, PORTAL_Y, apex)
    y += dense("heavy_impact", up_end, bonk_frame, apex, HEAD_TOP)[1:]
    y += dense("heavy_impact", bonk_frame, fall_end, HEAD_TOP, 0.12)[1:]
    y += hold(fall_end, FRAMES, 0.12)
    ch["crystal.y"] = y

    rot = hold(1, out_frame - 1, 0.0)
    rot += dense("ease_out", out_frame, fall_end, 0.0, spin)
    rot += hold(fall_end, FRAMES, spin)
    ch["crystal.rot"] = rot
    return ch


# ---------------------------------------------------------------------------
# Камера
# ---------------------------------------------------------------------------

def camera_channels() -> dict[str, list[Key]]:
    plan = shot_plan([
        CameraMove("hold", 130),
        CameraMove("push_in", 25, amount=1.15, profile="ease_in_out"),
        CameraMove("hold", 160),
        CameraMove("push_in", 35, amount=1.12, profile="ease_in_out"),
        CameraMove("hold", 60),
        CameraMove("pull_out", 40, amount=1.20, profile="ease_in_out"),
        CameraMove("hold", 90),
        CameraMove("push_in", 30, amount=1.10, profile="ease_in_out"),
        CameraMove("hold", 150),
    ], start_frame=1)
    ch = {"cam.x": plan.x_keys, "cam.y": plan.y_keys,
          "cam.scale": plan.scale_keys}

    # две тряски: бонк №1 (318-332) и падение на пол (592-606)
    shake: list[Key] = [Key(frame=1, value=0.0)]
    for f0, f1, amp in ((318, 332, 0.050), (592, 606, 0.042),
                        (645, 656, 0.030)):
        zone = [Key(frame=f, value=0.0) for f in range(f0, f1 + 1)]
        shaken = jitter_curve(zone, amplitude=amp, seed=f0,
                              protect_extremes=False, wavelength_frames=2.0)
        shake += [Key(frame=f0 - 1, value=0.0)] + shaken + \
                 [Key(frame=f1 + 1, value=0.0)]
    shake += [Key(frame=FRAMES, value=0.0)]
    ch["cam.shake_y"] = shake
    return ch


# ---------------------------------------------------------------------------
# Лица (substitution): глаза, рты, причёска
# ---------------------------------------------------------------------------

def drick_face() -> tuple[list[Assignment], list[Assignment], list[Assignment]]:
    blinks = blink_assignments(FRAMES / FPS, state="calm", fps=FPS,
                               start_frame=1, seed=5,
                               avoid_frames=list(range(310, 350))
                               + list(range(455, 505))
                               + list(range(552, 620)))
    eyes = [Assignment(frame=1, drawing="half")] + [
        a for a in blinks if a.frame < 300]
    eyes += [
        Assignment(frame=130, drawing="half"),
        Assignment(frame=292, drawing="wide"),   # что-то летит!
        Assignment(frame=318, drawing="closed"), # БОНК
        Assignment(frame=336, drawing="half"),
        Assignment(frame=398, drawing="wide"),   # ярость
        Assignment(frame=440, drawing="wide"),
        Assignment(frame=462, drawing="wide"),   # падает
        Assignment(frame=556, drawing="wide"),
        Assignment(frame=600, drawing="closed"),
        Assignment(frame=624, drawing="half"),
        Assignment(frame=645, drawing="closed"), # бонк №2
        Assignment(frame=666, drawing="half"),
    ]
    mouth = [
        Assignment(frame=1, drawing="flat"),
        Assignment(frame=96, drawing="smug"),    # самодовольство + слюна
        Assignment(frame=130, drawing="smug"),
        Assignment(frame=199, drawing="smug"),
        Assignment(frame=292, drawing="open"),
        Assignment(frame=318, drawing="yell"),   # БОНК
        Assignment(frame=342, drawing="open"),   # оглушён
        Assignment(frame=398, drawing="grit"),   # ярость
        Assignment(frame=440, drawing="yell"),
        Assignment(frame=462, drawing="yell"),   # орёт, падая
        Assignment(frame=556, drawing="yell"),
        Assignment(frame=598, drawing="grit"),
        Assignment(frame=645, drawing="yell"),
        Assignment(frame=676, drawing="flat"),
    ]
    # Причёска — навсегда примята после бонка. Последствие, которое не
    # проходит, — половина комедии.
    hair = [Assignment(frame=1, drawing="spiky"),
            Assignment(frame=320, drawing="flat")]
    return eyes, mouth, hair


def vorty_face() -> tuple[list[Assignment], list[Assignment]]:
    blinks = blink_assignments(FRAMES / FPS, state="nervous", fps=FPS,
                               start_frame=1, seed=8,
                               avoid_frames=list(range(290, 345)))
    eyes = [Assignment(frame=1, drawing="open")] + blinks
    eyes += [
        Assignment(frame=248, drawing="wide"),   # шаг к порталу
        Assignment(frame=292, drawing="wide"),
        Assignment(frame=352, drawing="open"),
        Assignment(frame=462, drawing="wide"),   # Дрик провалился
        Assignment(frame=520, drawing="open"),
        Assignment(frame=556, drawing="wide"),
        Assignment(frame=648, drawing="open"),
    ]
    mouth = [
        Assignment(frame=1, drawing="worry"),
        Assignment(frame=130, drawing="open"),
        Assignment(frame=200, drawing="worry"),
        Assignment(frame=292, drawing="yell"),
        Assignment(frame=340, drawing="open"),
        Assignment(frame=400, drawing="worry"),
        Assignment(frame=462, drawing="yell"),
        Assignment(frame=510, drawing="worry"),
        Assignment(frame=556, drawing="open"),
        Assignment(frame=660, drawing="smile"),  # финальная ухмылка
    ]
    return eyes, mouth


# ---------------------------------------------------------------------------
# Сборка
# ---------------------------------------------------------------------------

def render_shot(width: int = 1280, height: int = 720, every: int = 1,
                out_dir: Path = OUT_DIR,
                frames: range | None = None) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    r = Renderer(width, height, px_per_unit=int(118 * (width / 1280)),
                 supersample=2, bg=BG_COLOR)

    d_ch, v_ch, cam_ch = drick_channels(), vorty_channels(), camera_channels()
    p1_scale, p2_scale = portal1_open(), portal2_open()
    c1 = crystal_channels(292, 318, DRICK_X + 0.10, DRICK_X + 0.72, 3.55)
    c2 = crystal_channels(616, 645, PORTAL_X - 0.50, PORTAL_X - 1.15, 3.20,
                          spin=-480.0)

    portal1, portal2 = build_portal(seed=3, radius=PORTAL_R), \
        build_portal(seed=17, radius=PORTAL_R * 0.62)
    crystal = build_crystal()
    d_eyes, d_mouth, d_hair = drick_face()
    v_eyes, v_mouth = vorty_face()

    seq = frames if frames is not None else range(1, FRAMES + 1, every)
    paths = []
    for f in seq:
        drick = build_drick(eyes=drawing_at(d_eyes, f, "half"),
                            mouth=drawing_at(d_mouth, f, "flat"),
                            prop_near="gun",
                            hair=drawing_at(d_hair, f, "spiky"))
        vorty = build_vorty(eyes=drawing_at(v_eyes, f, "open"),
                            mouth=drawing_at(v_mouth, f, "worry"))

        pose_d = eval_pose(d_ch, f, defaults={
            "arm_far": {"rot": 12.0}, "arm_near": {"rot": -14.0},
            "leg_far": {"rot": 3.0}, "leg_near": {"rot": -3.0},
            "head": {"rot": -2.0},
        })
        pose_v = eval_pose(v_ch, f, defaults=VORTY_REST)

        p1 = portal_spin_pose(f, eval_keys(p1_scale, f), base_speed=4.5)
        p1["core"].update({"x": PORTAL_X, "y": PORTAL_Y})
        p2 = portal_spin_pose(f, eval_keys(p2_scale, f), base_speed=6.5)
        p2["core"].update({"x": P2_X, "y": P2_Y})

        pose_c1 = eval_pose(c1, f)
        pose_c2 = eval_pose(c2, f)

        cam = Camera(
            x=eval_keys(cam_ch["cam.x"], f) + 1.55,
            y=eval_keys(cam_ch["cam.y"], f)
              + eval_keys(cam_ch["cam.shake_y"], f) + 1.48,
            # Масштаб поднят с 0.68 до 0.94: ASCII-просмотр показал, что
            # персонажи занимали ~40% высоты кадра, а треть экрана была
            # пустым полом. В комедии поза — это всё; мелкий персонаж
            # не читается, и никакая анимация этого не спасёт.
            scale=eval_keys(cam_ch["cam.scale"], f) * 0.94,
        )

        # Порядок слоёв: портал 1 — ЗА персонажами (в него уходят),
        # портал 2 — ПОД ногами, но поверх пола, значит перед фоном
        # и за Дриком. Кристаллы — перед всеми (они летят на камеру).
        layers = [
            (portal1, p1), (portal2, p2),
            (drick, pose_d), (vorty, pose_v),
            (crystal, pose_c1), (crystal, pose_c2),
        ]
        img = r.render(layers=layers, cam=cam, draw_bg=draw_garage,
                       boil_seed=f // 2)
        p = out_dir / f"f{f:04d}.png"
        img.save(p)
        paths.append(p)
    return paths


def encode(out_dir: Path = OUT_DIR,
           mp4: Path = Path("/tmp/portal_shot.mp4")) -> Path:
    subprocess.run([
        "ffmpeg", "-y", "-framerate", str(FPS),
        "-i", str(out_dir / "f%04d.png"),
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
        str(mp4),
    ], check=True, capture_output=True)
    return mp4


def log_provenance(ledger_path: Path) -> None:
    lg = Ledger(ledger_path)
    lg.record("agent", "claude/scene_portal", "choreography", "portal_shot",
              (1, FRAMES), ["drick.*", "vorty.*", "portal1.*", "portal2.*",
                            "crystal1.*", "crystal2.*"],
              detail={"gag": "portal loop bonk", "fps": FPS,
                      "style_reference": "adult cartoon sci-fi (archetype)"})
    lg.record("tool", "renderer/boil", "line_boil", "portal_shot",
              (1, FRAMES), ["outlines"], seed=2,
              detail={"hold": 2, "amp_units": 0.012})
    lg.record("agent", "claude/camera", "curve_set", "portal_shot",
              (318, 656), ["cam.shake_y"], seed=318,
              detail={"reason": "impact shakes: bonk, floor, bonk-2"})
    lg.record("agent", "claude/character", "substitution_set", "portal_shot",
              (320, FRAMES), ["drick.hair"],
              detail={"reason": "permanent flattened hair after first bonk"})


if __name__ == "__main__":
    import sys
    every = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    paths = render_shot(every=every)
    print(f"{len(paths)} frames -> {OUT_DIR}")
    if every == 1:
        mp4 = encode()
        log_provenance(OUT_DIR / "provenance.jsonl")
        print(f"video: {mp4}")
