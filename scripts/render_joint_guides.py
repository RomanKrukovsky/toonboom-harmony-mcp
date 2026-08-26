#!/usr/bin/env python3
"""Render joint-guide circles over the source character image.

Reads docs/evidence/auto-rigger-golden-path/joint_guides.json and draws, on
fixtures/character.png:
  - a circle at every hinge center (radius = computed overlap radius),
  - a center dot (the future peg pivot),
  - the slice chord (where the parent artwork is cut).

The output PNG is a real rendered artifact committed next to the bundle so a
human can eyeball the hinge geometry against the artwork. Requires cv2 from
.venv-ml.
"""

import json
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
GUIDES = ROOT / "docs/evidence/auto-rigger-golden-path/joint_guides.json"
SOURCE = ROOT / "fixtures/character.png"
OUT = ROOT / "docs/evidence/auto-rigger-golden-path/joint_guides_overlay.png"

COLOR_CIRCLE = (46, 204, 113)   # green
COLOR_CENTER = (220, 60, 20)    # red-ish
COLOR_CHORD = (30, 90, 220)     # blue


def main() -> int:
    guides = json.loads(GUIDES.read_text())
    img = cv2.imread(str(SOURCE))
    if img is None:
        print(f"source image unreadable: {SOURCE}", file=sys.stderr)
        return 1

    for g in guides["guides"]:
        c = (int(round(g["centerX"])), int(round(g["centerY"])))
        r = int(round(g["radiusPx"]))
        cv2.circle(img, c, r, COLOR_CIRCLE, 2, lineType=cv2.LINE_AA)
        cv2.drawMarker(img, c, COLOR_CENTER, cv2.MARKER_CROSS, 12, 2)
        s = g["sliceChord"]
        cv2.line(
            img,
            (int(round(s["x1"])), int(round(s["y1"]))),
            (int(round(s["x2"])), int(round(s["y2"]))),
            COLOR_CHORD, 2, lineType=cv2.LINE_AA,
        )
        cv2.putText(
            img, g["jointName"], (c[0] + r + 6, c[1] - 6),
            cv2.FONT_HERSHEY_SIMPLEX, 0.45, COLOR_CIRCLE, 1, cv2.LINE_AA,
        )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    if not cv2.imwrite(str(OUT), img):
        print(f"failed to write {OUT}", file=sys.stderr)
        return 1
    print(json.dumps({
        "ok": True,
        "overlay": str(OUT.relative_to(ROOT)),
        "hinges": len(guides["guides"]),
        "bytes": OUT.stat().st_size,
    }))
    return 0


if __name__ == "__main__":
    sys.exit(main())
