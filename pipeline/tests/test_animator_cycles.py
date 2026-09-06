"""Unit tests for locomotion and idle cycles and foot pinning."""

from __future__ import annotations

import unittest
from pipeline.animator.cycles import apply_idle_cycle, apply_run_cycle, apply_walk_cycle
from pipeline.pir.schema import Bone


class TestAnimatorCycles(unittest.TestCase):
    def setUp(self) -> None:
        self.bone_map = {
            "Target Leg L": Bone(id="Target Leg L", parent=None, position=(0.1, 0.0), angle=0.0, length=0.1),
            "Target Leg R": Bone(id="Target Leg R", parent=None, position=(-0.1, 0.0), angle=0.0, length=0.1),
            "Body": Bone(id="Body", parent=None, position=(0.0, 0.5), angle=0.0, length=0.2),
            "UpperArm L": Bone(id="UpperArm L", parent="Body", position=(0.2, 0.5), angle=0.0, length=0.15),
            "UpperArm R": Bone(id="UpperArm R", parent="Body", position=(-0.2, 0.5), angle=0.0, length=0.15),
            "Head": Bone(id="Head", parent="Body", position=(0.0, 0.7), angle=0.0, length=0.15),
        }

    def test_walk_cycle_zero_foot_slip_pinning(self) -> None:
        ops = apply_walk_cycle(self.bone_map, start_frame=1, end_frame=25)
        self.assertIn("cycle:walk", ops)

        target_l = self.bone_map["Target Leg L"]
        self.assertIsNotNone(target_l.pos_channel)
        when = target_l.pos_channel.when
        val = target_l.pos_channel.val

        self.assertEqual(when, [0, 1, 7, 13, 19, 25])
        # Stance pinning: y offset must be 0.0 at contact and down
        ground_contacts = [v["y"] for w, v in zip(when, val) if w in [1, 13, 19, 25]]
        self.assertTrue(all(abs(y - 0.0) < 1e-5 for y in ground_contacts))

    def test_run_cycle_airborne_phase(self) -> None:
        ops = apply_run_cycle(self.bone_map, start_frame=1, end_frame=15)
        self.assertIn("cycle:run", ops)

        target_l = self.bone_map["Target Leg L"]
        target_r = self.bone_map["Target Leg R"]
        self.assertIsNotNone(target_l.pos_channel)
        self.assertIsNotNone(target_r.pos_channel)

        # In run cycle, flight phase has elevation (y > 0)
        elevations_l = [v["y"] for v in target_l.pos_channel.val]
        elevations_r = [v["y"] for v in target_r.pos_channel.val]
        self.assertTrue(any(y > 0.05 for y in elevations_l))
        self.assertTrue(any(y > 0.05 for y in elevations_r))

    def test_idle_cycle_breathing(self) -> None:
        ops = apply_idle_cycle(self.bone_map, start_frame=1, end_frame=37)
        self.assertIn("cycle:idle", ops)

        body = self.bone_map["Body"]
        self.assertIsNotNone(body.pos_channel)
        # Check subtle vertical breathing motion
        y_vals = [v["y"] for v in body.pos_channel.val]
        self.assertGreater(max(y_vals), min(y_vals))


if __name__ == "__main__":
    unittest.main()
