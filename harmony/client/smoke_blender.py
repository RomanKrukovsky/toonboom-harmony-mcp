"""
smoke_blender.py — доказательство, что Blender-хост реально работает.

Не тест логики (она в test_*.py), а проба контакта с настоящим
приложением: собрать сцену, повращать часть, отрендерить кадры,
проверить ЧИСЛАМИ, что пиксели изменились там, где ожидалось.

Ровно то, чего не удалось сделать с Harmony: пройти от кода до
отрендеренного кадра в живом хосте.
"""

from __future__ import annotations

import sys
from pathlib import Path

from blender_host import (
    BChannel,
    BPart,
    BSceneSpec,
    blender_available,
    build_scene,
)

OUT = Path("/tmp/blender_smoke")


def spec_two_parts() -> BSceneSpec:
    """Две части: «торс» (неподвижен) и «рука» — ребёнок, вращается.
    Если родительство и повороты работают, рука опишет дугу вокруг пивота."""
    torso = BPart(
        name="torso", parent=None, pivot=(0.0, 0.0),
        points=[(-0.35, -0.9), (0.35, -0.9), (0.35, 0.9), (-0.35, 0.9)],
        color=(0.28, 0.45, 0.72), depth=0.2)
    arm = BPart(
        name="arm", parent="torso", pivot=(0.30, 0.70),
        points=[(-0.09, 0.0), (0.09, 0.0), (0.09, -1.15), (-0.09, -1.15)],
        color=(0.92, 0.72, 0.35), depth=-0.2)
    # рука: 0° -> -95° за 24 кадра (вниз -> в сторону)
    ch = BChannel(part="arm", prop="rot",
                  keys=[(1.0, 0.0), (24.0, -95.0)], interp="LINEAR")
    return BSceneSpec(
        name="smoke", fps=24, frame_start=1, frame_end=24,
        resolution=(480, 360), parts=[torso, arm], channels=[ch],
        camera_ortho_scale=5.0, camera_loc=(0.0, 0.0))


def linear_to_srgb(c: float) -> int:
    """Blender принимает ЛИНЕЙНЫЕ цвета, а в PNG пишет sRGB.

    Дефект в самом тесте, стоивший трёх ложных «рука не видна»: я искал
    в пикселях (235,184,89) — линейные 0.92,0.72,0.35 умноженные на 255,
    — а в файле лежало (246,221,160), то есть те же цвета после гаммы.
    Проверка цвета обязана переводить пространство, иначе она врёт про
    рендер, который на самом деле работает.
    """
    v = 1.055 * (c ** (1 / 2.4)) - 0.055 if c > 0.0031308 else 12.92 * c
    return max(0, min(255, round(255 * v)))


def centroid(path: Path, linear_rgb=(0.92, 0.72, 0.35), tol=14):
    """Центр масс пикселей заданного цвета. Числа — надёжный канал."""
    from PIL import Image
    im = Image.open(path).convert("RGB")
    w, h = im.size
    px = im.load()
    tr, tg, tb = (linear_to_srgb(c) for c in linear_rgb)
    n = sx = sy = 0
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            r, g, b = px[x, y]
            if abs(r - tr) <= tol and abs(g - tg) <= tol and abs(b - tb) <= tol:
                n += 1
                sx += x
                sy += y
    return (n, sx / n if n else None, sy / n if n else None)


def main() -> int:
    ok, msg = blender_available()
    print(f"blender: {msg}")
    if not ok:
        print("FAIL: Blender unavailable")
        return 1

    rep = build_scene(spec_two_parts(), OUT, render=True, frames=(1, 24))
    print(f"returncode={rep['returncode']} frames={rep['frames_rendered']}")
    if rep["returncode"] != 0 or rep["frames_rendered"] == 0:
        print("FAIL: build/render failed")
        print(rep["log_tail"][-900:])
        print(rep["stderr_tail"])
        return 1

    f1, f24 = OUT / "f0001.png", OUT / "f0024.png"
    if not (f1.exists() and f24.exists()):
        print(f"FAIL: expected frames missing; got "
              f"{sorted(p.name for p in OUT.glob('f*.png'))[:5]}")
        return 1

    n1, x1, y1 = centroid(f1)
    n2, x2, y2 = centroid(f24)
    print(f"arm pixels f1={n1} at ({x1},{y1})")
    print(f"arm pixels f24={n2} at ({x2},{y2})")

    if not n1 or not n2:
        print("FAIL: arm not visible in one of the frames")
        return 1
    # Рука повернулась из «вниз» в «в сторону»: центр обязан уехать
    # по X значительно и подняться по Y (в пикселях Y растёт вниз).
    if abs(x2 - x1) < 20:
        print(f"FAIL: arm did not swing (dx={x2 - x1:.1f})")
        return 1
    if y2 >= y1:
        print(f"FAIL: arm did not rise (y {y1:.1f} -> {y2:.1f})")
        return 1

    print(f"PASS: arm swung dx={x2 - x1:+.1f} dy={y2 - y1:+.1f} "
          f"— parenting, pivots, rotation and render all work")
    return 0


if __name__ == "__main__":
    sys.exit(main())
