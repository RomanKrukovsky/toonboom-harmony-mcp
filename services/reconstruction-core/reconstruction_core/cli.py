from __future__ import annotations

import argparse
import json

import uvicorn

from .api import pipeline
from .models import ReconstructionRequest


def main() -> None:
    parser = argparse.ArgumentParser(description="Harmony reconstruction core")
    subparsers = parser.add_subparsers(dest="command", required=True)
    serve = subparsers.add_parser("serve")
    serve.add_argument("--host", default="127.0.0.1")
    serve.add_argument("--port", default=8765, type=int)
    for name in ("analyze", "reconstruct"):
        command = subparsers.add_parser(name)
        command.add_argument("video_path")
        command.add_argument("--max-colors", type=int, default=12)
        command.add_argument("--dedup-threshold", type=float, default=0.035)
        command.add_argument("--target-fps", type=float)
    args = parser.parse_args()
    if args.command == "serve":
        uvicorn.run("reconstruction_core.api:app", host=args.host, port=args.port)
        return
    request = ReconstructionRequest(
        videoPath=args.video_path, maxColors=args.max_colors,
        dedupThreshold=args.dedup_threshold, targetFps=args.target_fps,
    )
    result = pipeline.analyze(request) if args.command == "analyze" else pipeline.reconstruct(request)
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
