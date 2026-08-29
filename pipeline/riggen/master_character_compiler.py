"""Compile a complete procedural biped into a native Moho project."""

from __future__ import annotations

import json
import math
from pathlib import Path

from ..examples.build_dial_demo import JOINTS
from ..moho.emit import emit
from ..pir.schema import Bone, Channel, Part, Rig
from .artgen import BROW_STATES, HEAD_VIEWS, PHONEMES
from .humanoid_manifest import build_humanoid_manifest
from .modules import (
    BASE_INTERP,
    HEAD_TURN_ANGLES,
    HEAD_TURN_CONSTRAINTS,
    dial_ensure_action,
    head_turn_map,
    make_mesh_part,
    make_vector_switch,
    simple_dial_vals,
    wire_dial,
)
from .skeleton import add_leg_ik_targets, build_bones
from .vector_shapes import (
    HAND_POSES,
    add_point_morph_action,
    apply_character_palette,
    color_from_rgb,
    combine_meshes,
    generate_brow_mesh,
    generate_eye_mesh,
    generate_hand_mesh,
    generate_head_skull_mesh,
    generate_mouth_mesh,
    generate_segment_mesh,
    make_polygon_mesh,
    transform_mesh,
)


DESIGN_WIDTH = 400
DESIGN_HEIGHT = 600
DIAGNOSTIC_FRAMES = [1, 12, 24, 36]


def _main_relative_position(
    position: tuple[float, float],
    main_position: tuple[float, float],
    main_angle: float,
) -> tuple[float, float]:
    dx = position[0] - main_position[0]
    dy = position[1] - main_position[1]
    cos_angle = math.cos(-main_angle)
    sin_angle = math.sin(-main_angle)
    return (
        round(dx * cos_angle - dy * sin_angle, 6),
        round(dx * sin_angle + dy * cos_angle, 6),
    )


def _add_arm_ik_targets(
    bones: list[Bone],
    joint_world: dict[str, tuple[float, float]],
    root_world: dict[str, tuple[float, float]],
    absolute_angles: dict[str, float],
) -> None:
    for side in ("L", "R"):
        lower_arm = next(bone for bone in bones if bone.id == f"LowerArm {side}")
        target_name = f"Target Arm {side}"
        lower_arm.constraints = True
        lower_arm.min_constraint = -2.8
        lower_arm.max_constraint = 2.8
        lower_arm.target_bone = target_name
        bones.append(Bone(
            id=target_name,
            parent="Main",
            position=_main_relative_position(
                joint_world[f"hand_{side}"],
                root_world["Main"],
                absolute_angles["Main"],
            ),
            angle=0.0,
            length=0.2,
            strength=0.0,
            ignored_by_ik=True,
        ))


def _add_diagnostic_target_keys(bones: list[Bone]) -> None:
    offsets = {
        "Target Leg L": (0.34, 0.10),
        "Target Leg R": (-0.24, -0.06),
        "Target Arm L": (-0.20, 0.16),
        "Target Arm R": (0.18, -0.14),
    }
    for target_name, (dx, dy) in offsets.items():
        target = next(bone for bone in bones if bone.id == target_name)
        x, y = target.position
        target.pos_channel = Channel(
            type="Vec2",
            when=[0, 1, 12, 24, 36],
            val=[
                {"x": x, "y": y},
                {"x": x, "y": y},
                {"x": round(x + dx, 6), "y": round(y + dy, 6)},
                {"x": x, "y": y},
                {"x": x, "y": y},
            ],
            interp=[dict(BASE_INTERP) for _ in range(5)],
        )


def _mesh_part(name: str, mesh: dict, bone_name: str, z_order: int) -> Part:
    part = make_mesh_part(
        f"mesh_{name.lower().replace(' ', '_')}",
        name,
        mesh,
        bone_name,
        (0.0, 0.0),
        (0.0, 0.0),
        0.0,
    )
    part.z_order = z_order
    return part


def _vector_switch(
    switch_id: str,
    name: str,
    states: dict[str, dict],
    bone_name: str,
    absolute_angles: dict[str, float],
    z_order: int,
) -> Part:
    switch = make_vector_switch(
        switch_id,
        name,
        states,
        bone_name,
        lambda _bone: (0.0, 0.0),
        lambda _state: (0.0, 0.0),
        absolute_angles,
        z_start=z_order,
    )
    # Mesh points are already bound to the bone. Binding the parent SwitchLayer
    # as well would apply the same transform twice.
    switch.bone = None
    switch.z_order = z_order
    return switch


def _correction_control(name: str, position: tuple[float, float]) -> Bone:
    control = Bone(
        id=name,
        parent=None,
        position=position,
        angle=0.0,
        length=0.22,
        strength=0.0,
        constraints=True,
        min_constraint=-0.5,
        max_constraint=0.5,
        is_dial=True,
    )
    dial_ensure_action(control, name, [-0.5, 0.0, 0.5])
    return control


def _attach_joint_correction(mesh: dict, action_name: str, side: str) -> None:
    direction = -1.0 if side == "L" else 1.0
    add_point_morph_action(
        mesh,
        action_name,
        {
            0: [(-0.035 * direction, 0.0), (0.0, 0.0), (0.035 * direction, 0.0)],
            3: [(0.035 * direction, 0.0), (0.0, 0.0), (-0.035 * direction, 0.0)],
        },
        frames=[0, 1, 2],
    )


def compile_master_character(
    name: str = "Summer_Smith",
    gender: str = "female",
    skin_rgb: tuple[float, float, float] = (0.95, 0.78, 0.67),
    hair_rgb: tuple[float, float, float] = (0.90, 0.45, 0.18),
    shirt_rgb: tuple[float, float, float] = (0.84, 0.31, 0.51),
    pants_rgb: tuple[float, float, float] = (0.20, 0.22, 0.27),
    shoes_rgb: tuple[float, float, float] = (0.12, 0.12, 0.12),
    out_path: str = "./output/Summer_Smith.moho",
    canvas_w: int = 1920,
    canvas_h: int = 1080,
    body_proportions: dict[str, float] | None = None,
    joints_override: dict[str, tuple[float, float]] | None = None,
) -> str:
    """Build a visible, articulated and diagnostically animated humanoid."""
    if not name.strip():
        raise ValueError("character name must not be empty")
    if canvas_w <= 0 or canvas_h <= 0:
        raise ValueError("canvas dimensions must be positive")

    rig = Rig(
        name=name,
        source_program="moho",
        source_version="1041",
        canvas={
            "mime_type": "application/x-vnd.lm_mohodoc",
            "version": 1041,
            "major_version": 1,
            "rev_version": 0,
            "comment": f"Production rig for {name} ({gender})",
        },
        extras={
            "project_data": {
                "width": int(canvas_w),
                "height": int(canvas_h),
                "start_frame": 1,
                "end_frame": 240,
                "fps": 24.0,
            },
            "binding_mode": 2,
        },
    )

    proportions = body_proportions or {}
    torso_width = float(proportions.get("torso_width", 1.0))
    limb_scale = float(proportions.get("limb_scale", 1.0))
    head_scale = float(proportions.get("head_scale", 1.0))
    if not 0.5 <= torso_width <= 1.6:
        raise ValueError("torso_width must be between 0.5 and 1.6")
    if not 0.5 <= limb_scale <= 1.6:
        raise ValueError("limb_scale must be between 0.5 and 1.6")
    if not 0.5 <= head_scale <= 1.6:
        raise ValueError("head_scale must be between 0.5 and 1.6")
    base_joints = joints_override or JOINTS
    missing_joints = set(JOINTS) - set(base_joints)
    if missing_joints:
        raise ValueError("joints_override is missing: " + ", ".join(sorted(missing_joints)))
    center_x = float(base_joints["hip"][0])
    joints = {
        joint: (center_x + (float(x) - center_x) * torso_width, float(y))
        for joint, (x, y) in base_joints.items()
    }
    for side in ("L", "R"):
        shoulder = joints[f"shoulder_{side}"]
        for joint in (f"elbow_{side}", f"hand_{side}"):
            x, y = joints[joint]
            joints[joint] = (
                shoulder[0] + (x - shoulder[0]) * limb_scale,
                shoulder[1] + (y - shoulder[1]) * limb_scale,
            )
        hip = joints[f"hip_{side}"]
        for joint in (f"knee_{side}", f"ankle_{side}", f"toe_{side}"):
            x, y = joints[joint]
            joints[joint] = (
                hip[0] + (x - hip[0]) * limb_scale,
                hip[1] + (y - hip[1]) * limb_scale,
            )
    head_base_px = joints["head_base"]
    head_top_px = joints["head_top"]
    joints["head_top"] = (
        head_base_px[0] + (head_top_px[0] - head_base_px[0]) * head_scale,
        head_base_px[1] + (head_top_px[1] - head_base_px[1]) * head_scale,
    )
    bones, absolute_angles, joint_world, root_world = build_bones(
        joints,
        canvas_w if joints_override else DESIGN_WIDTH,
        canvas_h if joints_override else DESIGN_HEIGHT,
    )
    add_leg_ik_targets(bones, root_world, absolute_angles)
    _add_arm_ik_targets(bones, joint_world, root_world, absolute_angles)
    _add_diagnostic_target_keys(bones)
    bones.append(Bone(
        id="Hair Helper",
        parent="Head",
        position=(0.0, 0.42),
        angle=math.radians(-45),
        length=0.32,
        strength=0.12,
        hidden=True,
        shy=True,
        ignored_by_ik=True,
    ))
    bones.extend([
        _correction_control("Elbow Correct L", (-1.35, 0.65)),
        _correction_control("Elbow Correct R", (1.35, 0.65)),
        _correction_control("Knee Correct L", (-1.35, 0.20)),
        _correction_control("Knee Correct R", (1.35, 0.20)),
    ])
    bone_index = {bone.id: index for index, bone in enumerate(bones)}

    def recolor(mesh: dict) -> dict:
        return apply_character_palette(
            mesh,
            skin_rgb,
            hair_rgb,
            shirt_rgb,
            pants_rgb,
            shoes_rgb,
        )

    head_origin = root_world["Head"]
    head_states = {
        view: recolor(transform_mesh(
            generate_head_skull_mesh(view, parent_bone=bone_index["Head"]),
            translate=head_origin,
            scale=(1.25 * head_scale, 1.25 * head_scale),
        ))
        for view in HEAD_VIEWS
    }
    mouth_states = {
        phoneme: recolor(transform_mesh(
            generate_mouth_mesh(phoneme, parent_bone=bone_index["Head"]),
            translate=head_origin,
            scale=(1.25 * head_scale, 1.25 * head_scale),
        ))
        for phoneme in PHONEMES
    }
    eye_states: dict[str, dict] = {}
    for state in ("open", "closed", "squint", "wide"):
        eyes = combine_meshes([
            generate_eye_mesh("L", state=state, parent_bone=bone_index["Head"]),
            generate_eye_mesh("R", state=state, parent_bone=bone_index["Head"]),
        ])
        eye_states[state] = recolor(transform_mesh(
            eyes,
            translate=head_origin,
            scale=(1.25 * head_scale, 1.25 * head_scale),
        ))
    brow_states: dict[str, dict] = {}
    for state in BROW_STATES:
        brows = combine_meshes([
            generate_brow_mesh("L", state=state, parent_bone=bone_index["Head"]),
            generate_brow_mesh("R", state=state, parent_bone=bone_index["Head"]),
        ])
        brow_states[state] = recolor(transform_mesh(
            brows,
            translate=head_origin,
            scale=(1.25 * head_scale, 1.25 * head_scale),
        ))

    hand_states: dict[str, dict[str, dict]] = {"L": {}, "R": {}}
    hand_pose_names = HAND_POSES[:4]
    for side in ("L", "R"):
        for pose in hand_pose_names:
            hand_states[side][pose] = recolor(transform_mesh(
                generate_hand_mesh(
                    side,
                    pose=pose,
                    parent_bone=bone_index[f"LowerArm {side}"],
                ),
                translate=joint_world[f"hand_{side}"],
                scale=(1.35, 1.35),
            ))

    skin = color_from_rgb(skin_rgb)
    shirt = color_from_rgb(shirt_rgb)
    pants = color_from_rgb(pants_rgb)
    shoes = color_from_rgb(shoes_rgb)
    shoulder_factor = 0.94 if gender.lower() in {"female", "woman"} else 1.0
    torso_mesh = make_polygon_mesh(
        [
            (joint_world["shoulder_L"][0] * shoulder_factor - 0.08,
             joint_world["shoulder_L"][1] + 0.12),
            (joint_world["hip_L"][0] - 0.14, joint_world["hip_L"][1] - 0.10),
            (joint_world["hip_R"][0] + 0.14, joint_world["hip_R"][1] - 0.10),
            (joint_world["shoulder_R"][0] * shoulder_factor + 0.08,
             joint_world["shoulder_R"][1] + 0.12),
        ],
        fill_color=shirt,
        parent_bone=bone_index["Body"],
        smoothness=0.24,
        name="Torso",
    )
    pelvis_mesh = generate_segment_mesh(
        joint_world["hip_L"], joint_world["hip_R"],
        0.24, 0.24, pants, bone_index["Pelvis"], "Pelvis", overlap=0.12,
    )
    neck_mesh = generate_segment_mesh(
        joint_world["neck_base"], joint_world["head_base"],
        0.12, 0.12, skin, bone_index["Neck"], "Neck", overlap=0.06,
    )

    body_parts = [
        _mesh_part("Torso", torso_mesh, "Body", 20),
        _mesh_part("Pelvis", pelvis_mesh, "Pelvis", 19),
        _mesh_part("Neck", neck_mesh, "Neck", 21),
    ]
    segment_specs = [
        ("UpperArm L", "shoulder_L", "elbow_L", 0.16, 0.13, shirt, "Elbow Correct L"),
        ("LowerArm L", "elbow_L", "hand_L", 0.14, 0.11, skin, "Elbow Correct L"),
        ("UpperArm R", "shoulder_R", "elbow_R", 0.16, 0.13, shirt, "Elbow Correct R"),
        ("LowerArm R", "elbow_R", "hand_R", 0.14, 0.11, skin, "Elbow Correct R"),
        ("Thigh L", "hip_L", "knee_L", 0.19, 0.16, pants, "Knee Correct L"),
        ("Shin L", "knee_L", "ankle_L", 0.17, 0.13, pants, "Knee Correct L"),
        ("Thigh R", "hip_R", "knee_R", 0.19, 0.16, pants, "Knee Correct R"),
        ("Shin R", "knee_R", "ankle_R", 0.17, 0.13, pants, "Knee Correct R"),
        ("Foot L", "ankle_L", "toe_L", 0.14, 0.18, shoes, None),
        ("Foot R", "ankle_R", "toe_R", 0.14, 0.18, shoes, None),
    ]
    for z_order, (bone_name, start_joint, end_joint, start_width, end_width,
                  fill_color, correction) in enumerate(segment_specs, start=1):
        mesh = generate_segment_mesh(
            joint_world[start_joint],
            joint_world[end_joint],
            start_width,
            end_width,
            fill_color,
            bone_index[bone_name],
            bone_name,
        )
        if correction is not None:
            _attach_joint_correction(mesh, correction, bone_name[-1])
        body_parts.append(_mesh_part(bone_name, mesh, bone_name, z_order))

    head_switch = _vector_switch(
        "sw_head", "Head", head_states, "Head", absolute_angles, 40,
    )
    head_switch.is_head_turn = True
    head_switch.head_turn_views = list(HEAD_VIEWS)
    mouth_switch = _vector_switch(
        "sw_mouth", "Mouth", mouth_states, "Head", absolute_angles, 43,
    )
    eyes_switch = _vector_switch(
        "sw_eyes", "Eyes", eye_states, "Head", absolute_angles, 42,
    )
    brows_switch = _vector_switch(
        "sw_brows", "Brows", brow_states, "Head", absolute_angles, 41,
    )
    hand_left_switch = _vector_switch(
        "sw_hand_l", "Hand Switch L", hand_states["L"],
        "LowerArm L", absolute_angles, 30,
    )
    hand_right_switch = _vector_switch(
        "sw_hand_r", "Hand Switch R", hand_states["R"],
        "LowerArm R", absolute_angles, 31,
    )

    head_dial = Bone(
        id="Head Switch",
        parent=None,
        position=(1.30, 0.90),
        angle=HEAD_TURN_ANGLES[0],
        length=0.25,
        strength=0.0,
        constraints=True,
        min_constraint=HEAD_TURN_CONSTRAINTS[1],
        max_constraint=HEAD_TURN_CONSTRAINTS[2],
        is_dial=True,
    )
    wire_dial(
        head_dial,
        "Head Switch",
        HEAD_TURN_ANGLES,
        head_switch,
        head_turn_map(list(HEAD_VIEWS)),
    )
    head_dial.angle_channel = Channel(
        type="Val",
        when=[0, 1, 12, 24, 36],
        val=[HEAD_TURN_ANGLES[0], HEAD_TURN_ANGLES[0], HEAD_TURN_ANGLES[0],
             HEAD_TURN_ANGLES[4], HEAD_TURN_ANGLES[0]],
        interp=[dict(BASE_INTERP) for _ in range(5)],
    )

    mouth_values, mouth_min, mouth_max = simple_dial_vals(len(PHONEMES))
    mouth_dial = Bone(
        id="Mouth Switch",
        parent=None,
        position=(1.30, 0.55),
        angle=mouth_values[0],
        length=0.25,
        strength=0.0,
        constraints=True,
        min_constraint=mouth_min,
        max_constraint=mouth_max,
        is_dial=True,
    )
    wire_dial(mouth_dial, "Mouth Switch", mouth_values, mouth_switch, list(PHONEMES))
    mouth_dial.angle_channel = Channel(
        type="Val",
        when=[0, 1, 12, 24, 36],
        val=[mouth_values[0], mouth_values[0], mouth_values[0], mouth_values[0], mouth_values[2]],
        interp=[dict(BASE_INTERP) for _ in range(5)],
    )

    eye_values, eye_min, eye_max = simple_dial_vals(len(eye_states))
    eyes_dial = Bone(
        id="Eyes Switch",
        parent=None,
        position=(1.30, 0.20),
        angle=eye_values[0],
        length=0.25,
        strength=0.0,
        constraints=True,
        min_constraint=eye_min,
        max_constraint=eye_max,
        is_dial=True,
    )
    wire_dial(eyes_dial, "Eyes Switch", eye_values, eyes_switch, list(eye_states))
    eyes_dial.angle_channel = Channel(
        type="Val",
        when=[0, 1, 12, 24, 36],
        val=[eye_values[0], eye_values[0], eye_values[0], eye_values[1], eye_values[0]],
        interp=[dict(BASE_INTERP) for _ in range(5)],
    )

    hand_dials: list[Bone] = []
    for side, switch, x_position in (
        ("L", hand_left_switch, -1.30),
        ("R", hand_right_switch, 1.30),
    ):
        hand_values, hand_min, hand_max = simple_dial_vals(len(hand_pose_names))
        dial = Bone(
            id=f"Hand Switch {side}",
            parent=None,
            position=(x_position, -0.20),
            angle=hand_values[0],
            length=0.25,
            strength=0.0,
            constraints=True,
            min_constraint=hand_min,
            max_constraint=hand_max,
            is_dial=True,
        )
        wire_dial(dial, dial.id, hand_values, switch, hand_pose_names)
        diagnostic_pose = 1 if side == "L" else 2
        dial.angle_channel = Channel(
            type="Val",
            when=[0, 1, 12, 24, 36],
            val=[hand_values[0], hand_values[0], hand_values[diagnostic_pose],
                 hand_values[0], hand_values[3]],
            interp=[dict(BASE_INTERP) for _ in range(5)],
        )
        hand_dials.append(dial)

    bones.extend([head_dial, mouth_dial, eyes_dial, *hand_dials])
    root = Part(
        id="char_container",
        name=name,
        type="bone_container",
        children=[
            *body_parts,
            hand_left_switch,
            hand_right_switch,
            Part(
                id="grp_head",
                name="Head Structure",
                type="group",
                children=[head_switch, brows_switch, eyes_switch, mouth_switch],
                z_order=50,
            ),
        ],
    )
    rig.bones = bones
    rig.root_parts = [root]

    output = emit(rig, out_path)
    Path(output).with_suffix(".manifest.json").write_text(
        json.dumps(build_humanoid_manifest(rig), indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    return output


if __name__ == "__main__":
    output_file = compile_master_character()
    print(f"MASTER CHARACTER COMPILED TO: {output_file}")
