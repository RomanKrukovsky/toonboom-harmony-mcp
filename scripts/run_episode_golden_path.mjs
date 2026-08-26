#!/usr/bin/env node
/**
 * Episode batch golden path — offline evidence runner.
 *
 * Compiles a whole episode (fixtures/show_bible/episode_e01_batch.json) in one
 * deterministic pass through the ShowBible-gated factory pipeline:
 *
 *   EpisodeBatch -> ShotManifest[] -> PerformancePIR[] -> RetargetingPlan[]
 *                -> HarmonyCommandPlanV4[]
 *
 * Writes the evidence bundle into docs/evidence/episode-batch-golden-path/
 * (per-shot artifacts, aggregate determinism digests, hashes.json), backing
 * the `production.episode_batch` registry entry.
 *
 * Requires `npm run build` first. No Harmony execution happens here: every
 * produced plan carries status `implemented_unverified` and
 * `requiresRealHarmony: true`.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import stringify from 'fast-json-stable-stringify';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

if (!fs.existsSync(path.join(root, 'dist', 'services', 'episodeBatchCompiler'))) {
  console.error('dist/ missing or stale. Run `npm run build` first.');
  process.exit(1);
}

const { ShowBibleLoader } = await import('../dist/services/showBibleLoader/index.js');
const { episodeBatchSchema } = await import('../dist/schemas/episodeBatch.js');
const {
  EpisodeBatchCompiler,
  stripVolatilePlanFields
} = await import('../dist/services/episodeBatchCompiler/index.js');
const { performancePirSchema } = await import('../dist/schemas/performancePir.js');
const { retargetingPlanSchema } = await import('../dist/schemas/retargetingPlan.js');
const { harmonyCommandPlanV4Schema } = await import('../dist/schemas/harmonyCommandPlanV4.js');

const BATCH_PATH = path.join(root, 'fixtures', 'show_bible', 'episode_e01_batch.json');
const BUNDLE_DIR = path.join(root, 'docs', 'evidence', 'episode-batch-golden-path');

function fail(msg) {
  console.error(`EPISODE GOLDEN PATH FAILED: ${msg}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

if (!fs.existsSync(BATCH_PATH)) fail('fixtures/show_bible/episode_e01_batch.json missing');
const batchInput = JSON.parse(fs.readFileSync(BATCH_PATH, 'utf8'));
const batchParse = episodeBatchSchema.safeParse(batchInput);
if (!batchParse.success) {
  fail(`episode batch failed schema validation: ${JSON.stringify(batchParse.error.errors)}`);
}
const batch = batchParse.data;

const loader = new ShowBibleLoader();
const loaded = loader.load(path.join(root, batch.showBibleRef));
const controllerMaps = loader.buildControllerMaps(loaded);

// Declared gesture curves (placeholder provenance until a commissioned rig
// defines real controller ranges). Unknown gestures stay HOLD with warnings.
const gestureLibrary = JSON.parse(
  fs.readFileSync(path.join(root, 'fixtures', 'show_bible', 'gesture_tracks_mira.json'), 'utf8')
);

// ---------------------------------------------------------------------------
// Pipeline (executed twice for the determinism gate)
// ---------------------------------------------------------------------------

function runPipeline() {
  const compiler = new EpisodeBatchCompiler();
  const result = compiler.compile(batch, loaded.crossRefs, {
    controllerMaps,
    gestureLibraries: [gestureLibrary]
  });

  if (result.status !== 'compiled') {
    fail(`batch rejected: ${JSON.stringify(result.rejections)}`);
  }

  for (const shot of result.shots) {
    if (!performancePirSchema.safeParse(shot.performance).success) {
      fail(`${shot.spec.shotId}: PerformancePIR failed schema validation`);
    }
    if (!retargetingPlanSchema.safeParse(shot.retargetingPlan).success) {
      fail(`${shot.spec.shotId}: RetargetingPlan failed schema validation`);
    }
    if (!harmonyCommandPlanV4Schema.safeParse(shot.commandPlan).success) {
      fail(`${shot.spec.shotId}: HarmonyCommandPlanV4 failed schema validation`);
    }
  }
  return result;
}

const runA = runPipeline();
const runB = runPipeline();

const digestOf = result =>
  sha256(
    stringify({
      shots: result.shots.map(s => ({
        shotId: s.spec.shotId,
        performance: s.performance,
        retargetingPlan: s.retargetingPlan,
        commandPlan: stripVolatilePlanFields(s.commandPlan)
      }))
    })
  );

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

const digestA = digestOf(runA);
const determinism = {
  checked: true,
  method:
    'two independent runs; SHA-256 over fast-json-stable-stringify of all volatile-stripped artifacts (planId/manifestId/createdAt are random per run by design)',
  episodeContentDigestMatch: digestA === digestOf(runB),
  episode_content_sha256: runA.episodeContentDigest
};
if (!determinism.episodeContentDigestMatch) fail('determinism double-run mismatch');

// ---------------------------------------------------------------------------
// Evidence bundle
// ---------------------------------------------------------------------------

fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
fs.mkdirSync(BUNDLE_DIR, { recursive: true });

const writeJson = (name, obj) =>
  fs.writeFileSync(path.join(BUNDLE_DIR, name), JSON.stringify(obj, null, 2) + '\n', 'utf8');

const safeShotId = id => id.toLowerCase().replace(/[^a-z0-9]+/g, '_');

for (const shot of runA.shots) {
  const base = `shot_${safeShotId(shot.spec.shotId)}`;
  writeJson(`${base}_manifest.json`, shot.manifest);
  writeJson(`${base}_performance_pir.json`, shot.performance);
  writeJson(`${base}_retargeting_plan.json`, shot.retargetingPlan);
  writeJson(`${base}_command_plan_v4.json`, shot.commandPlan);
}

writeJson('episode_batch_input.json', batch);

writeJson('execution-report.json', {
  capabilityId: 'production.episode_batch',
  generatedAt: new Date().toISOString(),
  executedOffline: true,
  realModelExecuted: false,
  realHarmonyExecuted: false,
  input: {
    fixture: 'fixtures/show_bible/episode_e01_batch.json',
    showBibleFamily: 'fixtures/show_bible/',
    shotsDeclared: batch.shots.length
  },
  pipeline: [
    'ShowBibleLoader.load (once per batch)',
    'EpisodeBatchCompiler.compile -> ShotManifest[] (cross-reference gate per shot)',
    'RetargetingResolver.resolve per shot',
    'HarmonyCommandBuilder.buildAnimationPlan per shot',
    'schema validation for every PIR / plan'
  ],
  totals: runA.totals,
  perShot: runA.shots.map(s => ({
    shotId: s.spec.shotId,
    performanceId: s.performance.performanceId,
    beats: s.spec.beats.length,
    keyframes: s.performance.tracks.reduce((n, t) => n + t.keys.length, 0),
    commands: s.commandPlan.commands.length,
    commandTypes: [...new Set(s.commandPlan.commands.map(c => c.type))]
  })),
  rejections: runA.rejections,
  schemaValidation: {
    episodeBatch: true,
    allPerformancePirs: true,
    allRetargetingPlans: true,
    allCommandPlans: true
  },
  determinism,
  limitations: [
    'No Harmony execution: compiled plans stay implemented_unverified until applied to a licensed Harmony.',
    'RigBindingPlanV1 is a structural stub with zero bindings; no commissioned rig exists.',
    'Beats carry real transform values from the declared gesture library (placeholder_curve provenance); unknown gestures stay HOLD with warnings.',
    'All shots use the single declared character and the static-camera vocabulary of the fixture ShowBible.'
  ],
  nextRequiredProof:
    'Apply a multi-shot batch to a licensed Harmony in sequence (per-shot open_project -> execute -> save -> reopen -> verify) and audit native entities.'
});

const hashTargets = fs.readdirSync(BUNDLE_DIR).filter(f => f.endsWith('.json'));
const hashes = {};
for (const f of hashTargets.sort()) {
  hashes[f] = sha256(fs.readFileSync(path.join(BUNDLE_DIR, f)));
}
writeJson('hashes.json', { hashes });

console.log(JSON.stringify({
  ok: true,
  bundle: path.relative(root, BUNDLE_DIR),
  status: runA.status,
  shots: runA.totals,
  determinism
}, null, 2));
