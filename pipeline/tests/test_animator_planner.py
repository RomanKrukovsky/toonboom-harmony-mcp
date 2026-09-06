"""Unit tests for the deterministic AnimationPlanner."""

from __future__ import annotations

import unittest
from pipeline.animator.planner import AnimationPlanner, compute_plan_fingerprint


class TestAnimationPlanner(unittest.TestCase):
    def test_plan_from_brief_determinism(self) -> None:
        brief = "Hero runs in, stops, smiles, says 'Welcome to Stage 2', points with hand and camera zooms in"
        plan1 = AnimationPlanner.plan_from_brief(
            brief=brief,
            duration_frames=120,
            fps=24,
            emotion="neutral",
            motion_style="expressive",
        )
        plan2 = AnimationPlanner.plan_from_brief(
            brief=brief,
            duration_frames=120,
            fps=24,
            emotion="neutral",
            motion_style="expressive",
        )
        self.assertEqual(plan1["fingerprint"], plan2["fingerprint"])
        self.assertEqual(plan1, plan2)

    def test_brief_nlp_parsing(self) -> None:
        brief = "Hero runs fast, stops and looks left, then gets angry and camera whip-pans"
        plan = AnimationPlanner.plan_from_brief(
            brief=brief,
            duration_frames=90,
            fps=24,
        )
        # Action should have run and idle
        action_types = [a["type"] for a in plan["actions"]]
        self.assertIn("run", action_types)
        self.assertIn("idle", action_types)

        # Emotion should be angry
        poses = [p["pose"] for p in plan["keyPoses"]]
        self.assertIn("angry", poses)

        # Gaze should be left
        self.assertEqual(plan["gaze"][0]["target"], "left")

        # Camera should be whip-pan
        self.assertEqual(plan["camera"][0]["type"], "whip-pan")

        # Must have at least 3 diagnostic frames
        self.assertGreaterEqual(len(plan["diagnosticFrames"]), 3)

        # Must have blinks
        self.assertGreater(len(plan["blinks"]), 0)


if __name__ == "__main__":
    unittest.main()
