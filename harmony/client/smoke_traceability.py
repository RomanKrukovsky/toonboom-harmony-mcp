"""
smoke_traceability.py — на СЛУЧАЙНЫЙ кадр серии отвечается, кто его сделал.

Проверка нарочно берёт кадры наугад, а не удобные: реестр, отвечающий только на
заранее выбранный кадр, юридически бесполезен. Плюс проверяется, что цепочка
хэшей ломается при подделке — реестр, который можно тихо переписать, хуже
отсутствия реестра, потому что создаёт ложную уверенность.
"""

from __future__ import annotations

import json
import random
import sys
from pathlib import Path

OUT = Path("/tmp/trace_test")
SHOTS, FRAMES = 5, 12


def main() -> int:
    from provenance import Ledger

    if OUT.exists():
        import subprocess
        subprocess.run(["rm", "-rf", str(OUT)], check=False)
    OUT.mkdir(parents=True, exist_ok=True)

    # Журнал серии: у каждого шота свой автор, свой сид, свой стиль.
    lg = Ledger(OUT / "provenance.jsonl")
    shots = []
    for i in range(1, SHOTS + 1):
        f0, f1 = (i - 1) * FRAMES + 1, i * FRAMES
        shots.append((f"sc{i:03d}", f0, f1))
        lg.record("human", f"artist{i % 2 + 1}", "drawing", "episode",
                  (f0, f1), [f"sc{i:03d}/parts"],
                  detail={"shot": f"sc{i:03d}"})
        lg.record("agent", "claude/craft", "curve_set", "episode", (f0, f1),
                  [f"sc{i:03d}/arm.rot"], seed=1000 + i,
                  style_of="anna.founder" if i % 2 else None)

    total = SHOTS * FRAMES
    print(f"episode: {SHOTS} shots, {total} frames, {len(list(lg.entries()))} ledger entries")

    if lg.verify() != []:
        print(f"FAIL: chain broken on a clean ledger: {lg.verify()}")
        return 1

    # Случайные кадры — не удобные.
    rng = random.Random(7)
    probes = rng.sample(range(1, total + 1), 8)
    bad = []
    for f in sorted(probes):
        r = lg.frame_report("episode", f)
        want_shot = next(n for n, a, b in shots if a <= f <= b)
        touches = {t["actor"] for t in r["touches"]}
        seeds = {t["seed"] for t in r["touches"] if t["seed"]}
        if r["verdict"] != "mixed":
            bad.append((f, f"verdict={r['verdict']}"))
        elif not any(a.startswith("artist") for a in touches):
            bad.append((f, "no human author"))
        elif not seeds:
            bad.append((f, "no seed recorded"))
        else:
            print(f"  f{f:03d} [{want_shot}] {r['verdict']:<8} "
                  f"by {sorted(touches)} seed={sorted(seeds)} "
                  f"style={r['styles_used'] or ['—']}")

    if bad:
        print(f"FAIL: frames without a full answer: {bad}")
        return 1

    # Свод по серии: сколько кадров какого происхождения.
    summary = lg.scene_summary("episode", total)
    print(f"  summary: {summary['breakdown']}, styles {summary['styles_used']}")
    if summary["breakdown"]["untracked"]:
        print(f"FAIL: {summary['breakdown']['untracked']} frames are untracked")
        return 1

    # Подделка обязана ломать цепочку.
    #
    # Дефект в САМОЙ этой проверке, стоивший одного ложного FAIL: я ставил
    # origin="human" в записи, которая уже была "human". Мутация не менялa
    # ничего, хэш совпадал, и проверка «подделка замечена» падала на
    # работающем реестре. Тест, который ничего не меняет и требует реакции,
    # всегда красный. Теперь подмена берётся из записи агента и проверяется
    # тем, что значение действительно другое.
    p = OUT / "provenance.jsonl"
    lines = p.read_text().splitlines()
    victim = next(i for i, l in enumerate(lines)
                  if json.loads(l)["origin"] == "agent")
    rec = json.loads(lines[victim])
    before = rec["origin"]
    rec["origin"] = "human"                       # агент выдаёт себя за человека
    assert rec["origin"] != before, "подделка ничего не изменила"
    lines[victim] = json.dumps(rec, sort_keys=True, separators=(",", ":"))
    p.write_text("\n".join(lines) + "\n")
    print(f"  tampered entry {victim}: origin {before} -> human")
    problems = Ledger(p).verify()
    print(f"  tamper check: {len(problems)} problem(s) reported")
    if not problems:
        print("FAIL: an edited record went unnoticed — the ledger can be rewritten "
              "silently, which is worse than having none")
        return 1

    print(f"PASS: every one of {len(probes)} random frames answers who/what/which seed; "
          f"tampering breaks the chain")
    return 0


if __name__ == "__main__":
    sys.exit(main())
