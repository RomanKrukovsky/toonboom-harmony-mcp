"""
smoke_engine_to_blender.py — движок ремесла управляет настоящим Blender.

Это доказательство более сильное, чем smoke_blender.py: там я двигал
руку вручную заданными ключами, здесь тайминг приходит из
`columns.sample_profile` — того самого кода, что писался для Harmony.

Проверяется числами по РЕНДЕРУ (не по спеке): падение с профилем
heavy_impact обязано УСКОРЯТЬСЯ. Именно эта ошибка была поймана
однажды в самом движке (тело всплывало как шарик), и теперь проверка
идёт до конца — через живой хост, до пикселей.
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
    channels_from_engine,
)
from columns import Key, sample_profile
from smoke_blender import centroid

OUT = Path("/tmp/blender_engine")
FALL_FRAMES = 24
BALL_COLOR = (0.90, 0.30, 0.25)


def falling_ball_spec() -> BSceneSpec:
    """Мяч падает с 2.0 до 0.0 по heavy_impact (t², ускоряется до удара)."""
    import math
    pts = [(0.22 * math.cos(2 * math.pi * i / 20),
            0.22 * math.sin(2 * math.pi * i / 20)) for i in range(20)]
    ball = BPart("ball", None, (0.0, 0.0), pts, BALL_COLOR, depth=0.0)
    floor = BPart("floor", None, (0.0, -0.35),
                  [(-2.4, -0.10), (2.4, -0.10), (2.4, 0.10), (-2.4, 0.10)],
                  (0.30, 0.32, 0.36), depth=0.5)

    s = sample_profile("heavy_impact", FALL_FRAMES)
    keys = [Key(frame=i + 1, value=2.0 + (0.0 - 2.0) * v)
            for i, v in enumerate(s)]
    channels = channels_from_engine({"ball.y": keys})

    return BSceneSpec(
        name="engine_fall", fps=24, frame_start=1, frame_end=FALL_FRAMES,
        resolution=(400, 400), parts=[floor, ball], channels=channels,
        camera_ortho_scale=5.0, camera_loc=(0.0, 0.8))


def main() -> int:
    ok, msg = blender_available()
    print(f"blender: {msg}")
    if not ok:
        return 1

    rep = build_scene(falling_ball_spec(), OUT, render=True,
                      frames=(1, FALL_FRAMES))
    print(f"returncode={rep['returncode']} frames={rep['frames_rendered']}")
    if rep["returncode"] != 0 or rep["frames_rendered"] < FALL_FRAMES:
        print(rep["log_tail"][-800:])
        print(rep["stderr_tail"])
        return 1

    ys = []
    for f in (1, 8, 16, 24):
        n, cx, cy = centroid(OUT / f"f{f:04d}.png", linear_rgb=BALL_COLOR)
        if not n:
            print(f"FAIL: ball not visible on frame {f}")
            return 1
        ys.append((f, cy))
        print(f"  f{f:02d}: ball centre y={cy:.1f}px ({n} px)")

    # Экран: y растёт ВНИЗ, значит падение = рост y.
    (_, y1), (_, y8), (_, y16), (_, y24) = ys
    if not (y1 < y8 < y16 < y24):
        print(f"FAIL: ball did not fall monotonically: {[round(y,1) for _,y in ys]}")
        return 1

    first = y8 - y1          # первая треть падения
    last = y24 - y16         # последняя треть
    print(f"  first third: {first:.1f}px   last third: {last:.1f}px")
    if last <= first * 1.5:
        print("FAIL: fall is not accelerating — heavy_impact profile lost "
              "somewhere between engine and render")
        return 1

    print(f"PASS: craft engine drove real Blender; fall accelerates "
          f"{last / first:.1f}x — t² survived the whole path "
          f"engine -> spec -> JSON -> bpy -> pixels")
    return 0


if __name__ == "__main__":
    sys.exit(main())
