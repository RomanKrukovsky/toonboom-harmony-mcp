"""
smoke_resume.py — прогон переживает kill -9 и досчитывает ОСТАТОК.

Это не тест логики, а настоящая авария: процесс убивается сигналом, который
нельзя перехватить, посреди счёта. Проверяется числами:

  - после убийства в журнале есть записи о готовых шотах;
  - повторный запуск считает N−k, а НЕ N;
  - итоговый мастер полон, будто падения не было.

Почему kill -9, а не исключение: `except` проверяет обработчик, которого при
настоящем падении (OOM, sleep, потеря питания) не будет. Единица возобновления
здесь — шот, и доказать это можно только оборвав процесс на середине.
"""

from __future__ import annotations

import json
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = Path("/tmp/resume_test")
SHOTS = 8
FRAMES = 10


def journal_names(out: Path) -> list[str]:
    p = out / "journal.jsonl"
    if not p.is_file():
        return []
    names = []
    for line in p.read_text(errors="replace").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            names.append(json.loads(line)["name"])
        except Exception:                        # noqa: BLE001
            pass                                 # обрубок — шот не готов
    return names


def main() -> int:
    import shutil
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

    # --- фаза 1: запустить и убить посреди ---------------------------------
    cmd = [sys.executable, "episode.py", "--demo", "--shots", str(SHOTS),
           "--frames", str(FRAMES), "--out", str(OUT), "--no-assemble",
           "--workers", "2"]
    print(f"phase 1: start {SHOTS} shots with 2 workers, then kill -9 mid-run")
    proc = subprocess.Popen(cmd, cwd=HERE, stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT, text=True,
                            start_new_session=True)

    # Ждём, пока журнал покажет хотя бы 2 готовых шота, но не все.
    deadline = time.monotonic() + 240
    killed_after = 0
    while time.monotonic() < deadline:
        done = journal_names(OUT)
        if 2 <= len(done) < SHOTS:
            killed_after = len(done)
            # Убиваем ВСЮ группу: пул рабочих процессов иначе доживёт до конца
            # и «возобновление» окажется мнимым.
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
            break
        if proc.poll() is not None:
            print("FAIL: the run finished before it could be killed — "
                  "raise --shots so the kill lands mid-run")
            return 1
        time.sleep(0.3)
    else:
        os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
        print("FAIL: never saw 2 completed shots within the timeout")
        return 1

    proc.wait(timeout=30)
    after_kill = journal_names(OUT)
    print(f"  killed after {killed_after} shots; journal holds {len(after_kill)}: "
          f"{', '.join(after_kill)}")
    if not after_kill:
        print("FAIL: journal is empty after the kill — nothing survived, so a night "
              "run would restart from zero")
        return 1

    # --- фаза 2: возобновить ----------------------------------------------
    print("phase 2: resume")
    r = subprocess.run(cmd, cwd=HERE, capture_output=True, text=True, timeout=900)
    out = r.stdout
    print("  " + "\n  ".join(l for l in out.splitlines()
                             if l.startswith(("start:", "rendered"))))

    # «start: X shots to render (Y already done)» — Y обязан быть > 0
    resumed = 0
    todo = SHOTS
    for line in out.splitlines():
        if line.startswith("start:"):
            import re
            m = re.search(r"start:\s*(\d+)\s+shots.*\((\d+)\s+already done\)", line)
            if m:
                todo, resumed = int(m.group(1)), int(m.group(2))
    print(f"  resume reported: {todo} to render, {resumed} already done")

    if resumed == 0:
        print("FAIL: resume recomputed everything — the journal was not honoured")
        return 1
    if resumed < len(after_kill):
        print(f"FAIL: only {resumed} of {len(after_kill)} journalled shots were reused")
        return 1
    if todo + resumed != SHOTS:
        print(f"FAIL: {todo}+{resumed} != {SHOTS} — the split does not add up")
        return 1

    report = json.loads((OUT / "report.json").read_text())
    if report["shots_ok"] != SHOTS:
        print(f"FAIL: after resume {report['shots_ok']}/{SHOTS} shots ok")
        return 1

    # --- фаза 3: мастер полон, будто падения не было -----------------------
    from episode import Episode, assemble, demo_episode
    ep = demo_episode(OUT, shots=SHOTS, frames=FRAMES)
    asm = assemble(ep)
    print(f"  master: {asm['duration']}s (expected {asm['expected']}s, "
          f"drift {asm['drift']:+.3f}s), segments {asm['segments']}")
    if not asm["in_tolerance"]:
        print("FAIL: master duration drifted beyond tolerance after a resume")
        return 1
    if asm["missing_shots"]:
        print(f"FAIL: master is missing shots {asm['missing_shots']}")
        return 1

    saved = resumed / SHOTS * 100
    # Реестр происхождения тоже переживает падение: кадр из мастера,
    # склеенного через аварию, обязан отвечать не "untracked".
    from provenance import Ledger
    led = Ledger(OUT / "provenance.jsonl")
    rep = led.frame_report(ep.name, 1)
    broken = led.verify()
    print(f"  provenance: кадр 1 → {rep['verdict']}, обрубков {led.truncated}, "
          f"цепочка {'цела' if not broken else 'СЛОМАНА: ' + broken[0]}")
    assert rep["verdict"] != "untracked", "кадр из мастера не отслежен"
    assert not broken, broken

    print(f"PASS: kill -9 mid-run, resume recomputed {todo}/{SHOTS} shots "
          f"({saved:.0f}% of work preserved), master complete")
    return 0


if __name__ == "__main__":
    sys.exit(main())
