"""
smoke_partial_failure.py — битый шот не роняет серию.

Ночной прогон, падающий на первом плохом рисунке, бесполезен: утром вместо
серии — один шот и трейсбек. Проверяется настоящей порчей набора, а не моком:

  - шот с битым parts.json помечен failed и НАЗВАН в отчёте;
  - все остальные шоты досчитаны;
  - мастер собирается из целых шотов и честно перечисляет пропущенные.

Порча выбрана та, которую в рендере не видно: PNG без альфы. Он рендерится
«успешно» и закрывает соседей прямоугольником — то есть без проверки набора
серия вышла бы с испорченным шотом и никто бы не узнал.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

OUT = Path("/tmp/partial_test")
SHOTS = 4
FRAMES = 8


def main() -> int:
    if shutil.which("ffmpeg") is None:
        print("SKIP: ffmpeg not on PATH")
        return 0
    from blender_host import blender_available
    ok, msg = blender_available()
    print(f"blender: {msg}")
    if not ok:
        print("SKIP: no Blender")
        return 0

    if OUT.exists():
        subprocess.run(["rm", "-rf", str(OUT)], check=False)

    from episode import Episode, ShotSpec, assemble, demo_episode, run_episode

    ep = demo_episode(OUT, shots=SHOTS, frames=FRAMES)

    # Портим ОДИН шот: свой набор рисунков, в котором торс без альфы.
    bad_dir = OUT / "bad_parts"
    bad_dir.mkdir(parents=True, exist_ok=True)
    good_parts = Path(ep.shots[0].parts_json)
    for f in good_parts.parent.glob("*.png"):
        shutil.copy2(f, bad_dir / f.name)
    from PIL import Image
    with Image.open(bad_dir / "torso.png") as im:
        im.convert("RGB").save(bad_dir / "torso.png")     # альфа снята
    spec = json.loads(good_parts.read_text())
    (bad_dir / "parts.json").write_text(json.dumps(spec, indent=1), encoding="utf-8")

    broken = ep.shots[2]
    broken.parts_json = str(bad_dir / "parts.json")
    print(f"broke shot {broken.name}: torso.png exported without alpha")

    events: list[dict] = []
    report = run_episode(ep, workers=3, on_event=events.append)

    print(f"  shots ok={report['shots_ok']} failed={report['shots_failed']} "
          f"of {report['shots_total']}")
    for f in report["failed"]:
        print(f"  failed: {f['name']} [{f['code']}] {f['message']}")

    if report["shots_failed"] != 1:
        print(f"FAIL: expected exactly 1 failed shot, got {report['shots_failed']}")
        return 1
    if report["failed"][0]["name"] != broken.name:
        print(f"FAIL: the wrong shot failed: {report['failed'][0]['name']}")
        return 1
    if report["shots_ok"] != SHOTS - 1:
        print(f"FAIL: only {report['shots_ok']}/{SHOTS - 1} healthy shots survived — "
              f"one bad shot took others down with it")
        return 1
    if report["complete"]:
        print("FAIL: report claims complete while a shot failed — a night run would "
              "look successful with a hole in it")
        return 1
    if not report["failed"][0].get("code"):
        print("FAIL: the failure has no code, so an operator cannot tell what to fix")
        return 1

    # Мастер собирается из целых и ЧЕСТНО называет пропущенные.
    asm = assemble(ep)
    print(f"  master: {asm['segments']} segments, missing {asm['missing_shots']}, "
          f"{asm['duration']}s")
    if asm["missing_shots"] != [broken.name]:
        print(f"FAIL: master does not report the missing shot: {asm['missing_shots']}")
        return 1
    if asm["segments"] != SHOTS - 1:
        print(f"FAIL: master has {asm['segments']} segments, expected {SHOTS - 1}")
        return 1

    print(f"PASS: one broken shot failed alone; {report['shots_ok']} others completed, "
          f"master built from the healthy ones and names the gap")
    return 0


if __name__ == "__main__":
    sys.exit(main())
