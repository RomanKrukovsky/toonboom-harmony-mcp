"""Генератор смаров и брейкдаунов через Switch-слои (Smear Frames & Motion Breakdowns).

Поддерживает 4 типа классических 2D-смаров:
1. Smear_Arc: серповидный дуговой смар (Motion Arc / Blade Smear) для резких взмахов руками/ногами/оружием.
2. Smear_Stretch: скоростное вытягивание вдоль вектора скорости (Speed Capsule / Teardrop) с сохранением объёма.
3. Smear_Multi: мультипликация контуров (Multiple Ghosting / Echo) — сдвоенные/строенные конечности в одном кадре.
4. Smear_Whiplash: S-образный хлыстовой брейкдаун (Whiplash S-Curve) для расслабленных/пружинящих переходов.

Интеграция:
- Нативно упаковывается в SwitchLayer: [Normal, Smear_Arc, Smear_Stretch, Smear_Multi, Smear_Whiplash].
- Поддерживает ручное переключение через смарт-диалы (Smear Dial) и автоматический запекальщик (auto-baking) по скорости.
"""
from __future__ import annotations

import math
from typing import Any, Sequence

from .vector_shapes import (
    COLOR_LINE, COLOR_SKIN, COLOR_SKIN_DARK, COLOR_SHIRT, COLOR_PANTS,
    make_point, make_curve, make_shape, assemble_mesh
)
from .modules import make_vector_switch


def generate_arc_smear_mesh(
    start_pos: tuple[float, float],
    end_pos: tuple[float, float],
    arc_curvature: float = 0.35,
    thickness: float = 0.08,
    trail_taper: float = 0.3,
    fill_color: dict = COLOR_SKIN,
    line_color: dict = COLOR_LINE,
    line_width: float = 0.005,
    parent_bone: int = -1,
    name: str = "Smear_Arc"
) -> dict:
    """Генерирует серповидный дуговой смар (Motion Arc) между двумя позициями взмаха."""
    dx = end_pos[0] - start_pos[0]
    dy = end_pos[1] - start_pos[1]
    dist = max(math.hypot(dx, dy), 0.01)
    nx = -dy / dist
    ny = dx / dist

    mid_x = (start_pos[0] + end_pos[0]) * 0.5 + nx * arc_curvature * dist
    mid_y = (start_pos[1] + end_pos[1]) * 0.5 + ny * arc_curvature * dist

    t_start = thickness * trail_taper
    t_mid = thickness * 1.35
    t_end = thickness

    pts_coords = [
        (start_pos[0] - nx * t_start * 0.5, start_pos[1] - ny * t_start * 0.5),
        (mid_x + nx * t_mid * 0.5, mid_y + ny * t_mid * 0.5),
        (end_pos[0] + nx * t_end * 0.5, end_pos[1] + ny * t_end * 0.5),
        (end_pos[0] - nx * t_end * 0.5, end_pos[1] - ny * t_end * 0.5),
        (mid_x - nx * t_mid * 0.3, mid_y - ny * t_mid * 0.3),
        (start_pos[0] + nx * t_start * 0.5, start_pos[1] + ny * t_start * 0.5),
    ]

    points = [make_point(px, py, parent_bone=parent_bone) for px, py in pts_coords]
    curve = make_curve(list(range(len(pts_coords))), closed=True, smoothness=0.38)
    shape = make_shape(0, 0, len(pts_coords), fill_color=fill_color, line_color=line_color,
                       line_width=line_width, name=name)
    return assemble_mesh(points, [curve], [shape])


def generate_velocity_stretch_smear_mesh(
    center: tuple[float, float],
    radius: tuple[float, float],
    velocity: tuple[float, float],
    stretch_gain: float = 0.04,
    fill_color: dict = COLOR_SKIN,
    line_color: dict = COLOR_LINE,
    line_width: float = 0.005,
    parent_bone: int = -1,
    name: str = "Smear_Stretch"
) -> dict:
    """Генерирует скоростное вытягивание (Teardrop / Speed Capsule) вдоль вектора скорости."""
    speed = math.hypot(velocity[0], velocity[1])
    stretch = min(1.0 + speed * stretch_gain, 3.5)
    squash = 1.0 / math.sqrt(stretch)

    angle = math.atan2(velocity[1], velocity[0]) if speed > 1e-6 else 0.0
    cos_a, sin_a = math.cos(angle), math.sin(angle)

    rx = radius[0] * stretch
    ry = radius[1] * squash
    cx, cy = center

    local_pts = [
        (0.0, ry),
        (rx * 0.7, ry * 0.7),
        (rx, 0.0),
        (rx * 0.7, -ry * 0.7),
        (0.0, -ry),
        (-rx * 1.4, 0.0),  # Хвост смара
    ]

    pts_coords = [
        (cx + lx * cos_a - ly * sin_a, cy + lx * sin_a + ly * cos_a)
        for lx, ly in local_pts
    ]

    points = [make_point(px, py, parent_bone=parent_bone) for px, py in pts_coords]
    curve = make_curve(list(range(len(pts_coords))), closed=True, smoothness=0.35)
    shape = make_shape(0, 0, len(pts_coords), fill_color=fill_color, line_color=line_color,
                       line_width=line_width, name=name)
    return assemble_mesh(points, [curve], [shape])


def generate_multi_ghost_smear_mesh(
    base_pts: list[tuple[float, float]],
    trail_offsets: list[tuple[float, float]],
    fill_color: dict = COLOR_SKIN,
    line_color: dict = COLOR_LINE,
    line_width: float = 0.005,
    parent_bone: int = -1,
    name: str = "Smear_Multi"
) -> dict:
    """Генерирует мульти-конечность (Multiple Ghosting / Echo) — сдвоенные или строенные фазы."""
    points = []
    curves = []
    shapes = []

    for i, (off_x, off_y) in enumerate(trail_offsets):
        p_start = len(points)
        for bx, by in base_pts:
            points.append(make_point(bx + off_x, by + off_y, parent_bone=parent_bone))
        n_p = len(base_pts)
        c = make_curve(list(range(p_start, p_start + n_p)), closed=True, smoothness=0.32)
        curves.append(c)

        # Прозрачность убывает для эхо-хвостов
        alpha = 1.0 if i == len(trail_offsets) - 1 else 0.5
        fc = dict(fill_color)
        fc["a"] = alpha
        shapes.append(make_shape(i, i, n_p, fill_color=fc, line_color=line_color,
                                 line_width=line_width, name=f"{name}_Ghost_{i+1}"))

    return assemble_mesh(points, curves, shapes)


def generate_whiplash_s_smear_mesh(
    pivot: tuple[float, float],
    tip: tuple[float, float],
    s_intensity: float = 0.3,
    thickness: float = 0.09,
    fill_color: dict = COLOR_SKIN,
    line_color: dict = COLOR_LINE,
    line_width: float = 0.005,
    parent_bone: int = -1,
    name: str = "Smear_Whiplash"
) -> dict:
    """Генерирует S-образный хлыстовой брейкдаун (Whiplash S-Curve)."""
    dx = tip[0] - pivot[0]
    dy = tip[1] - pivot[1]
    dist = max(math.hypot(dx, dy), 0.01)
    nx = -dy / dist
    ny = dx / dist

    p1_x = pivot[0] + dx * 0.33 + nx * s_intensity * dist
    p1_y = pivot[1] + dy * 0.33 + ny * s_intensity * dist

    p2_x = pivot[0] + dx * 0.66 - nx * s_intensity * dist
    p2_y = pivot[1] + dy * 0.66 - ny * s_intensity * dist

    hw = thickness * 0.5
    pts_coords = [
        (pivot[0] + nx * hw, pivot[1] + ny * hw),
        (p1_x + nx * hw, p1_y + ny * hw),
        (p2_x + nx * hw, p2_y + ny * hw),
        (tip[0], tip[1]),
        (p2_x - nx * hw, p2_y - ny * hw),
        (p1_x - nx * hw, p1_y - ny * hw),
        (pivot[0] - nx * hw, pivot[1] - ny * hw),
    ]

    points = [make_point(px, py, parent_bone=parent_bone) for px, py in pts_coords]
    curve = make_curve(list(range(len(pts_coords))), closed=True, smoothness=0.38)
    shape = make_shape(0, 0, len(pts_coords), fill_color=fill_color, line_color=line_color,
                       line_width=line_width, name=name)
    return assemble_mesh(points, [curve], [shape])


def build_smear_switch_pack(part_name: str, base_mesh: dict, fill_color: dict = COLOR_SKIN) -> dict[str, dict]:
    """Создаёт полный комплект состояний для SwitchLayer части тела (Normal + 4 Smear состояния)."""
    # 1. Normal
    normal = base_mesh

    # 2. Arc Smear (взмах по дуге)
    arc = generate_arc_smear_mesh(
        start_pos=(-0.15, -0.3), end_pos=(0.25, 0.3),
        arc_curvature=0.4, thickness=0.10, fill_color=fill_color, name=f"{part_name}_Smear_Arc"
    )

    # 3. Stretch Smear (вытягивание по вектору скорости)
    stretch = generate_velocity_stretch_smear_mesh(
        center=(0.0, 0.0), radius=(0.10, 0.35), velocity=(0.25, 0.15),
        fill_color=fill_color, name=f"{part_name}_Smear_Stretch"
    )

    # 4. Multi-Ghost Smear (двойная конечность в одном кадре)
    base_quad = [(-0.1, 0.35), (-0.08, -0.35), (0.08, -0.35), (0.1, 0.35)]
    multi = generate_multi_ghost_smear_mesh(
        base_quad, trail_offsets=[(-0.06, -0.08), (0.0, 0.0), (0.06, 0.08)],
        fill_color=fill_color, name=f"{part_name}_Smear_Multi"
    )

    # 5. Whiplash S-Smear (хлыстовой брейкдаун)
    whiplash = generate_whiplash_s_smear_mesh(
        pivot=(0.0, 0.35), tip=(0.0, -0.35), s_intensity=0.35, thickness=0.09,
        fill_color=fill_color, name=f"{part_name}_Smear_Whiplash"
    )

    return {
        "Normal": normal,
        "Smear_Arc": arc,
        "Smear_Stretch": stretch,
        "Smear_Multi": multi,
        "Smear_Whiplash": whiplash,
    }


def detect_velocity_smear_frames(
    trajectory_points: list[tuple[int, float, float]],
    velocity_threshold_px: float = 30.0,
    angular_threshold_deg: float = 45.0
) -> list[dict[str, Any]]:
    """Анализирует ключевые кадры траектории и определяет кадры для включения смаров."""
    detections = []
    if len(trajectory_points) < 2:
        return detections

    for i in range(1, len(trajectory_points)):
        prev = trajectory_points[i - 1]
        curr = trajectory_points[i]
        dt = max(abs(curr[0] - prev[0]), 1)
        dx = curr[1] - prev[1]
        dy = curr[2] - prev[2]
        vel = math.hypot(dx, dy) / dt
        angle_deg = math.degrees(math.atan2(dy, dx))

        if vel >= velocity_threshold_px:
            is_arc = False
            if i + 1 < len(trajectory_points):
                next_pt = trajectory_points[i + 1]
                ndx = next_pt[1] - curr[1]
                ndy = next_pt[2] - curr[2]
                next_angle = math.degrees(math.atan2(ndy, ndx))
                diff = abs(next_angle - angle_deg)
                if angular_threshold_deg <= diff <= 180.0:
                    is_arc = True

            if is_arc:
                smear_type = "Smear_Arc"
            elif vel > velocity_threshold_px * 2.0:
                smear_type = "Smear_Multi"
            else:
                smear_type = "Smear_Stretch"

            detections.append({
                "frame": curr[0],
                "smear_state": smear_type,
                "velocity": round(vel, 2),
                "angle_deg": round(angle_deg, 1),
                "duration_frames": 2 if vel > velocity_threshold_px * 2.5 else 1
            })

    return detections
