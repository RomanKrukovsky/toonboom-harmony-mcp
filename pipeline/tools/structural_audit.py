"""Структурный ревизор: семантическое сравнение двух .moho файлов.

Ловит молчаливую порчу: то, что не падает, но делает не то.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from pipeline.moho.extract import load_mohoproj  # noqa: E402

ANGLE_TOL = 1e-4
POS_TOL = 1e-6


def _flatten_bones(doc: dict) -> dict:
    for layer in doc.get("layers", []):
        sk = layer.get("skeleton")
        if sk:
            return {b.get("name"): {
                "parent": (sk["bones"][b["parent"]].get("name") if b.get("parent", -1) >= 0 else None),
                "length": round(b.get("length", 0.0), 6),
                "pos": (round(b["anim_pos"]["val"][0]["x"], 6),
                        round(b["anim_pos"]["val"][0]["y"], 6)),
                "angle": round(float(b["anim_angle"]["val"][0]), 4),
                "strength": round(b.get("strength", 0.0), 6),
            } for b in sk.get("bones", [])}
    return {}


def _layer_signature(l: dict, depth: int = 0) -> list[tuple]:
    sig = [(depth, l.get("type"), l.get("name"), l.get("parent_bone"))]
    if l.get("type") == "SwitchLayer":
        sw = l.get("switch_keys", {})
        sig.append((depth, "switch_keys", tuple(sw.get("when", [])),
                    tuple(sw.get("val", []))))
    if l.get("type") == "MeshLayer":
        m = l.get("mesh", {})
        pts = m.get("points", [])
        coords = []
        for p in pts[:3] + pts[-3:] if len(pts) > 6 else pts:
            v = p["position"]["val"][0]
            coords.append((round(v["x"], 5), round(v["y"], 5)))
        sig.append((depth, "mesh", len(pts), tuple(coords)))
    for c in l.get("layers", []):
        sig.extend(_layer_signature(c, depth + 1))
    return sig


def _transform_signature(doc: dict) -> dict:
    out = {}
    def walk(ls, path):
        for l in ls:
            tr = l.get("transforms", {})
            for k, ch in sorted(tr.items()):
                if isinstance(ch, dict) and "when" in ch:
                    out[f"{path}/{l.get('name')}/{k}"] = (
                        tuple(ch.get("when", [])),
                        json.dumps(ch.get("val", []), sort_keys=True))
            walk(l.get("layers", []), f"{path}/{l.get('name')}")
    walk(doc.get("layers", []), "")
    return out


def _styles_signature(doc: dict) -> list:
    styles = doc.get("styles")
    if not isinstance(styles, list):
        return []
    sig = []
    for s in styles:
        if isinstance(s, dict):
            fill = s.get("fill") or {}
            sig.append((s.get("name"), json.dumps(fill, sort_keys=True)[:120]))
    return sig


def audit(path_a: str, path_b: str) -> tuple[bool, list[str]]:
    doc_a, _ = load_mohoproj(path_a)
    doc_b, _ = load_mohoproj(path_b)
    problems: list[str] = []

    bones_a, bones_b = _flatten_bones(doc_a), _flatten_bones(doc_b)
    if set(bones_a) != set(bones_b):
        problems.append(f"BONES: набор костей различается: "
                        f"только в A: {set(bones_a)-set(bones_b)}, "
                        f"только в B: {set(bones_b)-set(bones_a)}")
    for name in sorted(set(bones_a) & set(bones_b)):
        a, b = bones_a[name], bones_b[name]
        if a["parent"] != b["parent"]:
            problems.append(f"BONE {name}: parent {a['parent']} != {b['parent']}")
        if abs(a["length"] - b["length"]) > POS_TOL:
            problems.append(f"BONE {name}: length {a['length']} != {b['length']}")
        if abs(a["angle"] - b["angle"]) > ANGLE_TOL:
            problems.append(f"BONE {name}: angle {a['angle']} != {b['angle']}")
        if abs(a["pos"][0] - b["pos"][0]) > POS_TOL or abs(a["pos"][1] - b["pos"][1]) > POS_TOL:
            problems.append(f"BONE {name}: pos {a['pos']} != {b['pos']}")

    sig_a, sig_b = _layer_signature_layers(doc_a), _layer_signature_layers(doc_b)
    if sig_a != sig_b:
        only_a = [s for s in sig_a if s not in sig_b][:10]
        only_b = [s for s in sig_b if s not in sig_a][:10]
        problems.append(f"LAYER TREE: сигнатуры различаются; только в A: {only_a}; только в B: {only_b}")

    tr_a, tr_b = _transform_signature(doc_a), _transform_signature(doc_b)
    st_a, st_b = _styles_signature(doc_a), _styles_signature(doc_b)
    if st_a != st_b:
        problems.append(f"STYLES: палитра различается "
                        f"({len(st_a)} стилей в A vs {len(st_b)} в B) — "
                        f"это делает mesh невидимым или перекрашенным")
    if set(tr_a) != set(tr_b):
        problems.append(f"TRANSFORMS: набор каналов различается: "
                        f"только в A: {sorted(set(tr_a)-set(tr_b))[:5]}, "
                        f"только в B: {sorted(set(tr_b)-set(tr_a))[:5]}")
    for k in sorted(set(tr_a) & set(tr_b)):
        if tr_a[k] != tr_b[k]:
            problems.append(f"TRANSFORM {k}: значения различаются")
    return (len(problems) == 0, problems)


def _layer_signature_layers(doc: dict) -> list[tuple]:
    sig = []
    for l in doc.get("layers", []):
        sig.extend(_layer_signature(l))
    return sig


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("usage: structural_audit.py <a.moho> <b.moho>")
        sys.exit(2)
    ok, problems = audit(sys.argv[1], sys.argv[2])
    if ok:
        print("STRUCTURAL AUDIT: PASS — структура идентична "
              "(кости, дерево слоёв, mesh, switch, transforms)")
        sys.exit(0)
    print(f"STRUCTURAL AUDIT: FAIL — {len(problems)} расхождений:")
    for p in problems[:40]:
        print("  -", p)
    sys.exit(1)
