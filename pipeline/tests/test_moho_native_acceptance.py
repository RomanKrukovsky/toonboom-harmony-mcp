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
    _process_errors,
    _run,
    _native_structure,
    accept_project,
)


REPO = Path(__file__).resolve().parents[2]
MOHO = Path(os.environ.get(
    "MOHO_EXECUTABLE",
    "/Applications/Moho.app/Contents/MacOS/Moho",
))
REFERENCE = REPO / "fixtures/moho_reference/gramps_rig.moho"


class NativeMohoAcceptanceTests(unittest.TestCase):
    def test_extracts_typed_native_structure_from_saved_project_json(self):
        report = _native_structure({"layers": [{
            "layer_id": "arm_layer",
            "type": "SwitchLayer",
            "layers": [{"layer_id": "open"}, {"layer_id": "closed"}],
            "skeleton": {"bones": [
                {"bone_id": "root", "parent_bone_id": -1},
                {"bone_id": "arm", "parent_bone_id": "root"},
            ]},
            "bindings": [{"part_id": "forearm", "bone_id": "arm"}],
            "actions": [{"action_id": "bend", "driver_bone_id": "arm", "targets": [{"bone_id": "hand"}]}],
            "vitruvian_groups": [{"group_name": "arm_group", "bone_ids": ["arm", "hand"]}],
            "mesh": {"mesh_id": "arm_mesh", "points": [{}, {}, {}, {}]}
        }]})

        self.assertEqual(report["saved_bone_ids"], ["arm", "root"])
        self.assertEqual(report["saved_layer_ids"], ["arm_layer", "closed", "open"])
        self.assertEqual(report["saved_layer_order"], ["arm_layer", "open", "closed"])
        self.assertEqual(report["parent_bone_pairs"], [{"boneId": "arm", "parentBoneId": "root"}])
        self.assertEqual(report["binding_pairs"], [{"partId": "forearm", "boneId": "arm"}])
        self.assertEqual(report["switch_choices"], {"arm_layer": ["closed", "open"]})
        self.assertEqual(report["mesh_point_counts"], {"arm_mesh": 4})
        self.assertEqual(report["vitruvian_membership"], {"arm_group": ["arm", "hand"]})

    def test_maps_native_layer_parent_index_to_bone_name(self):
        report = _native_structure({"layers": [{
            "name": "Rig",
            "uuid": "rig-uuid",
            "type": "BoneLayer",
            "skeleton": {"bones": [
                {"name": "Root", "parent": -1},
                {"name": "Arm", "parent": 0},
            ]},
            "layers": [{
                "name": "Forearm Art",
                "uuid": "forearm-uuid",
                "type": "ImageLayer",
                "parent_bone": 1,
            }],
        }]})

        self.assertEqual(report["binding_pairs"], [{"partId": "Forearm Art", "boneId": "Arm"}])
        self.assertEqual(report["parent_bone_pairs"], [{"boneId": "Arm", "parentBoneId": "Root"}])
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

    def test_pro_license_message_is_a_failure_even_when_moho_returns_zero(self):
        result = ProcessEvidence(
            ["moho", "-r"],
            0,
            "",
            "Unable to launch the command-line renderer as it is a Pro level feature only. You must upgrade.",
        )

        self.assertTrue(result.has_moho_error)
        self.assertTrue(result.requires_moho_pro)
        self.assertEqual(
            _process_errors("render", [result]),
            [
                "render: command-line rendering requires Moho Pro",
                "render: Moho did not create expected output",
            ],
        )

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
