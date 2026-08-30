"""Behavioral tests for the native Moho animation stage."""

from __future__ import annotations

import hashlib
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from pipeline.moho.extract import extract_from_file
from pipeline.riggen.master_character_compiler import compile_master_character
from pipeline.tools.animate_moho import animate_and_certify
from pipeline.tools.moho_native_acceptance import NativeAcceptanceResult


MOHO = Path(os.environ.get(
    "MOHO_EXECUTABLE",
    "/Applications/Moho.app/Contents/MacOS/Moho",
))


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _animation_plan() -> dict:
    return {
        "actions": [{"type": "walk", "startFrame": 1, "endFrame": 40}],
        "keyPoses": [{"frame": 30, "pose": "happy"}],
        "gaze": [{"target": "camera", "startFrame": 1, "endFrame": 60}],
        "blinks": [{"frame": 15, "duration": 3}],
        "phonemes": [{
            "word": "Hello",
            "startFrame": 10,
            "endFrame": 20,
            "phonemeSequence": ["rest", "A", "E", "O", "rest"],
        }],
        "gestures": [{"frame": 20, "type": "hand-swap", "newHand": "point"}],
        "ikTargets": [{"bone": "Foot_L", "lock": True, "frame": 1}],
        "secondaryMotion": [{"type": "hair-follow-through", "magnitude": 0.5}],
        "camera": [{"type": "push-in", "startFrame": 1, "endFrame": 60, "scaleZ": 0.5}],
        "inspectionFrames": [1, 30, 60],
    }


class MohoAnimatorTests(unittest.TestCase):
    @unittest.skipUnless(
        MOHO.is_file() and os.environ.get("RUN_REAL_MOHO_ACCEPTANCE") == "1",
        "set RUN_REAL_MOHO_ACCEPTANCE=1 to run real Moho",
    )
    def test_applies_plan_and_certifies_distinct_native_frames(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            source = root / "source.moho"
            output = root / "animated.moho"
            evidence = root / "evidence"
            compile_master_character(
                name="AnimatedHero",
                out_path=str(source),
                canvas_w=400,
                canvas_h=600,
            )
            source_hash = _sha256(source)

            result = animate_and_certify(
                str(source),
                _animation_plan(),
                str(output),
                str(evidence),
            )

            self.assertEqual(result["status"], "certified", result)
            self.assertTrue(output.is_file())
            self.assertEqual(_sha256(source), source_hash)
            self.assertTrue(all(
                gate["passed"] for gate in result["gates"] if gate["mandatory"]
            ))
            self.assertTrue(all(value > 0 for value in result["frame_differences"]))

            animated = extract_from_file(str(output))
            bones = {bone.id: bone for bone in animated.bones}
            self.assertIn(15, bones["Eyes Switch"].angle_channel.when)
            self.assertIn(10, bones["Mouth Switch"].angle_channel.when)
            self.assertIn(30, bones["Hair Helper"].angle_channel.when)
            self.assertGreaterEqual(
                len(animated.extras["animatedValues"]["camera_zoom"]["when"]),
                3,
            )
            hand_switch = next(
                part for part in animated.walk_parts()
                if part.type == "switch" and part.name == "Hand Switch L"
            )
            self.assertIn("Point", hand_switch.switch_channel.val)

    def test_native_failure_never_promotes_uncertified_candidate(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            source = root / "source.moho"
            output = root / "animated.moho"
            compile_master_character(
                name="UncertifiedHero",
                out_path=str(source),
                canvas_w=400,
                canvas_h=600,
            )
            failed_acceptance = NativeAcceptanceResult(
                opened=True,
                saved=True,
                reopened=True,
                rendered_frames=[],
                preview_frames=[],
                render_status="requires_moho_pro",
                errors=["render: command-line rendering requires Moho Pro"],
                stdout="",
                stderr="",
                roundtrip_path=str(root / "roundtrip.moho"),
            )

            with patch(
                "pipeline.tools.animate_moho.accept_project",
                return_value=failed_acceptance,
            ):
                result = animate_and_certify(
                    str(source),
                    _animation_plan(),
                    str(output),
                    str(root / "evidence"),
                )

            self.assertEqual(result["status"], "failed")
            self.assertFalse(result["certified"])
            self.assertFalse(output.exists())

    def test_missing_required_rig_controls_fails_without_output(self):
        fixture = Path("fixtures/moho_reference/gramps_rig.moho.bak").resolve()
        if not fixture.is_file():
            self.skipTest("minimal Moho fixture is unavailable")
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir) / "must_not_exist.moho"

            result = animate_and_certify(
                str(fixture),
                _animation_plan(),
                str(output),
                str(Path(temp_dir) / "evidence"),
            )

            self.assertEqual(result["status"], "failed")
            self.assertFalse(result["certified"])
            self.assertFalse(output.exists())
            self.assertTrue(result["errors"])


if __name__ == "__main__":
    unittest.main()
