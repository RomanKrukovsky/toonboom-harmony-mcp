"""Re-hash installed weights and refresh the per-machine local-state.json.

This never asserts a verification it did not perform: a file with no trusted digest in the
catalog is reported as `untrusted`, never as `verified`.

    python scripts/ml/verify_models.py [--model-id ID] [--json]
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List

import _bootstrap  # noqa: F401
from _bootstrap import CATALOG_PATH, LOCAL_STATE_PATH

from runtime.model_loader import MODEL_LOADER, model_cache_root  # noqa: E402


def verify(model_ids: List[str] | None) -> Dict[str, Any]:
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    rows: List[Dict[str, Any]] = []
    state: Dict[str, Any] = {}

    for model in catalog.get("models", []):
        if model_ids and model["modelId"] not in model_ids:
            continue
        verification = MODEL_LOADER.verify_weights(model["modelId"], model["cacheKey"], model.get("weightsFiles", []))
        status = (
            "ready" if verification.verified
            else "quarantined" if verification.untrusted and not verification.missing
            else "degraded" if verification.mismatched
            else "not_installed"
        )
        rows.append({
            "modelId": model["modelId"],
            "status": status,
            "verified": verification.verified,
            "missing": verification.missing,
            "mismatched": verification.mismatched,
            "untrusted": verification.untrusted,
            "measuredDigests": verification.measuredDigests,
            "blockingReason": verification.blockingReason,
        })
        state[model["modelId"]] = {
            "modelId": model["modelId"],
            "installed": verification.verified,
            "installedRevision": model["revision"] if verification.verified else None,
            "verifiedFiles": verification.measuredDigests,
            "importVerified": False,
            "inferenceVerified": False,
            "averageLatencyMs": None,
            "peakMemoryMb": None,
            "lastVerifiedAt": datetime.now(timezone.utc).isoformat(),
            "status": status,
        }
    return {"rows": rows, "state": state}


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(prog="verify_models.py")
    parser.add_argument("--model-id", action="append", dest="model_ids")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--no-write", action="store_true", help="do not update local-state.json")
    args = parser.parse_args(argv)

    result = verify(args.model_ids)

    if not args.no_write:
        payload = {
            "$comment": "PER-MACHINE state. Gitignored. Regenerate with `npm run ml:models:verify`.",
            "schemaVersion": "1.0",
            "modelCacheRoot": str(model_cache_root()),
            "models": result["state"],
        }
        LOCAL_STATE_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    if args.json:
        print(json.dumps(result["rows"], indent=2, ensure_ascii=False))
    else:
        for row in result["rows"]:
            mark = "OK  " if row["verified"] else "----"
            print(f"{mark} {row['modelId']:<28} {row['status']:<14} {row['blockingReason'] or ''}")
        verified = sum(1 for r in result["rows"] if r["verified"])
        print(f"\n{verified} of {len(result['rows'])} catalogued models are installed and hash-verified")

    # A mismatched digest is a hard failure: the file on disk is not the file the catalog pins.
    return 1 if any(r["mismatched"] for r in result["rows"]) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
