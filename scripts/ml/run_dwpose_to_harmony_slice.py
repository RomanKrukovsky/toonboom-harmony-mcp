#!/usr/bin/env python
"""Real DWPose inference -> PoseSequenceV2 -> HarmonyCommandPlanV5 vertical slice.

This is the only test that proves the repo actually moves a real measurement
into a real, typed Harmony command plan. Everything else is either contract
testing (tests/mlContracts) or model-only smoke (scripts/ml/smoke_test.py).

Pipeline:
  1. Read the configured fixture image (defaults to fixtures/character.png).
  2. Drive the real DWPose V2 provider through the in-process JobManager. No
     mocks, no shortcuts, no fixtures substituting for the model.
  3. Load the V2 PoseSequence that the runtime wrote as
     output/evidence/ml/<runId>/dwpose/normalized-pir.json.
  4. Persist the PoseSequence and the synthesized HarmonyCommandPlanV5 to the
     same evidence directory so a human reviewer can read them side by side.
  5. Save an acceptance report stating what really happened. If the inference
     was blocked, the report says so; it never invents a plan to make the
     pipeline look complete.

The TypeScript half (compileToHarmonyPlan + invariant checks) is invoked
through a small Node bridge so the same code paths the MCP server uses are
exercised here. The bridge is intentionally thin: it reads the PIR from
disk and writes the plan back to disk; it does not modify the plan.

Run from the repo root:

    COMMERCIAL_BUILD=false ALLOW_LEGAL_REVIEW_PENDING=true \\
        .venv-ml/bin/python scripts/ml/run_dwpose_to_harmony_slice.py

Exit code 0 means the slice produced a real plan with a passing invariant
check. Exit code 1 means something was blocked; the evidence directory still
contains the truth.
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

import _bootstrap  # noqa: F401
from _bootstrap import PROJECT_ROOT

from runtime.artifact_store import ArtifactStore  # noqa: E402
from runtime.job_manager import JobManager  # noqa: E402
from runtime.provider_registry import build_default_registry  # noqa: E402


RIG: Dict[str, Any] = {
    "characterId": "slice_char_v1",
    "rigVersion": "slice-rig-v1",
    "rootNodePath": "Top/Slice/Root_Peg",
    "restTorsoLength": 3.2,
    "bindings": [
        {"joint": "spine_mid", "nodePath": "Top/Slice/Torso_Peg", "channels": ["rotationZ"]},
        {"joint": "nose", "nodePath": "Top/Slice/Head_Peg", "channels": ["rotationZ"], "rotationLimits": {"min": -90, "max": 90}},
        {"joint": "shoulder_left", "nodePath": "Top/Slice/Arm_L_Upper", "channels": ["rotationZ"]},
        {"joint": "elbow_left", "nodePath": "Top/Slice/Arm_L_Lower", "channels": ["rotationZ"], "rotationLimits": {"min": 0, "max": 150}},
        {"joint": "shoulder_right", "nodePath": "Top/Slice/Arm_R_Upper", "channels": ["rotationZ"]},
        {"joint": "elbow_right", "nodePath": "Top/Slice/Arm_R_Lower", "channels": ["rotationZ"], "rotationLimits": {"min": 0, "max": 150}},
    ],
    "ikChains": [
        {"name": "arm_left", "root": "shoulder_left", "mid": "elbow_left", "end": "wrist_left", "poleSign": 1,
         "upperNodePath": "Top/Slice/Arm_L_Upper", "lowerNodePath": "Top/Slice/Arm_L_Lower"},
        {"name": "arm_right", "root": "shoulder_right", "mid": "elbow_right", "end": "wrist_right", "poleSign": -1,
         "upperNodePath": "Top/Slice/Arm_R_Upper", "lowerNodePath": "Top/Slice/Arm_R_Lower"},
    ],
    "footJoints": ["ankle_left", "ankle_right"],
}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def submit_real_dwpose_job(inputs: List[Path], evidence_dir: Path) -> Dict[str, Any]:
    registry = build_default_registry()
    descriptor = registry.descriptor("dwpose")
    store = ArtifactStore()
    jobs = JobManager(registry, store)

    references = []
    for index, source in enumerate(inputs):
        data = source.read_bytes()
        references.append(store.put_bytes(
            "ml-jobs", f"{evidence_dir.name}/inputs/{index:03d}_{source.name}", data,
            "input_image", "image/png" if source.suffix.lower() == ".png" else None,
        ).to_dict())

    run_id = evidence_dir.name
    job_id = f"job_{uuid.uuid4()}"
    request = {
        "schemaVersion": "2.0",
        "jobId": job_id,
        "correlationId": run_id,
        "idempotencyKey": f"slice_{sha256_bytes(json.dumps({'p': 'dwpose', 'i': [r['sha256'] for r in references]}, sort_keys=True).encode())[:32]}",
        "taskType": "pose_estimation",
        "providerId": "dwpose",
        "modelId": descriptor.modelId,
        "modelRevision": descriptor.modelRevision,
        "executionMode": "real_ml",
        "commercialMode": "preview",
        "inputArtifacts": references,
        "parameters": {
            "inputMode": "image",
            "skeletonMappingId": "coco_wholebody133_to_canonical_v1",
            "confidenceGate": 0.3,
            "fps": 24,
            "frameBase": 1,
            "maxInterpolatedGapFrames": 2,
            "temporalSmoothing": "none",
            "outlierRejection": "none",
            "personId": "person_0",
        },
        "timeoutMs": 600_000,
        "seed": None,
        "requestedDevice": "auto",
    }

    readiness = registry.readiness("dwpose")
    (evidence_dir / "request.json").write_text(json.dumps(request, indent=2), encoding="utf-8")
    (evidence_dir / "input-manifest.json").write_text(json.dumps({"inputs": references}, indent=2), encoding="utf-8")
    (evidence_dir / "license-decision.json").write_text(
        json.dumps(registry.license_guard.evaluate(descriptor.modelId, use="preview").to_dict(), indent=2), encoding="utf-8")

    if not readiness["ready"]:
        blocked = {
            "runId": run_id,
            "status": "blocked",
            "realInferenceExecuted": False,
            "blockingReason": readiness["blockingReason"],
            "readiness": readiness,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "note": "No inference ran. The acceptance slice stays at 'blocked' and writes no plan.",
        }
        (evidence_dir / "blocked-report.json").write_text(json.dumps(blocked, indent=2), encoding="utf-8")
        return {"status": "blocked", "blockingReason": readiness["blockingReason"], "evidence_dir": str(evidence_dir)}

    result = asyncio.run(jobs.submit(request))
    (evidence_dir / "execution-report.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    if result.get("provenance"):
        (evidence_dir / "provenance.json").write_text(json.dumps(result["provenance"], indent=2), encoding="utf-8")
    if result.get("normalizedPir"):
        (evidence_dir / "normalized-pir.json").write_text(json.dumps(result["normalizedPir"], indent=2), encoding="utf-8")
    for artifact in result.get("outputArtifacts", []):
        source = store.resolve("ml-jobs", artifact["relativePath"])
        if source.is_file() and source.stat().st_size < 32 * 1024 * 1024:
            (evidence_dir / Path(artifact["relativePath"]).name).write_bytes(source.read_bytes())
    return {"status": result["status"], "result": result, "evidence_dir": str(evidence_dir)}


def invoke_compiler(pir_path: Path, rig: Dict[str, Any], plan_path: Path) -> Dict[str, Any]:
    """Run the real TypeScript poseRetargetCompiler through a tiny Node bridge.

    The bridge is intentionally short and on-disk: it reads the PIR, builds a
    RetargetingPlan, compiles a HarmonyCommandPlanV5, writes it next to the
    PIR, and reports the invariant check result. It does not edit the plan
    or skip checks.
    """
    bridge_path = PROJECT_ROOT / "scripts" / "ml" / "compile_dwpose_to_harmony_bridge.mjs"
    if not bridge_path.is_file():
        return {"status": "bridge_missing", "bridge_path": str(bridge_path)}
    completed = subprocess.run(
        ["node", str(bridge_path), str(pir_path), str(plan_path)],
        capture_output=True,
        text=True,
        env={**os.environ, "HARMONY_SLICE_RIG": json.dumps(rig)},
    )
    if completed.returncode != 0:
        return {
            "status": "bridge_failed",
            "returncode": completed.returncode,
            "stdout": completed.stdout,
            "stderr": completed.stderr,
        }
    try:
        return json.loads(completed.stdout)
    except json.JSONDecodeError as exc:
        return {"status": "bridge_unparseable", "error": str(exc), "stdout": completed.stdout}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=PROJECT_ROOT / "fixtures" / "character.png")
    parser.add_argument("--output", type=Path, default=PROJECT_ROOT / "output" / "evidence" / "ml" / "dwpose_to_harmony_slice")
    args = parser.parse_args()

    if not args.input.is_file():
        print(f"input image not found: {args.input}", file=sys.stderr)
        return 2

    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    evidence_dir = args.output / run_id
    evidence_dir.mkdir(parents=True, exist_ok=True)

    print(f"Slice runId={run_id}")
    print(f"Input: {args.input}")
    print(f"Evidence: {evidence_dir}")

    job_outcome = submit_real_dwpose_job([args.input], evidence_dir)
    print(f"DWPose job: {job_outcome['status']}")
    if job_outcome["status"] != "succeeded":
        print("Acceptance slice cannot compile a plan because the model was blocked or failed.")
        print(f"Reason: {job_outcome.get('blockingReason', '<unknown>')}")
        print(f"See {evidence_dir}/blocked-report.json or execution-report.json for evidence.")
        return 1

    pir_path = evidence_dir / "normalized-pir.json"
    plan_path = evidence_dir / "harmony-command-plan.json"
    compile_outcome = invoke_compiler(pir_path, RIG, plan_path)
    print(f"Compile: {compile_outcome.get('status')}")
    if compile_outcome.get("status") != "compiled":
        print(json.dumps(compile_outcome, indent=2))
        return 1

    acceptance = {
        "runId": run_id,
        "slice": "dwpose_to_harmony_command_plan_v5",
        "modelId": "dwpose-ll-ucoco-384",
        "weightsSha256": [
            "724f4ff2439ed61afb86fb8a1951ec39c6220682803b4a8bd4f598cd913b1843",
            "7860ae79de6c89a3c1eb72ae9a2756c0ccfbe04b7791bb5880afabd97855a411",
        ],
        "poseSequenceArtifact": str(pir_path),
        "harmonyCommandPlanArtifact": str(plan_path),
        "planStatus": compile_outcome.get("planStatus"),
        "commandCount": compile_outcome.get("commandCount"),
        "channelCount": compile_outcome.get("channelCount"),
        "reducedKeyCount": compile_outcome.get("reducedKeyCount"),
        "rawKeyCount": compile_outcome.get("rawKeyCount"),
        "maxReconstructionErrorDegrees": compile_outcome.get("maxReconstructionErrorDegrees"),
        "jointLimitsHonoured": compile_outcome.get("jointLimitsHonoured"),
        "invariantViolations": compile_outcome.get("invariantViolations", []),
        "honesty": {
            "realInferenceExecuted": compile_outcome.get("realInferenceExecuted"),
            "harmonyApplied": False,
            "renderer": "no Harmony executable in this environment; the plan was validated offline only",
        },
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }
    (evidence_dir / "acceptance-report.json").write_text(json.dumps(acceptance, indent=2), encoding="utf-8")
    print(json.dumps(acceptance, indent=2))
    return 0 if acceptance["planStatus"] == "compiled" and not acceptance["invariantViolations"] else 1


if __name__ == "__main__":
    sys.exit(main())
