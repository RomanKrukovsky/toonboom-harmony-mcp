from __future__ import annotations

import math
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from .retargeting_models import RetargetingManifest, RigProfile, RigJoint


def get_interpolated_value(keyframes: list, frame: int) -> float:
    if not keyframes:
        return 0.0
    if frame <= keyframes[0].frame:
        return keyframes[0].value
    if frame >= keyframes[-1].frame:
        return keyframes[-1].value
        
    for i in range(len(keyframes) - 1):
        k1 = keyframes[i]
        k2 = keyframes[i+1]
        if k1.frame <= frame <= k2.frame:
            t = (frame - k1.frame) / (k2.frame - k1.frame)
            return k1.value + t * (k2.value - k1.value)
    return 0.0


def calculate_fk_positions(
    manifest: RetargetingManifest,
    frame: int
) -> Dict[str, Tuple[float, float]]:
    """
    Рассчитывает глобальные 2D-координаты суставов рига с помощью прямой кинематики (Forward Kinematics),
    используя углы поворота и сдвиги из Transform Tracks на указанном кадре.
    """
    rig = manifest.rig_profile
    positions: Dict[str, Tuple[float, float]] = {}
    
    # 1. Построим ассоциативный словарь треков
    rotations: Dict[str, float] = {}
    translations: Dict[str, Tuple[float, float]] = {}
    
    for joint in rig.joints:
        rotations[joint.name] = rig.rest_pose.get(joint.name, 0.0)
        translations[joint.name] = (0.0, 0.0)
        
    for track in manifest.tracks:
        joint_name = track.peg_node_path.split("/")[-1].replace("_Peg", "")
        val = get_interpolated_value(track.keyframes, frame)
        if track.transform_type == "rotation":
            rotations[joint_name] = val
        elif track.transform_type == "translation":
            # Выделяем ось смещения по имени ноды
            axis = "X" if "X" in track.peg_node_path or "x" in track.peg_node_path else "Y"
            tx, ty = translations.get(joint_name, (0.0, 0.0))
            if axis == "X":
                translations[joint_name] = (val, ty)
            else:
                translations[joint_name] = (tx, val)

    # 2. Рекурсивное вычисление позиций суставов сверху вниз
    def resolve_joint(joint_name: str, parent_pos: Tuple[float, float], parent_rot: float):
        joint = next((j for j in rig.joints if j.name == joint_name), None)
        if not joint:
            return
            
        # Локальный сдвиг и вращение
        local_rot = rotations.get(joint_name, 0.0)
        tx, ty = translations.get(joint_name, (0.0, 0.0))
        
        # Общий глобальный угол поворота сустава
        global_rot = parent_rot + local_rot
        rad_parent = math.radians(parent_rot)
        
        # Позиция пивота сустава относительно родителя с учетом родительского вращения
        dx = joint.pivot_x + tx
        dy = joint.pivot_y + ty
        
        rx = parent_pos[0] + dx * math.cos(rad_parent) - dy * math.sin(rad_parent)
        ry = parent_pos[1] + dx * math.sin(rad_parent) + dy * math.cos(rad_parent)
        
        positions[joint_name] = (rx, ry)
        
        # Вычисляем позиции дочерних суставов
        children = [j.name for j in rig.joints if j.parent == joint_name]
        for child in children:
            resolve_joint(child, (rx, ry), global_rot)

    # Находим корневые суставы (у которых нет родителя)
    roots = [j.name for j in rig.joints if j.parent is None]
    for root in roots:
        resolve_joint(root, (0.0, 0.0), 0.0)
        
    return positions


def generate_svg_previews(
    manifest: RetargetingManifest,
    source_landmarks: Dict[int, Dict[str, Tuple[float, float, float, float]]],
    output_dir: Path
):
    """
    Генерирует SVG кадры, накладывая исходный скелет MediaPipe (красный)
    и результирующий скелет рига после ретаргетинга (зеленый).
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Определим диапазон кадров
    all_frames = sorted(list(source_landmarks.keys()))
    if not all_frames:
        return

    # Задаем размер SVG
    width, height = 800, 800
    
    # Вспомогательные функции масштабирования координат для красивого отображения в SVG ([-1, 1] -> [100, 700])
    def scale_x(x: float) -> float:
        return 400 + x * 350

    def scale_y(y: float) -> float:
        return 400 - y * 350  # инвертируем Y для корректной SVG ориентации

    for frame in all_frames:
        lms = source_landmarks[frame]
        rig_positions = calculate_fk_positions(manifest, frame)
        
        svg_content = [
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" style="background-color: #1e1e1e;">',
            f'<!-- Frame {frame} of Retargeting Preview -->',
            f'<text x="20" y="40" fill="#ffffff" font-family="sans-serif" font-size="16">Frame: {frame}</text>',
            f'<text x="20" y="70" fill="#ff5555" font-family="sans-serif" font-size="12">Red: Source Pose</text>',
            f'<text x="20" y="90" fill="#55ff55" font-family="sans-serif" font-size="12">Green: Retargeted Rig</text>'
        ]

        # 1. Рисуем скелет источника (MediaPipe)
        source_connections = [
            ("LEFT_SHOULDER", "RIGHT_SHOULDER"),
            ("LEFT_SHOULDER", "LEFT_ELBOW"),
            ("LEFT_ELBOW", "LEFT_WRIST"),
            ("RIGHT_SHOULDER", "RIGHT_ELBOW"),
            ("RIGHT_ELBOW", "RIGHT_WRIST"),
            ("LEFT_SHOULDER", "LEFT_HIP"),
            ("RIGHT_SHOULDER", "RIGHT_HIP"),
            ("LEFT_HIP", "RIGHT_HIP"),
            ("LEFT_HIP", "LEFT_KNEE"),
            ("LEFT_KNEE", "LEFT_ANKLE"),
            ("RIGHT_HIP", "RIGHT_KNEE"),
            ("RIGHT_KNEE", "RIGHT_ANKLE")
        ]
        
        # Рисуем линии источника
        for start, end in source_connections:
            if start in lms and end in lms:
                s_pt = lms[start]
                e_pt = lms[end]
                svg_content.append(
                    f'<line x1="{scale_x(s_pt[0])}" y1="{scale_y(s_pt[1])}" '
                    f'x2="{scale_x(e_pt[0])}" y2="{scale_y(e_pt[1])}" '
                    f'stroke="#ff5555" stroke-width="3" opacity="0.6" stroke-linecap="round"/>'
                )
                
        # Рисуем точки источника
        for k, v in lms.items():
            svg_content.append(
                f'<circle cx="{scale_x(v[0])}" cy="{scale_y(v[1])}" r="5" fill="#ff3333" opacity="0.8"/>'
            )

        # 2. Рисуем результирующий скелет рига (FK)
        # Рисуем кости рига (соединяем родителя с дочерним суставом)
        for joint in manifest.rig_profile.joints:
            if joint.parent and joint.parent in rig_positions and joint.name in rig_positions:
                p_pt = rig_positions[joint.parent]
                j_pt = rig_positions[joint.name]
                svg_content.append(
                    f'<line x1="{scale_x(p_pt[0])}" y1="{scale_y(p_pt[1])}" '
                    f'x2="{scale_x(j_pt[0])}" y2="{scale_y(j_pt[1])}" '
                    f'stroke="#55ff55" stroke-width="4" stroke-linecap="round"/>'
                )
                
        # Рисуем суставы рига
        for k, v in rig_positions.items():
            svg_content.append(
                f'<circle cx="{scale_x(v[0])}" cy="{scale_y(v[1])}" r="6" fill="#33ff33"/>'
            )

        svg_content.append('</svg>')
        
        # Записываем файл
        file_path = output_dir / f"preview_{frame:06d}.svg"
        file_path.write_text("\n".join(svg_content), encoding="utf-8")
