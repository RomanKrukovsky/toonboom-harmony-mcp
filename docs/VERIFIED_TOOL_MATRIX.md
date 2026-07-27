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
| DWPose Human Keypoint Estimation (Phase 1 Slice) | `real_model_verified` | Local ONNX runtime execution on `fixtures/character.png` producing `raw_dwpose_output.json`, `skeleton.json`, `keypoints_overlay.png` & `hashes.json`. |
| CharacterPartDecomposer & Layer Matching (Phase 2 Slice) | `real_model_verified` + `offline_tested` | Real DWPose keypoints + bounding box segmentation on `fixtures/character.png` producing `character_decomposition_pir.json` (22 parts), `part_regions_visualization.png` & `hashes.json`. |
| Whisper & MFA Speech LipSync (Phase 3 Slice) | `real_model_verified` + `offline_tested` | Real Whisper FP32 transcription on `fixtures/sample_audio.wav` producing `lipsync_pir.json`, `input_audio_properties.json`, `harmony_command_plan.json` & `hashes.json`. |
| 2D Motion Retargeting Engine (Phase 4 Slice) | `real_model_verified` + `offline_tested` | Real Python Motion Retargeting Engine in `.venv-reconstruction` producing `performance_pir.json`, `retargeting_plan.json`, `harmony_command_plan.json` (18 transform keyframes) & `hashes.json`. |
| Generative Inbetweening & Vectorization (Phase 5 Slice) | `real_model_verified` + `offline_tested` | Real Inbetweening & Vectorization Core producing `inbetween_pir.json`, `drawing_vector_pir.json`, `harmony_command_plan.json` (3 create_drawing commands) & `hashes.json`. |
| Scene Diffing & Retake Pipeline (Phase 6 Slice) | `real_model_verified` + `offline_tested` | Real SceneDiffEngine & HarmonyCommandBuilder producing `retake_manifest.json`, `harmony_command_plan.json` (5 targeted patch commands) & `hashes.json`. |
| CharacterTopologyPIR Schema & Estimator | `offline_tested` | Zod schema validation & conversion from keypoints to PIR |
| RigBindingPlan & HarmonyCommandBuilder (V4) | `offline_tested` | Deterministic SHA-256 command plan compiler (`harmonyCommandPlanV4Schema`) |
| VisemeMapper & LipSyncPIR | `offline_tested` | Mapping phonemes to exposures |
| AnimeInbet Orchestrator | `offline_tested` | Python provider endpoint & TS orchestrator integration |
| SceneDiffEngine & RetakeManifest | `offline_tested` | Snapshot PIR comparison with float epsilon handling |
| Harmony Script Server Connection | `implemented` | QtScript server ping & command dispatcher |
| Live Harmony .xstage Execution | `planned` | Requires active Harmony license & running TB_Harmony script server |

## MCP Tools Classification

| MCP Tool Name | Status Classification | Notes |
|---|---|---|
| `harmony.health_check` | `offline_tested` | Local environment probe |
| `harmony.rig.generate_cutout` | `offline_tested` | Generates RigBindingPlanV1 |
| `harmony.audio.apply_lipsync` | `offline_tested` | Generates LipSync plan commands |
| `harmony.animation.generate_inbetweens` | `offline_tested` | Generates create_drawing commands |
| `harmony.ai_studio.detect_changes` | `offline_tested` | Generates RetakeManifest |
| `harmony.scene.open_project` | `implemented` | Requires live Harmony instance |

---

## Harmony Action Recorder v1

Machine-readable source of truth: [`docs/verified_tool_matrix.json`](verified_tool_matrix.json).
`tests/verifiedToolMatrixConsistency.test.ts` fails the build if the table below disagrees with that file.

Additional status values used in this section:
- **blocked**: verification was attempted and could not run; the blocking reason is recorded verbatim.
- **not_applicable**: the tool never touches Harmony, so "real Harmony" is not a meaningful check.

| MCP Tool Name | Implementation | Schema | Unit | Contract | Offline integration | Real Harmony | Evidence / blocking reason |
|---|---|---|---|---|---|---|---|
| `harmony.capture.start` | `src/tools/harmonyActionRecorderTools.ts` | zod | `offline_tested` | `offline_tested` | `offline_tested` | `blocked` | `docs/evidence/harmony-action-recorder-real-smoke/blocked.json` — `ToonBoom.harmony open_project` fails with `RuntimeError: Invalid license` |
| `harmony.capture.record_instruction` | `src/tools/harmonyActionRecorderTools.ts` | zod | `offline_tested` | `offline_tested` | `offline_tested` | `not_applicable` | Stores the human task description; does not touch Harmony |
| `harmony.capture.snapshot` | `src/tools/harmonyActionRecorderTools.ts` | zod | `offline_tested` | `offline_tested` | `offline_tested` | `blocked` | `docs/evidence/harmony-action-recorder-real-smoke/blocked.json` — same license blocker |
| `harmony.capture.status` | `src/tools/harmonyActionRecorderTools.ts` | zod | `offline_tested` | `offline_tested` | `offline_tested` | `not_applicable` | Reads the local artifact store only |
| `harmony.capture.stop` | `src/tools/harmonyActionRecorderTools.ts` | zod | `offline_tested` | `offline_tested` | `offline_tested` | `blocked` | `docs/evidence/harmony-action-recorder-real-smoke/blocked.json` — same license blocker |
| `harmony.capture.approve` | `src/tools/harmonyActionRecorderTools.ts` | zod | `offline_tested` | `offline_tested` | `offline_tested` | `not_applicable` | Writes an immutable decision record |
| `harmony.capture.reject` | `src/tools/harmonyActionRecorderTools.ts` | zod | `offline_tested` | `offline_tested` | `offline_tested` | `not_applicable` | Writes an immutable decision record |
| `harmony.capture.export_dataset_entry` | `src/tools/harmonyActionRecorderTools.ts` | zod | `offline_tested` | `offline_tested` | `offline_tested` | `not_applicable` | Assembles the entry from stored artifacts |
| `harmony.capture.compare_sessions` | `src/tools/harmonyActionRecorderTools.ts` | zod | `offline_tested` | `offline_tested` | `offline_tested` | `not_applicable` | Compares two stored patches |

### Recorder components

| Component | Implementation | Status | Notes |
|---|---|---|---|
| HarmonySceneState capture contract | `src/services/sceneStateCapture/index.ts` | `offline_tested` | Canonical ordering, size limits, order-independent hashing. Categories not read in v1 are declared as `notCaptured`, never fabricated. |
| SemanticSceneDiffEngine | `src/services/sceneDiffEngine/semantic.ts` | `offline_tested` | 15 operation types, deterministic ordering, inverse patch as data, MCP-claim attribution. |
| Immutable capture evidence store | `src/services/harmonyActionRecorder/store.ts` | `offline_tested` | Write-once artifacts, append-only JSONL spool, truncated-tail recovery. |
| Harmony-side SceneChangeNotifier script | `scripts/harmony/harmony_action_recorder.js` | `implemented` | Static QtScript written against the reference bundled with the local Harmony 25 install. **Never executed inside Harmony in this session.** |
| HarmonyBridgeSceneStateProvider (real read path) | `src/services/sceneStateCapture/harmonyBridgeProvider.ts` | `blocked` | `ToonBoom.harmony` imports (python 3.9.25); `harmony.open_project` raises `RuntimeError: Invalid license`. FlexNet finds no license file at `/usr/local/flexlm/licenses/license.dat` and `LM_LICENSE_FILE` is unset. |
