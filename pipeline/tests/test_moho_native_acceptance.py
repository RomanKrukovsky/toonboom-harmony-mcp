"""Real-Moho acceptance tests for generated project artifacts."""

from __future__ import annotations

import os
import json
import shutil
import tempfile
import unittest
import zipfile
from pathlib import Path
from subprocess import CompletedProcess
from unittest.mock import patch

from pipeline.tools.moho_native_acceptance import (
    ProcessEvidence,
    _run,
    accept_project,
)


REPO = Path(__file__).resolve().parents[2]
MOHO = Path(os.environ.get(
    "MOHO_EXECUTABLE",
    "/Applications/Moho.app/Contents/MacOS/Moho",
))
REFERENCE = REPO / "fixtures/moho_reference/gramps_rig.moho"


class NativeMohoAcceptanceTests(unittest.TestCase):
    def test_retries_one_transient_native_crash(self):
        with patch(
            "pipeline.tools.moho_native_acceptance.subprocess.run",
            side_effect=[
                CompletedProcess(["moho"], -5, "", "transient"),
                CompletedProcess(["moho"], 0, "ok", ""),
            ],
        ) as mocked_run:
            result = _run(["moho", "project.moho"])

        self.assertEqual(result.returncode, 0)
        self.assertFalse(result.has_moho_error)
        self.assertEqual(mocked_run.call_count, 2)

    def test_timeout_is_a_failure_and_never_a_success(self):
        result = ProcessEvidence(["moho"], 124, "", "timed out")

        self.assertTrue(result.has_moho_error)

    def test_embedded_preview_is_not_reported_as_a_rendered_frame(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            project = temp_path / "source.moho"
            with zipfile.ZipFile(project, "w", zipfile.ZIP_DEFLATED) as archive:
                archive.writestr("Project.mohoproj", json.dumps({"project_data": {}}))
                archive.writestr("preview.jpg", b"\xff\xd8\xffpreview-bytes")

            def fake_open_and_save(
                project_path: Path,
                output_path: Path,
                _evidence_dir: Path,
                prefix: str,
                frame: int,
            ) -> ProcessEvidence:
                del prefix, frame
                shutil.copy2(project_path, output_path)
                return ProcessEvidence(
                    ["moho"], 0, "MCP_ROUNDTRIP_SAVE_OK", "",
                    [str(output_path)],
                )

            license_run = ProcessEvidence(
                ["moho", "-r"],
                1,
                "",
                "Unable to launch the command-line renderer as it is a Pro level feature only. You must upgrade.",
            )
            with patch(
                "pipeline.tools.moho_native_acceptance._open_and_save",
                side_effect=fake_open_and_save,
            ), patch(
                "pipeline.tools.moho_native_acceptance._render_project",
                return_value=([], [license_run]),
            ):
                result = accept_project(str(project), str(temp_path / "evidence"), [1])

            self.assertTrue(result.opened)
            self.assertTrue(result.saved)
            self.assertTrue(result.reopened)
            self.assertEqual(result.rendered_frames, [])
            self.assertEqual(len(result.preview_frames), 1)
            self.assertEqual(result.render_status, "requires_moho_pro")
            self.assertTrue(any("Moho Pro" in error for error in result.errors))


@unittest.skipUnless(
    MOHO.is_file() and os.environ.get("RUN_REAL_MOHO_ACCEPTANCE") == "1",
    "set RUN_REAL_MOHO_ACCEPTANCE=1 to run real Moho",
)
class RealNativeMohoAcceptanceTests(unittest.TestCase):

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
            self.assertEqual(result.render_status, "rendered")
            self.assertEqual(len(result.rendered_frames), 1)

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
