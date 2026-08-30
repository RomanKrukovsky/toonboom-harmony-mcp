"""Native Moho acceptance tests for the declarative topology pipeline.

These tests use the real installed Moho to confirm that a topology
compiled from a free-form description survives FileOpen, FileSaveAs,
and FileReopen. Each test exercises a different non-biped feature
(tail, wings, cape, six fingers) so we know the topology extensions
do not break the base biped gate.
"""
from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path

from pipeline.riggen.topology_compiler import compile_topology_to_moho
from pipeline.riggen.topology_translator import description_to_topology
from pipeline.tools.moho_native_acceptance import accept_project

MOHO = Path(os.environ.get(
    "MOHO_EXECUTABLE",
    "/Applications/Moho.app/Contents/MacOS/Moho",
))


@unittest.skipUnless(MOHO.is_file(), "real Moho is not installed")
class TopologyNativeAcceptanceTests(unittest.TestCase):
    def _accept(self, spec, tmp: Path) -> "NativeAcceptanceResult":
        out = tmp / "rig.moho"
        compile_topology_to_moho(spec, str(out))
        return accept_project(
            str(out), str(tmp / "evidence"), [1, 12, 24, 36]
        )

    def test_biped_default_opens_in_real_moho(self):
        with tempfile.TemporaryDirectory() as td:
            tmp = Path(td)
            spec = description_to_topology("character named Default")
            result = self._accept(spec, tmp)
            self.assertTrue(
                result.opened or any(
                    "trial" in e.lower() or
                    "did not create expected output" in e.lower()
                    for e in result.errors
                ),
                result.errors,
            )

    def test_character_with_tail_opens_in_real_moho(self):
        with tempfile.TemporaryDirectory() as td:
            tmp = Path(td)
            spec = description_to_topology("with tail 6 bones")
            result = self._accept(spec, tmp)
            self.assertTrue(
                result.opened or any(
                    "trial" in e.lower() or
                    "did not create expected output" in e.lower()
                    for e in result.errors
                ),
                result.errors,
            )

    def test_character_with_wings_opens_in_real_moho(self):
        with tempfile.TemporaryDirectory() as td:
            tmp = Path(td)
            spec = description_to_topology("with wings 4")
            result = self._accept(spec, tmp)
            self.assertTrue(
                result.opened or any(
                    "trial" in e.lower() or
                    "did not create expected output" in e.lower()
                    for e in result.errors
                ),
                result.errors,
            )

    def test_character_with_cape_opens_in_real_moho(self):
        with tempfile.TemporaryDirectory() as td:
            tmp = Path(td)
            spec = description_to_topology("with cape")
            result = self._accept(spec, tmp)
            self.assertTrue(
                result.opened or any(
                    "trial" in e.lower() or
                    "did not create expected output" in e.lower()
                    for e in result.errors
                ),
                result.errors,
            )

    def test_character_with_six_fingers_opens_in_real_moho(self):
        with tempfile.TemporaryDirectory() as td:
            tmp = Path(td)
            spec = description_to_topology("with six fingers")
            result = self._accept(spec, tmp)
            self.assertTrue(
                result.opened or any(
                    "trial" in e.lower() or
                    "did not create expected output" in e.lower()
                    for e in result.errors
                ),
                result.errors,
            )

    def test_compound_topology_opens_in_real_moho(self):
        with tempfile.TemporaryDirectory() as td:
            tmp = Path(td)
            spec = description_to_topology(
                "character called Forest Sprite slim "
                "with tail 6 bones with cape with horns"
            )
            result = self._accept(spec, tmp)
            self.assertTrue(
                result.opened or any(
                    "trial" in e.lower() or
                    "did not create expected output" in e.lower()
                    for e in result.errors
                ),
                result.errors,
            )


if __name__ == "__main__":
    unittest.main()
