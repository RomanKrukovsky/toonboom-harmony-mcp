import os
import tempfile
import unittest
from pathlib import Path

from pipeline.moho.qa_repair import MohoVisualQARepairEngine, QADefect
from pipeline.riggen.master_character_compiler import compile_master_character


class VisualQARepairTests(unittest.TestCase):
    def test_audit_empty_frames(self):
        engine = MohoVisualQARepairEngine("dummy.moho")
        frames = [
            {"frame_number": 1, "visible_pixels": 0, "canvas_area": 1000},
            {"frame_number": 2, "visible_pixels": 500, "canvas_area": 1000}
        ]
        defects = engine.audit_project_and_frames(frames_data=frames)
        self.assertTrue(any(d.issue_type == "empty_frame" and d.frame == 1 for d in defects))

    def test_audit_missing_blink(self):
        engine = MohoVisualQARepairEngine("dummy.moho")
        frames = [{"frame_number": i, "missing_blink": True} for i in [24, 72]]
        defects = engine.audit_project_and_frames(frames_data=frames)
        self.assertGreater(len(defects), 0)
        self.assertTrue(any(d.issue_type == "missing_blink" for d in defects))

    def test_apply_fixes_modifies_real_moho_project(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            proj_path = str(Path(temp_dir) / "hero_repair.moho")
            compile_master_character(
                name="RepairHero",
                out_path=proj_path,
                canvas_w=400,
                canvas_h=600,
            )

            engine = MohoVisualQARepairEngine(proj_path)
            defects = [
                QADefect("control_bones_visible", 0, "high", "Control bone visible", bone_id="Head Switch"),
                QADefect("missing_blink", 24, "medium", "Missing blink"),
                QADefect("frozen_mouth", 36, "medium", "Frozen mouth"),
            ]
            fixes_applied = engine.apply_fixes_to_project(defects)
            self.assertGreaterEqual(fixes_applied, 3)
            self.assertGreaterEqual(len(engine.repair_log), 3)

    def test_repair_loop_certification(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            proj_path = str(Path(temp_dir) / "hero_loop.moho")
            compile_master_character(
                name="LoopHero",
                out_path=proj_path,
                canvas_w=400,
                canvas_h=600,
            )

            engine = MohoVisualQARepairEngine(proj_path, max_passes=3)

            def mock_get_frames(pass_num):
                if pass_num == 1:
                    return [{"frame_number": 1, "z_order_error": True, "visible_pixels": 500000}]
                else:
                    return [{"frame_number": 1, "z_order_error": False, "visible_pixels": 500000}]

            is_certified, log = engine.run_repair_loop(mock_get_frames)
            self.assertTrue(is_certified)
            self.assertEqual(log[-1]["status"], "certified")


if __name__ == "__main__":
    unittest.main()
