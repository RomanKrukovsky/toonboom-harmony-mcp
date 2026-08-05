import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getProjectRoot } from '../../config.js';
import { MlError } from '../../errors/mlErrorRegistry.js';
import { rigManifestV1Schema, type RigManifestV1 } from '../../schemas/rigManifestV1.js';
import {
  harmonyCommandPlanV5Schema,
  HARMONY_COMMAND_PLAN_V5,
  type HarmonyCommandPlanV5,
  type HarmonyCommandV5
} from '../../schemas/harmonyCommandPlanV5.js';
import { HarmonyContractSimulator } from '../harmonyContractSimulator/index.js';
import type { SimulatedSceneStateV1 } from '../../schemas/simulatedSceneStateV1.js';

/**
 * Loads rig manifests from `fixtures/rigs/` and builds the initial scene each one implies.
 *
 * The initial scene is *executed*, not hand-written: a deterministic bootstrap plan creates the
 * nodes, drawing elements and palette the manifest declares, and the simulator applies it. A
 * hand-authored scene JSON could drift from the manifest without anything noticing; a scene the
 * simulator built cannot, because building it exercises the same preconditions.
 */

export function rigFixtureDir(): string {
  const raw = process.env.HARMONY_RIG_FIXTURE_DIR;
  if (raw) return path.resolve(raw);
  // Walk up for the fixtures directory so the loader works from any working directory.
  let dir = getProjectRoot();
  for (let depth = 0; depth < 10; depth += 1) {
    const candidate = path.join(dir, 'fixtures', 'rigs');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.join(getProjectRoot(), 'fixtures', 'rigs');
}

export function listRigFixtures(): string[] {
  const dir = rigFixtureDir();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, '')).sort();
}

/**
 * Reads a rig fixture. `parse: 'strict'` (the default) validates it; `parse: 'raw'` returns the
 * unvalidated JSON, which is how the deliberately-broken fixture is fed to the validator.
 */
export function loadRigFixture(rigId: string): RigManifestV1 {
  const raw = loadRigFixtureRaw(rigId);
  const parsed = rigManifestV1Schema.safeParse(raw);
  if (!parsed.success) {
    throw new MlError('RIG_MANIFEST_INVALID', `rig fixture ${rigId} failed its schema: ${parsed.error.message}`);
  }
  return parsed.data;
}

export function loadRigFixtureRaw(rigId: string): unknown {
  if (!/^[a-z][a-z0-9_]*$/.test(rigId)) {
    throw new MlError('SNAPSHOT_PATH_REJECTED', `rigId ${rigId} is not a legal fixture identifier`);
  }
  const file = path.join(rigFixtureDir(), `${rigId}.json`);
  if (!fs.existsSync(file)) {
    throw new MlError('RIG_MANIFEST_INVALID', `no rig fixture named ${rigId}`, {
      detail: { candidates: listRigFixtures() }
    });
  }
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

/**
 * Deterministic bootstrap plan: everything the rig declares must exist before an animation plan
 * can touch it. The plan is a function of the manifest alone, so the same rig always produces
 * the same initial scene hash.
 */
export function buildBootstrapPlan(manifest: RigManifestV1): HarmonyCommandPlanV5 {
  const commands: HarmonyCommandV5[] = [];
  let counter = 0;
  const nextId = () => `cmd_${(++counter).toString().padStart(4, '0')}`;
  const stableKey = (parts: string[]) =>
    `boot_${crypto.createHash('sha256').update([manifest.rigId, manifest.rigVersion, ...parts].join('|')).digest('hex').slice(0, 24)}`;

  const base = {
    destructiveLevel: 'none' as const,
    verification: { method: 'native_entity_inspection' as const, required: true, acceptance: ['entity exists after execution'] },
    sourcePirId: `${manifest.rigId}@${manifest.rigVersion}`,
    sourcePirKind: 'CharacterRigPIR' as const
  };

  // --- groups first: every controller node lives under a path that must already exist ------
  const requiredGroups = new Set<string>();
  for (const controller of manifest.controllers) {
    const parts = controller.target.nodePath.split('/');
    for (let i = 1; i < parts.length - 1; i += 1) requiredGroups.add(parts.slice(0, i + 1).join('/'));
  }
  for (const group of [...requiredGroups].sort()) {
    const parentPath = group.split('/').slice(0, -1).join('/');
    const groupName = group.split('/').pop()!;
    commands.push({
      ...base,
      commandId: nextId(),
      payload: { type: 'create_node', params: { parentPath, nodeName: groupName, nodeType: 'GROUP', position: { x: 0, y: 0 } } },
      preconditions: [{ kind: 'scene_open' }],
      expectedPostconditions: [{ kind: 'node_exists', nodePath: group }],
      idempotencyKey: stableKey(['group', group]),
      rollback: { strategy: 'delete_created', nodePaths: [group] }
    });
  }

  // --- controller nodes, parents before children -------------------------------------------
  for (const controller of orderByDepth(manifest)) {
    const parentPath = controller.target.nodePath.split('/').slice(0, -1).join('/');
    const nodeName = controller.target.nodePath.split('/').pop()!;
    const nodeType = controller.kind === 'drawing' ? 'READ' : controller.kind === 'camera' ? 'CAMERA' : controller.kind === 'group' ? 'GROUP' : 'PEG';
    commands.push({
      ...base,
      commandId: nextId(),
      payload: { type: 'create_node', params: { parentPath, nodeName, nodeType: nodeType as 'PEG', position: { x: 0, y: 0 } } },
      preconditions: [{ kind: 'node_exists', nodePath: parentPath }],
      expectedPostconditions: [{ kind: 'node_exists', nodePath: controller.target.nodePath }],
      idempotencyKey: stableKey(['controller', controller.controllerId]),
      rollback: { strategy: 'delete_created', nodePaths: [controller.target.nodePath] }
    });
  }

  // --- parent connections mirror the controller hierarchy ----------------------------------
  for (const controller of orderByDepth(manifest)) {
    if (controller.parentId === null) continue;
    const parent = manifest.controllers.find(c => c.controllerId === controller.parentId);
    if (!parent) continue;
    commands.push({
      ...base,
      commandId: nextId(),
      payload: { type: 'connect_nodes', params: { sourcePath: parent.target.nodePath, sourcePort: 0, targetPath: controller.target.nodePath, targetPort: 0 } },
      preconditions: [{ kind: 'node_exists', nodePath: parent.target.nodePath }, { kind: 'node_exists', nodePath: controller.target.nodePath }],
      expectedPostconditions: [{ kind: 'node_connected', sourcePath: parent.target.nodePath, targetPath: controller.target.nodePath, targetPort: 0 }],
      destructiveLevel: 'reversible',
      idempotencyKey: stableKey(['connect', controller.controllerId]),
      rollback: { strategy: 'delete_created', nodePaths: [controller.target.nodePath] }
    });
  }

  // --- drawing elements and their drawings ---------------------------------------------------
  for (const element of manifest.drawings) {
    commands.push({
      ...base,
      commandId: nextId(),
      // BITMAP, never TVG: the simulator cannot author vector geometry and refuses to pretend.
      payload: { type: 'create_drawing_element', params: { elementName: element.elementName, fieldGuide: 12, scanType: 'COLOR', vectorType: 'BITMAP' } },
      preconditions: [{ kind: 'scene_open' }],
      expectedPostconditions: [{ kind: 'frame_count_at_least', count: 1 }],
      idempotencyKey: stableKey(['element', element.elementName]),
      rollback: { strategy: 'none', reason: 'element creation is additive and idempotent' }
    });
    for (const drawing of element.drawings) {
      commands.push({
        ...base,
        commandId: nextId(),
        payload: { type: 'create_drawing', params: { elementName: element.elementName, drawingName: drawing, filename: null } },
        preconditions: [{ kind: 'scene_open' }],
        expectedPostconditions: [{ kind: 'frame_count_at_least', count: 1 }],
        idempotencyKey: stableKey(['drawing', element.elementName, drawing]),
        rollback: { strategy: 'none', reason: 'drawing creation is additive and idempotent' }
      });
    }
  }

  // --- a scene palette, so colour commands have somewhere to land ----------------------------
  if (manifest.supportedCapabilities.includes('palettes')) {
    commands.push({
      ...base,
      commandId: nextId(),
      payload: { type: 'create_palette', params: { paletteName: `${manifest.rigId}_palette`, location: 'scene', elementName: null } },
      preconditions: [{ kind: 'scene_open' }],
      expectedPostconditions: [{ kind: 'frame_count_at_least', count: 1 }],
      idempotencyKey: stableKey(['palette']),
      rollback: { strategy: 'none', reason: 'palette creation is additive' }
    });
  }

  const plan = {
    schemaVersion: HARMONY_COMMAND_PLAN_V5,
    planId: `bootstrap_${manifest.rigId}_${manifest.rigVersion.replace(/\./g, '_')}`,
    manifestId: `${manifest.rigId}@${manifest.rigVersion}`,
    shotId: null,
    // Fixed timestamp: the bootstrap plan is a pure function of the manifest, and a wall-clock
    // value here would make the initial scene non-reproducible across runs.
    createdAt: '2026-07-28T00:00:00.000Z',
    status: 'compiled' as const,
    requiresRealHarmony: false,
    executionMode: 'simulation' as const,
    sourceManifestSha256: crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex'),
    commands,
    acceptanceGates: ['every controller node exists', 'every declared drawing exists'],
    provenance: {
      compiler: 'RigFixtureLoader.buildBootstrapPlan',
      compilerVersion: '1.0.0',
      source: `${manifest.rigId}@${manifest.rigVersion}`,
      contributingMlJobIds: []
    }
  };

  const parsed = harmonyCommandPlanV5Schema.safeParse(plan);
  if (!parsed.success) {
    throw new MlError('HARMONY_PLAN_INVALID', `bootstrap plan for ${manifest.rigId} is invalid: ${parsed.error.message}`);
  }
  return parsed.data;
}

/** Loads a rig and returns the scene its bootstrap plan produces. */
export function buildInitialScene(
  manifest: RigManifestV1,
  sceneId: string,
  options: { frameCount?: number } = {}
): { state: SimulatedSceneStateV1; plan: HarmonyCommandPlanV5 } {
  const simulator = new HarmonyContractSimulator(manifest);
  const empty = simulator.createScene(sceneId, { frameCount: options.frameCount });
  const plan = buildBootstrapPlan(manifest);
  const { state, result } = simulator.execute(empty, plan, {
    mode: 'atomic',
    correlationId: `bootstrap_${manifest.rigId}`,
    now: () => 0
  });
  if (result.status !== 'succeeded') {
    const first = result.errors[0];
    throw new MlError('SIMULATOR_PLAN_REJECTED', `bootstrap for ${manifest.rigId} failed: ${first?.code ?? 'unknown'} ${first?.message ?? ''}`);
  }
  return { state, plan };
}

/** Controllers ordered so a parent always precedes its children. */
function orderByDepth(manifest: RigManifestV1): RigManifestV1['controllers'] {
  const byId = new Map(manifest.controllers.map(c => [c.controllerId, c]));
  const depthOf = (id: string, guard = 0): number => {
    const controller = byId.get(id);
    if (!controller || controller.parentId === null || guard > manifest.controllers.length) return 0;
    return 1 + depthOf(controller.parentId, guard + 1);
  };
  return [...manifest.controllers].sort((a, b) => {
    const delta = depthOf(a.controllerId) - depthOf(b.controllerId);
    return delta !== 0 ? delta : a.controllerId.localeCompare(b.controllerId);
  });
}
