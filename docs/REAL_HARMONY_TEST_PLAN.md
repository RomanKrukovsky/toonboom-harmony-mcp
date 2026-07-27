# REAL HARMONY TEST PLAN (Production Smoke & Verification)

## Purpose
This document details the step-by-step procedure for validating `toonboom-harmony-mcp` against a live Toon Boom Harmony environment.

---

## 1. Test Levels & Entry Criteria

```
+-------------------+      +-------------------+      +-------------------------------+
| Level 1: Offline  | ---> | Level 2: Real ML  | ---> | Level 3: Real Harmony Process |
| (Zod/Jest Tests)  |      | (DWPose ONNX E2E) |      | (Script Server / Batch Mode)  |
+-------------------+      +-------------------+      +-------------------------------+
```

### Level 1: Offline Verification (`offline_verified`)
- **Criteria**: All Jest unit tests pass (39 test suites). TypeScript typecheck (`npm run typecheck`) and build (`npm run build`) pass.
- **Scope**: Zod schemas, PIR normalizers, deterministic SHA-256 command plan generators.

### Level 2: Real ML Model Verification (`real_model_verified`)
- **Criteria**: Real neural network execution on physical input images/audio (`fixtures/character.png`).
- **Scope**: DWPose ONNX model execution via `.venv-ml` producing physical files: `raw_dwpose_output.json`, `skeleton.json`, `keypoints_overlay.png`, `character_topology_pir.json`, `provenance.json`, `execution_report.json`.

### Level 3: Real Harmony Smoke Verification (`real_harmony_smoke_verified`)
- **Criteria**: Live Toon Boom Harmony instance or batch process executes command plan V4 on a real `.xstage` project file.
- **Verification Workflow**:
  1. Open project via Harmony Python / Telnet interface.
  2. Create nodes (`PEG`, `READ`, `COMPOSITE`) and connect ports.
  3. Set pivot points on PEGs.
  4. Perform structural readback via Harmony API to verify nodes exist.
  5. Save scene natively in Harmony (`scene.saveAll()`).
  6. Close scene and reopen `.xstage` file.
  7. Re-verify structural node graph via second readback.
  8. Render PNG sequence via Harmony render node.
  9. Validate PNG dimensions, frame count, and non-empty pixel data.

---

## 2. Test Execution Commands

```bash
# Level 1: Offline Compiler & Schema Test
npm run typecheck
npm run build
npm test

# Level 2: Real Model DWPose E2E Slice Test
.venv-ml/bin/python -c "
import sys, json
sys.path.append('services/ml-runtime')
from providers.dwpose_provider import DWPoseProvider
provider = DWPoseProvider({'enabled': True, 'device': 'cpu'})
res = provider.run('fixtures/character.png', 'output/dwpose_results')
print(json.dumps(res, indent=2))
"
npx ts-node scripts/ml/run_dwpose_e2e.ts fixtures/character.png

# Level 3: Live Harmony Process Smoke Test (Requires TB Harmony Environment)
npx ts-node scripts/verify_real_harmony_slice.ts
```
