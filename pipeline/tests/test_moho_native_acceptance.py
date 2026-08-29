"""Real-Moho acceptance tests for generated project artifacts."""

from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path

from pipeline.tools.moho_native_acceptance import accept_project


REPO = Path(__file__).resolve().parents[2]
MOHO = Path(os.environ.get(
    "MOHO_EXECUTABLE",
    "/Applications/Moho.app/Contents/MacOS/Moho",
))
REFERENCE = REPO / "fixtures/moho_reference/gramps_rig.moho"


@unittest.skipUnless(MOHO.is_file(), "real Moho is not installed")
class NativeMohoAcceptanceTests(unittest.TestCase):
    def test_accepts_known_good_project_after_save_and_reopen(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            result = accept_project(
                str(REFERENCE),
                temp_dir,
                [1],
            )

            self.assertTrue(result.opened, result.errors)
            self.assertTrue(result.saved, result.errors)
            self.assertTrue(result.reopened, result.errors)
            self.assertEqual(len(result.rendered_frames), 2)
            self.assertEqual(result.errors, [])

    def test_rejects_corrupt_project_even_when_moho_returns_zero(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            bad_project = temp_path / "bad.moho"
            bad_project.write_bytes(b"not a moho archive")

            result = accept_project(
                str(bad_project),
                str(temp_path / "evidence"),
                [1],
            )

            self.assertFalse(result.opened)
            self.assertFalse(result.saved)
            self.assertFalse(result.reopened)
            self.assertEqual(result.rendered_frames, [])
            self.assertTrue(result.errors)


if __name__ == "__main__":
    unittest.main()
