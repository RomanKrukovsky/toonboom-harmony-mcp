"""Достоверный рендер .moho так, как его разложит Moho.

Собирает bone-world трансформы из скелета, накладывает image-слои
(центр = bone_root_world + R(bone_abs_angle) * translation) в z-порядке.
Это локальный «tight loop»: картинка == то, что увидит Moho на кадре 0,
без скриншота приложения.
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO))

from pipeline.moho.extract import load_mohoproj  # noqa: E402


def bone_worlds(doc: dict) -> dict[str, tuple[float, float, float]]:
    """name -> (x, y, abs_angle) в координатах Moho, кадр 0."""
    sk = next((l.get("skeleton") for l in doc.get("layers", [])
               if l.get("skeleton")), None)
    if not sk:
        return {}
    bones = sk["bones"]
    worlds_by_name = {}
    world: dict[int, tuple[float, float]] = {}
    ang: dict[int, float] = {}

    def scalar(value, default=0.0):
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, dict):
            return float(value.get("v", default))
        return default

    def solve(idx: int, visiting: set[int]) -> None:
        if idx in world:
            return
        if idx in visiting:
            raise ValueError(f"цикл в иерархии костей у индекса {idx}")
        visiting.add(idx)
        b = bones[idx]
        parent = b.get("parent", -1)
        pval = b.get("anim_pos", {}).get("val", [{}])
        local = (pval[0].get("x", 0.0), pval[0].get("y", 0.0))
        aval = b.get("anim_angle", {}).get("val", [0.0])
        a = scalar(aval[0]) if isinstance(aval, list) and aval else 0.0
        if parent < 0:
            world[idx] = local
            ang[idx] = a
        else:
            solve(parent, visiting)
            pw = world[parent]
            pa = ang[parent]
            cos_a, sin_a = math.cos(pa), math.sin(pa)
            wx = pw[0] + local[0] * cos_a - local[1] * sin_a
            wy = pw[1] + local[0] * sin_a + local[1] * cos_a
            world[idx] = (wx, wy)
            ang[idx] = pa + a
        visiting.remove(idx)

    for i, b in enumerate(bones):
        solve(i, set())
        worlds_by_name[b.get("name")] = (world[i][0], world[i][1], ang[i])
    return worlds_by_name


def _layer_image(layer: dict, image_path: Path) -> Image.Image | None:
    ref = layer.get("image_fileref", {}).get("path") or layer.get("image_path")
    if not ref:
        return None
    p = Path(ref)
    if not p.is_absolute():
        p = image_path.parent / p
    if not p.exists():
        return None
    return Image.open(p).convert("RGBA")


def _render_mesh_layer(width: float, height: float, layer: dict,
                       bone_world: tuple[float, float, float] | None,
                       D: float = 72.0) -> Image.Image | None:
    """Отрисовка векторного MeshLayer в PIL Image."""
    from PIL import ImageDraw
    mesh = layer.get("mesh", {})
    pts = mesh.get("points", [])
    if not pts:
        return None
    
    layer_img = Image.new("RGBA", (int(width), int(height)), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer_img)

    transforms = layer.get("transforms", {})
    translation = transforms.get("translation", {}).get("val", [{}])
    scale = transforms.get("scale", {}).get("val", [{}])
    rotation = transforms.get("rotation_z", {}).get("val", [0.0])
    t = translation[0] if translation else {}
    scale_value = scale[0] if scale else {}
    tx, ty = t.get("x", 0.0), t.get("y", 0.0)
    sx, sy = scale_value.get("x", 1.0), scale_value.get("y", 1.0)
    layer_angle = rotation[0] if rotation else 0.0

    def to_px(mx, my):
        mx, my = mx * sx, my * sy
        cos_l, sin_l = math.cos(layer_angle), math.sin(layer_angle)
        lx = tx + mx * cos_l - my * sin_l
        ly = ty + mx * sin_l + my * cos_l
        if bone_world:
            bx, by, ba = bone_world
            cos_b, sin_b = math.cos(ba), math.sin(ba)
            mx = bx + lx * cos_b - ly * sin_b
            my = by + lx * sin_b + ly * cos_b
        else:
            mx, my = lx, ly
        px = (mx + width / (2 * D)) * D
        py = (height / (2 * D) - my) * D
        return (px, py)

    pt_coords = [to_px(p.get("position", {}).get("val", [{}])[0].get("x", 0.0),
                       p.get("position", {}).get("val", [{}])[0].get("y", 0.0))
                 for p in pts]

    curves = mesh.get("curves", [])
    shapes = mesh.get("shapes", [])

    for shape in shapes:
        edges = shape.get("edges", {})
        c_refs = edges.get("curve", [])
        if not c_refs:
            continue
        st = shape.get("style", {})
        fc = st.get("fill_color", {}).get("val", [{}])[0]
        lc = st.get("line_color", {}).get("val", [{}])[0]
        fill_rgba = (int(fc.get("r", 0) * 255), int(fc.get("g", 0) * 255),
                     int(fc.get("b", 0) * 255), int(fc.get("a", 1.0) * 255)) if shape.get("has_fill") else None
        line_rgba = (int(lc.get("r", 0) * 255), int(lc.get("g", 0) * 255),
                     int(lc.get("b", 0) * 255), int(lc.get("a", 1.0) * 255)) if shape.get("has_outline") else None
        l_width = max(int(st.get("line_width", 0.005) * D), 1)

        boundary = []
        segments = edges.get("segment", [])
        flags = edges.get("flag", [])
        for edge_idx, c_idx in enumerate(c_refs):
            if not isinstance(c_idx, int) or not (0 <= c_idx < len(curves)):
                continue
            c = curves[c_idx]
            curve_points = c.get("points", [])
            if len(curve_points) < 2:
                continue
            segment = segments[edge_idx] if edge_idx < len(segments) else 0
            if not isinstance(segment, int) or not (0 <= segment < len(curve_points)):
                continue
            next_segment = (segment + 1) % len(curve_points)
            if not c.get("closed", True) and next_segment == 0:
                continue
            pair = [curve_points[segment].get("point"),
                    curve_points[next_segment].get("point")]
            if edge_idx < len(flags) and flags[edge_idx]:
                pair.reverse()
            if not all(isinstance(i, int) and 0 <= i < len(pt_coords) for i in pair):
                continue
            segment_points = [pt_coords[pair[0]], pt_coords[pair[1]]]
            if boundary and boundary[-1] == segment_points[0]:
                boundary.append(segment_points[1])
            else:
                boundary.extend(segment_points)

        boundary_closed = len(boundary) >= 3 and boundary[0] == boundary[-1]
        if shape.get("has_fill") and boundary_closed and fill_rgba:
            d.polygon(boundary, fill=fill_rgba)
        if shape.get("has_outline") and len(boundary) >= 2 and line_rgba:
            d.line(boundary, fill=line_rgba, width=l_width, joint="curve")

    return layer_img


def render(doc: dict, image_path: Path, out: Path,
           width: float = 400, height: float = 600) -> None:
    bws = bone_worlds(doc)
    # имя кости -> индекс (чтобы сопоставить parent_bone)
    sk = next((l.get("skeleton") for l in doc.get("layers", [])
               if l.get("skeleton")), None)
    name_by_idx = {i: b.get("name") for i, b in enumerate(sk["bones"])} if sk else {}

    D = 72.0
    canvas = Image.new("RGBA", (int(width), int(height)), (235, 238, 242, 255))
    # список (z, img, center_px) в порядке обхода
    comps: list[tuple[int, Image.Image, tuple[float, float] | None]] = []
    counter = [0]

    def collect_layer(layer: dict):
        counter[0] += 1
        z = counter[0]
        if layer.get("type") == "ImageLayer":
            img = _layer_image(layer, image_path)
            if img:
                pb = layer.get("parent_bone", -1)
                bone = name_by_idx.get(pb) if pb >= 0 else None
                bws_v = bws.get(bone) if bone else None
                tr = layer.get("transforms", {}).get("translation", {}).get("val", [{}])
                tval = tr[0] if tr else {}
                tx, ty = tval.get("x", 0.0), tval.get("y", 0.0)
                if bws_v:
                    bx, by, ba = bws_v
                    c = bx + tx * math.cos(ba) - ty * math.sin(ba)
                    cy = by + tx * math.sin(ba) + ty * math.cos(ba)
                else:
                    c, cy = tx, ty
                # moho -> px
                px = (c + width / (2 * D)) * D
                py = (height / (2 * D) - cy) * D
                comps.append((z, img, (px, py)))
        elif layer.get("type") == "MeshLayer":
            pb = layer.get("parent_bone", -1)
            bone = name_by_idx.get(pb) if pb >= 0 else None
            m_img = _render_mesh_layer(width, height, layer,
                                       bws.get(bone) if bone else None, D)
            if m_img:
                comps.append((z, m_img, None))

        for child in layer.get("layers", []):
            # SwitchLayer: показываем только активное состояние (кадр 0)
            if layer.get("type") == "SwitchLayer":
                active = layer.get("switch_keys", {}).get("val", [None])[0]
                if child.get("name") != active:
                    continue
            collect_layer(child)

    for layer in doc.get("layers", []):
        collect_layer(layer)

    comps.sort(key=lambda t: t[0])
    for _z, img, pos in comps:
        if pos is not None:
            canvas.alpha_composite(img, (int(pos[0] - img.width / 2),
                                         int(pos[1] - img.height / 2)))
        else:
            canvas.alpha_composite(img, (0, 0))

    canvas.convert("RGB").save(out)
    print(f"render: {out}, layers={len(comps)}")


def main() -> int:
    if len(sys.argv) < 3:
        print("usage: render_preview.py <file.moho> <out.png> [w] [h]")
        return 2
    file = Path(sys.argv[1])
    out = Path(sys.argv[2])
    w = float(sys.argv[3]) if len(sys.argv) > 3 else 400
    h = float(sys.argv[4]) if len(sys.argv) > 4 else 600
    doc, _ = load_mohoproj(str(file))
    pds = doc.get("project_data", {})
    render(doc, file, out, pds.get("width", w), pds.get("height", h))
    return 0


if __name__ == "__main__":
    sys.exit(main())
