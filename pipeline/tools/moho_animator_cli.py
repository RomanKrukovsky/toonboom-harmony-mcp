"""CLI for the Stage 2 Autonomous Moho Animator."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

from ..animator import AnimationPlanner, animate_and_certify


def main() -> None:
    parser = argparse.ArgumentParser(description="Autonomous Moho Animator CLI (Stage 2)")
    parser.add_argument("paths", nargs="*", help="[input_path] [output_path] OR [input_path] [plan_path] [output_path]")
    parser.add_argument("--input", dest="opt_input", help="Optional named input path")
    parser.add_argument("--output", dest="opt_output", help="Optional named output path")
    parser.add_argument("--plan", dest="opt_plan", help="Optional named plan path")
    parser.add_argument("--brief", default="", help="Text brief describing desired animation")
    parser.add_argument("--duration-seconds", type=float, default=0.0, help="Duration in seconds")
    parser.add_argument("--duration-frames", type=int, default=0, help="Duration in frames")
    parser.add_argument("--fps", type=int, default=24, help="Playback FPS")
    parser.add_argument("--motion-style", default="default", help="Motion style")
    parser.add_argument("--emotion", default="neutral", help="Base emotion")
    parser.add_argument("--dialogue", default="", help="Spoken dialogue text")
    parser.add_argument("--lyrics", default="", help="Song lyrics text")
    parser.add_argument("--language", default="en", help="Language code")
    parser.add_argument("--camera", default="static", help="Camera constraints")
    parser.add_argument("--evidence", default="", help="Evidence directory")

    args = parser.parse_args()

    input_path = args.opt_input or ""
    plan_path = args.opt_plan or ""
    output_path = args.opt_output or ""

    pos = args.paths or []
    if len(pos) == 1:
        if not input_path:
            input_path = pos[0]
    elif len(pos) == 2:
        if not input_path:
            input_path = pos[0]
        if not output_path:
            output_path = pos[1]
    elif len(pos) >= 3:
        if not input_path:
            input_path = pos[0]
        if not plan_path:
            plan_path = pos[1]
        if not output_path:
            output_path = pos[2]

    if not input_path:
        parser.error("input path is required")
    if not output_path:
        parser.error("output path is required")

    fps = args.fps or 24
    duration_frames = args.duration_frames
    if duration_frames <= 0:
        if args.duration_seconds > 0:
            duration_frames = int(round(args.duration_seconds * fps))
        else:
            duration_frames = 120

    evidence_dir = args.evidence or str(Path(output_path).resolve().parent / "evidence")
    Path(evidence_dir).mkdir(parents=True, exist_ok=True)

    plan: dict
    if plan_path and Path(plan_path).is_file():
        plan = json.loads(Path(plan_path).read_text(encoding="utf-8"))
    else:
        brief_text = args.brief or "Character walks, stops, blinks, and camera settles"
        plan = AnimationPlanner.plan_from_brief(
            brief=brief_text,
            duration_frames=duration_frames,
            fps=fps,
            emotion=args.emotion,
            motion_style=args.motion_style,
            dialogue=args.dialogue,
            lyrics=args.lyrics,
            language=args.language,
            camera_constraints=args.camera,
        )
        plan_evidence_file = Path(evidence_dir) / "animation_plan.json"
        plan_evidence_file.write_text(json.dumps(plan, indent=2, ensure_ascii=False), encoding="utf-8")

    result = animate_and_certify(input_path, plan, output_path, evidence_dir)
    result["animationPlan"] = plan
    print(json.dumps(result))


if __name__ == "__main__":
    main()
