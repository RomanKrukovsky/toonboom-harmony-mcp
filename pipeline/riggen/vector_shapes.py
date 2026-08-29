"""Генератор нативной векторной геометрии (Безье-контуры, шейпы) для Moho MeshLayer.

Создаёт валидные структуры mesh:
  - points: массивы точек с координатами, толщиной, привязкой к костям (parent)
  - curves: Безье-кривые с кривизной, весами и сглаживанием
  - shapes: стилизованные формы (заливка, обводка, цвет, толщина линии)
  - shape_order / anim_shape_order

Все координаты нормализованы в пространстве Moho (центр в (0,0)).
"""
from __future__ import annotations

import copy
import math
import uuid
from typing import Any, Sequence

# Цветовая палитра по умолчанию
COLOR_SKIN = {"r": 0.949, "g": 0.784, "b": 0.667, "a": 1.0}
COLOR_SKIN_SHADOW = {"r": 0.808, "g": 0.620, "b": 0.502, "a": 1.0}
COLOR_SKIN_DARK = COLOR_SKIN_SHADOW
COLOR_HAIR = {"r": 0.337, "g": 0.227, "b": 0.157, "a": 1.0}
COLOR_HAIR_DARK = {"r": 0.259, "g": 0.173, "b": 0.118, "a": 1.0}
COLOR_SHIRT = {"r": 0.251, "g": 0.424, "b": 0.659, "a": 1.0}
COLOR_SHIRT_DARK = {"r": 0.188, "g": 0.337, "b": 0.541, "a": 1.0}
COLOR_PANTS = {"r": 0.204, "g": 0.220, "b": 0.267, "a": 1.0}
COLOR_PANTS_DARK = {"r": 0.149, "g": 0.157, "b": 0.196, "a": 1.0}
COLOR_SHOE = {"r": 0.149, "g": 0.157, "b": 0.180, "a": 1.0}
COLOR_LINE = {"r": 0.133, "g": 0.110, "b": 0.094, "a": 1.0}
COLOR_WHITE = {"r": 0.988, "g": 0.988, "b": 0.980, "a": 1.0}
COLOR_IRIS = {"r": 0.337, "g": 0.243, "b": 0.157, "a": 1.0}
COLOR_PUPIL = {"r": 0.080, "g": 0.060, "b": 0.050, "a": 1.0}
COLOR_MOUTH_DARK = {"r": 0.431, "g": 0.180, "b": 0.204, "a": 1.0}
COLOR_LIP = {"r": 0.769, "g": 0.431, "b": 0.471, "a": 1.0}
COLOR_TEETH = {"r": 0.960, "g": 0.960, "b": 0.940, "a": 1.0}
COLOR_TONGUE = {"r": 0.850, "g": 0.380, "b": 0.420, "a": 1.0}

DEFAULT_INTERP = {"im": 1, "v1": 0.1, "v2": 0.5, "in": 1, "h": 0, "s": False, "t": 0}
STEP_INTERP = {"im": 0, "v1": 0.1, "v2": 0.5, "in": 1, "h": 0, "s": False, "t": 0}


def make_point(x: float, y: float, parent_bone: int = -1, width: float = 1.0,
               curves: list[dict] | None = None) -> dict:
    """Создаёт объект Point для Moho mesh."""
    return {
        "type": "Point",
        "position": {
            "type": "Vec2", "ref": False, "mute": False,
            "when": [0], "val": [{"x": round(float(x), 6), "y": round(float(y), 6)}],
            "interp": [dict(DEFAULT_INTERP)],
        },
        "width": {
            "type": "Val", "ref": False, "mute": False,
            "when": [0], "val": [round(float(width), 6)],
            "interp": [dict(DEFAULT_INTERP)],
        },
        "parent": int(parent_bone),
        "selected": False,
        "colored": False,
        "color": {
            "type": "Color", "ref": False, "mute": False,
            "when": [0],
            "val": [{"r": 1.0, "g": 1.0, "b": 1.0, "a": 1.0}],
            "interp": [dict(DEFAULT_INTERP)],
        },
        "color_strength": {
            "type": "Val", "ref": False, "mute": False,
            "when": [0], "val": [1.0],
            "interp": [dict(DEFAULT_INTERP)],
        },
        "curves": curves if curves is not None else [],
    }


def make_curve(point_indices: Sequence[int], closed: bool = True,
               smoothness: float = 0.391379) -> dict:
    """Создаёт объект Curve, ссылающийся на список индексов точек."""
    curve_points = []
    for idx in point_indices:
        curve_points.append({
            "point": int(idx),
            "segments_on": True,
            "smoothness": {
                "type": "Val", "ref": False, "mute": False,
                "when": [0], "val": [round(float(smoothness), 6)],
                "interp": [dict(DEFAULT_INTERP)],
            },
            "weight_in": {
                "type": "Val", "ref": False, "mute": False,
                "when": [0], "val": [1.0],
                "interp": [dict(DEFAULT_INTERP)],
            },
            "weight_out": {
                "type": "Val", "ref": False, "mute": False,
                "when": [0], "val": [1.0],
                "interp": [dict(DEFAULT_INTERP)],
            },
            "offset_in": {
                "type": "Val", "ref": False, "mute": False,
                "when": [0], "val": [0.0],
                "interp": [dict(DEFAULT_INTERP)],
            },
            "offset_out": {
                "type": "Val", "ref": False, "mute": False,
                "when": [0], "val": [0.0],
                "interp": [dict(DEFAULT_INTERP)],
            },
        })

    return {
        "type": "Curve",
        "num_points": len(curve_points),
        "closed": bool(closed),
        "profile_layer_uuid": "",
        "profile_curve_id": -1,
        "profile_repeat": 16,
        "points": curve_points,
        "start_percent": {
            "type": "Val", "ref": False, "mute": False,
            "when": [0], "val": [-0.1],
            "interp": [dict(DEFAULT_INTERP)],
        },
        "end_percent": {
            "type": "Val", "ref": False, "mute": False,
            "when": [0], "val": [1.1],
            "interp": [dict(DEFAULT_INTERP)],
        },
        "profile_offset": {
            "type": "Val", "ref": False, "mute": False,
            "when": [0], "val": [0.0],
            "interp": [dict(DEFAULT_INTERP)],
        },
    }


def make_shape(shape_id: int, curve_idx: int, num_segments: int,
               fill_color: dict | None = None,
               line_color: dict | None = None,
               line_width: float = 0.005556,
               has_fill: bool = True,
               has_outline: bool = True,
               name: str = "") -> dict:
    """Создаёт объект Shape с заливкой и обводкой."""
    fill = fill_color if fill_color is not None else COLOR_SKIN
    line = line_color if line_color is not None else COLOR_LINE

    return {
        "type": "Shape",
        "name": name or f"S{shape_id + 1}",
        "id": int(shape_id),
        "selected": False,
        "has_fill": bool(has_fill),
        "has_outline": bool(has_outline),
        "fill_allowed": True,
        "combo_mode": 0,
        "combo_blend_anim": {
            "type": "Val", "ref": False, "mute": False,
            "when": [0], "val": [0.0],
            "interp": [dict(DEFAULT_INTERP)],
        },
        "effect_scale": {
            "type": "Val", "ref": False, "mute": False,
            "when": [0], "val": [1.0],
            "interp": [dict(DEFAULT_INTERP)],
        },
        "effect_rotation": {
            "type": "Val", "ref": False, "mute": False,
            "when": [0], "val": [0.0],
            "interp": [dict(DEFAULT_INTERP)],
        },
        "effect_offset": {
            "type": "Vec2", "ref": False, "mute": False,
            "when": [0], "val": [{"x": 0.0, "y": 0.0}],
            "interp": [dict(DEFAULT_INTERP)],
        },
        "3d_thickness": {
            "type": "Val", "ref": False, "mute": False,
            "when": [0], "val": [0.125],
            "interp": [dict(DEFAULT_INTERP)],
        },
        "edges": {
            "curve": [int(curve_idx)] * num_segments,
            "segment": list(range(num_segments)),
            "flag": [0] * num_segments,
        },
        "style": {
            "type": "Style",
            "name": "",
            "uuid": str(uuid.uuid4()),
            "define_fill_color": False,
            "fill_color": {
                "type": "Color", "ref": False, "mute": False,
                "when": [0], "val": [copy.deepcopy(fill)],
                "interp": [dict(DEFAULT_INTERP)],
            },
            "define_line_width": False,
            "line_width": round(float(line_width), 6),
            "define_line_col": False,
            "line_color": {
                "type": "Color", "ref": False, "mute": False,
                "when": [0], "val": [copy.deepcopy(line)],
                "interp": [dict(DEFAULT_INTERP)],
            },
            "line_caps": 1,
            "brush_name": "",
            "brush_align": False,
            "brush_jitter": 6.283185,
            "brush_spacing": 0.25,
            "brush_angle_drift": 0.0,
            "brush_randomize": True,
            "brush_merged_alpha": False,
            "brush_tint": True,
            "brush_rand_order": True,
            "brush_size_amp": 0.0,
            "brush_size_scale": 0.3,
            "brush_random_interval": 4,
        },
        "inherited_style_name": "",
        "inherited_style2_name": "",
    }


def assemble_mesh(points: list[dict], curves: list[dict], shapes: list[dict]) -> dict:
    """Собирает цельный mesh-словарь и обновляет перекрёстные ссылки в точках."""
    # Заполняем массив point.curves
    for c_idx, curve in enumerate(curves):
        pt_indices = [cp["point"] for cp in curve["points"]]
        for curve_point_idx, p_idx in enumerate(pt_indices):
            if 0 <= p_idx < len(points):
                points[p_idx].setdefault("curves", []).append({
                    "curve": c_idx,
                    "curve_points": curve_point_idx,
                })

    shape_order = list(range(len(shapes)))
    return {
        "type": "Mesh",
        "points": points,
        "curves": curves,
        "shapes": shapes,
        "groups": [],
        "shape_order": shape_order,
        "next_shape_id": len(shapes),
        "anim_shape_order": {
            "type": "Int", "ref": False, "mute": False,
            "when": [0], "val": [0], "interp": [],
        },
        "curve_interpretation": 0,
    }


def make_ellipse_mesh(cx: float, cy: float, rx: float, ry: float,
                      fill_color: dict, line_color: dict = COLOR_LINE,
                      line_width: float = 0.005556, parent_bone: int = -1,
                      num_points: int = 4, has_fill: bool = True,
                      has_outline: bool = True, name: str = "") -> dict:
    """Генерирует сглаженный овал из Безье-точек."""
    points = []
    pt_indices = []
    for i in range(num_points):
        angle = 2 * math.pi * i / num_points
        px = cx + rx * math.cos(angle)
        py = cy + ry * math.sin(angle)
        points.append(make_point(px, py, parent_bone=parent_bone))
        pt_indices.append(i)

    curve = make_curve(pt_indices, closed=True, smoothness=0.391379)
    shape = make_shape(0, 0, num_points, fill_color=fill_color,
                       line_color=line_color, line_width=line_width,
                       has_fill=has_fill, has_outline=has_outline, name=name)
    return assemble_mesh(points, [curve], [shape])


def make_polygon_mesh(poly_pts: list[tuple[float, float]],
                      fill_color: dict, line_color: dict = COLOR_LINE,
                      line_width: float = 0.005556, parent_bone: int = -1,
                      closed: bool = True, smoothness: float = 0.0,
                      has_fill: bool = True, has_outline: bool = True,
                      name: str = "") -> dict:
    """Генерирует полигональный меш (прямой или сглаженный)."""
    points = []
    pt_indices = []
    for i, (px, py) in enumerate(poly_pts):
        points.append(make_point(px, py, parent_bone=parent_bone))
        pt_indices.append(i)

    curve = make_curve(pt_indices, closed=closed, smoothness=smoothness)
    n_seg = len(pt_indices) if closed else max(len(pt_indices) - 1, 1)
    shape = make_shape(0, 0, n_seg, fill_color=fill_color,
                       line_color=line_color, line_width=line_width,
                       has_fill=has_fill, has_outline=has_outline, name=name)
    return assemble_mesh(points, [curve], [shape])


def color_from_rgb(rgb: tuple[float, float, float]) -> dict:
    """Convert an RGB tuple into Moho's RGBA color object."""
    if len(rgb) != 3 or any(component < 0.0 or component > 1.0 for component in rgb):
        raise ValueError("RGB components must be between 0 and 1")
    return {
        "r": round(float(rgb[0]), 6),
        "g": round(float(rgb[1]), 6),
        "b": round(float(rgb[2]), 6),
        "a": 1.0,
    }


def _shade(color: dict, factor: float) -> dict:
    return {
        "r": round(color["r"] * factor, 6),
        "g": round(color["g"] * factor, 6),
        "b": round(color["b"] * factor, 6),
        "a": color.get("a", 1.0),
    }


def apply_character_palette(
    mesh: dict,
    skin_rgb: tuple[float, float, float],
    hair_rgb: tuple[float, float, float],
    shirt_rgb: tuple[float, float, float],
    pants_rgb: tuple[float, float, float],
    shoes_rgb: tuple[float, float, float],
) -> dict:
    """Return a copy of a mesh recolored with the requested character palette."""
    skin = color_from_rgb(skin_rgb)
    hair = color_from_rgb(hair_rgb)
    shirt = color_from_rgb(shirt_rgb)
    pants = color_from_rgb(pants_rgb)
    shoes = color_from_rgb(shoes_rgb)
    replacements = {
        tuple(COLOR_SKIN.values()): skin,
        tuple(COLOR_SKIN_SHADOW.values()): _shade(skin, 0.82),
        tuple(COLOR_HAIR.values()): hair,
        tuple(COLOR_HAIR_DARK.values()): _shade(hair, 0.78),
        tuple(COLOR_SHIRT.values()): shirt,
        tuple(COLOR_SHIRT_DARK.values()): _shade(shirt, 0.78),
        tuple(COLOR_PANTS.values()): pants,
        tuple(COLOR_PANTS_DARK.values()): _shade(pants, 0.76),
        tuple(COLOR_SHOE.values()): shoes,
    }
    result = copy.deepcopy(mesh)
    for shape in result.get("shapes", []):
        channel = shape.get("style", {}).get("fill_color", {})
        values = channel.get("val", [])
        for index, value in enumerate(values):
            if not isinstance(value, dict):
                continue
            replacement = replacements.get(tuple(value.get(key) for key in ("r", "g", "b", "a")))
            if replacement is not None:
                values[index] = copy.deepcopy(replacement)
    return result


def transform_mesh(
    mesh: dict,
    translate: tuple[float, float] = (0.0, 0.0),
    rotate: float = 0.0,
    scale: tuple[float, float] = (1.0, 1.0),
) -> dict:
    """Transform point positions, including action poses, into document space."""
    result = copy.deepcopy(mesh)
    cos_angle = math.cos(rotate)
    sin_angle = math.sin(rotate)

    def transform_values(values: list) -> None:
        for value in values:
            if not isinstance(value, dict) or "x" not in value or "y" not in value:
                continue
            scaled_x = float(value["x"]) * scale[0]
            scaled_y = float(value["y"]) * scale[1]
            value["x"] = round(
                translate[0] + scaled_x * cos_angle - scaled_y * sin_angle,
                6,
            )
            value["y"] = round(
                translate[1] + scaled_x * sin_angle + scaled_y * cos_angle,
                6,
            )

    for point in result.get("points", []):
        position = point.get("position", {})
        transform_values(position.get("val", []))
        for action in position.get("actions", []):
            pose = action.get("pose", {}) if isinstance(action, dict) else {}
            transform_values(pose.get("val", []))
    return result


def generate_segment_mesh(
    start: tuple[float, float],
    end: tuple[float, float],
    start_width: float,
    end_width: float,
    fill_color: dict,
    parent_bone: int,
    name: str,
    overlap: float = 0.08,
) -> dict:
    """Generate an aligned limb segment with overlap around both joints."""
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    length = math.hypot(dx, dy)
    if length <= 1e-9:
        raise ValueError("segment start and end must differ")
    unit_x = dx / length
    unit_y = dy / length
    normal_x = -unit_y
    normal_y = unit_x
    start_x = start[0] - unit_x * overlap
    start_y = start[1] - unit_y * overlap
    end_x = end[0] + unit_x * overlap
    end_y = end[1] + unit_y * overlap
    points = [
        (start_x + normal_x * start_width, start_y + normal_y * start_width),
        (end_x + normal_x * end_width, end_y + normal_y * end_width),
        (end_x - normal_x * end_width, end_y - normal_y * end_width),
        (start_x - normal_x * start_width, start_y - normal_y * start_width),
    ]
    return make_polygon_mesh(
        points,
        fill_color=fill_color,
        line_color=COLOR_LINE,
        line_width=0.006,
        parent_bone=parent_bone,
        smoothness=0.28,
        name=name,
    )


def combine_meshes(meshes: Sequence[dict]) -> dict:
    """Combine independent native mesh payloads into one bound MeshLayer."""
    points: list[dict] = []
    curves: list[dict] = []
    shapes: list[dict] = []
    for source in meshes:
        source_copy = copy.deepcopy(source)
        point_offset = len(points)
        curve_offset = len(curves)
        for point in source_copy.get("points", []):
            point["curves"] = []
            points.append(point)
        for curve in source_copy.get("curves", []):
            for curve_point in curve.get("points", []):
                curve_point["point"] = int(curve_point["point"]) + point_offset
            curves.append(curve)
        for shape in source_copy.get("shapes", []):
            shape["id"] = len(shapes)
            edges = shape.get("edges", {})
            edges["curve"] = [
                int(curve_index) + curve_offset
                for curve_index in edges.get("curve", [])
            ]
            shapes.append(shape)
    return assemble_mesh(points, curves, shapes)


# ==============================================================================
# Специализированные генераторы анатомических частей персонажа
# ==============================================================================

def generate_head_skull_mesh(view: str, parent_bone: int = -1) -> dict:
    """Векторная форма черепа с волосами и ушами для ракурса головы."""
    v = view.lower()
    # Сдвиг и сжатие по ракурсам
    shift = 0.0
    sx = 1.0
    is_profile = False
    if "side r" in v or v == "side_r":
        shift = 0.12
        sx = 0.45
        is_profile = True
    elif "side l" in v or v == "side_l":
        shift = -0.12
        sx = 0.45
        is_profile = True
    elif "1/4 r" in v or "1-4 r" in v:
        shift = 0.08
        sx = 0.75
    elif "1/4 l" in v or "1-4 l" in v:
        shift = -0.08
        sx = 0.75
    elif "3/4 r" in v or "3-4 r" in v:
        shift = 0.04
        sx = 0.88
    elif "3/4 l" in v or "3-4 l" in v:
        shift = -0.04
        sx = 0.88

    rx = 0.35 * sx
    ry = 0.42
    cx = shift
    cy = 0.15

    # 1. Шея (прямоугольник под подбородком)
    neck_pts = [
        (cx - 0.10, cy - ry + 0.1),
        (cx + 0.10, cy - ry + 0.1),
        (cx + 0.10, cy - ry - 0.15),
        (cx - 0.10, cy - ry - 0.15),
    ]

    # 2. Овал лица (6 точек Безье)
    head_pts = [
        (cx + rx, cy),
        (cx + rx * 0.7, cy + ry * 0.7),
        (cx, cy + ry),
        (cx - rx * 0.7, cy + ry * 0.7),
        (cx - rx, cy),
        (cx, cy - ry),
    ]
    if is_profile:
        # Профильный нос
        sign = 1.0 if shift > 0 else -1.0
        head_pts[0] = (cx + sign * (rx + 0.08), cy + 0.02)
        head_pts[1] = (cx + sign * rx, cy + ry * 0.7)

    # 3. Волосы-шапка
    hair_pts = [
        (cx + rx + 0.04, cy),
        (cx + (rx + 0.04) * 0.7, cy + (ry + 0.05) * 0.7),
        (cx, cy + ry + 0.06),
        (cx - (rx + 0.04) * 0.7, cy + (ry + 0.05) * 0.7),
        (cx - rx - 0.04, cy),
        (cx, cy + 0.1),
    ]

    points: list[dict] = []
    curves: list[dict] = []
    shapes: list[dict] = []

    # Добавляем шею
    n_offset = len(points)
    for px, py in neck_pts:
        points.append(make_point(px, py, parent_bone=parent_bone))
    c_neck = make_curve(list(range(n_offset, n_offset + len(neck_pts))), closed=True, smoothness=0.1)
    curves.append(c_neck)
    shapes.append(make_shape(0, len(curves) - 1, len(neck_pts), fill_color=COLOR_SKIN_SHADOW, name="Neck"))

    # Добавляем голову
    h_offset = len(points)
    for px, py in head_pts:
        points.append(make_point(px, py, parent_bone=parent_bone))
    c_head = make_curve(list(range(h_offset, h_offset + len(head_pts))), closed=True, smoothness=0.39)
    curves.append(c_head)
    shapes.append(make_shape(1, len(curves) - 1, len(head_pts), fill_color=COLOR_SKIN, name="HeadSkull"))

    # Добавляем волосы
    hair_offset = len(points)
    for px, py in hair_pts:
        points.append(make_point(px, py, parent_bone=parent_bone))
    c_hair = make_curve(list(range(hair_offset, hair_offset + len(hair_pts))), closed=True, smoothness=0.35)
    curves.append(c_hair)
    shapes.append(make_shape(2, len(curves) - 1, len(hair_pts), fill_color=COLOR_HAIR, name="Hair"))

    return assemble_mesh(points, curves, shapes)


def generate_eye_mesh(side: str, state: str = "open", view: str = "Front",
                      parent_bone: int = -1) -> dict:
    """Векторный меш глаза: склера, зрачок с бликом и верхнее веко."""
    cx = 0.15 if side.upper() == "R" else -0.15
    cy = 0.15
    rx = 0.08
    ry = 0.09 if state == "open" else (0.04 if state == "half" else 0.01)

    points: list[dict] = []
    curves: list[dict] = []
    shapes: list[dict] = []

    # 1. Белок глаза (склера)
    sclera_pts = [
        (cx + rx, cy),
        (cx, cy + ry),
        (cx - rx, cy),
        (cx, cy - ry),
    ]
    s_off = len(points)
    for px, py in sclera_pts:
        points.append(make_point(px, py, parent_bone=parent_bone))
    c_sclera = make_curve(list(range(s_off, s_off + len(sclera_pts))), closed=True, smoothness=0.39)
    curves.append(c_sclera)
    shapes.append(make_shape(0, 0, len(sclera_pts), fill_color=COLOR_WHITE, line_color=COLOR_LINE,
                             line_width=0.003, name="Sclera"))

    # 2. Зрачок (радужка + зрачок)
    if state != "closed":
        pupil_rx, pupil_ry = 0.04, 0.04
        pupil_pts = [
            (cx + pupil_rx, cy),
            (cx, cy + pupil_ry),
            (cx - pupil_rx, cy),
            (cx, cy - pupil_ry),
        ]
        p_off = len(points)
        for px, py in pupil_pts:
            points.append(make_point(px, py, parent_bone=parent_bone))
        c_pupil = make_curve(list(range(p_off, p_off + len(pupil_pts))), closed=True, smoothness=0.39)
        curves.append(c_pupil)
        shapes.append(make_shape(1, len(curves) - 1, len(pupil_pts), fill_color=COLOR_IRIS,
                                 line_color=COLOR_PUPIL, line_width=0.002, name="Pupil"))

        # Блик
        glint_pts = [
            (cx + 0.02, cy + 0.02),
            (cx + 0.01, cy + 0.03),
            (cx, cy + 0.02),
            (cx + 0.01, cy + 0.01),
        ]
        g_off = len(points)
        for px, py in glint_pts:
            points.append(make_point(px, py, parent_bone=parent_bone))
        c_glint = make_curve(list(range(g_off, g_off + len(glint_pts))), closed=True, smoothness=0.39)
        curves.append(c_glint)
        shapes.append(make_shape(2, len(curves) - 1, len(glint_pts), fill_color=COLOR_WHITE,
                                 has_outline=False, name="Glint"))

        # Добавляем экшены для взгляда зрачка (Eyes Look X, Eyes Look Y)
        for pt in points[p_off:]:
            pos = pt.setdefault("position", {})
            bx = pos["val"][0]["x"]
            by = pos["val"][0]["y"]
            pos.setdefault("actions", []).extend([
                {
                    "name": "Eyes Look X",
                    "pose": {
                        "type": "Vec2", "ref": False, "mute": False,
                        "when": [0, 1, 2],
                        "val": [{"x": round(bx, 6), "y": round(by, 6)},
                                {"x": round(bx - 0.03, 6), "y": round(by, 6)},
                                {"x": round(bx + 0.03, 6), "y": round(by, 6)}],
                        "interp": [dict(DEFAULT_INTERP) for _ in range(3)]
                    }
                },
                {
                    "name": "Eyes Look Y",
                    "pose": {
                        "type": "Vec2", "ref": False, "mute": False,
                        "when": [0, 1, 2],
                        "val": [{"x": round(bx, 6), "y": round(by, 6)},
                                {"x": round(bx, 6), "y": round(by - 0.025, 6)},
                                {"x": round(bx, 6), "y": round(by + 0.025, 6)}],
                        "interp": [dict(DEFAULT_INTERP) for _ in range(3)]
                    }
                }
            ])

    return assemble_mesh(points, curves, shapes)


def generate_brow_mesh(side: str, state: str = "neutral", view: str = "Front",
                       parent_bone: int = -1) -> dict:
    """Векторная бровь: плавная Безье-кривая с обводкой."""
    cx = 0.15 if side.upper() == "R" else -0.15
    cy = 0.28
    sign = 1.0 if side.upper() == "R" else -1.0

    # Наклон по эмоциям
    tilt = 0.0
    if state == "angry":
        tilt = 0.03 * sign
    elif state == "sad":
        tilt = -0.03 * sign
    elif state == "raised":
        cy += 0.04

    brow_pts = [
        (cx - 0.08 * sign, cy - tilt),
        (cx, cy + 0.02),
        (cx + 0.08 * sign, cy + tilt),
    ]

    points: list[dict] = []
    curves: list[dict] = []
    shapes: list[dict] = []

    for px, py in brow_pts:
        points.append(make_point(px, py, parent_bone=parent_bone))
    c_brow = make_curve(list(range(len(brow_pts))), closed=False, smoothness=0.35)
    curves.append(c_brow)
    shapes.append(make_shape(0, 0, len(brow_pts) - 1, fill_color=COLOR_LINE,
                             line_color=COLOR_LINE, line_width=0.008, has_fill=False,
                             has_outline=True, name="Eyebrow"))

    return assemble_mesh(points, curves, shapes)


def generate_mouth_mesh(phoneme: str = "Closed", view: str = "Front",
                        parent_bone: int = -1) -> dict:
    """Векторный рот с фонемами (губы, полость рта, зубы, язык)."""
    cx = 0.0
    cy = -0.12

    points: list[dict] = []
    curves: list[dict] = []
    shapes: list[dict] = []

    p = phoneme.upper()
    if p in ("CLOSED", "REST"):
        # Сомкнутая линия губ
        lip_pts = [
            (cx - 0.12, cy),
            (cx, cy - 0.01),
            (cx + 0.12, cy),
        ]
        for px, py in lip_pts:
            points.append(make_point(px, py, parent_bone=parent_bone))
        c_lip = make_curve(list(range(len(lip_pts))), closed=False, smoothness=0.35)
        curves.append(c_lip)
        shapes.append(make_shape(0, 0, len(lip_pts) - 1, line_color=COLOR_LIP,
                                 line_width=0.006, has_fill=False, has_outline=True, name="Lips"))
    elif p in ("A", "AI", "AH"):
        # Открытый овальный рот
        w, h = 0.12, 0.08
        mouth_pts = [
            (cx + w, cy),
            (cx, cy + h),
            (cx - w, cy),
            (cx, cy - h),
        ]
        for px, py in mouth_pts:
            points.append(make_point(px, py, parent_bone=parent_bone))
        c_mouth = make_curve(list(range(len(mouth_pts))), closed=True, smoothness=0.39)
        curves.append(c_mouth)
        shapes.append(make_shape(0, 0, len(mouth_pts), fill_color=COLOR_MOUTH_DARK,
                                 line_color=COLOR_LIP, line_width=0.005, name="MouthA"))
        # Зубы сверху
        teeth_pts = [(cx - w * 0.7, cy + h * 0.3), (cx + w * 0.7, cy + h * 0.3), (cx, cy + h * 0.8)]
        t_off = len(points)
        for px, py in teeth_pts:
            points.append(make_point(px, py, parent_bone=parent_bone))
        c_teeth = make_curve(list(range(t_off, t_off + len(teeth_pts))), closed=True, smoothness=0.2)
        curves.append(c_teeth)
        shapes.append(make_shape(1, len(curves) - 1, len(teeth_pts), fill_color=COLOR_TEETH,
                                 has_outline=False, name="Teeth"))
    elif p in ("O", "U", "WQ"):
        # Круглый открытый рот
        r = 0.07
        mouth_pts = [
            (cx + r, cy),
            (cx, cy + r),
            (cx - r, cy),
            (cx, cy - r),
        ]
        for px, py in mouth_pts:
            points.append(make_point(px, py, parent_bone=parent_bone))
        c_mouth = make_curve(list(range(len(mouth_pts))), closed=True, smoothness=0.39)
        curves.append(c_mouth)
        shapes.append(make_shape(0, 0, len(mouth_pts), fill_color=COLOR_MOUTH_DARK,
                                 line_color=COLOR_LIP, line_width=0.005, name="MouthO"))
    elif p in ("E", "I", "ETC"):
        # Широкий полуоткрытый рот с зубами
        w, h = 0.14, 0.04
        mouth_pts = [
            (cx + w, cy),
            (cx, cy + h),
            (cx - w, cy),
            (cx, cy - h),
        ]
        for px, py in mouth_pts:
            points.append(make_point(px, py, parent_bone=parent_bone))
        c_mouth = make_curve(list(range(len(mouth_pts))), closed=True, smoothness=0.3)
        curves.append(c_mouth)
        shapes.append(make_shape(0, 0, len(mouth_pts), fill_color=COLOR_MOUTH_DARK,
                                 line_color=COLOR_LIP, line_width=0.005, name="MouthE"))
    else:
        # Универсальный рот
        w, h = 0.10, 0.05
        mouth_pts = [
            (cx + w, cy),
            (cx, cy + h),
            (cx - w, cy),
            (cx, cy - h),
        ]
        for px, py in mouth_pts:
            points.append(make_point(px, py, parent_bone=parent_bone))
        c_mouth = make_curve(list(range(len(mouth_pts))), closed=True, smoothness=0.35)
        curves.append(c_mouth)
        shapes.append(make_shape(0, 0, len(mouth_pts), fill_color=COLOR_MOUTH_DARK,
                                 line_color=COLOR_LIP, line_width=0.005, name=f"Mouth{p}"))

    return assemble_mesh(points, curves, shapes)


def generate_torso_mesh(parent_bone: int = -1) -> dict:
    """Векторный торс: куртка с воротником и планкой пуговиц."""
    torso_pts = [
        (-0.35, 0.40),   # плечо левое
        (-0.45, -0.45),  # низ левый
        (0.45, -0.45),   # низ правый
        (0.35, 0.40),    # плечо правое
        (0.12, 0.50),    # ворот правый
        (0.0, 0.35),     # вырез ворота
        (-0.12, 0.50),   # ворот левый
    ]

    points: list[dict] = []
    curves: list[dict] = []
    shapes: list[dict] = []

    for px, py in torso_pts:
        points.append(make_point(px, py, parent_bone=parent_bone))
    c_torso = make_curve(list(range(len(torso_pts))), closed=True, smoothness=0.25)
    curves.append(c_torso)
    shapes.append(make_shape(0, 0, len(torso_pts), fill_color=COLOR_SHIRT,
                             line_color=COLOR_LINE, line_width=0.006, name="TorsoJacket"))

    # Воротник
    collar_pts = [(-0.15, 0.50), (0.0, 0.32), (0.15, 0.50), (0.0, 0.45)]
    c_off = len(points)
    for px, py in collar_pts:
        points.append(make_point(px, py, parent_bone=parent_bone))
    c_collar = make_curve(list(range(c_off, c_off + len(collar_pts))), closed=True, smoothness=0.1)
    curves.append(c_collar)
    shapes.append(make_shape(1, len(curves) - 1, len(collar_pts), fill_color=COLOR_SHIRT_DARK,
                             line_color=COLOR_LINE, line_width=0.004, name="Collar"))

    # Планка пуговиц
    button_pts = [(0.0, 0.30), (0.0, -0.40)]
    b_off = len(points)
    for px, py in button_pts:
        points.append(make_point(px, py, parent_bone=parent_bone))
    c_btn = make_curve(list(range(b_off, b_off + len(button_pts))), closed=False, smoothness=0.0)
    curves.append(c_btn)
    shapes.append(make_shape(2, len(curves) - 1, 1, line_color=COLOR_SHIRT_DARK,
                             line_width=0.005, has_fill=False, has_outline=True, name="Placket"))

    return assemble_mesh(points, curves, shapes)


def generate_limb_mesh(part_name: str, parent_bone: int = -1) -> dict:
    """Векторные конечности: рукава, предплечья, бёдра, голени, обувь."""
    p = part_name.lower()
    points: list[dict] = []
    curves: list[dict] = []
    shapes: list[dict] = []

    if "arm" in p:
        # Рукав или рука
        is_upper = "upper" in p or "larm" in p or "rarm" in p
        fill = COLOR_SHIRT if is_upper else COLOR_SKIN
        pts = [
            (-0.12, 0.40),
            (-0.10, -0.40),
            (0.10, -0.40),
            (0.12, 0.40),
        ]
        for px, py in pts:
            points.append(make_point(px, py, parent_bone=parent_bone))
        c = make_curve(list(range(len(pts))), closed=True, smoothness=0.35)
        curves.append(c)
        shapes.append(make_shape(0, 0, len(pts), fill_color=fill, line_color=COLOR_LINE,
                                 line_width=0.006, name=part_name))
    elif "leg" in p or "thigh" in p or "shin" in p:
        # Штанина
        fill = COLOR_PANTS if ("thigh" in p or "lleg" in p or "rleg" in p) else COLOR_PANTS_DARK
        pts = [
            (-0.14, 0.50),
            (-0.11, -0.50),
            (0.11, -0.50),
            (0.14, 0.50),
        ]
        for px, py in pts:
            points.append(make_point(px, py, parent_bone=parent_bone))
        c = make_curve(list(range(len(pts))), closed=True, smoothness=0.3)
        curves.append(c)
        shapes.append(make_shape(0, 0, len(pts), fill_color=fill, line_color=COLOR_LINE,
                                 line_width=0.006, name=part_name))
    elif "foot" in p or "shoe" in p or "boot" in p:
        # Обувь / стопа
        pts = [
            (-0.10, 0.15),
            (-0.25, -0.10),
            (0.15, -0.10),
            (0.10, 0.15),
        ]
        for px, py in pts:
            points.append(make_point(px, py, parent_bone=parent_bone))
        c = make_curve(list(range(len(pts))), closed=True, smoothness=0.35)
        curves.append(c)
        shapes.append(make_shape(0, 0, len(pts), fill_color=COLOR_SHOE, line_color=COLOR_LINE,
                                 line_width=0.006, name=part_name))
    else:
        # Универсальная деталь
        pts = [(-0.1, 0.1), (-0.1, -0.1), (0.1, -0.1), (0.1, 0.1)]
        for px, py in pts:
            points.append(make_point(px, py, parent_bone=parent_bone))
        c = make_curve(list(range(len(pts))), closed=True, smoothness=0.3)
        curves.append(c)
        shapes.append(make_shape(0, 0, len(pts), fill_color=COLOR_SKIN, line_color=COLOR_LINE,
                                 line_width=0.005, name=part_name))

    return assemble_mesh(points, curves, shapes)


HAND_POSES = ["Relaxed", "Fist", "Open", "Point", "Grab"]


def generate_hand_mesh(side: str = "L", pose: str = "Relaxed", parent_bone: int = -1) -> dict:
    """Генератор векторных кистей рук (5 профессиональных состояний)."""
    p = pose.lower()
    flip = -1.0 if side.upper() == "L" else 1.0
    points: list[dict] = []
    curves: list[dict] = []
    shapes: list[dict] = []

    if "fist" in p:
        # Сжатый кулак
        pts = [
            (flip * 0.08, 0.08),
            (flip * 0.12, 0.02),
            (flip * 0.11, -0.10),
            (flip * -0.08, -0.11),
            (flip * -0.10, 0.02),
            (flip * -0.05, 0.09),
        ]
        for px, py in pts:
            points.append(make_point(px, py, parent_bone=parent_bone))
        c_palm = make_curve(list(range(len(pts))), closed=True, smoothness=0.35)
        curves.append(c_palm)
        shapes.append(make_shape(0, 0, len(pts), fill_color=COLOR_SKIN, line_color=COLOR_LINE,
                                 line_width=0.005, name=f"HandFist_{side}"))

        # Большой палец поверх кулака
        thumb_pts = [
            (flip * 0.06, 0.04),
            (flip * 0.02, -0.06),
            (flip * -0.06, -0.04),
            (flip * -0.02, 0.05),
        ]
        t_off = len(points)
        for px, py in thumb_pts:
            points.append(make_point(px, py, parent_bone=parent_bone))
        c_thumb = make_curve(list(range(t_off, t_off + len(thumb_pts))), closed=True, smoothness=0.3)
        curves.append(c_thumb)
        shapes.append(make_shape(1, len(curves) - 1, len(thumb_pts), fill_color=COLOR_SKIN_DARK,
                                 line_color=COLOR_LINE, line_width=0.004, name="Thumb"))

    elif "open" in p:
        # Раскрытая ладонь с 5 пальцами
        pts = [
            (flip * 0.06, 0.12),    # запястье
            (flip * 0.14, 0.02),    # основание большого
            (flip * 0.20, -0.05),   # большой палец
            (flip * 0.12, -0.07),
            (flip * 0.11, -0.18),   # указательный
            (flip * 0.05, -0.21),   # средний
            (flip * -0.02, -0.19),  # безымянный
            (flip * -0.08, -0.14),  # мизинец
            (flip * -0.10, 0.04),   # ребро ладони
            (flip * -0.06, 0.12),   # запястье
        ]
        for px, py in pts:
            points.append(make_point(px, py, parent_bone=parent_bone))
        c = make_curve(list(range(len(pts))), closed=True, smoothness=0.32)
        curves.append(c)
        shapes.append(make_shape(0, 0, len(pts), fill_color=COLOR_SKIN, line_color=COLOR_LINE,
                                 line_width=0.005, name=f"HandOpen_{side}"))

    elif "point" in p:
        # Указательный жест (палец вытянут, остальные сжаты)
        pts = [
            (flip * 0.06, 0.10),
            (flip * 0.12, 0.02),
            (flip * 0.09, -0.22),   # вытянутый указательный
            (flip * 0.03, -0.22),
            (flip * 0.02, -0.08),   # подогнутый средний
            (flip * -0.04, -0.07),  # подогнутый безымянный
            (flip * -0.08, -0.05),  # подогнутый мизинец
            (flip * -0.08, 0.06),
            (flip * -0.05, 0.10),
        ]
        for px, py in pts:
            points.append(make_point(px, py, parent_bone=parent_bone))
        c = make_curve(list(range(len(pts))), closed=True, smoothness=0.28)
        curves.append(c)
        shapes.append(make_shape(0, 0, len(pts), fill_color=COLOR_SKIN, line_color=COLOR_LINE,
                                 line_width=0.005, name=f"HandPoint_{side}"))

    elif "grab" in p:
        # Хват / захват (C-образная форма)
        pts = [
            (flip * 0.07, 0.10),
            (flip * 0.16, 0.02),
            (flip * 0.12, -0.14),
            (flip * 0.03, -0.16),
            (flip * 0.01, -0.08),
            (flip * -0.07, -0.12),
            (flip * -0.12, -0.04),
            (flip * -0.07, 0.10),
        ]
        for px, py in pts:
            points.append(make_point(px, py, parent_bone=parent_bone))
        c = make_curve(list(range(len(pts))), closed=True, smoothness=0.33)
        curves.append(c)
        shapes.append(make_shape(0, 0, len(pts), fill_color=COLOR_SKIN, line_color=COLOR_LINE,
                                 line_width=0.005, name=f"HandGrab_{side}"))

    else:
        # Relaxed (естественная расслабленная кисть)
        pts = [
            (flip * 0.06, 0.10),
            (flip * 0.12, 0.03),
            (flip * 0.14, -0.06),   # большой
            (flip * 0.09, -0.07),
            (flip * 0.08, -0.16),   # указательный
            (flip * 0.03, -0.17),   # средний
            (flip * -0.03, -0.14),  # безымянный
            (flip * -0.07, -0.10),  # мизинец
            (flip * -0.08, 0.04),
            (flip * -0.05, 0.10),
        ]
        for px, py in pts:
            points.append(make_point(px, py, parent_bone=parent_bone))
        c = make_curve(list(range(len(pts))), closed=True, smoothness=0.32)
        curves.append(c)
        shapes.append(make_shape(0, 0, len(pts), fill_color=COLOR_SKIN, line_color=COLOR_LINE,
                                 line_width=0.005, name=f"HandRelaxed_{side}"))

    return assemble_mesh(points, curves, shapes)


def add_point_morph_action(mesh: dict, action_name: str,
                           delta_map: dict[int, list[tuple[float, float]]],
                           frames: list[int] = None) -> None:
    """Добавляет анимацию сгиба/морфа (point actions) к точкам меша."""
    if frames is None:
        frames = [0, 1, 2]

    for pt_idx, deltas in delta_map.items():
        if pt_idx >= len(mesh["points"]):
            continue
        pt = mesh["points"][pt_idx]
        pos = pt.get("position", {})
        if not isinstance(pos, dict):
            continue
        if "actions" not in pos:
            pos["actions"] = []

        base_x = pos.get("val", [{}])[0].get("x", 0.0)
        base_y = pos.get("val", [{}])[0].get("y", 0.0)

        vals = []
        for i, f in enumerate(frames):
            dx, dy = deltas[i] if i < len(deltas) else (0.0, 0.0)
            vals.append({"x": round(base_x + dx, 6), "y": round(base_y + dy, 6)})

        pos["actions"].append({
            "name": action_name,
            "pose": {
                "type": "Vec2",
                "ref": False,
                "mute": False,
                "when": frames,
                "val": vals,
                "interp": [{"im": 1, "v1": 0.1, "v2": 0.5, "in": 1, "h": 0, "s": False, "t": 0} for _ in frames]
            }
        })
