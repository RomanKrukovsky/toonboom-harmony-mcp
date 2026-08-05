import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { HarmonySnapshotStore } from '../../src/services/harmonySnapshotStore/index.js';
import { RigCompatibilityValidator } from '../../src/services/rigCompatibilityValidator/index.js';
import { simulatorExecutionResultV1Schema } from '../../src/schemas/simulatedSceneStateV1.js';
import { EvidenceWriter } from '../../src/services/harmonySimulatorEvidence/index.js';
import { loadRigFixture } from '../../src/services/rigFixtureLoader/index.js';
import { MlError } from '../../src/errors/mlErrorRegistry.js';
import { capabilitySchema, loadRegistry, validateRegistry } from '../../src/services/capabilityRegistryValidator/index.js';
import { harness, plan, command, transformKey, nodeOf, resetCommandCounter } from './helpers.js';

let storeRoot: string;
let store: HarmonySnapshotStore;

beforeAll(() => {
  storeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'harmony-adv-'));
  store = new HarmonySnapshotStore(storeRoot);
});
afterAll(() => fs.rmSync(storeRoot, { recursive: true, force: true }));
beforeEach(resetCommandCounter);

describe('path traversal', () => {
  it.each([
    ['../escape'],
    ['..'],
    ['a/b'],
    ['/absolute'],
    ['Scene With Spaces'],
    ['UPPERCASE']
  ])('the snapshot store refuses sceneId %s', (sceneId) => {
    expect(() => store.listRevisions(sceneId)).toThrow(MlError);
  });

  it('the snapshot store refuses a negative or fractional revision', () => {
    const h = harness('simple_humanoid_v1', 'adv-rev');
    store.saveSnapshot(h.scene);
    expect(() => store.loadSnapshot('adv-rev', -1)).toThrow(MlError);
    expect(() => store.loadSnapshot('adv-rev', 1.5)).toThrow(MlError);
  });

  it('a symlink inside the store that points outside it is refused', () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'harmony-out-'));
    fs.mkdirSync(path.join(storeRoot), { recursive: true });
    const link = path.join(storeRoot, 'escaped');
    fs.symlinkSync(outside, link, 'dir');
    // The textual path stays inside the store; only following the symlink reveals the escape.
    expect(() => store.listRevisions('escaped')).toThrow(MlError);
    fs.rmSync(outside, { recursive: true, force: true });
  });

  it('the evidence writer refuses a run id or file name that traverses', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harmony-ev-'));
    expect(() => new EvidenceWriter('../escape', root)).toThrow(MlError);
    const writer = new EvidenceWriter('ok-run', root);
    expect(() => writer.write('../escape.json', {})).toThrow(MlError);
    expect(() => writer.write('nested/file.json', {})).toThrow(MlError);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('the rig loader refuses a fixture id that is not a bare identifier', () => {
    expect(() => loadRigFixture('../../etc/passwd')).toThrow(MlError);
    expect(() => loadRigFixture('Not_Lowercase')).toThrow(MlError);
  });
});

describe('corrupt snapshots', () => {
  function saveThen(sceneId: string, mutate: (raw: Record<string, unknown>) => void): { sceneId: string; revision: number } {
    const h = harness('simple_humanoid_v1', sceneId);
    const manifest = store.saveSnapshot(h.scene);
    const file = path.join(storeRoot, sceneId, `r${String(manifest.revision).padStart(6, '0')}.json`);
    const raw = JSON.parse(fs.readFileSync(file, 'utf-8')) as Record<string, unknown>;
    mutate(raw);
    fs.writeFileSync(file, JSON.stringify(raw, null, 2));
    return { sceneId, revision: manifest.revision };
  }

  it('refuses a file that is not valid JSON', () => {
    const h = harness('simple_humanoid_v1', 'adv-notjson');
    const manifest = store.saveSnapshot(h.scene);
    fs.writeFileSync(path.join(storeRoot, 'adv-notjson', `r${String(manifest.revision).padStart(6, '0')}.json`), '{ truncated');
    expect(() => store.loadSnapshot('adv-notjson', manifest.revision)).toThrow(/SNAPSHOT_CORRUPT|not readable JSON/);
  });

  it('refuses a payload edited without updating the checksum', () => {
    const { sceneId, revision } = saveThen('adv-tampered', raw => {
      (raw.state as Record<string, unknown>).sceneId = 'someone-elses-scene';
    });
    try {
      store.loadSnapshot(sceneId, revision);
      throw new Error('expected a throw');
    } catch (error) {
      expect((error as MlError).code).toBe('SNAPSHOT_CHECKSUM_MISMATCH');
    }
  });

  it('refuses a checksum edited to match a tampered payload when the content hash disagrees', () => {
    // The attacker changes the payload *and* recomputes the manifest checksum, which the naive
    // check would accept. The state's own content hash is what catches it.
    const { sceneId, revision } = saveThen('adv-rehashed', raw => {
      const state = raw.state as Record<string, unknown>;
      (state.sceneSettings as Record<string, unknown>).frameCount = 9999;
      const crypto = require('crypto') as typeof import('crypto');
      const sortKeys = (value: unknown): unknown => {
        if (Array.isArray(value)) return value.map(sortKeys);
        if (value && typeof value === 'object') {
          return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, sortKeys(v)]));
        }
        return value;
      };
      (raw.manifest as Record<string, unknown>).payloadChecksum =
        crypto.createHash('sha256').update(JSON.stringify(sortKeys(state))).digest('hex');
    });
    try {
      store.loadSnapshot(sceneId, revision);
      throw new Error('expected a throw');
    } catch (error) {
      expect((error as MlError).code).toBe('SNAPSHOT_CORRUPT');
    }
  });

  it('refuses a snapshot whose schema version has no migration path', () => {
    const { sceneId, revision } = saveThen('adv-oldschema', raw => {
      (raw.manifest as Record<string, unknown>).schemaVersion = '0.1';
    });
    try {
      store.loadSnapshot(sceneId, revision);
      throw new Error('expected a throw');
    } catch (error) {
      expect((error as MlError).code).toBe('SNAPSHOT_SCHEMA_UNSUPPORTED');
    }
  });

  it('does not list a corrupt file as an available revision', () => {
    const h = harness('simple_humanoid_v1', 'adv-listcorrupt');
    store.saveSnapshot(h.scene);
    fs.writeFileSync(path.join(storeRoot, 'adv-listcorrupt', 'r000009.json'), 'not json at all');
    const revisions = store.listRevisions('adv-listcorrupt');
    expect(revisions.map(r => r.revision)).not.toContain(9);
  });
});

describe('malformed plans and hostile values', () => {
  it('refuses an unknown command discriminator', () => {
    const h = harness();
    const valid = plan([command({ type: 'create_peg', params: { parentPath: 'Top', pegName: 'P', position: { x: 0, y: 0 } } })]);
    const forged = { ...valid, commands: [{ ...valid.commands[0], payload: { type: 'summon_dragon', params: {} } }] };
    const { result, state } = h.simulator.execute(h.scene, forged as typeof valid);
    expect(result.errors[0].code).toBe('SIMULATOR_PLAN_REJECTED');
    expect(state.contentHash).toBe(h.scene.contentHash);
  });

  it('refuses NaN and Infinity in a keyframe value', () => {
    const h = harness();
    const node = nodeOf(h.manifest, 'torso');
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const valid = plan([transformKey(node, 3, { rotationZ: 0 }, { preconditions: [{ kind: 'node_exists', nodePath: node }] })]);
      const forged = JSON.parse(JSON.stringify(valid)) as typeof valid;
      // JSON cannot carry NaN, so the value is injected after cloning.
      (forged.commands[0].payload.params as Record<string, unknown>).rotationZ = value;
      const { result, state } = h.simulator.execute(h.scene, forged);
      expect(['SIMULATOR_PLAN_REJECTED', 'SIMULATOR_NON_FINITE_VALUE']).toContain(result.errors[0].code);
      expect(state.contentHash).toBe(h.scene.contentHash);
    }
  });

  it('refuses a topology cycle introduced through the peg hierarchy', () => {
    const h = harness();
    const { result } = h.simulator.execute(h.scene, plan([
      command({ type: 'attach_drawing_to_peg', params: { drawingNodePath: 'Top/Character/Torso_Peg', pegNodePath: 'Top/Character/Head_Peg' } }, {
        preconditions: [{ kind: 'node_exists', nodePath: 'Top/Character/Torso_Peg' }]
      })
    ]));
    expect(['SIMULATOR_CYCLE_DETECTED', 'SIMULATOR_CONNECTION_INVALID']).toContain(result.errors[0].code);
  });

  it('refuses an oversized plan without executing any of it', () => {
    const h = harness();
    const commands = Array.from({ length: 200 }, (_, i) =>
      command({ type: 'create_peg', params: { parentPath: 'Top', pegName: `Bulk${i}`, position: { x: 0, y: 0 } } }));
    const { result, state } = h.simulator.execute(h.scene, plan(commands), { limits: { maxCommands: 50 } });
    expect(result.errors[0].code).toBe('SIMULATOR_BUDGET_EXCEEDED');
    expect(state.nodes.length).toBe(h.scene.nodes.length);
  });

  it('refuses a plan that would exceed the node budget mid-execution, and rolls back', () => {
    const h = harness();
    const commands = Array.from({ length: 30 }, (_, i) =>
      command({ type: 'create_peg', params: { parentPath: 'Top', pegName: `Node${i}`, position: { x: 0, y: 0 } } }));
    const { result, state } = h.simulator.execute(h.scene, plan(commands), { limits: { maxNodes: h.scene.nodes.length + 5 } });
    expect(result.status).toBe('rolled_back');
    expect(result.errors[0].code).toBe('SIMULATOR_BUDGET_EXCEEDED');
    expect(state.contentHash).toBe(h.scene.contentHash);
  });
});

describe('cancellation and timeout', () => {
  it('cancellation mid-execution rolls an atomic plan back completely', () => {
    const h = harness();
    const torso = nodeOf(h.manifest, 'torso');
    const controller = new AbortController();
    const commands = Array.from({ length: 40 }, (_, i) =>
      transformKey(torso, i + 1, { rotationZ: i }, { preconditions: [{ kind: 'node_exists', nodePath: torso }] }));

    let seen = 0;
    // The clock hook is also the observation point: after a few commands the caller aborts.
    const now = () => { seen += 1; if (seen > 12) controller.abort(); return 0; };

    const { state, result } = h.simulator.execute(h.scene, plan(commands), { mode: 'atomic', signal: controller.signal, now });
    expect(result.status).toBe('cancelled');
    expect(result.errors[0].code).toBe('SIMULATOR_CANCELLED');
    expect(result.rollbackPerformed).toBe(true);
    expect(state.contentHash).toBe(h.scene.contentHash);
    expect(state.keyframes).toHaveLength(0);
  });

  it('a plan already cancelled before the first command applies nothing', () => {
    const h = harness();
    const controller = new AbortController();
    controller.abort();
    const { state, result } = h.simulator.execute(h.scene, plan([
      command({ type: 'create_peg', params: { parentPath: 'Top', pegName: 'NeverMade', position: { x: 0, y: 0 } } })
    ]), { signal: controller.signal });
    expect(result.status).toBe('cancelled');
    expect(state.nodes.some(n => n.path === 'Top/NeverMade')).toBe(false);
  });

  it('timeout aborts and rolls back an atomic plan', () => {
    const h = harness();
    const torso = nodeOf(h.manifest, 'torso');
    const commands = Array.from({ length: 20 }, (_, i) =>
      transformKey(torso, i + 1, { rotationZ: i }, { preconditions: [{ kind: 'node_exists', nodePath: torso }] }));

    let clock = 0;
    const now = () => { clock += 50; return clock; };

    const { state, result } = h.simulator.execute(h.scene, plan(commands), { mode: 'atomic', limits: { timeoutMs: 100 }, now });
    expect(result.status).toBe('timed_out');
    expect(result.errors[0].code).toBe('SIMULATOR_TIMEOUT');
    expect(state.contentHash).toBe(h.scene.contentHash);
  });

  it('cancellation in non-atomic mode keeps the prefix and says so', () => {
    const h = harness();
    const controller = new AbortController();
    let seen = 0;
    const now = () => { seen += 1; if (seen > 4) controller.abort(); return 0; };
    const commands = Array.from({ length: 10 }, (_, i) =>
      command({ type: 'create_peg', params: { parentPath: 'Top', pegName: `Partial${i}`, position: { x: 0, y: 0 } } }));

    const { state, result } = h.simulator.execute(h.scene, plan(commands), { mode: 'non_atomic', signal: controller.signal, now });
    expect(result.status).toBe('cancelled');
    expect(result.rollbackPerformed).toBe(false);
    expect(state.nodes.length).toBeGreaterThan(h.scene.nodes.length);
  });
});

describe('honesty cannot be forged', () => {
  it('an execution result cannot be edited to claim real Harmony execution', () => {
    const h = harness();
    const { result } = h.simulator.execute(h.scene, plan([
      command({ type: 'create_peg', params: { parentPath: 'Top', pegName: 'P', position: { x: 0, y: 0 } } })
    ]));
    for (const forgery of [
      { isRealHarmonyExecution: true },
      { simulated: false },
      { requiresRealHarmony: false },
      { realInferenceExecuted: true },
      { observedMode: 'real_harmony' }
    ]) {
      expect(simulatorExecutionResultV1Schema.safeParse({ ...result, ...forgery }).success).toBe(false);
    }
  });

  it('no simulator capability in the registry claims a Harmony verification level', () => {
    const registry = loadRegistry(process.cwd());
    const simulatorCapabilities = registry.capabilities.filter(c =>
      c.capabilityId.startsWith('harmony.contract_simulator') ||
      c.capabilityId.startsWith('rig.') ||
      c.capabilityId.startsWith('scene.') ||
      c.capabilityId === 'structural_offline_qa');

    expect(simulatorCapabilities.length).toBeGreaterThanOrEqual(6);
    for (const capability of simulatorCapabilities) {
      expect(capability.verificationLevel).not.toBe('real_harmony_smoke_verified');
      expect(capability.verificationLevel).not.toBe('real_harmony_repeatably_verified');
      expect(capability.verificationLevel).not.toBe('shot_verified');
      expect(capability.verificationLevel).not.toBe('episode_verified');
      expect(capabilitySchema.safeParse(capability).success).toBe(true);
    }
  });

  it('the registry gate rejects a synthetic capability promoted to a Harmony level without evidence', () => {
    const registry = loadRegistry(process.cwd());
    const forged = {
      ...registry,
      capabilities: [{
        capabilityId: 'harmony.contract_simulator.forged',
        productionStage: 'simulation',
        implementationFiles: ['src/services/harmonyContractSimulator/index.ts'],
        publicTools: [],
        backendType: 'typescript_simulation',
        verificationLevel: 'real_harmony_smoke_verified',
        evidencePaths: [],
        models: [],
        measured: {},
        knownFailures: [],
        blockingReason: null,
        lastVerifiedAt: '2026-07-28',
        nextRequiredProof: 'none'
      }]
    };
    const violations = validateRegistry(forged as typeof registry, process.cwd());
    expect(violations.length).toBeGreaterThan(0);
  });

  it('a compatibility report never marks an incompatible plan as full coverage', () => {
    const manifest = loadRigFixture('simple_humanoid_v1');
    const report = new RigCompatibilityValidator().validate(manifest, plan([
      command({ type: 'render_final', params: { writeNodePath: 'Top/W', startFrame: 1, endFrame: 2 } })
    ]));
    expect(report.compatible).toBe(false);
    expect(report.coverage).toBeLessThan(1);
  });
});

describe('performance baseline (offline, not a Harmony measurement)', () => {
  it('executes a 1000-command plan, snapshots it, reloads it and diffs it', () => {
    const h = harness('simple_humanoid_v1', 'perf-scene', 2000);
    const torso = nodeOf(h.manifest, 'torso');
    const head = nodeOf(h.manifest, 'head');
    const commands = Array.from({ length: 1000 }, (_, i) =>
      transformKey(i % 2 === 0 ? torso : head, i + 1, { rotationZ: (i % 30) - 15 }, {
        idempotencyKey: `idem_perf_${i.toString().padStart(5, '0')}`,
        preconditions: [{ kind: 'node_exists', nodePath: i % 2 === 0 ? torso : head }]
      }));
    const bigPlan = plan(commands);

    const executeStart = Date.now();
    const executed = h.simulator.execute(h.scene, bigPlan, { limits: { timeoutMs: 120_000 } });
    const executeMs = Date.now() - executeStart;
    expect(executed.result.status).toBe('succeeded');
    expect(executed.result.appliedCount).toBe(1000);
    expect(executed.state.keyframes.length).toBe(1000);

    const saveStart = Date.now();
    const saved = store.saveSnapshot(executed.state);
    const saveMs = Date.now() - saveStart;

    const loadStart = Date.now();
    const reloaded = store.loadSnapshot(saved.sceneId, saved.revision).state;
    const loadMs = Date.now() - loadStart;
    expect(reloaded.contentHash).toBe(executed.state.contentHash);

    const diffStart = Date.now();
    const diff = require('../../src/services/harmonySceneDiff/index.js').diffScenes(h.scene, reloaded);
    const diffMs = Date.now() - diffStart;
    expect(diff.keyframes.added.length).toBe(1000);

    // Recorded as an offline baseline on this host, not as a service-level objective and
    // emphatically not as a statement about how fast real Harmony would be.
    // eslint-disable-next-line no-console
    console.log(`[perf] 1000-command execute ${executeMs} ms | snapshot save ${saveMs} ms | load ${loadMs} ms | diff ${diffMs} ms`);

    // Generous ceilings: they exist to catch an accidental quadratic blow-up, not to grade speed.
    expect(executeMs).toBeLessThan(120_000);
    expect(saveMs).toBeLessThan(30_000);
    expect(loadMs).toBeLessThan(30_000);
    expect(diffMs).toBeLessThan(30_000);
  }, 240_000);
});
