"""2.5D Face Tilt & Parallax Controller (2D Master Controller для лица).

Реализует контроллеры поворота и наклона лица (по эталону Mr.Stu.moho):
1. Face R/L (поворот вправо/влево):
   - Параллаксное смещение носа, глаз, бровей и рта по оси X.
   - Обратное смещение ушей для создания объема 2.5D.
2. Face U/D (наклон вверх/вниз):
   - Вертикальное смещение черт лица.
   - Деформация контура подбородка и челюсти (перспектива снизу/сверху).
"""
from __future__ import annotations

import math
from typing import Any

from .vector_shapes import add_point_morph_action, DEFAULT_INTERP


def add_face_parallax_actions(
    skull_mesh: dict,
    eye_meshes: dict[str, dict],
    mouth_meshes: dict[str, dict],
    brow_meshes: dict[str, dict],
    parallax_scale_x: float = 0.035,
    parallax_scale_y: float = 0.025
) -> None:
    """Добавляет точечные смарт-экшены Face R/L и Face U/D к мешам лица."""
    # 1. Смещение глаз при повороте и наклоне лица
    for side, mesh in eye_meshes.items():
        dx = parallax_scale_x * (1.1 if side == "R" else 0.9)
        dy = parallax_scale_y
        delta_rl = {i: (-dx, 0.0) for i in range(len(mesh.get("points", [])))}
        delta_ud = {i: (0.0, -dy) for i in range(len(mesh.get("points", [])))}
        add_point_morph_action(mesh, "Face R/L", delta_rl)
        add_point_morph_action(mesh, "Face U/D", delta_ud)

    # 2. Смещение рта при повороте и наклоне
    for phoneme, mesh in mouth_meshes.items():
        dx = parallax_scale_x * 1.2
        dy = parallax_scale_y * 1.1
        delta_rl = {i: (-dx, 0.0) for i in range(len(mesh.get("points", [])))}
        delta_ud = {i: (0.0, -dy) for i in range(len(mesh.get("points", [])))}
        add_point_morph_action(mesh, "Face R/L", delta_rl)
        add_point_morph_action(mesh, "Face U/D", delta_ud)

    # 3. Смещение бровей
    for side, mesh in brow_meshes.items():
        dx = parallax_scale_x
        dy = parallax_scale_y
        delta_rl = {i: (-dx, 0.0) for i in range(len(mesh.get("points", [])))}
        delta_ud = {i: (0.0, -dy) for i in range(len(mesh.get("points", [])))}
        add_point_morph_action(mesh, "Face R/L", delta_rl)
        add_point_morph_action(mesh, "Face U/D", delta_ud)

    # 4. Деформация контура черепа/подбородка при наклоне вверх/вниз
    skull_pts = len(skull_mesh.get("points", []))
    if skull_pts >= 4:
        # Нижние точки подбородка сжимаются/расширяются
        delta_skull_ud = {
            2: (0.0, -parallax_scale_y * 0.5), # Подбородок поднимается при наклоне вверх
            0: (0.0, parallax_scale_y * 0.3),  # Макушка опускается
        }
        add_point_morph_action(skull_mesh, "Face U/D", delta_skull_ud)
