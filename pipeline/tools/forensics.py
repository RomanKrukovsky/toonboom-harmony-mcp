"""Глубокая криминалистика референс-ригов: структура, кости, биндинг,
смарт-диалы, свитчи, маски, z-order, соглашения имён.

Результат: fixtures/rig_library/forensics/<имя>.json — по ригу на файл.
"""
from __future__ import annotations

import json
import re
import sys
import zipfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
LIB = REPO / "fixtures/rig_library"
OUT = LIB / "forensics"

DIAL_NAME_RE = re.compile(
    r"(switch|squash|bend|rol|order|dial|turn|angle|jaw|brow|eye|mouth|head|"
    r"foot|hand|leg|skirt|jacket|sort|up.?midl|pupil)", re.I)


def layer_entry(l: dict) -> dict:
    e = {
        "name": l.get("name", ""),
        "type": l.get("type"),
        "visible": l.get("visible", True),
        "parent_bone": l.get("parent_bone", -1),
        "origin": l.get("origin"),
        "masking": l.get("masking"),
        "blend_mode": l.get("blend_mode"),
        "expanded": l.get("expanded"),
    }
    if l.get("type") == "SwitchLayer":
        sk = l.get("switch_keys", {})
        e["switch_states"] = [c.get("name") for c in l.get("layers", [])]
        e["switch_when"] = sk.get("when", [])
        e["switch_val"] = sk.get("val", [])
        e["switch_actions"] = [
            {"name": a.get("name"),
             "when": a.get("pose", {}).get("when", []),
             "val": a.get("pose", {}).get("val", [])}
            for a in (sk.get("actions") or [])]
    if l.get("type") == "ImageLayer":
        e["image_path"] = l.get("image_path")
    if l.get("mesh"):
        m = l["mesh"]
        e["mesh_points"] = len(m.get("points", []))
        e["mesh_shapes"] = len(m.get("shapes", []))
    return e


def bone_entry(b: dict) -> dict:
    aa = b.get("anim_angle", {})
    acts = aa.get("actions") or []
    return {
        "name": b.get("name"),
        "parent": b.get("parent", -1),
        "length": round(b.get("length", 0), 4),
        "strength": round(b.get("strength", 0), 4),
        "constraints": b.get("constraints", False),
        "min": round(b.get("min_constraint", 0), 4),
        "max": round(b.get("max_constraint", 0), 4),
        "target_bone": b.get("target_bone", -1)
        if isinstance(b.get("target_bone"), int) else -1,
        "ik_lock": b.get("ik_lock", False),
        "flexi_elbow": b.get("flexi_bone_elbow", False),
        "dynamics": (b.get("bone_dynamics", {}).get("val", [False])[0]
                     if isinstance(b.get("bone_dynamics"), dict) else False),
        "dial": {"when": aa.get("when", []),
                 "val": [round(v, 3) if isinstance(v, (int, float)) else v
                         for v in aa.get("val", [])],
                 "actions": [{"name": a.get("name"),
                              "poses": len(a.get("pose", {}).get("when", [])),
                              "min": min(a.get("pose", {}).get("val", [0])
                                         or [0]),
                              "max": max(a.get("pose", {}).get("val", [0])
                                         or [0])}
                             for a in acts]},
    }


def analyze(path: Path) -> dict:
    with zipfile.ZipFile(path) as z:
        proj = "Project.mohoproj" if "Project.mohoproj" in z.namelist() \
            else "Project.animeproj"
        doc = json.loads(z.read(proj))

    out = {
        "id": None,
        "file": path.name,
        "version": doc.get("version"),
        "project": {"w": doc.get("project_data", {}).get("width"),
                    "h": doc.get("project_data", {}).get("height"),
                    "fps": doc.get("project_data", {}).get("fps"),
                    "end_frame": doc.get("project_data", {}).get("end_frame")},
    }

    # Полное дерево слоёв (компактное)
    tree = []
    def walk_tree(ls, depth):
        for l in ls:
            tree.append({"d": depth, **layer_entry(l)})
            walk_tree(l.get("layers", []), depth + 1)
    walk_tree(doc.get("layers", []), 0)
    out["layer_tree"] = tree
    out["layers_total"] = len(tree)

    # Скелеты
    skeletons = []
    def walk_sk(ls, path=""):
        for l in ls:
            if l.get("skeleton"):
                sk = l["skeleton"]
                skeletons.append({
                    "layer_path": path + "/" + str(l.get("name")),
                    "binding_mode": sk.get("binding_mode"),
                    "bones": [bone_entry(b) for b in sk.get("bones", [])],
                })
            walk_sk(l.get("layers", []), path + "/" + str(l.get("name")))
    walk_sk(doc.get("layers", []))
    out["skeletons"] = skeletons

    # Сводка костей
    all_bones = [b for s in skeletons for b in s["bones"]]
    out["bones_total"] = len(all_bones)
    out["bones_constrained"] = sum(1 for b in all_bones if b["constraints"])
    out["bones_ik"] = sum(1 for b in all_bones if b["ik_lock"])
    out["bones_dials"] = sum(1 for b in all_bones if b["dial"]["actions"])
    out["bones_dynamics"] = sum(1 for b in all_bones if b["dynamics"])
    out["binding_modes"] = sorted({s["binding_mode"] for s in skeletons
                                   if s["binding_mode"] is not None})

    # Диалы -> управляемые свитчи (связь по имени action)
    dial_links = []
    dial_names = {a["name"] for b in all_bones for a in b["dial"]["actions"]}
    for e in tree:
        for a in e.get("switch_actions", []):
            if a["name"] in dial_names:
                dial_links.append({"switch": e["name"],
                                   "dial": a["name"],
                                   "states": e.get("switch_states"),
                                   "pose_when": a["when"],
                                   "pose_val": a["val"]})
    out["dial_switch_links"] = dial_links

    # Анимация: слои с мультиключевыми каналами
    anim_layers = []
    def walk_anim(ls, path=""):
        for l in ls:
            chans = [k for k, v in l.get("transforms", {}).items()
                     if isinstance(v, dict) and len(v.get("when", [])) > 1]
            if chans:
                anim_layers.append({"layer": l.get("name"), "channels": chans,
                                    "keys": {c: len(l["transforms"][c]["when"])
                                             for c in chans}})
            walk_anim(l.get("layers", []), path + "/" + str(l.get("name")))
    walk_anim(doc.get("layers", []))
    out["animated_layers"] = anim_layers
    out["actions_doc"] = doc.get("action_refs") or []

    # Маски
    out["masked_layers"] = [
        {"name": e["name"], "masking": e["masking"]}
        for e in tree if e.get("masking") not in (None, 0, False)]

    # Именные конвенции костей
    names = [b["name"] for b in all_bones if b["name"]]
    words = {}
    for n in names:
        for w in re.split(r"[\s_]+", n):
            w = w.lower().strip()
            if w and not re.fullmatch(r"b\d+|main|\d+", w):
                words[w] = words.get(w, 0) + 1
    out["bone_name_vocabulary"] = dict(sorted(words.items(),
                                              key=lambda x: -x[1])[:40])
    return out


def main() -> int:
    OUT.mkdir(exist_ok=True)
    rows = []
    files = sorted(LIB.glob("*.moho")) + sorted(LIB.glob("*.anime"))
    for i, p in enumerate(files, 1):
        try:
            r = analyze(p)
            r["id"] = f"RIG_{i:03d}"
            (OUT / (p.stem + ".forensics.json")).write_text(
                json.dumps(r, ensure_ascii=False, indent=1))
            rows.append(r)
            print(f"{r['id']} {p.name[:34]:34} слоёв {r['layers_total']:4} "
                  f"костей {r['bones_total']:4} диалов {r['bones_dials']:3} "
                  f"связей диал-свитч {len(r['dial_switch_links']):3} "
                  f"анимир.слоёв {len(r['animated_layers']):3} "
                  f"масок {len(r['masked_layers']):2}")
        except Exception as e:
            print(f"FAIL {p.name}: {str(e)[:70]}")
    print(f"\nитого: {len(rows)} форензик-отчётов в {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
