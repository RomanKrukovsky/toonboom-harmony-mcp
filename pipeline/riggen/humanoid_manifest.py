"""Machine-readable expectations for a generated humanoid rig."""

from __future__ import annotations

from typing import Any

from ..pir.schema import Rig


def _mainline_frames(rig: Rig) -> list[int]:
    frames: set[int] = set()
    for bone in rig.bones:
        for channel in (bone.angle_channel, bone.pos_channel):
            if channel is not None:
                frames.update(int(frame) for frame in channel.when if frame > 0)
        if bone.angle_keys:
            frames.update(int(frame) for frame, _angle in bone.angle_keys if frame > 0)
        if bone.pos_keys:
            frames.update(int(frame) for frame, _x, _y in bone.pos_keys if frame > 0)
    for part in rig.walk_parts():
        if part.switch_channel is not None:
            frames.update(
                int(frame)
                for frame in part.switch_channel.when
                if frame > 0
            )
    return sorted(frames)


def build_humanoid_manifest(rig: Rig) -> dict[str, Any]:
    """Describe bones, bindings, switches, actions and diagnostic frames."""
    switches: dict[str, list[str]] = {}
    mesh_layers: list[str] = []
    bound_mesh_count = 0
    for part in rig.walk_parts():
        if part.type == "switch":
            switches[part.name] = list(part.switch_states)
        if part.type != "mesh":
            continue
        mesh_layers.append(part.name)
        points = (part.geometry_raw or {}).get("points", [])
        if points and all(
            isinstance(point.get("parent"), int) and point["parent"] >= 0
            for point in points
        ):
            bound_mesh_count += 1

    actions = {
        link.dial_action_name
        for link in rig.dial_links
        if link.dial_action_name
    }
    for bone in rig.bones:
        for action in bone.dial_actions or []:
            name = action.get("name") if isinstance(action, dict) else None
            if isinstance(name, str) and name:
                actions.add(name)
    controls = sorted(
        bone.id
        for bone in rig.bones
        if bone.strength == 0.0 and not bone.hidden
    )
    return {
        "name": rig.name,
        "bones": [bone.id for bone in rig.bones],
        "boneParents": {bone.id: bone.parent for bone in rig.bones},
        "ikTargets": {
            bone.id: bone.target_bone
            for bone in rig.bones
            if bone.target_bone
        },
        "switches": switches,
        "actions": sorted(actions),
        "controls": controls,
        "meshLayers": mesh_layers,
        "boundMeshCount": bound_mesh_count,
        "diagnosticFrames": _mainline_frames(rig),
    }
