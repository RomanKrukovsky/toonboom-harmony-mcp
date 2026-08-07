"""
capture_resume.py — захват для линзы resume: сколько работы спасает падение.

Бар: «после падения на шоте k из N повторный запуск считает N−k+1, не N». То
есть линза судит ЧИСЛО пересчитанных шотов, а не наличие механизма.

Мерится на трёх точках падения — в начале, в середине, в конце — потому что
механизм, спасающий работу только когда упало ближе к концу, для ночного
прогона бесполезен: чаще всего падает как раз в середине.

Отдельно мерится ЦЕНА возобновления: сколько секунд уходит на то, чтобы понять,
что уже сделано. На 314 шотах чтение журнала не должно стоить минут.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORK = Path("/tmp/capture_resume")
SHOTS = 8
FRAMES = 8


def kill_after(n_done: int) -> dict:
    """Убить прогон, когда готово ровно n_done шотов, и возобновить."""
    out = WORK / f"k{n_done}"
    shutil.rmtree(out, ignore_errors=True)
    out.mkdir(parents=True, exist_ok=True)
    cmd = [sys.executable, "episode.py", "--demo", "--shots", str(SHOTS),
           "--frames", str(FRAMES), "--out", str(out), "--no-assemble",
           "--workers", "2"]

    proc = subprocess.Popen(cmd, cwd=HERE, stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL, start_new_session=True)
    jp = out / "journal.jsonl"
    deadline = time.monotonic() + 300
    killed = 0
    while time.monotonic() < deadline:
        n = len([l for l in jp.read_text(errors="replace").splitlines()
                 if l.strip()]) if jp.is_file() else 0
        if n >= n_done:
            killed = n
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
            break
        if proc.poll() is not None:
            killed = n
            break
        time.sleep(0.15)
    else:
        os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
    try:
        proc.wait(timeout=30)
    except subprocess.TimeoutExpired:
        pass

    t0 = time.monotonic()
    r = subprocess.run(cmd, cwd=HERE, capture_output=True, text=True, timeout=900)
    wall = time.monotonic() - t0
    m = re.search(r"start:\s*(\d+)\s+shots.*\((\d+)\s+already done\)", r.stdout)
    todo, resumed = (int(m.group(1)), int(m.group(2))) if m else (SHOTS, 0)
    rep = json.loads((out / "report.json").read_text())
    ideal = SHOTS - killed
    return {"killed_after": killed, "resumed": resumed, "recomputed": todo,
            "ideal_recompute": ideal,
            "wasted": max(0, todo - ideal),
            "final_ok": rep["shots_ok"], "resume_wall_s": round(wall, 2)}


def resume_cost(shots: int = 40) -> dict:
    """Цена возобновления, когда всё уже готово: чистое чтение журнала."""
    out = WORK / "cost"
    shutil.rmtree(out, ignore_errors=True)
    sys.path.insert(0, str(HERE))
    from episode import demo_episode, read_journal, run_episode

    ep = demo_episode(out, shots=shots, frames=2)
    # Пишем журнал напрямую, без рендера: мерится чтение, не счёт.
    from episode import append_journal
    for s in ep.shots:
        d = out / s.name
        d.mkdir(parents=True, exist_ok=True)
        for i in range(1, s.frames + 1):
            (d / f"f{i:04d}.png").write_bytes(b"x")
        append_journal(ep, {"name": s.name, "status": "ok", "frames": s.frames,
                            "seconds": 0.0})
    t0 = time.monotonic()
    j = read_journal(ep)
    read_ms = (time.monotonic() - t0) * 1000
    events: list[dict] = []
    t0 = time.monotonic()
    run_episode(ep, workers=2, on_event=events.append)
    total_ms = (time.monotonic() - t0) * 1000
    return {"shots": shots, "journal_entries": len(j),
            "read_ms": round(read_ms, 1), "no_work_run_ms": round(total_ms, 1),
            "recomputed": events[0]["todo"]}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    art = Path(a.out)
    art.parent.mkdir(parents=True, exist_ok=True)

    sys.path.insert(0, str(HERE))
    from blender_host import blender_available
    ok, ver = blender_available()
    if not ok:
        art.write_text(f"# resume\n\nBLOCKED: {ver}\n", encoding="utf-8")
        return 1

    points = []
    for n in (2, 4, 6):
        print(f"kill after {n} shots ...")
        points.append(kill_after(n))
    print("resume cost on 40 shots ...")
    cost = resume_cost()
    # Замер на РЕАЛЬНОМ объёме серии, а не экстраполяция с 40 шотов.
    # Разрыв раунда 3: «~1 мс на 314 шотах» было арифметикой, а линза судит
    # поведение на серии. 314 записей — это объём 22-минутного эпизода.
    print("resume cost on 314 shots (real episode scale) ...")
    full = resume_cost(shots=314)

    L = [
        "# resume — сколько работы спасает падение",
        "",
        f"машина: {os.cpu_count()} ядер · {ver} · серия {SHOTS} шотов × {FRAMES} кадров",
        "",
        "| упало после | пересчитано | идеал (N−k) | лишнего | итог |",
        "|---|---|---|---|---|",
    ]
    for p in points:
        L.append(f"| {p['killed_after']} шотов | **{p['recomputed']}** | "
                 f"{p['ideal_recompute']} | {p['wasted']} | "
                 f"{p['final_ok']}/{SHOTS} ок |")
    L += [
        "",
        "## Цена возобновления",
        "",
        f"- журнал на {cost['shots']} шотов читается за **{cost['read_ms']} мс**",
        f"- прогон, где всё уже готово: {cost['no_work_run_ms']} мс, "
        f"пересчитано {cost['recomputed']} шотов",
        f"- **замерено на 314 шотах** (объём серии 22 мин): журнал читается за "
        f"**{full['read_ms']} мс**, прогон без работы {full['no_work_run_ms']} мс, "
        f"пересчитано {full['recomputed']}",
        "",
        "## Числа по возобновлению",
        "",
    ]
    for p in points:
        L.append(f"- упало после {p['killed_after']}: возобновление заняло "
                 f"{p['resume_wall_s']} с, сохранено {p['resumed']} шотов")

    problems = []
    for p in points:
        if p["wasted"] > 0:
            problems.append(f"упало после {p['killed_after']} шотов — пересчитано "
                            f"{p['recomputed']} вместо {p['ideal_recompute']}, "
                            f"{p['wasted']} шот(ов) сделано заново")
        if p["final_ok"] != SHOTS:
            problems.append(f"после возобновления {p['final_ok']}/{SHOTS} шотов — "
                            f"серия неполна")
    if cost["recomputed"] != 0:
        problems.append(f"на готовой серии пересчитано {cost['recomputed']} шотов "
                        f"вместо нуля")
    if full["recomputed"] != 0:
        problems.append(f"на серии из 314 шотов пересчитано {full['recomputed']} "
                        f"вместо нуля — журнал не читается на реальном объёме")
    if full["read_ms"] > 500:
        problems.append(f"чтение журнала на 314 шотах {full['read_ms']} мс — "
                        f"возобновление само стало дорогим")
    if problems:
        L += ["## НЕ ДОСТАЁТ", ""] + [f"- {p}" for p in problems]
    else:
        L += ["## Всё по бару", "",
              "Каждое падение пересчитало ровно остаток, серия вышла полной."]

    art.write_text("\n".join(L) + "\n", encoding="utf-8")
    (art.parent / "metrics.json").write_text(json.dumps(
        {"kill_points": points, "resume_cost": cost, "episode_scale": full},
        ensure_ascii=False, indent=1),
        encoding="utf-8")
    print(f"done, {len(problems)} problem(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
