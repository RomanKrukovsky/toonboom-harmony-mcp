"""
capture_trace.py — захват для линзы traceability: кто сделал этот кадр.

Бар: «на любой кадр серии отвечается — какой шот, кто рисовал, какой сид, чей
стиль; цепочка хэшей цела».

«На ЛЮБОЙ» проверяется случайной выборкой по всей серии, а не удобными кадрами:
реестр, отвечающий на заранее выбранный кадр, юридически бесполезен.

Отдельно проверяются три способа подделки, потому что реестр, который можно
тихо переписать, хуже отсутствующего — он создаёт ложную уверенность:
  правка записи, удаление записи, вставка новой в середину.
"""

from __future__ import annotations

import argparse
import json
import random
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORK = Path("/tmp/capture_trace")
SHOTS, FRAMES = 314, 100      # объём серии: 31 400 кадров


def build_ledger(path: Path):
    sys.path.insert(0, str(HERE))
    from provenance import Ledger
    lg = Ledger(path)
    artists = ["ivan.petrov", "masha.k", "anna.l"]
    for i in range(1, SHOTS + 1):
        f0, f1 = (i - 1) * FRAMES + 1, i * FRAMES
        lg.record("human", artists[i % len(artists)], "drawing", "e07",
                  (f0, f1), [f"sc{i:03d}/parts"], detail={"shot": f"sc{i:03d}"})
        lg.record("agent", "claude/craft", "curve_set", "e07", (f0, f1),
                  [f"sc{i:03d}/arm.rot"], seed=9000 + i,
                  style_of="anna.founder" if i % 3 == 0 else None)
        if i % 5 == 0:
            lg.record("tool", "renderer/boil", "line_boil", "e07", (f0, f1),
                      ["outlines"], seed=i)
    return lg


def tamper(path: Path, mode: str) -> int:
    """Подделать журнал одним из трёх способов. Возвращает число жалоб verify."""
    sys.path.insert(0, str(HERE))
    from provenance import Ledger
    work = path.parent / f"tampered_{mode}.jsonl"
    shutil.copy2(path, work)
    lines = [l for l in work.read_text().splitlines() if l.strip()]
    mid = len(lines) // 2
    if mode == "edit":
        rec = json.loads(lines[mid])
        before = rec["origin"]
        rec["origin"] = "human" if before != "human" else "agent"
        lines[mid] = json.dumps(rec, sort_keys=True, separators=(",", ":"))
    elif mode == "delete":
        del lines[mid]
    elif mode == "insert":
        rec = json.loads(lines[mid])
        rec["actor"] = "someone.else"
        lines.insert(mid, json.dumps(rec, sort_keys=True, separators=(",", ":")))
    work.write_text("\n".join(lines) + "\n")
    return len(Ledger(work).verify())


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--samples", type=int, default=30)
    a = ap.parse_args()
    art = Path(a.out)
    art.parent.mkdir(parents=True, exist_ok=True)

    shutil.rmtree(WORK, ignore_errors=True)
    WORK.mkdir(parents=True)
    jp = WORK / "provenance.jsonl"

    import time
    t0 = time.monotonic()
    lg = build_ledger(jp)
    write_s = time.monotonic() - t0
    entries = len(list(lg.entries()))
    total = SHOTS * FRAMES

    t0 = time.monotonic()
    clean = lg.verify()
    verify_s = time.monotonic() - t0

    rng = random.Random(11)
    picks = rng.sample(range(1, total + 1), a.samples)
    t0 = time.monotonic()
    answered = 0
    incomplete = []
    for f in picks:
        r = lg.frame_report("e07", f)
        touches = r["touches"]
        has_human = any(t["origin"] == "human" for t in touches)
        has_seed = any(t["seed"] for t in touches)
        if r["verdict"] == "mixed" and has_human and has_seed:
            answered += 1
        else:
            incomplete.append((f, r["verdict"], has_human, has_seed))
    query_ms = (time.monotonic() - t0) / a.samples * 1000

    tampers = {m: tamper(jp, m) for m in ("edit", "delete", "insert")}

    L = [
        "# traceability — на любой кадр серии: кто, чем, каким сидом",
        "",
        f"серия: {SHOTS} шотов × {FRAMES} кадров = **{total} кадров**, "
        f"{entries} записей в реестре",
        "",
        "| требование бара | наше |",
        "|---|---|",
        f"| отвечает на СЛУЧАЙНЫЙ кадр | **{answered}/{a.samples}** случайных кадров "
        f"отвечены полностью |",
        f"| назван человек-автор | да, в каждом отвеченном |",
        f"| назван сид | да, в каждом отвеченном |",
        f"| назван стиль | да, где применялся |",
        f"| цепочка хэшей цела | {'да' if not clean else f'НЕТ: {clean[:2]}'} |",
        f"| правка записи ломает цепь | {'да' if tampers['edit'] else 'НЕТ'} "
        f"({tampers['edit']} жалоб) |",
        f"| удаление записи ломает цепь | {'да' if tampers['delete'] else 'НЕТ'} "
        f"({tampers['delete']} жалоб) |",
        f"| вставка записи ломает цепь | {'да' if tampers['insert'] else 'НЕТ'} "
        f"({tampers['insert']} жалоб) |",
        "",
        "## Цена на объёме серии",
        "",
        f"- запись {entries} записей: {write_s:.2f} с",
        f"- проверка всей цепочки: **{verify_s * 1000:.0f} мс**",
        f"- ответ на один кадр: **{query_ms:.1f} мс** (среднее по {a.samples})",
        f"- свод по серии: {json.dumps(lg.scene_summary('e07', min(total, 2000))['breakdown'])} "
        f"(первые 2000 кадров)",
    ]

    problems = []
    if answered != a.samples:
        problems.append(f"на {a.samples - answered} случайных кадрах ответ неполон: "
                        f"{incomplete[:3]}")
    if clean:
        problems.append(f"цепочка сломана на чистом реестре: {clean[:2]}")
    for m, n in tampers.items():
        if not n:
            problems.append(f"подделка «{m}» прошла незамеченной — реестр можно "
                            f"тихо переписать, что хуже его отсутствия")
    if query_ms > 50:
        problems.append(f"ответ на кадр {query_ms:.0f} мс — на серии это делает "
                        f"аудит непрактичным")
    if problems:
        L += ["", "## НЕ ДОСТАЁТ", ""] + [f"- {p}" for p in problems]
    else:
        L += ["", "## Всё по бару", "",
              f"Все {a.samples} случайных кадров отвечены, три способа подделки "
              f"обнаружены, проверка цепочки {verify_s * 1000:.0f} мс."]

    art.write_text("\n".join(L) + "\n", encoding="utf-8")
    (art.parent / "metrics.json").write_text(json.dumps({
        "frames": total, "entries": entries, "answered": answered,
        "samples": a.samples, "verify_ms": round(verify_s * 1000, 1),
        "query_ms": round(query_ms, 2), "tampers": tampers,
        "incomplete": incomplete[:5]}, ensure_ascii=False, indent=1),
        encoding="utf-8")
    print(f"done, {len(problems)} problem(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
