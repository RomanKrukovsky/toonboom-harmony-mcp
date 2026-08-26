"""Каталог библиотеки ригов: сводка по каждому .moho/.anime файлу."""
from __future__ import annotations

import json
import sys
import zipfile
from pathlib import Path

LIB = Path(__file__).resolve().parents[2] / "fixtures/rig_library"


def count_multi_key_channels(doc: dict) -> int:
    n = 0
    def walk(o):
        nonlocal n
        if isinstance(o, dict):
            if "when" in o and "val" in o and isinstance(o.get("when"), list) \
                    and len(o["when"]) > 1:
                n += 1
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
    walk(doc)
    return n


def summarize(path: Path) -> dict:
    try:
        with zipfile.ZipFile(path) as z:
            proj_name = "Project.mohoproj" if "Project.mohoproj" in z.namelist() \
                else "Project.animeproj"
            doc = json.loads(z.read(proj_name))
            members = z.namelist()
    except Exception as e:
        return {"file": path.name, "error": str(e)}

    types: dict[str, int] = {}
    bones_total = 0
    switches: list[str] = []
    switch_states = 0
    smart_bone_candidates = 0
    constraints_bones = 0
    images: list[str] = []

    def walk_layers(ls):
        nonlocal bones_total, switch_states, smart_bone_candidates, constraints_bones
        for l in ls:
            t = l.get("type", "?")
            types[t] = types.get(t, 0) + 1
            if t == "SwitchLayer":
                switches.append(l.get("name", ""))
                switch_states += len(l.get("layers", []))
            sk = l.get("skeleton")
            if sk:
                bones = sk.get("bones", [])
                bones_total += len(bones)
                for b in bones:
                    tb = b.get("target_bone", -1)
                    tb_idx = tb if isinstance(tb, int) else -1
                    if tb_idx >= 0 or b.get("ik_lock"):
                        smart_bone_candidates += 1
                    if b.get("constraints"):
                        constraints_bones += 1
            fr = l.get("fileref") or l.get("image_path") or ""
            if fr:
                images.append(Path(str(fr)).name)
            walk_layers(l.get("layers", []))

    walk_layers(doc.get("layers", []))
    return {
        "file": path.name,
        "version": doc.get("version"),
        "layers_total": sum(types.values()),
        "types": types,
        "bones": bones_total,
        "switches": f"{len(switches)} ({switch_states} сост.)",
        "smart_bone_hints": smart_bone_candidates,
        "constrained_bones": constraints_bones,
        "animated_channels": count_multi_key_channels(doc),
        "actions": len(doc.get("action_refs") or []),
        "images": len(images),
        "zip_members": len(members),
    }


def main() -> int:
    rows = []
    for p in sorted(LIB.rglob("*")):
        if p.suffix.lower() in (".moho", ".anime") and p.is_file():
            rows.append(summarize(p))
        elif p.is_dir():
            for q in sorted(p.rglob("*.moho")):
                rows.append(summarize(q))
    ok = [r for r in rows if "error" not in r]
    bad = [r for r in rows if "error" in r]
    out = LIB / "_catalog.json"
    out.write_text(json.dumps(rows, ensure_ascii=False, indent=1))
    print(f"Каталог: {out} ({len(ok)} ригов, {len(bad)} ошибок)\n")
    hdr = f"{'файл':38} {'вер':>5} {'сл':>4} {'кост':>4} {'свитчи':>10} {'smart':>5} {'аним':>4} {'дейст':>5} {'img':>3}"
    print(hdr)
    print("-" * len(hdr))
    for r in ok:
        print(f"{r['file'][:38]:38} {str(r['version']):>5} {r['layers_total']:>4} "
              f"{r['bones']:>4} {r['switches']:>10} {r['smart_bone_hints']:>5} "
              f"{r['animated_channels']:>4} {r['actions']:>5} {r['images']:>3}")
    for r in bad:
        print(f"ОШИБКА {r['file']}: {r['error'][:60]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
