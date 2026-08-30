"""Стандартный гуманоидный скелет по MOHO_RIG_MODULE_LIBRARY_V1.

Иерархия эталонов (Girl, Mr.Stu, Normann, mannequin):
Main -> Pelvis -> Body -> Neck -> Head, Body -> руки, Pelvis -> ноги.
Вход — координаты суставов в px холста (y вниз).
"""
from __future__ import annotations

import math

from ..pir.schema import Bone

MOHO_CAMERA_HEIGHT = 6.0

BONE_TREE = [
    ("Main", None, "hip", "chest"),
    ("Pelvis", "Main", "hip", "crotch"),
    ("Body", "Pelvis", "hip", "neck_base"),
    ("Neck", "Body", "neck_base", "head_base"),
    ("Head", "Neck", "head_base", "head_top"),
    ("UpperArm L", "Body", "shoulder_L", "elbow_L"),
    ("LowerArm L", "UpperArm L", "elbow_L", "hand_L"),
    ("UpperArm R", "Body", "shoulder_R", "elbow_R"),
    ("LowerArm R", "UpperArm R", "elbow_R", "hand_R"),
    ("Thigh L", "Pelvis", "hip_L", "knee_L"),
    ("Shin L", "Thigh L", "knee_L", "ankle_L"),
    ("Foot L", "Shin L", "ankle_L", "toe_L"),
    ("Thigh R", "Pelvis", "hip_R", "knee_R"),
    ("Shin R", "Thigh R", "knee_R", "ankle_R"),
    ("Foot R", "Shin R", "ankle_R", "toe_R"),
]


def to_moho_coords(px: float, py: float, width: int, height: int) -> tuple[float, float]:
    """Convert canvas pixels to Moho's height-normalized world space.

    The default Moho camera spans six world units vertically.  Using a fixed
    72-DPI conversion made portrait artwork too large and pushed it outside the
    camera frame.
    """
    if width <= 0 or height <= 0:
        raise ValueError("canvas dimensions must be positive")
    scale = MOHO_CAMERA_HEIGHT / float(height)
    return ((px - width / 2.0) * scale, (height / 2.0 - py) * scale)


def build_bones(joints_px: dict[str, tuple[float, float]], width: int,
                height: int) -> tuple[list[Bone], dict[str, float],
                                      dict[str, tuple[float, float]],
                                      dict[str, tuple[float, float]]]:
    jw = {k: to_moho_coords(v[0], v[1], width, height)
          for k, v in joints_px.items()}
    bones: list[Bone] = []
    abs_angle: dict[str, float] = {}
    root_world: dict[str, tuple[float, float]] = {}
    for name, parent, root_j, tip_j in BONE_TREE:
        rw, tw = jw[root_j], jw[tip_j]
        abs_ang = math.atan2(tw[1] - rw[1], tw[0] - rw[0])
        length = math.hypot(tw[0] - rw[0], tw[1] - rw[1])
        if parent is None:
            pos_local, rel_ang = rw, abs_ang
        else:
            pw, pa = root_world[parent], abs_angle[parent]
            dx, dy = rw[0] - pw[0], rw[1] - pw[1]
            cos_a, sin_a = math.cos(-pa), math.sin(-pa)
            pos_local = (dx * cos_a - dy * sin_a, dx * sin_a + dy * cos_a)
            rel_ang = abs_ang - pa
            while rel_ang > math.pi:
                rel_ang -= 2 * math.pi
            while rel_ang < -math.pi:
                rel_ang += 2 * math.pi
        abs_angle[name] = abs_ang
        root_world[name] = rw
        bones.append(Bone(id=name, parent=parent,
                          position=(round(pos_local[0], 6), round(pos_local[1], 6)),
                          angle=round(rel_ang, 6), length=round(length, 6)))
    return bones, abs_angle, jw, root_world


def add_leg_ik_targets(bones: list[Bone], root_world: dict[str, tuple[float, float]],
                       abs_angle: dict[str, float]) -> None:
    """Добавить IK Target кости для ног (Target Leg L, Target Leg R) и ограничения коленей."""
    shin_l = next((b for b in bones if b.id == "Shin L"), None)
    if shin_l:
        shin_l.constraints = True
        shin_l.min_constraint = -0.05
        shin_l.max_constraint = 2.6
        shin_l.target_bone = "Target Leg L"

    shin_r = next((b for b in bones if b.id == "Shin R"), None)
    if shin_r:
        shin_r.constraints = True
        shin_r.min_constraint = -0.05
        shin_r.max_constraint = 2.6
        shin_r.target_bone = "Target Leg R"

    main_w = root_world.get("Main", (0.0, 0.0))
    main_a = abs_angle.get("Main", 0.0)

    if "Foot L" in root_world:
        pos_w = root_world["Foot L"]
        dx, dy = pos_w[0] - main_w[0], pos_w[1] - main_w[1]
        cos_a, sin_a = math.cos(-main_a), math.sin(-main_a)
        local_pos = (dx * cos_a - dy * sin_a, dx * sin_a + dy * cos_a)
        bones.append(Bone(id="Target Leg L", parent="Main",
                          position=(round(local_pos[0], 6), round(local_pos[1], 6)),
                          angle=0.0, length=0.2, strength=0.0, ignored_by_ik=True))

    if "Foot R" in root_world:
        pos_w = root_world["Foot R"]
        dx, dy = pos_w[0] - main_w[0], pos_w[1] - main_w[1]
        cos_a, sin_a = math.cos(-main_a), math.sin(-main_a)
        local_pos = (dx * cos_a - dy * sin_a, dx * sin_a + dy * cos_a)
        bones.append(Bone(id="Target Leg R", parent="Main",
                          position=(round(local_pos[0], 6), round(local_pos[1], 6)),
                          angle=0.0, length=0.2, strength=0.0, ignored_by_ik=True))


def bone_root_joint(bone_id: str) -> str:
    return next(t[2] for t in BONE_TREE if t[0] == bone_id)
