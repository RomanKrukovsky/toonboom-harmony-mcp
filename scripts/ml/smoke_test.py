"""Real-model smoke test through the V2 job path.

This does not mock anything. It builds a real `MlJobRequestV2`, runs it through the same
`ProviderRegistry` / `JobManager` the HTTP endpoint uses, and writes a full evidence directory.

When a model's weights are absent the run produces a **blocked report**, not a fabricated
output: `evidence/blocked-report.json` states which files were missing and why, and the exit
code is non-zero. There is no code path here that writes a placeholder image captioned
"model output".

    python scripts/ml/smoke_test.py --provider dwpose --input fixtures/character.png
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import platform
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

import _bootstrap  # noqa: F401
from _bootstrap import PROJECT_ROOT

from runtime.artifact_store import ArtifactStore  # noqa: E402
from runtime.hardware_probe import probe as probe_hardware  # noqa: E402
from runtime.job_manager import JobManager  # noqa: E402
from runtime.provider_registry import build_default_registry  # noqa: E402

EVIDENCE_ROOT = PROJECT_ROOT / "output" / "evidence" / "ml"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def run(provider_id: str, inputs: List[Path], parameters: Dict[str, Any], run_id: str) -> int:
    registry = build_default_registry()
    if not registry.has(provider_id):
        print(f"provider {provider_id!r} is not registered. Known: {registry.provider_ids()}")
        return 2

    store = ArtifactStore()
    jobs = JobManager(registry, store)
    descriptor = registry.descriptor(provider_id)
    evidence_dir = EVIDENCE_ROOT / run_id / provider_id
    evidence_dir.mkdir(parents=True, exist_ok=True)

    # Copy the inputs into the store so the job receives verified artifact references rather
    # than raw filesystem strings.
    references = []
    for index, source in enumerate(inputs):
        if not source.is_file():
            print(f"input not found: {source}")
            return 2
        data = source.read_bytes()
        references.append(store.put_bytes(
            "ml-jobs", f"{run_id}/inputs/{index:03d}_{source.name}", data,
            "input_image", "image/png" if source.suffix.lower() == ".png" else None,
        ).to_dict())

    job_id = f"job_{uuid.uuid4()}"
    request = {
        "schemaVersion": "2.0",
        "jobId": job_id,
        "correlationId": run_id,
        "idempotencyKey": f"smoke_{sha256_bytes(json.dumps({'p': provider_id, 'i': [r['sha256'] for r in references], 'k': parameters}, sort_keys=True).encode())[:32]}",
        "taskType": descriptor.taskTypes[0],
        "providerId": provider_id,
        "modelId": descriptor.modelId,
        "modelRevision": descriptor.modelRevision,
        "executionMode": "real_ml",
        "commercialMode": "preview",
        "inputArtifacts": references,
        "parameters": parameters,
        "timeoutMs": 600_000,
        "seed": None,
        "requestedDevice": "auto",
    }

    readiness = registry.readiness(provider_id)
    (evidence_dir / "request.json").write_text(json.dumps(request, indent=2), encoding="utf-8")
    (evidence_dir / "input-manifest.json").write_text(json.dumps({"inputs": references}, indent=2), encoding="utf-8")
    (evidence_dir / "license-decision.json").write_text(
        json.dumps(registry.license_guard.evaluate(descriptor.modelId, use="preview").to_dict(), indent=2), encoding="utf-8")

    if not readiness["ready"]:
        blocked = {
            "runId": run_id,
            "providerId": provider_id,
            "modelId": descriptor.modelId,
            "status": "blocked",
            "realInferenceExecuted": False,
            "blockingReason": readiness["blockingReason"],
            "readiness": readiness,
            "host": probe_hardware().to_dict(),
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "note": "No inference ran. No output artifact was fabricated to stand in for one.",
        }
        (evidence_dir / "blocked-report.json").write_text(json.dumps(blocked, indent=2), encoding="utf-8")
        _write_hashes(evidence_dir)
        print(f"BLOCKED: {readiness['blockingReason']}")
        print(f"evidence: {evidence_dir}")
        return 3

    result = asyncio.run(jobs.submit(request))

    (evidence_dir / "execution-report.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    if result.get("provenance"):
        (evidence_dir / "provenance.json").write_text(json.dumps(result["provenance"], indent=2), encoding="utf-8")
    if result.get("normalizedPir"):
        (evidence_dir / "normalized-pir.json").write_text(json.dumps(result["normalizedPir"], indent=2), encoding="utf-8")
    (evidence_dir / "artifact-manifest.json").write_text(
        json.dumps({"artifacts": result.get("outputArtifacts", [])}, indent=2), encoding="utf-8")

    # Copy the raw output and the visual overlay next to the report so evidence is self-contained.
    for artifact in result.get("outputArtifacts", []):
        source = store.resolve("ml-jobs", artifact["relativePath"])
        if source.is_file() and source.stat().st_size < 32 * 1024 * 1024:
            (evidence_dir / Path(artifact["relativePath"]).name).write_bytes(source.read_bytes())

    verification = {
        "runId": run_id,
        "providerId": provider_id,
        "modelId": descriptor.modelId,
        "modelRevision": descriptor.modelRevision,
        "status": result["status"],
        "realInferenceExecuted": bool((result.get("provenance") or {}).get("realInferenceExecuted")),
        "weightsSha256": (result.get("provenance") or {}).get("weightsSha256", []),
        "device": (result.get("provenance") or {}).get("device"),
        "durationMs": (result.get("provenance") or {}).get("durationMs"),
        "host": probe_hardware().to_dict(),
        "python": platform.python_version(),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }
    (evidence_dir / "verification-report.json").write_text(json.dumps(verification, indent=2), encoding="utf-8")
    _write_hashes(evidence_dir)

    print(f"status: {result['status']}")
    print(f"realInferenceExecuted: {verification['realInferenceExecuted']}")
    print(f"weights: {verification['weightsSha256']}")
    print(f"evidence: {evidence_dir}")
    return 0 if result["status"] == "succeeded" else 1


def _write_hashes(directory: Path) -> None:
    lines = []
    for file in sorted(directory.rglob("*")):
        if file.is_file() and file.name != "sha256sums.txt":
            lines.append(f"{sha256_bytes(file.read_bytes())}  {file.relative_to(directory)}")
    (directory / "sha256sums.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(prog="smoke_test.py")
    parser.add_argument("--provider", required=True)
    parser.add_argument("--input", action="append", required=True, dest="inputs")
    parser.add_argument("--run-id", default=None)
    parser.add_argument("--param", action="append", default=[], help="key=value, repeated")
    args = parser.parse_args(argv)

    parameters: Dict[str, Any] = {}
    for pair in args.param:
        key, _, value = pair.partition("=")
        try:
            parameters[key] = json.loads(value)
        except json.JSONDecodeError:
            parameters[key] = value

    run_id = args.run_id or datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    inputs = [Path(p) if Path(p).is_absolute() else PROJECT_ROOT / p for p in args.inputs]
    return run(args.provider, inputs, parameters, run_id)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
