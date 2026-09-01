# Moho 95% Production Autonomy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove that the project can create production-ready Moho rigs and animation for one approved show without manual Moho edits in at least 95% of standard cases.

**Architecture:** Keep Moho Production v3 as the single stateful pipeline. Add a measurable 95% certification profile, configurable real model providers, deeper native Moho verification, temporal animation QA, retake-memory retrieval, and a real 40-shot benchmark runner. Human participation is limited to the existing three director approval gates; rigger and animator edits are forbidden in certified cases.

**Tech Stack:** TypeScript 5.5, Jest, Zod, MCP SDK, Moho Pro 14 Lua/CLI, OpenRouter/Anthropic/OpenAI providers, Rhubarb Lip Sync, ffmpeg/ffprobe, SQLite.

**Spec:** `docs/moho-production-v3.md`

## Global Constraints

- Target is one frozen show: approved characters, style, rig rules, shot vocabulary, and motion grammar.
- Rig target: at least 19 of 20 conforming character packs produce verified `.moho` files without manual rig edits.
- Animation target: at least 38 of 40 benchmark shots produce approved `.moho` and `.mp4` files without rigger or animator participation.
- A passing shot may use at most two automated/director-requested retakes across all gates.
- The director must approve `rig_blueprint`, `key_pose_animatic`, and `final_render`.
- All claimed native features must survive real Moho open, save, close, reopen, render, and structural audit.
- Mocked unit tests never count as production evidence.
- Every model call records provider, model, request hash, response hash, and cost metadata.
- Imports stay at the top of TypeScript modules.
- Every TypeScript switch over a discriminated union or enum has an exhaustive `never` default.

---

### Task 1: Clear the real-Moho blocker

**Status:** Blocked — установленный Moho 14.4 сообщает `SOAP invalid license number` и остаётся в режиме Debut.

**Files:**
- Modify: `docs/evidence/moho-production-v3/native-live-test-2026-08-31.md`
- Test: `tests/integration/mohoProductionV3.realMoho.test.ts`
- Verify: `src/services/mohoProductionV3NativeBackend/index.ts`

**Interfaces:**
- Consumes: active Moho Pro 14 license with command-line rendering.
- Produces: one non-empty `.moho`, one non-empty H.264 `.mp4`, open/save/reopen evidence, and a passing native integration test.

- [ ] **Step 1: Activate Moho Pro 14 and confirm the CLI license**

Run:

```bash
/Applications/Moho.app/Contents/MacOS/Moho -r /absolute/path/to/a/valid/test.moho -start 1 -end 1 -f PNG -o /tmp/moho-license-check.png
```

Expected: no `Pro level feature only` message and a non-empty PNG output.

- [ ] **Step 2: Run the existing real native acceptance test**

Run:

```bash
RUN_REAL_MOHO_TESTS=1 npm test -- --runInBand tests/integration/mohoProductionV3.realMoho.test.ts
```

Expected: PASS; the test proves binding, Smart Action, Smart Warp, mesh, shadow, reopen, and render in real Moho.

- [ ] **Step 3: Preserve native evidence**

Record exact command, Moho version, elapsed time, artifact paths, SHA-256 hashes, and ffprobe output in `docs/evidence/moho-production-v3/native-live-test-2026-08-31.md`.

- [ ] **Step 4: Run the complete v3 regression suite**

Run:

```bash
npm run typecheck
npm run test:moho:v3
```

Expected: typecheck passes and all v3 suites pass.

- [ ] **Step 5: Commit the evidence**

```bash
git add docs/evidence/moho-production-v3/native-live-test-2026-08-31.md
git commit -m "test: verify Moho v3 against licensed Pro runtime"
```

---

### Task 2: Add a truthful 95% certification profile

**Status:** Completed — профиль `production95`, CLI и тесты реализованы; локальный commit пропущен, чтобы не захватить существующие незакоммиченные файлы пользователя.

**Files:**
- Create: `src/services/mohoProductionV3Certification/production95.ts`
- Create: `tests/mohoProductionV3Certification95.test.ts`
- Modify: `scripts/certify_moho_v3_benchmark.mjs`
- Modify: `docs/moho-production-v3.md`

**Interfaces:**
- Consumes: `MohoProductionV3BenchmarkCase[]` from `src/services/mohoProductionV3Certification/index.ts`.
- Produces: `certifyMohoProductionV3At95Percent(cases): MohoProductionV3Certification95Report`.

- [x] **Step 1: Write the failing certification tests**

Add tests proving:

```ts
expect(certifyMohoProductionV3At95Percent(makeCases(38, 2)).certified).toBe(true);
expect(certifyMohoProductionV3At95Percent(makeCases(37, 3)).certified).toBe(false);
expect(certifyMohoProductionV3At95Percent(withManualEdit).certified).toBe(false);
expect(certifyMohoProductionV3At95Percent(withAnimatorParticipation).certified).toBe(false);
```

- [x] **Step 2: Verify the new tests fail**

Run:

```bash
npx jest --runInBand tests/mohoProductionV3Certification95.test.ts
```

Expected: FAIL because `certifyMohoProductionV3At95Percent` does not exist.

- [x] **Step 3: Implement the 40-shot certification contract**

Export:

```ts
export interface MohoProductionV3Certification95Report {
  certified: boolean;
  totalShots: 40;
  autonomousPasses: number;
  autonomousRate: number;
  failedShotIds: string[];
  failures: string[];
}

export function certifyMohoProductionV3At95Percent(
  cases: MohoProductionV3BenchmarkCase[]
): MohoProductionV3Certification95Report;
```

Require exactly 40 cases, at least 38 autonomous passes, valid artifact hashes, all three approvals, zero manual Moho edits, no rigger/animator participation, native round-trip, technical QA, artistic QA, and ffprobe success.

- [x] **Step 4: Add a CLI mode**

Support:

```bash
npm run moho:v3:certify -- --profile production95 /absolute/path/to/benchmark.json
```

Exit `0` only when `certified === true`; otherwise print every failed shot and exit non-zero.

- [x] **Step 5: Run tests; commit intentionally deferred**

```bash
npx jest --runInBand tests/mohoProductionV3Certification.test.ts tests/mohoProductionV3Certification95.test.ts
git add src/services/mohoProductionV3Certification/production95.ts tests/mohoProductionV3Certification95.test.ts scripts/certify_moho_v3_benchmark.mjs docs/moho-production-v3.md
git commit -m "feat: add 95 percent Moho production certification"
```

---

### Task 3: Define and validate a production character pack

**Files:**
- Create: `src/schemas/mohoCharacterAssetPackV1.ts`
- Create: `src/services/mohoCharacterAssetPackValidator/index.ts`
- Create: `src/tools/mohoCharacterAssetPackTools.ts`
- Create: `tests/mohoCharacterAssetPack.test.ts`
- Modify: `src/index.ts`
- Modify: `docs/moho-production-v3.md`

**Interfaces:**
- Produces: `validateMohoCharacterAssetPack(packPath): CharacterAssetPackValidationReport`.
- Produces MCP tool: `moho.character_pack.validate`.
- Supplies normalized layered assets to the existing `decomposition` stage.

- [ ] **Step 1: Write failing schema and validator tests**

Cover required body layers, stable IDs, front/three-quarter/side views, mouth choices, eye states, hand choices, joint overlap margins, transparent PNG/SVG files, and source hashes.

```ts
expect(() => mohoCharacterAssetPackV1Schema.parse(validPack)).not.toThrow();
expect(validateMohoCharacterAssetPack(packWithoutElbowOverlap).valid).toBe(false);
expect(validateMohoCharacterAssetPack(packWithDuplicateLayerIds).valid).toBe(false);
```

- [ ] **Step 2: Verify tests fail**

```bash
npx jest --runInBand tests/mohoCharacterAssetPack.test.ts
```

- [ ] **Step 3: Implement the strict asset contract**

The schema must require:

```ts
type MohoCharacterAssetPackV1 = {
  schemaVersion: '1.0';
  characterId: string;
  canvas: { width: number; height: number };
  views: Array<'front' | 'three_quarter' | 'side' | 'back'>;
  layers: Array<{
    layerId: string;
    kind: 'body' | 'head' | 'limb' | 'mouth' | 'eye' | 'hand' | 'accessory';
    sourcePath: string;
    parentLayerId: string | null;
    jointOverlapPx: number;
    sha256: string;
  }>;
};
```

Reject missing files, empty images, hash mismatches, duplicate IDs, unsupported extensions, absent mouth/eye choices, and zero overlap on articulated limbs.

- [ ] **Step 4: Register the MCP validator and test it**

```bash
npx jest --runInBand tests/mohoCharacterAssetPack.test.ts tests/mohoProductionV3Tools.test.ts
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/schemas/mohoCharacterAssetPackV1.ts src/services/mohoCharacterAssetPackValidator src/tools/mohoCharacterAssetPackTools.ts tests/mohoCharacterAssetPack.test.ts src/index.ts docs/moho-production-v3.md
git commit -m "feat: validate production Moho character packs"
```

---

### Task 4: Make flat-art reconstruction use a real configurable image provider

**Files:**
- Create: `src/adapters/mohoProductionProviders/factory.ts`
- Create: `tests/mohoProductionV3ProviderFactory.test.ts`
- Modify: `src/services/mohoProductionV3StageExecutor/index.ts`
- Modify: `src/adapters/mohoProductionProviders/index.ts`
- Modify: `.env.example`
- Modify: `docs/CONFIGURATION.md`

**Interfaces:**
- Produces: `createMohoProductionProvidersFromEnv(): { planner: PlannerProvider; artworkProvider: ArtworkProvider }`.
- The stage executor consumes separate planning and artwork providers.

- [ ] **Step 1: Write failing provider-selection tests**

```ts
expect(createMohoProductionProvidersFromEnv({
  MOHO_PLANNER_PROVIDER: 'openrouter',
  MOHO_ARTWORK_PROVIDER: 'openai'
}).artworkProvider).toBeInstanceOf(OpenAiArtworkProvider);

expect(() => createMohoProductionProvidersFromEnv({
  MOHO_ARTWORK_PROVIDER: 'openai'
})).toThrow(/OPENAI_API_KEY/);
```

- [ ] **Step 2: Verify tests fail**

```bash
npx jest --runInBand tests/mohoProductionV3ProviderFactory.test.ts
```

- [ ] **Step 3: Implement explicit provider routing**

Support these exact values:

```text
MOHO_PLANNER_PROVIDER=openrouter|anthropic
MOHO_ARTWORK_PROVIDER=openrouter|openai
MOHO_MAX_IMAGE_CALLS_PER_SHOT=24
```

Keep the current free-only OpenRouter policy. Permit paid image completion only through the explicitly selected OpenAI provider. Fail before any request when credentials or budgets are missing.

- [ ] **Step 4: Route the v3 executor through the factory**

Replace the hard-coded single OpenRouter instance in `createMohoProductionV3StageExecutor()` with the returned planner and artwork provider. Preserve dependency injection used by unit tests.

- [ ] **Step 5: Verify real image artifacts and provenance**

Add a test that returns real PNG bytes through the provider client seam and asserts that the decomposition checkpoint records provider, model, request hash, response hash, and generated-part count.

- [ ] **Step 6: Run tests and commit**

```bash
npx jest --runInBand tests/mohoProductionV3Providers.test.ts tests/mohoProductionV3ProviderFactory.test.ts tests/mohoProductionV3StageExecutor.test.ts
npm run typecheck
git add src/adapters/mohoProductionProviders/factory.ts src/adapters/mohoProductionProviders/index.ts src/services/mohoProductionV3StageExecutor/index.ts tests/mohoProductionV3ProviderFactory.test.ts .env.example docs/CONFIGURATION.md
git commit -m "feat: route Moho artwork reconstruction to configured provider"
```

---

### Task 5: Prove native rig quality on production-sized characters

**Files:**
- Create: `tests/integration/mohoProductionV3.realRigSuite.test.ts`
- Create: `fixtures/moho95/characters/README.md`
- Modify: `pipeline/tools/moho_native_acceptance.py`
- Modify: `src/services/mohoProductionQualityAuditor/index.ts`
- Modify: `docs/capability_registry.json`

**Interfaces:**
- Consumes: 20 licensed character packs conforming to Task 3.
- Produces: native structural reports for bones, parent graph, bindings, switches, Smart Actions, Smart Warp meshes, Vitruvian groups, and layer ordering.

- [ ] **Step 1: Add a failing real-rig suite**

For every fixture, compile, open, save, close, reopen, render diagnostic frames, and compare the reopened project against its blueprint.

```ts
expect(report.bonesMatch).toBe(true);
expect(report.bindingsMatch).toBe(true);
expect(report.smartActionsMatch).toBe(true);
expect(report.smartWarpMatch).toBe(true);
expect(report.switchesMatch).toBe(true);
expect(report.renderedDiagnosticFrames).toHaveLength(3);
```

- [ ] **Step 2: Verify the suite catches a deliberately broken binding**

Run the suite with one fixture whose forearm binding references the wrong bone. Expected: FAIL with the exact character ID and binding mismatch.

- [ ] **Step 3: Extend native acceptance output**

Add typed JSON fields for saved bone IDs, layer IDs, binding pairs, switch choices, action drivers/targets, mesh point counts, and Vitruvian membership. Do not infer success from process exit code alone.

- [ ] **Step 4: Run the licensed real-rig suite**

```bash
RUN_REAL_MOHO_TESTS=1 npm test -- --runInBand tests/integration/mohoProductionV3.realRigSuite.test.ts
```

Expected: at least 19 of 20 character packs pass without any manual Moho edit.

- [ ] **Step 5: Commit evidence and capability status**

```bash
git add tests/integration/mohoProductionV3.realRigSuite.test.ts fixtures/moho95/characters pipeline/tools/moho_native_acceptance.py src/services/mohoProductionQualityAuditor/index.ts docs/capability_registry.json
git commit -m "test: prove production-sized Moho rig generation"
```

---

### Task 6: Add temporal animation QA instead of checking three still frames

**Files:**
- Create: `src/services/mohoTemporalQa/index.ts`
- Create: `src/schemas/mohoTemporalQa.ts`
- Create: `tests/mohoTemporalQa.test.ts`
- Modify: `src/services/mohoProductionV3StageExecutor/index.ts`
- Modify: `src/schemas/mohoProductionV3.ts`

**Interfaces:**
- Produces: `evaluateMohoTemporalQa(input): Promise<MohoTemporalQaReport>`.
- The `qa` stage consumes the report and blocks delivery on any hard failure.

- [ ] **Step 1: Write failing temporal QA tests**

Cover foot sliding during a planted interval, limb-length jumps, controller discontinuity, camera jumps, frozen holds, lip-sync drift, switch flicker, and collisions.

```ts
expect(report.footSliding.passed).toBe(false);
expect(report.controllerContinuity.passed).toBe(true);
expect(report.lipsync.maxDriftFrames).toBeLessThanOrEqual(2);
```

- [ ] **Step 2: Verify tests fail**

```bash
npx jest --runInBand tests/mohoTemporalQa.test.ts
```

- [ ] **Step 3: Implement deterministic motion checks**

Use the final performance keys and rig blueprint for controller continuity, limb-length consistency, contact intervals, switch stability, and camera velocity. Use ffmpeg-extracted frames only for rendered continuity and visual defect checks.

- [ ] **Step 4: Sample enough of the rendered shot**

Replace the fixed first/middle/last QA sample with every sixth frame plus all key-pose frames and all frames adjacent to switch changes. Cap vision-provider images by creating contact sheets when the provider limit would be exceeded.

- [ ] **Step 5: Make temporal failures block delivery**

Store the temporal report in the QA checkpoint. Require `temporal.passed === true` inside `assertDeliveryEvidence()`.

- [ ] **Step 6: Run tests and commit**

```bash
npx jest --runInBand tests/mohoTemporalQa.test.ts tests/mohoProductionV3StageExecutor.test.ts tests/mohoProductionV3Orchestrator.test.ts
npm run typecheck
git add src/services/mohoTemporalQa src/schemas/mohoTemporalQa.ts tests/mohoTemporalQa.test.ts src/services/mohoProductionV3StageExecutor/index.ts src/schemas/mohoProductionV3.ts
git commit -m "feat: add temporal QA for Moho animation"
```

---

### Task 7: Feed approved retakes back into planning

**Files:**
- Create: `src/services/mohoProductionV3RetakeMemory/index.ts`
- Create: `tests/mohoProductionV3RetakeMemory.test.ts`
- Modify: `src/services/mohoProductionV3StageExecutor/index.ts`
- Reuse: `src/services/mohoRetakeDataset/index.ts`
- Reuse: `src/services/seriesMemory/mohoExtension.ts`

**Interfaces:**
- Produces: `findRelevantRetakes(input): RetakeMemoryExample[]`.
- Consumes: character ID, rig topology, shot type, failed QA categories, and director corrections.
- Supplies at most five verified examples to rig, performance, and final-animation prompts.

- [ ] **Step 1: Write failing retrieval tests**

```ts
expect(findRelevantRetakes({ characterId: 'hero', shotType: 'dialogue_closeup' }))
  .toEqual(expect.arrayContaining([expect.objectContaining({ characterId: 'hero' })]));
expect(findRelevantRetakes({ characterId: 'unknown', shotType: 'dialogue_closeup' })).toEqual([]);
```

- [ ] **Step 2: Verify tests fail**

```bash
npx jest --runInBand tests/mohoProductionV3RetakeMemory.test.ts
```

- [ ] **Step 3: Implement deterministic retrieval**

Rank only approved examples by exact character, rig type, shot type, QA category, then recency. Return no more than five examples and include their artifact hashes.

- [ ] **Step 4: Inject examples into the three planning stages**

Add retrieved examples to `rig_blueprint`, `performance_plan`, and `final_animation` prompts. Never allow an example to override the current blueprint IDs or approved key poses.

- [ ] **Step 5: Persist successful corrections**

After final approval, store the before/after plan, director instruction, QA category, character ID, shot type, and artifact hashes through the existing retake dataset.

- [ ] **Step 6: Run tests and commit**

```bash
npx jest --runInBand tests/mohoProductionV3RetakeMemory.test.ts tests/mohoRetakeDatasetTranslator.test.ts tests/mohoProductionV3StageExecutor.test.ts
npm run typecheck
git add src/services/mohoProductionV3RetakeMemory tests/mohoProductionV3RetakeMemory.test.ts src/services/mohoProductionV3StageExecutor/index.ts
git commit -m "feat: reuse approved Moho retakes in production planning"
```

---

### Task 8: Run the real 40-shot benchmark

**Files:**
- Create: `scripts/run_moho_v3_95_benchmark.mjs`
- Create: `fixtures/moho95/benchmark-manifest.json`
- Create: `docs/evidence/moho-production-v3/production95-report.json`
- Create: `docs/evidence/moho-production-v3/production95-summary.md`
- Modify: `package.json`
- Modify: `docs/capability_registry.json`
- Modify: `docs/HONEST_REPLACEMENT_STATUS.md`

**Interfaces:**
- Consumes: licensed Moho Pro, approved show package, character packs, briefs, WAV files, and configured providers.
- Produces: a hash-verified benchmark manifest compatible with `certifyMohoProductionV3At95Percent()`.

- [ ] **Step 1: Create a balanced benchmark manifest**

Include exactly 40 shots:

```text
20 dialogue shots
8 silent acting shots
6 locomotion/action shots
4 two-character interaction shots
2 prop/camera-combination shots
```

Cover close, medium, and full shots; front, three-quarter, and side views; short and long dialogue; holds, gestures, walks, sits, turns, hand contacts, and occlusions.

- [ ] **Step 2: Implement the resumable runner**

Add:

```bash
npm run moho:v3:benchmark95 -- /absolute/path/to/benchmark-manifest.json
```

The runner starts each v3 job, resumes after approvals, records retakes, wall time, model calls, model cost, failure category, artifact hashes, and participation flags. It must never mark a blocked or partially rendered shot as passed.

- [ ] **Step 3: Run a five-shot pilot**

Expected: five real `.moho` files and five real `.mp4` files; every failure is classified as asset, provider, rig, animation, native Moho, QA, or approval failure.

- [ ] **Step 4: Fix only repeated failure classes**

Promote a failure to implementation work only when it occurs in at least two pilot shots. Add a regression test before each fix, rerun the affected pilot shots, and preserve before/after evidence.

- [ ] **Step 5: Run all 40 shots**

```bash
npm run moho:v3:benchmark95 -- fixtures/moho95/benchmark-manifest.json
npm run moho:v3:certify -- --profile production95 docs/evidence/moho-production-v3/production95-report.json
```

Expected: at least 38 autonomous passes, zero manual Moho edits in passing cases, and no rigger/animator participation.

- [ ] **Step 6: Publish the honest result**

If the benchmark passes, promote `production.moho_v3_autonomous_shot` to `shot_verified` and state the exact frozen-show scope. If it fails, keep the current verification level and list the measured failure categories without quoting a replacement percentage.

- [ ] **Step 7: Commit benchmark evidence**

```bash
git add scripts/run_moho_v3_95_benchmark.mjs fixtures/moho95 package.json docs/evidence/moho-production-v3/production95-report.json docs/evidence/moho-production-v3/production95-summary.md docs/capability_registry.json docs/HONEST_REPLACEMENT_STATUS.md
git commit -m "test: measure 95 percent autonomous Moho production"
```

---

## Self-review

- Spec coverage: native Moho, character preparation, flat-art reconstruction, rig verification, animation quality, retakes, approvals, delivery evidence, and 95% certification are each assigned to a task.
- Placeholder scan: every task has explicit files, commands, expected results, and acceptance conditions.
- Type consistency: the 95% certification consumes the existing benchmark case type; provider routing preserves the existing planner/artwork interfaces; temporal QA is added to the existing QA checkpoint; retake memory reuses the current dataset.
