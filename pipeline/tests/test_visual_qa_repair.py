"""Behavioral tests for native visual QA and safe repair."""

from __future__ import annotations

import hashlib
import os
import tempfile
import unittest
from pathlib import Path

from pipeline.moho.emit import emit
from pipeline.moho.extract import extract_from_file
from pipeline.moho.qa_repair import MohoVisualQARepairEngine, QADefect
from pipeline.pir.schema import Channel
from pipeline.riggen.master_character_compiler import compile_master_character
from pipeline.tools.qa_repair_cli import run_qa_repair


MOHO = Path(os.environ.get(
    "MOHO_EXECUTABLE",
    "/Applications/Moho.app/Contents/MacOS/Moho",
))


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _make_defective_project(path: Path) -> None:
    compile_master_character(
        name="RepairHero",
        out_path=str(path),
        canvas_w=400,
        canvas_h=600,
    )
    rig = extract_from_file(str(path))
    head = rig.bone_by_id("Head Switch")
    eyes = rig.bone_by_id("Eyes Switch")
    mouth = rig.bone_by_id("Mouth Switch")
    assert head is not None and eyes is not None and mouth is not None
    head.strength = 0.75
    eyes.angle_channel = Channel(type="Val", when=[0], val=[eyes.angle], interp=[])
    mouth.angle_channel = Channel(type="Val", when=[0], val=[mouth.angle], interp=[])
    emit(rig, str(path))


class VisualQARepairTests(unittest.TestCase):
    def test_audit_detects_structural_defects_in_actual_project(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            project = Path(temp_dir) / "defective.moho"
            _make_defective_project(project)

            defects = MohoVisualQARepairEngine(str(project)).audit_project_and_frames()
            defect_types = {defect.issue_type for defect in defects}

            self.assertIn("control_bones_visible", defect_types)
            self.assertIn("missing_blink", defect_types)
            self.assertIn("frozen_mouth", defect_types)

    def test_unsupported_repair_is_not_counted_as_applied(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            project = Path(temp_dir) / "hero.moho"
            compile_master_character(out_path=str(project), canvas_w=400, canvas_h=600)
            engine = MohoVisualQARepairEngine(str(project))

            applied = engine.apply_fixes_to_project([
                QADefect("joint_seam_tear", 12, "high", "visual tear"),
            ])

            self.assertEqual(applied, 0)
            self.assertEqual(engine.repair_log, [])

    def test_auto_repair_disabled_preserves_original(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            project = Path(temp_dir) / "defective.moho"
            _make_defective_project(project)
            original_hash = _sha256(project)

            result = run_qa_repair(
                str(project), max_passes=2, auto_repair=False,
                evidence_dir=str(Path(temp_dir) / "evidence"),
            )

            self.assertEqual(result["status"], "failed")
            self.assertFalse(result["is_certified"])
            self.assertEqual(_sha256(project), original_hash)

    @unittest.skipUnless(MOHO.is_file(), "real Moho is not installed")
    def test_real_repair_is_promoted_only_after_native_recertification(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            project = Path(temp_dir) / "defective.moho"
            _make_defective_project(project)
            original_hash = _sha256(project)

            result = run_qa_repair(
                str(project), max_passes=3, auto_repair=True,
                evidence_dir=str(Path(temp_dir) / "evidence"),
            )

            self.assertEqual(result["status"], "success", result["log"])
            self.assertTrue(result["is_certified"])
            self.assertTrue(result["repairs_promoted"])
            self.assertNotEqual(_sha256(project), original_hash)
            repaired = extract_from_file(str(project))
            self.assertEqual(repaired.bone_by_id("Head Switch").strength, 0.0)
            self.assertGreater(len(repaired.bone_by_id("Eyes Switch").angle_channel.when), 1)
            self.assertGreater(len(repaired.bone_by_id("Mouth Switch").angle_channel.when), 1)
            self.assertEqual(result["final_acceptance"]["errors"], [])


if __name__ == "__main__":
    unittest.main()
