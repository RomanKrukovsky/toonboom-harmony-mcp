import { z } from 'zod';
import { canonicalHash } from './harmonyActionDataset.js';
import { finiteNumberSchema, positiveFiniteSchema, sha256Schema, isoInstantSchema } from './ml.js';
import { rigChannelSchema } from './rigManifestV1.js';

/**
 * SimulatedSceneStateV1 — the canonical scene model the Harmony Contract Simulator mutates.
 *
 * This is a *simulation*. It models the subset of Harmony that `HarmonyCommandPlanV5` can
 * address, and nothing else. It is deliberately not called a Harmony scene, does not read or
 * write `.xstage`, and no value produced from it may ever carry `isRealHarmonyExecution: true`.
 *
 * The existing `HarmonySceneState` in `harmonyActionDataset.ts` models what a *capture* can read
 * back from a real Harmony. That contract stays untouched. This one adds what a simulator needs
 * and a capture cannot supply: palettes, controllers, drawing substitutions, a monotonic
 * revision and a command history.
 */

export const SIMULATED_SCENE_SCHEMA_VERSION = '1.0' as const;

/* -------------------------------------------------------------------- primitives ------ */

const nodePathSchema = z.string().regex(/^(Top)(\/[A-Za-z0-9_][A-Za-z0-9_\-. ]*)*$/, 'node path must start at Top');
const columnNameSchema = z.string().min(1).max(160);
const harmonyFrameSchema = z.number().int().min(1, 'Harmony timelines are 1-based; frame 0 is not a frame');

export const simNodeSchema = z.object({
  path: nodePathSchema,
  name: z.string().min(1),
  type: z.string().min(1),
  parentPath: z.string(),
  positionX: finiteNumberSchema,
  positionY: finiteNumberSchema,
  enabled: z.boolean(),
  /** Controller this node is bound to, when the rig claims it. */
  controllerId: z.string().nullable()
}).strict();
export type SimNode = z.infer<typeof simNodeSchema>;

export const simConnectionSchema = z.object({
  fromNode: nodePathSchema,
  fromPort: z.number().int().nonnegative(),
  toNode: nodePathSchema,
  toPort: z.number().int().nonnegative()
}).strict();
export type SimConnection = z.infer<typeof simConnectionSchema>;

export const simColumnSchema = z.object({
  name: columnNameSchema,
  type: z.enum(['BEZIER', 'VELOBEZIER', 'DRAWING', 'SOUND', 'PATH_3D']),
  linkedNodePath: nodePathSchema.nullable(),
  linkedChannel: rigChannelSchema.nullable()
}).strict();
export type SimColumn = z.infer<typeof simColumnSchema>;

export const simKeyframeSchema = z.object({
  columnName: columnNameSchema,
  frame: harmonyFrameSchema,
  value: finiteNumberSchema,
  interpolation: z.enum(['constant', 'linear', 'ease_in', 'ease_out', 'ease_in_out', 'bezier']),
  handleLeftX: finiteNumberSchema,
  handleLeftY: finiteNumberSchema,
  handleRightX: finiteNumberSchema,
  handleRightY: finiteNumberSchema,
  constSeg: z.boolean(),
  continuity: z.enum(['STRAIGHT', 'SMOOTH', 'CORNER'])
}).strict();
export type SimKeyframe = z.infer<typeof simKeyframeSchema>;

export const simExposureSchema = z.object({
  columnName: columnNameSchema,
  frame: harmonyFrameSchema,
  drawingName: z.string().min(1)
}).strict();
export type SimExposure = z.infer<typeof simExposureSchema>;

export const simDrawingSubstitutionSchema = z.object({
  columnName: columnNameSchema,
  frame: harmonyFrameSchema,
  drawingName: z.string().min(1),
  holdFrames: z.number().int().positive()
}).strict();
export type SimDrawingSubstitution = z.infer<typeof simDrawingSubstitutionSchema>;

export const simDrawingElementSchema = z.object({
  elementName: z.string().min(1),
  fieldGuide: z.number().int().positive(),
  scanType: z.enum(['COLOR', 'GRAY', 'BW']),
  /**
   * `TVG` may only appear in a state produced by a real Harmony. The simulator refuses to create
   * one, because authoring vector geometry is exactly what it cannot do.
   */
  vectorType: z.enum(['TVG', 'BITMAP']),
  drawings: z.array(z.string().min(1))
}).strict();

export const simPaletteSchema = z.object({
  paletteName: z.string().min(1),
  location: z.enum(['scene', 'element', 'environment', 'job']),
  elementName: z.string().nullable(),
  swatches: z.array(z.object({
    colorId: z.string().regex(/^0x[0-9a-fA-F]{16}$/),
    colorName: z.string().min(1),
    rgba: z.object({
      r: z.number().int().min(0).max(255),
      g: z.number().int().min(0).max(255),
      b: z.number().int().min(0).max(255),
      a: z.number().int().min(0).max(255)
    }).strict(),
    colorType: z.enum(['solid', 'gradient_linear', 'gradient_radial', 'texture'])
  }).strict())
}).strict();
export type SimPalette = z.infer<typeof simPaletteSchema>;

export const simCameraSchema = z.object({
  nodePath: nodePathSchema,
  isDefault: z.boolean(),
  offsetX: finiteNumberSchema,
  offsetY: finiteNumberSchema,
  offsetZ: finiteNumberSchema,
  rotationZ: finiteNumberSchema
}).strict();
export type SimCamera = z.infer<typeof simCameraSchema>;

export const simControllerBindingSchema = z.object({
  controllerId: z.string().min(1),
  nodePath: nodePathSchema,
  /** Column bound to each animated channel. Absent means the channel is static. */
  channelColumns: z.record(columnNameSchema),
  pivotX: finiteNumberSchema,
  pivotY: finiteNumberSchema,
  pivotSource: z.enum(['character_topology_pir', 'rig_template', 'manual', 'pivot_estimator', 'unset'])
}).strict();
export type SimControllerBinding = z.infer<typeof simControllerBindingSchema>;

export const simSwitchSelectionSchema = z.object({
  controllerId: z.string().min(1),
  elementName: z.string().min(1),
  frame: harmonyFrameSchema,
  drawingName: z.string().min(1)
}).strict();

export const simAttributeSchema = z.object({
  nodePath: nodePathSchema,
  attribute: z.string().min(1).max(200),
  value: z.union([finiteNumberSchema, z.string().max(2000), z.boolean()])
}).strict();

export const simSceneSettingsSchema = z.object({
  frameCount: z.number().int().positive(),
  frameRate: positiveFiniteSchema,
  resolutionX: z.number().int().positive(),
  resolutionY: z.number().int().positive()
}).strict();

/** An applied command, recorded so idempotency and history are provable rather than asserted. */
export const simCommandHistoryEntrySchema = z.object({
  revision: z.number().int().nonnegative(),
  planId: z.string().min(1),
  planIdempotencyKey: z.string().min(1),
  commandId: z.string().min(1),
  commandType: z.string().min(1),
  commandIdempotencyKey: z.string().min(1),
  /** Hash of the state *after* this command. Lets history be replayed and checked. */
  resultingStateHash: sha256Schema
}).strict();
export type SimCommandHistoryEntry = z.infer<typeof simCommandHistoryEntrySchema>;

export const simArtifactReferenceSchema = z.object({
  artifactId: z.string().min(1),
  sha256: sha256Schema,
  role: z.string().min(1),
  /** Store-relative. Absolute paths and traversal are rejected by the schema, not just the store. */
  relativePath: z.string().min(1).refine(p => !p.startsWith('/') && !/^[A-Za-z]:[\\/]/.test(p) && !p.split(/[\\/]/).includes('..'), { message: 'artifact paths must be store-relative and must not traverse' })
}).strict();

/* --------------------------------------------------------------------- the state ------ */

export const simulatedSceneStateV1Schema = z.object({
  schemaVersion: z.literal(SIMULATED_SCENE_SCHEMA_VERSION),
  kind: z.literal('SimulatedSceneStateV1'),
  sceneId: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/),
  rigId: z.string().min(1),
  rigVersion: z.string().min(1),

  /** Monotonic. Every applied plan increments it by exactly one. */
  revision: z.number().int().nonnegative(),

  sceneSettings: simSceneSettingsSchema,
  nodes: z.array(simNodeSchema),
  connections: z.array(simConnectionSchema),
  attributes: z.array(simAttributeSchema),
  columns: z.array(simColumnSchema),
  keyframes: z.array(simKeyframeSchema),
  exposures: z.array(simExposureSchema),
  drawingSubstitutions: z.array(simDrawingSubstitutionSchema),
  drawingElements: z.array(simDrawingElementSchema),
  switchSelections: z.array(simSwitchSelectionSchema),
  palettes: z.array(simPaletteSchema),
  cameras: z.array(simCameraSchema),
  controllerBindings: z.array(simControllerBindingSchema),

  metadata: z.record(z.union([z.string().max(2000), finiteNumberSchema, z.boolean()])),
  commandHistory: z.array(simCommandHistoryEntrySchema),
  artifactReferences: z.array(simArtifactReferenceSchema),

  /**
   * Content hash over the *logical* scene only. Excludes timestamps, history and artifact
   * references so that replaying the same plan on a different machine at a different time
   * yields the same hash.
   */
  contentHash: sha256Schema
}).strict();
export type SimulatedSceneStateV1 = z.infer<typeof simulatedSceneStateV1Schema>;

/* ------------------------------------------------------------- canonicalisation ------- */

/** Total orders that make the hash independent of insertion order. */
const order = {
  nodes: (a: SimNode, b: SimNode) => a.path.localeCompare(b.path),
  connections: (a: SimConnection, b: SimConnection) =>
    a.toNode.localeCompare(b.toNode) || a.toPort - b.toPort || a.fromNode.localeCompare(b.fromNode) || a.fromPort - b.fromPort,
  attributes: (a: z.infer<typeof simAttributeSchema>, b: z.infer<typeof simAttributeSchema>) =>
    a.nodePath.localeCompare(b.nodePath) || a.attribute.localeCompare(b.attribute),
  columns: (a: SimColumn, b: SimColumn) => a.name.localeCompare(b.name),
  keyframes: (a: SimKeyframe, b: SimKeyframe) => a.columnName.localeCompare(b.columnName) || a.frame - b.frame,
  exposures: (a: SimExposure, b: SimExposure) => a.columnName.localeCompare(b.columnName) || a.frame - b.frame,
  substitutions: (a: SimDrawingSubstitution, b: SimDrawingSubstitution) => a.columnName.localeCompare(b.columnName) || a.frame - b.frame,
  elements: (a: z.infer<typeof simDrawingElementSchema>, b: z.infer<typeof simDrawingElementSchema>) => a.elementName.localeCompare(b.elementName),
  switches: (a: z.infer<typeof simSwitchSelectionSchema>, b: z.infer<typeof simSwitchSelectionSchema>) =>
    a.controllerId.localeCompare(b.controllerId) || a.elementName.localeCompare(b.elementName) || a.frame - b.frame,
  palettes: (a: SimPalette, b: SimPalette) => a.paletteName.localeCompare(b.paletteName),
  cameras: (a: SimCamera, b: SimCamera) => a.nodePath.localeCompare(b.nodePath),
  bindings: (a: SimControllerBinding, b: SimControllerBinding) => a.controllerId.localeCompare(b.controllerId)
};

/** Returns a structurally identical state with every collection in canonical order. */
export function canonicaliseSceneState(state: SimulatedSceneStateV1): SimulatedSceneStateV1 {
  return {
    ...state,
    nodes: [...state.nodes].sort(order.nodes),
    connections: [...state.connections].sort(order.connections),
    attributes: [...state.attributes].sort(order.attributes),
    columns: [...state.columns].sort(order.columns),
    keyframes: [...state.keyframes].sort(order.keyframes),
    exposures: [...state.exposures].sort(order.exposures),
    drawingSubstitutions: [...state.drawingSubstitutions].sort(order.substitutions),
    drawingElements: [...state.drawingElements].sort(order.elements).map(e => ({ ...e, drawings: [...e.drawings].sort() })),
    switchSelections: [...state.switchSelections].sort(order.switches),
    palettes: [...state.palettes].sort(order.palettes).map(p => ({ ...p, swatches: [...p.swatches].sort((a, b) => a.colorId.localeCompare(b.colorId)) })),
    cameras: [...state.cameras].sort(order.cameras),
    controllerBindings: [...state.controllerBindings].sort(order.bindings)
  };
}

/**
 * Content hash of the logical scene.
 *
 * Excluded on purpose: `revision`, `commandHistory`, `artifactReferences` and `contentHash`
 * itself. Two scenes reached by different routes but holding the same content hash the same,
 * which is what makes a readback comparison meaningful.
 */
export function computeSceneContentHash(state: SimulatedSceneStateV1): string {
  const canonical = canonicaliseSceneState(state);
  return canonicalHash({
    schemaVersion: canonical.schemaVersion,
    sceneId: canonical.sceneId,
    rigId: canonical.rigId,
    rigVersion: canonical.rigVersion,
    sceneSettings: canonical.sceneSettings,
    nodes: canonical.nodes,
    connections: canonical.connections,
    attributes: canonical.attributes,
    columns: canonical.columns,
    keyframes: canonical.keyframes,
    exposures: canonical.exposures,
    drawingSubstitutions: canonical.drawingSubstitutions,
    drawingElements: canonical.drawingElements,
    switchSelections: canonical.switchSelections,
    palettes: canonical.palettes,
    cameras: canonical.cameras,
    controllerBindings: canonical.controllerBindings,
    metadata: canonical.metadata
  });
}

/** Re-canonicalises and re-hashes. The only supported way to produce a valid state. */
export function sealSceneState(state: SimulatedSceneStateV1): SimulatedSceneStateV1 {
  const canonical = canonicaliseSceneState(state);
  return { ...canonical, contentHash: computeSceneContentHash(canonical) };
}

/* ---------------------------------------------------------------------- readback ------ */

/**
 * SceneReadbackV1 — a normalised projection of a state, safe to compare directly.
 *
 * It deliberately drops everything that legitimately varies between two runs of the same plan:
 * revision, history, artifact references and node-view coordinates. What remains is what the
 * plan actually promised to produce.
 */
export const sceneReadbackV1Schema = z.object({
  schemaVersion: z.literal('1.0'),
  kind: z.literal('SceneReadbackV1'),
  sceneId: z.string().min(1),
  rigId: z.string().min(1),
  contentHash: sha256Schema,
  sceneSettings: simSceneSettingsSchema,
  nodePaths: z.array(nodePathSchema),
  connections: z.array(z.string().min(1)).describe('Rendered as `from:port->to:port` so ordering cannot matter.'),
  columns: z.array(z.object({ name: columnNameSchema, type: z.string(), keyframeCount: z.number().int().nonnegative() }).strict()),
  keyframesByColumn: z.record(z.array(z.object({ frame: harmonyFrameSchema, value: finiteNumberSchema, interpolation: z.string() }).strict())),
  exposuresByColumn: z.record(z.array(z.object({ frame: harmonyFrameSchema, drawingName: z.string() }).strict())),
  substitutionsByColumn: z.record(z.array(z.object({ frame: harmonyFrameSchema, drawingName: z.string(), holdFrames: z.number().int().positive() }).strict())),
  switchSelections: z.array(z.string().min(1)),
  palettes: z.array(z.object({ paletteName: z.string(), swatchIds: z.array(z.string()) }).strict()),
  cameras: z.array(z.object({ nodePath: nodePathSchema, isDefault: z.boolean(), offsetX: finiteNumberSchema, offsetY: finiteNumberSchema, offsetZ: finiteNumberSchema, rotationZ: finiteNumberSchema }).strict()),
  controllerBindings: z.array(z.object({ controllerId: z.string(), nodePath: nodePathSchema, channels: z.array(z.string()) }).strict()),
  metadata: z.record(z.union([z.string(), finiteNumberSchema, z.boolean()]))
}).strict();
export type SceneReadbackV1 = z.infer<typeof sceneReadbackV1Schema>;

export function readbackFromState(state: SimulatedSceneStateV1): SceneReadbackV1 {
  const canonical = canonicaliseSceneState(state);

  const keyframesByColumn: Record<string, Array<{ frame: number; value: number; interpolation: string }>> = {};
  for (const key of canonical.keyframes) {
    (keyframesByColumn[key.columnName] ??= []).push({ frame: key.frame, value: key.value, interpolation: key.interpolation });
  }
  const exposuresByColumn: Record<string, Array<{ frame: number; drawingName: string }>> = {};
  for (const exposure of canonical.exposures) {
    (exposuresByColumn[exposure.columnName] ??= []).push({ frame: exposure.frame, drawingName: exposure.drawingName });
  }
  const substitutionsByColumn: Record<string, Array<{ frame: number; drawingName: string; holdFrames: number }>> = {};
  for (const substitution of canonical.drawingSubstitutions) {
    (substitutionsByColumn[substitution.columnName] ??= []).push({ frame: substitution.frame, drawingName: substitution.drawingName, holdFrames: substitution.holdFrames });
  }

  return {
    schemaVersion: '1.0',
    kind: 'SceneReadbackV1',
    sceneId: canonical.sceneId,
    rigId: canonical.rigId,
    contentHash: canonical.contentHash,
    sceneSettings: canonical.sceneSettings,
    nodePaths: canonical.nodes.map(n => n.path),
    connections: canonical.connections.map(c => `${c.fromNode}:${c.fromPort}->${c.toNode}:${c.toPort}`),
    columns: canonical.columns.map(c => ({
      name: c.name,
      type: c.type,
      keyframeCount: canonical.keyframes.filter(k => k.columnName === c.name).length
    })),
    keyframesByColumn,
    exposuresByColumn,
    substitutionsByColumn,
    switchSelections: canonical.switchSelections.map(s => `${s.controllerId}:${s.elementName}@${s.frame}=${s.drawingName}`),
    palettes: canonical.palettes.map(p => ({ paletteName: p.paletteName, swatchIds: p.swatches.map(s => s.colorId) })),
    cameras: canonical.cameras.map(c => ({ nodePath: c.nodePath, isDefault: c.isDefault, offsetX: c.offsetX, offsetY: c.offsetY, offsetZ: c.offsetZ, rotationZ: c.rotationZ })),
    controllerBindings: canonical.controllerBindings.map(b => ({ controllerId: b.controllerId, nodePath: b.nodePath, channels: Object.keys(b.channelColumns).sort() })),
    metadata: canonical.metadata
  };
}

/* ------------------------------------------------------------- execution result ------- */

export const simulatorCommandOutcomeSchema = z.object({
  index: z.number().int().nonnegative(),
  commandId: z.string().min(1),
  commandType: z.string().min(1),
  outcome: z.enum(['applied', 'already_applied', 'skipped', 'rejected']),
  /** Present for `rejected` and for `skipped` with a stated reason. */
  errorCode: z.string().nullable(),
  message: z.string().nullable(),
  /** Concrete candidates offered when a lookup failed, so the caller can correct the plan. */
  availableCandidates: z.array(z.string()).default([])
}).strict()
  .refine(o => o.outcome !== 'rejected' || o.errorCode !== null, { message: 'a rejected command must carry an error code' })
  .refine(o => o.outcome !== 'applied' || o.errorCode === null, { message: 'an applied command must not carry an error code' });
export type SimulatorCommandOutcome = z.infer<typeof simulatorCommandOutcomeSchema>;

export const simulatorExecutionResultV1Schema = z.object({
  schemaVersion: z.literal('1.0'),
  kind: z.literal('SimulatorExecutionResultV1'),

  planId: z.string().min(1),
  sceneId: z.string().min(1),
  correlationId: z.string().min(1),
  idempotencyKey: z.string().min(1),

  requestedMode: z.enum(['dry_run', 'atomic', 'non_atomic']),
  /** Constant. There is exactly one mode this component can observe. */
  observedMode: z.literal('simulation'),
  status: z.enum(['succeeded', 'already_applied', 'rejected', 'rolled_back', 'cancelled', 'timed_out']),

  commandOutcomes: z.array(simulatorCommandOutcomeSchema),
  appliedCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  rejectedCount: z.number().int().nonnegative(),

  warnings: z.array(z.string()),
  errors: z.array(z.object({ code: z.string().min(1), message: z.string(), commandIndex: z.number().int().nonnegative().nullable(), commandId: z.string().nullable() }).strict()),

  beforeStateHash: sha256Schema,
  afterStateHash: sha256Schema,
  beforeRevision: z.number().int().nonnegative(),
  afterRevision: z.number().int().nonnegative(),
  rollbackPerformed: z.boolean(),
  rollbackVerified: z.boolean(),

  readbackHash: sha256Schema.nullable(),
  evidencePaths: z.array(z.string().min(1)),
  startedAt: isoInstantSchema,
  completedAt: isoInstantSchema,
  durationMs: z.number().nonnegative(),

  // The three honesty constants. They are literals, so a `true` cannot be represented at all.
  isRealHarmonyExecution: z.literal(false),
  realInferenceExecuted: z.literal(false),
  simulated: z.literal(true),
  requiresRealHarmony: z.literal(true)
}).strict()
  .refine(r => r.requestedMode !== 'dry_run' || r.afterRevision === r.beforeRevision, { message: 'a dry run must not advance the revision' })
  .refine(r => r.requestedMode !== 'dry_run' || r.afterStateHash === r.beforeStateHash, { message: 'a dry run must not change the state hash' })
  .refine(r => !r.rollbackPerformed || r.afterStateHash === r.beforeStateHash, { message: 'a performed rollback must restore the before hash' })
  .refine(r => r.status !== 'succeeded' || r.rejectedCount === 0, { message: 'a succeeded execution cannot contain rejected commands' })
  .refine(r => r.status !== 'rejected' || r.rejectedCount > 0 || r.errors.length > 0, { message: 'a rejected execution must state at least one rejection or error' })
  .refine(r => r.appliedCount + r.skippedCount + r.rejectedCount <= r.commandOutcomes.length, { message: 'outcome counts cannot exceed the number of recorded outcomes' });
export type SimulatorExecutionResultV1 = z.infer<typeof simulatorExecutionResultV1Schema>;
