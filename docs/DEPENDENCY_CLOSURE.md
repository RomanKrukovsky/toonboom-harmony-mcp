# Minimal dependency closure — recorder + perception vertical slice

Sprint 0 deliverable. Defines the smallest set of files that must build, test and produce
evidence on their own, so the vertical slice can be verified in an isolated checkout without
unrelated modules masking a missing dependency.

Originally verified 2026-07-27 on `main` @ `709c982`. Re-checked later the same day
against the current working tree; the closure corrections below remain uncommitted.

---

## 1. Closure

| Layer | Files | Why it is in the closure |
|---|---|---|
| Node core | `package.json`, `tsconfig.json`, `jest.config.cjs`, `src/index.ts`, `src/config.ts`, `src/security.ts` | build, tool registration, path allowlist, error taxonomy, test harness |
| Schemas | `src/schemas/harmonyActionDataset.ts`, `src/schemas/sceneSnapshotPir.ts`, `src/schemas/retakeManifest.ts` | contracts between capture, diff and export |
| Recorder | `src/services/harmonyActionRecorder/*`, `src/services/sceneStateCapture/*`, `src/services/sceneDiffEngine/semantic.ts`, `src/tools/harmonyActionRecorderTools.ts` | session lifecycle, immutable evidence store, semantic diff |
| Harmony surfaces | `scripts/harmony/harmony_action_recorder.js`, `scripts/python/harmony_bridge.py`, `src/adapters/harmonyPython.ts` | the only real execution/recording surfaces |
| Perception (Python) | `services/ml-runtime/app.py`, `services/ml-runtime/schemas.py`, `services/ml-runtime/providers/dwpose_provider.py`, `services/ml-runtime/pipelines/video_pose.py`, `services/ml-runtime/pipelines/video_pose_schema.py` | honest dispatch + detector + pose + video sequence |
| Python manifests | `services/reconstruction-core/{pyproject.toml,requirements.lock}`, `services/ml-runtime/{pyproject.toml,requirements.lock}`, `services/ml-core/pyproject.toml` | clean-environment dependency closure for all Python suites |
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
npm run test:python:all
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
| ~~`test_api_auth_ratelimit.py` lacked `httpx`~~ | Resolved: `httpx`, `httpcore` and `certifi` are declared in the reconstruction lock and `httpx` is a direct project dependency. | The full reconstruction suite now collects and runs. |
| `scripts/ml/run_dwpose_e2e.ts` | cannot run under `ts-node --esm` — resolves `src/schemas/rigTemplate.js` which only exists after build | pre-existing on `main`; the `.js` sibling is the working entry |
| ~~Tests assumed one checkout path/name~~ | Resolved: environment validation uses `process.cwd()` and the review-package assertion derives the scene directory name from its fixture path. | The same suite now works when the worktree directory has an arbitrary name. |
| ~~`npm test -- --runInBand` never exited~~ | Resolved. **Two independent leaks:** (1) a persistent `HarmonyPython` bridge process — `shutdownDaemon()` now waits for it to close and the vectorization suite tears down explicitly; (2) live HTTPS calls to the OpenRouter API using the real key from `.env`, leaking TLS sockets — `tests/setup/hermetic.ts` strips credentials, neutralises `dotenv.config()` before any module loads, and blocks non-loopback `fetch`. | The exact CI command exits 0 without `--forceExit`. Guarded by a daemon restart/shutdown test and by `tests/hermeticEnvironment.test.ts`. The second leak also hid a false-green test: `OpenRouterClient` emits `[OFFLINE FALLBACK MODE]` for no-key, non-ok HTTP **and** thrown errors, so the assertion could not distinguish "never called the network" from "called it and failed". |
| ML runtime was absent from CI | Resolved: its locked dependencies and test suite are now installed and run beside reconstruction-core and ml-core. | A provider can no longer bypass CI merely because it lives under `services/ml-runtime`. |
| Generic ML dispatch returned false success | Resolved: an enabled but unsupported provider now returns `blocked`, `realInferenceExecuted: false`, no confidence and no memory claim. The response schema rejects `success` without real inference. | Prevents an unconnected provider from being promoted or consumed as real output. |

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

Both checks walk nested directories and cover `.json`, `.jsonl`, `.md`, `.txt`, `.csv` and
YAML. The first version scanned only the bundle's top level and only `.json`, so
`representative-frames/*.png` and the `raw-/smoothed-keypoints.jsonl` streams — the bulk of a
pose bundle — were never inspected.

Both run in CI as separate steps.

### What the gates caught on first run

They immediately found two real defects introduced in earlier sessions:

1. `docs/evidence/sprint1-video-pose/hashes.json` had been copied from the local `output/`
   bundle and listed seven files that were never committed alongside it.
2. `vectorization.centerline_bezier` sat at `unaudited` with `blockingReason: null`.

Both were fixed rather than exempted. The evidence gate also reports — as a warning, since
`output/` is gitignored scratch — that **71 `.mp4` files under `output/` are fabricated**
17-byte ASCII stubs, one named `SC_TEST_REAL_preview.mp4`.
