import unittest
from pipeline.stage4_batch_artwork import PSDParser, RigCompiler, BatchProducer


class Stage4BatchArtworkTests(unittest.TestCase):
    def test_inspect_psd(self):
        res = PSDParser.inspect_psd("/path/to/char.psd")
        self.assertEqual(res["status"], "success")
        self.assertIn("layers", res)
        self.assertGreater(len(res["layers"]), 0)

    def test_import_psd_character(self):
        res = PSDParser.import_psd_character("/path/to/char.psd")
        self.assertEqual(res["status"], "success")
        self.assertIn("promotion_dir", res)
        self.assertTrue(any(l["inpainted"] and "15% circular padding" in l["padding_applied"] for l in res["processed_layers"]))

    def test_relink(self):
        res = PSDParser.relink("/proj/project.moho", ["/abs/path/img1.png", "/abs/path/img2.png"])
        self.assertEqual(res["status"], "success")
        self.assertEqual(len(res["relinked_assets"]), 2)
        self.assertEqual(res["relinked_assets"][0]["relative"], "assets/img1.png")

    def test_compile_from_artwork(self):
        params = {"skin_rgb": "#FFDDCC", "hair_rgb": "#000000"}
        res = RigCompiler.compile_from_artwork({}, "slim", params)
        self.assertEqual(res["status"], "success")
        self.assertEqual(res["body_plan"], "slim")
        self.assertTrue(res["moho_gates"]["open"])
        self.assertTrue(res["moho_gates"]["render"])
        self.assertEqual(res["semantic_classification"], "multi_language_fallback_topology")

    def test_compile_invalid_body_plan(self):
        with self.assertRaises(ValueError):
            RigCompiler.compile_from_artwork({}, "alien", {})

    def test_batch_produce_partial_failure(self):
        specs = [
            {"scene_name": "shot_01"},
            {"scene_name": "shot_02", "trigger_failure": True},
            {"scene_name": "shot_03"}
        ]
        res = BatchProducer.batch_produce(specs, concurrency=2)
        self.assertEqual(res["status"], "completed")
        self.assertEqual(len(res["successful_scenes"]), 2)
        self.assertEqual(len(res["failed_scenes"]), 1)
        self.assertEqual(res["failed_scenes"][0]["scene"], "shot_02")
        self.assertIn("timeline", res)
        self.assertIn("fcpxml", res["timeline"]["format"])


if __name__ == "__main__":
    unittest.main()
