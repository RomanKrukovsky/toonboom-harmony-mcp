"""
scene_cookie.py — первый ролик: «Прыжок за печенькой». 10 секунд, 24 fps.

Раскадровка (кадры при 24fps):
   1- 36  Гоша стоит под полкой, смотрит вверх на банку. Моргает, дышит.
  36- 62  Тянется рукой — не достаёт. Стиснул зубы.
  62- 84  Опустил руку, думает («о!»).
  84-108  АНТИЦИПАЦИЯ: глубокий присед, руки назад, сквош.
 108-117  ПРЫЖОК: рывок вверх (ease_out — вылет быстрый, к апексу гаснет).
 117-126  Апекс: рука бьёт по краю полки (причина!), банка вздрагивает.
 126-138  ПАДЕНИЕ: heavy_impact (t² — ускоряется до самого пола), сквош.
 138-150  Сеттл после приземления (затухающие колебания).
 150-186  Гоша оглушён, качается. Банка на полке раскачивается всё сильней
          (последствие удара по полке) и на 168 сваливается с края.
 168-189  Банка падает heavy_impact — прямо ему на голову. БОНК.
 189-204  Сквош головы, тряска камеры (jitter!), печенья разлетаются
          баллистическими дугами.
 204-240  Финал: банка сидит на голове как шляпа, одно печенье у руки.
          Гоша берёт его. Улыбка. Занавес.

Задействовано: sample_profile (все изинги), blink_assignments (Пуассон),
breathe_hold (оглушённое качание), heavy_impact (оба падения, t²),
settle (приземление), jitter_curve (тряска камеры при бонке),
shot_plan (наезд камеры), boil на двойках (renderer), provenance (журнал).
"""

from __future__ import annotations

import _bootstrap  # noqa: F401  (ставит harmony/client в sys.path)

import math
import subprocess
from pathlib import Path

from asciiview import describe, frame_to_ascii
from camera import CameraMove, shot_plan
from character import build_gosha
from columns import Key, sample_profile
from craft import breathe_hold
from drawings import blink_assignments, Assignment
from imperfection import jitter_curve
from provenance import Ledger
from renderer import (
    Camera,
    Puppet,
    RPart,
    Renderer,
    Shape,
    contact_sheet,
    drawing_at,
    ellipse_points,
    eval_keys,
    eval_pose,
    rect_points,
)

FPS = 24
FRAMES = 240
OUT_DIR = Path("/tmp/cookie_shot")

# Геометрия сцены (мировые единицы, y вверх, пол y=0)
# Рост Гоши ~2.0; вытянутая вверх рука достаёт до ~2.6.
# Полка на 2.85: стоя не достать (2.6 < 2.85), в прыжке рука бьёт по краю.
SHELF_Y = 2.85         # верх полки
SHELF_X0, SHELF_X1 = 0.75, 2.4
JAR_X = 1.35           # банка стоит дальше от края — рукой не дотянуться
GOSHA_X = 0.0

COOKIE = (205, 148, 74)
JAR_GLASS = (150, 190, 215)
SHELF_WOOD = (160, 116, 80)
INK = (26, 22, 24)


# ---------------------------------------------------------------------------
# Пропы: банка с печеньем (отдельная марионетка — отдельный «пег»)
# ---------------------------------------------------------------------------

def build_jar() -> Puppet:
    body = Shape(rect_points(0.42, 0.5, 0.0, 0.25), fill=JAR_GLASS,
                 outline=INK, outline_units=0.04)
    lid = Shape(rect_points(0.46, 0.1, 0.0, 0.55), fill=(120, 82, 60),
                outline=INK, outline_units=0.04)
    cookies = [
        Shape(ellipse_points(0.09, 0.09, dx, 0.16 + dy), fill=COOKIE,
              outline=INK, outline_units=0.03)
        for dx, dy in ((-0.09, 0.0), (0.10, 0.03), (0.0, 0.16))
    ]
    jar = RPart("jar", None, (0.0, 0.0), [body] + cookies + [lid])
    return Puppet({"jar": jar}, ["jar"])


def build_cookie() -> Puppet:
    c = RPart("cookie", None, (0.0, 0.0), [
        Shape(ellipse_points(0.11, 0.11), fill=COOKIE, outline=INK,
              outline_units=0.035),
        Shape(ellipse_points(0.018, 0.018, -0.03, 0.03), fill=INK, outline=None),
        Shape(ellipse_points(0.018, 0.018, 0.04, -0.02), fill=INK, outline=None),
    ])
    return Puppet({"cookie": c}, ["cookie"])


def draw_room(d, proj, unit_px) -> None:
    """Фон: пол и полка на стене. Рисуется до персонажей."""
    w = max(2, int(0.05 * unit_px))
    # линия пола
    x0, y0 = proj((-3.5, 0.0))
    x1, _ = proj((4.5, 0.0))
    d.line([(x0, y0), (x1, y0)], fill=INK, width=w)
    # полка: доска + кронштейн
    p0 = proj((SHELF_X0, SHELF_Y))
    p1 = proj((SHELF_X1, SHELF_Y))
    th = 0.09 * unit_px
    d.rectangle([p0[0], p0[1], p1[0], p1[1] + th], fill=SHELF_WOOD,
                outline=INK, width=w)
    b0 = proj((SHELF_X0 + 0.25, SHELF_Y))
    b1 = proj((SHELF_X0 + 0.25, SHELF_Y - 0.4))
    d.line([b0, (b0[0], b1[1])], fill=INK, width=w)


# ---------------------------------------------------------------------------
# Хореография: каналы персонажа
# ---------------------------------------------------------------------------

def dense(profile: str, f0: int, f1: int, v0: float, v1: float,
          params: dict | None = None) -> list[Key]:
    """Плотные ключи по профилю: кадр за кадром. Вся семантика изинга — в
    значениях, рендереру достаточно линейной интерполяции."""
    n = f1 - f0 + 1
    if n < 2:
        return [Key(frame=f0, value=v1)]
    s = sample_profile(profile, n, params)  # type: ignore[arg-type]
    return [Key(frame=f0 + i, value=v0 + (v1 - v0) * s[i]) for i in range(n)]


def hold(f0: int, f1: int, v: float) -> list[Key]:
    return [Key(frame=f0, value=v), Key(frame=f1, value=v)]


def gosha_channels() -> dict[str, list[Key]]:
    ch: dict[str, list[Key]] = {}

    # --- корень (master): x, y ------------------------------------------------
    y = []
    y += hold(1, 84, 0.0)
    y += dense("ease_in", 84, 104, 0.0, -0.34)          # присед
    y += hold(104, 108, -0.34)                          # микрохолд перед рывком
    y += dense("ease_out", 108, 117, -0.34, 1.55)       # взлёт
    y += dense("linear", 117, 126, 1.55, 1.35)[1:]      # зависание у апекса
    y += dense("heavy_impact", 126, 137, 1.35, 0.0)[1:]  # падение: t², ускоряется
    y += dense("settle", 137, 150, 0.0, 0.0,
               {"settle_cycles": 2.0, "damping": 5.0})[1:]
    # приземлился он ЧУТЬ правее исходного места? нет — вертикальный прыжок
    y += hold(150, FRAMES, 0.0)
    ch["master.y"] = y

    x = hold(1, 108, GOSHA_X)
    x += dense("ease_out", 108, 126, GOSHA_X, GOSHA_X + 0.42)  # прыжок к полке
    x += dense("heavy_impact", 126, 137, GOSHA_X + 0.42, GOSHA_X + 0.30)[1:]
    x += hold(137, FRAMES, GOSHA_X + 0.30)
    ch["master.x"] = x

    # --- сквош-стретч туловища (sy на hips ведёт всё тело) --------------------
    sy = hold(1, 84, 1.0)
    sy += dense("ease_in", 84, 104, 1.0, 0.72)          # присед = сквош
    sy += hold(104, 108, 0.72)
    sy += dense("ease_out", 108, 114, 0.72, 1.18)       # стретч на вылете
    sy += dense("linear", 114, 126, 1.18, 1.05)[1:]
    sy += dense("linear", 126, 136, 1.05, 1.12)[1:]     # лёгкий стретч в падении
    sy += dense("linear", 136, 139, 1.12, 0.78)[1:]     # сквош удара
    sy += dense("settle", 139, 152, 0.78, 1.0,
                {"settle_cycles": 2.5, "damping": 4.0})[1:]
    sy += hold(152, FRAMES, 1.0)
    ch["hips.sy"] = sy
    # сохранение объёма: sx = 1/sqrt(sy) приблизим зеркальной кривой
    ch["hips.sx"] = [Key(frame=k.frame, value=1.0 + (1.0 - k.value) * 0.55)
                     for k in sy]

    # --- руки ------------------------------------------------------------------
    # Конвенция углов: капсула висит вниз при 0°, ПОЛОЖИТЕЛЬНЫЙ угол ведёт
    # руку вперёд (вправо, куда Гоша смотрит), отрицательный — назад.
    # Дефект, пойманный ASCII-проверкой: жесты были с минусом, и Гоша
    # тянулся к банке и печенью тыльной стороной, влево.
    arm_n = hold(1, 36, -10.0)
    arm_n += dense("ease_in_out", 36, 48, -10.0, 168.0)    # потянулся вверх-вперёд
    arm_n += dense("linear", 48, 56, 168.0, 175.0)[1:]     # изо всех сил
    arm_n += dense("ease_in_out", 56, 70, 175.0, -20.0)[1:]  # опустил через перед
    arm_n += hold(70, 84, -20.0)
    arm_n += dense("ease_in", 84, 104, -20.0, -55.0)       # замах НАЗАД (за спину)
    arm_n += hold(104, 108, -55.0)
    arm_n += dense("ease_out", 108, 117, -55.0, 172.0)     # выброс вверх-вперёд
    arm_n += dense("linear", 117, 126, 172.0, 150.0)[1:]
    arm_n += dense("heavy_impact", 126, 139, 150.0, 30.0)[1:]  # мельница вниз
    arm_n += dense("settle", 139, 152, 30.0, -12.0)[1:]
    arm_n += hold(152, 196, -12.0)
    # Финал: раскрытая ладонь вперёд-вверх — и печенье прилетает В НЕЁ само.
    # (Стоя, поворотом руки до пола не достать — IK у рига нет, и это
    # честное ограничение; гэг «само упало в руку» и смешнее, и правдивее.)
    arm_n += dense("ease_in_out", 196, 210, -12.0, 140.0)
    arm_n += hold(210, FRAMES, 140.0)
    ch["arm_near.rot"] = arm_n

    # дальняя рука: тот же жест с отставанием на 2 кадра и амплитудой 0.7
    # (overlap: дальняя конечность узнаёт о движении позже и машет слабее,
    # т.к. не она ведёт действие)
    arm_f = [Key(frame=min(k.frame + 2, FRAMES),
                 value=12.0 + (k.value - (-10.0)) * 0.7)
             for k in arm_n if k.frame + 2 <= FRAMES]
    ch["arm_far.rot"] = arm_f

    # --- ноги: присед и подгиб в полёте ---------------------------------------
    legs = hold(1, 84, 0.0)
    legs += dense("ease_in", 84, 104, 0.0, 55.0)        # согнул колени (присед)
    legs += hold(104, 108, 55.0)
    legs += dense("ease_out", 108, 117, 55.0, -18.0)    # выпрямил в прыжке
    legs += dense("linear", 117, 126, -18.0, 25.0)[1:]  # подобрал в полёте
    legs += dense("heavy_impact", 126, 139, 25.0, 48.0)[1:]  # согнул на ударе
    legs += dense("settle", 139, 154, 48.0, 2.0)[1:]
    legs += hold(154, FRAMES, 2.0)
    ch["leg_near.rot"] = legs
    ch["leg_far.rot"] = [Key(frame=k.frame, value=-k.value * 0.85) for k in legs]

    # --- голова ---------------------------------------------------------------
    head = hold(1, 30, 14.0)                            # смотрит вверх на банку
    head += dense("ease_in_out", 30, 40, 14.0, 20.0)
    head += hold(40, 84, 20.0)
    head += dense("ease_in", 84, 104, 20.0, -12.0)      # взгляд вниз в приседе
    head += dense("ease_out", 108, 120, -12.0, 18.0)    # вверх в полёте
    head += dense("heavy_impact", 126, 139, 18.0, -8.0)[1:]
    head += dense("settle", 139, 152, -8.0, 0.0)[1:]
    # оглушён: качание головой (breathe с большой амплитудой)
    daze = breathe_hold(152, 189, 0.0, amplitude=6.0, period_frames=16.0, seed=3)
    head += daze
    head += dense("linear", 189, 192, daze[-1].value, -14.0)[1:]   # бонк вниз
    head += dense("settle", 192, 210, -14.0, 4.0)[1:]
    head += hold(210, FRAMES, 4.0)
    ch["head.rot"] = head

    # микродрейф на холде ожидания (кадры 1-36): лечение мёртвого холда
    drift = breathe_hold(1, 36, 0.0, amplitude=0.008, period_frames=30.0, seed=7)
    ch["torso.y"] = drift + hold(37, FRAMES, 0.0)

    return ch


def jar_channels() -> dict[str, list[Key]]:
    """Банка: стоит, вздрагивает от удара по полке, раскачивается, падает."""
    ch: dict[str, list[Key]] = {}
    jar_home_y = SHELF_Y + 0.04

    # рывок при ударе руки о полку (кадр ~120) + нарастающее качание
    rot = hold(1, 119, 0.0)
    rot += dense("linear", 119, 122, 0.0, 6.0)
    # раскачивание с НАРАСТАНИЕМ (неустойчивость): свой генератор
    for f in range(122, 168):
        t = (f - 122) / 46.0
        rot.append(Key(frame=f, value=(6.0 + 10.0 * t)
                       * math.sin(2 * math.pi * (f - 122) / 17.0 + 0.5)))
    rot += dense("linear", 168, 189, rot[-1].value, 28.0)[1:]   # падает вращаясь
    rot += dense("settle", 189, 206, 28.0, 0.0)[1:]             # устаканилась
    rot += hold(206, FRAMES, 0.0)
    ch["jar.rot"] = rot

    # сползание к краю пока качается
    x = hold(1, 121, JAR_X)
    x += dense("linear", 122, 168, JAR_X, SHELF_X0 + 0.10)
    # падение: по x чуть влево к Гоше (он в GOSHA_X+0.30, голова ~2.0)
    x += dense("ease_in", 168, 189, SHELF_X0 + 0.10, GOSHA_X + 0.34)[1:]
    x += hold(189, FRAMES, GOSHA_X + 0.34)
    ch["jar.x"] = x

    y = hold(1, 167, jar_home_y)
    head_top = 1.92        # куда падает: на голову
    y += dense("heavy_impact", 168, 189, jar_home_y, head_top)
    # бонк: маленький подскок и села как шляпа
    y += dense("linear", 189, 192, head_top, head_top + 0.12)[1:]
    y += dense("heavy_impact", 192, 197, head_top + 0.12, head_top - 0.06)[1:]
    y += hold(197, FRAMES, head_top - 0.06)
    ch["jar.y"] = y
    return ch


def cookie_channels() -> dict[str, list[Key]]:
    """Одно печенье вылетает из банки при бонке, описывает баллистическую
    дугу (вверх ease_out — замедляется, вниз heavy_impact — ускоряется:
    честная парабола из двух профилей) и падает Гоше В ЛАДОНЬ.

    Ладонь к кадру 212: рука 140° вперёд-вверх, кисть ~(0.83, 1.55)."""
    hand_x, hand_y = GOSHA_X + 0.83, 1.55
    ch: dict[str, list[Key]] = {}
    ch["cookie.x"] = (hold(1, 188, -10.0)
                      + dense("ease_out", 189, 214, GOSHA_X + 0.34, hand_x)
                      + hold(214, FRAMES, hand_x))
    up = dense("ease_out", 189, 201, 1.95, 2.65)     # вылет вверх (гаснет)
    down = dense("heavy_impact", 201, 214, 2.65, hand_y + 0.07)[1:]  # в ладонь
    ch["cookie.y"] = hold(1, 188, -10.0) + up + down + hold(214, FRAMES,
                                                            hand_y + 0.07)
    ch["cookie.rot"] = (hold(1, 188, 0.0)
                        + dense("ease_out", 189, 214, 0.0, 480.0)
                        + hold(214, FRAMES, 480.0))
    return ch


# ---------------------------------------------------------------------------
# Камера
# ---------------------------------------------------------------------------

def camera_channels() -> dict[str, list[Key]]:
    plan = shot_plan([
        CameraMove("hold", 83),
        CameraMove("pull_out", 25, amount=1.18, profile="ease_in_out"),  # видно полку
        CameraMove("hold", 60),
        CameraMove("push_in", 40, amount=1.25, profile="ease_in_out"),   # на бонк
        CameraMove("hold", 31),
    ], start_frame=1)
    ch = {"cam.x": plan.x_keys, "cam.y": plan.y_keys,
          "cam.scale": plan.scale_keys}

    # тряска камеры на бонке (189-200): jitter_curve поверх плотных ключей
    shake_zone = [Key(frame=f, value=0.0) for f in range(189, 201)]
    shaken = jitter_curve(shake_zone, amplitude=0.045, seed=11,
                          protect_extremes=False, wavelength_frames=2.0)
    ch["cam.shake_y"] = ([Key(frame=1, value=0.0), Key(frame=188, value=0.0)]
                         + shaken + [Key(frame=201, value=0.0),
                                     Key(frame=FRAMES, value=0.0)])
    return ch


# ---------------------------------------------------------------------------
# Рисунки по кадрам: глаза и рты (substitution)
# ---------------------------------------------------------------------------

def face_tracks() -> tuple[list[Assignment], list[Assignment]]:
    # моргания Пуассоном на «спокойных» отрезках; в прыжке/бонке не моргаем
    blinks = blink_assignments(FRAMES / FPS, state="calm", fps=FPS,
                               start_frame=1, seed=5,
                               avoid_frames=list(range(84, 150))
                               + list(range(165, 205)))
    eyes = [Assignment(frame=1, drawing="open")] + blinks
    # оглушение: глаза полузакрыты
    eyes.append(Assignment(frame=152, drawing="half"))
    eyes.append(Assignment(frame=170, drawing="open"))
    # бонк: зажмурился
    eyes.append(Assignment(frame=189, drawing="closed"))
    eyes.append(Assignment(frame=200, drawing="half"))
    eyes.append(Assignment(frame=208, drawing="open"))

    mouth = [
        Assignment(frame=1, drawing="smile"),
        Assignment(frame=36, drawing="grit"),      # тянется с усилием
        Assignment(frame=62, drawing="smile"),
        Assignment(frame=76, drawing="oh"),        # идея!
        Assignment(frame=84, drawing="grit"),      # присед-усилие
        Assignment(frame=108, drawing="open"),     # крик в прыжке
        Assignment(frame=139, drawing="grit"),     # удар
        Assignment(frame=152, drawing="oh"),       # оглушён
        Assignment(frame=189, drawing="open"),     # БОНК
        Assignment(frame=204, drawing="oh"),
        Assignment(frame=216, drawing="smile"),    # печенье добыто
    ]
    return eyes, mouth


# ---------------------------------------------------------------------------
# Сборка
# ---------------------------------------------------------------------------

def render_shot(width: int = 1280, height: int = 720,
                every: int = 1, out_dir: Path = OUT_DIR) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    r = Renderer(width, height, px_per_unit=int(130 * (width / 1280)),
                 supersample=2)

    g_ch = gosha_channels()
    j_ch = jar_channels()
    c_ch = cookie_channels()
    cam_ch = camera_channels()
    eyes_track, mouth_track = face_tracks()

    jar, cookie = build_jar(), build_cookie()
    paths = []
    for f in range(1, FRAMES + 1, every):
        gosha = build_gosha(eyes=drawing_at(eyes_track, f, "open"),
                            mouth=drawing_at(mouth_track, f, "smile"))
        pose_g = eval_pose(g_ch, f, defaults={
            "arm_far": {"rot": 12.0}, "arm_near": {"rot": -10.0},
            "leg_far": {"rot": 3.0}, "leg_near": {"rot": -2.0},
        })
        pose_j = eval_pose(j_ch, f)
        pose_c = eval_pose(c_ch, f)
        cam = Camera(
            x=eval_keys(cam_ch["cam.x"], f) + 0.55,
            y=eval_keys(cam_ch["cam.y"], f)
              + eval_keys(cam_ch["cam.shake_y"], f) + 1.45,
            scale=eval_keys(cam_ch["cam.scale"], f) * 0.78,
        )
        img = r.render(layers=[(jar, pose_j), (gosha, pose_g), (cookie, pose_c)],
                       cam=cam, draw_bg=draw_room, boil_seed=f // 2)
        p = out_dir / f"f{f:04d}.png"
        img.save(p)
        paths.append(p)
    return paths


def encode(out_dir: Path = OUT_DIR,
           mp4: Path = Path("/tmp/cookie_shot.mp4")) -> Path:
    subprocess.run([
        "ffmpeg", "-y", "-framerate", str(FPS),
        "-i", str(out_dir / "f%04d.png"),
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
        str(mp4),
    ], check=True, capture_output=True)
    return mp4


def log_provenance(ledger_path: Path) -> None:
    lg = Ledger(ledger_path)
    lg.record("agent", "claude/scene_cookie", "choreography", "cookie_shot",
              (1, FRAMES), ["gosha.*", "jar.*", "cookie.*"],
              detail={"gag": "cookie jar jump", "fps": FPS})
    lg.record("tool", "renderer/boil", "line_boil", "cookie_shot",
              (1, FRAMES), ["outlines"], seed=2,
              detail={"hold": 2, "amp_units": 0.012})
    lg.record("agent", "claude/camera", "curve_set", "cookie_shot",
              (189, 200), ["cam.shake_y"], seed=11,
              detail={"reason": "impact shake on bonk"})


if __name__ == "__main__":
    import sys
    every = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    paths = render_shot(every=every)
    print(f"{len(paths)} frames -> {OUT_DIR}")
    if every == 1:
        mp4 = encode()
        log_provenance(OUT_DIR / "provenance.jsonl")
        print(f"video: {mp4}")
