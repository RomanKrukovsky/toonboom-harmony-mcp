"""Validate and inspect the model catalog.

Usage:
    python scripts/ml/catalog.py validate
    python scripts/ml/catalog.py list [--task pose_estimation] [--json]

`validate` is a gate, not a report: it exits non-zero when the catalog contains a duplicate id,
a colliding cache key, an absolute path, a digest that cannot be a real SHA-256, or a maturity
claim that the evidence does not support.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

import _bootstrap  # noqa: F401  (side effect: sys.path)
from _bootstrap import CATALOG_PATH, CATALOG_SCHEMA_PATH

SCHEMA_VERSION = "2.0"
SHA256_RE = re.compile(r"^[a-f0-9]{64}$")
CACHE_KEY_RE = re.compile(r"^[a-z0-9][a-z0-9._\-]*(/[a-z0-9][a-z0-9._\-]*)*$")


def looks_fabricated(digest: str) -> bool:
    """A 3-4 nibble group repeated four or more times is not plausible SHA-256 output.

    Both digests removed from the old registry matched this: `...cf8cf8cf8cf8...` and
    `...9241924192419241`.
    """
    if re.search(r"(.{3,4})\1{3,}", digest):
        return True
    return len(set(digest)) <= 6


def load_catalog(path: Path = CATALOG_PATH) -> Dict[str, Any]:
    if not path.is_file():
        raise SystemExit(f"catalog not found at {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def validate(catalog: Dict[str, Any]) -> Tuple[List[str], List[str]]:
    errors: List[str] = []
    warnings: List[str] = []

    if catalog.get("schemaVersion") != SCHEMA_VERSION:
        errors.append(f"schemaVersion is {catalog.get('schemaVersion')!r}, expected {SCHEMA_VERSION!r}")

    seen_ids: Dict[str, int] = {}
    cache_keys: Dict[str, str] = {}

    for index, model in enumerate(catalog.get("models", [])):
        model_id = model.get("modelId", f"<index {index}>")

        if model_id in seen_ids:
            errors.append(f"{model_id}: duplicate modelId")
        seen_ids[model_id] = index

        cache_key = model.get("cacheKey", "")
        if not CACHE_KEY_RE.match(cache_key):
            errors.append(f"{model_id}: cacheKey {cache_key!r} is not a logical relative key")
        if cache_key.startswith("/") or re.match(r"^[A-Za-z]:[\\/]", cache_key):
            errors.append(f"{model_id}: cacheKey is an absolute path")
        if cache_key in cache_keys and cache_keys[cache_key] != model_id:
            errors.append(f"{model_id}: cacheKey {cache_key!r} collides with {cache_keys[cache_key]}")
        cache_keys[cache_key] = model_id

        serialised = json.dumps(model)
        if "/Users/" in serialised or "C:\\Users" in serialised:
            errors.append(f"{model_id}: entry embeds a machine-specific user path")

        weights = model.get("weightsFiles", [])
        for spec in weights:
            name = spec.get("fileName", "<unnamed>")
            if "/" in name or "\\" in name:
                errors.append(f"{model_id}/{name}: fileName must not contain a path separator")
            digest = spec.get("sha256")
            if digest is not None:
                if not SHA256_RE.match(digest):
                    errors.append(f"{model_id}/{name}: sha256 is not 64 lowercase hex characters")
                elif looks_fabricated(digest):
                    errors.append(f"{model_id}/{name}: sha256 {digest} contains a repeating pattern and cannot be a real digest")
            elif not spec.get("requiresQuarantineReview", False):
                errors.append(f"{model_id}/{name}: no digest but quarantine review is not required")

        if model.get("maturity") == "real_model_verified" and not any(s.get("sha256") for s in weights):
            errors.append(f"{model_id}: claims real_model_verified with no trusted weights digest")

        runtime = model.get("runtime", {})
        if runtime.get("trustRemoteCode") is not False:
            errors.append(f"{model_id}: runtime.trustRemoteCode must be false")

        license_record = model.get("license", {})
        status = license_record.get("status", "unknown")
        if status in {"production_allowed", "production_allowed_with_attribution"} and not license_record.get("verifiedBy"):
            errors.append(f"{model_id}: status {status} requires a signed verifiedBy")
        if status == "unknown":
            warnings.append(f"{model_id}: licence status unknown; commercial builds will refuse it")
        if status == "legal_review_required":
            warnings.append(f"{model_id}: licence awaiting review; blocked in commercial mode")
        if model.get("upstreamCommit") is None and runtime.get("kind") != "not_integrated":
            warnings.append(f"{model_id}: upstreamCommit is null; the integration is not reproducibly pinned")

    return errors, warnings


def cmd_validate(args: argparse.Namespace) -> int:
    catalog = load_catalog()
    errors, warnings = validate(catalog)

    if CATALOG_SCHEMA_PATH.is_file():
        try:
            import jsonschema  # type: ignore

            jsonschema.validate(catalog, json.loads(CATALOG_SCHEMA_PATH.read_text(encoding="utf-8")))
            print("json-schema: OK")
        except ImportError:
            warnings.append("jsonschema is not installed; only semantic validation ran")
        except Exception as exc:  # noqa: BLE001 - reported with its cause
            errors.append(f"json-schema: {exc}")

    for warning in warnings:
        print(f"WARN  {warning}")
    for error in errors:
        print(f"ERROR {error}")

    print(f"\n{len(catalog.get('models', []))} models, {len(errors)} error(s), {len(warnings)} warning(s)")
    return 1 if errors else 0


def cmd_list(args: argparse.Namespace) -> int:
    catalog = load_catalog()
    models = catalog.get("models", [])
    if args.task:
        models = [m for m in models if args.task in m.get("taskTypes", [])]

    if args.json:
        print(json.dumps(models, indent=2, ensure_ascii=False))
        return 0

    width = max((len(m["modelId"]) for m in models), default=10)
    print(f"{'MODEL':<{width}}  {'MATURITY':<20} {'LICENCE':<28} TASKS")
    for model in sorted(models, key=lambda m: m["modelId"]):
        print(f"{model['modelId']:<{width}}  {model['maturity']:<20} "
              f"{model['license']['status']:<28} {','.join(model['taskTypes'])}")
    print(f"\n{len(models)} model(s)")
    return 0


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(prog="catalog.py", description="Harmony ML model catalog tool")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("validate", help="fail on structural or semantic catalog problems")

    lister = sub.add_parser("list", help="list catalogued models")
    lister.add_argument("--task", help="filter by task type")
    lister.add_argument("--json", action="store_true", help="emit raw JSON")

    args = parser.parse_args(argv)
    return {"validate": cmd_validate, "list": cmd_list}[args.command](args)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
