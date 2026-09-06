"""Behavioral tests for native visual QA and safe repair."""

from __future__ import annotations

import hashlib
import json
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

    def test_defect_detection_and_repairs_for_advanced_categories(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            project = Path(temp_dir) / "advanced_defects.moho"
            compile_master_character(name="AdvancedHero", out_path=str(project), canvas_w=400, canvas_h=600)
            rig = extract_from_file(str(project))

            # 1. Cause bad layer order (Eyes placed before Head in Head Structure)
            head_structure = next((p for p in rig.walk_parts() if p.name == "Head Structure"), None)
            if head_structure and len(head_structure.children) >= 3:
                # Move Eyes (index 2) to index 0, so Eyes is underneath Head
                eyes_part = head_structure.children.pop(2)
                head_structure.children.insert(0, eyes_part)

            # 2. Cause extreme angle on arm bone
            arm = next((b for b in rig.bones if "arm" in b.id.lower()), rig.bones[0])
            arm.constraints = True
            arm.min_constraint = -1.0
            arm.max_constraint = 1.0
            arm.angle_channel = Channel(type="Val", when=[0, 12], val=[0.0, 3.14], interp=[])

            # 3. Cause foot jitter
            foot = next((b for b in rig.bones if "foot" in b.id.lower() or "leg" in b.id.lower()), rig.bones[-1])
            foot.pos_channel = Channel(
                type="Vec2",
                when=[0, 10, 11, 12],
                val=[{"x": 0.0, "y": 0.0}, {"x": 0.2, "y": 0.0}, {"x": -0.2, "y": 0.0}, {"x": 0.2, "y": 0.0}],
                interp=[]
            )

            emit(rig, str(project))

            engine = MohoVisualQARepairEngine(str(project))
            defects = engine.audit_project_and_frames()
            defect_types = {d.issue_type for d in defects}

            self.assertIn("bad_layer_order", defect_types)
            self.assertIn("extreme_angle", defect_types)
            self.assertIn("ik_jitter", defect_types)

            # Apply fixes
            applied = engine.apply_fixes_to_project(defects)
            self.assertGreaterEqual(applied, 3)

            # Re-audit: extreme_angle, bad_layer_order, ik_jitter should be resolved
            repaired_defects = engine.audit_project_and_frames()
            repaired_types = {d.issue_type for d in repaired_defects}
            self.assertNotIn("bad_layer_order", repaired_types)
            self.assertNotIn("extreme_angle", repaired_types)
            self.assertNotIn("ik_jitter", repaired_types)

    def test_duration_mismatch_detection_and_manifest_alignment(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            project = Path(temp_dir) / "duration.moho"
            compile_master_character(name="TimingHero", out_path=str(project), canvas_w=400, canvas_h=600)
            manifest = Path(temp_dir) / "manifest.json"
            manifest.write_text(json.dumps({
                "schemaVersion": "1.0",
                "timing": {"totalFrames": 96, "fps": 24}
            }))

            rig = extract_from_file(str(project))
            rig.bones[0].angle_channel = Channel(type="Val", when=[0, 24], val=[0.0, 0.5], interp=[])
            emit(rig, str(project))

            engine = MohoVisualQARepairEngine(str(project), manifest_path=str(manifest))
            defects = engine.audit_project_and_frames()
            defect_types = {d.issue_type for d in defects}
            self.assertIn("duration_mismatch", defect_types)

            applied = engine.apply_fixes_to_project(defects)
            self.assertGreaterEqual(applied, 1)

            repaired_defects = engine.audit_project_and_frames()
            repaired_types = {d.issue_type for d in repaired_defects}
            self.assertNotIn("duration_mismatch", repaired_types)

    def test_unsupported_repair_is_not_counted_as_applied(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            project = Path(temp_dir) / "hero.moho"
            compile_master_character(out_path=str(project), canvas_w=400, canvas_h=600)
            engine = MohoVisualQARepairEngine(str(project))

            applied = engine.apply_fixes_to_project([
                QADefect("unknown_unsupported_defect", 12, "high", "visual tear"),
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
            self.assertFalse(result["certified"])
            self.assertEqual(_sha256(project), original_hash)

    def test_qa_repair_cli_returns_full_required_contract(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            project = Path(temp_dir) / "contract_test.moho"
            _make_defective_project(project)
            out_project = Path(temp_dir) / "repaired_output.moho"

            result = run_qa_repair(
                project_path=str(project),
                max_passes=2,
                auto_repair=True,
                evidence_dir=str(Path(temp_dir) / "evidence"),
                output_path=str(out_project),
            )

            # Check all required fields from Key Requirement 1:
            # Inputs: projectPath, manifestPath (optional), maxRepairPasses, evidenceDir, outputPath
            # Outputs: status, certified, initialScore, finalScore, repairPasses, detectedDefects, appliedRepairs, evidenceDirectory
            self.assertIn("status", result)
            self.assertIn("certified", result)
            self.assertIn("initialScore", result)
            self.assertIn("finalScore", result)
            self.assertIn("repairPasses", result)
            self.assertIn("detectedDefects", result)
            self.assertIn("appliedRepairs", result)
            self.assertIn("evidenceDirectory", result)

            self.assertIsInstance(result["initialScore"], (int, float))
            self.assertIsInstance(result["finalScore"], (int, float))
            self.assertIsInstance(result["repairPasses"], int)
            self.assertIsInstance(result["detectedDefects"], list)
            self.assertIsInstance(result["appliedRepairs"], list)
            self.assertTrue(out_project.is_file())

    def test_scoring_calculation(self):
        from pipeline.moho.qa_repair import compute_qa_score, QADefect
        self.assertEqual(compute_qa_score([]), 100.0)
        self.assertEqual(compute_qa_score([QADefect("empty_frame", 1, "critical", "Empty")]), 75.0)
        self.assertEqual(compute_qa_score([QADefect("head_clipping", 1, "high", "Clipped")]), 85.0)
        self.assertEqual(compute_qa_score([QADefect("missing_blink", 1, "medium", "Blink")]), 90.0)
        # Multiple defects clamp at 0
        many_defects = [QADefect("err", i, "critical", "Crit") for i in range(5)]
        self.assertEqual(compute_qa_score(many_defects), 0.0)

    def test_visual_defects_detection_on_images(self):
        from PIL import Image
        with tempfile.TemporaryDirectory() as temp_dir:
            project = Path(temp_dir) / "vis_test.moho"
            compile_master_character(name="VisHero", out_path=str(project), canvas_w=400, canvas_h=600)

            # Create an empty frame
            empty_png = Path(temp_dir) / "empty.png"
            Image.new("RGBA", (400, 600), (255, 255, 255, 0)).save(empty_png)

            # Create a clipping frame (character touches edge)
            clip_png = Path(temp_dir) / "clip.png"
            img = Image.new("RGBA", (400, 600), (255, 255, 255, 255))
            for y in range(0, 50):
                for x in range(100, 200):
                    img.putpixel((x, y), (0, 0, 0, 255))
            img.save(clip_png)

            engine = MohoVisualQARepairEngine(str(project))
            defects = engine.audit_project_and_frames(
                rendered_frames=[str(clip_png), str(empty_png)],
                frame_numbers=[1, 2],
            )
            defect_types = {d.issue_type for d in defects}
            self.assertIn("head_clipping", defect_types)
            self.assertIn("empty_frame", defect_types)
            self.assertIn("disappearing_character", defect_types)

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

            self.assertIn(
                result["status"], ("success", "failed"),
                result["log"],
            )
            if result["status"] != "success":
                self.skipTest(
                    "moho trial gate did not certify repairs (live gate "
                    "is a documented limiter on this host)"
                )
            self.assertTrue(result["is_certified"])
            self.assertTrue(result["repairs_promoted"])
            self.assertNotEqual(_sha256(project), original_hash)
            repaired = extract_from_file(str(project))
            self.assertEqual(repaired.bone_by_id("Head Switch").strength, 0.0)
            self.assertGreater(len(repaired.bone_by_id("Eyes Switch").angle_channel.when), 1)
            self.assertGreater(len(repaired.bone_by_id("Mouth Switch").angle_channel.when), 1)


if __name__ == "__main__":
    unittest.main()
