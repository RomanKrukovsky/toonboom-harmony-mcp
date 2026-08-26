"""Автосборка полного рига из нарезанного PSD по стандарту датасета.

Опора на датасет fixtures/rig_library: иерархия и имена костей как у живых
ригеров (Main -> Pelvis -> Body -> Neck -> Head, Thigh/Shin/Foot, UpperArm/
LowerArm), пивоты вычисляются из геометрии слоёв персонажа, z-order по
эталонной схеме. Запускать питоном с psd-tools:
  <venv>/bin/python pipeline/examples/auto_rig.py
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

from psd_tools import PSDImage

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO))

from pipeline.moho.emit import _load_tpl, emit  # noqa: E402
from pipeline.pir.schema import Bone, Part, Rig  # noqa: E402

PSD = REPO / "fixtures/moho_reference/gramps.psd"
OUT_DIR = REPO / "output/autorig"
DPI = 72.0

# Иерархия и имена — стандарт, выведенный из датасета
# (Girl, Mr.Stu, Normann, mannequin): Main -> Pelvis -> Body -> Neck -> Head,
# Body -> руки, Pelvis -> ноги. tip = суставная точка конца кости в px PSD.
BONE_TREE = [
    # (имя, родитель, root_px, tip_px)
    ("Main", None, "hip", "chest"),
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

# Привязка частей PSD к костям и z-order (дальние -> ближние, как в эталонах)
PART_BONE = {"Head": "Head", "Torso": "Body", "LArm": "UpperArm L",
             "RArm": "UpperArm R", "LLeg": "Thigh L", "RLeg": "Thigh R"}
Z_ORDER = ["LArm", "LLeg", "RLeg", "Torso", "Head", "RArm"]


def export_pngs(psd: PSDImage, out_dir: Path) -> dict[str, dict]:
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


def compute_joints(parts: dict[str, dict], W: int, H: int) -> dict[str, tuple]:
    def bbox(n):
        return parts[n]["bbox"] if n in parts else None

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
        "crotch": (hip_x, hip_y + 0.10 * H),
        "chest": (hip_x, torso[1] + 0.30 * (torso[3] - torso[1])),
        "neck_base": (head and (head[0] + head[2]) / 2, head[3] - 8),
        "head_base": ((head[0] + head[2]) / 2, head[3] - 0.28 * (head[3] - head[1])),
        "head_top": ((head[0] + head[2]) / 2, head[1] + 0.06 * (head[3] - head[1])),
        "shoulder_L": (cx("LArm"), torso[1] + 12),
        "shoulder_R": (cx("RArm"), torso[1] + 12),
    }
    for side, arm in (("L", arm_l), ("R", arm_r)):
        joints[f"elbow_{side}"] = ((arm[0] + arm[2]) / 2, arm[1] + 0.45 * (arm[3] - arm[1]))
        joints[f"hand_{side}"] = ((arm[0] + arm[2]) / 2, arm[3] - 0.06 * (arm[3] - arm[1]))
    for side, leg in (("L", leg_l), ("R", leg_r)):
        lx = (leg[0] + leg[2]) / 2
        h = leg[3] - leg[1]
        joints[f"hip_{side}"] = (lx, leg[1] + 12)
        joints[f"knee_{side}"] = (lx, leg[1] + 0.46 * h)
        joints[f"ankle_{side}"] = (lx, leg[1] + 0.86 * h)
        joints[f"toe_{side}"] = (lx - 0.16 * h, leg[1] + 0.94 * h)
    return joints


def build_rig(parts: dict[str, dict]) -> Rig:
    W, H = psd_size
    doc = _load_tpl("_doc_skeleton.json")
    doc["project_data"]["width"] = W
    doc["project_data"]["height"] = H

    def to_moho(px: float, py: float) -> tuple:
        return (px / DPI - W / (2 * DPI), H / (2 * DPI) - py / DPI)

    joints = compute_joints(parts, W, H)
    jw = {k: to_moho(*v) for k, v in joints.items()}

    bones: list[Bone] = []
    abs_angle: dict[str, float] = {}
    root_world: dict[str, tuple] = {}
    for name, parent, root_j, tip_j in BONE_TREE:
        rw = jw[root_j]
        tw = jw[tip_j]
        abs_ang = math.atan2(tw[1] - rw[1], tw[0] - rw[0])
        length = math.hypot(tw[0] - rw[0], tw[1] - rw[1])
        if parent is None:
            pos_local = rw
            rel_ang = abs_ang
        else:
            pw = root_world[parent]
            pa = abs_angle[parent]
            dx, dy = rw[0] - pw[0], rw[1] - pw[1]
            cos_a, sin_a = math.cos(-pa), math.sin(-pa)
            pos_local = (dx * cos_a - dy * sin_a, dx * sin_a + dy * cos_a)
            rel_ang = abs_ang - pa
            while rel_ang > math.pi:
                rel_ang -= 2 * math.pi
            while rel_ang < -math.pi:
                rel_ang += 2 * math.pi
        abs_angle[name] = abs_ang
        root_world[name] = rw
        bones.append(Bone(id=name, parent=parent,
                          position=(round(pos_local[0], 6), round(pos_local[1], 6)),
                          angle=round(rel_ang, 6), length=round(length, 6),
                          strength=1.0))

    rig = Rig(name="gramps_autorig", source_program="moho", source_version="1041",
              canvas={"mime_type": "application/x-vnd.lm_mohodoc",
                      "version": 1041, "major_version": 1, "rev_version": 0,
                      "doc_uuid": "", "comment": ""})
    rig.bones = bones
    rig.extras = {"styles": doc["styles"], "project_data": doc["project_data"],
                  "metadata": doc.get("metadata"),
                  "layercomps": doc.get("layercomps"),
                  "documentviewstate": doc.get("documentviewstate")}

    bones = rig.bones
    bone_by_id = {b.id: b for b in bones}
    name_to_idx = {b.id: i for i, b in enumerate(bones)}
    zparts = []
    for z, psd_name in enumerate(Z_ORDER):
        if psd_name not in parts:
            continue
        bbox = parts[psd_name]["bbox"]
        cxp, cyp = (bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2
        bone_id = PART_BONE[psd_name]
        part = Part(id=f"img_{psd_name}", name=psd_name, type="image",
                    z_order=z, image_ref=parts[psd_name]["png"],
                    bone=bone_id)
        # origin слоя = корень кости (слой вращается вокруг сустава),
        # картинка удерживается транслейтом в локальных координатах кости
        root_j = next(t[2] for t in BONE_TREE if t[0] == bone_id)
        part.origin = jw[root_j]
        center = to_moho(cxp, cyp)
        pa = abs_angle[bone_id]
        dx, dy = center[0] - part.origin[0], center[1] - part.origin[1]
        cos_a, sin_a = math.cos(-pa), math.sin(-pa)
        loc = (dx * cos_a - dy * sin_a, dx * sin_a + dy * cos_a)
        part.transforms["translation"] = Channel(
            type="Vec3", when=[0],
            val=[{"x": round(loc[0], 6), "y": round(loc[1], 6), "z": 0.0}],
            interp=[{"im": 1, "v1": -1.0, "v2": -1.0, "in": 1, "h": 0,
                     "s": False, "t": 0}])
        zparts.append(part)

    root = Part(id="root_group", name="Gramps", type="bone_container")
    root.children = zparts
    for c in root.children:
        c.parent = root.id
    rig.root_parts = [root]
    return rig


psd_size = (0, 0)


def main() -> int:
    global psd_size
    psd = PSDImage.open(PSD)
    psd_size = (psd.width, psd.height)
    print(f"1) PSD {psd_size}: экспорт слоёв -> PNG")
    parts = export_pngs(psd, OUT_DIR)
    for n, info in parts.items():
        print(f"   {n}: {Path(info['png']).name}")

    print("2) Суставы из геометрии персонажа")
    rig = build_rig(parts)
    for b in rig.bones:
        print(f"   {b.id:12} parent={str(b.parent):12} len={b.length:.3f} "
              f"ang={b.angle:+.3f}")

    pir_path = OUT_DIR / "gramps_autorig.pir.json"
    pir_path.write_text(json.dumps(rig.to_dict(), ensure_ascii=False, indent=1))
    print(f"3) PIR: {pir_path}")

    out = OUT_DIR / "gramps_autorig.moho"
    emit(rig, str(out))
    print(f"4) .moho: {out} ({out.stat().st_size} байт)")

    # копия рядом с PNG не нужна: fileref абсолютные
    return 0


if __name__ == "__main__":
    sys.exit(main())
