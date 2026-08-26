"""Сборка Gramps через новый генератор (riggen) + сверка со старым auto_rig.

  <venv>/bin/python pipeline/examples/build_gramps_std.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from psd_tools import PSDImage

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO))

from pipeline.moho.emit import emit  # noqa: E402
from pipeline.riggen.build import build_rig  # noqa: E402
from pipeline.riggen.psd import psd_to_spec  # noqa: E402
from pipeline.tools.qa_check import qa_rig  # noqa: E402

PSD = REPO / "fixtures/moho_reference/gramps.psd"
OUT = REPO / "output/riggen"


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    psd = PSDImage.open(PSD)
    spec, parts = psd_to_spec(psd, "gramps_std",
                              OUT / "gramps_std_fixed" / "assets")

    (OUT / "gramps_std.spec.json").write_text(
        json.dumps(spec, ensure_ascii=False, indent=1))

    rig = build_rig(spec)
    verdict, lines = qa_rig(rig)
    print(f"QA: [{verdict}]")
    for line in lines:
        print(f"  {line}")

    out = OUT / "gramps_std_fixed.moho"
    emit(rig, str(out))
    print(f".moho: {out} ({out.stat().st_size} байт)")

    old = OUT.parent / "autorig/gramps_autorig.moho"
    if old.exists():
        from pipeline.moho.extract import extract_from_file
        rb = {b.id: (round(b.length, 3), round(b.angle, 3))
              for b in extract_from_file(str(old)).bones}
        nb = {b.id: (round(b.length, 3), round(b.angle, 3)) for b in rig.bones}
        same = set(rb) == set(nb)
        diffs = [k for k in nb if k in rb and
                 (abs(rb[k][0] - nb[k][0]) > 0.01 or abs(rb[k][1] - nb[k][1]) > 0.01)]
        print(f"сверка с auto_rig: имена {'совпали' if same else 'РАСШОДИТСЯ'}, "
              f"костей {len(nb)} vs {len(rb)}, расхождений len/ang: {len(diffs)}"
              + (f" {diffs[:4]}" if diffs else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
