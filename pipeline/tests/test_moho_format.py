"""Приёмочный тест: сгенерированный .moho должен пройти moho_format_validator."""
from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]

from pipeline.examples.build_dial_demo import JOINTS  # noqa: E402
from pipeline.moho.emit import emit  # noqa: E402
from pipeline.riggen.build import build_rig  # noqa: E402
from pipeline.tools.moho_format_validator import validate  # noqa: E402


def _build_rig(image: str) -> object:
    return build_rig({
        "name": "format_test",
        "canvas": {"width": 400, "height": 600},
        "joints": JOINTS,
        "parts": [{
            "id": "torso", "name": "Torso", "image": image,
            "bone": "Body", "center": [200, 272],
        }],
    })


class MohoFormatTests(unittest.TestCase):
    def test_emitted_file_passes_validator(self):
        with tempfile.TemporaryDirectory() as d:
            from PIL import Image
            image = Path(d) / "torso.png"
            Image.new("RGBA", (400, 600), (70, 110, 170, 255)).save(image)
            out = Path(d) / "format_test.moho"
            emit(_build_rig(str(image)), str(out))
            ok, problems = validate(str(out))
            self.assertTrue(ok, "валидатор отклонил файл:\n" + "\n".join(problems))

    def test_zip_contains_preview_and_project(self):
        import zipfile
        with tempfile.TemporaryDirectory() as d:
            from PIL import Image
            image = Path(d) / "torso.png"
            Image.new("RGBA", (400, 600), (70, 110, 170, 255)).save(image)
            out = Path(d) / "format_test.moho"
            emit(_build_rig(str(image)), str(out))
            names = zipfile.ZipFile(out).namelist()
            self.assertIn("Project.mohoproj", names)
            self.assertIn("preview.jpg", names)


if __name__ == "__main__":
    unittest.main()
