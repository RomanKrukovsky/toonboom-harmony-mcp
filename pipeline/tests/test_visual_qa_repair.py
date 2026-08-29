import unittest
from pipeline.moho.qa_repair import MohoVisualQARepairEngine, QADefect


class VisualQARepairTests(unittest.TestCase):
    def test_audit_empty_frames(self):
        engine = MohoVisualQARepairEngine("dummy.moho")
        frames = [
            {"frame_number": 1, "visible_pixels": 0, "canvas_area": 1000},
            {"frame_number": 2, "visible_pixels": 500, "canvas_area": 1000}
        ]
        defects = engine.audit_frames(frames)
        self.assertEqual(len(defects), 1)
        self.assertEqual(defects[0].issue_type, "empty_frame")
        self.assertEqual(defects[0].frame, 1)

    def test_audit_missing_blink(self):
        engine = MohoVisualQARepairEngine("dummy.moho")
        frames = [{"frame_number": i, "is_blinking": False, "fps": 24, "visible_pixels": 500000} for i in range(125)]
        defects = engine.audit_frames(frames)
        self.assertGreater(len(defects), 0)
        self.assertTrue(any(d.issue_type == "missing_blink" for d in defects))

    def test_apply_fixes(self):
        engine = MohoVisualQARepairEngine("dummy.moho")
        defects = [
            QADefect("joint_seam_tear", 10, "high", "Seam tear", bone_id="B1"),
            QADefect("frozen_mouth", 15, "medium", "Frozen mouth")
        ]
        fixes_applied = engine.apply_fixes(defects)
        self.assertEqual(fixes_applied, 2)
        self.assertEqual(len(engine.repair_log), 2)
        self.assertIn("overlap padding", engine.repair_log[0]["action"])
        self.assertIn("neutral/rest mouth", engine.repair_log[1]["action"])

    def test_repair_loop_certification(self):
        engine = MohoVisualQARepairEngine("dummy.moho", max_passes=3)

        def mock_get_frames(pass_num):
            if pass_num == 1:
                return [{"frame_number": 1, "z_order_error": True, "visible_pixels": 500000}]
            else:
                return [{"frame_number": 1, "z_order_error": False, "visible_pixels": 500000}]

        is_certified, log = engine.run_repair_loop(mock_get_frames)
        self.assertTrue(is_certified)
        self.assertEqual(log[-1]["status"], "certified")

    def test_repair_loop_failure(self):
        engine = MohoVisualQARepairEngine("dummy.moho", max_passes=2)

        def mock_get_frames(pass_num):
            return [{"frame_number": 1, "z_order_error": True, "visible_pixels": 500000}]

        is_certified, log = engine.run_repair_loop(mock_get_frames)
        self.assertFalse(is_certified)
        self.assertEqual(log[-1]["pass"], 2)


if __name__ == "__main__":
    unittest.main()
