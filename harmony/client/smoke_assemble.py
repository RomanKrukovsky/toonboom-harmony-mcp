"""
smoke_assemble.py — на выходе ОДИН мастер: видео, звук, верный порядок.

Проверяется числами по готовому файлу, а не наличием кода сборки:
  - в мастере оба потока;
  - длительность равна сумме шотов ±0.1 с;
  - порядок шотов — по раскадровке, а не по алфавиту имён файлов.

Последнее важнее, чем кажется: сортировка по имени ставит sc10 перед sc2, и
серия выходит в неверном порядке. Такую ошибку замечает только человек на
просмотре, поэтому проверка сделана числом — каждый шот красится в свой цвет,
и порядок читается из кадров мастера.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

OUT = Path("/tmp/assemble_test")
FRAMES = 6
FPS = 24
# 12 шотов: с десятью и больше вылезает ошибка алфавитной сортировки
SHOT_COLOURS = [(0.9, 0.1, 0.1), (0.1, 0.9, 0.1), (0.1, 0.1, 0.9),
                (0.9, 0.9, 0.1), (0.9, 0.1, 0.9), (0.1, 0.9, 0.9),
                (0.6, 0.3, 0.1), (0.3, 0.6, 0.1), (0.1, 0.3, 0.6),
                (0.6, 0.1, 0.3), (0.5, 0.5, 0.5), (0.2, 0.2, 0.2)]


def srgb(c: float) -> int:
    v = 1.055 * (c ** (1 / 2.4)) - 0.055 if c > 0.0031308 else 12.92 * c
    return max(0, min(255, round(255 * v)))


def main() -> int:
    if shutil.which("ffmpeg") is None or shutil.which("ffprobe") is None:
        print("SKIP: ffmpeg/ffprobe not on PATH")
        return 0
    from blender_host import blender_available
    ok, msg = blender_available()
    print(f"blender: {msg}")
    if not ok:
        print("SKIP: no Blender")
        return 0

    if OUT.exists():
        subprocess.run(["rm", "-rf", str(OUT)], check=False)

    from artwork import ArtPart, ArtSet
    from episode import Episode, ShotSpec, assemble, run_episode
    from test_artwork import make_png

    # У каждого шота свой цветной набор — так порядок в мастере читается числом.
    shots = []
    for i, col in enumerate(SHOT_COLOURS, 1):
        d = OUT / "parts" / f"s{i:03d}"
        d.mkdir(parents=True, exist_ok=True)
        from PIL import Image, ImageDraw
        im = Image.new("RGBA", (100, 100), (0, 0, 0, 0))
        ImageDraw.Draw(im).rectangle([5, 5, 95, 95],
                                     fill=tuple(srgb(c) for c in col) + (255,))
        im.save(d / "block.png")
        pj = d / "parts.json"
        pj.write_text(json.dumps({"name": f"s{i}", "parts": [
            {"name": "block", "image": "block.png", "parent": None,
             "pivot": [0.5, 0.5], "attach": [0, 0], "depth": 0.0,
             "scale": 4.0}]}), encoding="utf-8")
        shots.append(ShotSpec(name=f"sc{i:03d}", parts_json=str(pj),
                              frames=FRAMES, fps=FPS, resolution=(160, 120),
                              camera_ortho_scale=1.0, camera_loc=(0.0, 0.0)))

    ep = Episode("order", shots, OUT)
    rep = run_episode(ep, workers=6)
    print(f"  rendered {rep['shots_ok']}/{rep['shots_total']} shots")
    if rep["shots_failed"]:
        print(f"FAIL: {rep['failed']}")
        return 1

    asm = assemble(ep)
    print(f"  master: {asm['duration']}s expected {asm['expected']}s "
          f"(drift {asm['drift']:+.3f}s), streams {asm['streams']}, "
          f"segments {asm['segments']}")

    if "video" not in asm["streams"] or "audio" not in asm["streams"]:
        print(f"FAIL: master is missing a stream: {asm['streams']}")
        return 1
    if not asm["in_tolerance"]:
        print(f"FAIL: duration drift {asm['drift']}s beyond tolerance")
        return 1
    if asm["missing_shots"]:
        print(f"FAIL: shots missing from the master: {asm['missing_shots']}")
        return 1

    # Порядок: вытащить по кадру из середины каждого шота и сверить цвет.
    probe = OUT / "probe"
    probe.mkdir(exist_ok=True)
    wrong = []
    for i, col in enumerate(SHOT_COLOURS):
        t = (i * FRAMES + FRAMES / 2) / FPS
        f = probe / f"p{i:03d}.png"
        subprocess.run(["ffmpeg", "-y", "-ss", f"{t:.4f}", "-i", asm["master"],
                        "-frames:v", "1", str(f)], capture_output=True)
        if not f.exists():
            wrong.append((i + 1, "no frame"))
            continue
        from PIL import Image
        px = Image.open(f).convert("RGB").getpixel((80, 60))
        want = tuple(srgb(c) for c in col)
        if max(abs(a - b) for a, b in zip(px, want)) > 18:
            wrong.append((i + 1, f"got {px}, want {want}"))

    if wrong:
        print(f"FAIL: master order is wrong at shot(s): {wrong[:4]}")
        print("       (alphabetical sorting puts sc10 before sc2 — the order must "
              "come from the episode list, not from filenames)")
        return 1

    # Кадры сегмента против кадров шота. Раунд 14: `-shortest` съедал последний
    # кадр КАЖДОГО шота, и проверка по длительности этого не видела — длину
    # задаёт звук. Считать надо кадры.
    from episode import _count_frames, SEGMENT
    lost = []
    for sh in ep.shots:
        seg = ep.out_dir / sh.name / SEGMENT
        got = _count_frames(seg)
        if got != sh.frames:
            lost.append(f"{sh.name}: {got}/{sh.frames}")
    print(f"  frames per segment: {'все на месте' if not lost else 'ПОТЕРЯНЫ ' + ', '.join(lost)}")
    assert not lost, f"сегменты потеряли кадры: {lost}"
    assert asm["short_segments"] == [], asm["short_segments"]

    print(f"PASS: single master, both streams, drift {asm['drift']:+.3f}s, "
          f"all {len(SHOT_COLOURS)} shots in storyboard order")
    return 0


if __name__ == "__main__":
    sys.exit(main())
