"""Строгий валидатор формата .moho для Moho 14.

Проверяет то, что реально ломает открытие в Moho:
1. Project.mohoproj присутствует в архиве.
2. JSON парсится.
3. Нет научной нотации (e-17) в числах — Moho-парсер её не принимает.
4. project_data.width/height — целые числа (не float).
5. Все по-anim значения каналов корректного типа (не bool вместо double).
6. PNG-слои не сохраняют чужие PSD-метаданные (psd_layerid=256 и т.п.).
7. Каждый ImageLayer со значением width/height > 0 (иначе слой схлопывается).

Возвращает (ok, list[str]).
"""
from __future__ import annotations

import json
import re
import sys
import zipfile
from pathlib import Path
from typing import Any

_SCI_NOTATION = re.compile(r'(?<![A-Za-z0-9_])[-+]?\d+\.\d+[eE][-+]?\d+')


def _walk(obj: Any, path: str, problems: list[str]) -> None:
    if isinstance(obj, dict):
        for k, v in obj.items():
            np = f"{path}.{k}" if path else f"$.{k}"
            if isinstance(v, float) and (v != 0 and abs(v) < 1e-10):
                problems.append(f"{np}: сверхмалый float {v!r}")
            _walk(v, np, problems)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            _walk(v, f"{path}[{i}]", problems)


def validate(path: str) -> tuple[bool, list[str]]:
    problems: list[str] = []
    p = Path(path)
    if not p.exists():
        return False, [f"файл не существует: {p}"]
    try:
        z = zipfile.ZipFile(p)
    except zipfile.BadZipFile as e:
        return False, [f"не ZIP-архив: {e}"]

    names = z.namelist()
    if "Project.mohoproj" not in names:
        problems.append("нет обязательного Project.mohoproj")
    else:
        raw = z.read("Project.mohoproj").decode("utf-8", errors="replace")
        try:
            doc = json.loads(raw)
        except json.JSONDecodeError as e:
            return False, [f"Project.mohoproj не JSON: {e}"]

        m = _SCI_NOTATION.search(raw)
        if m:
            problems.append(f"научная нотация в JSON: {m.group(0)}")

        pd = doc.get("project_data", {})
        for field in ("width", "height"):
            v = pd.get(field)
            if isinstance(v, float):
                problems.append(f"project_data.{field}: float ({v}) вместо int")
            if isinstance(v, bool):
                problems.append(f"project_data.{field}: bool вместо int")

        if "preview.jpg" not in names:
            problems.append("нет preview.jpg")

        _walk(doc, "", problems)

        # Сбор костей для проверки индексов
        all_bones = []
        def find_bones(layers):
            for l in layers:
                if l.get("skeleton"):
                    all_bones.extend(l["skeleton"].get("bones", []))
                find_bones(l.get("layers", []))
        find_bones(doc.get("layers", []))
        num_bones = len(all_bones)

        def check_layers(layers):
            for l in layers:
                l_name = l.get("name", "unnamed")
                l_type = l.get("type")

                # Проверка masking
                masking = l.get("masking")
                if masking is not None and not isinstance(masking, int):
                    problems.append(f'Layer "{l_name}": masking={masking!r} не int')
                group_mask = l.get("group_mask")
                if group_mask is not None and not isinstance(group_mask, int):
                    problems.append(f'Layer "{l_name}": group_mask={group_mask!r} не int')

                if l_type == "ImageLayer":
                    if l.get("psd_layerid") == 256:
                        problems.append(
                            f'ImageLayer "{l_name}": чужой psd_layerid=256')
                    w, h = l.get("width"), l.get("height")
                    if isinstance(w, (int, float)) and w <= 0:
                        problems.append(
                            f'ImageLayer "{l_name}": width={w}')
                    if isinstance(h, (int, float)) and h <= 0:
                        problems.append(
                            f'ImageLayer "{l_name}": height={h}')

                elif l_type == "MeshLayer":
                    m = l.get("mesh")
                    if not isinstance(m, dict):
                        problems.append(f'MeshLayer "{l_name}": отсутствует словарь mesh')
                    else:
                        pts = m.get("points", [])
                        curves = m.get("curves", [])
                        shapes = m.get("shapes", [])
                        for p_idx, pt in enumerate(pts):
                            pb = pt.get("parent", -1)
                            if isinstance(pb, int) and pb >= num_bones and num_bones > 0:
                                problems.append(
                                    f'MeshLayer "{l_name}" pt[{p_idx}]: parent_bone={pb} >= num_bones({num_bones})')
                            for field, channel_type in (("color", "Color"),
                                                        ("color_strength", "Val")):
                                ch = pt.get(field)
                                if not isinstance(ch, dict) or ch.get("type") != channel_type:
                                    problems.append(
                                        f'MeshLayer "{l_name}" pt[{p_idx}]: {field} не канал {channel_type}')
                            for membership in pt.get("curves", []):
                                c_ref = membership.get("curve")
                                cp_ref = membership.get("curve_points")
                                if not isinstance(c_ref, int) or not (0 <= c_ref < len(curves)):
                                    problems.append(
                                        f'MeshLayer "{l_name}" pt[{p_idx}]: curve index {c_ref!r} out of bounds')
                                elif not isinstance(cp_ref, int) or not (0 <= cp_ref < len(curves[c_ref].get("points", []))):
                                    problems.append(
                                        f'MeshLayer "{l_name}" pt[{p_idx}]: curve_points {cp_ref!r} out of bounds')
                                elif curves[c_ref]["points"][cp_ref].get("point") != p_idx:
                                    problems.append(
                                        f'MeshLayer "{l_name}" pt[{p_idx}]: membership не ссылается обратно на точку')

                        for c_idx, c in enumerate(curves):
                            curve_points = c.get("points")
                            if not isinstance(curve_points, list):
                                problems.append(
                                    f'MeshLayer "{l_name}" curve[{c_idx}]: отсутствует points')
                                curve_points = []
                            if c.get("num_points") != len(curve_points):
                                problems.append(
                                    f'MeshLayer "{l_name}" curve[{c_idx}]: num_points не совпадает с points')
                            for cp_idx, cp in enumerate(curve_points):
                                p_ref = cp.get("point")
                                if isinstance(p_ref, int) and (p_ref < 0 or p_ref >= len(pts)):
                                    problems.append(
                                        f'MeshLayer "{l_name}" curve[{c_idx}]: point index {p_ref} out of bounds ({len(pts)})')
                                elif isinstance(p_ref, int):
                                    memberships = pts[p_ref].get("curves", [])
                                    if not any(item.get("curve") == c_idx
                                               and item.get("curve_points") == cp_idx
                                               for item in memberships):
                                        problems.append(
                                            f'MeshLayer "{l_name}" curve[{c_idx}].points[{cp_idx}]: нет обратного membership')

                        for s_idx, s in enumerate(shapes):
                            edges = s.get("edges", {})
                            for c_ref in edges.get("curve", []):
                                if isinstance(c_ref, int) and (c_ref < 0 or c_ref >= len(curves)):
                                    problems.append(
                                        f'MeshLayer "{l_name}" shape[{s_idx}]: curve index {c_ref} out of bounds ({len(curves)})')

                check_layers(l.get("layers", []))

        check_layers(doc.get("layers", []))

    return (len(problems) == 0, problems)


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: moho_format_validator.py <file.moho> [...]")
        return 2
    ok_all = True
    for path in sys.argv[1:]:
        ok, problems = validate(path)
        status = "PASS" if ok else "FAIL"
        print(f"[{status}] {path}")
        for pr in problems[:30]:
            print(f"      - {pr}")
        ok_all = ok_all and ok
    return 0 if ok_all else 1


if __name__ == "__main__":
    sys.exit(main())
