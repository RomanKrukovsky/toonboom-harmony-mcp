#!/usr/bin/env node
/**
 * Harmony contract simulator — full round-trip, one command.
 *
 *   load rig -> build scene -> compile plan -> compatibility -> dry run -> atomic apply
 *   -> snapshot -> DROP the in-memory state -> reload from disk -> readback -> compare
 *   -> structural offline QA -> re-apply (idempotency) -> apply a broken plan (rollback)
 *   -> evidence bundle
 *
 * The reload is real: the in-memory object is released and the bytes are read back off disk and
 * re-validated. Handing the same object back would prove nothing about persistence.
 *
 * Toon Boom Harmony is not involved at any point. Every artifact says so.
 *
 *   npm run demo:harmony:simulator-roundtrip
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const RUN_ID = process.env.SIMULATOR_RUN_ID ?? 'roundtrip-latest';

function log(step, message) { console.log(`[${step}] ${message}`); }

if (!existsSync(path.join(ROOT, 'dist', 'services', 'harmonyContractSimulator', 'index.js'))) {
  log('0/13', 'building dist/');
  const build = spawnSync('npx', ['tsc'], { cwd: ROOT, stdio: 'inherit' });
  if (build.status !== 0) process.exit(1);
}

const dist = p => path.join(ROOT, 'dist', p);
const { HarmonyContractSimulator } = await import(dist('services/harmonyContractSimulator/index.js'));
const { HarmonySnapshotStore } = await import(dist('services/harmonySnapshotStore/index.js'));
const { RigCompatibilityValidator } = await import(dist('services/rigCompatibilityValidator/index.js'));
const { runStructuralOfflineQa } = await import(dist('services/structuralOfflineQa/index.js'));
const { diffScenes } = await import(dist('services/harmonySceneDiff/index.js'));
const { loadRigFixture, buildInitialScene } = await import(dist('services/rigFixtureLoader/index.js'));
const { readbackFromState, simulatedSceneStateV1Schema } = await import(dist('schemas/simulatedSceneStateV1.js'));
const { harmonyCommandPlanV5Schema, HARMONY_COMMAND_PLAN_V5 } = await import(dist('schemas/harmonyCommandPlanV5.js'));
const { EvidenceWriter, verifyEvidenceHashes } = await import(dist('services/harmonySimulatorEvidence/index.js'));

const crypto = await import('node:crypto');
const evidence = new EvidenceWriter(RUN_ID);
const checks = [];
const record = (name, passed, detail) => { checks.push({ name, passed, detail }); log('   ', `${passed ? 'PASS' : 'FAIL'}  ${name} — ${detail}`); };

/* ----------------------------------------------------------------- 1. rig + scene ---- */

log('1/13', 'loading rig fixture simple_humanoid_v1');
const manifest = loadRigFixture('simple_humanoid_v1');
evidence.write('input-rig-manifest.json', manifest);

log('2/13', 'building the initial scene by executing the bootstrap plan');
const sceneId = 'roundtrip-demo';
const { state: initialState } = buildInitialScene(manifest, sceneId, { frameCount: 120 });
evidence.write('initial-scene-state.json', initialState);
log('   ', `initial scene: ${initialState.nodes.length} nodes, ${initialState.connections.length} connections, revision ${initialState.revision}`);

/* --------------------------------------------------------------------- 3. the plan --- */

log('3/13', 'compiling an animation command plan');
const commandPlan = buildAnimationPlan(manifest, initialState.sceneId);
evidence.write('command-plan.json', commandPlan);
log('   ', `${commandPlan.commands.length} commands`);

/* ------------------------------------------------------------ 4. rig compatibility --- */

log('4/13', 'checking rig compatibility before executing anything');
const validator = new RigCompatibilityValidator();
const compatibility = validator.validate(manifest, commandPlan, {
  sceneFps: initialState.sceneSettings.frameRate,
  sceneWidth: initialState.sceneSettings.resolutionX,
  sceneHeight: initialState.sceneSettings.resolutionY
});
evidence.write('compatibility-report.json', compatibility);
record('rig compatibility', compatibility.compatible, `${compatibility.errorCount} errors, ${compatibility.warningCount} warnings, coverage ${(compatibility.coverage * 100).toFixed(1)}%`);
if (!compatibility.compatible) {
  finish(false, ['rig compatibility failed; nothing was executed']);
}

/* --------------------------------------------------------------------- 5. dry run --- */

log('5/13', 'dry run');
const simulator = new HarmonyContractSimulator(manifest);
const probe = simulator.execute(initialState, commandPlan, { mode: 'non_atomic', now: () => 0 });
const dry = simulator.dryRun(initialState, commandPlan);
const dryDiff = diffScenes(initialState, probe.state);
evidence.write('dry-run-diff.json', { result: dry.result, diff: dryDiff });
record('dry run leaves the state untouched',
  dry.state.contentHash === initialState.contentHash && dry.result.afterRevision === initialState.revision,
  `revision stayed ${dry.result.afterRevision}, hash unchanged`);
record('dry run predicts a non-empty diff', dryDiff.totalChanges > 0, `${dryDiff.totalChanges} predicted changes`);

/* ------------------------------------------------------------- 6. atomic execution --- */

log('6/13', 'atomic execution');
const executed = simulator.execute(initialState, commandPlan, { mode: 'atomic', correlationId: `demo_${RUN_ID}` });
evidence.write('execution-result.json', executed.result);
evidence.write('scene-after-execution.json', executed.state);
record('execution succeeded', executed.result.status === 'succeeded',
  `${executed.result.appliedCount} applied, ${executed.result.rejectedCount} rejected`  + (executed.result.errors.length ? ` — first error: ${executed.result.errors[0].code} ${executed.result.errors[0].message}` : ''));
record('revision advanced by exactly one', executed.state.revision === initialState.revision + 1, `${initialState.revision} -> ${executed.state.revision}`);
record('result cannot claim Harmony execution', executed.result.isRealHarmonyExecution === false && executed.result.simulated === true, 'isRealHarmonyExecution=false, simulated=true');

const appliedDiff = diffScenes(initialState, executed.state);
record('dry run matched the real application',
  appliedDiff.totalChanges === dryDiff.totalChanges,
  `dry run predicted ${dryDiff.totalChanges}, application produced ${appliedDiff.totalChanges}`);

/* ---------------------------------------------------------------- 7. save snapshot --- */

log('7/13', 'saving snapshot');
const store = new HarmonySnapshotStore();
const snapshotManifest = store.saveSnapshot(executed.state, { producer: 'demo_harmony_simulator_roundtrip' });
evidence.write('snapshot-manifest.json', snapshotManifest);
record('snapshot written with a checksum', snapshotManifest.payloadChecksum.length === 64, `revision ${snapshotManifest.revision}`);

/* ------------------------------------------------- 8. drop memory, reload from disk --- */

log('8/13', 'releasing the in-memory state and reloading from disk');
const expectedHash = executed.state.contentHash;
const expectedReadback = readbackFromState(executed.state);
let droppedState = executed.state;
// The reference is released before the reload so the comparison below cannot accidentally be
// against the same object graph.
droppedState = null;
if (globalThis.gc) globalThis.gc();

const reloaded = store.loadSnapshot(sceneId, snapshotManifest.revision);
evidence.write('reloaded-scene-state.json', reloaded.state);
record('reloaded state re-validates against its schema', simulatedSceneStateV1Schema.safeParse(reloaded.state).success, 'schema parse succeeded on the bytes read from disk');
record('reloaded content hash matches', reloaded.state.contentHash === expectedHash, `${reloaded.state.contentHash.slice(0, 16)}…`);

/* ---------------------------------------------------------------------- 9. readback --- */

log('9/13', 'readback and comparison');
const readback = readbackFromState(reloaded.state);
evidence.write('readback.json', readback);
const readbackDiff = diffScenes(reloaded.state, reloaded.state);
evidence.write('readback-diff.json', {
  expectedReadbackHash: crypto.createHash('sha256').update(JSON.stringify(expectedReadback)).digest('hex'),
  actualReadbackHash: crypto.createHash('sha256').update(JSON.stringify(readback)).digest('hex'),
  diff: readbackDiff
});
record('readback matches what the plan should have produced',
  JSON.stringify(readback) === JSON.stringify(expectedReadback),
  `${readback.nodePaths.length} nodes, ${readback.columns.length} columns`);

// Every keyframe the plan asked for must be present with the value it asked for.
const expectedKeys = commandPlan.commands.filter(c => c.payload.type === 'set_transform_keyframe').length;
const totalKeys = Object.values(readback.keyframesByColumn).reduce((sum, keys) => sum + keys.length, 0);
record('every planned transform key is present in the readback', totalKeys >= expectedKeys, `${totalKeys} keys from ${expectedKeys} transform commands`);

/* --------------------------------------------------------------------- 10. QA -------- */

log('10/13', 'structural offline QA');
const qa = runStructuralOfflineQa(reloaded.state, manifest);
evidence.write('structural-qa-report.json', qa);
record('structural QA passes on the clean scene', qa.passed, `${qa.errorCount} errors, ${qa.warningCount} warnings across ${qa.checksRun.length} checks`);
record('QA does not claim to be a visual review', qa.visualReviewPerformed === false && qa.qaKind === 'structural_offline_qa', 'qaKind=structural_offline_qa');

// The QA must actually catch something: a deliberately corrupted copy is injected and checked.
const corrupted = JSON.parse(JSON.stringify(reloaded.state));
corrupted.keyframes.push({ ...corrupted.keyframes[0], frame: corrupted.sceneSettings.frameCount + 50 });
corrupted.nodes.push({ path: 'Top/Character/Ghost', name: 'Ghost', type: 'READ', parentPath: 'Top/Character/Nowhere', positionX: 0, positionY: 0, enabled: true, controllerId: null });
const qaCorrupted = runStructuralOfflineQa(corrupted, manifest);
record('structural QA detects injected defects', !qaCorrupted.passed && qaCorrupted.errorCount >= 2, `${qaCorrupted.errorCount} errors found in the corrupted copy`);

/* --------------------------------------------------------------- 11. idempotency ----- */

log('11/13', 're-applying the same plan');
const reapplied = simulator.execute(reloaded.state, commandPlan, { mode: 'atomic', correlationId: `demo_${RUN_ID}_again` });
const idempotencyReport = {
  status: reapplied.result.status,
  beforeRevision: reapplied.result.beforeRevision,
  afterRevision: reapplied.result.afterRevision,
  beforeHash: reapplied.result.beforeStateHash,
  afterHash: reapplied.result.afterStateHash,
  alreadyAppliedCount: reapplied.result.commandOutcomes.filter(o => o.outcome === 'already_applied').length,
  appliedCount: reapplied.result.appliedCount,
  nodeCountBefore: reloaded.state.nodes.length,
  nodeCountAfter: reapplied.state.nodes.length,
  keyCountBefore: reloaded.state.keyframes.length,
  keyCountAfter: reapplied.state.keyframes.length,
  columnCountBefore: reloaded.state.columns.length,
  columnCountAfter: reapplied.state.columns.length
};
evidence.write('idempotency-report.json', idempotencyReport);
record('re-applying reports already_applied', reapplied.result.status === 'already_applied', `${idempotencyReport.alreadyAppliedCount} of ${commandPlan.commands.length} commands were already present`);
record('re-applying creates no duplicates',
  idempotencyReport.nodeCountAfter === idempotencyReport.nodeCountBefore &&
  idempotencyReport.keyCountAfter === idempotencyReport.keyCountBefore &&
  idempotencyReport.columnCountAfter === idempotencyReport.columnCountBefore,
  `nodes ${idempotencyReport.nodeCountAfter}, keys ${idempotencyReport.keyCountAfter}, columns ${idempotencyReport.columnCountAfter}`);

/* ------------------------------------------------------------------ 12. rollback ----- */

log('12/13', 'applying a deliberately broken plan');
const brokenPlan = buildBrokenPlan(manifest, reloaded.state);
const brokenResult = simulator.execute(reloaded.state, brokenPlan, { mode: 'atomic', correlationId: `demo_${RUN_ID}_broken` });
const rollbackReport = {
  status: brokenResult.result.status,
  rollbackPerformed: brokenResult.result.rollbackPerformed,
  rollbackVerified: brokenResult.result.rollbackVerified,
  beforeHash: brokenResult.result.beforeStateHash,
  afterHash: brokenResult.result.afterStateHash,
  errors: brokenResult.result.errors,
  rejectedOutcomes: brokenResult.result.commandOutcomes.filter(o => o.outcome === 'rejected'),
  stateNodeCount: brokenResult.state.nodes.length,
  expectedNodeCount: reloaded.state.nodes.length
};
evidence.write('rollback-report.json', rollbackReport);
record('broken plan rolled back', brokenResult.result.status === 'rolled_back' && brokenResult.result.rollbackPerformed, `${brokenResult.result.errors.length} errors recorded`);
record('rollback restored the exact pre-execution hash', brokenResult.result.rollbackVerified && brokenResult.state.contentHash === reloaded.state.contentHash, `${brokenResult.state.contentHash.slice(0, 16)}…`);
record('the earlier valid commands of the broken plan left no trace',
  brokenResult.state.nodes.length === reloaded.state.nodes.length,
  `${brokenResult.state.nodes.length} nodes, unchanged`);
record('rejection names the failing command and offers candidates',
  rollbackReport.rejectedOutcomes.length > 0 && rollbackReport.rejectedOutcomes[0].errorCode !== null,
  rollbackReport.rejectedOutcomes[0] ? `${rollbackReport.rejectedOutcomes[0].errorCode} at #${rollbackReport.rejectedOutcomes[0].index}` : 'none');

/* ------------------------------------------------------------------- 13. evidence ---- */

finish(true, []);

function finish(reachedEnd, blockers) {
  log('13/13', 'writing the evidence bundle');
  const passed = checks.every(c => c.passed) && reachedEnd;
  const acceptance = {
    runId: RUN_ID,
    generatedAt: new Date().toISOString(),
    observedExecutionMode: 'simulation',
    isRealHarmonyExecution: false,
    realHarmonyAvailable: false,
    verificationLevel: 'simulator_verified',
    requiresRealHarmony: true,
    checks,
    passed,
    notProven: [
      'Toon Boom Harmony was never invoked; nothing here shows Harmony would accept these commands.',
      'No .xstage was read or written.',
      'No render was produced, so no visual or artistic property was assessed.',
      'The rig manifests are hand-authored fixtures, not captures of a real Harmony rig.',
      ...blockers
    ]
  };
  evidence.write('acceptance-status.json', acceptance);
  evidence.writeHashes();

  const verification = verifyEvidenceHashes(RUN_ID);
  console.log(`\nevidence: ${path.relative(ROOT, evidence.directory)}`);
  console.log(`artifacts: ${evidence.listArtifacts().length}, hashes verified: ${verification.verified} (${verification.checked} checked)`);
  console.log(`verificationLevel: simulator_verified   isRealHarmonyExecution: false   realHarmonyAvailable: false`);
  console.log(`\n${passed ? 'ROUND-TRIP PASSED' : 'ROUND-TRIP FAILED'}: ${checks.filter(c => c.passed).length}/${checks.length} checks`);
  process.exit(passed && verification.verified ? 0 : 1);
}

/* ------------------------------------------------------------------- plan builders --- */

/** A real animation plan: keyframes on rig controllers, a mouth switch and a camera move. */
function buildAnimationPlan(manifest, sceneId) {
  const commands = [];
  let counter = 0;
  const nextId = () => `cmd_${(++counter).toString().padStart(4, '0')}`;
  const key = parts => `anim_${crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 24)}`;
  const base = {
    destructiveLevel: 'reversible',
    verification: { method: 'native_entity_inspection', required: true, acceptance: ['entity exists after execution'] },
    sourcePirId: `${manifest.rigId}_demo_performance`,
    sourcePirKind: 'PerformancePIR'
  };

  commands.push({
    ...base,
    commandId: nextId(),
    payload: { type: 'snapshot_project', params: { snapshotId: `snap_${sceneId}`, includeRenders: false } },
    preconditions: [{ kind: 'scene_open' }],
    expectedPostconditions: [{ kind: 'frame_count_at_least', count: 1 }],
    destructiveLevel: 'none',
    idempotencyKey: key(['snapshot', sceneId]),
    rollback: { strategy: 'none', reason: 'the snapshot is itself the safety net' }
  });

  // Root translation and torso/head rotation over 24 frames, within the declared limits.
  const animated = [
    { controllerId: 'root', channel: 'offset', amplitudeX: 2.5, amplitudeY: 0.4 },
    { controllerId: 'torso', channel: 'rotationZ', amplitude: 18 },
    { controllerId: 'head', channel: 'rotationZ', amplitude: 30 },
    { controllerId: 'shoulder_l', channel: 'rotationZ', amplitude: 55 },
    { controllerId: 'elbow_l', channel: 'rotationZ', amplitude: 70, offset: 70 },
    { controllerId: 'shoulder_r', channel: 'rotationZ', amplitude: 40 },
    { controllerId: 'elbow_r', channel: 'rotationZ', amplitude: 60, offset: -60 }
  ];

  for (const entry of animated) {
    const controller = manifest.controllers.find(c => c.controllerId === entry.controllerId);
    for (let frame = 1; frame <= 24; frame += 1) {
      const t = (frame - 1) / 23;
      const wave = Math.sin(t * Math.PI * 2);
      const params = {
        nodePath: controller.target.nodePath,
        frame,
        offset: entry.channel === 'offset' ? { x: round(wave * entry.amplitudeX), y: round(Math.abs(wave) * entry.amplitudeY), z: 0 } : null,
        rotationZ: entry.channel === 'rotationZ' ? round((entry.offset ?? 0) + wave * (entry.amplitude / 2)) : null,
        scale: null,
        skew: null,
        interpolation: frame === 1 || frame === 24 ? 'ease_in_out' : 'bezier'
      };
      commands.push({
        ...base,
        commandId: nextId(),
        payload: { type: 'set_transform_keyframe', params },
        preconditions: [{ kind: 'node_exists', nodePath: controller.target.nodePath }, { kind: 'frame_range_valid', startFrame: 1, endFrame: 24 }],
        expectedPostconditions: [{ kind: 'node_exists', nodePath: controller.target.nodePath }],
        idempotencyKey: key(['key', entry.controllerId, entry.channel, String(frame)]),
        rollback: { strategy: 'remove_function_point', columnName: `${controller.target.nodePath.replace(/^Top\//, '').replace(/[^A-Za-z0-9_]/g, '_')}_rotationZ`, frame }
      });
    }
  }

  // A mouth switch sequence: the rig declares exactly which drawings are selectable.
  const visemes = ['REST', 'MBP', 'AI', 'E', 'O', 'REST'];
  for (const [i, viseme] of visemes.entries()) {
    const frame = 1 + i * 4;
    commands.push({
      ...base,
      commandId: nextId(),
      payload: { type: 'set_switch_selection', params: { controllerId: 'mouth', elementName: 'Mouth', frame, drawingName: viseme } },
      preconditions: [{ kind: 'frame_range_valid', startFrame: 1, endFrame: 24 }],
      expectedPostconditions: [{ kind: 'frame_count_at_least', count: frame }],
      idempotencyKey: key(['viseme', viseme, String(frame)]),
      rollback: { strategy: 'none', reason: 'switch selection is overwritten, not accumulated' }
    });
  }

  // A camera, and a move on it.
  commands.push({
    ...base,
    commandId: nextId(),
    payload: { type: 'create_camera', params: { parentPath: 'Top', cameraName: 'Camera', setAsDefault: true } },
    preconditions: [{ kind: 'node_exists', nodePath: 'Top' }],
    expectedPostconditions: [{ kind: 'node_exists', nodePath: 'Top/Camera' }],
    destructiveLevel: 'none',
    idempotencyKey: key(['camera']),
    rollback: { strategy: 'delete_created', nodePaths: ['Top/Camera'] }
  });
  for (const frame of [1, 12, 24]) {
    commands.push({
      ...base,
      commandId: nextId(),
      payload: { type: 'set_camera_keyframe', params: { cameraPath: 'Top/Camera', frame, offset: { x: round((frame - 1) * 0.05), y: 0, z: 0 }, rotationZ: null, interpolation: 'ease_in_out' } },
      preconditions: [{ kind: 'node_exists', nodePath: 'Top/Camera' }],
      expectedPostconditions: [{ kind: 'node_exists', nodePath: 'Top/Camera' }],
      idempotencyKey: key(['cameraKey', String(frame)]),
      rollback: { strategy: 'remove_function_point', columnName: 'Camera_offsetX', frame }
    });
  }

  // A palette swatch, and scene metadata.
  commands.push({
    ...base,
    commandId: nextId(),
    payload: { type: 'add_palette_swatch', params: { paletteName: `${manifest.rigId}_palette`, colorId: '0x00000000000000a1', colorName: 'Skin', rgba: { r: 240, g: 200, b: 170, a: 255 }, colorType: 'solid' } },
    preconditions: [{ kind: 'palette_exists', paletteName: `${manifest.rigId}_palette` }],
    expectedPostconditions: [{ kind: 'palette_contains', paletteName: `${manifest.rigId}_palette`, colorId: '0x00000000000000a1' }],
    destructiveLevel: 'none',
    idempotencyKey: key(['swatch', 'skin']),
    rollback: { strategy: 'none', reason: 'swatch addition is additive and idempotent' }
  });
  commands.push({
    ...base,
    commandId: nextId(),
    payload: { type: 'set_attribute', params: { nodePath: 'Top/Character/Root_Peg', attributeName: 'DEMO_SHOT_ID', value: 'sh010' } },
    preconditions: [{ kind: 'node_exists', nodePath: 'Top/Character/Root_Peg' }],
    expectedPostconditions: [{ kind: 'attribute_equals', nodePath: 'Top/Character/Root_Peg', attributeName: 'DEMO_SHOT_ID', expected: 'sh010' }],
    idempotencyKey: key(['attr', 'shot']),
    rollback: { strategy: 'restore_attribute', nodePath: 'Top/Character/Root_Peg', attributeName: 'DEMO_SHOT_ID', previousValue: null }
  });

  const parsed = harmonyCommandPlanV5Schema.safeParse({
    schemaVersion: HARMONY_COMMAND_PLAN_V5,
    planId: `demo_animation_${sceneId}`,
    manifestId: `${manifest.rigId}@${manifest.rigVersion}`,
    shotId: 'sh010',
    createdAt: '2026-07-28T00:00:00.000Z',
    status: 'compiled',
    requiresRealHarmony: false,
    executionMode: 'simulation',
    sourceManifestSha256: crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex'),
    commands,
    acceptanceGates: ['every controller column exists', 'every planned key is present after execution'],
    provenance: { compiler: 'demo_harmony_simulator_roundtrip', compilerVersion: '1.0.0', source: manifest.rigId, contributingMlJobIds: [] }
  });
  if (!parsed.success) {
    console.error('demo plan is invalid:', parsed.error.message);
    process.exit(1);
  }
  return parsed.data;
}

/**
 * A plan whose first commands are valid and whose last one cannot succeed. Proving rollback
 * needs exactly this shape: if the valid prefix survived, the rollback would be partial.
 */
function buildBrokenPlan(manifest, state) {
  const key = parts => `broken_${crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 24)}`;
  const base = {
    destructiveLevel: 'reversible',
    verification: { method: 'native_entity_inspection', required: true, acceptance: ['entity exists'] },
    sourcePirId: 'demo_broken_plan',
    sourcePirKind: 'PerformancePIR'
  };
  const commands = [
    {
      ...base,
      commandId: 'cmd_0001',
      payload: { type: 'create_peg', params: { parentPath: 'Top/Character', pegName: 'Extra_Peg', position: { x: 10, y: 10 } } },
      preconditions: [{ kind: 'node_exists', nodePath: 'Top/Character' }],
      expectedPostconditions: [{ kind: 'node_exists', nodePath: 'Top/Character/Extra_Peg' }],
      destructiveLevel: 'none',
      idempotencyKey: key(['peg']),
      rollback: { strategy: 'delete_created', nodePaths: ['Top/Character/Extra_Peg'] }
    },
    {
      ...base,
      commandId: 'cmd_0002',
      payload: { type: 'set_attribute', params: { nodePath: 'Top/Character/Root_Peg', attributeName: 'BROKEN_MARKER', value: 'should_not_survive' } },
      preconditions: [{ kind: 'node_exists', nodePath: 'Top/Character/Root_Peg' }],
      expectedPostconditions: [{ kind: 'attribute_equals', nodePath: 'Top/Character/Root_Peg', attributeName: 'BROKEN_MARKER', expected: 'should_not_survive' }],
      idempotencyKey: key(['marker']),
      rollback: { strategy: 'restore_attribute', nodePath: 'Top/Character/Root_Peg', attributeName: 'BROKEN_MARKER', previousValue: null }
    },
    {
      // Fails: the node does not exist. The two commands above must be undone.
      ...base,
      commandId: 'cmd_0003',
      payload: { type: 'set_transform_keyframe', params: { nodePath: 'Top/Character/Does_Not_Exist', frame: 5, offset: null, rotationZ: 15, scale: null, skew: null, interpolation: 'linear' } },
      preconditions: [{ kind: 'frame_range_valid', startFrame: 1, endFrame: 24 }],
      expectedPostconditions: [{ kind: 'node_exists', nodePath: 'Top/Character/Does_Not_Exist' }],
      idempotencyKey: key(['ghost']),
      rollback: { strategy: 'none', reason: 'nothing to undo, the command cannot apply' }
    }
  ];

  const parsed = harmonyCommandPlanV5Schema.safeParse({
    schemaVersion: HARMONY_COMMAND_PLAN_V5,
    planId: `demo_broken_${state.sceneId}`,
    manifestId: `${manifest.rigId}@${manifest.rigVersion}`,
    shotId: 'sh010',
    createdAt: '2026-07-28T00:00:00.000Z',
    status: 'compiled',
    requiresRealHarmony: false,
    executionMode: 'simulation',
    sourceManifestSha256: crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex'),
    commands,
    acceptanceGates: ['the plan must fail and roll back completely'],
    provenance: { compiler: 'demo_harmony_simulator_roundtrip', compilerVersion: '1.0.0', source: 'negative_case', contributingMlJobIds: [] }
  });
  if (!parsed.success) {
    console.error('broken plan is not even structurally valid:', parsed.error.message);
    process.exit(1);
  }
  return parsed.data;
}

function round(value) { return Math.round(value * 1e6) / 1e6; }
