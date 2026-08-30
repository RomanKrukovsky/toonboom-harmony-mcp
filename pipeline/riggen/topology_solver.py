"""Joint placement, IK, and weighted binding solver.

Given a TopologySpec, compute pixel-space bone positions, propagate
parent angles into world space, and apply the IK constraints described
in the spec. Also handles weighted skinning bindings for MeshLayers.
"""
from __future__ import annotations

import math
from typing import Optional

from ..pir.schema import Bone, Channel
from .topology_spec import (
    BoneSpec,
    JointSpec,
    MeshLayerSpec,
    PointBindingSpec,
    SecondaryMotionSpec,
    SwitchSpec,
    TopologySpec,
)

MOHO_CAMERA_HEIGHT = 6.0


def to_moho_coords(px: float, py: float, width: int, height: int) -> tuple[float, float]:
    """Convert canvas pixels to Moho's height-normalized world space."""
    if width <= 0 or height <= 0:
        raise ValueError("canvas dimensions must be positive")
    scale = MOHO_CAMERA_HEIGHT / float(height)
    return ((px - width / 2.0) * scale, (height / 2.0 - py) * scale)


def _to_moho(px: float, py: float, width: int, height: int) -> tuple[float, float]:
    return to_moho_coords(px, py, width, height)


def _joint_world(spec: TopologySpec, joint_id: str) -> tuple[float, float]:
    j = spec.joint_by_id(joint_id)
    if j is None:
        raise KeyError(f"joint '{joint_id}' not declared in topology_spec")
    w = int(spec.canvas.get("width", 400))
    h = int(spec.canvas.get("height", 600))
    return _to_moho(j.px, j.py, w, h)


def _bone_world(spec: TopologySpec, bone: BoneSpec) -> tuple[float, float]:
    w = int(spec.canvas.get("width", 400))
    h = int(spec.canvas.get("height", 600))
    if bone.root_joint:
        return _joint_world(spec, bone.root_joint)
    return _to_moho(bone.px, bone.py, w, h)


def _bone_world_to_local(
    world: tuple[float, float],
    parent_world: tuple[float, float],
    parent_angle: float,
) -> tuple[float, float]:
    """Transform a world position into the parent's local space."""
    dx, dy = world[0] - parent_world[0], world[1] - parent_world[1]
    if parent_angle == 0.0:
        return (dx, dy)
    cos_a, sin_a = math.cos(-parent_angle), math.sin(-parent_angle)
    return (dx * cos_a - dy * sin_a, dx * sin_a + dy * cos_a)


def _normalize(angle: float) -> float:
    while angle > math.pi:
        angle -= 2 * math.pi
    while angle < -math.pi:
        angle += 2 * math.pi
    return angle


def solve_topology(
    spec: TopologySpec,
) -> tuple[list[Bone], dict[str, float], dict[str, tuple[float, float]]]:
    """Resolve a TopologySpec into concrete Moho-space bones.

    Returns (bones, abs_angles, root_world) for downstream emit.
    Bones are ordered topologically (parent before child).
    """
    width = int(spec.canvas.get("width", 400))
    height = int(spec.canvas.get("height", 600))
    ordered = _topo_sort(spec)
    bones: list[Bone] = []
    abs_angles: dict[str, float] = {}
    root_world: dict[str, tuple[float, float]] = {}

    for bone_spec in ordered:
        if bone_spec.root_joint and bone_spec.tip_joint:
            rw = _joint_world(spec, bone_spec.root_joint)
            tw = _joint_world(spec, bone_spec.tip_joint)
            abs_ang = math.atan2(tw[1] - rw[1], tw[0] - rw[0])
            length = math.hypot(tw[0] - rw[0], tw[1] - rw[1])
        elif bone_spec.root_joint:
            rw = _joint_world(spec, bone_spec.root_joint)
            tw = (_to_moho(bone_spec.px, bone_spec.py, width, height)[0]
                  + bone_spec.length * math.cos(bone_spec.angle),
                  _to_moho(bone_spec.px, bone_spec.py, width, height)[1]
                  + bone_spec.length * math.sin(bone_spec.angle))
            abs_ang = bone_spec.angle
            length = bone_spec.length
        else:
            rw = _to_moho(bone_spec.px, bone_spec.py, width, height)
            tw = (rw[0] + bone_spec.length * math.cos(bone_spec.angle),
                  rw[1] + bone_spec.length * math.sin(bone_spec.angle))
            abs_ang = bone_spec.angle
            length = bone_spec.length

        if bone_spec.parent_id is None:
            pos_local, rel_ang = rw, abs_ang
        else:
            parent_world = root_world[bone_spec.parent_id]
            parent_abs = abs_angles[bone_spec.parent_id]
            pos_local = _bone_world_to_local(rw, parent_world, parent_abs)
            rel_ang = _normalize(abs_ang - parent_abs)

        abs_angles[bone_spec.id] = abs_ang
        root_world[bone_spec.id] = rw
        bones.append(Bone(
            id=bone_spec.id,
            parent=bone_spec.parent_id,
            position=(round(pos_local[0], 6), round(pos_local[1], 6)),
            angle=round(rel_ang, 6),
            length=round(length, 6),
            strength=bone_spec.strength,
            hidden=bone_spec.hidden,
            shy=bone_spec.shy,
            ignored_by_ik=bone_spec.ignored_by_ik,
        ))

    return bones, abs_angles, root_world


def _topo_sort(spec: TopologySpec) -> list[BoneSpec]:
    seen: set[str] = set()
    out: list[BoneSpec] = []

    def visit(b: BoneSpec) -> None:
        if b.id in seen:
            return
        seen.add(b.id)
        if b.parent_id:
            parent = spec.bone_by_id(b.parent_id)
            if parent and parent.id not in seen:
                visit(parent)
        out.append(b)

    for b in spec.bones:
        visit(b)
    return out


def attach_ik_constraints(
    bones: list[Bone],
    spec: TopologySpec,
) -> None:
    """Wire target_bone / min / max on bones that declare ik_target.

    If the target is not yet in the bones list, it is added at the
    Main root so that the constraint reference resolves cleanly.
    """
    bone_index = {b.id: i for i, b in enumerate(bones)}
    for bspec in spec.all_bones_with_ik():
        target_id = bspec.ik_target
        if not target_id:
            continue
        if bspec.id not in bone_index:
            continue
        moho_bone = bones[bone_index[bspec.id]]
        moho_bone.constraints = True
        moho_bone.min_constraint = bspec.ik_min
        moho_bone.max_constraint = bspec.ik_max
        moho_bone.target_bone = target_id


def add_ik_target_bones(
    bones: list[Bone],
    spec: TopologySpec,
    abs_angles: dict[str, float],
    root_world: dict[str, tuple[float, float]],
) -> None:
    """Create target bones for any bone declaring ik_target, parented to
    the root (so the animator can move them without disturbing the chain)."""
    main_world = root_world.get("Main") or next(iter(root_world.values()))
    main_ang = abs_angles.get("Main", 0.0)
    for bspec in spec.all_bones_with_ik():
        target_id = bspec.ik_target
        if not target_id:
            continue
        if any(b.id == target_id for b in bones):
            continue
        if target_id not in root_world:
            target_world = root_world[bspec.id]
        else:
            target_world = root_world[target_id]
        dx = target_world[0] - main_world[0]
        dy = target_world[1] - main_world[1]
        cos_a, sin_a = math.cos(-main_ang), math.sin(-main_ang)
        local_pos = (dx * cos_a - dy * sin_a, dx * sin_a + dy * cos_a)
        bones.append(Bone(
            id=target_id,
            parent="Main",
            position=(round(local_pos[0], 6), round(local_pos[1], 6)),
            angle=0.0,
            length=0.2,
            strength=0.0,
            ignored_by_ik=True,
        ))


def weighted_binding_check(spec: TopologySpec) -> list[str]:
    """Validate that every binding sums to ~1.0 and references existing bones."""
    errors: list[str] = []
    for mesh in spec.mesh_layers:
        for binding in mesh.bindings:
            total = sum(binding.weights.values())
            if abs(total - 1.0) > 0.05:
                errors.append(
                    f"mesh '{mesh.id}' point {binding.point_index}: "
                    f"weights sum to {total:.3f} (expected ~1.0)"
                )
            for bone_id in binding.weights:
                if spec.bone_by_id(bone_id) is None:
                    errors.append(
                        f"mesh '{mesh.id}' point {binding.point_index}: "
                        f"unknown bone '{bone_id}'"
                    )
    return errors


def weighted_binding_map(
    spec: TopologySpec,
    mesh: MeshLayerSpec,
) -> dict[int, dict[str, float]]:
    """Reduce MeshLayerSpec.bindings to a {point_index: weights} map."""
    return {b.point_index: dict(b.weights) for b in mesh.bindings}
