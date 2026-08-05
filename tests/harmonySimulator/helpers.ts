import crypto from 'crypto';
import {
  harmonyCommandPlanV5Schema,
  HARMONY_COMMAND_PLAN_V5,
  type HarmonyCommandPlanV5,
  type HarmonyCommandV5,
  type HarmonyCommandPayload,
  type HarmonyPrecondition,
  type HarmonyPostcondition,
  type HarmonyRollback
} from '../../src/schemas/harmonyCommandPlanV5.js';
import { loadRigFixture, buildInitialScene } from '../../src/services/rigFixtureLoader/index.js';
import { HarmonyContractSimulator } from '../../src/services/harmonyContractSimulator/index.js';
import type { RigManifestV1 } from '../../src/schemas/rigManifestV1.js';
import type { SimulatedSceneStateV1 } from '../../src/schemas/simulatedSceneStateV1.js';

/** Shared builders. Keeping them here stops each suite from re-deriving plan boilerplate. */

let commandCounter = 0;

export function resetCommandCounter(): void {
  commandCounter = 0;
}

export interface CommandOverrides {
  commandId?: string;
  preconditions?: HarmonyPrecondition[];
  expectedPostconditions?: HarmonyPostcondition[];
  destructiveLevel?: HarmonyCommandV5['destructiveLevel'];
  idempotencyKey?: string;
  rollback?: HarmonyRollback;
}

export function command(payload: HarmonyCommandPayload, overrides: CommandOverrides = {}): HarmonyCommandV5 {
  commandCounter += 1;
  return {
    commandId: overrides.commandId ?? `cmd_${commandCounter.toString().padStart(4, '0')}`,
    payload,
    preconditions: overrides.preconditions ?? [{ kind: 'scene_open' }],
    expectedPostconditions: overrides.expectedPostconditions ?? [{ kind: 'frame_count_at_least', count: 1 }],
    destructiveLevel: overrides.destructiveLevel ?? 'reversible',
    idempotencyKey: overrides.idempotencyKey ?? `idem_${commandCounter.toString().padStart(4, '0')}_${crypto.randomBytes(4).toString('hex')}`,
    rollback: overrides.rollback ?? { strategy: 'none', reason: 'test command' },
    verification: { method: 'native_entity_inspection', required: true, acceptance: ['applied'] },
    sourcePirId: 'test_pir',
    sourcePirKind: 'PerformancePIR'
  };
}

export function plan(commands: HarmonyCommandV5[], overrides: Partial<Record<string, unknown>> = {}): HarmonyCommandPlanV5 {
  const draft = {
    schemaVersion: HARMONY_COMMAND_PLAN_V5,
    planId: `test_plan_${crypto.randomBytes(6).toString('hex')}`,
    manifestId: 'test_manifest',
    shotId: 'sh001',
    createdAt: '2026-07-28T00:00:00.000Z',
    status: 'compiled' as const,
    requiresRealHarmony: false,
    executionMode: 'simulation' as const,
    sourceManifestSha256: 'a'.repeat(64),
    commands,
    acceptanceGates: ['test'],
    provenance: { compiler: 'test', compilerVersion: '1.0.0', source: 'test', contributingMlJobIds: [] },
    ...overrides
  };
  const parsed = harmonyCommandPlanV5Schema.safeParse(draft);
  if (!parsed.success) throw new Error(`test plan is invalid: ${parsed.error.message}`);
  return parsed.data;
}

export interface Harness {
  manifest: RigManifestV1;
  simulator: HarmonyContractSimulator;
  scene: SimulatedSceneStateV1;
}

export function harness(rigId = 'simple_humanoid_v1', sceneId = 'test-scene', frameCount = 120): Harness {
  const manifest = loadRigFixture(rigId);
  const { state } = buildInitialScene(manifest, sceneId, { frameCount });
  return { manifest, simulator: new HarmonyContractSimulator(manifest), scene: state };
}

/** Node path of a controller, so tests do not hard-code rig internals. */
export function nodeOf(manifest: RigManifestV1, controllerId: string): string {
  const controller = manifest.controllers.find(c => c.controllerId === controllerId);
  if (!controller) throw new Error(`rig ${manifest.rigId} has no controller ${controllerId}`);
  return controller.target.nodePath;
}

export function transformKey(
  nodePath: string,
  frame: number,
  values: { rotationZ?: number; offset?: { x: number; y: number; z: number } } = {},
  overrides: CommandOverrides = {}
): HarmonyCommandV5 {
  return command({
    type: 'set_transform_keyframe',
    params: {
      nodePath,
      frame,
      offset: values.offset ?? null,
      rotationZ: values.rotationZ ?? null,
      scale: null,
      skew: null,
      interpolation: 'bezier'
    }
  }, {
    preconditions: [{ kind: 'node_exists', nodePath }],
    expectedPostconditions: [{ kind: 'node_exists', nodePath }],
    ...overrides
  });
}
