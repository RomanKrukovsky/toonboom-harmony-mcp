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
from pipeline.tools.moho_readiness import score_project

MOHO = Path(os.environ.get(
    "MOHO_EXECUTABLE",
    "/Applications/Moho.app/Contents/MacOS/Moho",
))


class MohoReadinessTests(unittest.TestCase):
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


if __name__ == "__main__":
    unittest.main()
