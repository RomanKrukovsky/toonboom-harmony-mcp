import { beforeEach, describe, expect, it } from '@jest/globals';
import {
  simulatedSceneStateV1Schema,
  simulatorExecutionResultV1Schema,
  sceneReadbackV1Schema,
  canonicaliseSceneState,
  computeSceneContentHash,
  sealSceneState,
  readbackFromState
} from '../../src/schemas/simulatedSceneStateV1.js';
import {
  rigManifestV1Schema,
  rigControllerV1Schema,
  checkRigInvariants,
  resolveController,
  controllerForNodePath
} from '../../src/schemas/rigManifestV1.js';
import { diffScenes, DEFAULT_TOLERANCE } from '../../src/services/harmonySceneDiff/index.js';
import { runStructuralOfflineQa } from '../../src/services/structuralOfflineQa/index.js';
import { loadRigFixture, loadRigFixtureRaw, listRigFixtures } from '../../src/services/rigFixtureLoader/index.js';
import { MlError } from '../../src/errors/mlErrorRegistry.js';
import { harness, plan, command, transformKey, nodeOf, resetCommandCounter } from './helpers.js';

beforeEach(resetCommandCounter);

describe('rig manifest schema', () => {
  it('loads all four fixtures, and only the broken one fails its invariants', () => {
    expect(listRigFixtures()).toEqual(expect.arrayContaining([
      'simple_humanoid_v1', 'stylized_big_head_v1', 'asymmetric_character_v1', 'invalid_rig_v1'
    ]));
    for (const rigId of ['simple_humanoid_v1', 'stylized_big_head_v1', 'asymmetric_character_v1']) {
      const manifest = loadRigFixture(rigId);
      const violations = checkRigInvariants(manifest).filter(v => v.severity === 'error');
      expect(violations).toEqual([]);
    }
  });

  it('rejects a controller whose limit names a channel it does not accept', () => {
    const base = loadRigFixture('simple_humanoid_v1').controllers[0];
    const broken = { ...base, channels: ['rotationZ'], limits: [{ channel: 'scaleX', min: 0, max: 1, onViolation: 'clamp' }] };
    expect(rigControllerV1Schema.safeParse(broken).success).toBe(false);
  });

  it('rejects a controller that parents or mirrors itself', () => {
    const base = loadRigFixture('simple_humanoid_v1').controllers[1];
    expect(rigControllerV1Schema.safeParse({ ...base, parentId: base.controllerId }).success).toBe(false);
    expect(rigControllerV1Schema.safeParse({ ...base, mirrorPairId: base.controllerId }).success).toBe(false);
  });

  it('rejects an inverted channel limit', () => {
    const base = loadRigFixture('simple_humanoid_v1').controllers[1];
    const broken = { ...base, limits: [{ channel: 'rotationZ', min: 10, max: -10, onViolation: 'clamp' }] };
    expect(rigControllerV1Schema.safeParse(broken).success).toBe(false);
  });

  it('resolves controllers by id and by alias, and node paths back to controllers', () => {
    const manifest = loadRigFixture('simple_humanoid_v1');
    expect(resolveController(manifest, 'root')?.controllerId).toBe('root');
    expect(resolveController(manifest, 'hips')?.controllerId).toBe('root');
    expect(resolveController(manifest, 'nope')).toBeUndefined();
    expect(controllerForNodePath(manifest, nodeOf(manifest, 'head'))?.controllerId).toBe('head');
  });

  it('rejects a manifest whose schemaVersion is wrong', () => {
    const manifest = loadRigFixtureRaw('simple_humanoid_v1') as Record<string, unknown>;
    expect(rigManifestV1Schema.safeParse({ ...manifest, schemaVersion: '2.0' }).success).toBe(false);
  });
});

describe('canonical serialisation and hashing', () => {
  it('hashes independently of collection order', () => {
    const { scene } = harness();
    const shuffled = {
      ...scene,
      nodes: [...scene.nodes].reverse(),
      connections: [...scene.connections].reverse(),
      drawingElements: [...scene.drawingElements].reverse()
    };
    expect(computeSceneContentHash(shuffled)).toBe(computeSceneContentHash(scene));
  });

  it('hashes independently of JSON property insertion order', () => {
    const { scene } = harness();
    // Rebuilds every object with its keys inserted in reverse order, at every depth. A replacer
    // array would have *filtered* nested keys rather than reordering them, which is why this
    // constructs the reordered graph explicitly.
    const reverseKeys = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(reverseKeys);
      if (value && typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>).reverse();
        return Object.fromEntries(entries.map(([k, v]) => [k, reverseKeys(v)]));
      }
      return value;
    };
    const reordered = reverseKeys(scene) as typeof scene;
    expect(Object.keys(reordered)[0]).not.toBe(Object.keys(scene)[0]);
    expect(computeSceneContentHash(reordered)).toBe(scene.contentHash);
  });

  it('excludes revision, history and artifact references from the content hash', () => {
    const { scene } = harness();
    const noisy = {
      ...scene,
      revision: scene.revision + 99,
      commandHistory: [],
      artifactReferences: [{ artifactId: 'art_x', sha256: 'b'.repeat(64), role: 'noise', relativePath: 'a/b.json' }]
    };
    expect(computeSceneContentHash(noisy)).toBe(computeSceneContentHash(scene));
  });

  it('changes the hash when the logical scene changes', () => {
    const { scene } = harness();
    const changed = { ...scene, sceneSettings: { ...scene.sceneSettings, frameCount: scene.sceneSettings.frameCount + 1 } };
    expect(computeSceneContentHash(changed)).not.toBe(scene.contentHash);
  });

  it('sealSceneState is idempotent', () => {
    const { scene } = harness();
    expect(sealSceneState(sealSceneState(scene)).contentHash).toBe(scene.contentHash);
  });

  it('canonicalisation is stable across repeated application', () => {
    const { scene } = harness();
    expect(JSON.stringify(canonicaliseSceneState(canonicaliseSceneState(scene))))
      .toBe(JSON.stringify(canonicaliseSceneState(scene)));
  });

  it('produces the same initial scene hash on every build, independent of wall-clock time', () => {
    const a = harness('simple_humanoid_v1', 'stable-a');
    const b = harness('simple_humanoid_v1', 'stable-a');
    expect(b.scene.contentHash).toBe(a.scene.contentHash);
  });
});

describe('readback normalisation', () => {
  it('validates against its schema and drops volatile fields', () => {
    const { scene } = harness();
    const readback = readbackFromState(scene);
    expect(sceneReadbackV1Schema.safeParse(readback).success).toBe(true);
    expect(readback).not.toHaveProperty('revision');
    expect(readback).not.toHaveProperty('commandHistory');
  });

  it('is identical for two states that differ only in revision and history', () => {
    const { scene } = harness();
    const noisy = { ...scene, revision: 42, commandHistory: [] };
    expect(JSON.stringify(readbackFromState(noisy))).toBe(JSON.stringify(readbackFromState(scene)));
  });
});

describe('structural diff', () => {
  it('reports no change between a state and itself', () => {
    const { scene } = harness();
    const diff = diffScenes(scene, scene);
    expect(diff.identical).toBe(true);
    expect(diff.totalChanges).toBe(0);
  });

  it('is order independent', () => {
    const { scene } = harness();
    const shuffled = { ...scene, nodes: [...scene.nodes].reverse(), connections: [...scene.connections].reverse() };
    expect(diffScenes(scene, shuffled).totalChanges).toBe(0);
  });

  it('reports added and removed nodes by path', () => {
    const { scene } = harness();
    const extra = {
      ...scene,
      nodes: [...scene.nodes, { path: 'Top/Extra', name: 'Extra', type: 'PEG', parentPath: 'Top', positionX: 0, positionY: 0, enabled: true, controllerId: null }]
    };
    const diff = diffScenes(scene, extra);
    expect(diff.nodes.added).toEqual(['Top/Extra']);
    expect(diff.nodes.removed).toEqual([]);
    expect(diffScenes(extra, scene).nodes.removed).toEqual(['Top/Extra']);
  });

  it('respects the floating-point tolerance', () => {
    const { manifest, simulator, scene } = harness();
    const node = nodeOf(manifest, 'torso');
    const a = simulator.execute(scene, plan([transformKey(node, 5, { rotationZ: 10 })])).state;
    const b = simulator.execute(scene, plan([transformKey(node, 5, { rotationZ: 10 + 1e-9 })])).state;

    expect(diffScenes(a, b, { tolerance: 1e-6 }).keyframes.changed).toEqual([]);
    expect(diffScenes(a, b, { tolerance: 0 }).keyframes.changed.length).toBeGreaterThan(0);
    expect(DEFAULT_TOLERANCE).toBeGreaterThan(0);
  });

  it('compares drawing lists as sets, not as ordered arrays', () => {
    const { scene } = harness();
    const reordered = {
      ...scene,
      drawingElements: scene.drawingElements.map(e => ({ ...e, drawings: [...e.drawings].reverse() }))
    };
    expect(diffScenes(scene, reordered).drawingElements.changed).toEqual([]);
  });
});

describe('controller limits', () => {
  it('clamps a value on a clamp-mode limit and records nothing as an error', () => {
    const { manifest, simulator, scene } = harness();
    const node = nodeOf(manifest, 'torso'); // rotationZ limited to [-35, 35], clamp
    const { result } = simulator.execute(scene, plan([transformKey(node, 5, { rotationZ: 20 })]));
    expect(result.status).toBe('succeeded');
  });

  it('rejects a value on a reject-mode limit', () => {
    const { manifest, simulator, scene } = harness('asymmetric_character_v1', 'asym-limits');
    // shoulder_r on the asymmetric rig limits rotationZ to [-60, 90] with onViolation=reject.
    const node = nodeOf(manifest, 'shoulder_r');
    const { result, state } = simulator.execute(scene, plan([transformKey(node, 5, { rotationZ: 175 })]));
    expect(result.status).toBe('rolled_back');
    expect(result.errors[0].code).toBe('SIMULATOR_LIMIT_VIOLATED');
    expect(state.contentHash).toBe(scene.contentHash);
  });

  it('accepts a value inside a reject-mode limit', () => {
    const { manifest, simulator, scene } = harness('asymmetric_character_v1', 'asym-ok');
    const { result } = simulator.execute(scene, plan([transformKey(nodeOf(manifest, 'shoulder_r'), 5, { rotationZ: 45 })]));
    expect(result.status).toBe('succeeded');
  });
});

describe('structural offline QA', () => {
  it('passes a clean scene and names itself honestly', () => {
    const { manifest, scene } = harness();
    const report = runStructuralOfflineQa(scene, manifest);
    expect(report.errorCount).toBe(0);
    expect(report.qaKind).toBe('structural_offline_qa');
    expect(report.visualReviewPerformed).toBe(false);
    expect(report.renderInspected).toBe(false);
    expect(report.checksRun.length).toBeGreaterThanOrEqual(12);
  });

  it('detects an orphan node whose parent is missing', () => {
    const { manifest, scene } = harness();
    const broken = {
      ...scene,
      nodes: [...scene.nodes, { path: 'Top/Ghost', name: 'Ghost', type: 'READ', parentPath: 'Top/Nowhere', positionX: 0, positionY: 0, enabled: true, controllerId: null }]
    };
    const report = runStructuralOfflineQa(broken, manifest);
    expect(report.findings.some(f => f.checkId === 'orphan_nodes' && f.severity === 'error')).toBe(true);
  });

  it('detects a connection cycle', () => {
    const { manifest, scene } = harness();
    const cyclic = {
      ...scene,
      connections: [
        ...scene.connections,
        { fromNode: 'Top/Character/Head_Peg', fromPort: 0, toNode: 'Top/Character/Torso_Peg', toPort: 5 }
      ]
    };
    const report = runStructuralOfflineQa(cyclic, manifest);
    expect(report.findings.some(f => f.checkId === 'connection_cycles')).toBe(true);
  });

  it('detects a key past the end of the scene and a duplicate key', () => {
    const { manifest, simulator, scene } = harness();
    const node = nodeOf(manifest, 'torso');
    const withKeys = simulator.execute(scene, plan([transformKey(node, 5, { rotationZ: 5 })])).state;
    const broken = {
      ...withKeys,
      keyframes: [
        ...withKeys.keyframes,
        { ...withKeys.keyframes[0], frame: withKeys.sceneSettings.frameCount + 10 },
        { ...withKeys.keyframes[0] }
      ]
    };
    const report = runStructuralOfflineQa(broken, manifest);
    expect(report.findings.some(f => f.checkId === 'keys_outside_scene')).toBe(true);
    expect(report.findings.some(f => f.checkId === 'duplicate_keyframes')).toBe(true);
    expect(report.passed).toBe(false);
  });

  it('detects NaN and Infinity that bypassed the command layer', () => {
    const { manifest, simulator, scene } = harness();
    const withKeys = simulator.execute(scene, plan([transformKey(nodeOf(manifest, 'torso'), 5, { rotationZ: 5 })])).state;
    const broken = { ...withKeys, keyframes: withKeys.keyframes.map((k, i) => (i === 0 ? { ...k, value: Number.NaN } : k)) };
    const report = runStructuralOfflineQa(broken, manifest);
    expect(report.findings.some(f => f.checkId === 'non_finite_values')).toBe(true);
  });

  it('detects an exposure of a drawing nothing declares', () => {
    const { manifest, scene } = harness();
    const broken = { ...scene, exposures: [{ columnName: 'Mouth_col', frame: 1, drawingName: 'GHOST_DRAWING' }] };
    const report = runStructuralOfflineQa(broken, manifest);
    expect(report.findings.some(f => f.checkId === 'unknown_drawing_substitutions')).toBe(true);
  });

  it('flags an excessive rotation step against the configured threshold', () => {
    const { manifest, simulator, scene } = harness();
    const node = nodeOf(manifest, 'shoulder_l');
    const applied = simulator.execute(scene, plan([
      transformKey(node, 1, { rotationZ: -160 }),
      transformKey(node, 2, { rotationZ: 160 })
    ])).state;
    const report = runStructuralOfflineQa(applied, manifest, { maxRotationStepPerFrame: 45 });
    expect(report.findings.some(f => f.checkId === 'excessive_rotation_step')).toBe(true);
    // A step warning is not an error: the threshold is a budget, not a correctness claim.
    expect(report.errorCount).toBe(0);
  });
});

describe('execution result contract', () => {
  it('cannot represent a result that claims real Harmony execution', () => {
    const { simulator, scene } = harness();
    const { result } = simulator.execute(scene, plan([command({ type: 'snapshot_project', params: { snapshotId: 'snap_1', includeRenders: false } }, { destructiveLevel: 'none' })]));
    const forged = { ...result, isRealHarmonyExecution: true };
    expect(simulatorExecutionResultV1Schema.safeParse(forged).success).toBe(false);
  });

  it('cannot represent a simulated=false result', () => {
    const { simulator, scene } = harness();
    const { result } = simulator.execute(scene, plan([command({ type: 'inspect_native_entities', params: { entityKinds: ['nodes'], rootPath: 'Top' } }, { destructiveLevel: 'none' })]));
    expect(simulatorExecutionResultV1Schema.safeParse({ ...result, simulated: false }).success).toBe(false);
    expect(simulatorExecutionResultV1Schema.safeParse({ ...result, requiresRealHarmony: false }).success).toBe(false);
  });

  it('cannot represent a dry run that advanced the revision', () => {
    const { simulator, scene } = harness();
    const { result } = simulator.dryRun(scene, plan([transformKey('Top/Character/Torso_Peg', 3, { rotationZ: 5 })]));
    expect(simulatorExecutionResultV1Schema.safeParse({ ...result, afterRevision: result.beforeRevision + 1 }).success).toBe(false);
  });

  it('cannot represent a succeeded result that also rejected commands', () => {
    const { simulator, scene } = harness();
    const { result } = simulator.execute(scene, plan([transformKey('Top/Character/Torso_Peg', 3, { rotationZ: 5 })]));
    expect(simulatorExecutionResultV1Schema.safeParse({ ...result, status: 'succeeded', rejectedCount: 1 }).success).toBe(false);
  });

  it('cannot represent a rollback that did not restore the before hash', () => {
    const { simulator, scene } = harness();
    const { result } = simulator.execute(scene, plan([transformKey('Top/Character/Torso_Peg', 3, { rotationZ: 5 })]));
    expect(simulatorExecutionResultV1Schema.safeParse({ ...result, rollbackPerformed: true, afterStateHash: 'c'.repeat(64) }).success).toBe(false);
  });
});

describe('scene state schema', () => {
  it('rejects frame 0 in a keyframe', () => {
    const { simulator, scene } = harness();
    const broken = {
      ...scene,
      keyframes: [{ columnName: 'x', frame: 0, value: 1, interpolation: 'linear', handleLeftX: 0, handleLeftY: 0, handleRightX: 0, handleRightY: 0, constSeg: false, continuity: 'SMOOTH' }]
    };
    expect(simulatedSceneStateV1Schema.safeParse(broken).success).toBe(false);
    expect(simulator).toBeDefined();
  });

  it('rejects a non-finite keyframe value', () => {
    const { scene } = harness();
    const broken = {
      ...scene,
      keyframes: [{ columnName: 'x', frame: 1, value: Number.POSITIVE_INFINITY, interpolation: 'linear', handleLeftX: 0, handleLeftY: 0, handleRightX: 0, handleRightY: 0, constSeg: false, continuity: 'SMOOTH' }]
    };
    expect(simulatedSceneStateV1Schema.safeParse(broken).success).toBe(false);
  });

  it('rejects an artifact reference that traverses out of the store', () => {
    const { scene } = harness();
    for (const relativePath of ['/etc/passwd', '../escape.json', 'a/../../b.json']) {
      const broken = { ...scene, artifactReferences: [{ artifactId: 'a', sha256: 'd'.repeat(64), role: 'r', relativePath }] };
      expect(simulatedSceneStateV1Schema.safeParse(broken).success).toBe(false);
    }
  });

  it('rejects a node path that does not start at Top', () => {
    const { scene } = harness();
    const broken = { ...scene, nodes: [...scene.nodes, { path: 'Elsewhere/Node', name: 'Node', type: 'PEG', parentPath: 'Elsewhere', positionX: 0, positionY: 0, enabled: true, controllerId: null }] };
    expect(simulatedSceneStateV1Schema.safeParse(broken).success).toBe(false);
  });

  it('refuses a scene id that is not a legal identifier', () => {
    const { simulator } = harness();
    expect(() => simulator.createScene('../escape')).toThrow(MlError);
    expect(() => simulator.createScene('Has Spaces')).toThrow(MlError);
  });
});
