import os
import tempfile
import unittest
from pathlib import Path
from PIL import Image

from pipeline.stage4_batch_artwork import PSDParser, RigCompiler, BatchProducer


class Stage4BatchArtworkTests(unittest.TestCase):
    def test_inspect_psd_missing_file_raises_error(self):
        with self.assertRaises(FileNotFoundError):
            PSDParser.inspect_psd("/nonexistent/file/path/char.psd")

    def test_inspect_psd_real_file(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            test_file = Path(temp_dir) / "character.png"
            img = Image.new("RGBA", (800, 1200), (255, 200, 180, 255))
            img.save(str(test_file))

            res = PSDParser.inspect_psd(str(test_file))
            self.assertEqual(res["status"], "success")
            self.assertEqual(res["metadata"]["width"], 800)
            self.assertEqual(res["metadata"]["height"], 1200)
            self.assertIn("layers", res)
            self.assertGreater(len(res["layers"]), 0)

    def test_import_psd_character(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            test_file = Path(temp_dir) / "character.png"
            img = Image.new("RGBA", (400, 600), (255, 200, 180, 255))
            img.save(str(test_file))

            res = PSDParser.import_psd_character(str(test_file))
            self.assertEqual(res["status"], "success")
            self.assertIn("promotion_dir", res)
            self.assertTrue(any(l["inpainted"] and "15% circular padding" in l["padding_applied"] for l in res["processed_layers"]))

    def test_relink(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            proj_dir = Path(temp_dir)
            proj_file = proj_dir / "project.moho"
            proj_file.write_text("DUMMY_MOHO")

            img1 = proj_dir / "img1.png"
            img1.write_bytes(b"\x89PNG\r\n\x1a\n")

            res = PSDParser.relink(str(proj_file), [str(img1), "/nonexistent/missing.png"])
            self.assertEqual(res["status"], "success")
            self.assertEqual(len(res["relinked_assets"]), 2)
            self.assertEqual(res["relinked_assets"][0]["relative"], "assets/img1.png")
            self.assertEqual(res["relinked_assets"][0]["status"], "relinked")
            self.assertEqual(res["relinked_assets"][1]["status"], "missing_source_file")

    def test_compile_from_artwork(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            out_path = str(Path(temp_dir) / "hero_slim.moho")
            params = {"skin_rgb": [0.9, 0.7, 0.6], "hair_rgb": [0.1, 0.1, 0.1]}
            res = RigCompiler.compile_from_artwork({}, "slim", params, output_path=out_path)
            self.assertEqual(res["status"], "success")
            self.assertEqual(res["body_plan"], "slim")
            self.assertTrue(os.path.isfile(out_path))
            self.assertTrue(res["moho_gates"]["open"])
            self.assertTrue(res["moho_gates"]["render"])
            self.assertEqual(res["semantic_classification"], "multi_language_fallback_topology")

    def test_compile_invalid_body_plan(self):
        with self.assertRaises(ValueError):
            RigCompiler.compile_from_artwork({}, "alien", {})

    def test_batch_produce_partial_failure(self):
        specs = [
            {"scene_name": "shot_01", "body_plan": "slim"},
            {"scene_name": "shot_02", "trigger_failure": True},
            {"scene_name": "shot_03", "body_plan": "stocky"}
        ]
        res = BatchProducer.batch_produce(specs, concurrency=2)
        self.assertEqual(res["status"], "partial_success")
        self.assertEqual(len(res["successful_scenes"]), 2)
        self.assertEqual(len(res["failed_scenes"]), 1)
        self.assertEqual(res["failed_scenes"][0]["scene"], "shot_02")
        self.assertIn("timeline", res)
        self.assertIn("fcpxml", res["timeline"]["format"])


if __name__ == "__main__":
    unittest.main()
