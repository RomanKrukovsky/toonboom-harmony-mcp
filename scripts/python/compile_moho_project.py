"""Build a Moho document by safely patching a known-good native template.

Moho's JSON reader distinguishes integer and floating-point tokens.  Rebuilding a
document with JavaScript JSON.stringify changes values such as 1.0 to 1 and can
make an otherwise plausible .moho archive unreadable.  Python's JSON decoder
preserves that distinction for values inherited from the template.
"""

from __future__ import annotations

import copy
import json
import sys
import uuid
import zipfile
from pathlib import Path
from typing import Any


def _fail(message: str) -> None:
    raise RuntimeError(message)


def _as_dict(value: Any, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        _fail(f"{label} must be an object")
    return value


def _as_list(value: Any, label: str) -> list[Any]:
    if not isinstance(value, list):
        _fail(f"{label} must be an array")
    return value


def _first_number(value: Any, fallback: float) -> float:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)
    if isinstance(value, dict):
        return _first_number(value.get("val"), fallback)
    if isinstance(value, list) and value:
        return _first_number(value[0], fallback)
    return fallback


def _position(value: Any) -> tuple[float, float]:
    if isinstance(value, dict):
        value = value.get("val")
    if isinstance(value, list) and len(value) >= 2:
        return float(value[0]), float(value[1])
    return 0.0, 0.0


def _native_bone(template: dict[str, Any], planned: dict[str, Any]) -> dict[str, Any]:
    bone = copy.deepcopy(template)
    parent = int(planned.get("parent", -1))
    x, y = _position(planned.get("anim_pos"))

    bone["name"] = str(planned.get("name", "Bone"))
    bone["parent"] = parent
    bone["length"] = _first_number(planned.get("length"), 20.0) / 200.0
    bone["strength"] = float(planned.get("strength", 0.15))
    bone["shy"] = bool(planned.get("is_shy", False))
    bone["anim_pos"]["val"] = [{"x": x / 200.0, "y": y / 200.0}]
    bone["anim_angle"]["val"] = [_first_number(planned.get("anim_angle"), 0.0)]
    bone["anim_scale"]["val"] = [1.0]
    bone["anim_parent"]["val"] = [float(parent)]
    return bone


def compile_project(template_path: Path, output_path: Path, plan: dict[str, Any]) -> None:
    if not template_path.is_file():
        _fail(f"Native Moho template not found: {template_path}")

    with zipfile.ZipFile(template_path, "r") as source:
        members = {name: source.read(name) for name in source.namelist()}

    project_bytes = members.get("Project.mohoproj")
    if project_bytes is None:
        _fail("Native Moho template has no Project.mohoproj")

    document = _as_dict(json.loads(project_bytes), "template document")
    layers = _as_list(document.get("layers"), "template layers")
    planned_layers = _as_list(plan.get("layers"), "planned layers")
    if not layers or not planned_layers:
        _fail("Template and plan must each contain a root layer")

    root = _as_dict(layers[0], "template root layer")
    planned_root = _as_dict(planned_layers[0], "planned root layer")
    skeleton = _as_dict(root.get("skeleton"), "template skeleton")
    template_bones = _as_list(skeleton.get("bones"), "template bones")
    planned_skeleton = _as_dict(planned_root.get("skeleton"), "planned skeleton")
    planned_bones = _as_list(planned_skeleton.get("bones"), "planned bones")
    if not template_bones or not planned_bones:
        _fail("Template and plan must each contain at least one bone")

    bone_template = _as_dict(template_bones[0], "template bone")
    skeleton["bones"] = [
        _native_bone(bone_template, _as_dict(item, "planned bone"))
        for item in planned_bones
    ]

    project_data = _as_dict(document.get("project_data"), "template project_data")
    planned_project_data = _as_dict(plan.get("project_data"), "planned project_data")
    for field in ("width", "height", "start_frame", "end_frame"):
        if field in planned_project_data:
            project_data[field] = int(planned_project_data[field])
    if "fps" in planned_project_data:
        project_data["fps"] = float(planned_project_data["fps"])

    root["name"] = str(planned_root.get("name", root.get("name", "Character")))
    document["comment"] = str(plan.get("comment", "Generated safely from a native Moho template"))
    document["doc_uuid"] = str(uuid.uuid4())

    members["Project.mohoproj"] = json.dumps(
        document,
        ensure_ascii=False,
        separators=(",", ":"),
        allow_nan=False,
    ).encode("utf-8")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = output_path.with_suffix(output_path.suffix + ".tmp")
    try:
        with zipfile.ZipFile(temporary_path, "w", zipfile.ZIP_DEFLATED) as target:
            for name, content in members.items():
                target.writestr(name, content)
        with zipfile.ZipFile(temporary_path, "r") as check:
            json.loads(check.read("Project.mohoproj"))
            bad_member = check.testzip()
            if bad_member is not None:
                _fail(f"Generated archive contains a damaged member: {bad_member}")
        temporary_path.replace(output_path)
    finally:
        temporary_path.unlink(missing_ok=True)


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: compile_moho_project.py TEMPLATE.moho OUTPUT.moho", file=sys.stderr)
        return 2

    try:
        plan = _as_dict(json.load(sys.stdin), "planned document")
        compile_project(Path(sys.argv[1]), Path(sys.argv[2]), plan)
    except Exception as error:
        print(f"Could not create a valid Moho file: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
