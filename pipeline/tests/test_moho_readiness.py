"""Tests for Moho production readiness scorer."""

from __future__ import annotations

import json
import os
import tempfile
import unittest
from pathlib import Path

from pipeline.moho.extract import extract_from_file
from pipeline.riggen.humanoid_manifest import build_humanoid_manifest
from pipeline.riggen.master_character_compiler import compile_master_character
from PIL import Image

from pipeline.tools.moho_readiness import (
    compare_manifest,
    diagnostic_differences,
    score_project,
    structural_snapshot,
)

MOHO = Path(os.environ.get(
    "MOHO_EXECUTABLE",
    "/Applications/Moho.app/Contents/MacOS/Moho",
))


class MohoReadinessTests(unittest.TestCase):
    def test_forged_manifest_cannot_replace_actual_project_structure(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            project_path = str(Path(temp_dir) / "hero.moho")
            compile_master_character(
                name="ManifestTruth",
                out_path=project_path,
                canvas_w=400,
                canvas_h=600,
            )
            actual = structural_snapshot(extract_from_file(project_path))
            forged = {
                "bones": ["Invented Bone"],
                "meshLayers": ["Invented Mesh"],
                "boundMeshCount": 999,
            }

            matches, mismatches = compare_manifest(forged, actual)

            self.assertFalse(matches)
            self.assertIn("bones", mismatches)
            self.assertIn("meshLayers", mismatches)
            self.assertIn("boundMeshCount", mismatches)

    def test_identical_frames_do_not_count_as_diagnostic_animation(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            frame_paths = []
            for frame in (1, 12, 24, 36):
                path = Path(temp_dir) / f"frame_{frame:05d}.png"
                Image.new("RGB", (64, 64), (20, 30, 40)).save(path)
                frame_paths.append(str(path))

            differences = diagnostic_differences(frame_paths)

            self.assertEqual(differences, [0.0, 0.0, 0.0])

    @unittest.skipUnless(MOHO.is_file(), "real Moho is not installed")
    def test_known_good_humanoid_scores_at_least_95(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            project_path = str(temp_path / "hero.moho")
            manifest_path = str(temp_path / "manifest.json")
            evidence_dir = str(temp_path / "evidence")

            compile_master_character(
                name="Stage1Hero",
                out_path=project_path,
                canvas_w=400,
                canvas_h=600,
            )

            rig = extract_from_file(project_path)
            manifest = build_humanoid_manifest(rig)
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f)

            report = score_project(project_path, manifest_path, evidence_dir)

            self.assertTrue(report.mandatory_passed, f"Mandatory gates failed: {report.errors}")
            self.assertGreaterEqual(report.score, 95)
            self.assertTrue(report.certified)
            self.assertTrue(os.path.isfile(os.path.join(evidence_dir, "readiness-report.json")))

    def test_missing_project_and_manifest_fail_closed(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            report = score_project(
                str(Path(temp_dir) / "missing.moho"),
                str(Path(temp_dir) / "missing.manifest.json"),
                str(Path(temp_dir) / "evidence"),
            )

            self.assertFalse(report.certified)
            self.assertFalse(report.mandatory_passed)
            self.assertTrue(any("manifest" in error for error in report.errors))


if __name__ == "__main__":
    unittest.main()
