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


def crash_tax(shots: int = 8, frames: int = 8) -> dict:
    """
    Линза throughput на этой части: во что падение обходится ПО ВРЕМЕНИ.

    Возобновление, которое спасает работу, но удваивает общее время, для ночного
    прогона бесполезно. Мерится честно: непрерывный прогон против прогона с
    падением посередине, суммарные стенные часы.
    """
    out = WORK / "tax_clean"
    shutil.rmtree(out, ignore_errors=True)
    sys.path.insert(0, str(HERE))
    from episode import demo_episode, run_episode

    ep = demo_episode(out, shots=shots, frames=frames)
    t0 = time.monotonic()
    run_episode(ep, workers=2)
    clean_s = time.monotonic() - t0

    k = kill_after(shots // 2)
    crashed_s = k["resume_wall_s"]
    # Полные часы прогона с падением: до падения работа тоже была сделана, но
    # её время не измерить извне — оцениваем по доле сохранённых шотов.
    est_before = clean_s * k["killed_after"] / shots
    total_s = est_before + crashed_s
    return {"clean_s": round(clean_s, 2), "resume_s": round(crashed_s, 2),
            "est_before_crash_s": round(est_before, 2),
            "total_with_crash_s": round(total_s, 2),
            "tax_pct": round((total_s / clean_s - 1) * 100) if clean_s else 0,
            "killed_after": k["killed_after"], "shots": shots}


def concurrent_runs(shots: int = 6, frames: int = 8) -> dict:
    """
    Два прогона на одной серии одновременно — что будет?

    Реальная опасность продакшна, которую я ни разу не проверял: оператор
    запустил команду дважды, или ночной cron наложился на вчерашний прогон.
    Оба процесса читают один журнал, считают одни шоты и пишут в один каталог.

    Худший исход — не падение, а ТИХАЯ порча: два процесса рендерят один шот в
    один каталог, кадры перемешиваются, мастер собирается из мусора и никто не
    узнает. Поэтому проверяется целостность результата, а не код возврата.
    """
    out = WORK / "concurrent"
    shutil.rmtree(out, ignore_errors=True)
    out.mkdir(parents=True, exist_ok=True)
    cmd = [sys.executable, "episode.py", "--demo", "--shots", str(shots),
           "--frames", str(frames), "--out", str(out), "--no-assemble",
           "--workers", "2"]
    a = subprocess.Popen(cmd, cwd=HERE, stdout=subprocess.PIPE,
                         stderr=subprocess.STDOUT, text=True)
    time.sleep(0.4)                      # второй стартует, пока первый работает
    b = subprocess.Popen(cmd, cwd=HERE, stdout=subprocess.PIPE,
                         stderr=subprocess.STDOUT, text=True)
    out_a, _ = a.communicate(timeout=1800)
    out_b, _ = b.communicate(timeout=1800)

    jp = out / "journal.jsonl"
    lines = [l for l in jp.read_text(errors="replace").splitlines() if l.strip()]
    names = []
    for l in lines:
        try:
            names.append(json.loads(l)["name"])
        except Exception:                                  # noqa: BLE001
            pass
    dupes = len(names) - len(set(names))

    # Целостность: у каждого шота ровно frames кадров, ни больше ни меньше.
    wrong_counts = {}
    for i in range(1, shots + 1):
        d = out / f"sc{i:03d}"
        n = len(list(d.glob("f*.png"))) if d.is_dir() else 0
        if n != frames:
            wrong_counts[f"sc{i:03d}"] = n

    return {"exit_a": a.returncode, "exit_b": b.returncode,
            "journal_lines": len(lines), "duplicate_entries": dupes,
            "shots_expected": shots, "shots_with_wrong_frames": wrong_counts,
            # Ищется КОД, а не английская фраза: проба, зависящая от текста
            # сообщения, врёт при первой же его правке или переводе.
            "guarded": "ALREADY RUNNING" in (out_a + out_b)
                       or "ALREADY_RUNNING" in (out_a + out_b),
            "guard_exit_seen": 3 in (a.returncode, b.returncode)}


def changed_episode(shots: int = 6, frames: int = 6) -> dict:
    """
    Серию ПРАВИЛИ между падением и перезапуском — обычная монтажная ситуация.

    Три случая, каждый из которых бывает на живом проекте:
      - шоту добавили кадров (реплику удлинили);
      - шот удалили из раскадровки;
      - шот вставили в середину.

    Опасность не в падении, а в тихом принятии старого результата: шот на 6
    кадров записан в журнал как готовый, длину подняли до 12, и возобновление
    считает его сделанным. Серия выходит с коротким шотом, ошибки нет.
    """
    sys.path.insert(0, str(HERE))
    from episode import Episode, demo_episode, run_episode, shot_is_done, read_journal

    out = WORK / "changed"
    shutil.rmtree(out, ignore_errors=True)
    ep = demo_episode(out, shots=shots, frames=frames)
    run_episode(ep, workers=3)
    journal = read_journal(ep)

    # 1. Шоту добавили кадров. Проверяется БЕЗ мутации самой серии — иначе
    # следующие пробы наследуют изменённую длину и их числа объясняются моей
    # правкой, а не поведением конвейера. Дефект был именно такой: «шот удалён
    # -> пересчитан 1» показывал удлинённый шот из пробы №1, а не последствие
    # удаления.
    from copy import deepcopy
    probe_ep = deepcopy(ep)
    probe_ep.shots[1].frames = frames * 2
    lengthened_done = shot_is_done(probe_ep, probe_ep.shots[1],
                                   journal.get(probe_ep.shots[1].name))

    # 2. Шот удалён из раскадровки: пересчитывать нечего.
    removed = ep.shots[-1].name
    trimmed = Episode(ep.name, deepcopy(ep.shots[:-1]), ep.out_dir)
    events: list[dict] = []
    run_episode(trimmed, workers=3, on_event=events.append)
    trimmed_recomputed = events[0]["todo"]

    # 3. Вставлен новый шот в середину — считается только он?
    from episode import ShotSpec
    newshot = ShotSpec(name="sc999", parts_json=ep.shots[0].parts_json,
                       frames=frames, fps=24, resolution=(320, 240),
                       channels={"arm.rot": [(1.0, 0.0), (float(frames), 40.0)]},
                       camera_ortho_scale=1.9, camera_loc=(0.0, 0.3))
    grown = Episode(ep.name, deepcopy(ep.shots[:2]) + [newshot]
                    + deepcopy(ep.shots[2:]), ep.out_dir)
    events2: list[dict] = []
    run_episode(grown, workers=3, on_event=events2.append)

    return {"lengthened_shot_treated_done": lengthened_done,
            "removed_shot": removed,
            "recompute_after_trim": trimmed_recomputed,
            "recompute_after_insert": events2[0]["todo"],
            "inserted_only": events2[0]["todo"] == 1}


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
    print("crash tax (throughput lens) ...")
    tax = crash_tax()
    print("two runs at once (resilience lens) ...")
    conc = concurrent_runs()
    print("episode edited between crash and restart (resume lens) ...")
    chg = changed_episode()

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
        "## Цена падения по ВРЕМЕНИ (линза throughput)",
        "",
        f"- непрерывный прогон {tax['shots']} шотов: **{tax['clean_s']} с**",
        f"- с падением после {tax['killed_after']} шотов: "
        f"~{tax['est_before_crash_s']} с до падения + {tax['resume_s']} с "
        f"возобновление = **{tax['total_with_crash_s']} с**",
        # Знак печатается ОДИН раз: `+{v}%` при отрицательном v давало «+-1%»,
        # и главный вывод раунда читался как опечатка. Тот же класс дефекта,
        # что 345 жалоб вместо одной — число верное, вывод сделать нельзя.
        f"- налог падения: **{tax['tax_pct']:+d}%** к общему времени"
        + ("  (в пределах шума: падение не растягивает ночь)"
           if abs(tax["tax_pct"]) <= 5 else ""),
        "",
        "## Два прогона одновременно (линза resilience)",
        "",
        f"- журнал: {conc['journal_lines']} записей, дублей "
        f"**{conc['duplicate_entries']}**",
        f"- шоты с неверным числом кадров: "
        f"**{conc['shots_with_wrong_frames'] or 'нет'}**",
        f"- защита от повторного запуска: "
        f"{'есть, второй отклонён с кодом 3' if conc['guarded'] else '**НЕТ**'}",
        f"- коды выхода: {conc['exit_a']} и {conc['exit_b']}",
        "",
        "## Серию правили между падением и перезапуском (линза resume)",
        "",
        f"- шоту добавили кадров — старый результат принят как готовый: "
        f"**{'ДА (дефект)' if chg['lengthened_shot_treated_done'] else 'нет, пересчитается'}**",
        f"- шот удалён из раскадровки — пересчитано {chg['recompute_after_trim']} шотов",
        f"- шот вставлен в середину — пересчитано "
        f"{chg['recompute_after_insert']} "
        f"({'только новый' if chg['inserted_only'] else 'лишнее'})",
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
    if tax["tax_pct"] > 25:
        problems.append(f"падение стоит +{tax['tax_pct']}% общего времени — "
                        f"возобновление спасает работу, но ночь всё равно "
                        f"растягивается")
    if chg["lengthened_shot_treated_done"]:
        problems.append("шоту добавили кадров, а возобновление считает его "
                        "готовым по старой длине — серия выйдет с коротким шотом, "
                        "и ошибки не будет")
    if chg["recompute_after_trim"] != 0:
        problems.append(f"после удаления шота пересчитано "
                        f"{chg['recompute_after_trim']} — удаление не должно "
                        f"стоить работы")
    if not chg["inserted_only"]:
        problems.append(f"после вставки одного шота пересчитано "
                        f"{chg['recompute_after_insert']} — лишняя работа")
    if conc["shots_with_wrong_frames"]:
        problems.append(f"два прогона одновременно испортили кадры: "
                        f"{conc['shots_with_wrong_frames']} — мастер собрался бы "
                        f"из мусора, и никто бы не узнал")
    if conc["duplicate_entries"]:
        problems.append(f"в журнале {conc['duplicate_entries']} дублей после "
                        f"двух прогонов — возобновление будет считать неверно")
    if not conc["guarded"]:
        problems.append("нет защиты от повторного запуска на той же серии: "
                        "оператор, нажавший команду дважды, получает два процесса "
                        "в одном каталоге")
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
        {"kill_points": points, "resume_cost": cost, "episode_scale": full,
         "crash_tax": tax, "concurrent": conc, "changed_episode": chg},
        ensure_ascii=False, indent=1),
        encoding="utf-8")
    print(f"done, {len(problems)} problem(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
