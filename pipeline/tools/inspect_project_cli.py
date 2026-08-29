"""CLI tool to inspect Moho project archives and metadata."""

from __future__ import annotations

import argparse
import json
import os
import sys
import zipfile
from pathlib import Path

from ..moho.extract import extract_from_file


def inspect_project(project_path: str) -> dict:
    proj_path = Path(project_path).resolve()
    if not proj_path.is_file():
        return {
            "status": "error",
            "message": f"Project file not found: {project_path}",
        }

    try:
        # Check ZIP structure
        is_zip = zipfile.is_zipfile(str(proj_path))
        entries = []
        if is_zip:
            with zipfile.ZipFile(str(proj_path), "r") as zf:
                entries = zf.namelist()

        rig = extract_from_file(str(proj_path))

        bones_info = [
            {
                "id": b.id,
                "parent": b.parent,
                "length": b.length,
                "angle": b.angle,
                "strength": b.strength,
                "is_dial": b.is_dial,
                "target_bone": b.target_bone,
            }
            for b in rig.bones
        ]

        parts_info = [
            {
                "id": p.id,
                "name": p.name,
                "type": p.type,
                "bone": p.bone,
                "children_count": len(p.children),
                "switch_states": p.switch_states,
            }
            for p in rig.walk_parts()
        ]

        return {
            "status": "success",
            "project_path": str(proj_path),
            "file_size_bytes": proj_path.stat().st_size,
            "is_valid_zip": is_zip,
            "zip_entries": entries,
            "name": rig.name,
            "source_program": rig.source_program,
            "source_version": rig.source_version,
            "bones_count": len(rig.bones),
            "parts_count": len(list(rig.walk_parts())),
            "bones": bones_info,
            "parts": parts_info,
        }
    except Exception as e:
        return {
            "status": "error",
            "project_path": str(proj_path),
            "message": f"Failed to parse project: {str(e)}",
        }


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect a Moho project file")
    parser.add_argument("project_path", help="Path to .moho project")
    args = parser.parse_args()

    result = inspect_project(args.project_path)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
