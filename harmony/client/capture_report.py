"""
capture_report.py — захват для линзы operability: что видит человек, а не автор.

Бар: «запускает человек, который не писал этот код: одна команда, понятный
прогресс, внятные ошибки с указанием, что делать».

Проверяется машинно, потому что «понятно» иначе оценивает автор, который уже
знает ответ. Три измеримые вещи:

  1. КОМАНДЫ ИЗ ДОКУМЕНТАЦИИ реально выполняются. Команды вынимаются из
     PRODUCTION.md автоматически и запускаются в чистом окружении. Документация,
     которую не прогоняли, врёт — обычно в мелочи, и именно она останавливает
     нового человека.

  2. ПРОГРЕСС отвечает на три вопроса оператора: сколько сделано, сколько всего,
     сколько ждать. Молчащий терминал на три часа — не прогресс.

  3. ОШИБКА говорит, что делать. Ошибка без действия в три часа ночи бесполезна:
     человек видит красное и не знает, чинить или ждать.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
DOC = HERE.parent / "PRODUCTION.md"
WORK = Path("/tmp/capture_report")


def doc_commands() -> list[str]:
    """Команды из «Быстрого старта» — те, что новый человек выполнит первыми."""
    text = DOC.read_text(encoding="utf-8")
    start = text.index("## Быстрый старт")
    end = text.index("## Своя серия")
    out = []
    for block in re.findall(r"```bash\n(.*?)```", text[start:end], re.S):
        for line in block.splitlines():
            line = line.strip()
            if line and not line.startswith("#") and not line.startswith("cd "):
                out.append(line)
    return out


def run_doc_commands() -> list[dict]:
    """Выполнить их в чистом каталоге и посмотреть, что получилось."""
    shutil.rmtree(WORK, ignore_errors=True)
    WORK.mkdir(parents=True)
    results = []
    for cmd in doc_commands():
        cmd = cmd.replace("/tmp/my_first_episode", str(WORK / "first"))
        t0 = time.monotonic()
        r = subprocess.run(cmd, shell=True, cwd=HERE, capture_output=True,
                           text=True, timeout=1800)
        results.append({
            "cmd": cmd, "exit": r.returncode,
            "seconds": round(time.monotonic() - t0, 1),
            "stdout_tail": r.stdout.strip().splitlines()[-3:],
            "stderr_tail": r.stderr.strip().splitlines()[-2:],
        })
    return results


def progress_quality() -> dict:
    """Отвечает ли прогресс на три вопроса оператора."""
    sys.path.insert(0, str(HERE))
    from episode import demo_episode, run_episode
    out = WORK / "prog"
    shutil.rmtree(out, ignore_errors=True)
    ep = demo_episode(out, shots=4, frames=6)
    events: list[dict] = []
    run_episode(ep, workers=3, on_event=events.append)
    shot_events = [e for e in events if e["event"] in ("shot_done", "shot_failed")]
    start = events[0] if events else {}
    return {
        "declares_total": "shots" in start and "frames_todo" in start,
        "declares_workers": "workers" in start,
        "reports_position": all("done" in e and "of" in e for e in shot_events),
        "reports_rate": all("frames_per_s" in e for e in shot_events),
        "reports_eta": any(e.get("eta_s") is not None for e in shot_events),
        "final_summary": events[-1]["event"] == "done" if events else False,
        "events": len(events),
    }


def error_quality() -> dict:
    """Каждая проблема preflight обязана нести remedy."""
    sys.path.insert(0, str(HERE))
    from episode import Episode, ShotSpec, preflight
    out = WORK / "err"
    out.mkdir(parents=True, exist_ok=True)
    cases = {
        "no_parts": Episode("t", [ShotSpec("sc001", str(out / "nope.json"), 4)], out),
        "empty": Episode("t", [], out),
        "bad_frames": Episode("t", [ShotSpec("sc001", str(out / "nope.json"), 0)], out),
    }
    seen = []
    for name, ep in cases.items():
        for p in preflight(ep).problems:
            seen.append({"case": name, "code": p["code"],
                         "has_remedy": bool(p.get("remedy")),
                         "message_len": len(p["message"])})
    ep = Episode("t", [ShotSpec("sc001", str(out / "nope.json"), 4)], out)
    r = preflight(ep, need_free_gb=10_000.0)
    for p in r.problems:
        seen.append({"case": "no_space", "code": p["code"],
                     "has_remedy": bool(p.get("remedy")),
                     "message_len": len(p["message"])})
    return {"problems": seen,
            "all_have_remedy": all(x["has_remedy"] for x in seen),
            "without_remedy": [x["code"] for x in seen if not x["has_remedy"]]}


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
        art.write_text(f"# operability\n\nBLOCKED: {ver}\n", encoding="utf-8")
        return 1

    print("running the documented commands ...")
    docs = run_doc_commands()
    print("progress quality ...")
    prog = progress_quality()
    print("error quality ...")
    err = error_quality()

    doc_ok = all(d["exit"] == 0 for d in docs)
    L = [
        "# operability — что видит человек, который не писал этот код",
        "",
        f"{ver} · документация: {DOC.name}",
        "",
        "## Команды из «Быстрого старта», выполненные дословно",
        "",
        "| команда | код выхода | время |",
        "|---|---|---|",
    ]
    for d in docs:
        short = d["cmd"] if len(d["cmd"]) < 64 else d["cmd"][:61] + "..."
        status = "ok" if d["exit"] == 0 else f"FAIL ({d['exit']})"
        L.append(f"| `{short}` | {status} | {d['seconds']} с |")
    L += [
        "",
        "## Прогресс отвечает на вопросы оператора",
        "",
        "| вопрос | отвечает? |",
        "|---|---|",
        f"| сколько всего работы | {'да' if prog['declares_total'] else 'НЕТ'} |",
        f"| сколько потоков занято | {'да' if prog['declares_workers'] else 'НЕТ'} |",
        f"| сколько сделано из сколько | {'да' if prog['reports_position'] else 'НЕТ'} |",
        f"| с какой скоростью | {'да' if prog['reports_rate'] else 'НЕТ'} |",
        f"| сколько ещё ждать | {'да' if prog['reports_eta'] else 'НЕТ'} |",
        f"| итог в конце | {'да' if prog['final_summary'] else 'НЕТ'} |",
        "",
        "## Ошибки говорят, что делать",
        "",
        f"- проверено проблем: {len(err['problems'])}",
        f"- у всех есть указание действия: "
        f"**{'да' if err['all_have_remedy'] else 'НЕТ: ' + str(err['without_remedy'])}**",
    ]

    problems = []
    if not doc_ok:
        bad = [d["cmd"] for d in docs if d["exit"] != 0]
        problems.append(f"команды из документации не выполняются: {bad}")
    for k, label in (("declares_total", "объём работы"), ("reports_position", "позиция"),
                     ("reports_rate", "скорость"), ("reports_eta", "оценка времени"),
                     ("final_summary", "итог")):
        if not prog[k]:
            problems.append(f"прогресс не сообщает: {label}")
    if not err["all_have_remedy"]:
        problems.append(f"ошибки без указания действия: {err['without_remedy']} — "
                        f"оператор в 3 ночи видит красное и не знает, что делать")
    if problems:
        L += ["", "## НЕ ДОСТАЁТ", ""] + [f"- {p}" for p in problems]
    else:
        L += ["", "## Всё по бару", "",
              "Документация выполняется дословно, прогресс отвечает на все вопросы "
              "оператора, каждая ошибка несёт указание действия."]

    art.write_text("\n".join(L) + "\n", encoding="utf-8")
    (art.parent / "metrics.json").write_text(json.dumps(
        {"doc_commands": docs, "progress": prog, "errors": err},
        ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"done, {len(problems)} problem(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
