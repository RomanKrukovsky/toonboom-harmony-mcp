import { z } from 'zod';
import type { SimulatedSceneStateV1 } from '../../schemas/simulatedSceneStateV1.js';
import { resolveController, type RigManifestV1 } from '../../schemas/rigManifestV1.js';

/**
 * structural_offline_qa — deterministic structural checks on a simulated scene.
 *
 * The name is the contract. This is **not** a visual critic, not an art director and not a
 * substitute for either. It cannot see the scene; it can only tell you that the graph is
 * acyclic, the keys are in range, the numbers are finite and the controllers the rig requires
 * are actually driven. Calling it "QA" without the qualifier would invite exactly the
 * over-reading this module is written to avoid.
 *
 * Every check is a pure function of the state and the rig manifest. No thresholds are inferred
 * from taste; the ones that exist are parameters with stated defaults.
 */

export const qaSeveritySchema = z.enum(['error', 'warning', 'info']);

export const qaFindingSchema = z.object({
  checkId: z.string().min(1),
  severity: qaSeveritySchema,
  message: z.string().min(1),
  /** The scene entity the finding is about: a node path, a column name, `column@frame`, … */
  subject: z.string().min(1),
  measured: z.union([z.number(), z.string(), z.boolean(), z.null()]),
  threshold: z.union([z.number(), z.string(), z.null()])
}).strict();
export type QaFinding = z.infer<typeof qaFindingSchema>;

export const qaReportSchema = z.object({
  schemaVersion: z.literal('1.0'),
  kind: z.literal('StructuralOfflineQaReportV1'),
  /** Stated explicitly so the report cannot be mistaken for a rendered or visual review. */
  qaKind: z.literal('structural_offline_qa'),
  visualReviewPerformed: z.literal(false),
  renderInspected: z.literal(false),
  sceneId: z.string().min(1),
  contentHash: z.string().min(1),
  passed: z.boolean(),
  findings: z.array(qaFindingSchema),
  errorCount: z.number().int().nonnegative(),
  warningCount: z.number().int().nonnegative(),
  checksRun: z.array(z.string().min(1)),
  thresholds: z.record(z.number()),
  checkedAt: z.string().min(1)
}).strict();
export type QaReport = z.infer<typeof qaReportSchema>;

export interface QaThresholds {
  /** Degrees per frame beyond which a rotation step is flagged. */
  maxRotationStepPerFrame: number;
  /** Harmony field units per frame beyond which a translation step is flagged. */
  maxTranslationStepPerFrame: number;
  /** Keys per column beyond which the curve is flagged as over-keyed. */
  maxKeysPerColumn: number;
  /** Total keys beyond which the scene is flagged. */
  maxTotalKeys: number;
}

export const DEFAULT_QA_THRESHOLDS: QaThresholds = {
  maxRotationStepPerFrame: 45,
  maxTranslationStepPerFrame: 4,
  maxKeysPerColumn: 600,
  maxTotalKeys: 20_000
};

const CHECK_IDS = [
  'orphan_nodes',
  'connection_cycles',
  'keys_outside_scene',
  'duplicate_keyframes',
  'non_finite_values',
  'controller_limit_violations',
  'unknown_drawing_substitutions',
  'invalid_exposure_ranges',
  'excessive_rotation_step',
  'excessive_translation_step',
  'excessive_key_count',
  'missing_required_controllers'
] as const;

export function runStructuralOfflineQa(
  state: SimulatedSceneStateV1,
  manifest: RigManifestV1,
  thresholds: Partial<QaThresholds> = {}
): QaReport {
  const limits = { ...DEFAULT_QA_THRESHOLDS, ...thresholds };
  const findings: QaFinding[] = [];
  const add = (checkId: string, severity: QaFinding['severity'], subject: string, message: string, measured: QaFinding['measured'] = null, threshold: QaFinding['threshold'] = null) =>
    findings.push({ checkId, severity, message, subject, measured, threshold });

  /* --- orphan nodes ---------------------------------------------------------------------- */
  // A node whose declared parent is absent is unreachable: it will never composite.
  const nodePaths = new Set(state.nodes.map(n => n.path));
  for (const node of state.nodes) {
    if (node.path === 'Top') continue;
    if (node.parentPath !== '' && !nodePaths.has(node.parentPath)) {
      add('orphan_nodes', 'error', node.path, `parent ${node.parentPath} does not exist`, node.parentPath);
    }
  }
  // A node with no inbound or outbound connection contributes nothing. Groups and Top are
  // legitimately unconnected, so they are excluded rather than flagged as noise.
  const connected = new Set<string>();
  for (const connection of state.connections) { connected.add(connection.fromNode); connected.add(connection.toNode); }
  for (const node of state.nodes) {
    if (node.path === 'Top' || node.type === 'GROUP') continue;
    if (!connected.has(node.path)) {
      add('orphan_nodes', 'warning', node.path, 'node participates in no connection', node.type);
    }
  }

  /* --- connection cycles ------------------------------------------------------------------ */
  const cycle = findCycle(state.connections);
  if (cycle) {
    add('connection_cycles', 'error', cycle.join(' -> '), 'the connection graph contains a cycle', cycle.length);
  }

  /* --- keyframe frame range --------------------------------------------------------------- */
  for (const key of state.keyframes) {
    if (key.frame < 1) {
      add('keys_outside_scene', 'error', `${key.columnName}@${key.frame}`, 'frame is below the 1-based Harmony origin', key.frame, 1);
    } else if (key.frame > state.sceneSettings.frameCount) {
      add('keys_outside_scene', 'error', `${key.columnName}@${key.frame}`, 'key lies past the end of the scene', key.frame, state.sceneSettings.frameCount);
    }
  }

  /* --- duplicate keyframes ---------------------------------------------------------------- */
  const keySeen = new Map<string, number>();
  for (const key of state.keyframes) {
    const id = `${key.columnName}@${key.frame}`;
    keySeen.set(id, (keySeen.get(id) ?? 0) + 1);
  }
  for (const [id, count] of keySeen) {
    if (count > 1) add('duplicate_keyframes', 'error', id, `${count} keys occupy the same column and frame`, count, 1);
  }

  /* --- non-finite values ------------------------------------------------------------------ */
  for (const key of state.keyframes) {
    if (!Number.isFinite(key.value)) add('non_finite_values', 'error', `${key.columnName}@${key.frame}`, `value is ${key.value}`, String(key.value));
  }
  for (const binding of state.controllerBindings) {
    for (const [field, value] of [['pivotX', binding.pivotX], ['pivotY', binding.pivotY]] as const) {
      if (!Number.isFinite(value)) add('non_finite_values', 'error', `${binding.controllerId}.${field}`, `value is ${value}`, String(value));
    }
  }
  for (const camera of state.cameras) {
    for (const [field, value] of [['offsetX', camera.offsetX], ['offsetY', camera.offsetY], ['offsetZ', camera.offsetZ], ['rotationZ', camera.rotationZ]] as const) {
      if (!Number.isFinite(value)) add('non_finite_values', 'error', `${camera.nodePath}.${field}`, `value is ${value}`, String(value));
    }
  }

  /* --- controller limits ------------------------------------------------------------------ */
  const columnsByName = new Map(state.columns.map(c => [c.name, c]));
  for (const key of state.keyframes) {
    const column = columnsByName.get(key.columnName);
    if (!column?.linkedChannel || !column.linkedNodePath) continue;
    const controller = state.controllerBindings.find(b => b.nodePath === column.linkedNodePath);
    const declared = controller ? resolveController(manifest, controller.controllerId) : undefined;
    const limit = declared?.limits.find(l => l.channel === column.linkedChannel);
    if (!limit) continue;
    if (key.value < limit.min || key.value > limit.max) {
      add('controller_limit_violations', limit.onViolation === 'reject' ? 'error' : 'warning',
        `${declared!.controllerId}.${column.linkedChannel}@${key.frame}`,
        `value ${key.value} is outside the declared limit`, key.value, `${limit.min}..${limit.max}`);
    }
  }

  /* --- drawing substitutions and exposures ------------------------------------------------ */
  const knownDrawings = new Set(state.drawingElements.flatMap(e => e.drawings));
  const rigDrawings = new Set(manifest.drawings.flatMap(d => d.drawings));
  for (const substitution of state.drawingSubstitutions) {
    if (knownDrawings.size > 0 && !knownDrawings.has(substitution.drawingName) && !rigDrawings.has(substitution.drawingName)) {
      add('unknown_drawing_substitutions', 'error', `${substitution.columnName}@${substitution.frame}`,
        `drawing ${substitution.drawingName} is declared by neither the scene nor the rig`, substitution.drawingName);
    }
    if (substitution.frame + substitution.holdFrames - 1 > state.sceneSettings.frameCount) {
      add('invalid_exposure_ranges', 'error', `${substitution.columnName}@${substitution.frame}`,
        `hold of ${substitution.holdFrames} frames runs past the end of the scene`, substitution.frame + substitution.holdFrames - 1, state.sceneSettings.frameCount);
    }
  }
  for (const exposure of state.exposures) {
    if (exposure.frame > state.sceneSettings.frameCount || exposure.frame < 1) {
      add('invalid_exposure_ranges', 'error', `${exposure.columnName}@${exposure.frame}`, 'exposure frame is outside the scene', exposure.frame, state.sceneSettings.frameCount);
    }
    if (knownDrawings.size > 0 && !knownDrawings.has(exposure.drawingName) && !rigDrawings.has(exposure.drawingName)) {
      add('unknown_drawing_substitutions', 'error', `${exposure.columnName}@${exposure.frame}`, `exposed drawing ${exposure.drawingName} is unknown`, exposure.drawingName);
    }
  }

  /* --- motion steps ------------------------------------------------------------------------ */
  const byColumn = new Map<string, typeof state.keyframes>();
  for (const key of state.keyframes) {
    const list = byColumn.get(key.columnName) ?? [];
    list.push(key);
    byColumn.set(key.columnName, list);
  }
  for (const [columnName, keys] of byColumn) {
    const column = columnsByName.get(columnName);
    const sorted = [...keys].sort((a, b) => a.frame - b.frame);
    const isRotation = column?.linkedChannel === 'rotationZ';
    const isTranslation = column?.linkedChannel === 'offsetX' || column?.linkedChannel === 'offsetY' || column?.linkedChannel === 'offsetZ';
    for (let i = 1; i < sorted.length; i += 1) {
      const spanFrames = Math.max(1, sorted[i].frame - sorted[i - 1].frame);
      const step = Math.abs(sorted[i].value - sorted[i - 1].value) / spanFrames;
      if (isRotation && step > limits.maxRotationStepPerFrame) {
        add('excessive_rotation_step', 'warning', `${columnName}@${sorted[i].frame}`, 'rotation changes faster than the configured threshold', Number(step.toFixed(4)), limits.maxRotationStepPerFrame);
      }
      if (isTranslation && step > limits.maxTranslationStepPerFrame) {
        add('excessive_translation_step', 'warning', `${columnName}@${sorted[i].frame}`, 'translation changes faster than the configured threshold', Number(step.toFixed(4)), limits.maxTranslationStepPerFrame);
      }
    }
    if (sorted.length > limits.maxKeysPerColumn) {
      add('excessive_key_count', 'warning', columnName, 'column carries more keys than the configured budget', sorted.length, limits.maxKeysPerColumn);
    }
  }
  if (state.keyframes.length > limits.maxTotalKeys) {
    add('excessive_key_count', 'warning', state.sceneId, 'scene carries more keys than the configured budget', state.keyframes.length, limits.maxTotalKeys);
  }

  /* --- required controllers ---------------------------------------------------------------- */
  // A rig that declares a root controller and channel mappings is stating what a finished scene
  // must drive. A scene that never binds them is structurally incomplete.
  const boundControllers = new Set(state.controllerBindings.map(b => b.controllerId));
  if (!boundControllers.has(manifest.rootControllerId) && state.controllerBindings.length > 0) {
    add('missing_required_controllers', 'warning', manifest.rootControllerId, 'the rig root controller is never driven in this scene', false);
  }
  for (const mapping of manifest.channelMappings) {
    if (!boundControllers.has(mapping.controllerId) && state.controllerBindings.length > 0) {
      add('missing_required_controllers', 'info', mapping.controllerId, `mapped from ${mapping.canonicalJoint} but never driven`, false);
    }
  }

  const errorCount = findings.filter(f => f.severity === 'error').length;
  return qaReportSchema.parse({
    schemaVersion: '1.0',
    kind: 'StructuralOfflineQaReportV1',
    qaKind: 'structural_offline_qa',
    visualReviewPerformed: false,
    renderInspected: false,
    sceneId: state.sceneId,
    contentHash: state.contentHash,
    passed: errorCount === 0,
    findings,
    errorCount,
    warningCount: findings.filter(f => f.severity === 'warning').length,
    checksRun: [...CHECK_IDS],
    thresholds: { ...limits },
    checkedAt: new Date().toISOString()
  });
}

/** Returns one cycle as a node path list, or null when the graph is acyclic. */
function findCycle(connections: SimulatedSceneStateV1['connections']): string[] | null {
  const outgoing = new Map<string, string[]>();
  for (const connection of connections) {
    const list = outgoing.get(connection.fromNode) ?? [];
    list.push(connection.toNode);
    outgoing.set(connection.fromNode, list);
  }
  const visiting = new Set<string>();
  const done = new Set<string>();
  const stack: string[] = [];

  const walk = (node: string): string[] | null => {
    if (done.has(node)) return null;
    if (visiting.has(node)) return [...stack.slice(stack.indexOf(node)), node];
    visiting.add(node);
    stack.push(node);
    for (const next of outgoing.get(node) ?? []) {
      const found = walk(next);
      if (found) return found;
    }
    stack.pop();
    visiting.delete(node);
    done.add(node);
    return null;
  };

  for (const node of outgoing.keys()) {
    const found = walk(node);
    if (found) return found;
  }
  return null;
}
