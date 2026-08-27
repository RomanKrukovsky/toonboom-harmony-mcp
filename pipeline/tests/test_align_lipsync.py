"""Тесты инжектора липсинка в .moho файлы."""
from __future__ import annotations

import json
import tempfile
import unittest
import zipfile
from pathlib import Path

from pipeline.tools.align_lipsync import apply_lipsync_to_moho
from pipeline.tools.moho_format_validator import validate


class TestAlignLipsync(unittest.TestCase):
    def test_lipsync_injection(self):
        source_moho = Path("output/riggen/autogen_char_fixed.moho")
        self.assertTrue(source_moho.exists())

        cues = [
            (0, "Closed"),
            (6, "A"),
            (12, "O"),
            (18, "E"),
            (24, "Closed"),
        ]

        with tempfile.TemporaryDirectory() as tmpdir:
            out_file = Path(tmpdir) / "lipsync_test.moho"
            apply_lipsync_to_moho(source_moho, cues, output_path=out_file)

            self.assertTrue(out_file.exists())
            ok, problems = validate(out_file)
            self.assertTrue(ok, f"Format validation failed: {problems}")

            with zipfile.ZipFile(out_file) as z:
                doc = json.loads(z.read("Project.mohoproj"))

            # Проверяем, что ключи записались
            found_keys = False
            for l in doc["layers"]:
                def check_keys(layer):
                    nonlocal found_keys
                    if "switch_keys" in layer:
                        sk = layer["switch_keys"]
                        if sk.get("when") == [0, 6, 12, 18, 24] and sk.get("val") == ["Closed", "A", "O", "E", "Closed"]:
                            found_keys = True
                    for c in layer.get("layers", []):
                        check_keys(c)
                check_keys(l)

            self.assertTrue(found_keys, "Ключевые кадры липсинка не найдены в свитч-слое")


if __name__ == "__main__":
    unittest.main()
