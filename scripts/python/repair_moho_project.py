"""Inspect or safely repair a native .moho archive without changing number types."""

from __future__ import annotations

import json
import sys
import zipfile
from pathlib import Path
from typing import Any


def _read_archive(moho_path: Path) -> tuple[dict[str, bytes], dict[str, Any]]:
    with zipfile.ZipFile(moho_path, "r") as archive:
        members = {name: archive.read(name) for name in archive.namelist()}
    project_bytes = members.get("Project.mohoproj")
    if project_bytes is None:
        raise RuntimeError("archive has no Project.mohoproj")
    document = json.loads(project_bytes)
    if not isinstance(document, dict):
        raise RuntimeError("Project.mohoproj is not an object")
    return members, document


def _repair(document: dict[str, Any]) -> int:
    fixes = 0
    layers = document.get("layers", [])
    if not isinstance(layers, list):
        raise RuntimeError("document layers are not an array")

    for layer in layers:
        if not isinstance(layer, dict):
            continue
        skeleton = layer.get("skeleton")
        bones = skeleton.get("bones", []) if isinstance(skeleton, dict) else []
        if not isinstance(bones, list):
            continue

        for bone in bones:
            if not isinstance(bone, dict):
                continue
            name = str(bone.get("name", ""))
            lower_name = name.lower()
            is_pin = bool(bone.get("is_pin_bone", False))
            is_controller = any(
                marker in lower_name
                for marker in ("ctrl", "dial", "target", "knob", "master")
            ) or is_pin

            strength = bone.get("strength", 0.0)
            if is_controller and isinstance(strength, (int, float)) and strength > 0:
                bone["strength"] = 0.0
                fixes += 1

            is_helper = any(marker in name for marker in ("_UP", "_DOWN", "Helper", "Frame_"))
            if is_helper and not bool(bone.get("shy", False)):
                bone["shy"] = True
                fixes += 1

            if "tag_color" in bone:
                expected_color = 3 if name.endswith("_L") else 5 if name.endswith("_R") else None
                if expected_color is not None and bone.get("tag_color") != expected_color:
                    bone["tag_color"] = expected_color
                    fixes += 1

    return fixes


def _write_archive(moho_path: Path, members: dict[str, bytes], document: dict[str, Any]) -> None:
    members["Project.mohoproj"] = json.dumps(
        document,
        ensure_ascii=False,
        separators=(",", ":"),
        allow_nan=False,
    ).encode("utf-8")
    temporary_path = moho_path.with_suffix(moho_path.suffix + ".repairing")
    try:
        with zipfile.ZipFile(temporary_path, "w", zipfile.ZIP_DEFLATED) as target:
            for name, content in members.items():
                target.writestr(name, content)
        with zipfile.ZipFile(temporary_path, "r") as check:
            json.loads(check.read("Project.mohoproj"))
            bad_member = check.testzip()
            if bad_member is not None:
                raise RuntimeError(f"repaired archive contains a damaged member: {bad_member}")
        temporary_path.replace(moho_path)
    finally:
        temporary_path.unlink(missing_ok=True)


def main() -> int:
    if len(sys.argv) != 3 or sys.argv[2] not in {"inspect", "repair"}:
        print("usage: repair_moho_project.py PROJECT.moho inspect|repair", file=sys.stderr)
        return 2

    try:
        moho_path = Path(sys.argv[1])
        members, document = _read_archive(moho_path)
        if sys.argv[2] == "inspect":
            print(json.dumps(document, ensure_ascii=False, separators=(",", ":")))
        else:
            fixes = _repair(document)
            if fixes > 0:
                _write_archive(moho_path, members, document)
            print(json.dumps({"fixes": fixes}))
    except Exception as error:
        print(f"Could not process Moho file: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
