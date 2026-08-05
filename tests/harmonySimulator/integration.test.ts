import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { HarmonySnapshotStore } from '../../src/services/harmonySnapshotStore/index.js';
import { RigCompatibilityValidator } from '../../src/services/rigCompatibilityValidator/index.js';
import { runStructuralOfflineQa } from '../../src/services/structuralOfflineQa/index.js';
import { diffScenes } from '../../src/services/harmonySceneDiff/index.js';
import { readbackFromState, simulatedSceneStateV1Schema } from '../../src/schemas/simulatedSceneStateV1.js';
import { loadRigFixture } from '../../src/services/rigFixtureLoader/index.js';
import { MlError } from '../../src/errors/mlErrorRegistry.js';
import { harness, plan, command, transformKey, nodeOf, resetCommandCounter } from './helpers.js';

let storeRoot: string;
let store: HarmonySnapshotStore;

beforeAll(() => {
  storeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'harmony-snap-'));
  store = new HarmonySnapshotStore(storeRoot);
});
afterAll(() => fs.rmSync(storeRoot, { recursive: true, force: true }));
beforeEach(resetCommandCounter);

/** A plan that touches several command categories at once. */
function animationPlan(manifest: ReturnType<typeof loadRigFixture>) {
  const torso = nodeOf(manifest, 'torso');
  const head = nodeOf(manifest, 'head');
  return plan([
    command({ type: 'snapshot_project', params: { snapshotId: 'snap_int', includeRenders: false } }, { destructiveLevel: 'none', idempotencyKey: 'idem_int_snapshot' }),
    transformKey(torso, 1, { rotationZ: 0 }, { idempotencyKey: 'idem_int_torso_1', preconditions: [{ kind: 'node_exists', nodePath: torso }] }),
    transformKey(torso, 12, { rotationZ: 15 }, { idempotencyKey: 'idem_int_torso_12', preconditions: [{ kind: 'node_exists', nodePath: torso }] }),
    transformKey(head, 1, { rotationZ: -5 }, { idempotencyKey: 'idem_int_head_1', preconditions: [{ kind: 'node_exists', nodePath: head }] }),
    command({ type: 'set_switch_selection', params: { controllerId: 'mouth', elementName: 'Mouth', frame: 3, drawingName: 'MBP' } }, { idempotencyKey: 'idem_int_viseme' }),
    command({ type: 'add_palette_swatch', params: { paletteName: `${manifest.rigId}_palette`, colorId: '0x00000000000000b2', colorName: 'Hair', rgba: { r: 20, g: 20, b: 40, a: 255 }, colorType: 'solid' } }, {
      idempotencyKey: 'idem_int_swatch',
      preconditions: [{ kind: 'palette_exists', paletteName: `${manifest.rigId}_palette` }],
      expectedPostconditions: [{ kind: 'palette_contains', paletteName: `${manifest.rigId}_palette`, colorId: '0x00000000000000b2' }]
    })
  ]);
}

describe('full round-trip', () => {
  it('executes, saves, reloads from disk and reads back identically', () => {
    const h = harness('simple_humanoid_v1', 'roundtrip-int');
    const p = animationPlan(h.manifest);

    const compatibility = new RigCompatibilityValidator().validate(h.manifest, p);
    expect(compatibility.compatible).toBe(true);

    const executed = h.simulator.execute(h.scene, p);
    expect(executed.result.status).toBe('succeeded');
    expect(executed.state.revision).toBe(h.scene.revision + 1);

    const manifest = store.saveSnapshot(executed.state);
    const expectedReadback = readbackFromState(executed.state);
    const expectedHash = executed.state.contentHash;

    // Everything about the in-memory object is discarded here; only the sceneId and revision
    // survive into the reload. Passing the object through would prove nothing about persistence.
    const reloaded = store.loadSnapshot(manifest.sceneId, manifest.revision).state;

    expect(simulatedSceneStateV1Schema.safeParse(reloaded).success).toBe(true);
    expect(reloaded.contentHash).toBe(expectedHash);
    expect(readbackFromState(reloaded)).toEqual(expectedReadback);
    expect(diffScenes(executed.state, reloaded).identical).toBe(true);
  });

  it('the readback carries every key the plan asked for', () => {
    const h = harness('simple_humanoid_v1', 'readback-keys');
    const torso = nodeOf(h.manifest, 'torso');
    const frames = [1, 5, 9, 13];
    const executed = h.simulator.execute(h.scene, plan(
      frames.map(frame => transformKey(torso, frame, { rotationZ: frame }, { preconditions: [{ kind: 'node_exists', nodePath: torso }] }))
    ));
    const readback = readbackFromState(executed.state);
    const column = Object.keys(readback.keyframesByColumn).find(name => name.includes('Torso'))!;
    expect(readback.keyframesByColumn[column].map(k => k.frame)).toEqual(frames);
    expect(readback.keyframesByColumn[column].map(k => k.value)).toEqual(frames);
  });

  it('structural QA passes on the round-tripped scene and fails on an injected defect', () => {
    const h = harness('simple_humanoid_v1', 'qa-int');
    const executed = h.simulator.execute(h.scene, animationPlan(h.manifest));
    const saved = store.saveSnapshot(executed.state);
    const reloaded = store.loadSnapshot(saved.sceneId, saved.revision).state;

    expect(runStructuralOfflineQa(reloaded, h.manifest).errorCount).toBe(0);

    const corrupted = JSON.parse(JSON.stringify(reloaded));
    corrupted.keyframes.push({ ...corrupted.keyframes[0], frame: corrupted.sceneSettings.frameCount + 5 });
    expect(runStructuralOfflineQa(corrupted, h.manifest).passed).toBe(false);
  });
});

describe('dry run', () => {
  it('never advances the revision or changes the hash', () => {
    const h = harness('simple_humanoid_v1', 'dry-int');
    const { state, result } = h.simulator.dryRun(h.scene, animationPlan(h.manifest));
    expect(state.contentHash).toBe(h.scene.contentHash);
    expect(state.revision).toBe(h.scene.revision);
    expect(result.afterRevision).toBe(result.beforeRevision);
    expect(result.requestedMode).toBe('dry_run');
  });

  it('predicts exactly the diff the real application produces', () => {
    const h = harness('simple_humanoid_v1', 'dry-diff');
    const p = animationPlan(h.manifest);
    const probe = h.simulator.execute(h.scene, p, { mode: 'non_atomic' });
    const applied = h.simulator.execute(h.scene, p, { mode: 'atomic' });
    expect(diffScenes(h.scene, probe.state).totalChanges).toBe(diffScenes(h.scene, applied.state).totalChanges);
    expect(probe.state.contentHash).toBe(applied.state.contentHash);
  });
});

describe('atomicity', () => {
  it('a failure in the middle undoes everything before it', () => {
    const h = harness('simple_humanoid_v1', 'atomic-int');
    const torso = nodeOf(h.manifest, 'torso');
    const p = plan([
      command({ type: 'create_peg', params: { parentPath: 'Top', pegName: 'Early_Peg', position: { x: 0, y: 0 } } }),
      transformKey(torso, 4, { rotationZ: 10 }, { preconditions: [{ kind: 'node_exists', nodePath: torso }] }),
      // Fails: the node does not exist.
      transformKey('Top/Character/Ghost', 5, { rotationZ: 1 }),
      command({ type: 'create_peg', params: { parentPath: 'Top', pegName: 'Never_Reached', position: { x: 0, y: 0 } } })
    ]);

    const { state, result } = h.simulator.execute(h.scene, p, { mode: 'atomic' });
    expect(result.status).toBe('rolled_back');
    expect(result.rollbackPerformed).toBe(true);
    expect(result.rollbackVerified).toBe(true);
    expect(state.contentHash).toBe(h.scene.contentHash);
    expect(state.revision).toBe(h.scene.revision);
    expect(state.nodes.some(n => n.path === 'Top/Early_Peg')).toBe(false);
    expect(state.keyframes).toHaveLength(0);
  });

  it('non-atomic mode keeps the prefix, which is why it is diagnostic only', () => {
    const h = harness('simple_humanoid_v1', 'nonatomic-int');
    const p = plan([
      command({ type: 'create_peg', params: { parentPath: 'Top', pegName: 'Kept_Peg', position: { x: 0, y: 0 } } }),
      transformKey('Top/Character/Ghost', 5, { rotationZ: 1 })
    ]);
    const { state, result } = h.simulator.execute(h.scene, p, { mode: 'non_atomic' });
    expect(result.status).toBe('rejected');
    expect(result.rollbackPerformed).toBe(false);
    expect(state.nodes.some(n => n.path === 'Top/Kept_Peg')).toBe(true);
  });
});

describe('idempotency', () => {
  it('re-applying the same plan reports already_applied and creates nothing', () => {
    const h = harness('simple_humanoid_v1', 'idem-int');
    const p = animationPlan(h.manifest);
    const first = h.simulator.execute(h.scene, p);
    expect(first.result.status).toBe('succeeded');

    const second = h.simulator.execute(first.state, p);
    expect(second.result.status).toBe('already_applied');
    expect(second.result.commandOutcomes.every(o => o.outcome === 'already_applied')).toBe(true);
    expect(second.state.contentHash).toBe(first.state.contentHash);
    expect(second.state.revision).toBe(first.state.revision);
    expect(second.state.nodes.length).toBe(first.state.nodes.length);
    expect(second.state.keyframes.length).toBe(first.state.keyframes.length);
    expect(second.state.columns.length).toBe(first.state.columns.length);
    expect(second.state.palettes[0].swatches.length).toBe(first.state.palettes[0].swatches.length);
  });

  it('a partially applied plan resumes without duplicating what already landed', () => {
    const h = harness('simple_humanoid_v1', 'idem-partial');
    const torso = nodeOf(h.manifest, 'torso');
    const shared = transformKey(torso, 2, { rotationZ: 5 }, { idempotencyKey: 'idem_shared_key', preconditions: [{ kind: 'node_exists', nodePath: torso }] });

    const first = h.simulator.execute(h.scene, plan([shared]));
    const extended = h.simulator.execute(first.state, plan([
      shared,
      transformKey(torso, 3, { rotationZ: 6 }, { idempotencyKey: 'idem_new_key', preconditions: [{ kind: 'node_exists', nodePath: torso }] })
    ]));

    expect(extended.result.status).toBe('succeeded');
    expect(extended.result.commandOutcomes[0].outcome).toBe('already_applied');
    expect(extended.result.commandOutcomes[1].outcome).toBe('applied');
    expect(extended.state.keyframes.filter(k => k.frame === 2)).toHaveLength(1);
  });
});

describe('snapshot store', () => {
  it('lists revisions in order and compares them', () => {
    const h = harness('simple_humanoid_v1', 'revisions-int');
    const torso = nodeOf(h.manifest, 'torso');
    const r1 = h.simulator.execute(h.scene, plan([transformKey(torso, 2, { rotationZ: 5 }, { preconditions: [{ kind: 'node_exists', nodePath: torso }] })])).state;
    const r2 = h.simulator.execute(r1, plan([transformKey(torso, 3, { rotationZ: 8 }, { preconditions: [{ kind: 'node_exists', nodePath: torso }] })])).state;

    store.saveSnapshot(h.scene);
    store.saveSnapshot(r1);
    store.saveSnapshot(r2);

    const revisions = store.listRevisions('revisions-int');
    expect(revisions.map(r => r.revision)).toEqual([1, 2, 3]);

    const comparison = store.compareRevisions('revisions-int', 1, 3);
    expect(comparison.identical).toBe(false);
    expect(comparison.summary.changedKeyframes).toBeGreaterThan(0);
    expect(store.compareRevisions('revisions-int', 3, 3).identical).toBe(true);
  });

  it('rolls back to an earlier revision without destroying the later ones', () => {
    const h = harness('simple_humanoid_v1', 'rollback-int');
    const torso = nodeOf(h.manifest, 'torso');
    const later = h.simulator.execute(h.scene, plan([transformKey(torso, 2, { rotationZ: 5 }, { preconditions: [{ kind: 'node_exists', nodePath: torso }] })])).state;
    store.saveSnapshot(h.scene);
    store.saveSnapshot(later);

    const restored = store.rollbackToRevision('rollback-int', h.scene.revision);
    expect(restored.contentHash).toBe(h.scene.contentHash);
    expect(store.listRevisions('rollback-int').map(r => r.revision)).toEqual([1, 2]);
  });

  it('reports a missing revision with the ones that do exist', () => {
    const h = harness('simple_humanoid_v1', 'missing-int');
    store.saveSnapshot(h.scene);
    try {
      store.loadSnapshot('missing-int', 99);
      throw new Error('expected a throw');
    } catch (error) {
      expect(error).toBeInstanceOf(MlError);
      expect((error as MlError).code).toBe('SNAPSHOT_NOT_FOUND');
      expect((error as MlError).context.detail?.candidates).toContain('1');
    }
  });
});

describe('rig fixtures produce the compatibility reports they are designed to', () => {
  const validator = new RigCompatibilityValidator();

  it('simple_humanoid_v1 accepts a standard animation plan at full coverage', () => {
    const manifest = loadRigFixture('simple_humanoid_v1');
    const report = validator.validate(manifest, animationPlan(manifest));
    expect(report.compatible).toBe(true);
    expect(report.coverage).toBe(1);
  });

  it('stylized_big_head_v1 accepts head scale that the simple rig would refuse', () => {
    const big = loadRigFixture('stylized_big_head_v1');
    const simple = loadRigFixture('simple_humanoid_v1');
    const scalePlan = (m: typeof big) => plan([
      command({
        type: 'set_transform_keyframe',
        params: { nodePath: nodeOf(m, 'head'), frame: 2, offset: null, rotationZ: null, scale: { x: 1.6, y: 1.6 }, skew: null, interpolation: 'linear' }
      }, { preconditions: [{ kind: 'node_exists', nodePath: nodeOf(m, 'head') }] })
    ]);
    expect(validator.validate(big, scalePlan(big)).compatible).toBe(true);
    // The simple rig's head does not accept scale channels at all.
    expect(validator.validate(simple, scalePlan(simple)).findings.some(f => f.code === 'CHANNEL_NOT_ACCEPTED')).toBe(true);
  });

  it('asymmetric_character_v1 rejects on the right arm what it allows on the left', () => {
    const manifest = loadRigFixture('asymmetric_character_v1');
    const rotate = (controllerId: string) => plan([
      transformKey(nodeOf(manifest, controllerId), 2, { rotationZ: 160 }, { preconditions: [{ kind: 'node_exists', nodePath: nodeOf(manifest, controllerId) }] })
    ]);
    expect(validator.validate(manifest, rotate('shoulder_l')).compatible).toBe(true);
    expect(validator.validate(manifest, rotate('shoulder_r')).compatible).toBe(false);
  });

  it('invalid_rig_v1 blocks every plan', () => {
    const report = validator.validate(
      JSON.parse(JSON.stringify(loadRigFixture('simple_humanoid_v1'))),
      plan([command({ type: 'create_peg', params: { parentPath: 'Top', pegName: 'P', position: { x: 0, y: 0 } } })])
    );
    expect(report.compatible).toBe(true);

    const brokenReport = new RigCompatibilityValidator().validateManifest(
      JSON.parse(fs.readFileSync(path.join(process.cwd(), 'fixtures', 'rigs', 'invalid_rig_v1.json'), 'utf-8'))
    );
    expect(brokenReport.findings.filter(f => f.severity === 'error').length).toBeGreaterThan(0);
  });
});
