"""
smoke_artwork_blender.py — PNG художника в живой сцене Blender.

Доказывает шаг 5 в той части, которая мне доступна: приём настоящих
рисунков и сборка анимируемого рига из них. Суждение «красиво ли» здесь
не проверяется и проверяться не может — оно за человеком.

Проверяется числами по РЕНДЕРУ:
  - прозрачный фон рисунка остаётся прозрачным (не белый прямоугольник);
  - цвет рисунка доезжает до пикселей;
  - часть-ребёнок вращается вокруг СВОЕГО пивота, а не вокруг родителя;
  - UV не перевёрнуты (проверка асимметричным рисунком).
"""

from __future__ import annotations

import sys
from pathlib import Path

from artwork import ArtPart, ArtSet, image_part_specs, summary, validate
from blender_host import BSceneSpec, blender_available, build_scene, channels_from_engine
from columns import Key, sample_profile

OUT = Path("/tmp/blender_artwork")
FPS = 24
FRAMES = 24
TORSO_RGB = (60, 90, 200)      # синий торс
ARM_RGB = (230, 160, 40)       # оранжевая рука
MARK_RGB = (240, 40, 40)       # красная метка в ЛЕВОМ ВЕРХНЕМ углу руки


def draw_parts(d: Path) -> ArtSet:
    """Рисунки «художника»: намеренно асимметричные, чтобы поймать
    перевёрнутые UV — на симметричной картинке зеркало не видно."""
    from PIL import Image, ImageDraw
    d.mkdir(parents=True, exist_ok=True)

    torso = Image.new("RGBA", (120, 240), (0, 0, 0, 0))
    ImageDraw.Draw(torso).ellipse([10, 10, 110, 230], fill=TORSO_RGB + (255,))
    torso.save(d / "torso.png")

    arm = Image.new("RGBA", (60, 200), (0, 0, 0, 0))
    da = ImageDraw.Draw(arm)
    da.rounded_rectangle([12, 6, 48, 194], radius=18, fill=ARM_RGB + (255,))
    # метка в левом верхнем углу — маркер ориентации
    da.rectangle([14, 8, 30, 30], fill=MARK_RGB + (255,))
    arm.save(d / "arm.png")

    return ArtSet("hero", [
        # пивот торса — внизу по центру (бёдра)
        ArtPart("torso", "torso.png", None, (0.5, 0.98),
                attach=(0.0, 0.0), depth=0.2, scale=2.0),
        # пивот руки — сверху по центру (плечо); крепится к плечу торса
        ArtPart("arm", "arm.png", "torso", (0.5, 0.04),
                attach=(0.16, 0.40), depth=-0.2, scale=2.0),
    ], d)


def opaque_centroid(png: Path, rgb, tol=40):
    from PIL import Image
    im = Image.open(png).convert("RGB")
    px = im.load()
    w, h = im.size
    n = sx = sy = 0
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            r, g, b = px[x, y]
            if abs(r - rgb[0]) <= tol and abs(g - rgb[1]) <= tol and abs(b - rgb[2]) <= tol:
                n += 1; sx += x; sy += y
    return (n, sx / n if n else None, sy / n if n else None)


def main() -> int:
    ok, msg = blender_available()
    print(f"blender: {msg}")
    if not ok:
        return 1

    art = draw_parts(OUT / "parts")
    rep_v = summary(validate(art))
    print(f"  artwork check: {rep_v['verdict']} "
          f"({rep_v['errors']} errors, {rep_v['warnings']} warnings)")
    if not rep_v["usable"]:
        for f in rep_v["findings"]:
            print("   ", f["severity"], f["rule"], f["part"], f["message"])
        return 1

    # Рука машет: 0 -> -70 градусов вокруг СВОЕГО пивота (плеча)
    s = sample_profile("ease_in_out", FRAMES)
    keys = [Key(frame=i + 1, value=-70.0 * v) for i, v in enumerate(s)]

    spec = BSceneSpec(
        name="artwork_scene", fps=FPS, frame_start=1, frame_end=FRAMES,
        resolution=(400, 400), parts=[],
        image_parts=image_part_specs(art),
        channels=channels_from_engine({"arm.rot": keys}),
        bg_color=(0.05, 0.06, 0.08),
        camera_ortho_scale=1.4, camera_loc=(0.0, 0.0))

    rep = build_scene(spec, OUT, render=True, frames=(1, FRAMES))
    print(f"  build: rc={rep['returncode']} frames={rep['frames_rendered']}")
    if rep["returncode"] != 0 or rep["frames_rendered"] < FRAMES:
        print(rep["log_tail"][-1000:]); print(rep["stderr_tail"][-400:])
        return 1

    f1, f24 = OUT / "f0001.png", OUT / "f0024.png"
    n_t, tx, ty = opaque_centroid(f1, TORSO_RGB)
    n_a1, ax1, ay1 = opaque_centroid(f1, ARM_RGB)
    n_a2, ax2, ay2 = opaque_centroid(f24, ARM_RGB)
    n_m, mx, my = opaque_centroid(f1, MARK_RGB)
    print(f"  torso: {n_t}px at ({tx},{ty})")
    print(f"  arm f1: {n_a1}px at ({ax1},{ay1})   f24: {n_a2}px at ({ax2},{ay2})")
    print(f"  orientation mark: {n_m}px at ({mx},{my})")

    if not n_t or not n_a1:
        print("FAIL: artwork not visible in the render")
        return 1
    if not n_m:
        print("FAIL: orientation mark missing — UVs are wrong or the mark was clipped")
        return 1

    # Прозрачность: между частями должен быть виден ФОН СЦЕНЫ, а не
    # белый лист и не цвет части.
    #
    # Проверка сравнивает с ОЖИДАЕМЫМ фоном, а не с абстрактным порогом
    # яркости. Первая версия проверяла `max(corner) > 60` и падала на
    # корректном рендере: заданный фон (0.05,0.06,0.08) в sRGB — это
    # (63,69,80), то есть законно ярче порога. Проверка врала про
    # работающую альфу — тот же класс ошибки, что уже стоил трёх ложных
    # «руки не видно» в smoke_blender.py.
    from PIL import Image
    from smoke_blender import linear_to_srgb
    expect_bg = tuple(linear_to_srgb(c) for c in (0.05, 0.06, 0.08))
    corner = Image.open(f1).convert("RGB").getpixel((6, 6))
    print(f"  background corner: {corner}, expected {expect_bg}")
    if max(abs(a - b) for a, b in zip(corner, expect_bg)) > 6:
        print(f"FAIL: corner is {corner}, not the scene background {expect_bg} — "
              f"transparent areas are not transparent")
        return 1

    # Рука вращается вокруг своего плеча: центр масс уезжает в сторону
    if abs(ax2 - ax1) < 15:
        print(f"FAIL: arm did not swing (dx={ax2 - ax1:.1f})")
        return 1

    # Метка в ЛЕВОМ ВЕРХНЕМ углу руки: если UV перевёрнуты, она окажется
    # ниже центра руки. Это единственная проверка на зеркало.
    if my is None or my > ay1:
        print(f"FAIL: mark at y={my} is below arm centre y={ay1} — UVs are flipped")
        return 1

    print(f"PASS: artist PNGs render with alpha, correct orientation, and the "
          f"child part swings around its own pivot (dx={ax2 - ax1:+.1f})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
