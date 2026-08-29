"""Real-Moho tests for IK targets and paired Smart Bone actions."""

from __future__ import annotations

import math
import os
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageChops

from pipeline.moho.emit import emit
from pipeline.moho.extract import extract_from_file
from pipeline.pir.schema import Bone, Part, Rig
from pipeline.riggen import modules as rig_modules
from pipeline.riggen.modules import make_mesh_part, make_vector_switch, wire_dial
from pipeline.riggen.vector_shapes import (
    COLOR_PANTS,
    COLOR_PANTS_DARK,
    COLOR_SHIRT,
    COLOR_SHOE,
    make_ellipse_mesh,
)
from pipeline.tools.moho_native_acceptance import accept_project


MOHO = Path(os.environ.get(
    "MOHO_EXECUTABLE",
    "/Applications/Moho.app/Contents/MacOS/Moho",
))


def image_difference(first_path: str, second_path: str) -> float:
    with Image.open(first_path) as first_image:
        first = first_image.convert("RGBA")
    with Image.open(second_path) as second_image:
        second = second_image.convert("RGBA")
    difference = ImageChops.difference(first, second)
    changed = sum(
        1
        for pixel in difference.get_flattened_data()
        if max(pixel) > 8
    )
    return changed / float(first.width * first.height)


def _rig(name: str, bones: list[Bone], children: list[Part]) -> Rig:
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
    root = Part(id="root", name=name, type="bone_container")
    root.children = children
    for child in children:
        child.parent = root.id
    rig.root_parts = [root]
    return rig


def _mesh_part(name: str, mesh: dict, bone: str) -> Part:
    return make_mesh_part(
        name.lower().replace(" ", "_"),
        name,
        mesh,
        bone,
        (0.0, 0.0),
        (0.0, 0.0),
        0.0,
    )


def build_ik_leg_fixture(output: Path) -> Path:
    bones = [
        Bone(
            id="Thigh L",
            parent=None,
            position=(-0.4, 0.8),
            angle=-math.pi / 2.0,
            length=0.8,
        ),
        Bone(
            id="Shin L",
            parent="Thigh L",
            position=(0.8, 0.0),
            angle=0.0,
            length=0.8,
            constraints=True,
            min_constraint=-0.05,
            max_constraint=2.6,
            target_bone="Target Leg L",
        ),
        Bone(
            id="Foot L",
            parent="Shin L",
            position=(0.8, 0.0),
            angle=0.0,
            length=0.3,
        ),
        Bone(
            id="Target Leg L",
            parent=None,
            position=(-0.4, -0.8),
            angle=0.0,
            length=0.2,
            strength=0.0,
            ignored_by_ik=True,
            pos_keys=[
                (0, -0.4, -0.8),
                (12, 0.25, -0.65),
            ],
        ),
    ]
    parts = [
        _mesh_part(
            "Thigh",
            make_ellipse_mesh(
                -0.4, 0.4, 0.13, 0.45, COLOR_PANTS, parent_bone=0,
            ),
            "Thigh L",
        ),
        _mesh_part(
            "Shin",
            make_ellipse_mesh(
                -0.4, -0.4, 0.11, 0.45, COLOR_PANTS_DARK, parent_bone=1,
            ),
            "Shin L",
        ),
        _mesh_part(
            "Foot",
            make_ellipse_mesh(
                -0.2, -0.85, 0.3, 0.13, COLOR_SHOE, parent_bone=2,
            ),
            "Foot L",
        ),
    ]
    emit(_rig("ik_leg", bones, parts), str(output))
    return output


def build_dial_switch_fixture(output: Path) -> Path:
    main = Bone(
        id="Main",
        parent=None,
        position=(0.0, 0.0),
        angle=0.0,
        length=0.5,
    )
    dial = Bone(
        id="Head Switch",
        parent=None,
        position=(1.2, 0.8),
        angle=0.0,
        length=0.25,
        strength=0.0,
        constraints=True,
        min_constraint=0.0,
        max_constraint=1.0,
        angle_keys=[(0, 0.0), (12, 1.0)],
        is_dial=True,
    )
    states = {
        "Round": make_ellipse_mesh(
            -0.35, 0.0, 0.22, 0.22, COLOR_PANTS, parent_bone=0,
        ),
        "Wide": make_ellipse_mesh(
            0.35, 0.0, 0.65, 0.25, COLOR_SHIRT, parent_bone=0,
        ),
    }
    switch = make_vector_switch(
        "head",
        "Head",
        states,
        "Main",
        lambda _bone: (0.0, 0.0),
        lambda _state: (0.0, 0.0),
        {"Main": 0.0},
        0,
    )
    wire_dial(dial, "Head Switch", [0.0, 1.0], switch, ["Round", "Wide"])
    emit(_rig("dial_switch", [main, dial], [switch]), str(output))
    return output


class SmartActionSchemaTests(unittest.TestCase):
    def test_make_smart_action_returns_paired_action_records(self):
        dial_action, target_action = rig_modules.make_smart_action(
            "Head Switch",
            [0, 1],
            [0.0, 1.0],
            [0, 1],
            ["Round", "Wide"],
            "String",
        )

        self.assertEqual(dial_action["name"], "Head Switch")
        self.assertEqual(target_action["name"], "Head Switch")
        self.assertEqual(dial_action["pose"]["type"], "Val")
        self.assertEqual(target_action["pose"]["type"], "String")

    def test_wire_dial_gives_two_states_an_evaluable_action_span(self):
        dial = Bone(
            id="Head Switch",
            parent=None,
            position=(0.0, 0.0),
            angle=0.0,
            length=0.25,
        )
        switch = Part(id="head", name="Head", type="switch")

        wire_dial(dial, "Head Switch", [0.0, 1.0], switch, ["Round", "Wide"])

        self.assertEqual(dial.dial_actions[0]["pose"]["when"], [0, 2])
        self.assertEqual(switch.switch_dial_actions[0]["pose"]["when"], [0, 2])

    def test_split_dial_helpers_use_the_same_two_state_span(self):
        dial = Bone(
            id="Mouth Switch",
            parent=None,
            position=(0.0, 0.0),
            angle=0.0,
            length=0.25,
        )
        switch = Part(id="mouth", name="Mouth", type="switch")

        rig_modules.dial_ensure_action(dial, "Mouth Switch", [0.0, 1.0])
        rig_modules.switch_attach_action(
            switch,
            "Mouth Switch",
            ["Closed", "Open"],
        )

        self.assertEqual(dial.dial_actions[0]["pose"]["when"], [0, 2])
        self.assertEqual(switch.switch_dial_actions[0]["pose"]["when"], [0, 2])


@unittest.skipUnless(MOHO.is_file(), "real Moho is not installed")
class NativeIkActionTests(unittest.TestCase):
    def test_leg_ik_target_changes_pose_and_survives_roundtrip(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            output = build_ik_leg_fixture(temp_path / "ik_leg.moho")
            result = accept_project(
                str(output),
                str(temp_path / "evidence"),
                [1, 12],
            )

            self.assertTrue(result.reopened, result.errors)
            self.assertGreater(
                image_difference(
                    result.rendered_frames[-2],
                    result.rendered_frames[-1],
                ),
                0.01,
            )
            roundtrip = extract_from_file(result.roundtrip_path)
            shin = roundtrip.bone_by_id("Shin L")
            target = roundtrip.bone_by_id("Target Leg L")
            self.assertEqual(shin.target_bone, "Target Leg L")
            self.assertTrue(shin.constraints)
            self.assertIsNotNone(target.pos_channel)
            self.assertEqual(target.pos_channel.when, [0, 12])

    def test_dial_changes_switch_after_native_roundtrip(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            output = build_dial_switch_fixture(temp_path / "dial.moho")
            result = accept_project(
                str(output),
                str(temp_path / "evidence"),
                [1, 12],
            )

            self.assertTrue(result.reopened, result.errors)
            roundtrip = extract_from_file(result.roundtrip_path)
            self.assertTrue(any(
                link.dial_action_name == "Head Switch"
                for link in roundtrip.dial_links
            ))
            self.assertGreater(
                image_difference(
                    result.rendered_frames[-2],
                    result.rendered_frames[-1],
                ),
                0.02,
            )


if __name__ == "__main__":
    unittest.main()
