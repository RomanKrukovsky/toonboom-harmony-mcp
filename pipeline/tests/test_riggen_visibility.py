from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from PIL import Image

from pipeline.examples.build_dial_demo import JOINTS
from pipeline.moho.emit import build_doc
from pipeline.riggen.build import build_rig
from pipeline.riggen.skeleton import to_moho_coords


class RiggenVisibilityTests(unittest.TestCase):
    def _build_one_image(self, image: Path):
        return build_rig({
            "name": "visibility_test",
            "canvas": {"width": 400, "height": 600},
            "joints": JOINTS,
            "parts": [{
                "id": "torso",
                "name": "Torso",
                "image": str(image),
                "bone": "Body",
                "center": [200, 272],
            }],
        })

    def test_part_center_is_converted_from_pixels(self):
        rig = self._build_one_image(Path("torso.png"))
        part = next(part for part in rig.walk_parts() if part.type == "image")
        center = to_moho_coords(200, 272, 400, 600)
        origin = to_moho_coords(200, 330, 400, 600)

        # Body points straight up, so its local X follows world Y.
        expected_x = center[1] - origin[1]
        translation = part.transforms["translation"].val[0]
        self.assertAlmostEqual(translation["x"], expected_x, places=5)
        self.assertAlmostEqual(translation["y"], 0.0, places=5)

    def test_png_layer_does_not_inherit_psd_metadata(self):
        with tempfile.TemporaryDirectory() as directory:
            image = Path(directory) / "torso.png"
            Image.new("RGBA", (400, 600), (255, 0, 0, 255)).save(image)
            doc = build_doc(self._build_one_image(image))
            layer = doc["layers"][0]["layers"][0]

            self.assertEqual(layer["image_fileref"]["path"], str(image))
            self.assertEqual(layer["psd_layerid"], -2)
            self.assertEqual(layer["psd_layer_bounds"], {
                "top": 0,
                "left": 0,
                "right": 0,
                "bottom": 0,
            })
            self.assertEqual(layer["distortion_layer_uuid"], "")
            self.assertNotIn("psd_layer", layer)
            self.assertNotIn("psd_layer_identifier", layer)
            self.assertNotIn("psd_trim_alpha", layer)
            self.assertNotIn("psd_layer_translation", layer)
            self.assertAlmostEqual(layer["width"], 400 / 72, places=6)
            self.assertAlmostEqual(layer["height"], 600 / 72, places=6)


if __name__ == "__main__":
    unittest.main()
