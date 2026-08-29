"""Behavioral tests for native point binding and vector switches."""

from __future__ import annotations

import math
import os
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageChops

from pipeline.moho import native_factory as native_schema
from pipeline.moho.emit import emit
from pipeline.moho.extract import extract_from_file
from pipeline.moho.native_factory import NativeMohoFactory
from pipeline.pir.schema import Bone, Channel, Part, Rig
from pipeline.riggen.modules import make_mesh_part, make_vector_switch
from pipeline.riggen.vector_shapes import COLOR_SHIRT, COLOR_SKIN, make_ellipse_mesh
from pipeline.tools.moho_native_acceptance import accept_project


MOHO = Path(os.environ.get(
    "MOHO_EXECUTABLE",
    "/Applications/Moho.app/Contents/MacOS/Moho",
))
STEP_INTERP = {
    "im": 0,
    "v1": 0.1,
    "v2": 0.5,
    "in": 1,
    "h": 0,
    "s": False,
    "t": 0,
}


def image_difference(first_path: str, second_path: str) -> float:
    with Image.open(first_path) as first_image:
        first = first_image.convert("RGBA")
    with Image.open(second_path) as second_image:
        second = second_image.convert("RGBA")
    if first.size != second.size:
        raise ValueError("images must have equal dimensions")
    difference = ImageChops.difference(first, second)
    changed = sum(
        1
        for pixel in difference.get_flattened_data()
        if max(pixel) > 8
    )
    return changed / float(first.width * first.height)


def _base_rig(name: str, bones: list[Bone]) -> Rig:
    rig = Rig(
        name=name,
        source_program="moho",
        source_version="1041",
        canvas={
            "mime_type": "application/x-vnd.lm_mohodoc",
            "version": 1041,
            "major_version": 1,
            "rev_version": 0,
        },
    )
    rig.bones = bones
    rig.extras = {
        "binding_mode": 2,
        "project_data": {"width": 400, "height": 600},
    }
    return rig


def _finish(rig: Rig, children: list[Part]) -> Rig:
    root = Part(id="root", name=rig.name, type="bone_container")
    root.children = children
    for child in children:
        child.parent = root.id
    rig.root_parts = [root]
    return rig


def build_bound_arm_fixture(output: Path) -> Path:
    main = Bone(
        id="Main",
        parent=None,
        position=(0.0, 0.0),
        angle=0.0,
        length=0.7,
        angle_keys=[(0, 0.0), (12, math.pi / 2.0)],
    )
    mesh = make_ellipse_mesh(
        0.55,
        0.0,
        0.22,
        0.55,
        COLOR_SHIRT,
        parent_bone=0,
    )
    arm = make_mesh_part(
        "arm",
        "Bound Arm",
        mesh,
        "Main",
        (0.0, 0.0),
        (0.0, 0.0),
        0.0,
    )
    emit(_finish(_base_rig("bound_arm", [main]), [arm]), str(output))
    return output


def build_two_state_switch_fixture(output: Path) -> Path:
    main = Bone(
        id="Main",
        parent=None,
        position=(0.0, 0.0),
        angle=0.0,
        length=0.5,
    )
    states = {
        "Round": make_ellipse_mesh(
            -0.35,
            0.0,
            0.22,
            0.22,
            COLOR_SKIN,
        ),
        "Wide": make_ellipse_mesh(
            0.35,
            0.0,
            0.65,
            0.25,
            COLOR_SHIRT,
        ),
    }
    switch = make_vector_switch(
        "shape_switch",
        "Shape Switch",
        states,
        "Main",
        lambda _bone: (0.0, 0.0),
        lambda _state: (0.0, 0.0),
        {"Main": 0.0},
        0,
    )
    switch.switch_channel = Channel(
        type="String",
        when=[0, 2],
        val=["Round", "Wide"],
        interp=[dict(STEP_INTERP), dict(STEP_INTERP)],
    )
    emit(_finish(_base_rig("two_state_switch", [main]), [switch]), str(output))
    return output


class NativeSwitchBindingSchemaTests(unittest.TestCase):
    def test_bind_mesh_points_preserves_geometry_and_uses_integer_parent(self):
        mesh = make_ellipse_mesh(
            0.0,
            0.0,
            0.4,
            0.6,
            COLOR_SHIRT,
        )

        bound = native_schema.bind_mesh_points(mesh, 3)

        self.assertTrue(all(
            type(point["parent"]) is int and point["parent"] == 3
            for point in bound["points"]
        ))
        self.assertEqual(bound["curves"], mesh["curves"])
        self.assertEqual(bound["points"][0]["color"], mesh["points"][0]["color"])
        self.assertEqual(mesh["points"][0]["parent"], -1)

    def test_factory_clones_native_switch_layer(self):
        factory = NativeMohoFactory()
        channel = {
            "type": "String",
            "ref": False,
            "mute": False,
            "when": [0, 2],
            "val": ["Round", "Wide"],
            "interp": [dict(STEP_INTERP), dict(STEP_INTERP)],
        }
        children = [{"type": "MeshLayer", "name": "Round"}]

        layer = factory.switch_layer("Face", children, channel)

        self.assertEqual(layer["type"], "SwitchLayer")
        self.assertEqual(layer["name"], "Face")
        self.assertEqual(layer["layers"], children)
        self.assertEqual(layer["switch_keys"], channel)
        self.assertNotEqual(layer["uuid"], "")


@unittest.skipUnless(MOHO.is_file(), "real Moho is not installed")
class NativeSwitchBindingTests(unittest.TestCase):
    def test_bound_mesh_moves_between_diagnostic_frames(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            output = build_bound_arm_fixture(temp_path / "bound_arm.moho")
            result = accept_project(
                str(output),
                str(temp_path / "evidence"),
                [1, 12],
            )

            self.assertTrue(result.reopened, result.errors)
            self.assertGreater(
                image_difference(
                    result.rendered_frames[0],
                    result.rendered_frames[1],
                ),
                0.02,
            )
            roundtrip = extract_from_file(result.roundtrip_path)
            mesh = next(part for part in roundtrip.walk_parts()
                        if part.type == "mesh")
            self.assertTrue(all(
                type(point["parent"]) is int
                for point in mesh.geometry_raw["points"]
            ))

    def test_native_switch_renders_two_distinct_states(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            output = build_two_state_switch_fixture(temp_path / "switch.moho")
            result = accept_project(
                str(output),
                str(temp_path / "evidence"),
                [1, 2],
            )

            self.assertTrue(result.reopened, result.errors)
            self.assertGreater(
                image_difference(
                    result.rendered_frames[-2],
                    result.rendered_frames[-1],
                ),
                0.02,
            )
            roundtrip = extract_from_file(result.roundtrip_path)
            switch = next(part for part in roundtrip.walk_parts()
                          if part.type == "switch")
            self.assertEqual(switch.switch_states, ["Round", "Wide"])
            self.assertEqual(switch.switch_channel.val, ["Round", "Wide"])


if __name__ == "__main__":
    unittest.main()
