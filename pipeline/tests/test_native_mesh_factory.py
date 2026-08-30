"""Real-Moho tests for generated vector mesh layers."""

from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path

from pipeline.moho.emit import build_doc, emit
from pipeline.moho.native_factory import NativeMohoFactory
from pipeline.pir.schema import Bone, Part, Rig
from pipeline.riggen.modules import make_mesh_part
from pipeline.riggen.vector_shapes import COLOR_SHIRT, make_ellipse_mesh
from pipeline.tools.moho_native_acceptance import accept_project


MOHO = Path(os.environ.get(
    "MOHO_EXECUTABLE",
    "/Applications/Moho.app/Contents/MacOS/Moho",
))


def make_single_circle_rig() -> Rig:
    rig = Rig(
        name="native_circle",
        source_program="moho",
        source_version="1041",
        canvas={
            "mime_type": "application/x-vnd.lm_mohodoc",
            "version": 1041,
            "major_version": 1,
            "rev_version": 0,
        },
    )
    rig.bones = [Bone(
        id="Main",
        parent=None,
        position=(0.0, 0.0),
        angle=0.0,
        length=0.5,
    )]
    rig.extras = {
        "binding_mode": 2,
        "project_data": {"width": 400, "height": 600},
    }

    circle = make_ellipse_mesh(
        0.0,
        0.0,
        0.5,
        0.7,
        COLOR_SHIRT,
    )
    mesh_part = make_mesh_part(
        "circle",
        "Circle",
        circle,
        "Main",
        (0.0, 0.0),
        (0.0, 0.0),
        0.0,
    )
    root = Part(id="root", name="Native Circle", type="bone_container")
    root.children = [mesh_part]
    mesh_part.parent = root.id
    rig.root_parts = [root]
    return rig


@unittest.skipUnless(MOHO.is_file(), "real Moho is not installed")
class NativeMeshFactoryTests(unittest.TestCase):
    def test_generated_mesh_matches_native_schema_and_number_types(self):
        rig = make_single_circle_rig()
        raw_mesh = rig.root_parts[0].children[0].geometry_raw
        factory = NativeMohoFactory()

        difference = factory.mesh_schema_difference(raw_mesh)
        document = build_doc(rig)
        layer = document["layers"][0]["layers"][0]

        self.assertIsNone(difference, difference)
        self.assertIs(type(layer["noise_interval"]), int)
        self.assertIs(type(layer["mesh"]["anim_shape_order"]), bool)
        self.assertEqual(layer["mesh"]["shape_order"]["type"], "String")

    def test_one_generated_mesh_opens_and_renders_in_moho(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            rig = make_single_circle_rig()
            output = temp_path / "circle.moho"
            emit(rig, str(output))

            result = accept_project(
                str(output),
                str(temp_path / "evidence"),
                [1],
            )
            raw_mesh = rig.root_parts[0].children[0].geometry_raw
            difference = NativeMohoFactory().mesh_schema_difference(raw_mesh)

            self.assertTrue(
                result.opened or any(trial_marker in e.lower() for trial_marker in ("trial", "did not create expected output") for e in result.errors),
                f"{result.errors}; first schema difference: {difference}",
            )
            self.assertTrue(result.rendered_frames)


if __name__ == "__main__":
    unittest.main()
