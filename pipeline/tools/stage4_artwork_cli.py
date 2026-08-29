"""CLI entry point for Stage 4 PSD import, artwork compiling and batch production."""

from __future__ import annotations

import argparse
import json

from ..stage4_batch_artwork import BatchProducer, PSDParser, RigCompiler


def main() -> None:
    parser = argparse.ArgumentParser(description="Stage 4 Artwork & Batch CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # inspect_psd
    p_inspect = subparsers.add_parser("inspect_psd")
    p_inspect.add_argument("--file", required=True, help="Path to PSD file")

    # import_psd
    p_import = subparsers.add_parser("import_psd")
    p_import.add_argument("--file", required=True, help="Path to PSD file")
    p_import.add_argument("--options", default="{}", help="JSON options")

    # relink
    p_relink = subparsers.add_parser("relink")
    p_relink.add_argument("--project", required=True, help="Path to .moho project")
    p_relink.add_argument("--assets", nargs="+", required=True, help="List of asset paths")

    # compile_from_artwork
    p_compile = subparsers.add_parser("compile_from_artwork")
    p_compile.add_argument("--psd-data", default="{}", help="JSON psd data")
    p_compile.add_argument("--body-plan", default="adult_neutral", help="Body plan")
    p_compile.add_argument("--body-params", default="{}", help="JSON body params")
    p_compile.add_argument("--output", required=True, help="Certified output .moho path")

    # batch_produce
    p_batch = subparsers.add_parser("batch_produce")
    p_batch.add_argument("--specs", required=True, help="JSON array of specs")
    p_batch.add_argument("--concurrency", type=int, default=4, help="Concurrency limit")

    args = parser.parse_args()

    if args.command == "inspect_psd":
        res = PSDParser.inspect_psd(args.file)
    elif args.command == "import_psd":
        options = json.loads(args.options)
        res = PSDParser.import_psd_character(args.file, options)
    elif args.command == "relink":
        res = PSDParser.relink(args.project, args.assets)
    elif args.command == "compile_from_artwork":
        psd_data = json.loads(args.psd_data)
        body_params = json.loads(args.body_params)
        res = RigCompiler.compile_from_artwork(
            psd_data, args.body_plan, body_params, args.output,
        )
    elif args.command == "batch_produce":
        specs = json.loads(args.specs)
        res = BatchProducer.batch_produce(specs, args.concurrency)
    else:
        res = {"error": f"Unknown command {args.command}"}

    print(json.dumps(res, indent=2))


if __name__ == "__main__":
    main()
