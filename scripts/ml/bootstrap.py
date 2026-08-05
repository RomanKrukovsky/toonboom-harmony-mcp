"""Create or repair the per-stack Python environments from the committed lock files.

Never installs into the system Python. Every stack gets its own virtualenv, because the stacks
genuinely conflict (SAM 2 and ToonCrafter want different torch builds; MMPose brings an mmcv
matrix nothing else tolerates).

    python scripts/ml/bootstrap.py --list
    python scripts/ml/bootstrap.py --stack pose            # create .venv-pose and install
    python scripts/ml/bootstrap.py --stack pose --dry-run  # show the commands only
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path
from typing import List

import _bootstrap  # noqa: F401
from _bootstrap import PROJECT_ROOT

LOCK_DIR = PROJECT_ROOT / "services" / "ml-runtime" / "requirements"

STACKS = {
    "pose": "requirements-pose.lock",
    "segmentation": "requirements-segmentation.lock",
    "tracking": "requirements-tracking.lock",
    "speech": "requirements-speech.lock",
    "face": "requirements-face.lock",
    "inbetween": "requirements-inbetween.lock",
    "motion-reference": "requirements-motion-reference.lock",
    "colorization": "requirements-colorization.lock",
    "vlm": "requirements-vlm.lock",
}


def venv_dir(stack: str) -> Path:
    return PROJECT_ROOT / f".venv-{stack}"


def venv_python(stack: str) -> Path:
    directory = venv_dir(stack)
    return directory / ("Scripts/python.exe" if sys.platform == "win32" else "bin/python")


def in_virtualenv() -> bool:
    return sys.prefix != getattr(sys, "base_prefix", sys.prefix)


def plan(stack: str) -> List[List[str]]:
    lock = LOCK_DIR / STACKS[stack]
    return [
        [sys.executable, "-m", "venv", str(venv_dir(stack))],
        [str(venv_python(stack)), "-m", "pip", "install", "--upgrade", "pip"],
        [str(venv_python(stack)), "-m", "pip", "install", "-r", str(lock)],
    ]


def cmd_list() -> int:
    print(f"{'STACK':<20} {'LOCK FILE':<40} STATE")
    for stack, lock in sorted(STACKS.items()):
        exists = venv_python(stack).exists()
        present = (LOCK_DIR / lock).is_file()
        state = "installed" if exists else ("lock present" if present else "LOCK MISSING")
        print(f"{stack:<20} {lock:<40} {state}")
    print(f"\nExisting shared environments: .venv-ml, .venv-ml-core, .venv-reconstruction")
    print("reconstruction-core stays on Python 3.9 and must not receive torch/diffusers/CUDA.")
    return 0


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(prog="bootstrap.py")
    parser.add_argument("--stack", choices=sorted(STACKS))
    parser.add_argument("--list", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    if args.list or not args.stack:
        return cmd_list()

    lock = LOCK_DIR / STACKS[args.stack]
    if not lock.is_file():
        print(f"lock file missing: {lock}")
        return 2

    steps = plan(args.stack)
    for step in steps:
        print("$ " + " ".join(step))
    if args.dry_run:
        return 0

    # Refuse to install into the interpreter that is running this script when that interpreter
    # is the system Python: a stray `pip install torch` there is exactly what must not happen.
    if not in_virtualenv() and sys.prefix == getattr(sys, "base_prefix", sys.prefix):
        print("\nnote: creating a dedicated virtualenv; nothing is installed into the system Python")

    for step in steps:
        result = subprocess.run(step, check=False)
        if result.returncode != 0:
            print(f"\nstep failed with exit {result.returncode}: {' '.join(step)}")
            return result.returncode

    print(f"\n{args.stack} stack ready at {venv_dir(args.stack)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
