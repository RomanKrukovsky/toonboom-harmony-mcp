# Harmony Action Recorder v1

Records an animator's work in Toon Boom Harmony as **structured scene deltas**, not as screen
video. The output is a Harmony Action Dataset entry of the shape:

```
user instruction → scene state before → observed events → scene state after
                 → normalized semantic operations → approval decision
```

Status: offline vertical slice, verified by the Jest suite. The real Harmony read path is
implemented but **blocked on this machine by licensing** — see
[Real Harmony status](#real-harmony-status).

---

## 1. What it captures — and what it does not

### Captured in v1
node graph (paths, types, parents, Node View coordinates, enabled flag) · node connections ·
static node attributes and their column bindings · function columns · keyframes with values
and curve/ease data · per-frame drawing exposures · camera node and its properties ·
scene settings (frame count, frame rate, resolution).

### Declared as `not_captured_v1`
`palettes` · `deformer_chains` · `master_controllers` · `drawing_strokes` · `art_layers` ·
`sound_columns` · `node_view_groups`.

These appear in every artifact's `notCaptured` list. A consumer can therefore tell
*"nothing changed there"* apart from *"we did not look"*. The schema is additive, so a later
version can capture them without breaking v1 entries.

### Never captured
Mouse movement, keystrokes, screen contents, other applications, passwords, audio. This is a
structural recorder, not a Computer Use recorder. Voice and video may be attached later as an
optional layer; v1 accepts only a text `instruction` plus optional `externalDemoRef` /
`transcriptRef` pointers, and runs no speech recognition.

---

## 2. Workflow

| Step | Tool | Effect |
|---|---|---|
| 1 | `harmony.capture.start` | Reads the before-state, creates the immutable evidence directory, opens the append-only event log. |
| 2 | `harmony.capture.record_instruction` | Stores the animator's task description. **The only source of artistic intent.** |
| 3 | animator works in Harmony | The Harmony-side notifier script appends signals; each signal only marks entities dirty. |
| 4 | `harmony.capture.snapshot` (optional, repeatable) | Waits for the debounce interval, then re-reads the dirty entities and stores an intermediate state. |
| 5 | `harmony.capture.stop` | Waits for the queue to settle, reads the after-state, computes the semantic patch and the inverse patch, writes all artifacts. |
| 6 | `harmony.capture.approve` / `harmony.capture.reject` | Writes a separate write-once decision record bound to the patch hash. The patch is never modified. |
| 7 | `harmony.capture.export_dataset_entry` | Emits the `HarmonyActionDatasetEntry`. |
| — | `harmony.capture.status` | True status of one session, or a listing of all of them. |
| — | `harmony.capture.compare_sessions` | Diffs two finished sessions' patches (retake / variant analysis). |

The recorder is **read-only with respect to scene content**. It writes only into its own
evidence directory.

---

## 3. Evidence directory

`artifacts/harmony-captures/<session-id>/` (configurable). One directory per session; an
existing directory is never reused or overwritten.

| File | Write policy | Contents |
|---|---|---|
| `session.json` | mutable (lifecycle only) | Session record and status. |
| `instruction.json` | write-once | The human task description. |
| `scene-before.json` | write-once | Normalized `HarmonySceneState`. |
| `events.jsonl` | append-only | One `HarmonyRawEvent` per line, monotonic `sequence`. |
| `scene-after.json` | write-once | Normalized `HarmonySceneState`. |
| `scene-patch.json` | write-once | `HarmonyScenePatch` — the semantic operations. |
| `inverse-patch.json` | write-once | Inverse operations **as data**; v1 never applies them to a scene. |
| `approval.json` | write-once | The decision, bound to `patchHash`. |
| `environment.json` | write-once | Platform, Node version, Harmony version, effective limits. |
| `execution-report.json` | write-once | Provider, notifier status, `renderStatus`, `realHarmonyStatus`. |
| `hashes.json` | regenerated | SHA-256 of every artifact on disk. |
| `dataset-entry.json` | write-once | The exported training example. |
| `snapshots/` | append | Intermediate states from `harmony.capture.snapshot`. |

No PNG or MP4 is ever fabricated. When no render ran, `renderStatus` is `not_executed`;
when one was attempted and failed, it is `blocked` with the reason.

---

## 4. Semantic operations

`HarmonyScenePatch` is a set of atomic operations, canonically ordered so that the same pair
of states always produces the same `deterministicHash`:

`add_node` · `remove_node` · `connect_nodes` · `disconnect_nodes` · `change_node_attribute` ·
`add_keyframe` · `remove_keyframe` · `move_keyframe` · `change_keyframe_value` ·
`change_curve_segment` · `change_peg_transform` · `set_drawing_substitution` ·
`shift_exposure` · `change_camera_property` · `unknown_structural_change`

Each operation carries `target`, `property`, `frame`/`frameRange`, `before`, `after`,
`confidence`, `evidenceRefs` and `reversible`.

### Provenance — the rule that keeps the dataset honest

| `origin` | Meaning | Confidence |
|---|---|---|
| `mcp_tool` | Executed through this server; parameters known exactly. Only assigned when a tool call claimed that exact target — and, if it stated them, that property and frame. | 1.0 |
| `harmony_manual` | Performed by a human in Harmony and reconstructed from the state diff. The exact UI command is **unknown** and is never guessed. | 1.0 for the measured delta |
| `inferred` | A merged reading of several low-level changes (`move_keyframe`, `shift_exposure`). | < 1.0 |

The engine reports *what* changed numerically. It never claims *why*. A record says
"the value of this column changed from 15 to 22 at frame 24", never "the animator applied
Ease In" and never "the animator made the motion more emotional". Artistic intent is read
only from the instruction field, and every exported entry repeats that limit in
`usageRestrictions.interpretationLimits`.

### Inference guards
- `move_keyframe` is only merged when exactly one removed and one added keyframe in the same
  column share a value. Ambiguous cases stay as separate add/remove operations.
- `shift_exposure` is only emitted when a single constant frame offset reproduces **every**
  changed frame in the range, and never for a single changed frame.
- Playhead scrubbing (`sceneSettings.currentFrame`) is not an edit and is not recorded.

---

## 5. Crash behaviour

Events are appended, never rewritten, so a killed process leaves a truncated log rather than
no log. A trailing partial line is dropped and reported as `truncatedTailBytes`.

A session left in `recording` state by a dead process is reported **and persisted** as
`interrupted` on the next `harmony.capture.status`. An interrupted session cannot be stopped,
approved or rejected — there is no verified final state to decide about.

---

## 6. Harmony-side notifier

`scripts/harmony/harmony_action_recorder.js` — a **static** QtScript. It never evaluates
strings supplied by a user or a model.

Install it into your Harmony scripts folder and run:

```javascript
startHarmonyActionRecorder("<sessionId>", "<evidenceDir from harmony.capture.start>");
// ... animate ...
stopHarmonyActionRecorder();
```

It subscribes to `SceneChangeNotifier` — `sceneChanged`, `networkChanged`, `nodeChanged`,
`nodeMetadataChanged`, `columnValuesChanged`, `currentFrameChanged`, `selectionChanged`,
`controlChanged`, `deformerReset`, `deformerResetCurrentFrame`, `sceneMarkersChanged` — and
appends one JSON line per signal.

Signatures were taken from the Harmony 25 Scripting Interface reference bundled with the local
installation (`Contents/Documentation/script/classSceneChangeNotifier.html`), not from memory.

**A signal is a hint, not evidence of an operation.** It only tells the recorder which region
may have changed; the normalized state is re-read after the debounce interval, and the patch
is computed from state, never from signals.

---

## 7. Configuration

| Variable | Default | Purpose |
|---|---|---|
| `HARMONY_CAPTURE_ARTIFACT_ROOT` | `<project>/artifacts/harmony-captures` | Evidence store root. |
| `HARMONY_CAPTURE_DEBOUNCE_MS` | `750` | Quiet period before dirty entities are re-read. |
| `HARMONY_CAPTURE_MAX_NODES` | `5000` | Refuses oversized scenes instead of truncating them. |
| `HARMONY_CAPTURE_MAX_COLUMNS` | `5000` | Same. |
| `HARMONY_CAPTURE_MAX_KEYFRAMES` | `100000` | Same. |
| `HARMONY_CAPTURE_MAX_EVENTS` | `50000` | Caps the event spool. |
| `HARMONY_CAPTURE_ALLOWED_SCENE_ROOTS` | falls back to `HARMONY_ALLOWED_ROOTS` | Comma-separated allowlist; paths are canonically resolved first. |
| `HARMONY_CAPTURE_REDACT_SCENE_PATHS` | `true` | Artifacts store `scenePathHash`, never the raw path. |
| `HARMONY_CAPTURE_REDACT_PATTERNS` | *(empty)* | Comma-separated strings that must never appear in an export. |
| `HARMONY_CAPTURE_CATEGORY_*` | `true` | Per-category capture switches (`NODES`, `CONNECTIONS`, `NODE_ATTRIBUTES`, `COLUMNS`, `KEYFRAMES`, `EXPOSURES`, `CAMERA`). A disabled category is emptied **and** warned about. |

---

## 8. Real Harmony status

Verified on this machine on 2026-07-27:

| Probe | Result |
|---|---|
| `/Applications/Harmony 25 Premium.app` | present |
| `import ToonBoom.harmony` | works (python 3.9.25) |
| `harmony.session()` with no GUI running | `Harmony is not currently running. Launch Harmony or Open a project first.` |
| `harmony.open_project(<scene>.xstage)` | **`RuntimeError: Invalid license`** |
| FlexNet license file | absent — `/usr/local/flexlm/licenses/license.dat` does not exist, `LM_LICENSE_FILE` unset |

⇒ **No real Harmony scene read was performed.** Evidence:
`docs/evidence/harmony-action-recorder-real-smoke/blocked.json`.

To attempt it once Harmony is licensed:

```bash
HARMONY_ACTION_RECORDER_REAL_SMOKE=1 HARMONY_ACTION_RECORDER_REAL_SCENE=/abs/path/to/disposable.xstage npx jest tests/integration/harmonyActionRecorder.realHarmony.smoke.test.ts
```

The test refuses to pass when Harmony is unreachable: it writes the runtime's verbatim
blocking reason and fails. A blocked run is never reported as a green verification.

**Before running it against a real scene**, work on a disposable copy. The recorder itself
does not modify scene content, but any manual edit you make during the capture is your own.

### Known gaps in the headless read path
The Python bridge does not expose Node View coordinates, node connections, per-frame exposures
or keyframe interpolation. `HarmonyBridgeSceneStateProvider` records a warning for each
(`node_view_coordinates_not_read_by_headless_bridge`, `node_connections_not_read_by_headless_bridge`,
`per_frame_exposures_not_read_by_headless_bridge`, `keyframe_interpolation_not_read_by_headless_bridge`)
rather than inventing values. Closing those gaps needs the in-GUI QtScript path.
