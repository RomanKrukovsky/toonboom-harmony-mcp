"""Тесты генератора смаров и брейкдаунов через Switch-слои (Smear Frames)."""
from __future__ import annotations

import unittest
from pathlib import Path

from pipeline.riggen.smear import (
    generate_arc_smear_mesh,
    generate_velocity_stretch_smear_mesh,
    generate_multi_ghost_smear_mesh,
    generate_whiplash_s_smear_mesh,
    build_smear_switch_pack,
    detect_velocity_smear_frames
)
from pipeline.riggen.vector_shapes import generate_limb_mesh
from pipeline.riggen.build import build_rig
from pipeline.moho.emit import emit
from pipeline.tools.moho_format_validator import validate
from pipeline.examples.build_dial_demo import JOINTS


class TestSmearFrames(unittest.TestCase):
    def test_arc_smear_generation(self):
        arc = generate_arc_smear_mesh(start_pos=(-0.2, -0.2), end_pos=(0.3, 0.3), arc_curvature=0.4)
        self.assertEqual(arc["type"], "Mesh")
        self.assertEqual(len(arc["points"]), 6)
        self.assertEqual(len(arc["curves"]), 1)
        self.assertEqual(len(arc["shapes"]), 1)
        self.assertTrue(arc["shapes"][0]["has_fill"])

    def test_velocity_stretch_smear_generation(self):
        stretch = generate_velocity_stretch_smear_mesh(
            center=(0.0, 0.0), radius=(0.1, 0.3), velocity=(0.5, 0.2)
        )
        self.assertEqual(stretch["type"], "Mesh")
        self.assertEqual(len(stretch["points"]), 6)
        self.assertEqual(len(stretch["shapes"]), 1)

    def test_multi_ghost_smear_generation(self):
        base_quad = [(-0.1, 0.3), (-0.1, -0.3), (0.1, -0.3), (0.1, 0.3)]
        multi = generate_multi_ghost_smear_mesh(
            base_quad, trail_offsets=[(-0.05, -0.05), (0.0, 0.0), (0.05, 0.05)]
        )
        self.assertEqual(multi["type"], "Mesh")
        self.assertEqual(len(multi["points"]), 12)
        self.assertEqual(len(multi["shapes"]), 3)

    def test_whiplash_s_smear_generation(self):
        whiplash = generate_whiplash_s_smear_mesh(
            pivot=(0.0, 0.3), tip=(0.0, -0.3), s_intensity=0.3
        )
        self.assertEqual(whiplash["type"], "Mesh")
        self.assertEqual(len(whiplash["points"]), 7)

    def test_velocity_detector(self):
        trajectory = [
            (0, 100.0, 100.0),
            (1, 105.0, 102.0),
            (2, 220.0, 180.0),  # Резкий взмах: delta > 100px
            (3, 225.0, 182.0),
        ]
        detections = detect_velocity_smear_frames(trajectory, velocity_threshold_px=30.0)
        self.assertGreaterEqual(len(detections), 1)
        self.assertEqual(detections[0]["frame"], 2)
        self.assertIn(detections[0]["smear_state"], ["Smear_Arc", "Smear_Stretch", "Smear_Multi"])

    def test_smear_switch_pack_in_rig(self):
        base_arm = generate_limb_mesh("LArm")
        pack = build_smear_switch_pack("LArm", base_arm)
        self.assertEqual(len(pack), 5)
        self.assertIn("Normal", pack)
        self.assertIn("Smear_Arc", pack)
        self.assertIn("Smear_Stretch", pack)
        self.assertIn("Smear_Multi", pack)
        self.assertIn("Smear_Whiplash", pack)

        spec = {
            "name": "smear_demo_char",
            "canvas": {"width": 400, "height": 600},
            "joints": JOINTS,
            "simple_switches": [
                {
                    "id": "LArm_Smear",
                    "name": "LArm Smear Switch",
                    "bone": "UpperArm L",
                    "action": "LArm Smear",
                    "states": pack,
                    "center_by_state": {k: [136, 274] for k in pack},
                }
            ]
        }
        rig = build_rig(spec)
        out_path = "/tmp/smear_char_test.moho"
        emit(rig, out_path)

        ok, problems = validate(out_path)
        self.assertTrue(ok, f"Format validation failed for smear rig: {problems}")


if __name__ == "__main__":
    unittest.main()
