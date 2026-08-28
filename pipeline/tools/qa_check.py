"""Структурная QA рига — секция 1 MOHO_RIG_QA_STANDARD_V1.

Проверки: binding_mode=1, части внутри корневой группы, диалы с экшенами,
свитчи с состояниями, висячие связи диал→свитч, имена костей, constraints.
Вердикт: PASS / WARN / FAIL (любой FAIL отменяет годность).
Вход: .pir.json | .moho | PIR-объект.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO))

from pipeline.moho.extract import extract_from_file  # noqa: E402
from pipeline.pir.schema import Rig, load_from_file  # noqa: E402

UNNAMED_RE = re.compile(r"^(bone_\d+|B\d+)$")
CONTROL_RE = re.compile(r"(switch|dial|rol|bend|squash|order)", re.IGNORECASE)


def _walk(parts):
    for p in parts:
        yield p
        yield from _walk(p.children)


def _is_bound(part, bone_count: int) -> bool:
    if part.bone is not None or part.parent_bone_raw >= 0:
        return True
    if part.type != "mesh" or not part.geometry_raw:
        return False
    return any(isinstance(point.get("parent"), int)
               and 0 <= point.get("parent", -1) < bone_count
               for point in part.geometry_raw.get("points", []))


def qa_rig(rig: Rig) -> tuple[str, list[str]]:
    fails: list[str] = []
    warns: list[str] = []

    roots = rig.root_parts
    if len(roots) == 0:
        fails.append("нет корневых слоёв")
    elif len(roots) > 1:
        warns.append(f"мультикорневая структура ({len(roots)} корней) — "
                     "встречается в эталонах, но нестандартна")
    elif roots[0].type != "bone_container":
        warns.append(f"единственный корень типа {roots[0].type}, "
                     "стандарт — bone_container")

    all_parts = list(rig.walk_parts())
    dials = [b for b in rig.bones if b.dial_actions]
    dial_action_names = {a["name"] for b in dials for a in b.dial_actions}

    bm = rig.extras.get("binding_mode", 1)
    if bm not in (1, 2):
        fails.append(f"binding_mode={bm}, допустимы 1 (авто) и 2 (явный)")
    if bm == 2:
        bound = [p for p in all_parts
                  if p.type in ("image", "mesh")
                  and not _is_bound(p, len(rig.bones))]
        if bound:
            warns.append(f"binding_mode=2, но {len(bound)} частей без явной "
                         "кости — в mode=2 они не деформируются")

    switches = [p for p in all_parts if p.type == "switch"]
    for sw in switches:
        if not sw.switch_states:
            fails.append(f"свитч '{sw.name}' без состояний")
    for p in all_parts:
        for sa in (p.switch_dial_actions or []):
            nm = sa.get("name", "")
            if nm and nm not in dial_action_names:
                warns.append(f"висячая связь: свитч '{p.name}' ждёт диал-экшен "
                             f"'{nm}', такого диала нет")

    flexi_ids = {b.id for b in rig.bones if b.is_flexi_endpoint}
    unnamed = [b.id for b in rig.bones
               if UNNAMED_RE.match(b.id) and b.id not in flexi_ids]
    if unnamed:
        warns.append(f"безымянных костей вне деформерных цепочек: "
                     f"{len(unnamed)} ({', '.join(unnamed[:4])}...)")
    for b in rig.bones:
        if b.dial_actions is not None and len(b.dial_actions) == 0:
            fails.append(f"диал-кость '{b.id}' без actions")
        if b.dial_actions and CONTROL_RE.search(b.id) and not b.constraints:
            warns.append(f"контроллер-диал '{b.id}' без constraints — "
                         "аниматор может вывернуть диапазон")

    n_img = sum(1 for p in all_parts if p.type == "image")
    n_mesh = sum(1 for p in all_parts if p.type == "mesh")
    if bm == 1:
        unbound = []
    else:
        unbound = [p.name for p in all_parts
                   if p.type in ("image", "mesh")
                   and not _is_bound(p, len(rig.bones))]
    if unbound:
        warns.append(f"части без кости: {unbound[:5]}")

    verdict = "FAIL" if fails else ("WARN" if warns else "PASS")
    summary = (f"{rig.name}: bones={len(rig.bones)} dials={len(dials)} "
               f"switches={len(switches)} meshes={n_mesh} images={n_img} links={len(rig.dial_links)}")
    lines = [summary] + [f"FAIL {m}" for m in fails] + [f"WARN {m}" for m in warns]
    return verdict, lines


def qa_file(path: str) -> tuple[str, list[str]]:
    p = Path(path)
    if p.suffix == ".moho" or p.suffix == ".anime":
        return qa_rig(extract_from_file(str(p)))
    if p.suffix == ".json":
        return qa_rig(load_from_file(str(p)))
    raise ValueError(f"неизвестный формат: {p}")


def main(argv: list[str]) -> int:
    targets = argv[1:] or sorted(
        str(x) for x in (REPO / "fixtures/rig_library/pir_v1").glob("*.pir.json"))
    tally: dict[str, int] = {"PASS": 0, "WARN": 0, "FAIL": 0}
    for t in targets:
        try:
            verdict, lines = qa_file(t)
        except Exception as e:
            verdict, lines = "FAIL", [f"{Path(t).name}: ERROR {e}"]
        tally[verdict] += 1
        print(f"[{verdict}] {Path(t).name}")
        for line in lines:
            print(f"    {line}")
    print(f"\nИтог: PASS={tally['PASS']} WARN={tally['WARN']} FAIL={tally['FAIL']}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
