"""Mesh composer: convert MeshLayerSpec into PIR geometry dictionaries.

Each MeshLayerSpec yields one mesh dict suitable for the existing
emit() pipeline. The composer handles:
- rigid binding (single bone) for simple shapes
- weighted binding (multiple bones) via per-point bone indices
- sub-mesh composition (e.g. five fingers under a hand)
- switch state meshes (multiple shapes per switch)
"""
from __future__ import annotations

import math
import uuid
from typing import Optional

from ..pir.schema import Part
from .topology_spec import (
    MeshLayerSpec,
    PointBindingSpec,
    SwitchSpec,
    TopologySpec,
)
from .topology_solver import to_moho_coords, weighted_binding_map

INTERP = {
    "im": 1, "v1": -1.0, "v2": -1.0,
    "in": 1, "h": 0, "s": False, "t": 0,
}


def _rgb_to_dict(rgb: tuple[float, float, float]) -> dict:
    return {
        "r": max(0, min(255, int(round(rgb[0] * 255)))),
        "g": max(0, min(255, int(round(rgb[1] * 255)))),
        "b": max(0, min(255, int(round(rgb[2] * 255)))),
        "a": 1.0,
    }


def _polygon_to_points(
    polygon: list[tuple[float, float]],
    parent_world: tuple[float, float],
    parent_bone_index: int,
    bindings: dict[int, dict[str, float]],
    bone_index: dict[str, int],
    width: int,
    height: int,
) -> list[dict]:
    """Convert a polygon into a list of mesh points, with binding per point."""
    points: list[dict] = []
    for local_index, (px, py) in enumerate(polygon):
        wx, wy = to_moho_coords(px, py, width, height)
        # local relative to the parent bone
        rx = wx - parent_world[0]
        ry = wy - parent_world[1]
        # 1.0 means rigid bind to parent
        if local_index in bindings:
            weights = bindings[local_index]
            primary = max(weights.items(), key=lambda kv: kv[1])[0]
            parent = bone_index.get(primary, parent_bone_index)
        else:
            parent = parent_bone_index
        points.append({
            "x": round(rx, 6),
            "y": round(ry, 6),
            "parent": int(parent),
            "selected": False,
            "hidden": False,
            "soft_selected": False,
            "curve_point": False,
            "curves": [0],
        })
    return points


def _closed_curves(n_points: int) -> list[dict]:
    if n_points < 2:
        return []
    return [{
        "type": "Curve",
        "closed": True,
        "soft": True,
        "points": list(range(n_points)),
        "tension": 0.5,
        "bias": 0.0,
        "continuity": 0.0,
    }]


def _shapes_for_polygon(
    point_offset: int, n_points: int, smoothness: float,
    fill_rgb: dict, mesh_id: str, bone_id: str,
) -> list[dict]:
    return [{
        "type": "Shape",
        "id": str(uuid.uuid4()),
        "name": mesh_id,
        "closed": True,
        "soft": smoothness > 0.05,
        "fill": True,
        "stroke": False,
        "absolute": False,
        "blend_mode": 0,
        "point_count": n_points,
        "tension": smoothness,
        "bias": 0.0,
        "continuity": 0.0,
        "fill_color": {
            "type": "Color",
            "ref": False, "mute": False,
            "when": [0],
            "val": [fill_rgb],
            "interp": [dict(INTERP)],
        },
        "stroke_color": {
            "type": "Color",
            "ref": False, "mute": False,
            "when": [0],
            "val": [_rgb_to_dict((0.0, 0.0, 0.0))],
            "interp": [dict(INTERP)],
        },
        "line_width": {
            "type": "Val",
            "ref": False, "mute": False,
            "when": [0],
            "val": [0.003],
            "interp": [dict(INTERP)],
        },
        "points": list(range(point_offset, point_offset + n_points)),
    }]


def mesh_dict_from_spec(
    spec: MeshLayerSpec,
    parent_world: tuple[float, float],
    parent_bone_index: int,
    bone_index: dict[str, int],
    width: int,
    height: int,
) -> dict:
    """Produce a single mesh dict in the shape emit() expects."""
    bindings = weighted_binding_map(_StubSpec(), spec)  # type: ignore[arg-type]
    all_points: list[dict] = []
    all_curves: list[dict] = []
    all_shapes: list[dict] = []
    point_offset = 0

    def _collect(sub: MeshLayerSpec) -> None:
        nonlocal point_offset
        if sub.polygons:
            poly_points = _polygon_to_points(
                sub.polygons[0],
                parent_world,
                parent_bone_index,
                bindings,
                bone_index,
                width,
                height,
            )
            all_points.extend(poly_points)
            curve = {
                "type": "Curve",
                "closed": True,
                "soft": sub.smoothness > 0.05,
                "points": list(range(point_offset, point_offset + len(poly_points))),
                "tension": sub.smoothness,
                "bias": 0.0,
                "continuity": 0.0,
            }
            all_curves.append(curve)
            shape = _shapes_for_polygon(
                point_offset, len(poly_points), sub.smoothness,
                _rgb_to_dict(sub.fill_rgb), sub.id, sub.parent_bone,
            )[0]
            all_shapes.append(shape)
            point_offset += len(poly_points)
        for sm in sub.sub_meshes:
            _collect(sm)

    _collect(spec)

    return {
        "type": "Mesh",
        "version": 2,
        "next_shape_id": len(all_shapes) + 1,
        "curve_interpretation": 0,
        "points": all_points,
        "curves": all_curves,
        "shapes": all_shapes,
        "groups": [],
        "pivot": {
            "x": spec.pivot_px[0] if spec.pivot_px else 0.0,
            "y": spec.pivot_px[1] if spec.pivot_px else 0.0,
        },
    }


class _StubSpec:
    """A trivial stand-in so weighted_binding_map can read the spec.

    weighted_binding_map only needs the mesh.bindings attribute, but its
    signature is (spec, mesh). We provide a minimal object that has
    the same surface so the import can stay shared."""

    def __init__(self) -> None:
        self.bone_ids: list[str] = []
        self.joint_ids: list[str] = []


def mesh_part_from_spec(
    spec: MeshLayerSpec,
    bone_index: dict[str, int],
    parent_world: tuple[float, float],
    width: int,
    height: int,
) -> Part:
    """Build a PIR Part for one MeshLayerSpec with rigid binding."""
    part = Part(
        id=f"mesh_{spec.id}",
        name=spec.name,
        type="mesh",
        bone=spec.parent_bone,
        parent_bone_raw=bone_index.get(spec.parent_bone, -1),
        z_order=spec.z_order,
        origin=spec.pivot_px or (0.0, 0.0),
        visible=spec.visible,
        masking=spec.mask,
    )
    parent_bone_idx = bone_index.get(spec.parent_bone, -1)
    if parent_bone_idx < 0:
        return part
    mesh_dict = mesh_dict_from_spec(
        spec, parent_world, parent_bone_idx, bone_index, width, height
    )
    part.geometry_raw = mesh_dict
    return part


def switch_part_from_spec(
    switch: SwitchSpec,
    bone_index: dict[str, int],
    parent_world_by_bone: dict[str, tuple[float, float]],
    width: int,
    height: int,
) -> Part:
    """Build a PIR Part for one SwitchSpec by composing state meshes."""
    from ..riggen.modules import make_vector_switch  # late import: cyclic guard
    state_meshes: dict[str, dict] = {}
    for state_name, state_spec in switch.state_meshes.items():
        parent_world = parent_world_by_bone.get(
            state_spec.parent_bone, (0.0, 0.0)
        )
        mesh = mesh_dict_from_spec(
            state_spec, parent_world,
            bone_index.get(state_spec.parent_bone, -1),
            bone_index, width, height,
        )
        # Stamp the parent_bone for vector_switch builder
        mesh["parent_bone"] = bone_index.get(state_spec.parent_bone, -1)
        state_meshes[state_name] = mesh
    abs_angles = {b_id: 0.0 for b_id in bone_index}
    sw = make_vector_switch(
        switch.id, switch.name, state_meshes,
        switch.parent_bone, abs_angles, switch.z_order,
    )
    sw.driven_by = switch.driven_by
    return sw


def collect_mesh_parts(
    spec: TopologySpec,
    bone_index: dict[str, int],
    parent_world_by_bone: dict[str, tuple[float, float]],
    width: int = 400,
    height: int = 600,
) -> list[Part]:
    """Turn every mesh_layer in the topology into a PIR Part."""
    out: list[Part] = []
    for ml in spec.mesh_layers:
        parent_world = parent_world_by_bone.get(ml.parent_bone, (0.0, 0.0))
        part = mesh_part_from_spec(ml, bone_index, parent_world, width, height)
        out.append(part)
    return out
