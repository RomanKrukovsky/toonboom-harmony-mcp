"""PSD → спецификация для riggen: экспорт слоёв PNG + суставы из геометрии."""
from __future__ import annotations

from pathlib import Path

from ..riggen.skeleton import BONE_TREE


def export_pngs(psd, out_dir: Path) -> dict[str, dict]:
    out_dir.mkdir(parents=True, exist_ok=True)
    parts = {}
    for layer in psd:
        if layer.kind != "pixel":
            continue
        png = layer.composite()
        path = out_dir / f"{layer.name}.png"
        png.save(path)
        parts[layer.name] = {"png": str(path), "bbox": layer.bbox}
    return parts


def compute_joints(parts: dict[str, dict], width: int, height: int) -> dict:
    def bbox(n):
        return parts[n]["bbox"]

    def cx(n):
        b = bbox(n)
        return (b[0] + b[2]) / 2

    leg_l, leg_r = bbox("LLeg"), bbox("RLeg")
    torso, head = bbox("Torso"), bbox("Head")
    arm_l, arm_r = bbox("LArm"), bbox("RArm")

    hip_x = (cx("LLeg") + cx("RLeg")) / 2
    hip_y = min(leg_l[1], leg_r[1]) + 8
    joints = {
        "hip": (hip_x, hip_y),
        "crotch": (hip_x, hip_y + 0.10 * height),
        "chest": (hip_x, torso[1] + 0.30 * (torso[3] - torso[1])),
        "neck_base": ((head[0] + head[2]) / 2, head[3] - 8),
        "head_base": ((head[0] + head[2]) / 2,
                      head[3] - 0.28 * (head[3] - head[1])),
        "head_top": ((head[0] + head[2]) / 2,
                     head[1] + 0.06 * (head[3] - head[1])),
        "shoulder_L": (cx("LArm"), torso[1] + 12),
        "shoulder_R": (cx("RArm"), torso[1] + 12),
    }
    for side, arm in (("L", arm_l), ("R", arm_r)):
        joints[f"elbow_{side}"] = (
            (arm[0] + arm[2]) / 2,
            arm[1] + 0.45 * (arm[3] - arm[1]))
        joints[f"hand_{side}"] = (
            (arm[0] + arm[2]) / 2,
            arm[3] - 0.06 * (arm[3] - arm[1]))
    for side, leg in (("L", leg_l), ("R", leg_r)):
        lx = (leg[0] + leg[2]) / 2
        h = leg[3] - leg[1]
        joints[f"hip_{side}"] = (lx, leg[1] + 12)
        joints[f"knee_{side}"] = (lx, leg[1] + 0.46 * h)
        joints[f"ankle_{side}"] = (lx, leg[1] + 0.86 * h)
        joints[f"toe_{side}"] = (lx - 0.16 * h, leg[1] + 0.94 * h)
    return joints


PART_BONE = {"Head": "Head", "Torso": "Body", "LArm": "UpperArm L",
             "RArm": "UpperArm R", "LLeg": "Thigh L", "RLeg": "Thigh R"}
Z_ORDER = ["LArm", "LLeg", "RLeg", "Torso", "Head", "RArm"]


def psd_to_spec(psd, name: str, assets_dir: Path) -> tuple[dict, dict[str, dict]]:
    parts = export_pngs(psd, assets_dir)
    joints = compute_joints(parts, psd.width, psd.height)
    spec_parts = []
    center_of = {}
    for z, psd_name in enumerate(Z_ORDER):
        if psd_name not in parts:
            continue
        bb = parts[psd_name]["bbox"]
        c = ((bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2)
        center_of[psd_name] = c
        spec_parts.append({
            "id": psd_name, "name": psd_name,
            "image": parts[psd_name]["png"],
            "bone": PART_BONE[psd_name],
            "center": [c[0], c[1]],
        })
    spec = {"name": name,
            "canvas": {"width": psd.width, "height": psd.height},
            "joints": {k: list(v) for k, v in joints.items()},
            "parts": spec_parts,
            "head_turn": None}
    return spec, parts
