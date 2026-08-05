# ML Production OS — architecture and honest status

This document describes what the ML platform in this repository **is**, as of the
`feat/industrial-ml-production-os` work. Every claim below is backed by a test, an evidence
directory or a command you can run. `docs/capability_registry.json` is the machine-readable
authority; where this file and the registry disagree, the registry wins.

Baseline before this work: [`ML_PRODUCTION_BASELINE.md`](ML_PRODUCTION_BASELINE.md).

---

## 1. What actually runs a model today

**One model.** DWPose (`yolox_l.onnx` + `dw-ll_ucoco_384.onnx`, 335 MB, both digests
independently recomputed). Everything else in the catalog is metadata with no weights on disk.

```bash
npm run ml:doctor          # what this host can run, measured not guessed
npm run ml:models:verify   # re-hash every installed weight
```

## 2. The job path

```
MCP tool  ->  MlOrchestrator  ->  MlRuntimeClient  ->  POST /v2/jobs  ->  ProviderRegistry
                    |                                                          |
              SQLite job store                                            JobManager
              licence decisions                                        ArtifactStore
              provenance                                                ModelLoader
```

One protocol for every provider. The old `/jobs/execute` and `/infer/*` endpoints still exist as
**deprecated adapters** that translate into a V2 job and hold no inference logic of their own.

### Orchestrator interface

`submitJob`, `getJob`, `waitForJob`, `cancelJob`, `retryJob`, `selectProvider`,
`getProviderReadiness`, `getModelReadiness`, `invalidateCache`, `unloadModel`, `getMetrics`.

Exposed as MCP tools under `harmony.ml.v2.*`. **Every original `harmony.ml.*` tool name is
unchanged**; the V2 tools are additive (`tests/mlContracts/toolSurface.test.ts` enforces this).

### Idempotency

A resubmission with the same provider, model, revision, input digests, parameters and seed
returns the stored result with `cacheHit: true` instead of paying for inference again. The key is
enforced by a unique index in SQLite, not by a best-effort check.

### Retry policy

Retryability is a property of the **error code**, not of the call site:

| Retryable | Terminal |
|---|---|
| `ML_TRANSPORT_FAILED`, `ML_RUNTIME_UNAVAILABLE`, `ML_OOM` (only after unloading), `ML_WORKER_CRASHED` | `ML_INPUT_SCHEMA_INVALID`, `ML_OUTPUT_SCHEMA_INVALID`, `ML_LICENSE_BLOCKED`, `ML_WEIGHTS_HASH_MISMATCH`, `ML_PROMPT_INJECTION_DETECTED`, `ML_CANCELLED`, `ML_TIMEOUT` |

`npm run test:ml:contracts` — see `src/errors/mlErrorRegistry.ts` for the full table.

### Restart behaviour

Job state lives in SQLite (`ml_jobs`, `ml_job_attempts`) and, on the Python side, in
`services/ml-runtime/artifacts/jobs/*.json`. On startup both sides move anything still marked
in-flight to `interrupted` with `ML_WORKER_CRASHED`. A job that was running when the process died
is never left reporting `running` forever.

## 3. Contracts

### `src/schemas/ml.ts`

V1 is **unchanged byte-for-byte** so existing evidence keeps parsing. V2 is additive and adds
what V1 could not express:

* `modelExecutionProvenanceSchema` replaces every `provenance: z.any()`. It cannot represent a
  run that is simultaneously real and simulated, a real run with no weights digest, a negative
  duration, or a `completedAt` before `startedAt`.
* `confidenceSchema` bounds every confidence to `[0, 1]`.
* `coordinateSpaceSchema` records space, origin, axis direction, source resolution, pixel aspect
  ratio and the affine transform into Harmony field coordinates.
* `frameTimingSchema` rejects frame 0 when `frameBase` is 1, rejects inverted ranges and rejects
  a `frameCount` inconsistent with the range.
* `finiteNumberSchema` rejects NaN and ±Infinity, which bare `z.number()` accepts.
* Speech keeps **ASR words and forced-aligned phonemes in separate arrays**; phonemes cannot
  exist without a declared aligner.
* Segmentation labels come from a **closed ontology**; anything ungroundable is `unclassified`
  and must set `requiresHuman: true`.

`inspectPoseSequenceV1ForV2` reports exactly which V2 fields a V1 document cannot supply rather
than inventing them.

### `src/schemas/harmonyCommandPlanV5.ts`

V4 stays as the read parser for older evidence. V5 fixes:

| V4 | V5 |
|---|---|
| `params: z.record(z.any())` | Discriminated union, one strict params schema per command (39 types) |
| `commands.min(10)` | `min(1)` |
| `status: z.literal('implemented_unverified')` | 11-state lifecycle |
| `requiresRealHarmony: z.literal(true)` | `boolean` |
| no source attribution | every command names its `sourcePirId` and `sourcePirKind` |

`checkPlanInvariants` additionally catches ordering problems a schema cannot: a swatch added
before its palette, a rollback referencing a snapshot the plan never takes, a destructive plan
with no snapshot, and a TVG element claimed outside a real Harmony.

## 4. Model catalog

Three files, three lifetimes:

| File | Committed | Contains |
|---|---|---|
| `data/models/registry/catalog.json` | yes | upstream metadata only |
| `data/models/registry/catalog.schema.json` | yes | the schema |
| `data/models/registry/local-state.json` | **no** (gitignored) | what this machine has installed |

Physical location is `$HARMONY_MODEL_CACHE` (default `<projectRoot>/.model-cache`) plus the
catalog's logical `cacheKey`. **No committed file contains an absolute path or a user name.**

The old `models.json` was deleted. It contained four absolute paths under `/Users/…` and two
fabricated SHA-256 values (`…cf8cf8cf8cf8…` and `…9241924192419241`). `looksFabricated()` in
`src/services/modelCatalog/index.ts` now rejects that shape, and the check runs in
`npm run ml:catalog:validate`.

A file with no upstream digest carries `sha256: null` and `requiresQuarantineReview: true`.
`scripts/ml/download_model.py` puts such files in `data/quarantine`, prints the measured digest
and stops. Promoting it to trusted requires a human editing `catalog.json` — a reviewed commit.

## 5. Licence policy

Three gates, evaluated separately, because passing one says nothing about the others:

* `before_download` — may these bytes be fetched?
* `before_inference` — may this model be run for this purpose?
* `before_packaging` — may this output ship?

Rules that configuration cannot override:

* A permissive licence on GitHub **code** is not a licence for the **weights**, and neither is a
  licence for the **training data**. Three separate fields.
* Permission to run inference is **not** permission to fine-tune, redistribute derived weights,
  or reuse the training corpus. Separate `use` values, separate decisions.
* `COMMERCIAL_BUILD` defaults to **true**. `unknown`, NC, research-only, review-pending and
  territorially incompatible all **block**. A warning would not be a control.
* Missing `STUDIO_REGION` is **not** consent. A territorially restricted model with no declared
  region is refused.

### The evaluation override, and its limits

`ALLOW_LEGAL_REVIEW_PENDING=true` permits *running* a model whose licence review is still open,
so its technical behaviour can be measured. It is unreadable unless `COMMERCIAL_BUILD=false`, it
never applies at the packaging gate, and every decision it relaxes records
`LICENSE_REVIEW_PENDING_OVERRIDDEN` in the evidence. See
`output/evidence/ml/sprint2-dwpose-license-block/` for the default refusal.

### Current licence status: nothing is cleared

**Zero of 25 catalogued models have a signed licence verification.** `verifiedBy` is `null`
everywhere, because no upstream LICENSE or model card was independently read during this work.
Consequently `LicensePolicyEngine` blocks every model in commercial mode. That is the engine
working, not a cleared supply chain.

Specific positions that were reasoned about rather than merely defaulted:

* **LivePortrait → `preview_only`.** Its repository licence does not settle its status: the
  pipeline pulls transitive InsightFace detection/recognition checkpoints whose released models
  carry non-commercial restrictions. Until a permitted detector is substituted, it cannot feed a
  deliverable. MediaPipe Face Landmarker remains the measurable production source.
* **AudioCraft → `research_only`.** Its code licence and its weights licence are known to
  differ.
* **MuseTalk → `preview_only`.** Raster preview and audiovisual-sync reference only; its frames
  must never replace native mouth substitutions.
* **DWPose → `legal_review_required`.** The two files are hash-verified and produce real
  inference — that is a *verification* fact, not a *licence* fact. The checkpoint name indicates
  COCO-WholeBody and UBody training data whose terms must be read before any commercial claim.

## 6. Security posture

* Default bind is `127.0.0.1`. `ML_RUNTIME_ALLOW_REMOTE=true` additionally requires
  `ML_RUNTIME_API_KEY`, and the process refuses to start otherwise.
* Path guard: absolute paths and `..` rejected textually, then symlinks resolved and the **real**
  path re-checked against the allowed roots. A symlink planted inside the store cannot escape it.
* Archives are checked for expansion ratio and escaping members before extraction.
* Images are dimension-capped before decode.
* Pickle checkpoints (`.pt`, `.pth`) are only opened after their digest matches a trusted catalog
  entry — `torch.load` on an unverified pickle is arbitrary code execution.
* `trust_remote_code` is `false` in the catalog schema, by `z.literal(false)`.
* Untrusted text (subtitles, OCR, model captions) is scanned for instruction-shaped content and
  **reported**, never executed.
* Logs carry `jobId`, `correlationId`, `providerId`, `modelId`, stage and `errorCode`. Home
  directories and secret-shaped tokens are redacted.

## 7. Environment separation

| Environment | Python | Must NOT contain |
|---|---|---|
| `services/reconstruction-core` | 3.9 | torch, diffusers, CUDA — it runs next to Harmony |
| `services/ml-core` | 3.12 | heavy generative stacks |
| `services/ml-runtime` | 3.14 | — isolated heavy models live here |

Per-stack pins live in `services/ml-runtime/requirements/*.lock`. They are **hand-curated exact
pins of direct dependencies**, not `pip-compile --generate-hashes` output; the header of each
file says so. Every Git dependency is commented out until a commit SHA is pinned — `@main` is
forbidden.

```bash
node scripts/ml/run.mjs bootstrap --list
node scripts/ml/run.mjs bootstrap --stack pose --dry-run
```

## 8. Commands

Cross-platform (work on Windows; the original POSIX-only scripts are kept for compatibility):

```bash
npm run ml:doctor
npm run ml:catalog:validate
npm run ml:models:list
npm run ml:models:verify
npm run ml:models:install -- --model-id <id> --dry-run
npm run ml:smoke:dwpose
npm run test:ml:contracts
npm run demo:ml:production-slice
```

## 9. The vertical slice

`npm run demo:ml:production-slice` runs, in one command:

```
real DWPose inference -> PoseSequenceV2 -> RetargetingPlan -> HarmonyCommandPlanV5
-> offline verification -> evidence
```

Measured on `fixtures/video/cartoon_character_motion.mp4` (153 frames, licence documented in
`fixtures/video/cartoon_character_motion.source.json`):

| | |
|---|---|
| Real inference | yes, 30.3 s on CoreML/CPU |
| Weights digests in provenance | 2, both matching the catalog |
| Rig channels | 12 |
| Keys before reduction | 1476 |
| Keys kept | 798 (45.9 % reduced) |
| Max reconstruction error | 0.499° / 0.0098 field units, both within tolerance |
| Harmony commands | 800 |
| Offline checks | 9/9 |
| `harmonyApplied` | **false** |

Evidence: `output/evidence/ml/sprint2-slice1/`.

### What the slice does not prove

`harmonyApplied: false` and `isRealHarmonyExecution: false` are the honest result: Harmony is not
installed on the build host. A validated command plan is **not** evidence that an editable
Harmony scene exists. The final status is
`production_package_ready_for_harmony_execution`, never `released`.

## 10. Honest status by capability

| Capability | Level | Blocker |
|---|---|---|
| DWPose whole-body pose | `real_model_verified` | licence review open |
| Pose → Harmony command plan | `real_model_verified` (compile), **not executed** | requires real Harmony |
| Runtime provider architecture | `real_model_verified` | one provider only |
| ML orchestration | `offline_verified` | second real provider needed |
| Licence policy engine | `offline_verified` | zero signed licences |
| SAM 2, CoTracker, WhisperX, MFA, Rhubarb, LivePortrait, VoxCPM, CosyVoice, ToonCrafter, ToonComposer, AnimeInterp, AnimeInbet, Wan2.2, MangaNinjia, Qwen3-VL, Depth-Anything, RAFT, GroundingDINO | `planned` / `stub` | weights not installed, licences unread |

## 11. Terms deliberately not used

This document does not describe the system as "production-ready", "fully complete", "replacing a
studio" or "full automation", because the acceptance gates for those claims are not met: no
licence is cleared, no Harmony scene has been created, and one model of twenty-five has weights.
