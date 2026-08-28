"""Минимальная лестница для диагностики ошибки открытия vector MeshLayer.

Каждый следующий файл добавляет ровно одну конструкцию Moho. Первый файл,
который не открывается, указывает на несовместимый блок формата.
"""
from __future__ import annotations

import copy
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO))

from pipeline.moho.emit import emit  # noqa: E402
from pipeline.pir.schema import Bone, Part, Rig  # noqa: E402
from pipeline.riggen.modules import make_bone_group, make_mesh_part, make_vector_switch  # noqa: E402
from pipeline.riggen.vector_shapes import (COLOR_SHIRT, add_point_morph_action,  # noqa: E402
                                           make_ellipse_mesh)

OUT = REPO / "output/bisect_vector"


def base_rig(name: str) -> Rig:
    rig = Rig(name=name, source_program="moho", source_version="1041",
              canvas={"mime_type": "application/x-vnd.lm_mohodoc",
                      "version": 1041, "major_version": 1,
                      "rev_version": 0, "doc_uuid": "", "comment": ""})
    rig.bones = [Bone(id="Main", parent=None, position=(0.0, 0.0),
                      angle=0.0, length=0.5)]
    rig.extras = {"binding_mode": 2,
                  "project_data": {"width": 400, "height": 600}}
    return rig


def finish(rig: Rig, children: list[Part], filename: str) -> None:
    root = Part(id="root", name=rig.name, type="bone_container")
    root.children = children
    for child in children:
        child.parent = root.id
    rig.root_parts = [root]
    emit(rig, str(OUT / filename))


def mesh_part(mesh: dict, name: str = "Circle") -> Part:
    return make_mesh_part(name, name, mesh, "Main", (0.0, 0.0),
                          (0.0, 0.0), 0.0)


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)

    rig = base_rig("v0_skeleton")
    finish(rig, [], "v0_skeleton.moho")

    unbound = make_ellipse_mesh(0.0, 0.0, 0.5, 0.7, COLOR_SHIRT)
    rig = base_rig("v1_mesh_unbound")
    finish(rig, [mesh_part(copy.deepcopy(unbound))], "v1_mesh_unbound.moho")

    bound = make_ellipse_mesh(0.0, 0.0, 0.5, 0.7, COLOR_SHIRT,
                              parent_bone=0)
    rig = base_rig("v2_mesh_point_bound")
    finish(rig, [mesh_part(copy.deepcopy(bound))],
           "v2_mesh_point_bound.moho")

    morphed = copy.deepcopy(bound)
    add_point_morph_action(morphed, "Circle Morph", {
        0: [(0.0, 0.0), (-0.1, 0.0), (0.1, 0.0)],
    })
    rig = base_rig("v3_mesh_point_action")
    finish(rig, [mesh_part(morphed)], "v3_mesh_point_action.moho")

    rig = base_rig("v4_vector_switch")
    states = {"Round": copy.deepcopy(bound),
              "Wide": make_ellipse_mesh(0.0, 0.0, 0.7, 0.5,
                                         COLOR_SHIRT, parent_bone=0)}
    switch = make_vector_switch("switch", "Shape Switch", states, "Main",
                                lambda _bone: (0.0, 0.0),
                                lambda _state: (0.0, 0.0),
                                {"Main": 0.0}, 0)
    finish(rig, [switch], "v4_vector_switch.moho")

    rig = base_rig("v5_bone_group")
    rig.extras["bones_groups"] = [make_bone_group("Main", [0])]
    finish(rig, [mesh_part(copy.deepcopy(bound))], "v5_bone_group.moho")

    for path in sorted(OUT.glob("v*.moho")):
        print(f"{path.name:28} {path.stat().st_size} bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
