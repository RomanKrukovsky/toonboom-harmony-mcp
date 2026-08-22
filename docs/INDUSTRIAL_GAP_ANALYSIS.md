# INDUSTRIAL GAP ANALYSIS: Self-Reported vs. Production Reality

## Overview
This document compares self-reported documentation statements (from `README.md`, `docs/internal/CHECKPOINT.md`, `docs/internal/BRUTAL_ENTERPRISE_AUDIT.md`) against verified runtime behavior and source code inspection.

---

## 1. Gap Analysis Matrix

| Domain | Self-Reported Claim | Verified Code / Runtime Reality | Industrial Requirement & Remediations |
|---|---|---|---|
| **ML Inference Engine** | "Full ML perception stack integrated and running" | DWPose ONNX is verified locally. Other providers (`AnimeInbet`, `VoxCPM`) are partially connected or use stub fallbacks in `services/ml-runtime/app.py`. | Implement isolated worker processes per model family with explicit health/readiness endpoints and zero false `realInferenceExecuted=true` flags. |
| **Model Licensing & Legal Gating** | "All models ready for commercial production" | `AnimeInbet` code/data is strictly Non-Commercial. `HY-Motion 1.0` has EU/UK/KR territorial exclusions. `SAM 3.1` uses custom gated Meta license. | Enforce `SecurityManager.validateModelLicense()` in `src/security.ts` to block prohibited models by environment and region. |
| **Harmony Direct Integration** | "Native Harmony compilation and execution completed" | Harmony Command Builder V4 compiles valid JSON plans. Real `.xstage` execution skips gracefully when Harmony desktop is missing. | Maintain explicit split: `offline_verified` for compiler/Zod schema tests, and `real_harmony_smoke_verified` only when run on a machine with TB Harmony. |
| **Retake Capture Infrastructure** | "AI studio retake loop fully functional" | `SceneDiffEngine` computes PIR deltas. Full 4-tuple database storage with privacy/licensing flags requires dedicated persistence layer. | Implement `src/retake/retakeDatasetStore.ts` storing `(InputShot, DirectorFeedback, EditDelta, ApprovedOutput)` tuples in Parquet/SQLite. |
| **Security & Sandbox Isolation** | "Enterprise secure path isolation" | Paths checked against `HARMONY_ALLOWED_PATHS`. Subprocess execution requires stricter argument sanitation. | Enforce canonical path resolution (`fs.realpathSync`), symlink escape protection, and strict CLI argument allowlisting in `src/security.ts`. |

---

## 2. Technical Debt & Safety Action Plan

1. **No Fake Evidence**:
   - Audit all API responses in `services/ml-runtime/app.py` to ensure `simulated: false` and `realInferenceExecuted: true` are returned ONLY when weight hashes match and actual inference runs.
2. **Provider Environment Isolation**:
   - Separate CUDA dependencies across distinct worker runtimes (`.venv-dwpose`, `.venv-seethrough`, `.venv-mfa`) to prevent PyTorch/CUDA ABI conflicts.
3. **PIR Schema Round-Trip Validation**:
   - Ensure every ML provider output passes Zod/Pydantic validation before passing to the Harmony Command Builder.
