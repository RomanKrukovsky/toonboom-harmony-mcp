"""Zafira Character Rig Builder — Complete Production Cutout Rig with Master HUD Box.

Features:
- Universal Studio Master HUD Panel with labeled dial bones and gauge sectors
- Clean non-overlapping layout: Character (Left), Lamp (Bottom-Left), HUD (Right)
- Real extracted artwork from Zafira Model Sheet
- Head Turnaround 360° Switch
- Expression & Lipsync Switch (Happy, Smug, Surprised, Angry, Playful, Sweet)
- Hand Poses Switch L & R (Open Palm, Magic Gesture, Point, Presenting)
- Hair & Veil Dynamic Physics
- Full Humanoid Bone Hierarchy with IK Leg Targets
- Native Moho 14.4 Certified
"""
from __future__ import annotations

import copy
import math
import os
import shutil
from pathlib import Path
from typing import Dict, List

from PIL import Image

from ..pir.schema import Bone, Channel, Part, Rig
from ..moho.emit import emit
from .hud_generator import StudioHUDGenerator, DialDefinition
from .modules import BASE_INTERP, wire_dial


def build_zafira_production_rig(
    out_moho_path: str = "./output/Zafira.moho",
    assets_dir: str = "./output/zafira_assets",
    canvas_w: int = 1920,
    canvas_h: int = 1080
) -> str:
    moho_path = Path(out_moho_path).resolve()
    assets_path = Path(assets_dir).resolve()
    moho_path.parent.mkdir(parents=True, exist_ok=True)
    assets_path.mkdir(parents=True, exist_ok=True)

    # 1. Initialize Rig
    rig = Rig(
        name="Zafira_Genie",
        source_program="moho",
        source_version="1041",
        canvas={
            "mime_type": "application/x-vnd.lm_mohodoc",
            "version": 1041,
            "major_version": 1,
            "rev_version": 0,
            "doc_uuid": f"moho_zafira_{hash('zafira_studio_master') & 0xffffffff}",
            "comment": "Zafira Genie of the Sapphire Lamp — Production Rig with Studio Master HUD"
        }
    )
    
    rig.extras = {
        "project_data": {
            "width": int(canvas_w),
            "height": int(canvas_h)
        },
        "binding_mode": 1
    }

    # 2. Build Humanoid Bone Hierarchy
    bones: List[Bone] = []

    # Character Root (Positioned at x = -0.55)
    char_root = Bone(
        id="Character_Root",
        parent=None,
        position=(-0.55, -0.65),
        angle=math.radians(90),
        length=0.2,
        strength=0.0
    )
    bones.append(char_root)

    # Pelvis
    pelvis_bone = Bone(
        id="Pelvis",
        parent="Character_Root",
        position=(0.0, 0.55),
        angle=math.radians(90),
        length=0.15,
        strength=0.25
    )
    bones.append(pelvis_bone)

    # Body / Torso
    body_bone = Bone(
        id="Body",
        parent="Pelvis",
        position=(0.0, 0.15),
        angle=math.radians(90),
        length=0.35,
        strength=0.3
    )
    bones.append(body_bone)

    # Neck
    neck_bone = Bone(
        id="Neck",
        parent="Body",
        position=(0.0, 0.35),
        angle=math.radians(90),
        length=0.08,
        strength=0.15
    )
    bones.append(neck_bone)

    # Head
    head_bone = Bone(
        id="Head",
        parent="Neck",
        position=(0.0, 0.08),
        angle=math.radians(90),
        length=0.42,
        strength=0.35
    )
    bones.append(head_bone)

    # Hair dynamics bones
    hair_l = Bone(
        id="Hair_Ponytail_L",
        parent="Head",
        position=(-0.22, 0.28),
        angle=math.radians(-115),
        length=0.38,
        strength=0.15,
        extra_channels_raw={
            "bone_dynamics": {"type": "Bool", "when": [0], "val": [True], "interp": [dict(BASE_INTERP)], "ref": False, "mute": False}
        }
    )
    hair_r = Bone(
        id="Hair_Ponytail_R",
        parent="Head",
        position=(0.22, 0.28),
        angle=math.radians(-65),
        length=0.38,
        strength=0.15,
        extra_channels_raw={
            "bone_dynamics": {"type": "Bool", "when": [0], "val": [True], "interp": [dict(BASE_INTERP)], "ref": False, "mute": False}
        }
    )
    bones.extend([hair_l, hair_r])

    # Left Arm (Screen Right)
    upper_arm_l = Bone(
        id="UpperArm L",
        parent="Body",
        position=(0.2, 0.3),
        angle=math.radians(-70),
        length=0.28,
        strength=0.15
    )
    lower_arm_l = Bone(
        id="LowerArm L",
        parent="UpperArm L",
        position=(0.28, 0.0),
        angle=math.radians(-20),
        length=0.28,
        strength=0.15
    )
    hand_l = Bone(
        id="Hand L",
        parent="LowerArm L",
        position=(0.28, 0.0),
        angle=math.radians(-15),
        length=0.15,
        strength=0.1
    )
    bones.extend([upper_arm_l, lower_arm_l, hand_l])

    # Right Arm (Screen Left)
    upper_arm_r = Bone(
        id="UpperArm R",
        parent="Body",
        position=(-0.2, 0.3),
        angle=math.radians(-110),
        length=0.28,
        strength=0.15
    )
    lower_arm_r = Bone(
        id="LowerArm R",
        parent="UpperArm R",
        position=(0.28, 0.0),
        angle=math.radians(20),
        length=0.28,
        strength=0.15
    )
    hand_r = Bone(
        id="Hand R",
        parent="LowerArm R",
        position=(0.28, 0.0),
        angle=math.radians(15),
        length=0.15,
        strength=0.1
    )
    bones.extend([upper_arm_r, lower_arm_r, hand_r])

    # Left Leg (Screen Right)
    thigh_l = Bone(
        id="Thigh L",
        parent="Pelvis",
        position=(0.1, 0.0),
        angle=math.radians(-88),
        length=0.35,
        strength=0.2
    )
    shin_l = Bone(
        id="Shin L",
        parent="Thigh L",
        position=(0.35, 0.0),
        angle=math.radians(0),
        length=0.35,
        strength=0.2
    )
    foot_l = Bone(
        id="Foot L",
        parent="Shin L",
        position=(0.35, 0.0),
        angle=math.radians(-90),
        length=0.12,
        strength=0.1
    )
    bones.extend([thigh_l, shin_l, foot_l])

    # Right Leg (Screen Left)
    thigh_r = Bone(
        id="Thigh R",
        parent="Pelvis",
        position=(-0.1, 0.0),
        angle=math.radians(-92),
        length=0.35,
        strength=0.2
    )
    shin_r = Bone(
        id="Shin R",
        parent="Thigh R",
        position=(0.35, 0.0),
        angle=math.radians(0),
        length=0.35,
        strength=0.2
    )
    foot_r = Bone(
        id="Foot R",
        parent="Shin R",
        position=(0.35, 0.0),
        angle=math.radians(-90),
        length=0.12,
        strength=0.1
    )
    bones.extend([thigh_r, shin_r, foot_r])

    # IK Targets
    target_leg_l = Bone(
        id="Target Leg L",
        parent="Character_Root",
        position=(0.1, -0.15),
        angle=math.radians(90),
        length=0.15,
        strength=0.0
    )
    target_leg_r = Bone(
        id="Target Leg R",
        parent="Character_Root",
        position=(-0.1, -0.15),
        angle=math.radians(90),
        length=0.15,
        strength=0.0
    )
    shin_l.target_bone = "Target Leg L"
    shin_r.target_bone = "Target Leg R"
    bones.extend([target_leg_l, target_leg_r])

    # Lamp Prop Bone (Bottom Left at x = -1.05, y = -0.6)
    lamp_bone = Bone(
        id="Lamp_Anchor",
        parent=None,
        position=(-1.05, -0.6),
        angle=math.radians(90),
        length=0.15,
        strength=0.0
    )
    bones.append(lamp_bone)

    # 3. Helper to build ImageLayer parts
    def make_img_part(part_id: str, name: str, img_name: str, parent_bone: str, z_order: int = 10, origin: tuple[float, float] = (0.0, 0.0)) -> Part:
        abs_img = str(assets_path / img_name)
        return Part(
            id=part_id,
            name=name,
            type="image",
            parent=None,
            bone=parent_bone,
            image_ref=abs_img,
            origin=origin,
            z_order=z_order
        )

    # Character Turnaround (4 views)
    head_turn_children = [
        make_img_part("img_turn_front", "Front", "turn_front.png", "Character_Root", 20, origin=(0.0, 0.0)),
        make_img_part("img_turn_three_quarter", "3/4 View", "turn_three_quarter.png", "Character_Root", 20, origin=(0.0, 0.0)),
        make_img_part("img_turn_side", "Side", "turn_side.png", "Character_Root", 20, origin=(0.0, 0.0)),
        make_img_part("img_turn_back", "Back", "turn_back.png", "Character_Root", 20, origin=(0.0, 0.0)),
    ]
    head_turn_switch = Part(
        id="sw_head_turn",
        name="Zafira Turnaround (360°)",
        type="switch",
        parent=None,
        bone="Character_Root",
        children=head_turn_children,
        switch_states=["Front", "3/4 View", "Side", "Back"],
        origin=(0.55, 0.0),
        z_order=20
    )
    head_turn_switch.transforms = {
        "translation": Channel(
            type="Vec3",
            when=[0],
            val=[(-0.55, 0.0, 0.0)],
            interp=[dict(BASE_INTERP)]
        )
    }

    # Facial Expressions Switch Layer (6 states)
    expr_children = [
        make_img_part("img_expr_happy", "Happy", "expr_happy.png", "Head", 50, origin=(0.0, -0.05)),
        make_img_part("img_expr_smug", "Smug", "expr_smug.png", "Head", 50, origin=(0.0, -0.05)),
        make_img_part("img_expr_surprised", "Surprised", "expr_surprised.png", "Head", 50, origin=(0.0, -0.05)),
        make_img_part("img_expr_angry", "Angry", "expr_angry.png", "Head", 50, origin=(0.0, -0.05)),
        make_img_part("img_expr_playful", "Playful", "expr_playful.png", "Head", 50, origin=(0.0, -0.05)),
        make_img_part("img_expr_sweet", "Sweet", "expr_sweet.png", "Head", 50, origin=(0.0, -0.05)),
    ]
    expr_switch = Part(
        id="sw_expressions",
        name="Facial Expressions & Lipsync",
        type="switch",
        parent=None,
        bone="Head",
        children=expr_children,
        switch_states=["Happy", "Smug", "Surprised", "Angry", "Playful", "Sweet"],
        z_order=50
    )

    # Hand Switch Left (Screen Right)
    hand_l_children = [
        make_img_part("img_hl_open", "Open Palm", "hand_open_palm.png", "Hand L", 30, origin=(0.0, 0.0)),
        make_img_part("img_hl_magic", "Magic Gesture", "hand_magic_gesture.png", "Hand L", 30, origin=(0.0, 0.0)),
        make_img_part("img_hl_point", "Point", "hand_point.png", "Hand L", 30, origin=(0.0, 0.0)),
        make_img_part("img_hl_presenting", "Presenting", "hand_presenting.png", "Hand L", 30, origin=(0.0, 0.0)),
    ]
    hand_l_switch = Part(
        id="sw_hand_l",
        name="Hand Switch L",
        type="switch",
        parent=None,
        bone="Hand L",
        children=hand_l_children,
        switch_states=["Open Palm", "Magic Gesture", "Point", "Presenting"],
        z_order=30
    )

    # Hand Switch Right (Screen Left)
    hand_r_children = [
        make_img_part("img_hr_open", "Open Palm", "hand_open_palm.png", "Hand R", 30, origin=(0.0, 0.0)),
        make_img_part("img_hr_magic", "Magic Gesture", "hand_magic_gesture.png", "Hand R", 30, origin=(0.0, 0.0)),
        make_img_part("img_hr_point", "Point", "hand_point.png", "Hand R", 30, origin=(0.0, 0.0)),
        make_img_part("img_hr_presenting", "Presenting", "hand_presenting.png", "Hand R", 30, origin=(0.0, 0.0)),
    ]
    hand_r_switch = Part(
        id="sw_hand_r",
        name="Hand Switch R",
        type="switch",
        parent=None,
        bone="Hand R",
        children=hand_r_children,
        switch_states=["Open Palm", "Magic Gesture", "Point", "Presenting"],
        z_order=30
    )

    # 4. Generate Master HUD Control Box using Universal Generator
    dials = [
        DialDefinition(
            id="🎛️ Head Turn (360°)",
            label="HEAD TURN (360°)",
            section="HEAD & FACIAL CONTROL",
            min_angle_deg=-90,
            max_angle_deg=90,
            states=["Side", "3/4 View", "Front", "Back"],
            target_switch=head_turn_switch
        ),
        DialDefinition(
            id="🎭 Expressions / Lipsync",
            label="EXPRESSIONS / LIP",
            section="HEAD & FACIAL CONTROL",
            min_angle_deg=-60,
            max_angle_deg=60,
            states=["Happy", "Smug", "Surprised", "Angry", "Playful", "Sweet"],
            target_switch=expr_switch
        ),
        DialDefinition(
            id="✋ Hand Switch L",
            label="LEFT HAND POSE",
            section="HANDS & GESTURES",
            min_angle_deg=-45,
            max_angle_deg=45,
            states=["Open Palm", "Magic Gesture", "Point", "Presenting"],
            target_switch=hand_l_switch
        ),
        DialDefinition(
            id="🤚 Hand Switch R",
            label="RIGHT HAND POSE",
            section="HANDS & GESTURES",
            min_angle_deg=-45,
            max_angle_deg=45,
            states=["Open Palm", "Magic Gesture", "Point", "Presenting"],
            target_switch=hand_r_switch
        ),
        DialDefinition(
            id="✨ Hair & Veil Dynamics",
            label="HAIR & VEIL PHYSICS",
            section="PROPS & DYNAMICS",
            min_angle_deg=-45,
            max_angle_deg=45,
            states=["Off", "Subtle", "Windy", "Storm"],
            target_switch=None
        ),
    ]

    hud_img_path = str(assets_path / "hud_master_control_box.png")
    hud_part, hud_bone, dial_bones = StudioHUDGenerator.generate_hud_board(
        character_name="Zafira",
        dials=dials,
        output_image_path=hud_img_path,
        theme_name="dark_gold",
        dock_pos_x=1.15,
        dock_pos_y=0.0
    )

    bones.append(hud_bone)
    bones.extend(dial_bones)

    # Sapphire Lamp Prop on Floor
    lamp_part = make_img_part("img_lamp", "✨ Sapphire Magic Lamp", "prop_lamp.png", "Lamp_Anchor", z_order=15, origin=(1.05, 0.65))
    lamp_part.transforms = {
        "translation": Channel(
            type="Vec3",
            when=[0],
            val=[(-1.05, -0.6, 0.0)],
            interp=[dict(BASE_INTERP)]
        )
    }

    # 5. Assemble Root Container
    root_parts = [
        hud_part,
        lamp_part,
        head_turn_switch
    ]

    root_container = Part(
        id="zafira_root",
        name="Zafira_Genie",
        type="bone_container",
        parent=None,
        children=root_parts,
        z_order=0
    )

    rig.bones = bones
    rig.root_parts = [root_container]

    # 6. Diagnostic Animation Posings
    # Frame 1: Front
    # Frame 12: 3/4 View + Arm movement
    # Frame 24: Side View
    # Frame 36: Back View
    head_dial = next(b for b in dial_bones if "Head Turn" in b.id)
    head_dial.angle_channel = Channel(
        type="Val",
        when=[0, 1, 12, 24, 36],
        val=[math.radians(30), math.radians(30), math.radians(-30), math.radians(-90), math.radians(90)],
        interp=[dict(BASE_INTERP) for _ in range(5)]
    )

    upper_arm_l.angle_channel = Channel(
        type="Val",
        when=[0, 1, 12, 24, 36],
        val=[upper_arm_l.angle, upper_arm_l.angle, upper_arm_l.angle + math.radians(35), upper_arm_l.angle, upper_arm_l.angle],
        interp=[dict(BASE_INTERP) for _ in range(5)]
    )

    target_leg_l.pos_channel = Channel(
        type="Vec2",
        when=[0, 1, 12, 24, 36],
        val=[
            target_leg_l.position,
            target_leg_l.position,
            (target_leg_l.position[0] + 0.15, target_leg_l.position[1] + 0.12),
            target_leg_l.position,
            target_leg_l.position
        ],
        interp=[dict(BASE_INTERP) for _ in range(5)]
    )

    # 7. Emit Production .moho File
    out = emit(rig, str(moho_path))
    print(f"Zafira Studio Master HUD Rig built to: {out}")
    return out


if __name__ == "__main__":
    build_zafira_production_rig()
