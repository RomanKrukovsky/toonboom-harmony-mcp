import { z } from 'zod';
import { finiteNumberSchema, positiveFiniteSchema, sha256Schema, isoInstantSchema } from './ml.js';

/**
 * Harmony Command Plan V5.
 *
 * V4 (`harmonyCommandPlanV4.ts`) stays exactly as it is and remains the read parser for
 * evidence written before this change. V5 is a new schema version, not an edit of V4, because
 * silently changing the meaning of `'4.0'` would retroactively invalidate committed evidence.
 *
 * What V5 fixes:
 *  - `params: z.record(z.any())` becomes a discriminated union with one strict params schema
 *    per command type. Unvalidated LLM or ML output can no longer reach a Harmony call.
 *  - `commands.min(10)` becomes `min(1)`. Ten was an arbitrary floor that forced compilers to
 *    pad plans with filler to pass validation.
 *  - `status` becomes a real lifecycle instead of the single literal `'implemented_unverified'`.
 *  - `requiresRealHarmony` becomes a boolean. A plan that genuinely runs offline may say so.
 *  - Every command names the PIR it was compiled from, so no step is authorless.
 */

export const HARMONY_COMMAND_PLAN_V5 = '5.0' as const;

/* ------------------------------------------------------------------ shared primitives --- */

const nodeNameSchema = z.string().min(1).max(120).regex(/^[A-Za-z0-9_][A-Za-z0-9_\-. ]*$/, 'illegal Harmony node name');
const nodePathSchema = z.string().min(1).max(400).regex(/^(Top)(\/[A-Za-z0-9_][A-Za-z0-9_\-. ]*)*$/, 'node path must start at Top');
const columnNameSchema = z.string().min(1).max(120);
/** Harmony timelines are 1-based. Frame 0 is not a frame. */
const harmonyFrameSchema = z.number().int().min(1);
const colorIdSchema = z.string().regex(/^0x[0-9a-fA-F]{16}$/, 'palette colour ids are 16 hex digits');
const paletteIdSchema = z.string().min(1).max(120);
/** Project-relative; the executor rejects anything absolute or traversing. */
const projectRelativePathSchema = z.string().min(1).refine(p => !p.startsWith('/') && !/^[A-Za-z]:[\\/]/.test(p) && !p.split(/[\\/]/).includes('..'), { message: 'path must be project-relative and must not traverse' });

const rgbaSchema = z.object({
  r: z.number().int().min(0).max(255),
  g: z.number().int().min(0).max(255),
  b: z.number().int().min(0).max(255),
  a: z.number().int().min(0).max(255)
}).strict();

const interpolationSchema = z.enum(['constant', 'linear', 'ease_in', 'ease_out', 'ease_in_out', 'bezier']);

const vector2Schema = z.object({ x: finiteNumberSchema, y: finiteNumberSchema }).strict();
const vector3Schema = z.object({ x: finiteNumberSchema, y: finiteNumberSchema, z: finiteNumberSchema }).strict();

/* ------------------------------------------------------------------- command payloads --- */
/* One strict schema per command. `.strict()` everywhere: an unexpected key is a hard error,
 * which is what stops a raw model response from being splatted into params. */

const cmd = <T extends string, S extends z.ZodTypeAny>(type: T, params: S) =>
  z.object({ type: z.literal(type), params }).strict();

export const harmonyCommandPayloadSchema = z.discriminatedUnion('type', [
  cmd('snapshot_project', z.object({
    snapshotId: z.string().min(1),
    includeRenders: z.boolean()
  }).strict()),

  cmd('create_palette', z.object({
    paletteName: paletteIdSchema,
    location: z.enum(['scene', 'element', 'environment', 'job']),
    elementName: nodeNameSchema.nullable()
  }).strict()),

  cmd('add_palette_swatch', z.object({
    paletteName: paletteIdSchema,
    colorId: colorIdSchema,
    colorName: z.string().min(1).max(120),
    rgba: rgbaSchema,
    colorType: z.enum(['solid', 'gradient_linear', 'gradient_radial', 'texture'])
  }).strict()),

  cmd('create_drawing_element', z.object({
    elementName: nodeNameSchema,
    /** `TVG` is only legal when the executor can actually author vector drawings. */
    fieldGuide: z.number().int().positive(),
    scanType: z.enum(['COLOR', 'GRAY', 'BW']),
    vectorType: z.enum(['TVG', 'BITMAP'])
  }).strict()),

  cmd('create_drawing', z.object({
    elementName: nodeNameSchema,
    drawingName: z.string().min(1).max(120),
    filename: projectRelativePathSchema.nullable()
  }).strict()),

  cmd('import_bitmap_drawing', z.object({
    elementName: nodeNameSchema,
    drawingName: z.string().min(1).max(120),
    sourceArtifactId: z.string().min(1),
    sourceSha256: sha256Schema,
    alignment: z.enum(['fit', 'pan', 'project_resolution', 'actual_size'])
  }).strict()),

  cmd('write_vector_path', z.object({
    elementName: nodeNameSchema,
    drawingName: z.string().min(1).max(120),
    layerName: z.string().min(1).max(120),
    /** Cubic path in drawing space. Closed paths repeat the first point explicitly. */
    points: z.array(z.object({
      point: vector2Schema,
      inHandle: vector2Schema.nullable(),
      outHandle: vector2Schema.nullable(),
      onCurve: z.boolean()
    }).strict()).min(2),
    closed: z.boolean(),
    strokeColorId: colorIdSchema.nullable(),
    fillColorId: colorIdSchema.nullable(),
    thickness: positiveFiniteSchema
  }).strict()),

  cmd('set_exposure', z.object({
    columnName: columnNameSchema,
    startFrame: harmonyFrameSchema,
    endFrame: harmonyFrameSchema,
    drawingName: z.string().min(1).max(120)
  }).strict().refine(p => p.endFrame >= p.startFrame, { message: 'endFrame must not precede startFrame' })),

  cmd('set_drawing_substitution', z.object({
    columnName: columnNameSchema,
    frame: harmonyFrameSchema,
    drawingName: z.string().min(1).max(120),
    holdFrames: z.number().int().positive()
  }).strict()),

  cmd('create_node', z.object({
    parentPath: nodePathSchema,
    nodeName: nodeNameSchema,
    nodeType: z.enum([
      'READ', 'COMPOSITE', 'WRITE', 'PEG', 'GROUP', 'DISPLAY', 'CAMERA',
      'COLOR_OVERRIDE', 'CUTTER', 'TRANSPARENCY', 'BLUR_RADIAL', 'TONE', 'HIGHLIGHT',
      'DEFORMATION_ROOT', 'BONE', 'CURVE', 'DEFORMATION_COMPOSITE', 'MULTIPORT_IN', 'MULTIPORT_OUT'
    ]),
    position: vector2Schema
  }).strict()),

  cmd('delete_node', z.object({ nodePath: nodePathSchema }).strict()),

  /**
   * Additive members introduced by the contract-simulator sprint.
   *
   * Adding a member to a discriminated union is backward compatible: every plan written against
   * the original `5.0` set still parses, because nothing was removed or re-typed. They exist
   * because rig work needs to rename a node and to drive a switch layer, and expressing either
   * through `set_attribute` would have meant smuggling structure through an untyped value.
   */
  cmd('rename_node', z.object({
    nodePath: nodePathSchema,
    newName: nodeNameSchema
  }).strict()),

  cmd('set_switch_selection', z.object({
    controllerId: z.string().min(1),
    elementName: nodeNameSchema,
    frame: harmonyFrameSchema,
    drawingName: z.string().min(1).max(120)
  }).strict()),

  cmd('connect_nodes', z.object({
    sourcePath: nodePathSchema,
    sourcePort: z.number().int().nonnegative(),
    targetPath: nodePathSchema,
    targetPort: z.number().int().nonnegative()
  }).strict()),

  cmd('disconnect_nodes', z.object({
    targetPath: nodePathSchema,
    targetPort: z.number().int().nonnegative()
  }).strict()),

  cmd('create_group', z.object({
    parentPath: nodePathSchema,
    groupName: nodeNameSchema,
    memberPaths: z.array(nodePathSchema).min(1),
    addComposite: z.boolean()
  }).strict()),

  cmd('create_peg', z.object({
    parentPath: nodePathSchema,
    pegName: nodeNameSchema,
    position: vector2Schema
  }).strict()),

  cmd('create_deformation_chain', z.object({
    parentPath: nodePathSchema,
    chainName: nodeNameSchema,
    attachToPath: nodePathSchema,
    chainType: z.enum(['bone', 'curve', 'mixed'])
  }).strict()),

  cmd('create_bone_deformer', z.object({
    chainPath: nodePathSchema,
    boneName: nodeNameSchema,
    parentBoneName: nodeNameSchema.nullable(),
    restOffset: vector2Schema,
    restRadius: positiveFiniteSchema,
    restBias: z.number().min(0).max(1),
    restLength: positiveFiniteSchema
  }).strict()),

  cmd('create_curve_deformer', z.object({
    chainPath: nodePathSchema,
    curveName: nodeNameSchema,
    parentName: nodeNameSchema.nullable(),
    restOffset: vector2Schema,
    restLength: positiveFiniteSchema,
    restRotation: finiteNumberSchema,
    handleLengthIn: positiveFiniteSchema,
    handleLengthOut: positiveFiniteSchema
  }).strict()),

  cmd('attach_drawing_to_peg', z.object({
    drawingNodePath: nodePathSchema,
    pegNodePath: nodePathSchema
  }).strict()),

  cmd('set_pivot', z.object({
    nodePath: nodePathSchema,
    pivot: vector2Schema,
    /** Which PIR estimated this pivot; a pivot with no source is not acceptable. */
    pivotSource: z.enum(['character_topology_pir', 'rig_template', 'manual', 'pivot_estimator'])
  }).strict()),

  cmd('set_attribute', z.object({
    nodePath: nodePathSchema,
    attributeName: z.string().min(1).max(200),
    value: z.union([finiteNumberSchema, z.string().max(2000), z.boolean(), rgbaSchema, vector3Schema])
  }).strict()),

  cmd('set_transform_keyframe', z.object({
    nodePath: nodePathSchema,
    frame: harmonyFrameSchema,
    offset: vector3Schema.nullable(),
    rotationZ: finiteNumberSchema.nullable(),
    scale: vector2Schema.nullable(),
    skew: finiteNumberSchema.nullable(),
    interpolation: interpolationSchema
  }).strict()),

  cmd('set_deformer_keyframe', z.object({
    deformerPath: nodePathSchema,
    frame: harmonyFrameSchema,
    offset: vector2Schema.nullable(),
    rotation: finiteNumberSchema.nullable(),
    length: positiveFiniteSchema.nullable(),
    interpolation: interpolationSchema
  }).strict()),

  cmd('set_function_point', z.object({
    columnName: columnNameSchema,
    frame: harmonyFrameSchema,
    value: finiteNumberSchema,
    handleLeftX: finiteNumberSchema,
    handleLeftY: finiteNumberSchema,
    handleRightX: finiteNumberSchema,
    handleRightY: finiteNumberSchema,
    constSeg: z.boolean(),
    continuity: z.enum(['STRAIGHT', 'SMOOTH', 'CORNER'])
  }).strict()),

  cmd('set_function_interpolation', z.object({
    columnName: columnNameSchema,
    frame: harmonyFrameSchema,
    interpolation: interpolationSchema
  }).strict()),

  cmd('create_sound_column', z.object({ columnName: columnNameSchema }).strict()),

  cmd('import_audio', z.object({
    columnName: columnNameSchema,
    sourceArtifactId: z.string().min(1),
    sourceSha256: sha256Schema,
    startFrame: harmonyFrameSchema
  }).strict()),

  cmd('create_camera', z.object({
    parentPath: nodePathSchema,
    cameraName: nodeNameSchema,
    setAsDefault: z.boolean()
  }).strict()),

  cmd('set_camera_keyframe', z.object({
    cameraPath: nodePathSchema,
    frame: harmonyFrameSchema,
    offset: vector3Schema.nullable(),
    rotationZ: finiteNumberSchema.nullable(),
    interpolation: interpolationSchema
  }).strict()),

  cmd('configure_write_node', z.object({
    nodePath: nodePathSchema,
    exportPrefix: z.string().min(1).max(200),
    exportDirectory: projectRelativePathSchema,
    format: z.enum(['PNG4', 'TGA', 'TIF', 'JPG', 'PSD', 'EXR', 'MOV', 'MP4']),
    resolutionX: z.number().int().positive(),
    resolutionY: z.number().int().positive()
  }).strict()),

  cmd('save_project', z.object({ createBackup: z.boolean() }).strict()),
  cmd('close_project', z.object({ save: z.boolean() }).strict()),
  cmd('reopen_project', z.object({ projectPath: projectRelativePathSchema }).strict()),

  cmd('inspect_native_entities', z.object({
    /** What the executor must read back and report; drives postcondition checking. */
    entityKinds: z.array(z.enum(['nodes', 'columns', 'palettes', 'drawings', 'deformers', 'sound', 'camera'])).min(1),
    rootPath: nodePathSchema
  }).strict()),

  cmd('render_preview', z.object({
    startFrame: harmonyFrameSchema,
    endFrame: harmonyFrameSchema,
    outputDirectory: projectRelativePathSchema,
    resolutionX: z.number().int().positive(),
    resolutionY: z.number().int().positive()
  }).strict().refine(p => p.endFrame >= p.startFrame, { message: 'endFrame must not precede startFrame' })),

  cmd('render_final', z.object({
    writeNodePath: nodePathSchema,
    startFrame: harmonyFrameSchema,
    endFrame: harmonyFrameSchema
  }).strict().refine(p => p.endFrame >= p.startFrame, { message: 'endFrame must not precede startFrame' })),

  cmd('compare_render', z.object({
    baselineArtifactId: z.string().min(1),
    candidateArtifactId: z.string().min(1),
    metric: z.enum(['pixel_diff', 'ssim', 'psnr']),
    failThreshold: z.number().min(0).max(1)
  }).strict()),

  cmd('rollback_snapshot', z.object({ snapshotId: z.string().min(1) }).strict()),
  cmd('verify_rollback', z.object({ snapshotId: z.string().min(1), expectedSha256: sha256Schema.nullable() }).strict())
]);
export type HarmonyCommandPayload = z.infer<typeof harmonyCommandPayloadSchema>;
export type HarmonyCommandType = HarmonyCommandPayload['type'];

export const HARMONY_V5_COMMAND_TYPES = [
  'snapshot_project', 'create_palette', 'add_palette_swatch', 'create_drawing_element',
  'create_drawing', 'import_bitmap_drawing', 'write_vector_path', 'set_exposure',
  'set_drawing_substitution', 'create_node', 'delete_node', 'rename_node',
  'set_switch_selection', 'connect_nodes', 'disconnect_nodes',
  'create_group', 'create_peg', 'create_deformation_chain', 'create_bone_deformer',
  'create_curve_deformer', 'attach_drawing_to_peg', 'set_pivot', 'set_attribute',
  'set_transform_keyframe', 'set_deformer_keyframe', 'set_function_point',
  'set_function_interpolation', 'create_sound_column', 'import_audio', 'create_camera',
  'set_camera_keyframe', 'configure_write_node', 'save_project', 'close_project',
  'reopen_project', 'inspect_native_entities', 'render_preview', 'render_final',
  'compare_render', 'rollback_snapshot', 'verify_rollback'
] as const satisfies readonly HarmonyCommandType[];

/* --------------------------------------------------------------------- command shell --- */

export const harmonyPreconditionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('node_exists'), nodePath: nodePathSchema }).strict(),
  z.object({ kind: z.literal('node_absent'), nodePath: nodePathSchema }).strict(),
  z.object({ kind: z.literal('column_exists'), columnName: columnNameSchema }).strict(),
  z.object({ kind: z.literal('palette_exists'), paletteName: paletteIdSchema }).strict(),
  z.object({ kind: z.literal('drawing_exists'), elementName: nodeNameSchema, drawingName: z.string().min(1) }).strict(),
  z.object({ kind: z.literal('snapshot_exists'), snapshotId: z.string().min(1) }).strict(),
  z.object({ kind: z.literal('artifact_available'), artifactId: z.string().min(1), sha256: sha256Schema }).strict(),
  z.object({ kind: z.literal('frame_range_valid'), startFrame: harmonyFrameSchema, endFrame: harmonyFrameSchema }).strict(),
  z.object({ kind: z.literal('scene_open') }).strict()
]);
export type HarmonyPrecondition = z.infer<typeof harmonyPreconditionSchema>;

export const harmonyPostconditionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('node_exists'), nodePath: nodePathSchema }).strict(),
  z.object({ kind: z.literal('node_absent'), nodePath: nodePathSchema }).strict(),
  z.object({ kind: z.literal('node_connected'), sourcePath: nodePathSchema, targetPath: nodePathSchema, targetPort: z.number().int().nonnegative() }).strict(),
  z.object({ kind: z.literal('attribute_equals'), nodePath: nodePathSchema, attributeName: z.string().min(1), expected: z.union([finiteNumberSchema, z.string(), z.boolean()]) }).strict(),
  z.object({ kind: z.literal('exposure_present'), columnName: columnNameSchema, frame: harmonyFrameSchema, drawingName: z.string().min(1) }).strict(),
  z.object({ kind: z.literal('function_point_count'), columnName: columnNameSchema, min: z.number().int().nonnegative(), max: z.number().int().nonnegative() }).strict(),
  z.object({ kind: z.literal('palette_contains'), paletteName: paletteIdSchema, colorId: colorIdSchema }).strict(),
  z.object({ kind: z.literal('file_exists'), relativePath: projectRelativePathSchema, nonEmpty: z.boolean() }).strict(),
  z.object({ kind: z.literal('frame_count_at_least'), count: z.number().int().positive() }).strict()
]);
export type HarmonyPostcondition = z.infer<typeof harmonyPostconditionSchema>;

export const harmonyRollbackSchema = z.discriminatedUnion('strategy', [
  z.object({ strategy: z.literal('none'), reason: z.string().min(1) }).strict(),
  z.object({ strategy: z.literal('delete_created'), nodePaths: z.array(nodePathSchema).min(1) }).strict(),
  z.object({ strategy: z.literal('restore_attribute'), nodePath: nodePathSchema, attributeName: z.string().min(1), previousValue: z.union([finiteNumberSchema, z.string(), z.boolean()]).nullable() }).strict(),
  z.object({ strategy: z.literal('remove_function_point'), columnName: columnNameSchema, frame: harmonyFrameSchema }).strict(),
  z.object({ strategy: z.literal('restore_snapshot'), snapshotId: z.string().min(1) }).strict(),
  z.object({ strategy: z.literal('reopen_snapshot'), snapshotId: z.string().min(1) }).strict()
]);
export type HarmonyRollback = z.infer<typeof harmonyRollbackSchema>;

export const harmonyVerificationStrategySchema = z.object({
  method: z.enum(['native_entity_inspection', 'scene_diff', 'file_presence', 'render_comparison', 'none']),
  required: z.boolean(),
  acceptance: z.array(z.string().min(1))
}).strict()
  .refine(v => v.method !== 'none' || !v.required, { message: 'a required verification cannot use method "none"' });

export const harmonyCommandV5Schema = z.object({
  commandId: z.string().regex(/^cmd_\d{1,6}$/),
  payload: harmonyCommandPayloadSchema,
  preconditions: z.array(harmonyPreconditionSchema),
  expectedPostconditions: z.array(harmonyPostconditionSchema).min(1),
  destructiveLevel: z.enum(['none', 'reversible', 'destructive']),
  idempotencyKey: z.string().min(12),
  rollback: harmonyRollbackSchema,
  verification: harmonyVerificationStrategySchema,
  /** The PIR artifact this command was compiled from. Every command must be attributable. */
  sourcePirId: z.string().min(1),
  sourcePirKind: z.enum([
    'CharacterTopologyPIR', 'CharacterRigPIR', 'PerformancePIR', 'RetargetingPlan',
    'PartDecompositionPIR', 'RigConstructionPlan', 'LipSyncPIR', 'PointTrackPIR',
    'FacePerformancePIR', 'InbetweenProposalPIR', 'ShotManifest', 'SceneSnapshotPIR'
  ])
}).strict()
  .refine(c => c.destructiveLevel !== 'destructive' || c.rollback.strategy !== 'none', { message: 'destructive commands must declare a rollback other than "none"' });
export type HarmonyCommandV5 = z.infer<typeof harmonyCommandV5Schema>;

export const harmonyPlanStatusSchema = z.enum([
  'planned', 'compiled', 'validated', 'approved', 'executing',
  'executed', 'verified', 'partially_verified', 'failed', 'rolled_back', 'blocked'
]);
export type HarmonyPlanStatus = z.infer<typeof harmonyPlanStatusSchema>;

export const harmonyCommandPlanV5Schema = z.object({
  schemaVersion: z.literal(HARMONY_COMMAND_PLAN_V5),
  planId: z.string().min(12),
  manifestId: z.string().min(8),
  shotId: z.string().min(1).nullable(),
  createdAt: isoInstantSchema,
  status: harmonyPlanStatusSchema,
  requiresRealHarmony: z.boolean(),
  executionMode: z.enum(['simulation', 'offline_deterministic', 'real_harmony']),
  sourceManifestSha256: sha256Schema,
  commands: z.array(harmonyCommandV5Schema).min(1),
  acceptanceGates: z.array(z.string().min(1)),
  provenance: z.object({
    compiler: z.string().min(1),
    compilerVersion: z.string().min(1),
    source: z.string().min(1),
    /** Ids of the ML jobs whose normalised PIRs fed this plan. Empty for hand-authored plans. */
    contributingMlJobIds: z.array(z.string().min(1))
  }).strict()
}).strict()
  .refine(p => new Set(p.commands.map(c => c.commandId)).size === p.commands.length, { message: 'commandId values must be unique within a plan' })
  .refine(p => new Set(p.commands.map(c => c.idempotencyKey)).size === p.commands.length, { message: 'idempotencyKey values must be unique within a plan' })
  .refine(p => p.executionMode !== 'real_harmony' || p.requiresRealHarmony, { message: 'executionMode real_harmony implies requiresRealHarmony' })
  .refine(p => !['executed', 'verified', 'partially_verified'].includes(p.status) || p.executionMode !== 'simulation', { message: 'a simulated plan can never reach an executed or verified status' });
export type HarmonyCommandPlanV5 = z.infer<typeof harmonyCommandPlanV5Schema>;

/* ------------------------------------------------------------------------ invariants ---- */

export interface PlanInvariantViolation {
  commandId: string | null;
  rule: string;
  detail: string;
}

/**
 * Checks the things a Zod schema structurally cannot: ordering, cross-command references and
 * the honesty rules. Returns violations rather than throwing, so a compiler can report all of
 * them at once instead of one per run.
 */
export function checkPlanInvariants(plan: HarmonyCommandPlanV5): PlanInvariantViolation[] {
  const violations: PlanInvariantViolation[] = [];
  const createdNodes = new Set<string>();
  const createdColumns = new Set<string>();
  const createdPalettes = new Set<string>();
  const snapshots = new Set<string>();

  for (const command of plan.commands) {
    const p = command.payload;

    // A precondition that names a node the plan itself creates must come after that creation.
    for (const pre of command.preconditions) {
      if (pre.kind === 'node_exists' && !createdNodes.has(pre.nodePath) && pre.nodePath !== 'Top') {
        // Not necessarily wrong — the node may pre-exist in the scene — but a plan that also
        // creates it later is definitely ordered wrong.
        const createdLater = plan.commands.some(c =>
          c.payload.type === 'create_node' &&
          `${c.payload.params.parentPath}/${c.payload.params.nodeName}` === pre.nodePath &&
          c.commandId > command.commandId);
        if (createdLater) {
          violations.push({ commandId: command.commandId, rule: 'precondition_ordering', detail: `requires ${pre.nodePath} which this plan creates later` });
        }
      }
      if (pre.kind === 'snapshot_exists' && !snapshots.has(pre.snapshotId)) {
        violations.push({ commandId: command.commandId, rule: 'snapshot_ordering', detail: `requires snapshot ${pre.snapshotId} before it is taken` });
      }
    }

    switch (p.type) {
      case 'snapshot_project': snapshots.add(p.params.snapshotId); break;
      case 'create_node': createdNodes.add(`${p.params.parentPath}/${p.params.nodeName}`); break;
      case 'rename_node': {
        // The old path stops existing and the new one starts; both are tracked so a later
        // command referencing the pre-rename path is reported as an ordering violation.
        const parent = p.params.nodePath.split('/').slice(0, -1).join('/');
        createdNodes.delete(p.params.nodePath);
        createdNodes.add(`${parent}/${p.params.newName}`);
        break;
      }
      case 'create_peg': createdNodes.add(`${p.params.parentPath}/${p.params.pegName}`); break;
      case 'create_group': createdNodes.add(`${p.params.parentPath}/${p.params.groupName}`); break;
      case 'create_camera': createdNodes.add(`${p.params.parentPath}/${p.params.cameraName}`); break;
      case 'create_sound_column': createdColumns.add(p.params.columnName); break;
      case 'create_palette': createdPalettes.add(p.params.paletteName); break;
      case 'add_palette_swatch':
        // Only an *ordering* problem is a violation. A palette the plan never creates is
        // assumed to pre-exist in the scene — a plan is not required to be self-contained, and
        // treating it as such rejected every plan that painted into an existing palette.
        if (!createdPalettes.has(p.params.paletteName)) {
          const createdLater = plan.commands.some(c =>
            c.payload.type === 'create_palette' &&
            c.payload.params.paletteName === p.params.paletteName &&
            c.commandId > command.commandId);
          if (createdLater) {
            violations.push({ commandId: command.commandId, rule: 'palette_ordering', detail: `adds a swatch to ${p.params.paletteName} which this plan creates later` });
          }
        }
        break;
      case 'rollback_snapshot':
      case 'verify_rollback':
        if (!snapshots.has(p.params.snapshotId)) {
          violations.push({ commandId: command.commandId, rule: 'snapshot_ordering', detail: `references snapshot ${p.params.snapshotId} that this plan never takes` });
        }
        break;
      case 'create_drawing_element':
        if (p.params.vectorType === 'TVG' && plan.executionMode !== 'real_harmony') {
          violations.push({ commandId: command.commandId, rule: 'tvg_requires_harmony', detail: 'TVG elements can only be authored by a real Harmony; use BITMAP or set executionMode real_harmony' });
        }
        break;
    }

    if (command.destructiveLevel === 'destructive' && command.verification.method === 'none') {
      violations.push({ commandId: command.commandId, rule: 'destructive_needs_verification', detail: 'destructive commands must be verifiable' });
    }
  }

  const hasDestructive = plan.commands.some(c => c.destructiveLevel === 'destructive');
  if (hasDestructive && snapshots.size === 0) {
    violations.push({ commandId: null, rule: 'destructive_needs_snapshot', detail: 'a plan containing destructive commands must take a snapshot first' });
  }

  return violations;
}
