# Minimal dependency closure — recorder + perception vertical slice

Sprint 0 deliverable. Defines the smallest set of files that must build, test and produce
evidence on their own, so the vertical slice can be verified in an isolated checkout without
unrelated modules masking a missing dependency.

Verified 2026-07-27 on `main` @ `709c982`, working tree clean.

---

## 1. Closure

| Layer | Files | Why it is in the closure |
|---|---|---|
| Node core | `package.json`, `tsconfig.json`, `jest.config.cjs`, `src/index.ts`, `src/config.ts`, `src/security.ts` | build, tool registration, path allowlist, error taxonomy, test harness |
| Schemas | `src/schemas/harmonyActionDataset.ts`, `src/schemas/sceneSnapshotPir.ts`, `src/schemas/retakeManifest.ts` | contracts between capture, diff and export |
| Recorder | `src/services/harmonyActionRecorder/*`, `src/services/sceneStateCapture/*`, `src/services/sceneDiffEngine/semantic.ts`, `src/tools/harmonyActionRecorderTools.ts` | session lifecycle, immutable evidence store, semantic diff |
| Harmony surfaces | `scripts/harmony/harmony_action_recorder.js`, `scripts/python/harmony_bridge.py`, `src/adapters/harmonyPython.ts` | the only real execution/recording surfaces |
| Perception (Python) | `services/ml-runtime/providers/dwpose_provider.py`, `services/ml-runtime/pipelines/video_pose.py`, `services/ml-runtime/pipelines/video_pose_schema.py` | detector + pose + video sequence |
| Model assets | `services/ml-runtime/weights/dwpose/manifest.json`, `scripts/ml/download-dwpose.py` | supply-chain integrity, blocked semantics |
| Gates | `src/services/capabilityRegistryValidator/index.ts`, `tests/capabilityRegistryGate.test.ts`, `tests/evidenceIntegrity.test.ts` | promotion discipline |
| Truth mirrors | `docs/capability_registry.json`, `docs/VERIFIED_TOOL_MATRIX.md`, `docs/verified_tool_matrix.json` | machine-readable status + its human mirror |
| Fixtures | `fixtures/character.png`, `fixtures/harmony-captures/*`, `fixtures/video/README.md` | reproducible offline runs |

**Explicitly outside the closure:** `oneprompt.md`, episode-package scaffolding, broad planners,
`src/tools/*` beyond the recorder tools, `services/reconstruction-core/*` except `perception.py`.
None of these may become a gate for the vertical slice.

---

## 2. Verification commands

All must exit 0.

```bash
npm run typecheck
npm run build
npm test -- --runInBand
npm run test:registry
npm run test:evidence
.venv-ml/bin/python -m pytest services/ml-runtime/tests -q
.venv-reconstruction/bin/python -m pytest services/reconstruction-core/tests -q
```

Environment-gated, must exit 0 while writing `status: blocked` when the runtime is absent:

```bash
npm run test:harmony-capture-real
```

---

## 3. Known closure violations

Recorded rather than hidden.

| Violation | Detail | Impact |
|---|---|---|
| Python environments are split | `.venv-ml` has `onnxruntime`+`cv2`+`pytest` but the reconstruction package is not installed; `.venv-reconstruction` has the reconstruction package but no `onnxruntime` | `perceive_video(mode="real")` returns `blocked` under `.venv-reconstruction`. Honest, but it means one interpreter cannot run the whole perception lane. |
| `test_api_auth_ratelimit.py` | needs `httpx`, absent from `.venv-reconstruction` | that module fails to import; excluded from the recorded Python run |
| `scripts/ml/run_dwpose_e2e.ts` | cannot run under `ts-node --esm` — resolves `src/schemas/rigTemplate.js` which only exists after build | pre-existing on `main`; the `.js` sibling is the working entry |
| `tests/rigEnhancements.test.ts` | hardcodes one developer's absolute checkout path as a tool input | fails in any other checkout, including CI. Verified failing on plain `main` in a worktree. |
| **`npm test -- --runInBand` never exits** | all 57 suites pass in ~5 s, then Jest reports *"Jest did not exit one second after the test run has completed"* and hangs until killed (exit 143). Reproduced with the two new gate suites excluded, so it is not caused by them. Each suite passes and exits 0 when run individually. | **`.github/workflows/ci.yml` runs exactly this command.** CI would hang to its job timeout. Plain `npm test` exits 0 because Jest force-exits workers. Not masked with `--forceExit`: the leaked handle should be found and closed. |

---

## 4. Promotion gates

`npm run test:registry` enforces, per `docs/capability_registry.json`:

- schema validity and unique capability ids;
- `implementationFiles` exist and are repo-relative;
- `not_implemented` / `unaudited` state a `blockingReason`;
- at or above `offline_verified`: at least one `evidencePath`, each existing on disk unless
  explicitly marked local-only;
- at or above `real_model_verified`: `models[]` with full SHA-256 digests plus a non-empty
  `measured{}` block;
- no capability sits at a `real_harmony_*` level while `harmony.scene_execution` is
  `not_implemented`;
- no absolute `/Users/` paths.

`npm run test:evidence` enforces, per committed bundle under `docs/evidence/`:

- `hashes.json` matches the bytes on disk;
- no hash recorded for a file that is absent;
- no absolute `/Users/` paths in bundle JSON;
- **no fabricated media**: a media file that is under 4 KB, printable ASCII, and contains a
  placeholder marker (`MOCK_VIDEO_STREAM`, `SIMULATED_VIDEO_STREAM_PLACEHOLDER`, …) fails the gate.

Both run in CI as separate steps.

### What the gates caught on first run

They immediately found two real defects introduced in earlier sessions:

1. `docs/evidence/sprint1-video-pose/hashes.json` had been copied from the local `output/`
   bundle and listed seven files that were never committed alongside it.
2. `vectorization.centerline_bezier` sat at `unaudited` with `blockingReason: null`.

Both were fixed rather than exempted. The evidence gate also reports — as a warning, since
`output/` is gitignored scratch — that **71 `.mp4` files under `output/` are fabricated**
17-byte ASCII stubs, one named `SC_TEST_REAL_preview.mp4`.
