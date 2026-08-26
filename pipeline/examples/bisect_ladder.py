"""Бисект-лестница: 8 мини-файлов для поиска конструкции, ломающей Moho.

  <venv>/bin/python pipeline/examples/bisect_ladder.py
Затем открыть по очереди в Moho: t0..t7. Первый НЕ открывшийся файл
указывает на виновника.
"""
from __future__ import annotations

import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO))

from PIL import Image  # noqa: E402

from pipeline.moho.emit import emit  # noqa: E402
from pipeline.moho.extract import extract_from_file  # noqa: E402
from pipeline.pir.schema import Bone, Channel, Part, Rig  # noqa: E402
from pipeline.riggen.modules import (make_image_part, make_switch,  # noqa: E402
                                     wire_dial, HEAD_TURN_ANGLES)

OUT = REPO / "output/bisect"
JOINTS = {"hip": (200, 400), "chest": (200, 300)}


def base_rig(name: str) -> Rig:
    rig = Rig(name=name, source_program="moho", source_version="1041",
              canvas={"mime_type": "application/x-vnd.lm_mohodoc",
                      "version": 1041, "major_version": 1, "rev_version": 0,
                      "doc_uuid": "", "comment": ""})
    rig.extras = {"binding_mode": 1, "project_data": {"width": 400,
                                                      "height": 600}}
    return rig


def root(rig: Rig, parts: list[Part], name: str) -> None:
    r = Part(id="root", name=name, type="bone_container")
    r.children = parts
    for c in parts:
        c.parent = r.id
    rig.root_parts = [r]


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    assets = OUT / "assets"
    assets.mkdir(exist_ok=True)
    red, blue = assets / "red.png", assets / "blue.png"
    Image.new("RGB", (120, 120), (210, 60, 60)).save(red)
    Image.new("RGB", (120, 120), (60, 90, 210)).save(blue)

    def img_part(pid, path, bone=None):
        p = make_image_part(pid, pid, str(path), bone or "Main",
                            (0.0, 0.0), (0.0, 0.0), 0.0)
        return p

    # t0: контроль — регенерат известного открывавшегося файла
    g = extract_from_file(str(REPO / "fixtures/moho_reference/gramps_rig.moho"))
    emit(g, str(OUT / "t0_control_gramps.moho"))

    # t1: скелет mode=1, без арта
    rig = base_rig("t1")
    rig.bones = [Bone(id="Main", parent=None, position=(0.0, 0.0), angle=0.0,
                      length=0.5)]
    root(rig, [], "t1")
    emit(rig, str(OUT / "t1_skeleton.moho"))

    # t2: + image слой
    rig = base_rig("t2")
    rig.bones = [Bone(id="Main", parent=None, position=(0.0, 0.0), angle=0.0,
                      length=0.5)]
    root(rig, [img_part("img_red", red)], "t2")
    emit(rig, str(OUT / "t2_image.moho"))

    # t3: + свитч на 2 состояния (без экшенов)
    rig = base_rig("t3")
    rig.bones = [Bone(id="Main", parent=None, position=(0.0, 0.0), angle=0.0,
                      length=0.5)]
    sw = make_switch("sw", "Head", {"Front": str(red), "Back": str(blue)},
                     "Main", lambda b: (0.0, 0.0), lambda s: (0.0, 0.0),
                     {"Main": 0.0}, 0)
    root(rig, [sw], "t3")
    emit(rig, str(OUT / "t3_switch.moho"))

    # t4: + диал с экшенами (формула Girl)
    rig = base_rig("t4")
    dial = Bone(id="Head Switch Dial", parent="Main",
                position=(0.5, 0.0), angle=1.570796, length=0.3,
                constraints=True, min_constraint=-2.356194,
                max_constraint=3.141593)
    rig.bones = [Bone(id="Main", parent=None, position=(0.0, 0.0), angle=0.0,
                      length=0.5), dial]
    sw = make_switch("sw", "Head", {"Front": str(red), "Back": str(blue)},
                     "Main", lambda b: (0.0, 0.0), lambda s: (0.0, 0.0),
                     {"Main": 0.0}, 0)
    wire_dial(dial, "Head Switch", HEAD_TURN_ANGLES, sw,
              ["Front", "Back", "Front", "Front", "Front", "Front",
               "Front", "Front", "Front"])
    root(rig, [sw], "t4")
    emit(rig, str(OUT / "t4_dial.moho"))

    # t5: + flexi-пара (hidden/shy/ignored_by_ik)
    rig = base_rig("t5")
    rig.bones = [Bone(id="Main", parent=None, position=(0.0, 0.0), angle=0.0,
                      length=0.5),
                 Bone(id="X start", parent="Main", position=(0, 0),
                      angle=0.0, length=0.1, strength=0.0,
                      is_flexi_endpoint=True, flexi_pair="X end",
                      flexi_chain="X", hidden=True, shy=True,
                      ignored_by_ik=True),
                 Bone(id="X end", parent="Main", position=(0.3, 0),
                      angle=3.141593, length=0.1, strength=0.0,
                      is_flexi_endpoint=True, flexi_pair="X start",
                      flexi_chain="X", hidden=True, shy=True,
                      ignored_by_ik=True)]
    root(rig, [img_part("img_red", red)], "t5")
    emit(rig, str(OUT / "t5_flexi.moho"))

    # t6: свитч, состояния которого — ГРУППЫ с картинками
    rig = base_rig("t6")
    rig.bones = [Bone(id="Main", parent=None, position=(0.0, 0.0), angle=0.0,
                      length=0.5)]
    sw = Part(id="swg", name="Head", type="switch",
              switch_states=["Front", "Back"])
    for i, (vn, img) in enumerate((("Front", red), ("Back", blue))):
        g = Part(id=f"view_{vn}", name=vn, type="group", bone="Main")
        kid = img_part(f"kid_{vn}", img)
        kid.parent = g.id
        g.children = [kid]
        g.parent = sw.id
        sw.children.append(g)
    sw.switch_channel = Channel(type="String", when=[0], val=["Front"],
                                interp=[{"im": 1, "v1": -1.0, "v2": -1.0,
                                         "in": 1, "h": 0, "s": False,
                                         "t": 0}])
    root(rig, [sw], "t6")
    emit(rig, str(OUT / "t6_group_switch.moho"))

    # t7: raw-канал с экшеном + bones_groups (IK)
    rig = base_rig("t7")
    b = Bone(id="Body", parent="Main", position=(0.0, 0.0), angle=0.0,
             length=0.4)
    b.scale_channel_raw = {"type": "Val", "ref": False, "mute": False,
                           "when": [0], "val": [1.0],
                           "interp": [{"im": 1, "v1": -1.0, "v2": -1.0,
                                       "in": 1, "h": 0, "s": False,
                                       "t": 0}],
                           "actions": [{"name": "Squash",
                                        "pose": {"type": "Val",
                                                 "ref": False, "mute": False,
                                                 "when": [0, 1, 2],
                                                 "val": [1.0, 0.75, 1.25],
                                                 "interp": [{"im": 1,
                                                             "v1": 0.1,
                                                             "v2": 0.5,
                                                             "in": 1, "h": 0,
                                                             "s": False,
                                                             "t": 0}] * 3}}]}
    rig.bones = [Bone(id="Main", parent=None, position=(0.0, 0.0), angle=0.0,
                      length=0.5), b]
    rig.extras["bones_groups"] = [{
        "type": "BoneGroup", "enabled": True, "name": "Leg IK",
        "bones": [0, 1],
        "active_bone": {"type": "Val", "ref": False, "mute": False,
                        "when": [0], "val": [1.0],
                        "interp": [{"im": 1, "v1": 0.1, "v2": 0.5, "in": 1,
                                    "h": 0, "s": False, "t": 0}]}}]
    root(rig, [img_part("img_red", red, "Body")], "t7")
    emit(rig, str(OUT / "t7_raw_ik.moho"))

    for f in sorted(OUT.glob("t*.moho")):
        print(f"  {f.name:24} {f.stat().st_size} байт")
    print("Открывай по очереди в Moho; первый НЕ открывшийся = виновник.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
