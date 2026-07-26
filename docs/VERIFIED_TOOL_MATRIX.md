# VERIFIED TOOL MATRIX & STATUS REPORT

## Strict Status Classifications
- **real_harmony_verified**: Verified against live running Toon Boom Harmony instance with actual scene modifications.
- **real_model_verified**: Verified with actual local neural network execution (e.g., local DWPose ONNX model processing image).
- **offline_tested**: Verified offline using deterministic TypeScript compilers, Zod schema validation, and Jest unit test suite.
- **implemented**: Code written and integrated, pending live execution verification.
- **planned**: Architecture defined, pending implementation.

## Component Verification Matrix

| Component / Feature | Status Classification | Details |
|---|---|---|
| DWPose Human Keypoint Estimation | `real_model_verified` | Local ONNX runtime execution on real images (`character.png`) producing `raw_dwpose_output.json` & `overlay.png` |
| CharacterTopologyPIR Schema & Compiler | `offline_tested` | Zod schema validation & conversion from keypoints to PIR |
| RigBindingPlan & HarmonyCommandBuilder (V4) | `offline_tested` | Deterministic SHA-256 command plan compiler (`harmonyCommandPlanV4Schema`) |
| VisemeMapper & LipSyncPIR | `offline_tested` | Mapping phonemes to exposures |
| AnimeInbet Orchestrator | `offline_tested` | Python provider endpoint & TS orchestrator integration |
| SceneDiffEngine & RetakeManifest | `offline_tested` | Snapshot PIR comparison with float epsilon handling |
| Harmony Script Server Connection | `implemented` | QtScript server ping & command dispatcher |
| Live Harmony .xstage Execution | `planned` | Requires active Harmony license & running TB_Harmony script server |
| Visual Auto-Fix / Generative Repair | `planned` | Planned future iteration |

## MCP Tools Classification

| MCP Tool Name | Status Classification | Notes |
|---|---|---|
| `harmony.health_check` | `offline_tested` | Local environment probe |
| `harmony.rig.generate_cutout` | `offline_tested` | Generates RigBindingPlanV1 |
| `harmony.audio.apply_lipsync` | `offline_tested` | Generates LipSync plan commands |
| `harmony.animation.generate_inbetweens` | `offline_tested` | Generates create_drawing commands |
| `harmony.ai_studio.detect_changes` | `offline_tested` | Generates RetakeManifest |
| `harmony.scene.open_project` | `implemented` | Requires live Harmony instance |
