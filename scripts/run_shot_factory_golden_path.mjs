#!/usr/bin/env node
/**
 * Shot Factory golden path — offline evidence runner.
 *
 * Executes the deterministic factory pipeline end-to-end from the committed
 * fixture family in fixtures/show_bible/ :
 *
 *   ShowBible family -> ShotManifest -> PerformancePIR -> RetargetingPlan
 *                    -> HarmonyCommandPlanV4
 *
 * Writes the evidence bundle into docs/evidence/shot-factory-golden-path/
 * (schema-validated artifacts, determinism double-run digests, hashes.json),
 * which backs the `production.shot_factory` registry entry.
 *
 * Requires `npm run build` first (imports from dist/).
 *
 * Honesty contract: no Harmony execution happens here. The produced command
 * plan carries status `implemented_unverified` and `requiresRealHarmony: true`.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import stringify from 'fast-json-stable-stringify';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

if (!fs.existsSync(path.join(root, 'dist', 'services', 'shotManifestCompiler'))) {
  console.error('dist/ missing or stale. Run `npm run build` first.');
  process.exit(1);
}

const { ShowBibleLoader } = await import('../dist/services/showBibleLoader/index.js');
const { ShotManifestCompiler } = await import('../dist/services/shotManifestCompiler/index.js');
const { RetargetingResolver } = await import('../dist/services/retargetingResolver/index.js');
const { HarmonyCommandBuilder } = await import('../dist/services/harmonyCommandBuilder/index.js');
const { performancePirSchema } = await import('../dist/schemas/performancePir.js');
const { retargetingPlanSchema } = await import('../dist/schemas/retargetingPlan.js');
const { harmonyCommandPlanV4Schema } = await import('../dist/schemas/harmonyCommandPlanV4.js');

const FIXTURE_DIR = 'fixtures/show_bible';
const BUNDLE_DIR = path.join(root, 'docs', 'evidence', 'shot-factory-golden-path');

const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');

/** Strip fields that are random/time-derived by design (buildAnimationPlan). */
function stripVolatile(plan) {
  const { planId, manifestId, createdAt, ...rest } = plan;
  return rest;
}

function fail(msg) {
  console.error(`GOLDEN PATH FAILED: ${msg}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Inputs (committed fixtures)
// ---------------------------------------------------------------------------

const showBibleAbs = path.join(root, FIXTURE_DIR, 'show_bible.json');
if (!fs.existsSync(showBibleAbs)) fail(`${FIXTURE_DIR}/show_bible.json missing`);

const loader = new ShowBibleLoader();
const loaded = loader.load(showBibleAbs);
const controllerMaps = loader.buildControllerMaps(loaded);

/**
 * The manifest references the ShowBible by its portable repo-relative path.
 * performanceId derives from this string, so the committed PIR stays valid on
 * any machine regardless of checkout location.
 */
const manifest = {
  schemaVersion: '1.0',
  shotId: 'shot_golden_001',
  showBibleRef: `${FIXTURE_DIR}/show_bible.json`,
  production: 'polygon_show',
  episode: 'E01',
  sceneName: 'S01',
  description: 'Mira looks up, surprised.',
  staging: {
    positions: [{ characterId: 'char_main_v1', preset: 'center' }],
    shotSize: 'close_up',
    cameraMove: 'static',
    backgroundRef: 'bg/room_v1.png'
  },
  timing: {
    totalFrames: 48,
    fps: 24,
    minBeatFrames: 2,
    maxBeatFrames: 96,
    anticipationFrames: 4,
    followThroughFrames: 6,
    pauseBeforeBeats: {}
  },
  beats: [
    { beatId: 'b1', startFrame: 1, endFrame: 24, characterId: 'char_main_v1', intent: 'look_up', emotion: 'neutral' },
    { beatId: 'b2', startFrame: 25, endFrame: 48, characterId: 'char_main_v1', intent: 'react', emotion: 'surprise', gestureId: 'point' }
  ],
  fx: [],
  render: { preview: true, format: 'mp4', quality: 'standard' },
  provenance: {
    director: 'llm_director_v1',
    createdAt: '2026-07-27T12:00:00Z',
    sourceScriptRef: 'scripts/E01/S01.txt'
  }
};

/**
 * Structural binding-plan stub comes from the shared episodeBatchCompiler
 * helper so single-shot and batch paths cannot drift apart.
 */
const { buildStructuralBindingPlan } = await import(
  '../dist/services/episodeBatchCompiler/index.js'
);
const { MotionValueResolver } = await import('../dist/services/motionValueResolver/index.js');
function buildBindingPlan(performance) {
  return buildStructuralBindingPlan(performance.characterId, performance);
}

// Declared gesture curves (placeholder provenance until a commissioned rig
// defines real controller ranges). Unknown gestures would stay HOLD.
const gestureLibrary = JSON.parse(
  fs.readFileSync(path.join(root, 'fixtures', 'show_bible', 'gesture_tracks_mira.json'), 'utf8')
);

// ---------------------------------------------------------------------------
// Pipeline run (executed twice for the determinism gate)
// ---------------------------------------------------------------------------

function runPipeline() {
  const compiler = new ShotManifestCompiler();
  const resolver = new RetargetingResolver();
  const builder = new HarmonyCommandBuilder();
  const motionResolver = new MotionValueResolver();

  const { performance, violations, warnings } = compiler.compile(manifest, loaded.crossRefs, { controllerMaps });
  if (violations.length > 0) {
    fail(`cross-reference violations: ${JSON.stringify(violations)}`);
  }
  if (!performancePirSchema.safeParse(performance).success) fail('PerformancePIR failed schema validation');

  // Fill declared gesture curves into the compiled boundary keys.
  const motion = motionResolver.apply(manifest, performance, { gestureLibraries: [gestureLibrary], controllerMaps });
  warnings.push(...motion.warnings);
  const valued = motion.performance;
  if (!performancePirSchema.safeParse(valued).success) fail('valued PerformancePIR failed schema validation');

  const bindingPlan = buildBindingPlan(valued);
  const retargetingPlan = resolver.resolve(valued, bindingPlan);
  if (!retargetingPlanSchema.safeParse(retargetingPlan).success) fail('RetargetingPlan failed schema validation');

  const commandPlan = builder.buildAnimationPlan(retargetingPlan);
  const planParse = harmonyCommandPlanV4Schema.safeParse(commandPlan);
  if (!planParse.success) {
    fail(`HarmonyCommandPlanV4 failed schema validation: ${JSON.stringify(planParse.error.errors)}`);
  }

  return { performance: valued, bindingPlan, retargetingPlan, commandPlan, warnings, appliedGestures: motion.appliedGestures };
}

const runA = runPipeline();
const runB = runPipeline();

const perfDigest = sha256(stringify(runA.performance));
const retargetDigest = sha256(stringify(runA.retargetingPlan));
const planContentDigest = sha256(stringify(stripVolatile(runA.commandPlan)));

const determinism = {
  checked: true,
  method: 'two independent runs; SHA-256 over fast-json-stable-stringify; volatile plan fields (planId, manifestId, createdAt) excluded because crypto.randomBytes/new Date are by-design non-deterministic',
  performanceIdentical: perfDigest === sha256(stringify(runB.performance)),
  retargetingPlanIdentical: retargetDigest === sha256(stringify(runB.retargetingPlan)),
  commandPlanContentDigestMatch: planContentDigest === sha256(stringify(stripVolatile(runB.commandPlan))),
  digests: {
    performance_pir_sha256: perfDigest,
    retargeting_plan_sha256: retargetDigest,
    command_plan_content_sha256: planContentDigest
  }
};
if (!determinism.performanceIdentical || !determinism.retargetingPlanIdentical || !determinism.commandPlanContentDigestMatch) {
  fail('determinism double-run mismatch');
}

// ---------------------------------------------------------------------------
// Evidence bundle
// ---------------------------------------------------------------------------

fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
fs.mkdirSync(BUNDLE_DIR, { recursive: true });

const writeJson = (name, obj) =>
  fs.writeFileSync(path.join(BUNDLE_DIR, name), JSON.stringify(obj, null, 2) + '\n', 'utf8');

writeJson('shot_manifest.json', manifest);
writeJson('rig_binding_plan.json', runA.bindingPlan);
writeJson('performance_pir.json', runA.performance);
writeJson('retargeting_plan.json', runA.retargetingPlan);
writeJson('harmony_command_plan_v4.json', runA.commandPlan);

writeJson('execution-report.json', {
  capabilityId: 'production.shot_factory',
  generatedAt: new Date().toISOString(),
  executedOffline: true,
  realModelExecuted: false,
  realHarmonyExecuted: false,
  inputs: {
    showBibleFamily: `${FIXTURE_DIR}/`,
    documents: [
      'show_bible.json',
      'palette_manifest.json',
      'character_bible_mira.json',
      'camera_rules.json',
      'motion_grammar.json',
      'qa_thresholds.json',
      'legal/mira_license.json'
    ],
    loaderValidations: [
      'showBibleSchema',
      'characterBibleSchema',
      'cameraRulesSchema',
      'motionGrammarSchema',
      'paletteManifestSchema',
      'qaThresholdsSchema',
      'assetLicenseSchema'
    ]
  },
  pipeline: [
    'ShowBibleLoader.load',
    'ShotManifestCompiler.compile (cross-reference gate)',
    'RetargetingResolver.resolve',
    'HarmonyCommandBuilder.buildAnimationPlan',
    'harmonyCommandPlanV4Schema.safeParse'
  ],
  crossReferenceViolations: [],
  compilerWarnings: runA.warnings,
  motionValues: {
    gestureLibraryInput: 'fixtures/show_bible/gesture_tracks_mira.json',
    appliedGestures: runA.appliedGestures
  },
  schemaValidation: {
    performancePir: true,
    retargetingPlan: true,
    harmonyCommandPlanV4: true
  },
  commandPlanSummary: {
    status: runA.commandPlan.status,
    requiresRealHarmony: runA.commandPlan.requiresRealHarmony,
    commandCount: runA.commandPlan.commands.length,
    commandTypes: [...new Set(runA.commandPlan.commands.map(c => c.type))]
  },
  determinism,
  limitations: [
    'No Harmony execution: the compiled plan is implemented_unverified until applied to a licensed Harmony.',
    'RigBindingPlanV1 is a structural stub with zero bindings; no commissioned rig exists.',
    'Gesture values come from placeholder_curve library entries until a commissioned rig defines real controller ranges.',
    'Command-plan identity fields (planId, manifestId, createdAt) are random per run by design; content digest excludes them.'
  ],
  nextRequiredProof: 'Apply the compiled HarmonyCommandPlanV4 to a licensed Harmony (open_project -> execute -> save -> reopen -> verify) and audit native entities.'
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
  performanceId: runA.performance.performanceId,
  commands: runA.commandPlan.commands.length,
  determinism
}, null, 2));
