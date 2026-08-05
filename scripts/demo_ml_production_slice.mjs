#!/usr/bin/env node
/**
 * Vertical slice 1, end to end, in one command:
 *
 *   real DWPose inference  ->  PoseSequenceV2  ->  RetargetingPlan  ->  HarmonyCommandPlanV5
 *   ->  offline verification  ->  evidence directory
 *
 * The DWPose step runs the real ONNX checkpoints through the V2 job path. If the weights are
 * absent or the licence gate refuses, the run stops and writes a **blocked report**. It never
 * substitutes a fixture and calls it a model output.
 *
 * Harmony is not invoked. The plan is compiled and validated offline, and the evidence says so:
 * `harmonyApplied: false` and `isRealHarmonyExecution: false` are the honest result on a machine
 * without a licensed Harmony.
 *
 *   npm run demo:ml:production-slice
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const RUN_ID = process.env.SLICE_RUN_ID ?? `slice-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const EVIDENCE = path.join(ROOT, 'output', 'evidence', 'ml', RUN_ID);

function log(step, message) {
  console.log(`[${step}] ${message}`);
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function writeJson(relative, value) {
  const target = path.join(EVIDENCE, relative);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, JSON.stringify(value, null, 2));
  return target;
}

/* ----------------------------------------------------------------- 1. real inference -- */

mkdirSync(EVIDENCE, { recursive: true });

// Prefer the committed, licence-documented video fixture: a multi-frame run is what actually
// exercises IK continuity, temporal smoothing, key reduction and foot locking. The single still
// is the fallback so the slice still runs on a checkout without the video.
const VIDEO_FIXTURE = 'fixtures/video/cartoon_character_motion.mp4';
const useVideo = existsSync(path.join(ROOT, VIDEO_FIXTURE));
const inputPath = useVideo ? VIDEO_FIXTURE : 'fixtures/character.png';
const inputMode = useVideo ? 'video' : 'image';
const sourceFps = useVideo ? 29.97 : 24;

log('1/5', `running DWPose against ${inputPath} (${inputMode}) through the V2 job path`);

const smoke = spawnSync(process.execPath, [
  path.join(ROOT, 'scripts', 'run-python.mjs'), 'ml',
  path.join(ROOT, 'scripts', 'ml', 'smoke_test.py'),
  '--provider', 'dwpose',
  '--input', inputPath,
  '--run-id', RUN_ID,
  '--param', `inputMode="${inputMode}"`,
  '--param', `fps=${sourceFps}`,
  '--param', 'temporalSmoothing="savitzky_golay"',
  '--param', 'smoothingWindow=5',
  '--param', 'outlierRejection="median_absolute_deviation"',
  '--param', 'maxInterpolatedGapFrames=2'
], {
  stdio: 'inherit',
  cwd: ROOT,
  env: {
    ...process.env,
    // This slice evaluates the technical pipeline; DWPose's licence review is still open, so the
    // run is explicitly non-commercial and the override is recorded in the licence decision.
    COMMERCIAL_BUILD: process.env.COMMERCIAL_BUILD ?? 'false',
    ALLOW_LEGAL_REVIEW_PENDING: process.env.ALLOW_LEGAL_REVIEW_PENDING ?? 'true'
  }
});

const providerEvidence = path.join(EVIDENCE, 'dwpose');
const pirPath = path.join(providerEvidence, 'normalized-pir.json');
const blockedPath = path.join(providerEvidence, 'blocked-report.json');

if (!existsSync(pirPath)) {
  const reason = existsSync(blockedPath)
    ? JSON.parse(readFileSync(blockedPath, 'utf-8')).blockingReason
    : `smoke test exited ${smoke.status} without producing a PIR`;
  writeJson('slice-report.json', {
    runId: RUN_ID,
    status: 'blocked',
    stage: 'pose_estimation',
    realInferenceExecuted: false,
    harmonyApplied: false,
    isRealHarmonyExecution: false,
    blockingReason: reason,
    note: 'No downstream artifact was produced. Nothing was fabricated to stand in for the model output.'
  });
  console.error(`\nBLOCKED at pose estimation: ${reason}`);
  console.error(`evidence: ${EVIDENCE}`);
  process.exit(3);
}

const pose = JSON.parse(readFileSync(pirPath, 'utf-8'));
const provenance = JSON.parse(readFileSync(path.join(providerEvidence, 'provenance.json'), 'utf-8'));
log('1/5', `real inference: ${provenance.realInferenceExecuted}, weights ${provenance.weightsSha256.length} digest(s), ${provenance.durationMs.toFixed(1)} ms`);

/* ------------------------------------------------------------------- 2. retargeting -- */

log('2/5', 'compiling the pose into rig channels (IK, joint limits, key reduction)');

const build = spawnSync('npx', ['tsc', '--noEmit'], { cwd: ROOT, stdio: 'ignore' });
if (build.status !== 0) {
  console.error('typecheck failed; refusing to run the compiler against a broken tree');
  process.exit(1);
}

const { buildRetargetingPlan, compileToHarmonyPlan } = await import(
  path.join(ROOT, 'dist', 'services', 'poseRetargetCompiler', 'index.js')
).catch(async () => {
  // dist/ may be stale or absent; build once and retry rather than importing TypeScript.
  log('2/5', 'dist/ is missing the compiler, building it');
  const compile = spawnSync('npx', ['tsc'], { cwd: ROOT, stdio: 'inherit' });
  if (compile.status !== 0) process.exit(1);
  return import(path.join(ROOT, 'dist', 'services', 'poseRetargetCompiler', 'index.js'));
});

/** A minimal but real rig definition. In production this comes from CharacterRigPIR. */
const rig = {
  characterId: 'demo_character',
  rigVersion: 'demo-rig-1.0.0',
  rootNodePath: 'Top/Character/Root_Peg',
  restTorsoLength: 3.2,
  bindings: [
    { joint: 'spine_mid', nodePath: 'Top/Character/Torso_Peg', channels: ['rotationZ'], rotationLimits: { min: -35, max: 35 } },
    { joint: 'nose', nodePath: 'Top/Character/Head_Peg', channels: ['rotationZ'], rotationLimits: { min: -90, max: 90 } },
    { joint: 'shoulder_left', nodePath: 'Top/Character/Arm_L_Upper', channels: ['rotationZ'], rotationLimits: { min: -170, max: 170 } },
    // poleSign +1 chains bend positive; see solveTwoBoneIk's documented sign convention.
    { joint: 'elbow_left', nodePath: 'Top/Character/Arm_L_Lower', channels: ['rotationZ'], rotationLimits: { min: 0, max: 150 } },
    { joint: 'shoulder_right', nodePath: 'Top/Character/Arm_R_Upper', channels: ['rotationZ'], rotationLimits: { min: -170, max: 170 } },
    { joint: 'elbow_right', nodePath: 'Top/Character/Arm_R_Lower', channels: ['rotationZ'], rotationLimits: { min: -150, max: 0 } },
    { joint: 'hip_left', nodePath: 'Top/Character/Leg_L_Upper', channels: ['rotationZ'], rotationLimits: { min: -120, max: 120 } },
    { joint: 'knee_left', nodePath: 'Top/Character/Leg_L_Lower', channels: ['rotationZ'], rotationLimits: { min: 0, max: 150 } },
    { joint: 'hip_right', nodePath: 'Top/Character/Leg_R_Upper', channels: ['rotationZ'], rotationLimits: { min: -120, max: 120 } },
    { joint: 'knee_right', nodePath: 'Top/Character/Leg_R_Lower', channels: ['rotationZ'], rotationLimits: { min: -150, max: 0 } }
  ],
  ikChains: [
    { name: 'arm_left', root: 'shoulder_left', mid: 'elbow_left', end: 'wrist_left', poleSign: 1, upperNodePath: 'Top/Character/Arm_L_Upper', lowerNodePath: 'Top/Character/Arm_L_Lower' },
    { name: 'arm_right', root: 'shoulder_right', mid: 'elbow_right', end: 'wrist_right', poleSign: -1, upperNodePath: 'Top/Character/Arm_R_Upper', lowerNodePath: 'Top/Character/Arm_R_Lower' },
    { name: 'leg_left', root: 'hip_left', mid: 'knee_left', end: 'ankle_left', poleSign: 1, upperNodePath: 'Top/Character/Leg_L_Upper', lowerNodePath: 'Top/Character/Leg_L_Lower' },
    { name: 'leg_right', root: 'hip_right', mid: 'knee_right', end: 'ankle_right', poleSign: -1, upperNodePath: 'Top/Character/Leg_R_Upper', lowerNodePath: 'Top/Character/Leg_R_Lower' }
  ],
  footJoints: ['ankle_left', 'ankle_right']
};

let retargetingPlan;
try {
  retargetingPlan = buildRetargetingPlan(pose, rig, { targetFps: 24, keyReductionToleranceDegrees: 0.5, keyReductionToleranceField: 0.01, confidenceGate: 0.3 });
} catch (error) {
  writeJson('slice-report.json', {
    runId: RUN_ID, status: 'blocked', stage: 'retargeting',
    realInferenceExecuted: true, harmonyApplied: false, isRealHarmonyExecution: false,
    blockingReason: `${error.code ?? 'ERROR'}: ${error.message}`
  });
  console.error(`\nBLOCKED at retargeting: ${error.message}`);
  process.exit(3);
}

writeJson('retargeting-plan.json', retargetingPlan);
const totalKeys = retargetingPlan.channels.reduce((sum, c) => sum + c.keys.length, 0);
const rawKeys = retargetingPlan.channels.reduce((sum, c) => sum + c.rawKeyCount, 0);
log('2/5', `${retargetingPlan.channels.length} channel(s), ${totalKeys} key(s) kept of ${rawKeys} raw`);

/* --------------------------------------------------------------- 3. plan compilation -- */

log('3/5', 'compiling HarmonyCommandPlanV5');

const manifestSha = sha256(Buffer.from(JSON.stringify(retargetingPlan)));
let commandPlan;
try {
  commandPlan = compileToHarmonyPlan(retargetingPlan, {
    manifestId: `manifest_${RUN_ID}`,
    shotId: 'sh010',
    sourceManifestSha256: manifestSha,
    executionMode: 'offline_deterministic',
    requiresRealHarmony: false,
    contributingMlJobIds: [provenance.jobId]
  });
} catch (error) {
  writeJson('slice-report.json', {
    runId: RUN_ID, status: 'blocked', stage: 'command_compilation',
    realInferenceExecuted: true, harmonyApplied: false, isRealHarmonyExecution: false,
    blockingReason: `${error.code ?? 'ERROR'}: ${error.message}`
  });
  console.error(`\nBLOCKED at command compilation: ${error.message}`);
  process.exit(3);
}

writeJson('harmony-command-plan.json', commandPlan);
log('3/5', `${commandPlan.commands.length} command(s), status ${commandPlan.status}`);

/* --------------------------------------------------------------- 4. offline verification */

log('4/5', 'verifying the plan offline');

const { harmonyCommandPlanV5Schema, checkPlanInvariants } = await import(
  path.join(ROOT, 'dist', 'schemas', 'harmonyCommandPlanV5.js')
);

const reparsed = harmonyCommandPlanV5Schema.safeParse(JSON.parse(readFileSync(path.join(EVIDENCE, 'harmony-command-plan.json'), 'utf-8')));
const invariants = reparsed.success ? checkPlanInvariants(reparsed.data) : [];

const checks = [
  { name: 'plan reparses against HarmonyCommandPlanV5', passed: reparsed.success },
  { name: 'no cross-command invariant violated', passed: invariants.length === 0 },
  { name: 'every command has a rollback', passed: commandPlan.commands.every(c => c.rollback.strategy !== undefined) },
  { name: 'every command names its source PIR', passed: commandPlan.commands.every(c => c.sourcePirId === retargetingPlan.planId) },
  { name: 'no key outside the declared frame range', passed: commandPlan.commands
      .filter(c => c.payload.type === 'set_function_point')
      .every(c => c.payload.params.frame >= retargetingPlan.startFrame && c.payload.params.frame <= retargetingPlan.endFrame) },
  { name: 'no frame 0 on a 1-based timeline', passed: commandPlan.commands
      .filter(c => c.payload.type === 'set_function_point')
      .every(c => c.payload.params.frame >= 1) },
  { name: 'no NaN or Infinity in any written value', passed: commandPlan.commands
      .filter(c => c.payload.type === 'set_function_point')
      .every(c => Number.isFinite(c.payload.params.value)) },
  { name: 'key reduction stayed within each channel\u2019s tolerance', passed: retargetingPlan.channels.every(c => c.reconstructionError <= c.reductionTolerance + 1e-9) },
  { name: 'plan does not claim Harmony execution', passed: commandPlan.requiresRealHarmony === false && commandPlan.status === 'compiled' }
];

const failed = checks.filter(c => !c.passed);
writeJson('verification-report.json', {
  runId: RUN_ID,
  checks,
  invariantViolations: invariants,
  passed: failed.length === 0
});
log('4/5', `${checks.length - failed.length}/${checks.length} checks passed`);

/* ------------------------------------------------------------------------ 5. evidence -- */

const sliceReport = {
  runId: RUN_ID,
  status: failed.length === 0 ? 'production_package_ready_for_harmony_execution' : 'failed',
  generatedAt: new Date().toISOString(),
  stages: [
    { stage: 'pose_estimation', executionMode: 'real_ml', input: inputPath, inputMode, frames: pose.frames.length, realInferenceExecuted: provenance.realInferenceExecuted, modelId: provenance.modelId, modelRevision: provenance.modelRevision, weightsSha256: provenance.weightsSha256, device: provenance.device, durationMs: provenance.durationMs },
    { stage: 'retargeting', executionMode: 'offline_deterministic', realInferenceExecuted: false, channels: retargetingPlan.channels.length, keysKept: totalKeys, keysRaw: rawKeys, maxReconstructionError: Math.max(...retargetingPlan.channels.map(c => c.reconstructionError)) },
    { stage: 'command_compilation', executionMode: 'offline_deterministic', realInferenceExecuted: false, commands: commandPlan.commands.length },
    { stage: 'verification', executionMode: 'offline_deterministic', realInferenceExecuted: false, passed: failed.length === 0 }
  ],
  // The two statements that must never be inflated.
  harmonyApplied: false,
  isRealHarmonyExecution: false,
  harmonyNote: 'Toon Boom Harmony was not invoked. The command plan is compiled and validated offline; nothing in this run proves an editable Harmony scene exists.',
  licenseNote: 'DWPose licence review is still open, so this run is explicitly non-commercial. See dwpose/license-decision.json.',
  failedChecks: failed.map(c => c.name)
};
writeJson('slice-report.json', sliceReport);

const lines = [];
for (const file of walk(EVIDENCE)) {
  if (path.basename(file) === 'sha256sums.txt') continue;
  lines.push(`${sha256(readFileSync(file))}  ${path.relative(EVIDENCE, file)}`);
}
writeFileSync(path.join(EVIDENCE, 'sha256sums.txt'), lines.sort().join('\n') + '\n');

log('5/5', `evidence written to ${path.relative(ROOT, EVIDENCE)}`);
console.log(`\nstatus: ${sliceReport.status}`);
console.log(`harmonyApplied: false (no licensed Harmony on this host)`);
process.exit(failed.length === 0 ? 0 : 1);

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}
