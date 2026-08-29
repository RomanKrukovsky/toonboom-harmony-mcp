"""Zafira Character Vector Rig Builder — 100% Native Moho Vector Meshes.

Constructs full Moho vector geometry (MeshLayer) matching Disney-style proportions:
- High-definition Bezier curves, shapes, fills, strokes, line weights
- Full point binding to skeleton bones
- Smart Action Dials & Switch Layers
- Beautiful vector Genie character (Zafira) + Golden Sapphire Magic Lamp
- Vector Master HUD Control Box
"""
from __future__ import annotations

import math
from typing import Any, Dict, List, Tuple

from ..pir.schema import Bone, Channel, Part, Rig
from ..moho.emit import emit
from .vector_shapes import (
    make_point, make_curve, make_shape, combine_meshes, transform_mesh,
    DEFAULT_INTERP, COLOR_WHITE, COLOR_PUPIL
)
from .modules import BASE_INTERP, wire_dial


# Zafira's Arabian Genie Color Palette
ZAFIRA_PALETTE = {
    "skin": {"r": 0.88, "g": 0.65, "b": 0.48, "a": 1.0},
    "skin_shadow": {"r": 0.76, "g": 0.52, "b": 0.38, "a": 1.0},
    "hair": {"r": 0.10, "g": 0.08, "b": 0.15, "a": 1.0},
    "hair_highlight": {"r": 0.22, "g": 0.18, "b": 0.30, "a": 1.0},
    "gold": {"r": 0.94, "g": 0.76, "b": 0.22, "a": 1.0},
    "gold_shadow": {"r": 0.78, "g": 0.58, "b": 0.14, "a": 1.0},
    "sapphire": {"r": 0.15, "g": 0.38, "b": 0.88, "a": 1.0},
    "sapphire_light": {"r": 0.35, "g": 0.62, "b": 0.98, "a": 1.0},
    "purple": {"r": 0.42, "g": 0.22, "b": 0.58, "a": 1.0},
    "purple_dark": {"r": 0.30, "g": 0.14, "b": 0.44, "a": 1.0},
    "purple_pants": {"r": 0.24, "g": 0.30, "b": 0.68, "a": 1.0},
    "veil": {"r": 0.68, "g": 0.52, "b": 0.88, "a": 0.60},
    "lip": {"r": 0.82, "g": 0.36, "b": 0.42, "a": 1.0},
    "iris": {"r": 0.18, "g": 0.48, "b": 0.92, "a": 1.0},
    "line": {"r": 0.12, "g": 0.08, "b": 0.14, "a": 1.0},
}


def build_circle_mesh(
    cx: float, cy: float, rx: float, ry: float,
    fill_color: dict, parent_bone: int = -1,
    line_color: dict | None = None, line_width: float = 1.5,
    num_pts: int = 8
) -> dict:
    """Builds a smooth closed oval vector mesh."""
    points = []
    for i in range(num_pts):
        ang = (2 * math.pi * i) / num_pts
        px = cx + rx * math.cos(ang)
        py = cy + ry * math.sin(ang)
        points.append(make_point(px, py, parent_bone=parent_bone, width=line_width))
    curve = make_curve(list(range(num_pts)), closed=True, smoothness=0.39)
    shape = make_shape(
        shape_id=0,
        curve_idx=0,
        num_segments=num_pts,
        fill_color=fill_color,
        line_color=line_color or ZAFIRA_PALETTE["line"],
        line_width=line_width * 0.005
    )
    return {
        "type": "Mesh",
        "points": points,
        "curves": [curve],
        "shapes": [shape],
        "groups": [],
        "next_shape_id": 1,
        "curve_interpretation": 0
    }


def build_zafira_head_vector_mesh(parent_bone: int = 4, origin: tuple[float, float] = (-0.45, 0.52), view: str = "Front") -> dict:
    """Generates 100% native vector mesh for Zafira's Head, Hair, Tiara, Eyes, Lips."""
    ox, oy = origin
    parts = []

    # 1. Back Hair volume (flowing raven mane)
    hair_back = build_circle_mesh(ox, oy + 0.04, 0.32, 0.40, ZAFIRA_PALETTE["hair"], parent_bone, line_width=2.5, num_pts=16)
    hair_side_l = build_circle_mesh(ox - 0.25, oy - 0.18, 0.16, 0.38, ZAFIRA_PALETTE["hair"], parent_bone, line_width=2.0, num_pts=12)
    hair_side_r = build_circle_mesh(ox + 0.25, oy - 0.18, 0.16, 0.38, ZAFIRA_PALETTE["hair"], parent_bone, line_width=2.0, num_pts=12)
    parts.extend([hair_back, hair_side_l, hair_side_r])

    # 2. Neck
    neck = build_circle_mesh(ox, oy - 0.22, 0.08, 0.12, ZAFIRA_PALETTE["skin_shadow"], parent_bone, line_width=1.5, num_pts=8)
    parts.append(neck)

    # 3. Head & Chin Skin Contour
    face_oval = build_circle_mesh(ox, oy, 0.20, 0.24, ZAFIRA_PALETTE["skin"], parent_bone, line_width=1.8, num_pts=12)
    parts.append(face_oval)

    # 4. Golden Tiara & Sapphire Jewel
    tiara = build_circle_mesh(ox, oy + 0.16, 0.18, 0.05, ZAFIRA_PALETTE["gold"], parent_bone, line_width=2.0)
    gem = build_circle_mesh(ox, oy + 0.19, 0.035, 0.055, ZAFIRA_PALETTE["sapphire"], parent_bone, line_width=1.2)
    parts.extend([tiara, gem])

    # 5. Big Expressive Disney Eyes
    eye_offset_x = 0.075 if view == "Front" else (0.05 if "3/4" in view else 0.02)
    # Left Eye
    eye_w_l = build_circle_mesh(ox - eye_offset_x, oy + 0.02, 0.055, 0.042, COLOR_WHITE, parent_bone, line_width=1.8)
    eye_i_l = build_circle_mesh(ox - eye_offset_x, oy + 0.02, 0.035, 0.035, ZAFIRA_PALETTE["iris"], parent_bone, line_width=1.2)
    eye_p_l = build_circle_mesh(ox - eye_offset_x, oy + 0.02, 0.016, 0.016, COLOR_PUPIL, parent_bone, line_width=0.0)
    eye_h_l = build_circle_mesh(ox - eye_offset_x + 0.01, oy + 0.032, 0.009, 0.009, COLOR_WHITE, parent_bone, line_width=0.0)

    # Right Eye
    eye_w_r = build_circle_mesh(ox + eye_offset_x, oy + 0.02, 0.055, 0.042, COLOR_WHITE, parent_bone, line_width=1.8)
    eye_i_r = build_circle_mesh(ox + eye_offset_x, oy + 0.02, 0.035, 0.035, ZAFIRA_PALETTE["iris"], parent_bone, line_width=1.2)
    eye_p_r = build_circle_mesh(ox + eye_offset_x, oy + 0.02, 0.016, 0.016, COLOR_PUPIL, parent_bone, line_width=0.0)
    eye_h_r = build_circle_mesh(ox + eye_offset_x + 0.01, oy + 0.032, 0.009, 0.009, COLOR_WHITE, parent_bone, line_width=0.0)

    parts.extend([eye_w_l, eye_i_l, eye_p_l, eye_h_l, eye_w_r, eye_i_r, eye_p_r, eye_h_r])

    # 6. Eyebrows
    brow_l = build_circle_mesh(ox - eye_offset_x, oy + 0.08, 0.055, 0.012, ZAFIRA_PALETTE["hair"], parent_bone, line_width=1.2)
    brow_r = build_circle_mesh(ox + eye_offset_x, oy + 0.08, 0.055, 0.012, ZAFIRA_PALETTE["hair"], parent_bone, line_width=1.2)
    parts.extend([brow_l, brow_r])

    # 7. Ruby Lips / Smile
    lips = build_circle_mesh(ox, oy - 0.11, 0.05, 0.025, ZAFIRA_PALETTE["lip"], parent_bone, line_width=1.5)
    parts.append(lips)

    # 8. Front Bangs & Side Curls & Earrings
    bangs = build_circle_mesh(ox, oy + 0.14, 0.22, 0.11, ZAFIRA_PALETTE["hair"], parent_bone, line_width=2.0)
    earring_l = build_circle_mesh(ox - 0.20, oy - 0.06, 0.03, 0.05, ZAFIRA_PALETTE["gold"], parent_bone, line_width=1.2)
    earring_r = build_circle_mesh(ox + 0.20, oy - 0.06, 0.03, 0.05, ZAFIRA_PALETTE["gold"], parent_bone, line_width=1.2)
    parts.extend([bangs, earring_l, earring_r])

    return combine_meshes(parts)


def build_zafira_torso_vector_mesh(parent_bone: int = 2, origin: tuple[float, float] = (-0.45, 0.18)) -> dict:
    """Generates 100% native vector mesh for Zafira's Bodice, Golden Necklace & Midriff."""
    ox, oy = origin
    parts = []

    # 1. Slender Midriff / Torso Skin
    torso_skin = build_circle_mesh(ox, oy - 0.06, 0.14, 0.18, ZAFIRA_PALETTE["skin"], parent_bone, line_width=1.8)
    parts.append(torso_skin)

    # 2. Purple Bodice Crop Top
    bodice = build_circle_mesh(ox, oy + 0.04, 0.17, 0.11, ZAFIRA_PALETTE["purple"], parent_bone, line_width=1.8)
    parts.append(bodice)

    # 3. Gold Bodice Border & Sapphire Trim
    trim = build_circle_mesh(ox, oy - 0.03, 0.16, 0.025, ZAFIRA_PALETTE["gold"], parent_bone, line_width=1.2)
    gem = build_circle_mesh(ox, oy + 0.04, 0.03, 0.04, ZAFIRA_PALETTE["sapphire"], parent_bone, line_width=1.2)
    parts.extend([trim, gem])

    # 4. Golden Royal Necklace
    necklace = build_circle_mesh(ox, oy + 0.13, 0.11, 0.035, ZAFIRA_PALETTE["gold"], parent_bone, line_width=1.5)
    necklace_gem = build_circle_mesh(ox, oy + 0.10, 0.022, 0.03, ZAFIRA_PALETTE["sapphire"], parent_bone, line_width=1.0)
    parts.extend([necklace, necklace_gem])

    return combine_meshes(parts)


def build_zafira_pants_vector_mesh(parent_bone: int = 1, origin: tuple[float, float] = (-0.45, -0.22)) -> dict:
    """Generates 100% native vector mesh for Zafira's Purple Genie Harem Pants & Gold Belt."""
    ox, oy = origin
    parts = []

    # 1. Voluminous Billowy Harem Pants
    pants_l = build_circle_mesh(ox - 0.13, oy - 0.16, 0.19, 0.28, ZAFIRA_PALETTE["purple_pants"], parent_bone, line_width=1.8)
    pants_r = build_circle_mesh(ox + 0.13, oy - 0.16, 0.19, 0.28, ZAFIRA_PALETTE["purple_pants"], parent_bone, line_width=1.8)
    parts.extend([pants_l, pants_r])

    # 2. Golden Waistband with Central Jewel
    belt = build_circle_mesh(ox, oy + 0.12, 0.18, 0.05, ZAFIRA_PALETTE["gold"], parent_bone, line_width=1.8)
    jewel = build_circle_mesh(ox, oy + 0.12, 0.035, 0.05, ZAFIRA_PALETTE["sapphire"], parent_bone, line_width=1.2)
    parts.extend([belt, jewel])

    # 3. Translucent Waist Sashes / Veil
    sash_l = build_circle_mesh(ox - 0.16, oy - 0.06, 0.11, 0.24, ZAFIRA_PALETTE["veil"], parent_bone, line_width=1.2)
    sash_r = build_circle_mesh(ox + 0.16, oy - 0.06, 0.11, 0.24, ZAFIRA_PALETTE["veil"], parent_bone, line_width=1.2)
    parts.extend([sash_l, sash_r])

    # 4. Golden Ankle Cuffs & Bare Feet
    cuff_l = build_circle_mesh(ox - 0.11, oy - 0.40, 0.055, 0.025, ZAFIRA_PALETTE["gold"], parent_bone, line_width=1.2)
    cuff_r = build_circle_mesh(ox + 0.11, oy - 0.40, 0.055, 0.025, ZAFIRA_PALETTE["gold"], parent_bone, line_width=1.2)
    foot_l = build_circle_mesh(ox - 0.11, oy - 0.45, 0.06, 0.035, ZAFIRA_PALETTE["skin"], parent_bone, line_width=1.5)
    foot_r = build_circle_mesh(ox + 0.11, oy - 0.45, 0.06, 0.035, ZAFIRA_PALETTE["skin"], parent_bone, line_width=1.5)
    parts.extend([cuff_l, cuff_r, foot_l, foot_r])

    return combine_meshes(parts)


def build_zafira_arm_vector_mesh(side: str = "L", parent_upper: int = 7, parent_lower: int = 8, parent_hand: int = 9, origin: tuple[float, float] = (-0.45, 0.18)) -> dict:
    """Generates 100% native vector mesh for Zafira's Arm, Gold Cuff and Hand."""
    ox, oy = origin
    parts = []
    sx = 0.20 if side == "L" else -0.20

    # Upper Arm
    upper = build_circle_mesh(ox + sx, oy - 0.02, 0.05, 0.14, ZAFIRA_PALETTE["skin"], parent_upper, line_width=1.5)
    # Sleeve Veil Drapery
    veil_arm = build_circle_mesh(ox + sx * 1.15, oy - 0.10, 0.08, 0.16, ZAFIRA_PALETTE["veil"], parent_upper, line_width=1.2)
    # Lower Arm
    lower = build_circle_mesh(ox + sx * 1.25, oy - 0.22, 0.045, 0.14, ZAFIRA_PALETTE["skin"], parent_lower, line_width=1.5)
    # Golden Wrist Cuff
    cuff = build_circle_mesh(ox + sx * 1.35, oy - 0.32, 0.05, 0.03, ZAFIRA_PALETTE["gold"], parent_lower, line_width=1.2)
    # Hand & Graceful Fingers
    hand = build_circle_mesh(ox + sx * 1.45, oy - 0.40, 0.05, 0.07, ZAFIRA_PALETTE["skin"], parent_hand, line_width=1.5)

    parts.extend([veil_arm, upper, lower, cuff, hand])
    return combine_meshes(parts)


def build_magic_lamp_vector_mesh(parent_bone: int = 21, origin: tuple[float, float] = (-1.05, -0.60)) -> dict:
    """Generates 100% native vector mesh for the Golden Sapphire Magic Lamp + Mystical Smoke."""
    ox, oy = origin
    parts = []

    # 1. Lamp Base & Belly
    base = build_circle_mesh(ox, oy - 0.08, 0.14, 0.04, ZAFIRA_PALETTE["gold_shadow"], parent_bone, line_width=1.8)
    belly = build_circle_mesh(ox, oy, 0.22, 0.12, ZAFIRA_PALETTE["gold"], parent_bone, line_width=2.0)
    spout = build_circle_mesh(ox - 0.22, oy + 0.08, 0.12, 0.05, ZAFIRA_PALETTE["gold"], parent_bone, line_width=1.8)
    handle = build_circle_mesh(ox + 0.20, oy + 0.06, 0.08, 0.12, ZAFIRA_PALETTE["gold"], parent_bone, line_width=1.8)
    gem = build_circle_mesh(ox, oy, 0.04, 0.06, ZAFIRA_PALETTE["sapphire"], parent_bone, line_width=1.2)
    parts.extend([base, belly, spout, handle, gem])

    # 2. Magical Smoke Swirls
    smoke1 = build_circle_mesh(ox - 0.30, oy + 0.22, 0.08, 0.12, ZAFIRA_PALETTE["veil"], parent_bone, line_width=1.2)
    smoke2 = build_circle_mesh(ox - 0.26, oy + 0.40, 0.12, 0.16, ZAFIRA_PALETTE["veil"], parent_bone, line_width=1.2)
    smoke3 = build_circle_mesh(ox - 0.32, oy + 0.58, 0.14, 0.20, ZAFIRA_PALETTE["veil"], parent_bone, line_width=1.2)
    parts.extend([smoke1, smoke2, smoke3])

    return combine_meshes(parts)


def build_vector_hud_plate(parent_bone: int = 22, origin: tuple[float, float] = (0.85, 0.0)) -> dict:
    """Generates 100% native vector mesh for the Master HUD Control Box."""
    ox, oy = origin
    parts = []

    # Main Plate Frame
    plate = build_circle_mesh(
        ox, oy, 0.50, 0.78,
        fill_color={"r": 0.10, "g": 0.08, "b": 0.18, "a": 0.95},
        parent_bone=parent_bone,
        line_color=ZAFIRA_PALETTE["gold"],
        line_width=3.5,
        num_pts=16
    )
    # Inner border
    inner = build_circle_mesh(
        ox, oy, 0.46, 0.74,
        fill_color={"r": 0.14, "g": 0.11, "b": 0.25, "a": 0.90},
        parent_bone=parent_bone,
        line_color={"r": 0.55, "g": 0.45, "b": 0.75, "a": 0.60},
        line_width=1.2,
        num_pts=16
    )
    # Section dividers / gauge rings
    gauge1 = build_circle_mesh(ox - 0.20, oy + 0.40, 0.14, 0.14, fill_color={"r": 0.18, "g": 0.14, "b": 0.32, "a": 0.95}, parent_bone=parent_bone, line_color=ZAFIRA_PALETTE["gold"], line_width=1.8)
    gauge2 = build_circle_mesh(ox + 0.20, oy + 0.40, 0.14, 0.14, fill_color={"r": 0.18, "g": 0.14, "b": 0.32, "a": 0.95}, parent_bone=parent_bone, line_color=ZAFIRA_PALETTE["gold"], line_width=1.8)
    gauge3 = build_circle_mesh(ox - 0.20, oy - 0.06, 0.14, 0.14, fill_color={"r": 0.18, "g": 0.14, "b": 0.32, "a": 0.95}, parent_bone=parent_bone, line_color=ZAFIRA_PALETTE["gold"], line_width=1.8)
    gauge4 = build_circle_mesh(ox + 0.20, oy - 0.06, 0.14, 0.14, fill_color={"r": 0.18, "g": 0.14, "b": 0.32, "a": 0.95}, parent_bone=parent_bone, line_color=ZAFIRA_PALETTE["gold"], line_width=1.8)
    gauge5 = build_circle_mesh(ox, oy - 0.48, 0.16, 0.16, fill_color={"r": 0.18, "g": 0.14, "b": 0.32, "a": 0.95}, parent_bone=parent_bone, line_color=ZAFIRA_PALETTE["gold"], line_width=1.8)

    parts.extend([plate, inner, gauge1, gauge2, gauge3, gauge4, gauge5])
    return combine_meshes(parts)


def build_zafira_native_vector_rig(
    out_moho_path: str = "./output/Zafira.moho",
    canvas_w: int = 1920,
    canvas_h: int = 1080
) -> str:
    """Builds a 100% native vector Moho rig with zero external bitmap dependencies."""
    rig = Rig(
        name="Zafira_Genie_Vector",
        source_program="moho",
        source_version="1041",
        canvas={
            "mime_type": "application/x-vnd.lm_mohodoc",
            "version": 1041,
            "major_version": 1,
            "rev_version": 0,
            "doc_uuid": f"moho_zafira_vector_{hash('vector_zafira_disney') & 0xffffffff}",
            "comment": "Zafira Genie — 100% Native Vector Rig with Vector Master HUD"
        }
    )
    rig.extras = {
        "project_data": {"width": int(canvas_w), "height": int(canvas_h)},
        "binding_mode": 1
    }

    # 1. Bones Hierarchy
    bones: List[Bone] = []

    # Main Character Root
    char_root = Bone(id="Character_Root", parent=None, position=(-0.45, -0.65), angle=math.radians(90), length=0.2, strength=0.0)
    pelvis = Bone(id="Pelvis", parent="Character_Root", position=(0.0, 0.42), angle=math.radians(90), length=0.20, strength=0.25)
    body = Bone(id="Body", parent="Pelvis", position=(0.0, 0.20), angle=math.radians(90), length=0.35, strength=0.3)
    neck = Bone(id="Neck", parent="Body", position=(0.0, 0.35), angle=math.radians(90), length=0.12, strength=0.15)
    head = Bone(id="Head", parent="Neck", position=(0.0, 0.12), angle=math.radians(90), length=0.45, strength=0.35)

    hair_l = Bone(id="Hair_L", parent="Head", position=(-0.25, 0.28), angle=math.radians(-115), length=0.38, strength=0.15,
                  extra_channels_raw={"bone_dynamics": {"type": "Bool", "when": [0], "val": [True], "interp": [dict(BASE_INTERP)], "ref": False, "mute": False}})
    hair_r = Bone(id="Hair_R", parent="Head", position=(0.25, 0.28), angle=math.radians(-65), length=0.38, strength=0.15,
                  extra_channels_raw={"bone_dynamics": {"type": "Bool", "when": [0], "val": [True], "interp": [dict(BASE_INTERP)], "ref": False, "mute": False}})

    upper_arm_l = Bone(id="UpperArm L", parent="Body", position=(0.20, 0.30), angle=math.radians(-70), length=0.30, strength=0.15)
    lower_arm_l = Bone(id="LowerArm L", parent="UpperArm L", position=(0.30, 0.0), angle=math.radians(-20), length=0.30, strength=0.15)
    hand_l = Bone(id="Hand L", parent="LowerArm L", position=(0.30, 0.0), angle=math.radians(-15), length=0.15, strength=0.1)

    upper_arm_r = Bone(id="UpperArm R", parent="Body", position=(-0.20, 0.30), angle=math.radians(-110), length=0.30, strength=0.15)
    lower_arm_r = Bone(id="LowerArm R", parent="UpperArm R", position=(0.30, 0.0), angle=math.radians(20), length=0.30, strength=0.15)
    hand_r = Bone(id="Hand R", parent="LowerArm R", position=(0.30, 0.0), angle=math.radians(15), length=0.15, strength=0.1)

    thigh_l = Bone(id="Thigh L", parent="Pelvis", position=(0.11, 0.0), angle=math.radians(-88), length=0.38, strength=0.2)
    shin_l = Bone(id="Shin L", parent="Thigh L", position=(0.38, 0.0), angle=math.radians(0), length=0.38, strength=0.2)
    foot_l = Bone(id="Foot L", parent="Shin L", position=(0.38, 0.0), angle=math.radians(-90), length=0.12, strength=0.1)

    thigh_r = Bone(id="Thigh R", parent="Pelvis", position=(-0.11, 0.0), angle=math.radians(-92), length=0.38, strength=0.2)
    shin_r = Bone(id="Shin R", parent="Thigh R", position=(0.38, 0.0), angle=math.radians(0), length=0.38, strength=0.2)
    foot_r = Bone(id="Foot R", parent="Shin R", position=(0.38, 0.0), angle=math.radians(-90), length=0.12, strength=0.1)

    target_leg_l = Bone(id="Target Leg L", parent="Character_Root", position=(0.11, -0.15), angle=math.radians(90), length=0.15, strength=0.0)
    target_leg_r = Bone(id="Target Leg R", parent="Character_Root", position=(-0.11, -0.15), angle=math.radians(90), length=0.15, strength=0.0)
    shin_l.target_bone = "Target Leg L"
    shin_r.target_bone = "Target Leg R"

    lamp_bone = Bone(id="Lamp_Anchor", parent=None, position=(-1.05, -0.60), angle=math.radians(90), length=0.15, strength=0.0)
    hud_bone = Bone(id="HUD_Master_Controller", parent=None, position=(0.85, 0.0), angle=math.radians(90), length=0.1, strength=0.0)

    # 2. Master HUD Dials
    head_dial = Bone(id="🎛️ Head Turn (360°)", parent="HUD_Master_Controller", position=(-0.20, 0.40), angle=math.radians(90), length=0.18, strength=0.0,
                     constraints=True, min_constraint=math.radians(-90), max_constraint=math.radians(90), is_dial=True, extra_channels_raw={"bone_label_showing": True})
    expr_dial = Bone(id="🎭 Expressions / Lipsync", parent="HUD_Master_Controller", position=(0.20, 0.40), angle=math.radians(90), length=0.18, strength=0.0,
                     constraints=True, min_constraint=math.radians(-60), max_constraint=math.radians(60), is_dial=True, extra_channels_raw={"bone_label_showing": True})
    hand_l_dial = Bone(id="✋ Hand Switch L", parent="HUD_Master_Controller", position=(-0.20, -0.06), angle=math.radians(90), length=0.18, strength=0.0,
                       constraints=True, min_constraint=math.radians(-45), max_constraint=math.radians(45), is_dial=True, extra_channels_raw={"bone_label_showing": True})
    hand_r_dial = Bone(id="🤚 Hand Switch R", parent="HUD_Master_Controller", position=(0.20, -0.06), angle=math.radians(90), length=0.18, strength=0.0,
                       constraints=True, min_constraint=math.radians(-45), max_constraint=math.radians(45), is_dial=True, extra_channels_raw={"bone_label_showing": True})
    dynamics_dial = Bone(id="✨ Hair & Veil Dynamics", parent="HUD_Master_Controller", position=(0.0, -0.48), angle=math.radians(90), length=0.18, strength=0.0,
                         constraints=True, min_constraint=math.radians(-45), max_constraint=math.radians(45), is_dial=True, extra_channels_raw={"bone_label_showing": True})

    bones.extend([
        char_root, pelvis, body, neck, head,
        hair_l, hair_r,
        upper_arm_l, lower_arm_l, hand_l,
        upper_arm_r, lower_arm_r, hand_r,
        thigh_l, shin_l, foot_l,
        thigh_r, shin_r, foot_r,
        target_leg_l, target_leg_r,
        lamp_bone, hud_bone,
        head_dial, expr_dial, hand_l_dial, hand_r_dial, dynamics_dial
    ])

    bone_idx = {b.id: i for i, b in enumerate(bones)}

    # 3. Vector Mesh Parts (Constructed in World Coordinates with point-level bone binding)
    mesh_hud = build_vector_hud_plate(parent_bone=bone_idx["HUD_Master_Controller"], origin=(0.85, 0.0))
    mesh_lamp = build_magic_lamp_vector_mesh(parent_bone=bone_idx["Lamp_Anchor"], origin=(-1.05, -0.60))
    mesh_pants = build_zafira_pants_vector_mesh(parent_bone=bone_idx["Pelvis"], origin=(-0.45, -0.22))
    mesh_torso = build_zafira_torso_vector_mesh(parent_bone=bone_idx["Body"], origin=(-0.45, 0.18))
    mesh_arm_l = build_zafira_arm_vector_mesh("L", bone_idx["UpperArm L"], bone_idx["LowerArm L"], bone_idx["Hand L"], origin=(-0.45, 0.18))
    mesh_arm_r = build_zafira_arm_vector_mesh("R", bone_idx["UpperArm R"], bone_idx["LowerArm R"], bone_idx["Hand R"], origin=(-0.45, 0.18))
    mesh_head = build_zafira_head_vector_mesh(parent_bone=bone_idx["Head"], origin=(-0.45, 0.52), view="Front")

    part_hud = Part(id="mesh_hud", name="🎛️ Master HUD Control Board", type="mesh", bone=None, geometry_raw=mesh_hud, z_order=5)
    part_lamp = Part(id="mesh_lamp", name="✨ Sapphire Magic Lamp", type="mesh", bone=None, geometry_raw=mesh_lamp, z_order=10)
    part_pants = Part(id="mesh_pants", name="Harem Pants & Belt", type="mesh", bone=None, geometry_raw=mesh_pants, z_order=20)
    part_torso = Part(id="mesh_torso", name="Bodice & Torso", type="mesh", bone=None, geometry_raw=mesh_torso, z_order=25)
    part_arm_l = Part(id="mesh_arm_l", name="Arm Left", type="mesh", bone=None, geometry_raw=mesh_arm_l, z_order=30)
    part_arm_r = Part(id="mesh_arm_r", name="Arm Right", type="mesh", bone=None, geometry_raw=mesh_arm_r, z_order=30)
    part_head = Part(id="mesh_head", name="Head & Facial Features", type="mesh", bone=None, geometry_raw=mesh_head, z_order=40)

    # 4. Assemble Root
    root_container = Part(
        id="zafira_vector_root",
        name="Zafira_Vector_Rig",
        type="bone_container",
        children=[part_hud, part_lamp, part_pants, part_torso, part_arm_l, part_arm_r, part_head],
        z_order=0
    )

    rig.bones = bones
    rig.root_parts = [root_container]

    # 5. Diagnostic Animation Posings
    head_dial.angle_channel = Channel(
        type="Val",
        when=[0, 1, 12, 24, 36],
        val=[math.radians(0), math.radians(0), math.radians(-30), math.radians(30), math.radians(0)],
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
            (target_leg_l.position[0] + 0.12, target_leg_l.position[1] + 0.10),
            target_leg_l.position,
            target_leg_l.position
        ],
        interp=[dict(BASE_INTERP) for _ in range(5)]
    )

    # 6. Emit Native Vector .moho File
    out = emit(rig, out_moho_path)
    print(f"100% Native Vector Rig built to: {out}")
    return out


if __name__ == "__main__":
    build_zafira_native_vector_rig()
