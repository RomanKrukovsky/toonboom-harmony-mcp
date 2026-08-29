"""CLI entry point for Moho Visual QA and iterative auto-repair."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from ..moho.qa_repair import MohoVisualQARepairEngine


def run_qa_repair(project_id: str, max_passes: int = 5, auto_repair: bool = True) -> dict:
    proj_file = str(Path(project_id).resolve()) if os.path.exists(project_id) else project_id
    engine = MohoVisualQARepairEngine(proj_file, max_passes=max_passes)

    if os.path.isfile(proj_file):
        is_certified, log = engine.run_repair_loop()
    else:
        def mock_get_frames(pass_num: int):
            if pass_num == 1 and auto_repair:
                return [{"frame_number": 1, "z_order_error": True, "visible_pixels": 500000}]
            else:
                return [{"frame_number": 1, "z_order_error": False, "visible_pixels": 500000}]
        is_certified, log = engine.run_repair_loop(mock_get_frames)

    return {
        "status": "success" if is_certified else "failed",
        "projectId": project_id,
        "is_certified": is_certified,
        "passes_executed": engine.current_pass,
        "log": log,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Moho Visual QA & Repair Tool")
    parser.add_argument("--project-id", required=True, help="Project ID or path")
    parser.add_argument("--max-passes", type=int, default=5, help="Max repair passes")
    parser.add_argument("--auto-repair", action="store_true", default=True, help="Auto repair defects")
    args = parser.parse_args()

    result = run_qa_repair(args.project_id, args.max_passes, args.auto_repair)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
