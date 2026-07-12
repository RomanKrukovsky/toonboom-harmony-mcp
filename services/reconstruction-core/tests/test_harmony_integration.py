import os
import json
import subprocess
import sys
from pathlib import Path

import pytest


@pytest.mark.skipif(
    not all(os.environ.get(key) for key in ("HARMONY_INTEGRATION_SCENE", "HARMONY_INTEGRATION_MANIFEST", "HARMONY_PYTHON_PACKAGES")),
    reason="Требуются HARMONY_INTEGRATION_SCENE, HARMONY_INTEGRATION_MANIFEST и HARMONY_PYTHON_PACKAGES",
)
@pytest.mark.integration
def test_manifest_creates_native_harmony_entities():
    # Проверяем доступность и работоспособность лицензии Toon Boom Harmony
    packages_path = os.environ["HARMONY_PYTHON_PACKAGES"]
    if packages_path not in sys.path:
        sys.path.insert(0, packages_path)
    try:
        from ToonBoom import harmony
        try:
            # Вызов session() бросит RuntimeError("Harmony is not currently running") при валидной лицензии,
            # но бросит исключение о лицензии (например, "Invalid license"), если лицензия отсутствует/невалидна.
            harmony.session()
        except Exception as e:
            err_msg = str(e).lower()
            if "license" in err_msg or "licensing" in err_msg or "certificate" in err_msg:
                pytest.skip(f"Пропуск теста: Лицензия Toon Boom Harmony отсутствует или неактивна ({e})")
    except ImportError as e:
        pytest.skip(f"Пропуск теста: Не удалось импортировать ToonBoom.harmony ({e})")

    scene = Path(os.environ["HARMONY_INTEGRATION_SCENE"])
    manifest_path = Path(os.environ["HARMONY_INTEGRATION_MANIFEST"])
    bridge = Path(__file__).resolve().parents[3] / "scripts" / "python" / "harmony_bridge.py"
    payload = {
        "command": "apply_reconstruction_manifest",
        "pythonPackages": os.environ["HARMONY_PYTHON_PACKAGES"],
        "args": {"projectPath": str(scene), "manifest": json.loads(manifest_path.read_text())},
    }
    env = dict(os.environ)
    if sys.platform == "darwin":
        harmony_lib = "/Applications/Harmony 25 Premium.app/Contents/tba/macosx/lib"
        framework_paths = [
            harmony_lib,
            "/opt/homebrew/opt/python@3.9/Frameworks",
            "/opt/homebrew/Frameworks",
            "/Library/Frameworks",
        ]
        existing_fw = env.get("DYLD_FRAMEWORK_PATH", "")
        env["DYLD_FRAMEWORK_PATH"] = (existing_fw + ":" if existing_fw else "") + ":".join(p for p in framework_paths if os.path.exists(p))
        existing_lib = env.get("DYLD_LIBRARY_PATH", "")
        env["DYLD_LIBRARY_PATH"] = (existing_lib + ":" if existing_lib else "") + harmony_lib

    completed = subprocess.run(
        [sys.executable, str(bridge)], input=json.dumps(payload), capture_output=True, text=True, timeout=180, check=False, env=env
    )
    assert completed.returncode == 0, completed.stderr + "\nSTDOUT:\n" + completed.stdout
    result = json.loads(completed.stdout)
    assert result["status"] == "success"
    assert result["saved"] is True
    assert result["nativeAudit"]["vectorType"] == "TVG"
    assert result["nativeAudit"]["drawingCount"] > 0
    assert result["nativeAudit"]["nonemptyDrawingCount"] == result["nativeAudit"]["drawingCount"]
