import os
import subprocess

import pytest


REQUIRED_ENV = (
    "HARMONY_INTEGRATION_SCENE",
    "HARMONY_INTEGRATION_MANIFEST",
    "HARMONY_INTEGRATION_OUTPUT",
    "HARMONY_PYTHON_PACKAGES",
)


@pytest.mark.skipif(
    not all(os.environ.get(key) for key in REQUIRED_ENV),
    reason="Требуются HARMONY_INTEGRATION_SCENE, HARMONY_INTEGRATION_MANIFEST, HARMONY_INTEGRATION_OUTPUT и HARMONY_PYTHON_PACKAGES",
)
@pytest.mark.integration
def test_manifest_creates_reopens_and_renders_native_harmony_scene():
    completed = subprocess.run(
        ["npm", "run", "test:harmony-integration"],
        capture_output=True,
        text=True,
        timeout=900,
        check=False,
    )
    assert completed.returncode == 0, completed.stderr + "\nSTDOUT:\n" + completed.stdout
    assert '"realSceneCreated": true' in completed.stdout
    assert '"editableNativeDrawings": true' in completed.stdout
    assert '"previewPaths"' in completed.stdout
    assert '"renderComparison"' in completed.stdout
