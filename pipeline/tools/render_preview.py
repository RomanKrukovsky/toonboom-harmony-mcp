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
    by_idx = {}
    # world-позиции через anim_pos + parent
    world: dict[int, tuple[float, float]] = {}
    ang: dict[int, float] = {}
    for i, b in enumerate(bones):
        idx = i
        parent = b.get("parent", -1)
        # anim_pos val[0] в локальных координатах кости
        pval = b.get("anim_pos", {}).get("val", [{}])
        local = (pval[0].get("x", 0.0), pval[0].get("y", 0.0))
        aval = b.get("anim_angle", {}).get("val", [0.0])
        a = aval[0] if isinstance(aval, list) else 0.0
        if parent < 0:
            world[idx] = local
            ang[idx] = a
        else:
            pw = world[parent]
            pa = ang[parent]
            cos_a, sin_a = math.cos(pa), math.sin(pa)
            # локальная -> мировая: поворот на +pa
            wx = pw[0] + local[0] * cos_a - local[1] * sin_a
            wy = pw[1] + local[0] * sin_a + local[1] * cos_a
            world[idx] = (wx, wy)
            ang[idx] = pa + a
        by_idx[b.get("name")] = (world[idx][0], world[idx][1], ang[idx])
    return by_idx


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


def _render_mesh_layer(mesh: dict, width: float, height: float, D: float = 72.0) -> Image.Image | None:
    """Отрисовка векторного MeshLayer в PIL Image."""
    from PIL import ImageDraw
    pts = mesh.get("points", [])
    if not pts:
        return None
    
    layer_img = Image.new("RGBA", (int(width), int(height)), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer_img)

    def to_px(mx, my):
        px = (mx + width / (2 * D)) * D
        py = (height / (2 * D) - my) * D
        return (px, py)

    pt_coords = [to_px(p.get("position", {}).get("val", [{}])[0].get("x", 0.0),
                       p.get("position", {}).get("val", [{}])[0].get("y", 0.0))
                 for p in pts]

    curves = mesh.get("curves", [])
    shapes = mesh.get("shapes", [])

    for s in shapes:
        edges = s.get("edges", {})
        c_refs = edges.get("curve", [])
        if not c_refs:
            continue
        c_idx = c_refs[0]
        if c_idx >= len(curves):
            continue
        c = curves[c_idx]
        poly = [pt_coords[cp["point"]] for cp in c.get("curve_points", []) if cp.get("point") < len(pt_coords)]
        if len(poly) < 2:
            continue

        st = s.get("style", {})
        fc = st.get("fill_color", {}).get("val", [{}])[0]
        lc = st.get("line_color", {}).get("val", [{}])[0]
        fill_rgba = (int(fc.get("r", 0) * 255), int(fc.get("g", 0) * 255),
                     int(fc.get("b", 0) * 255), int(fc.get("a", 1.0) * 255)) if s.get("has_fill") else None
        line_rgba = (int(lc.get("r", 0) * 255), int(lc.get("g", 0) * 255),
                     int(lc.get("b", 0) * 255), int(lc.get("a", 1.0) * 255)) if s.get("has_outline") else None
        l_width = max(int(st.get("line_width", 0.005) * D), 1)

        if s.get("has_fill") and len(poly) >= 3 and fill_rgba:
            d.polygon(poly, fill=fill_rgba)
        if s.get("has_outline") and line_rgba:
            if c.get("closed", True) and len(poly) >= 3:
                d.line(poly + [poly[0]], fill=line_rgba, width=l_width, joint="curve")
            else:
                d.line(poly, fill=line_rgba, width=l_width, joint="curve")

    return layer_img


def render(doc: dict, image_path: Path, out: Path,
           width: float = 400, height: float = 600) -> None:
    bws = bone_worlds(doc)
    # имя кости -> индекс (чтобы сопоставить parent_bone)
    sk = next((l.get("skeleton") for l in doc.get("layers", [])
               if l.get("skeleton")), None)
    name_by_idx = {i: b.get("name") for i, b in enumerate(sk["bones"])} if sk else {}

    D = 72.0
    canvas = Image.new("RGBA", (int(width), int(height)),
                       (int(height * 0.85), int(height * 0.9), int(height * 0.86), 255))
    # список (z, img, center_px) в порядке обхода
    comps: list[tuple[int, Image.Image, tuple[float, float] | None]] = []
    counter = [0]

    def click(layer: dict):
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
            m_img = _render_mesh_layer(layer.get("mesh", {}), width, height, D)
            if m_img:
                comps.append((z, m_img, None))

        for child in layer.get("layers", []):
            # SwitchLayer: показываем только активное состояние (кадр 0)
            if layer.get("type") == "SwitchLayer":
                active = layer.get("switch_keys", {}).get("val", [None])[0]
                if child.get("name") != active:
                    continue
            click(child)

    for layer in doc.get("layers", []):
        click(layer)

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
