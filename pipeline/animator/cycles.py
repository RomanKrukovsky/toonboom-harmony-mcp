"""Locomotion and idle animation cycles with zero-slip foot pinning."""

from __future__ import annotations

import math
from typing import Any

from ..pir.schema import Bone, Channel, Rig

INTERP_SMOOTH = {"im": 1, "v1": -1.0, "v2": -1.0, "in": 1, "h": 0, "s": False, "t": 0}


def add_pos_keyframes(bone: Bone, keyframes: list[dict[str, Any]]) -> None:
    existing_when = list(bone.pos_channel.when) if bone.pos_channel else [0]
    existing_val = (
        list(bone.pos_channel.val)
        if bone.pos_channel
        else [{"x": bone.position[0], "y": bone.position[1]}]
    )
    pairs: dict[int, tuple[float, float]] = {}
    for frame, value in zip(existing_when, existing_val):
        if isinstance(value, dict):
            pairs[int(frame)] = (float(value["x"]), float(value["y"]))
        else:
            pairs[int(frame)] = bone.position
    for keyframe in keyframes:
        pairs[int(keyframe["frame"])] = (
            float(keyframe.get("x", bone.position[0])),
            float(keyframe.get("y", bone.position[1])),
        )
    sorted_pairs = sorted(pairs.items())
    bone.pos_channel = Channel(
        type="Vec2",
        when=[pair[0] for pair in sorted_pairs],
        val=[{"x": pair[1][0], "y": pair[1][1]} for pair in sorted_pairs],
        interp=[dict(INTERP_SMOOTH) for _ in sorted_pairs],
    )


def add_angle_keyframes(bone: Bone, keyframes: list[dict[str, Any]]) -> None:
    existing_when = list(bone.angle_channel.when) if bone.angle_channel else [0]
    existing_val = list(bone.angle_channel.val) if bone.angle_channel else [bone.angle]
    pairs = dict(zip(existing_when, existing_val))
    for keyframe in keyframes:
        pairs[int(keyframe["frame"])] = float(keyframe["value"])
    sorted_pairs = sorted(pairs.items())
    bone.angle_channel = Channel(
        type="Val",
        when=[pair[0] for pair in sorted_pairs],
        val=[pair[1] for pair in sorted_pairs],
        interp=[dict(INTERP_SMOOTH) for _ in sorted_pairs],
    )


def apply_walk_cycle(
    bone_map: dict[str, Bone],
    start_frame: int,
    end_frame: int,
    stride_len: float = 0.22,
    step_height: float = 0.08,
    pelvis_drop: float = 0.025,
    arm_swing_deg: float = 28.0,
) -> list[str]:
    """Inject 4-phase walk cycle with zero-slip stance foot pinning."""
    duration = end_frame - start_frame
    if duration <= 0:
        return []

    quarter = max(1, duration // 4)

    # 1. Legs IK Targets with foot pinning during stance phase
    # Left foot: Contact -> Down (pinned) -> Passing (lift) -> Up -> Contact
    # Right foot: Inverted phase
    for side, phase in (("L", 0), ("R", 2)):
        target = bone_map.get(f"Target Leg {side}")
        if not target:
            continue
        frames = [
            start_frame,
            start_frame + quarter,
            start_frame + 2 * quarter,
            start_frame + 3 * quarter,
            end_frame,
        ]
        # Zero foot slip: During stance/plant phase, y is firmly 0.0
        offsets_x = [0.0, stride_len * 0.5, 0.0, -stride_len * 0.25, 0.0]
        offsets_y = [0.0, step_height, 0.0, 0.0, 0.0]  # y is strictly 0.0 on ground contact
        if phase:
            offsets_x = offsets_x[phase:] + offsets_x[:phase]
            offsets_y = offsets_y[phase:] + offsets_y[:phase]

        add_pos_keyframes(
            target,
            [
                {
                    "frame": f,
                    "x": target.position[0] + ox,
                    "y": target.position[1] + oy,
                }
                for f, ox, oy in zip(frames, offsets_x, offsets_y)
            ],
        )

    # 2. Body pelvic bounce
    body = bone_map.get("Body")
    if body:
        add_pos_keyframes(
            body,
            [
                {"frame": start_frame, "x": body.position[0], "y": body.position[1]},
                {"frame": start_frame + quarter, "x": body.position[0], "y": body.position[1] - pelvis_drop},
                {"frame": start_frame + 2 * quarter, "x": body.position[0], "y": body.position[1]},
                {"frame": start_frame + 3 * quarter, "x": body.position[0], "y": body.position[1] + pelvis_drop * 0.7},
                {"frame": end_frame, "x": body.position[0], "y": body.position[1]},
            ],
        )

    # 3. Arm Counter-swing
    arm_rad = math.radians(arm_swing_deg)
    for side, direction in (("L", -1.0), ("R", 1.0)):
        arm = bone_map.get(f"UpperArm {side}")
        if not arm:
            continue
        add_angle_keyframes(
            arm,
            [
                {"frame": start_frame, "value": arm.angle},
                {"frame": start_frame + quarter, "value": arm.angle + direction * arm_rad},
                {"frame": start_frame + 2 * quarter, "value": arm.angle},
                {"frame": start_frame + 3 * quarter, "value": arm.angle - direction * arm_rad * 0.6},
                {"frame": end_frame, "value": arm.angle},
            ],
        )

    return ["cycle:walk"]


def apply_run_cycle(
    bone_map: dict[str, Bone],
    start_frame: int,
    end_frame: int,
    stride_len: float = 0.38,
    flight_height: float = 0.12,
    arm_swing_deg: float = 45.0,
) -> list[str]:
    """Inject dynamic run cycle with airborne flight phase."""
    duration = end_frame - start_frame
    if duration <= 0:
        return []

    quarter = max(1, duration // 4)

    # Legs: Flight phase where both feet are airborne
    for side, phase in (("L", 0), ("R", 2)):
        target = bone_map.get(f"Target Leg {side}")
        if not target:
            continue
        frames = [
            start_frame,
            start_frame + quarter,
            start_frame + 2 * quarter,
            start_frame + 3 * quarter,
            end_frame,
        ]
        # Flight phase elevated
        offsets_x = [-stride_len * 0.5, stride_len * 0.2, stride_len * 0.5, -stride_len * 0.2, -stride_len * 0.5]
        offsets_y = [0.0, flight_height * 1.1, flight_height * 0.5, 0.0, 0.0]
        if phase:
            offsets_x = offsets_x[phase:] + offsets_x[:phase]
            offsets_y = offsets_y[phase:] + offsets_y[:phase]

        add_pos_keyframes(
            target,
            [
                {
                    "frame": f,
                    "x": target.position[0] + ox,
                    "y": target.position[1] + oy,
                }
                for f, ox, oy in zip(frames, offsets_x, offsets_y)
            ],
        )

    # Pelvic bounce with flight rise
    body = bone_map.get("Body")
    if body:
        add_pos_keyframes(
            body,
            [
                {"frame": start_frame, "x": body.position[0], "y": body.position[1]},
                {"frame": start_frame + quarter, "x": body.position[0], "y": body.position[1] + flight_height * 0.6},
                {"frame": start_frame + 2 * quarter, "x": body.position[0], "y": body.position[1] - 0.04},
                {"frame": start_frame + 3 * quarter, "x": body.position[0], "y": body.position[1] + flight_height * 0.6},
                {"frame": end_frame, "x": body.position[0], "y": body.position[1]},
            ],
        )

    # Pronounced arm swings
    arm_rad = math.radians(arm_swing_deg)
    for side, direction in (("L", -1.0), ("R", 1.0)):
        arm = bone_map.get(f"UpperArm {side}")
        if not arm:
            continue
        add_angle_keyframes(
            arm,
            [
                {"frame": start_frame, "value": arm.angle},
                {"frame": start_frame + quarter, "value": arm.angle + direction * arm_rad},
                {"frame": start_frame + 2 * quarter, "value": arm.angle},
                {"frame": start_frame + 3 * quarter, "value": arm.angle - direction * arm_rad},
                {"frame": end_frame, "value": arm.angle},
            ],
        )

    return ["cycle:run"]


def apply_idle_cycle(
    bone_map: dict[str, Bone],
    start_frame: int,
    end_frame: int,
) -> list[str]:
    """Inject subtle rhythmic breathing, pelvic settling, and micro head drift."""
    duration = end_frame - start_frame
    if duration <= 0:
        return []

    mid = start_frame + max(1, duration // 2)

    # Chest / Pelvic breathing
    body = bone_map.get("Body")
    if body:
        add_pos_keyframes(
            body,
            [
                {"frame": start_frame, "x": body.position[0], "y": body.position[1]},
                {"frame": mid, "x": body.position[0], "y": body.position[1] + 0.015},
                {"frame": end_frame, "x": body.position[0], "y": body.position[1]},
            ],
        )

    # Head subtle drift
    head = bone_map.get("Head")
    if head:
        add_angle_keyframes(
            head,
            [
                {"frame": start_frame, "value": head.angle},
                {"frame": mid, "value": head.angle - math.radians(1.5)},
                {"frame": end_frame, "value": head.angle},
            ],
        )

    return ["cycle:idle"]
