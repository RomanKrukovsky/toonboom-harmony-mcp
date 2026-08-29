import os
import json
import tempfile
import unittest
from pathlib import Path


class MohoAnimatorTests(unittest.TestCase):
    def test_moho_animator_plan_generation(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            plan_path = Path(tmp_dir) / "plan.json"

            dummy_plan = {
                "scenes": [{"id": 1, "duration": 120}],
                "beats": [],
                "actions": [{"type": "walk", "startFrame": 1, "endFrame": 40}],
                "keyPoses": [],
                "transitions": [],
                "gaze": [],
                "blinks": [{"frame": 15, "duration": 3}],
                "phonemes": [{"word": "Hello", "phonemeSequence": ["rest", "A", "O", "rest"]}],
                "gestures": [],
                "ikTargets": [],
                "secondaryMotion": [],
                "camera": [{"type": "push-in", "startFrame": 1, "endFrame": 120, "scaleZ": 0.5}],
                "inspectionFrames": [1, 60, 120]
            }

            with open(plan_path, "w") as f:
                json.dump(dummy_plan, f)

            self.assertTrue(plan_path.exists())

            with open(plan_path, "r") as f:
                loaded_plan = json.load(f)

            self.assertEqual(loaded_plan["camera"][0]["type"], "push-in")
            self.assertEqual(len(loaded_plan["phonemes"]), 1)
            self.assertEqual(loaded_plan["blinks"][0]["frame"], 15)


if __name__ == "__main__":
    unittest.main()
