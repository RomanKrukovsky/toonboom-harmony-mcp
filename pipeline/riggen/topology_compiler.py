"""TopologySpec -> PIR Rig -> native .moho compile pipeline.

This is the bridge that takes a declarative topology, runs the joint
solver, attaches IK targets, applies secondary motion, builds mesh
parts, and writes the .moho. The existing emit() pipeline handles
the final JSON serialization, so any new feature in topology_spec
goes straight to a real Moho file.
"""
from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Optional

from ..moho.emit import emit
from ..pir.schema import Bone, Part, Rig
from .mesh_composer import (
    collect_mesh_parts,
    mesh_part_from_spec,
    switch_part_from_spec,
)
from .secondary_motion import apply_all as apply_secondary_motion
from .topology_solver import (
    add_ik_target_bones,
    attach_ik_constraints,
    solve_topology,
    weighted_binding_check,
)
from .topology_spec import TopologySpec


def build_rig_from_topology(spec: TopologySpec) -> Rig:
    """Build a PIR Rig from a TopologySpec. No file IO."""
    weighted_errors = weighted_binding_check(spec)
    if weighted_errors:
        raise ValueError(
            "weighted binding validation failed: " + "; ".join(weighted_errors)
        )

    rig = Rig(
        name=spec.name,
        source_program="moho",
        source_version="1041",
        canvas={
            "mime_type": "application/x-vnd.lm_mohodoc",
            "version": 1041,
            "major_version": 1,
            "rev_version": 0,
            "comment": f"Custom rig: {spec.name}",
        },
        extras={
            "project_data": {
                "width": int(spec.canvas.get("width", 400)),
                "height": int(spec.canvas.get("height", 600)),
                "start_frame": 1,
                "end_frame": 240,
                "fps": 24.0,
            },
            "binding_mode": 2,
            "styles": _default_styles(),
        },
    )

    bones, abs_angles, root_world = solve_topology(spec)
    add_ik_target_bones(bones, spec, abs_angles, root_world)
    attach_ik_constraints(bones, spec)

    bones = apply_secondary_motion(bones, spec)

    bone_index = {b.id: i for i, b in enumerate(bones)}
    rig.bones = bones

    mesh_parts = collect_mesh_parts(
        spec, bone_index, root_world,
        width=int(spec.canvas.get("width", 400)),
        height=int(spec.canvas.get("height", 600)),
    )
    switch_parts: list[Part] = []
    for sw in spec.switches:
        switch_parts.append(
            switch_part_from_spec(
                sw, bone_index, root_world,
                width=int(spec.canvas.get("width", 400)),
                height=int(spec.canvas.get("height", 600)),
            )
        )
    root_part = Part(
        id=f"{spec.name}_root",
        name=spec.name,
        type="bone_container",
        children=mesh_parts + switch_parts,
        z_order=0,
    )
    rig.root_parts = [root_part]
    return rig


def _default_styles() -> list[dict]:
    """Five named styles that Moho 14.4 always accepts."""
    interp = [{"im": 1, "v1": -1.0, "v2": -1.0, "in": 1, "h": 0, "s": False, "t": 0}]
    fill_skin = {"r": 0.98, "g": 0.83, "b": 0.69, "a": 1.0}
    fill_outline = {"r": 1.0, "g": 1.0, "b": 1.0, "a": 1.0}
    fill_hair = {"r": 0.30, "g": 0.18, "b": 0.10, "a": 1.0}
    fill_shirt = {"r": 0.84, "g": 0.31, "b": 0.51, "a": 1.0}
    fill_pants = {"r": 0.20, "g": 0.22, "b": 0.27, "a": 1.0}
    fill_shoes = {"r": 0.12, "g": 0.12, "b": 0.12, "a": 1.0}
    line_black = {"r": 0.0, "g": 0.0, "b": 0.0, "a": 1.0}
    return [
        _make_style("Skin", fill_skin, line_black, True),
        _make_style("Outline", fill_outline, line_black, False),
        _make_style("Hair", fill_hair, line_black, True),
        _make_style("Shirt", fill_shirt, line_black, True),
        _make_style("Pants", fill_pants, line_black, True),
        _make_style("Shoes", fill_shoes, line_black, True),
    ]


def _make_style(name: str, fill: dict, line: dict, fill_defined: bool) -> dict:
    interp = [{"im": 1, "v1": -1.0, "v2": -1.0, "in": 1, "h": 0, "s": False, "t": 0}]
    color_channel = {
        "type": "Color", "ref": False, "mute": False,
        "when": [0], "val": [fill], "interp": [dict(interp[0])],
    }
    line_channel = {
        "type": "Color", "ref": False, "mute": False,
        "when": [0], "val": [line], "interp": [dict(interp[0])],
    }
    return {
        "type": "Style",
        "name": name,
        "uuid": str(__import__("uuid").uuid4()),
        "define_fill_color": fill_defined,
        "fill_color": color_channel,
        "define_line_width": True,
        "line_width": 0.004167,
        "define_line_col": False,
        "line_color": line_channel,
        "line_caps": 0,
        "brush_name": "",
        "brush_align": False,
        "brush_jitter": 6.283185,
        "brush_spacing": 0.25,
        "brush_angle_drift": 0.0,
        "brush_randomize": True,
        "brush_merged_alpha": True,
        "brush_tint": True,
        "brush_rand_order": True,
    }


def compile_topology_to_moho(
    spec: TopologySpec,
    out_path: str,
) -> str:
    """Solve the topology, build a Rig, run emit(), write the .moho."""
    rig = build_rig_from_topology(spec)
    output = emit(rig, out_path)
    manifest_path = Path(output).with_suffix(".topology.json")
    manifest_path.write_text(
        json.dumps(spec.to_dict(), indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    return output
