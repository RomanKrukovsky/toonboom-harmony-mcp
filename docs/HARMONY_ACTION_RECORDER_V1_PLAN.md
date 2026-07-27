# Harmony Action Recorder v1 — Session Plan

Date: 2026-07-27
Branch: `main`
Scope: one vertical slice, single ~5h session.

---

## 1. Verified current state (facts, not README claims)

All statements below were produced by executing commands in this repository / on this machine.

### 1.1 Baseline health (run BEFORE any change)

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | exit 0 — 49 suites passed, 342 passed, 6 skipped, 348 total |

(`npm run build` runs the same `tsc`; verified after implementation.)

### 1.2 What already exists and must be reused (not duplicated)

| Path | Lines | What it actually is |
|---|---|---|
| `src/services/sceneDiffEngine/index.ts` | 165 | `SceneDiffEngine.compare(v1, v2)` — structural diff of `SceneSnapshotPIR` producing `RetakeManifest`. Handles node add/remove, connection add/remove, transform-keyframe add/modify/remove, exposure add/modify/remove, float epsilon. **No semantic operations, no origin tracking, no ordering guarantees, no inverse patch.** |
| `src/schemas/sceneSnapshotPir.ts` | 50 | `SceneSnapshotPIR`: nodes (id/type/name), connections, per-node `transformKeys` + `exposures`. No node position, no attributes, no columns, no camera, no scene settings, no schemaVersion/provenance. |
| `src/schemas/retakeManifest.ts` | 56 | Delta container consumed by `harmonyCommandBuilder`. |
| `src/security.ts` | 296 | `HarmonyError` + `HarmonyErrorCode` union, `verifyPathAccess()` (canonical resolve + allowlist + symlink escape check), `logOperation`, `createVerifiedResult`. |
| `src/config.ts` | 281 | `config.allowedRoots`, `validatePath()`, Harmony install auto-detection (found Harmony 25 Premium on this Mac). |
| `src/index.ts` | 321 | MCP registry: `allTools` array of `{name, description, inputSchema: ZodObject, handler}`; zod→JSON-schema conversion; error envelope. |
| `scripts/python/harmony_bridge.py` | 2702 | Headless Harmony Python bridge. Read commands present: `detect`, `inspect_project`, `list_nodes`, `get_node_attrs`, `list_drawings`, `list_timeline`, `audit_scene`. |
| `scripts/js/harmony_live_bridge.js` | 25 | Stub. Traces a message, opens a `QTcpServer` if the symbol exists. No protocol, no notifier, no event spool. |

**Not found anywhere in the repo** (verified by grep): `SceneChangeNotifier`, any capture session, any event spool, any action dataset, any approval record bound to a patch.

### 1.3 Harmony runtime reality on this machine

| Probe | Result |
|---|---|
| `/Applications/Harmony 25 Premium.app` | present |
| `ToonBoom.harmony` Python module import | **works** (`python_version 3.9.25`, capabilities reported) |
| `harmony.session()` without GUI | `Harmony is not currently running. Launch Harmony or Open a project first.` |
| `harmony.open_project(<fixture .xstage>)` | **FAILS — `RuntimeError: Invalid license`**; FlexNet: `Cannot find license file … /usr/local/flexlm/licenses/license.dat` |

⇒ Real headless scene reads are **blocked by licensing**, not by missing code. This is the honest blocking reason for the real smoke test; it will be recorded as `blocked` with this exact error, not faked.

### 1.4 Harmony-side notification API (verified from the locally installed official docs)

Source of truth: `/Applications/Harmony 25 Premium.app/Contents/Documentation/script/classSceneChangeNotifier.html`
(bundled Harmony 25 Scripting Interface reference — not memory, not a guess).

`SceneChangeNotifier(QObject parent)` with signals:

| Signal | Payload |
|---|---|
| `sceneChanged()` | — |
| `networkChanged(StringList list)` | affected nodes |
| `nodeChanged(StringList list)` | affected nodes |
| `nodeMetadataChanged(StringList list)` | affected nodes |
| `columnValuesChanged(StringList columnNames)` | affected columns |
| `currentFrameChanged()` | — |
| `selectionChanged()` | — |
| `controlChanged()` | — |
| `deformerReset(StringList)` / `deformerResetCurrentFrame(StringList)` | deformation groups |
| `sceneMarkersChanged()` | — |
| slot `disconnectAll()` | — |

Notifier signals are **hints only**: they say "something in this region may have changed". v1 therefore uses them to populate a dirty-entity queue, then re-reads normalized state after a debounce.

---

## 2. Scope of THIS session

### In scope
1. Versioned schemas: `HarmonySceneState`, `HarmonyCaptureSession`, `HarmonyInstruction`, `HarmonyRawEvent`, `HarmonySemanticOperation`, `HarmonyScenePatch`, `HarmonyApprovalRecord`, `HarmonyActionDatasetEntry`.
2. Canonical ordering + deterministic hashing (order-independent).
3. Append-only JSONL event spool + immutable per-session artifact directory + honest `interrupted` recovery.
4. Semantic Scene Diff Engine (normalized-state diff → atomic operations + inverse patch), added **inside the existing** `src/services/sceneDiffEngine/`.
5. Session lifecycle service with debounced dirty-entity queue and pluggable `SceneStateProvider`.
6. 9 MCP tools, each with a real backend and tests.
7. Harmony-side static QtScript notifier script writing the JSONL spool.
8. Unit + contract + offline integration tests; env-gated real-Harmony smoke test that reports `blocked` honestly.
9. `VERIFIED_TOOL_MATRIX` update backed by a machine-readable JSON that a test asserts against the markdown.

### Explicitly OUT of scope (recorded as `not_captured_v1` / not started)
- Palettes, deformer chains, Master Controllers, per-stroke drawing geometry, art layers.
- Voice capture / STT, screen or video recording, mouse/keyboard capture.
- Web panel, model training, LoRA, RAG, visual QA, autorigging, vectorization, inbetweening.
- Automatic application of the inverse patch to a live scene (inverse patch is produced as **data** only).

### Non-negotiables
- Recorder is read-only with respect to scene content.
- No user- or LLM-supplied Harmony JavaScript is executed. Only the static bundled script.
- Manual (diff-derived) operations are never labelled as exact MCP actions.
- No fake renders. `renderStatus: not_executed` when no render ran.

---

## 3. Files to create / modify

### Create
```
src/schemas/harmonyActionDataset.ts                     — all versioned zod schemas + canonical hashing
src/services/sceneStateCapture/index.ts                 — normalization, canonical ordering, providers
src/services/sceneStateCapture/fixtureProvider.ts       — offline provider (JSON fixture)
src/services/sceneStateCapture/harmonyBridgeProvider.ts — real provider via harmony_bridge.py
src/services/sceneDiffEngine/semantic.ts                — SemanticSceneDiffEngine (extends existing folder)
src/services/harmonyActionRecorder/config.ts            — limits, debounce, allowlist, redaction
src/services/harmonyActionRecorder/store.ts             — immutable artifact store + JSONL spool
src/services/harmonyActionRecorder/index.ts             — session lifecycle
src/tools/harmonyActionRecorderTools.ts                 — 9 MCP tools
scripts/harmony/harmony_action_recorder.js              — Harmony-side static QtScript notifier
fixtures/harmony-captures/scene-before.json             — offline fixture
fixtures/harmony-captures/scene-after.json              — offline fixture
docs/verified_tool_matrix.json                          — machine-readable status source
tests/harmonyActionRecorderSchemas.test.ts
tests/harmonySemanticDiff.test.ts
tests/harmonyActionRecorderLifecycle.test.ts
tests/harmonyActionRecorderTools.test.ts
tests/integration/harmonyActionRecorder.offline.test.ts
tests/integration/harmonyActionRecorder.realHarmony.smoke.test.ts
docs/HARMONY_ACTION_RECORDER.md
```

### Modify
```
src/security.ts        — add capture-specific HarmonyErrorCode members
src/index.ts           — register harmonyActionRecorderTools
.env.example           — recorder configuration keys
docs/VERIFIED_TOOL_MATRIX.md — new rows, consistent with docs/verified_tool_matrix.json
.gitignore             — artifacts/harmony-captures (evidence is local, not committed)
```

Existing `SceneDiffEngine` / `SceneSnapshotPIR` / `RetakeManifest` are **left untouched** — the new semantic engine lives beside them in the same folder and operates on the richer `HarmonySceneState`.

---

## 4. Time budget

| Block | Target |
|---|---|
| Audit + this plan | 0:00–0:40 ✅ |
| Schemas, hashing, store, session lifecycle | 0:40–1:40 |
| SceneState capture contract + Semantic Diff Engine | 1:40–3:10 |
| MCP tools + Harmony-side notifier script | 3:10–4:10 |
| Tests, fixes, docs, matrix; real smoke attempt | 4:10–5:20 |

If a block overruns, the reliable offline vertical slice is finished first; the real-Harmony attempt is the only droppable item.

---

## 5. Definition of Done for this session — outcome

- [x] Offline recorder works end to end: start → instruction → snapshot → stop → patch → approve/reject → dataset entry. (`npm run demo:capture`, `tests/integration/harmonyActionRecorder.offline.test.ts`)
- [x] Before/after states validated by zod; deterministic hash is order-independent. (`tests/harmonyActionRecorderSchemas.test.ts`)
- [x] Identical states produce an empty patch. (`tests/harmonySemanticDiff.test.ts`, `tests/harmonyActionRecorderLifecycle.test.ts`)
- [x] Events append-only with sequence numbers; a killed session recovers as `interrupted`, never as `approved`. (`tests/harmonyActionRecorderLifecycle.test.ts`)
- [x] Approval is a separate immutable record bound to the patch hash; it never mutates the patch. (same file)
- [x] Every registered MCP tool has a backend and a test. (`tests/harmonyActionRecorderTools.test.ts`, `tests/verifiedToolMatrixConsistency.test.ts`)
- [x] `npm run typecheck`, `npm run build`, `npm test` all exit 0. Final suite: 55 passed, 1 skipped (the real-Harmony smoke test), 408 tests passed, 7 skipped.
- [x] Real Harmony: **blocked, not verified.** `harmony.open_project` raises `RuntimeError: Invalid license`; no FlexNet license file exists on this machine. Evidence: `docs/evidence/harmony-action-recorder-real-smoke/blocked.json`.

### Not delivered in this session
- No real Harmony scene was read, and the Harmony-side QtScript notifier was never executed inside Harmony (no licensed session available). Its status stays `implemented`, not `verified`.
- The headless Python bridge does not expose Node View coordinates, node connections, per-frame exposures or keyframe interpolation; the provider warns for each instead of inventing values.
