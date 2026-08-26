"""CLI: манифест JSON -> .moho риг по стандарту V1.

Использование:
  python3 pipeline/tools/build_rig.py spec.json [-o out.moho]

Манифест — dict спецификации для pipeline.riggen.build.build_rig
(пример: output/riggen/gramps_std.spec.json).
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO))

from pipeline.moho.emit import emit  # noqa: E402
from pipeline.riggen.build import build_rig  # noqa: E402
from pipeline.tools.qa_check import qa_rig  # noqa: E402


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("manifest")
    ap.add_argument("-o", "--out", default=None)
    args = ap.parse_args(argv)

    spec = json.loads(Path(args.manifest).read_text())
    rig = build_rig(spec)

    verdict, lines = qa_rig(rig)
    print(f"QA: [{verdict}]")
    for line in lines:
        print(f"  {line}")
    if verdict == "FAIL":
        print("сборка отменена: FAIL по QA-стандарту")
        return 1

    out = args.out or str(
        Path(args.manifest).with_suffix("").with_suffix(".moho"))
    emit(rig, out)
    print(f".moho: {out} ({Path(out).stat().st_size} байт)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
