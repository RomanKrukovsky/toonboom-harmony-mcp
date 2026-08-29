"""Native acceptance tests for the complete Stage-1 procedural humanoid."""

from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageChops

from pipeline.moho.extract import extract_from_file
from pipeline.riggen.humanoid_manifest import build_humanoid_manifest
from pipeline.riggen.master_character_compiler import compile_master_character
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


class ProductionHumanoidStructureTests(unittest.TestCase):
    def test_full_humanoid_has_required_production_controls(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            output = compile_master_character(
                name="Stage1Hero",
                out_path=str(Path(temp_dir) / "hero.moho"),
                canvas_w=400,
                canvas_h=600,
            )
            rig = extract_from_file(output)
            manifest = build_humanoid_manifest(rig)

            required_bones = {
                "Main",
                "Body",
                "Head",
                "UpperArm L",
                "LowerArm L",
                "UpperArm R",
                "LowerArm R",
                "Thigh L",
                "Shin L",
                "Foot L",
                "Thigh R",
                "Shin R",
                "Foot R",
                "Target Leg L",
                "Target Leg R",
                "Head Switch",
                "Mouth Switch",
                "Eyes Switch",
                "Hand Switch L",
                "Hand Switch R",
            }
            self.assertLessEqual(required_bones, set(manifest["bones"]))
            self.assertEqual(len(manifest["switches"]["Head"]), 8)
            self.assertGreaterEqual(len(manifest["switches"]["Mouth"]), 6)
            self.assertGreaterEqual(len(manifest["switches"]["Eyes"]), 4)
            self.assertGreaterEqual(len(manifest["switches"]["Hand Switch L"]), 4)
            self.assertGreaterEqual(len(manifest["switches"]["Hand Switch R"]), 4)
            self.assertEqual(manifest["diagnosticFrames"], [1, 12, 24, 36])
            self.assertGreaterEqual(manifest["boundMeshCount"], 15)


@unittest.skipUnless(MOHO.is_file(), "real Moho is not installed")
class ProductionHumanoidNativeTests(unittest.TestCase):
    def test_diagnostic_frames_are_distinct_after_native_roundtrip(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            output = compile_master_character(
                name="Stage1Hero",
                out_path=str(temp_path / "hero.moho"),
                canvas_w=400,
                canvas_h=600,
            )
            result = accept_project(
                output,
                str(temp_path / "evidence"),
                [1, 12, 24, 36],
            )

            # Выведем ошибки
            print(f"Native reopen errors: {result.errors}")
            self.assertTrue(result.reopened, f"Errors during native reopen: {result.errors}")
            roundtrip_frames = result.rendered_frames[-4:]
            differences = [
                image_difference(first, second)
                for first, second in zip(roundtrip_frames, roundtrip_frames[1:])
            ]
            self.assertTrue(
                all(difference > 0.01 for difference in differences),
                differences,
            )


if __name__ == "__main__":
    unittest.main()
