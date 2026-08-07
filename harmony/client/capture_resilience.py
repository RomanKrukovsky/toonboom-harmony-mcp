"""
capture_resilience.py — захват для линзы resilience: что конвейер делает в аварии.

Артефакт — отчёт о ПОВЕДЕНИИ при настоящих поломках, а не о наличии try/except.
Каждая авария устраивается по-настоящему:

  kill -9        — сигнал, который нельзя перехватить, посреди счёта
  битый рисунок  — PNG без альфы: рендерится «успешно» и портит кадр
  нет ffmpeg     — PATH подменяется, сборка обязана сказать это заранее
  нет места      — требование места завышается, preflight обязан остановить
  битый журнал   — обрубок строки, как после падения посреди записи
  чужие кадры    — журнал говорит «готово», кадров нет

Проверяется не «упало/не упало», а три вещи по каждой аварии:
  1. остальная работа дошла?
  2. сказано ЧТО случилось, кодом, а не текстом в трейсбеке?
  3. сказано ЧТО ДЕЛАТЬ?

Третье отдельно, потому что ошибка без указания действия для оператора
бесполезна: в три часа ночи он видит красное и не знает, чинить или ждать.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORK = Path("/tmp/capture_resilience")


def fresh(name: str) -> Path:
    d = WORK / name
    shutil.rmtree(d, ignore_errors=True)
    d.mkdir(parents=True, exist_ok=True)
    return d


def make_bad_parts(src_parts: Path, dest: Path) -> Path:
    """Набор рисунков с торсом без альфы — молчаливая порча."""
    dest.mkdir(parents=True, exist_ok=True)
    for f in src_parts.parent.glob("*.png"):
        shutil.copy2(f, dest / f.name)
    from PIL import Image
    with Image.open(dest / "torso.png") as im:
        im.convert("RGB").save(dest / "torso.png")
    (dest / "parts.json").write_text(src_parts.read_text(), encoding="utf-8")
    return dest / "parts.json"


def probe_kill9(shots: int = 6, frames: int = 10) -> dict:
    """Убить прогон посреди и посмотреть, что осталось на диске."""
    out = fresh("kill9")
    cmd = [sys.executable, "episode.py", "--demo", "--shots", str(shots),
           "--frames", str(frames), "--out", str(out), "--no-assemble",
           "--workers", "2"]
    proc = subprocess.Popen(cmd, cwd=HERE, stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL, start_new_session=True)
    jp = out / "journal.jsonl"
    killed_at = 0
    deadline = time.monotonic() + 240
    while time.monotonic() < deadline:
        n = len([l for l in jp.read_text(errors="replace").splitlines()
                 if l.strip()]) if jp.is_file() else 0
        if 2 <= n < shots:
            killed_at = n
            os.killpg(os.getpgid(proc.pid), 9)
            break
        if proc.poll() is not None:
            break
        time.sleep(0.2)
    else:
        os.killpg(os.getpgid(proc.pid), 9)
    proc.wait(timeout=30)

    r = subprocess.run(cmd, cwd=HERE, capture_output=True, text=True, timeout=900)
    import re
    m = re.search(r"start:\s*(\d+)\s+shots.*\((\d+)\s+already done\)", r.stdout)
    todo, resumed = (int(m.group(1)), int(m.group(2))) if m else (shots, 0)
    rep = json.loads((out / "report.json").read_text())
    return {"killed_after": killed_at, "resumed": resumed, "recomputed": todo,
            "shots_ok": rep["shots_ok"], "of": shots,
            "work_preserved_pct": round(resumed / shots * 100)}


def probe_bad_artwork() -> dict:
    """Один шот с битым рисунком: падает он один?"""
    out = fresh("bad_art")
    sys.path.insert(0, str(HERE))
    from episode import demo_episode, run_episode
    ep = demo_episode(out, shots=4, frames=8)
    bad = make_bad_parts(Path(ep.shots[0].parts_json), out / "bad_parts")
    ep.shots[2].parts_json = str(bad)
    rep = run_episode(ep, workers=3)
    f = rep["failed"][0] if rep["failed"] else {}
    return {"failed": rep["shots_failed"], "survived": rep["shots_ok"], "of": 4,
            "named": f.get("name"), "code": f.get("code"),
            "complete_flag": rep["complete"]}


def probe_missing_ffmpeg() -> dict:
    """PATH без ffmpeg: сказано ли ДО начала счёта?"""
    out = fresh("no_ffmpeg")
    env = dict(os.environ, PATH="/nonexistent")
    r = subprocess.run(
        [sys.executable, "episode.py", "--demo", "--shots", "2", "--frames", "4",
         "--out", str(out), "--json"],
        cwd=HERE, capture_output=True, text=True, env=env, timeout=300)
    codes, remedy = [], False
    try:
        data = json.loads(r.stdout)
        codes = [p["code"] for p in data.get("preflight", {}).get("problems", [])]
        remedy = any(p.get("remedy") for p in data["preflight"]["problems"])
    except Exception:                                    # noqa: BLE001
        pass
    rendered = len(list(out.rglob("f*.png")))
    return {"exit": r.returncode, "codes": codes, "has_remedy": remedy,
            "frames_rendered_anyway": rendered}


def probe_no_space() -> dict:
    """Требование места завышено: остановлено до счёта?"""
    out = fresh("no_space")
    sys.path.insert(0, str(HERE))
    from episode import demo_episode, preflight
    ep = demo_episode(out, shots=2, frames=4)
    pf = preflight(ep, need_free_gb=10_000.0)
    sp = next((p for p in pf.problems if p["code"] == "NO_SPACE"), {})
    return {"ok": pf.ok, "codes": [p["code"] for p in pf.problems],
            "has_remedy": bool(sp.get("remedy")),
            "estimated_gb": pf.info.get("estimated_gb")}


def probe_truncated_journal() -> dict:
    """Обрубок строки в журнале: шот считается готовым?

    Проба РВЁТ последнюю целую запись, а не дописывает мусор в конец.
    Дефект самой пробы, найденный раундом 2: дописка обрубка ПОСЛЕ трёх целых
    записей ничего не отнимала, пересчёт выходил 0 шотов, и проверка была
    всегда зелёной — она не проверяла ничего. Настоящее падение обрывает запись
    того шота, который считался в этот момент, и он обязан пересчитаться.
    """
    out = fresh("trunc")
    sys.path.insert(0, str(HERE))
    from episode import demo_episode, read_journal, run_episode
    ep = demo_episode(out, shots=3, frames=6)
    run_episode(ep, workers=3)
    jp = out / "journal.jsonl"
    lines = [l for l in jp.read_text().splitlines() if l.strip()]
    victim = json.loads(lines[-1])["name"]
    # обрываем последнюю запись на середине, как kill -9 посреди write()
    lines[-1] = lines[-1][: len(lines[-1]) // 2]
    jp.write_text("\n".join(lines) + "\n")
    kept = len(read_journal(ep))
    events: list[dict] = []
    run_episode(ep, workers=3, on_event=events.append)
    return {"entries_kept": kept, "truncated_shot": victim,
            "recomputed": events[0]["todo"], "resumed": events[0]["resumed"]}


def probe_journal_lies() -> dict:
    """Журнал говорит «готово», кадры удалены: пересчитается?"""
    out = fresh("lies")
    sys.path.insert(0, str(HERE))
    from episode import demo_episode, run_episode
    ep = demo_episode(out, shots=3, frames=6)
    run_episode(ep, workers=3)
    shutil.rmtree(out / ep.shots[0].name)
    events: list[dict] = []
    run_episode(ep, workers=3, on_event=events.append)
    return {"recomputed": events[0]["todo"], "resumed": events[0]["resumed"]}


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
        art.write_text(f"# resilience\n\nBLOCKED: {ver}\n", encoding="utf-8")
        return 1

    print("kill -9 ...");        k = probe_kill9()
    print("bad artwork ...");    b = probe_bad_artwork()
    print("no ffmpeg ...");      f = probe_missing_ffmpeg()
    print("no space ...");       s = probe_no_space()
    print("truncated journal ..."); t = probe_truncated_journal()
    print("journal lies ...");   j = probe_journal_lies()

    L = [
        "# resilience — поведение конвейера в настоящей аварии",
        "",
        f"машина: {os.cpu_count()} ядер · {ver}",
        "",
        "| авария | остальное дошло? | код | что делать сказано? |",
        "|---|---|---|---|",
        f"| kill -9 посреди прогона | да: {k['resumed']}/{k['of']} шотов сохранено, "
        f"пересчитано {k['recomputed']} | — | возобновление той же командой |",
        f"| битый рисунок в шоте | да: {b['survived']}/{b['of']} дошли | "
        f"`{b['code']}` | шот назван: {b['named']} |",
        f"| нет ffmpeg в PATH | счёт не начался (кадров {f['frames_rendered_anyway']}) | "
        f"{', '.join(f['codes']) or '—'} | {'да' if f['has_remedy'] else 'НЕТ'} |",
        f"| нет места на диске | остановлено до счёта | "
        f"{', '.join(s['codes']) or '—'} | {'да' if s['has_remedy'] else 'НЕТ'} |",
        f"| обрубок в журнале (порвана запись {t['truncated_shot']}) | "
        f"целых записей {t['entries_kept']}, пересчитан {t['recomputed']} шот | "
        f"— | обрубок = шот не готов |",
        f"| журнал врёт (кадры стёрты) | пересчитано {j['recomputed']} шотов | "
        f"— | проверка по диску, не по журналу |",
        "",
        "## Числа",
        "",
        f"- kill -9: убит после {k['killed_after']} шотов, сохранено "
        f"{k['work_preserved_pct']}% работы, итог {k['shots_ok']}/{k['of']} шотов ок",
        f"- битый шот: `complete` в отчёте = {b['complete_flag']} "
        f"(должно быть False, иначе ночной прогон выглядит успешным с дырой)",
        f"- нет места: оценка требования {s['estimated_gb']} ГБ посчитана из объёма серии",
    ]

    problems = []
    if not f["has_remedy"] or not s["has_remedy"]:
        problems.append("ошибка без указания, ЧТО ДЕЛАТЬ — оператор в 3 ночи "
                        "видит красное и не знает, чинить или ждать")
    if f["frames_rendered_anyway"]:
        problems.append(f"без ffmpeg всё равно посчитано {f['frames_rendered_anyway']} "
                        f"кадров — работа впустую")
    if b["complete_flag"]:
        problems.append("отчёт говорит complete при упавшем шоте")
    if k["resumed"] == 0:
        problems.append("kill -9 не сохранил ничего")
    if t["recomputed"] == 0:
        problems.append("порванная запись журнала не привела к пересчёту — "
                        "обрубок принят за готовый шот, мастер получит дыру")
    if len(set(f["codes"])) != len(f["codes"]):
        problems.append(f"дублированные коды ошибок: {f['codes']} — оператор не "
                        f"понимает, одна у него беда или несколько")
    if problems:
        L += ["", "## НЕ ДОСТАЁТ", ""] + [f"- {p}" for p in problems]

    art.write_text("\n".join(L) + "\n", encoding="utf-8")
    (art.parent / "metrics.json").write_text(json.dumps(
        {"kill9": k, "bad_artwork": b, "no_ffmpeg": f, "no_space": s,
         "truncated_journal": t, "journal_lies": j}, ensure_ascii=False, indent=1),
        encoding="utf-8")
    print(f"probes done, {len(problems)} problem(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
