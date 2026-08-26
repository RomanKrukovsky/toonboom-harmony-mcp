"""Демо генератора: HEAD_TURN модуль на синтетических видах.

Собирает стандартный скелет + свитч головы с двумя видами (красный/синий
квадраты — тестовые фикстуры) + диал Head Switch с картой Girl (9 поз).
Цель — живая проверка в Moho: поворот диала переключает вид.
Запускать питоном с Pillow (psdvenv):
  <venv>/bin/python pipeline/examples/build_dial_demo.py
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO))

from pipeline.moho.emit import emit  # noqa: E402
from pipeline.riggen.build import build_rig  # noqa: E402
from pipeline.tools.qa_check import qa_rig  # noqa: E402

OUT = REPO / "output/riggen"


def make_png(path: Path, rgb: tuple[int, int, int], size: int = 160) -> None:
    Image.new("RGB", (size, size), rgb).save(path)


JOINTS = {
    "hip": (200, 330), "crotch": (200, 390), "chest": (200, 250),
    "neck_base": (200, 205), "head_base": (200, 185), "head_top": (200, 90),
    "shoulder_L": (150, 225), "elbow_L": (140, 285), "hand_L": (135, 340),
    "shoulder_R": (250, 225), "elbow_R": (260, 285), "hand_R": (265, 340),
    "hip_L": (180, 340), "knee_L": (178, 450), "ankle_L": (176, 545),
    "toe_L": (150, 558),
    "hip_R": (220, 340), "knee_R": (222, 450), "ankle_R": (224, 545),
    "toe_R": (250, 558),
}


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    assets = OUT / "dial_demo_fixed" / "assets"
    assets.mkdir(parents=True, exist_ok=True)
    front = assets / "view_front.png"
    back = assets / "view_back.png"
    make_png(front, (210, 60, 60))
    make_png(back, (60, 90, 210))

    spec = {
        "name": "dial_demo",
        "canvas": {"width": 400, "height": 600},
        "joints": JOINTS,
        "parts": [],
        "head_turn": {
            "bone": "Head",
            "states": {"Front": str(front), "Back": str(back)},
            "center_by_state": {"Front": (200, 137), "Back": (200, 137)},
        },
    }
    rig = build_rig(spec)
    verdict, lines = qa_rig(rig)
    print(f"QA сгенерированного: [{verdict}]")
    for line in lines:
        print(f"  {line}")

    out = OUT / "dial_demo_fixed.moho"
    emit(rig, str(out))
    print(f".moho: {out} ({out.stat().st_size} байт)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
