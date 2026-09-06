"""Unit tests for 6+1 phoneme synthesis and lipsync injection."""

from __future__ import annotations

import unittest
from pipeline.animator.lipsync import (
    apply_phonemes_to_rig,
    rhubarb_cues_to_phonemes,
    text_to_phonemes,
)
from pipeline.pir.schema import Bone, Part, Rig


class TestAnimatorLipsync(unittest.TestCase):
    def test_english_phoneme_synthesis(self) -> None:
        cues = text_to_phonemes("Hello world", start_frame=1, end_frame=24, language="en")
        self.assertGreaterEqual(len(cues), 2)
        all_phonemes = [ph for c in cues for ph in c["phonemeSequence"]]
        self.assertIn("Closed", all_phonemes)
        self.assertIn("E", all_phonemes)
        self.assertIn("O", all_phonemes)

    def test_russian_phoneme_synthesis(self) -> None:
        cues = text_to_phonemes("Привет мир", start_frame=1, end_frame=24, language="ru")
        self.assertGreaterEqual(len(cues), 2)
        all_phonemes = [ph for c in cues for ph in c["phonemeSequence"]]
        self.assertIn("Closed", all_phonemes)
        self.assertIn("I", all_phonemes)

    def test_rhubarb_cue_mapping(self) -> None:
        rhubarb_data = [
            {"start": 0.0, "end": 0.2, "value": "X"},
            {"start": 0.2, "end": 0.5, "value": "D"},
            {"start": 0.5, "end": 0.8, "value": "G"},
        ]
        cues = rhubarb_cues_to_phonemes(rhubarb_data, fps=24)
        self.assertEqual(len(cues), 3)
        self.assertEqual(cues[0]["phonemeSequence"], ["Rest"])
        self.assertEqual(cues[1]["phonemeSequence"], ["A"])
        self.assertEqual(cues[2]["phonemeSequence"], ["F_V"])

    def test_apply_phonemes_to_switch_layer(self) -> None:
        switch_part = Part(
            id="mouth_switch",
            name="Mouth Switch",
            type="switch",
            switch_states=["Rest", "Closed", "A", "E", "I", "O", "U", "F_V"],
        )
        rig = Rig(
            name="TestChar",
            source_program="moho",
            source_version="14.0",
            canvas={"w": 1920, "h": 1080},
            bones=[],
            root_parts=[switch_part],
        )
        mouth_bone = Bone(
            id="Mouth Switch",
            parent=None,
            position=(0.0, 0.6),
            angle=0.0,
            length=0.1,
            dial_actions=[{"pose": {"val": [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6]}}],
        )
        cues = [{
            "startFrame": 1,
            "endFrame": 12,
            "phonemeSequence": ["Closed", "A", "O", "Rest"],
        }]
        applied = apply_phonemes_to_rig(rig, mouth_bone, cues)
        self.assertTrue(any("switch_layer" in op for op in applied))
        self.assertTrue(any("bone_dial" in op for op in applied))
        self.assertIsNotNone(switch_part.switch_channel)
        self.assertIn("A", switch_part.switch_channel.val)


if __name__ == "__main__":
    unittest.main()
