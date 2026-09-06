"""Apply an animation plan and certify the result in native Moho.

Maintains backwards compatibility while delegating to pipeline.animator.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from .moho_native_acceptance import accept_project
from ..animator import engine as _engine
from ..animator.engine import (
    INTERP_SMOOTH,
    INTERP_STEP,
    _dial_value,
    _require_bones,
    _same_rig_structure,
    _set_animated_value,
    add_angle_keyframes,
    add_pos_keyframes,
    add_switch_keyframes,
    apply_animation_plan,
    find_bone,
    find_switch,
)


def animate_and_certify(
    project_path: str,
    plan: dict[str, Any],
    output_path: str,
    evidence_dir: str,
) -> dict[str, Any]:
    # Respect any monkey-patching of accept_project on this module (e.g. in tests)
    orig_accept = _engine.accept_project
    _engine.accept_project = globals().get("accept_project", orig_accept)
    try:
        return _engine.animate_and_certify(project_path, plan, output_path, evidence_dir)
    finally:
        _engine.accept_project = orig_accept


def main() -> None:
    parser = argparse.ArgumentParser(description="Animate and certify a Moho project")
    parser.add_argument("input_path")
    parser.add_argument("plan_path")
    parser.add_argument("output_path")
    parser.add_argument("--evidence", default="")
    args = parser.parse_args()
    plan = json.loads(Path(args.plan_path).read_text(encoding="utf-8"))
    evidence = args.evidence or str(Path(args.output_path).resolve().parent / "evidence")
    result = animate_and_certify(args.input_path, plan, args.output_path, evidence)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
