# Harmony Contract Simulator

A deterministic model of the Harmony command contract, so a `HarmonyCommandPlanV5` can be
executed, verified, snapshotted and read back **without Toon Boom Harmony**.

> **This is not Harmony.** It cannot author TVG geometry, cannot render, cannot open an
> `.xstage`, and cannot tell you whether Harmony would accept the same command. The highest
> verification level anything here can reach is `simulator_verified`. Nothing in this component
> may ever be presented as real Harmony execution — `isRealHarmonyExecution: false` is a schema
> *literal*, so the opposite claim is unrepresentable, not merely discouraged.

```bash
npm run demo:harmony:simulator-roundtrip
npm run test:simulator
```

---

## 1. What it actually does

```
RigManifestV1 ──► RigCompatibilityValidator ──► (blocks on any error)
                                │
SimulatedSceneStateV1 ──────────┼──► HarmonyContractSimulator ──► new immutable state
HarmonyCommandPlanV5 ───────────┘                │
                                                 ├──► SimulatorExecutionResultV1
                                                 ├──► HarmonySnapshotStore (atomic write)
                                                 ├──► SceneReadbackV1
                                                 ├──► diffScenes
                                                 └──► structural_offline_qa
```

The simulator really mutates a canonical scene. It is not a mock that returns success: it checks
preconditions, verifies postconditions, refuses invalid commands with typed errors, rolls back
atomically and enforces idempotency.

State is passed in and returned. There is no module-level mutable scene, so two simulators over
the same rig cannot observe each other.

## 2. Command coverage — 41 types, all classified

Every V5 command type is either **handled** or **refused with a stated reason**. There is no
third category and nothing is silently skipped (`SIMULATOR_COMMAND_NOT_SUPPORTED` is a typed
error carrying the list of supported types).

**Handled (25):** `create_node` `delete_node` `rename_node` `create_peg` `create_group`
`create_camera` `connect_nodes` `disconnect_nodes` `create_drawing_element` `create_drawing`
`set_exposure` `set_drawing_substitution` `set_switch_selection` `create_sound_column`
`set_function_point` `set_function_interpolation` `set_transform_keyframe` `set_camera_keyframe`
`set_pivot` `set_attribute` `attach_drawing_to_peg` `create_palette` `add_palette_swatch`
`snapshot_project`¹ `inspect_native_entities`¹

¹ recognised and recorded in history, but state-neutral by definition.

**Refused, with the reason (16):**

| Command | Why it is refused |
|---|---|
| `write_vector_path` | authoring TVG geometry requires the real Harmony drawing engine |
| `import_bitmap_drawing` | requires the real Harmony element manager |
| `import_audio` | requires the real Harmony sound engine |
| `create_deformation_chain` / `create_bone_deformer` / `create_curve_deformer` / `set_deformer_keyframe` | deformer chains are not modelled by the v1 scene |
| `configure_write_node` | only matters to a real renderer |
| `render_preview` / `render_final` / `compare_render` | rendering requires the real renderer |
| `save_project` / `close_project` / `reopen_project` | project lifecycle is meaningless without the application |
| `rollback_snapshot` / `verify_rollback` | rollback is the snapshot store's job, not an in-plan command |

### Two additive V5 command types

`rename_node` and `set_switch_selection` were added to the V5 discriminated union. Growing a
union is backward compatible — every plan written against the original 39-member set still
parses — and `tests/mlContracts/harmonyCommandPlanV5.test.ts` asserts the original set
explicitly rather than by count.

## 3. Contracts

| Schema | Purpose |
|---|---|
| `RigManifestV1` / `RigControllerV1` | what a rig declares: controllers, channels, limits, hierarchy, IK chains, switch drawings, mouth chart, eye controls, capabilities, coordinate system |
| `SimulatedSceneStateV1` | the canonical scene: nodes, connections, attributes, columns, keyframes, exposures, substitutions, switches, palettes, cameras, controller bindings, metadata, revision, command history, artifact references, content hash |
| `SimulatorExecutionResultV1` | per-command outcomes, before/after hashes, rollback status, and the four honesty literals |
| `SceneReadbackV1` | a normalised projection that can be compared directly |
| `SimulatedSceneDiffV1` | order-independent structural diff with configurable tolerance |
| `RigCompatibilityReportV1` | findings, coverage and a hard `compatible` gate |
| `StructuralOfflineQaReportV1` | 12 structural checks, explicitly labelled non-visual |

No `any` anywhere. Command params are a discriminated union with one `.strict()` schema per type.

### Honesty is enforced by the type system

`SimulatorExecutionResultV1` declares:

```ts
isRealHarmonyExecution: z.literal(false)
realInferenceExecuted:  z.literal(false)
simulated:              z.literal(true)
requiresRealHarmony:    z.literal(true)
```

Editing any of them to the opposite value fails validation. The refinements additionally make
these unrepresentable: a dry run that advanced the revision, a rollback that did not restore the
before-hash, a `succeeded` result carrying rejections, and a `failed` result with no error code.

## 4. Canonical hashing

`computeSceneContentHash` is a SHA-256 over a key-sorted, collection-sorted projection of the
**logical** scene. Deliberately excluded: `revision`, `commandHistory`, `artifactReferences` and
the hash field itself — so the same plan applied on a different machine at a different time
produces the same hash.

Proven by test: independent of collection order, independent of JSON property insertion order at
every depth, unchanged by revision/history noise, and changed by any real content change.

## 5. Transactions

| Mode | Behaviour |
|---|---|
| `atomic` (default) | any rejection restores the exact input state; `rollbackVerified` compares hashes and throws `SIMULATOR_ROLLBACK_FAILED` if they differ |
| `non_atomic` | keeps the applied prefix — **diagnostic only**, so a developer can see how far a broken plan got |
| `dry_run` | produces a real structural diff and returns the untouched state; the schema forbids a dry run from advancing the revision |

Bounded execution: `maxCommands`, `maxNodes`, `maxKeyframes` and `timeoutMs`. Cancellation is an
`AbortSignal`; an aborted atomic plan rolls back completely.

### Idempotency

Command idempotency keys are **scene-global**, not plan-scoped. A key identifies an *operation*,
so the same operation carried by a later plan is recognised as `already_applied`. A plan whose
commands are all present returns `already_applied` for the whole plan without re-executing.

Re-applying the demo's 181-command plan yields: 181 already-applied, 0 applied, identical node,
key, column and swatch counts, unchanged revision and hash.

## 6. Snapshot store

Atomic write (temp file + `rename`), two independent integrity layers, and a migration hook map.

| Attack | Result |
|---|---|
| truncated / non-JSON file | `SNAPSHOT_CORRUPT` |
| payload edited, checksum untouched | `SNAPSHOT_CHECKSUM_MISMATCH` |
| payload edited **and** checksum recomputed | `SNAPSHOT_CORRUPT` — the state's own content hash no longer describes it |
| unknown schema version | `SNAPSHOT_SCHEMA_UNSUPPORTED` |
| `sceneId` of `../escape`, `/absolute`, `a/b` | `SNAPSHOT_PATH_REJECTED` |
| symlink inside the store pointing out of it | `SNAPSHOT_PATH_REJECTED` (both sides are realpath-resolved) |
| corrupt file in the directory | not listed as an available revision |

The round-trip **drops the in-memory object** and reads the bytes back off disk. Handing the same
object back would prove nothing about persistence.

## 7. Rig fixtures

Hand-authored JSON. No `.xstage`, no third-party or protected asset.

| Fixture | Purpose |
|---|---|
| `simple_humanoid_v1` | torso, head, shoulders, elbows, hands, mouth switch; 24 fps, 1920×1080 |
| `stylized_big_head_v1` | oversized head with scale channels, shorter arms, 12 fps, 1280×720 |
| `asymmetric_character_v1` | unpaired limbs, different limits per side, `onViolation: reject` on the right arm |
| `invalid_rig_v1` | **eight deliberate defects** for negative tests: parent cycle, missing parent, duplicate alias, non-reciprocal mirror, duplicate node path, IK chain naming a ghost controller, switch selecting an undeclared drawing, channel mapping onto an unaccepted channel |

Initial scenes are **executed**, not hand-written: a deterministic bootstrap plan derived from the
manifest creates every node, element and palette, and the simulator applies it. A hand-authored
scene could drift from its manifest without anything noticing.

## 8. structural_offline_qa

The name is the contract. Twelve checks: orphan nodes, connection cycles, keys outside the scene,
duplicate keyframes, NaN/Infinity, controller limit violations, unknown drawing substitutions,
invalid exposure ranges, excessive rotation step, excessive translation step, excessive key count,
missing required controllers.

`visualReviewPerformed: false` and `renderInspected: false` are literals in the report. It cannot
see the scene and has no opinion on timing, staging or appeal.

## 9. MCP surface

Additive; no existing tool name changed.

`harmony.simulator.` + `list_rigs` · `validate_rig` · `create_scene` · `execute_plan` · `dry_run` ·
`readback` · `save_snapshot` · `load_snapshot` · `list_revisions` · `compare_revisions` ·
`rollback` · `structural_qa` · `cancel` · `get_evidence`

Mutating tools accept `correlationId`, `idempotencyKey`, `timeoutMs`, `cancelToken` and `dryRun`.
`execute_plan` runs the compatibility gate first and refuses to execute an incompatible plan.

## 10. Round-trip evidence

`output/evidence/harmony-simulator-roundtrip/<runId>/` — 16 artifacts, each SHA-256 hashed in
`hashes.json`, re-verifiable with `verifyEvidenceHashes`.

`acceptance-status.json` states, in machine-readable form:

```json
{
  "observedExecutionMode": "simulation",
  "isRealHarmonyExecution": false,
  "realHarmonyAvailable": false,
  "verificationLevel": "simulator_verified",
  "requiresRealHarmony": true
}
```

and lists what the run did **not** prove: Harmony was never invoked, no `.xstage` was touched, no
render was produced, and the rig manifests are fixtures rather than captures.

## 11. What still requires real Harmony

Everything downstream of command compilation: executing a plan against a real scene, `.xstage`
read/write, deformer chains, TVG authoring, rendering, visual QA, and any claim that a compiled
plan would actually apply. `harmony.real_executor` is registered as `not_implemented` with that
blocking reason recorded.
