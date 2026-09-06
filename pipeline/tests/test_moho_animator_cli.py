"""Tests for moho_animator_cli tool."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from pipeline.animator.planner import AnimationPlanner


class TestMohoAnimatorCLI(unittest.TestCase):
    def test_cli_help(self) -> None:
        cmd = [sys.executable, "-m", "pipeline.tools.moho_animator_cli", "--help"]
        res = subprocess.run(cmd, capture_output=True, text=True)
        self.assertEqual(res.returncode, 0)
        self.assertIn("Autonomous Moho Animator CLI", res.stdout)

    def test_cli_generates_plan_and_executes(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            temp_path = Path(tmpdir)
            source = temp_path / "dummy.moho"
            source.write_text("dummy", encoding="utf-8")
            output = temp_path / "output.moho"
            evidence = temp_path / "evidence"

            cmd = [
                sys.executable,
                "-m",
                "pipeline.tools.moho_animator_cli",
                str(source),
                str(output),
                "--brief", "Character runs in and blinks",
                "--duration-seconds", "3.0",
                "--fps", "24",
                "--evidence", str(evidence),
            ]
            # Since dummy.moho is not a real rig, it should fail-closed with status="failed"
            res = subprocess.run(cmd, capture_output=True, text=True)
            self.assertEqual(res.returncode, 0)
            data = json.loads(res.stdout)
            self.assertEqual(data["status"], "failed")
            self.assertFalse(data["certified"])
            self.assertIn("animationPlan", data)
            self.assertTrue((evidence / "animation_plan.json").is_file())


if __name__ == "__main__":
    unittest.main()
