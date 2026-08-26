"""Один воспроизводимый entry point: собрать -> QA -> валидировать -> скриншот.

  <venv>/bin/python pipeline/tools/run_project.py [--out DIR] [--open]
"""
from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO))

from pipeline.examples.build_autogen import main as build_autogen  # noqa: E402
from pipeline.examples.build_dial_demo import main as build_dial  # noqa: E402
from pipeline.examples.build_modules_demo import main as build_modules  # noqa: E402
from pipeline.moho.extract import extract_from_file  # noqa: E402
from pipeline.moho.extract import load_mohoproj  # noqa: E402
from pipeline.tools.moho_format_validator import validate  # noqa: E402
from pipeline.tools.render_preview import render  # noqa: E402

TARGETS = [
    ("autogen_char_fixed.moho", "собранный флагман"),
    ("dial_demo_fixed.moho", "HEAD_TURN демо"),
    ("modules_demo_fixed.moho", "модули (flexi+диалы)"),
]


def main() -> int:
    ap = argparse.ArgumentParser(description="Собрать, проверить и отрендерить риги")
    ap.add_argument("--out", type=Path,
                    default=REPO / "output/riggen")
    ap.add_argument("--open", action="store_true",
                    help="открыть флагман в Moho")
    args = ap.parse_args()

    print("== Сборка проектов ==")
    for fn in (build_autogen, build_dial, build_modules):
        rc = fn()
        if rc not in (0, None):
            print(f"FAIL: {fn.__name__} вернул {rc}")
            return rc

    out = Path(args.out)
    print("\n== Строгий формат-валидатор ==")
    ok_all = True
    for name, _desc in TARGETS:
        path = out / name
        if not path.exists():
            print(f"[MISS] {name}")
            ok_all = False
            continue
        ok, problems = validate(str(path))
        print(f"[{'PASS' if ok else 'FAIL'}] {name}")
        for pr in problems[:10]:
            print(f"      - {pr}")
        ok_all = ok_all and ok
    if not ok_all:
        return 1

    print("\n== Скриншот (кадр 0) ==")
    flag = out / "autogen_char_fixed.moho"
    doc, _ = load_mohoproj(str(flag))
    pds = doc.get("project_data", {})
    render(doc, flag, out / "preview_frame.png",
           pds.get("width", 400), pds.get("height", 600))
    if args.open:
        import subprocess
        subprocess.Popen(["open", "-a", "Moho", str(flag)])
        print("открыл флагман в Moho")

    print("\nOK: сборка+QA+валидация+рендер прошли без ошибок.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
