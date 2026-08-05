#!/usr/bin/env node --experimental-strip-types
// Real TypeScript harness invoked from the Python slice runner.
// Loads PoseSequenceV2 from disk, runs the production compiler, runs the
// V5 invariant checks, and prints a single JSON summary to stdout.
//
// Args: <pir-json-path> <plan-json-path>
// Env: HARMONY_SLICE_RIG must carry a JSON rig definition.

import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');

const [, , pirArg, planArg] = process.argv;
if (!pirArg || !planArg) {
  console.error('usage: compile_dwpose_to_harmony_harness.mjs <pir-json> <plan-json>');
  process.exit(2);
}
const rigJson = process.env.HARMONY_SLICE_RIG;
if (!rigJson) {
  console.error('HARMONY_SLICE_RIG env var must carry a JSON rig definition');
  process.exit(2);
}

const compilerPath = resolve(REPO_ROOT, 'src', 'services', 'poseRetargetCompiler', 'index.ts');
const schemaPath = resolve(REPO_ROOT, 'src', 'schemas', 'harmonyCommandPlanV5.ts');
const mlSchemaPath = resolve(REPO_ROOT, 'src', 'schemas', 'ml.ts');
const errorPath = resolve(REPO_ROOT, 'src', 'errors', 'mlErrorRegistry.ts');

const rig = JSON.parse(rigJson);
const pir = JSON.parse(readFileSync(pirArg, 'utf-8'));

const compilerMod = await import(compilerPath);
const schemaMod = await import(schemaPath);
const errorMod = await import(errorPath);

const plan = compilerMod.buildRetargetingPlan(pir, rig);
const harmony = compilerMod.compileToHarmonyPlan(plan, {
  manifestId: 'dwpose_to_harmony_slice_' + plan.planId,
  shotId: 'slice_shot',
  sourceManifestSha256: plan.inputHash,
  requiresRealHarmony: false,
  executionMode: 'offline_deterministic',
  contributingMlJobIds: [pir.provenance.jobId],
});

const invariants = schemaMod.checkPlanInvariants(harmony);
const rawKeyCount = plan.channels.reduce((acc, c) => acc + c.rawKeyCount, 0);
const reducedKeyCount = plan.channels.reduce((acc, c) => acc + c.keys.length, 0);
const maxError = plan.channels.reduce((acc, c) => Math.max(acc, c.reconstructionError), 0);
const clampedFrames = plan.channels.reduce((acc, c) => acc + c.clampedSourceFrames.length, 0);

const summary = {
  status: 'compiled',
  planStatus: harmony.status,
  plan: harmony,
  commandCount: harmony.commands.length,
  channelCount: plan.channels.length,
  rawKeyCount,
  reducedKeyCount,
  maxReconstructionErrorDegrees: maxError,
  clampedFrameCount: clampedFrames,
  realInferenceExecuted: Boolean(pir && pir.provenance && pir.provenance.realInferenceExecuted),
  invariantViolations: invariants.map((v) => ({ rule: v.rule, commandId: v.commandId ?? null, detail: v.detail })),
};

writeFileSync(planArg, JSON.stringify(harmony, null, 2));
process.stdout.write(JSON.stringify(summary));
