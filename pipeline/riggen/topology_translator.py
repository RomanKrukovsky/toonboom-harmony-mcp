"""LLM-friendly translator: text description -> TopologySpec.

This module gives a language model a single, forgiving entry point for
building a non-biped rig. The model writes a description; the translator
parses it, fills in coordinates, and produces a TopologySpec that the
existing emit() pipeline can compile into a real .moho.

Grammar (case-insensitive, whitespace-insensitive):

  biped tall stocky
  with tail 6 bones
  with wings left right 4 bones each
  with cape
  with six fingers left right

Colors are pulled from the palette, with sensible fallbacks. Joint
coordinates are derived from a base biped skeleton and then translated
outward for the additional chains. The translator is intentionally
forgiving: it ignores unknown keywords, lowercases, and does not require
every body part to be specified.
"""
from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from typing import Optional

from .topology_spec import (
    BoneSpec,
    DialActionSpec,
    DialSpec,
    JointSpec,
    MeshLayerSpec,
    SecondaryMotionSpec,
    SwitchSpec,
    TopologySpec,
)


_BIPED_JOINTS: dict[str, tuple[float, float, str]] = {
    "hip": (200, 320, "C"),
    "crotch": (200, 380, "C"),
    "chest": (200, 240, "C"),
    "neck_base": (200, 200, "C"),
    "head_base": (200, 180, "C"),
    "head_top": (200, 80, "C"),
    "shoulder_L": (148, 215, "L"),
    "elbow_L": (140, 285, "L"),
    "hand_L": (135, 340, "L"),
    "shoulder_R": (252, 215, "R"),
    "elbow_R": (260, 285, "R"),
    "hand_R": (265, 340, "R"),
    "hip_L": (180, 340, "L"),
    "knee_L": (178, 450, "L"),
    "ankle_L": (176, 545, "L"),
    "toe_L": (150, 558, "L"),
    "hip_R": (220, 340, "R"),
    "knee_R": (222, 450, "R"),
    "ankle_R": (224, 545, "R"),
    "toe_R": (250, 558, "R"),
}

_BIPED_BONES = [
    ("Main", None, "hip", "crotch"),
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


_BODY_PROPORTIONS: dict[str, dict[str, float]] = {
    "slim": {"torso_width": 0.85, "limb_scale": 1.05, "head_scale": 1.0},
    "stocky": {"torso_width": 1.20, "limb_scale": 0.92, "head_scale": 0.95},
    "tall": {"torso_width": 1.0, "limb_scale": 1.10, "head_scale": 1.05},
    "short": {"torso_width": 1.0, "limb_scale": 0.88, "head_scale": 0.92},
    "child": {"torso_width": 0.95, "limb_scale": 0.85, "head_scale": 1.10},
    "muscular": {"torso_width": 1.15, "limb_scale": 1.0, "head_scale": 1.0},
    "default": {"torso_width": 1.0, "limb_scale": 1.0, "head_scale": 1.0},
}


@dataclass
class ParsedDescription:
    name: str = "Custom Character"
    body_type: str = "biped"  # biped | quadruped | etc
    proportion: str = "default"
    has_tail: int = 0
    has_wings: int = 0
    has_cape: bool = False
    has_horns: bool = False
    has_ears: int = 0
    extra_fingers_per_hand: int = 0
    palette_overrides: dict[str, tuple[float, float, float]] = field(default_factory=dict)
    notes: list[str] = field(default_factory=list)


_KEYWORD_PATTERN = re.compile(r"\b(biped|quadruped|serpent)\b", re.IGNORECASE)
_WITH_PATTERN = re.compile(
    r"\bwith\s+(?P<thing>tail(?:\s+(\d+))?|wings(?:\s+(\d+))?(?:\s+each)?|"
    r"cape|horns|ears(?:\s+(\d+))?|six\s+fingers|"
    r"four\s+fingers|three\s+fingers|claws|spikes|extra\s+arm)\b",
    re.IGNORECASE,
)
_PROPORTION_PATTERN = re.compile(
    r"\b(slim|stocky|tall|short|child|muscular|chubby|skinny)\b",
    re.IGNORECASE,
)
_NAME_PATTERN = re.compile(
    r"\b(?:name\s*[:=]?\s+|called\s+|named\s+)"
    r"([A-Za-z][A-Za-z0-9 _-]{0,40}?)(?=\s+(?:slim|stocky|tall|short|child|"
    r"muscular|chubby|skinny|with|biped|quadruped|serpent|skin|hair|"
    r"shirt|pants|shoes|color|colour|#[0-9a-fA-F]|$))",
    re.IGNORECASE,
)
_NAME_SPLIT_KEYWORDS = (
    "slim", "stocky", "tall", "short", "child", "muscular", "chubby",
    "skinny", "with", "biped", "quadruped", "serpent", "skin", "hair",
    "shirt", "pants", "shoes", "color", "colour",
)
_COLOR_PATTERN = re.compile(
    r"\b(?P<key>skin|hair|shirt|pants|shoes|cape|horns|tail)\s*"
    r"(?:color|colour)?\s*[:=]?\s*"
    r"(?P<hex>#[0-9a-fA-F]{6}|\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3})",
    re.IGNORECASE,
)


def parse_description(text: str) -> ParsedDescription:
    """Parse a free-form LLM-style rig description."""
    result = ParsedDescription()
    text = text.strip()

    name_match = _NAME_PATTERN.search(text)
    if name_match:
        result.name = name_match.group(1).strip().rstrip(".,;")
        for prefix in ("called ", "named ", "name "):
            if result.name.lower().startswith(prefix):
                result.name = result.name[len(prefix):].strip()
    # Handle "character <Name> ..." form by scanning after "character "
    char_idx = text.lower().find("character ")
    if char_idx != -1:
        after = text[char_idx + len("character "):]
        # Drop "named " / "called " prefix
        after = re.sub(r"^(?:named|called)\s+", "", after, flags=re.IGNORECASE)
        for kw in _NAME_SPLIT_KEYWORDS:
            kw_idx = after.lower().find(f" {kw} ")
            if kw_idx != -1:
                candidate = after[:kw_idx].strip()
                if candidate and len(candidate) <= 40:
                    result.name = candidate.rstrip(".,;")
                break
        else:
            # No keyword after - take first word as name
            first_word = after.split()[0] if after.split() else ""
            if first_word and not any(
                kw in first_word.lower() for kw in _NAME_SPLIT_KEYWORDS
            ):
                result.name = first_word

    if _KEYWORD_PATTERN.search(text):
        keyword = _KEYWORD_PATTERN.search(text)
        if keyword:
            result.body_type = keyword.group(0).lower()

    prop_match = _PROPORTION_PATTERN.search(text)
    if prop_match:
        result.proportion = prop_match.group(1).lower()

    for match in _WITH_PATTERN.finditer(text):
        thing = match.group("thing").lower()
        if thing.startswith("tail"):
            result.has_tail = max(2, min(12, int(match.group(2) or 6)))
        elif thing.startswith("wing"):
            result.has_wings = max(1, min(6, int(match.group(3) or 4)))
        elif thing == "cape":
            result.has_cape = True
        elif thing == "horns":
            result.has_horns = True
        elif thing.startswith("ear"):
            result.has_ears = max(1, min(4, int(match.group(4) or 2)))
        elif "six fingers" in thing:
            result.extra_fingers_per_hand = 1
        elif "four fingers" in thing:
            result.extra_fingers_per_hand = -1

    for color_match in _COLOR_PATTERN.finditer(text):
        key = color_match.group("key").lower()
        raw = color_match.group("hex")
        if raw.startswith("#"):
            r = int(raw[1:3], 16) / 255.0
            g = int(raw[3:5], 16) / 255.0
            b = int(raw[5:7], 16) / 255.0
        else:
            parts = [int(p.strip()) for p in raw.split(",")]
            r, g, b = (parts[0] / 255.0, parts[1] / 255.0, parts[2] / 255.0)
        # 5/255 = 0.0196...; tests expect ~3-decimal precision
        r, g, b = round(r, 3), round(g, 3), round(b, 3)
        result.palette_overrides[key] = (r, g, b)

    result.notes = [n.strip() for n in re.split(r"[.,;]", text) if n.strip()]
    return result


def _resolve_palette(parsed: ParsedDescription) -> dict[str, tuple[float, float, float]]:
    palette = {
        "skin": (0.95, 0.78, 0.67),
        "hair": (0.30, 0.18, 0.10),
        "shirt": (0.84, 0.31, 0.51),
        "pants": (0.20, 0.22, 0.27),
        "shoes": (0.12, 0.12, 0.12),
    }
    palette.update(parsed.palette_overrides)
    return palette


def _apply_proportions(
    joints: dict[str, JointSpec],
    proportion: str,
) -> dict[str, JointSpec]:
    p = _BODY_PROPORTIONS.get(proportion, _BODY_PROPORTIONS["default"])
    sx = p["torso_width"]
    sy_limbs = p["limb_scale"]
    sy_head = p["head_scale"]
    if sx == 1.0 and sy_limbs == 1.0 and sy_head == 1.0:
        return joints
    cx = 200
    out: dict[str, JointSpec] = {}
    for j_id, j in joints.items():
        px = cx + (j.px - cx) * sx
        py = j.py
        if any(s in j_id for s in ("hip", "knee", "ankle", "toe",
                                    "elbow", "hand", "shoulder")):
            if j_id.startswith("head_") or j_id == "head_top":
                py = 600 - (600 - j.py) * sy_head
            else:
                py = 600 - (600 - j.py) * sy_limbs
        elif j_id.startswith("head_") or j_id == "head_top":
            py = 600 - (600 - j.py) * sy_head
        out[j_id] = JointSpec(
            id=j.id, px=round(px, 2), py=round(py, 2), side=j.side, metadata=j.metadata,
        )
    return out


def _tail_spec(parsed: ParsedDescription) -> tuple[list[BoneSpec], list[JointSpec], list[SecondaryMotionSpec]]:
    if parsed.has_tail <= 0:
        return [], [], []
    n = parsed.has_tail
    bone_count = max(2, min(12, n))
    bones: list[BoneSpec] = []
    joints: list[JointSpec] = []
    base_x, base_y = 200, 558
    chain: list[str] = []
    for i in range(bone_count):
        jx = base_x + 6 * i
        jy = base_y + 24 * (i + 1)
        jid = f"tail_joint_{i}"
        bid = f"Tail {i}"
        joints.append(JointSpec(id=jid, px=jx, py=jy, side="C"))
        chain.append(bid)
        if i == 0:
            bones.append(BoneSpec(
                id=bid, parent_id="Pelvis",
                root_joint="crotch", tip_joint=jid,
                length=0.2, angle=math.pi / 2,
            ))
        else:
            bones.append(BoneSpec(
                id=bid, parent_id=chain[i - 1],
                root_joint=joints[i - 1].id, tip_joint=jid,
                length=0.2, angle=math.pi / 2,
            ))
    motion = SecondaryMotionSpec(
        name="Tail",
        root_bone=chain[0],
        chain_bones=chain,
        keyframe_count=8,
        lag=0.7,
        cycle_frames=24,
        amplitude=0.4,
    )
    return bones, joints, [motion]


def _wings_spec(parsed: ParsedDescription) -> tuple[list[BoneSpec], list[JointSpec], list[SecondaryMotionSpec]]:
    if parsed.has_wings <= 0:
        return [], [], []
    per_side = max(1, min(6, parsed.has_wings))
    bones: list[BoneSpec] = []
    joints: list[JointSpec] = []
    motions: list[SecondaryMotionSpec] = []
    for side, sign in (("L", -1), ("R", 1)):
        side_x = 148 if side == "L" else 252
        side_y = 200
        chain: list[str] = []
        for i in range(per_side):
            jx = side_x + sign * (40 + i * 35)
            jy = side_y - (i * 10)
            jid = f"wing_{side}_joint_{i}"
            bid = f"Wing {side} {i}"
            joints.append(JointSpec(id=jid, px=jx, py=jy, side=side))
            chain.append(bid)
            if i == 0:
                bones.append(BoneSpec(
                    id=bid, parent_id="Body",
                    root_joint="neck_base", tip_joint=jid,
                    length=0.2, angle=0.0,
                ))
            else:
                bones.append(BoneSpec(
                    id=bid, parent_id=chain[i - 1],
                    root_joint=joints[i - 1].id, tip_joint=jid,
                    length=0.2, angle=0.0,
                ))
        motions.append(SecondaryMotionSpec(
            name=f"Wing {side}",
            root_bone=chain[0],
            chain_bones=chain,
            keyframe_count=8,
            lag=0.5,
            cycle_frames=20,
            amplitude=0.3,
        ))
    return bones, joints, motions


def _ears_spec(parsed: ParsedDescription) -> tuple[list[BoneSpec], list[JointSpec]]:
    if parsed.has_ears <= 0:
        return [], []
    bones: list[BoneSpec] = []
    joints: list[JointSpec] = []
    n = parsed.has_ears
    chain_per_side = max(1, min(4, n))
    for side, sign, base_x in (("L", -1, 185), ("R", 1, 215)):
        chain: list[str] = []
        for i in range(chain_per_side):
            jx = base_x + sign * (8 + i * 6)
            jy = 90 - (i * 22)
            jid = f"ear_{side}_joint_{i}"
            bid = f"Ear {side} {i}"
            joints.append(JointSpec(id=jid, px=jx, py=jy, side=side))
            chain.append(bid)
            if i == 0:
                bones.append(BoneSpec(
                    id=bid, parent_id="Head",
                    root_joint="head_top", tip_joint=jid,
                    length=0.1, angle=-math.pi / 2,
                ))
            else:
                bones.append(BoneSpec(
                    id=bid, parent_id=chain[i - 1],
                    root_joint=joints[i - 1].id, tip_joint=jid,
                    length=0.1, angle=-math.pi / 2,
                ))
    return bones, joints


def _cape_spec(parsed: ParsedDescription) -> tuple[list[BoneSpec], list[JointSpec], list[SecondaryMotionSpec]]:
    if not parsed.has_cape:
        return [], [], []
    bones: list[BoneSpec] = []
    joints: list[JointSpec] = []
    chain: list[str] = []
    for i in range(4):
        jx = 200
        jy = 240 + (i + 1) * 30
        jid = f"cape_joint_{i}"
        bid = f"Cape {i}"
        joints.append(JointSpec(id=jid, px=jx, py=jy, side="C"))
        chain.append(bid)
        if i == 0:
            bones.append(BoneSpec(
                id=bid, parent_id="Body",
                root_joint="chest", tip_joint=jid,
                length=0.3, angle=math.pi / 2,
            ))
        else:
            bones.append(BoneSpec(
                id=bid, parent_id=chain[i - 1],
                root_joint=joints[i - 1].id, tip_joint=jid,
                length=0.3, angle=math.pi / 2,
            ))
    return bones, joints, [SecondaryMotionSpec(
        name="Cape",
        root_bone=chain[0],
        chain_bones=chain,
        keyframe_count=8,
        lag=0.65,
        cycle_frames=24,
        amplitude=0.5,
    )]


def _horns_spec(parsed: ParsedDescription) -> tuple[list[BoneSpec], list[JointSpec]]:
    if not parsed.has_horns:
        return [], []
    bones: list[BoneSpec] = []
    joints: list[JointSpec] = []
    for side, sign, base_x in (("L", -1, 188), ("R", 1, 212)):
        chain: list[str] = []
        for i in range(2):
            jx = base_x + sign * (4 + i * 6)
            jy = 80 - (i * 18)
            jid = f"horn_{side}_joint_{i}"
            bid = f"Horn {side} {i}"
            joints.append(JointSpec(id=jid, px=jx, py=jy, side=side))
            chain.append(bid)
            if i == 0:
                bones.append(BoneSpec(
                    id=bid, parent_id="Head",
                    root_joint="head_top", tip_joint=jid,
                    length=0.1, angle=-math.pi / 2,
                ))
            else:
                bones.append(BoneSpec(
                    id=bid, parent_id=chain[i - 1],
                    root_joint=joints[i - 1].id, tip_joint=jid,
                    length=0.1, angle=-math.pi / 2,
                ))
    return bones, joints


def _extra_finger_spec(parsed: ParsedDescription) -> list[BoneSpec]:
    if parsed.extra_fingers_per_hand == 0:
        return []
    extra: list[BoneSpec] = []
    for side, sign, base_x in (("L", -1, 128), ("R", 1, 272)):
        for f in range(abs(parsed.extra_fingers_per_hand)):
            jx = base_x + sign * (8 + f * 8)
            jy = 348
            jid = f"extra_{side}_finger_{f}_joint"
            bid = f"Extra {side} Finger {f}"
            parent_bone = "LowerArm L" if side == "L" else "LowerArm R"
            extra.append(BoneSpec(
                id=bid, parent_id=parent_bone,
                px=jx, py=jy, length=0.08, angle=math.pi / 2,
            ))
    return extra


def description_to_topology(
    text: str,
    name: Optional[str] = None,
    canvas: Optional[dict] = None,
) -> TopologySpec:
    """Parse a free-form rig description and return a TopologySpec.

    This is the single entry point an LLM uses: it sends a description,
    gets back a TopologySpec, and the existing pipeline does the rest.
    """
    parsed = parse_description(text)
    if name:
        parsed.name = name
    spec = TopologySpec(
        name=parsed.name,
        canvas=canvas or {"width": 400, "height": 600},
    )
    spec.palette = _resolve_palette(parsed)
    spec.metadata["raw_description"] = text
    spec.metadata["proportion"] = parsed.proportion
    spec.metadata["body_type"] = parsed.body_type

    for j_id, (px, py, side) in _BIPED_JOINTS.items():
        spec.joints.append(JointSpec(id=j_id, px=px, py=py, side=side))
    spec.joints = list(_apply_proportions(
        {j.id: j for j in spec.joints}, parsed.proportion
    ).values())

    for bone_name, parent, root_j, tip_j in _BIPED_BONES:
        spec.bones.append(BoneSpec(
            id=bone_name,
            parent_id=parent,
            root_joint=root_j,
            tip_joint=tip_j,
            length=0.4,
            angle=0.0,
        ))

    tail_b, tail_j, tail_m = _tail_spec(parsed)
    spec.bones.extend(tail_b)
    spec.joints.extend(tail_j)
    spec.secondary_motion.extend(tail_m)

    wing_b, wing_j, wing_m = _wings_spec(parsed)
    spec.bones.extend(wing_b)
    spec.joints.extend(wing_j)
    spec.secondary_motion.extend(wing_m)

    cape_b, cape_j, cape_m = _cape_spec(parsed)
    spec.bones.extend(cape_b)
    spec.joints.extend(cape_j)
    spec.secondary_motion.extend(cape_m)

    ear_b, ear_j = _ears_spec(parsed)
    spec.bones.extend(ear_b)
    spec.joints.extend(ear_j)

    horn_b, horn_j = _horns_spec(parsed)
    spec.bones.extend(horn_b)
    spec.joints.extend(horn_j)

    spec.bones.extend(_extra_finger_spec(parsed))

    if parsed.notes:
        spec.metadata["notes"] = parsed.notes[:5]
    return spec
