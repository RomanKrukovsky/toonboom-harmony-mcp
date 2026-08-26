"""Демо всех модулей генератора: HEAD_TURN + простой диал + flexi-пары.

  <venv>/bin/python pipeline/examples/build_modules_demo.py
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO))

from pipeline.moho.emit import emit  # noqa: E402
from pipeline.moho.extract import extract_from_file  # noqa: E402
from pipeline.riggen.build import build_rig  # noqa: E402
from pipeline.tools.qa_check import qa_rig  # noqa: E402
from pipeline.examples.build_dial_demo import JOINTS  # noqa: E402
from pipeline.tools.structural_audit import audit  # noqa: E402

OUT = REPO / "output/riggen"


def make_labeled_png(path: Path, rgb, label: str, size: int = 160) -> None:
    img = Image.new("RGB", (size, size), rgb)
    d = ImageDraw.Draw(img)
    d.text((size // 2 - 20, size // 2), label, fill=(255, 255, 255))
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)


def main() -> int:
    assets = OUT / "modules_demo_fixed" / "assets"
    views = {"Front": ((210, 60, 60), "F"), "Back": ((60, 90, 210), "B")}
    for name, (rgb, tag) in views.items():
        make_labeled_png(assets / f"head_{name}.png", rgb, tag)
    mouths = {"Closed": ((70, 160, 80), "-"), "A": ((230, 180, 60), "A"),
              "O": ((200, 90, 170), "O")}
    for name, (rgb, tag) in mouths.items():
        make_labeled_png(assets / f"mouth_{name}.png", rgb, tag)

    spec = {
        "name": "modules_demo",
        "canvas": {"width": 400, "height": 600},
        "joints": JOINTS,
        "parts": [],
        "flexi": ["LowerArm L", "LowerArm R", "Shin L", "Shin R"],
        "bone_actions": [
            {"action": "Body Squash", "bone": "Body", "channel": "scale",
             "vals": [1.0, 0.75, 1.25], "spread_deg": 60.0},
            {"action": "Head Turn Tilt", "bone": "Head", "channel": "angle",
             "vals": [0.0, 0.3, -0.3], "spread_deg": 45.0},
        ],
        "head_turn": {
            "bone": "Head",
            "states": {k: str(assets / f"head_{k}.png") for k in views},
            "center_by_state": {k: [200, 137] for k in views},
            "face": {
                "mouth": {
                    "views": ["Front"],
                    "states": {k: str(assets / f"mouth_{k}.png")
                               for k in mouths},
                    "center_by_state": {k: [200, 165] for k in mouths},
                },
            },
        },
    }
    rig = build_rig(spec)
    verdict, lines = qa_rig(rig)
    print(f"QA: [{verdict}]")
    for line in lines:
        print(f"  {line}")
    if verdict == "FAIL":
        return 1

    out = OUT / "modules_demo_fixed.moho"
    emit(rig, str(out))
    print(f".moho: {out} ({out.stat().st_size} байт)")

    r2 = extract_from_file(str(out))
    flexi = [(b.id, b.flexi_pair, b.flexi_chain) for b in r2.bones
             if b.is_flexi_endpoint][:4]
    dials = sorted(b.id for b in r2.bones if b.is_dial)
    print(f"ре-экстракция: диалы={dials}")
    print(f"флекси-пары: {flexi}")
    links = [(l.dial_bone_id, l.dial_action_name, l.switch_part_id)
             for l in r2.dial_links]
    print("связи:")
    for l in links:
        print(f"  {l}")
    face = [p.name for p in r2.walk_parts() if p.type == "switch"]
    head_views = next((p.head_turn_views for p in r2.walk_parts()
                       if p.is_head_turn), None)
    print(f"свитчи={face}; виды головы={head_views}")

    emit(r2, "/tmp/modules_demo_rt.moho")
    ok, _problems = audit(str(out), "/tmp/modules_demo_rt.moho")
    print(f"round-trip audit: {'PASS' if ok else 'FAIL'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
