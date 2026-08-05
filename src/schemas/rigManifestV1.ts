import { z } from 'zod';
import { finiteNumberSchema, positiveFiniteSchema } from './ml.js';

/**
 * RigManifestV1 — the contract a character rig publishes so a command plan can be checked
 * *before* it is executed.
 *
 * This is the piece that was missing: `HarmonyCommandPlanV5` names node paths and column names,
 * but nothing declared which controllers actually exist, what channels they accept, or what
 * their limits are. Compiling a plan against a rig that cannot receive it produced a plan that
 * only failed at execution time — which, without Harmony, meant it never failed at all.
 *
 * A manifest describes a rig, not a scene. It carries no keyframes and no animation.
 */

export const RIG_MANIFEST_SCHEMA_VERSION = '1.0' as const;

/** Channels a controller can accept. Deliberately closed: an unknown channel is an error. */
export const rigChannelSchema = z.enum([
  'offsetX', 'offsetY', 'offsetZ',
  'rotationZ',
  'scaleX', 'scaleY',
  'skew',
  'pivotX', 'pivotY',
  'opacity',
  'drawingSubstitution',
  'switchSelection'
]);
export type RigChannel = z.infer<typeof rigChannelSchema>;

export const rigControllerKindSchema = z.enum([
  'peg', 'drawing', 'group', 'camera', 'deformer_bone', 'deformer_curve', 'master_controller', 'switch'
]);

export const rigCoordinateSystemSchema = z.object({
  /** Harmony field units across the camera width; 12 is the Harmony default. */
  unitsPerField: positiveFiniteSchema,
  /** `right_handed_y_up` matches Harmony field coordinates. */
  handedness: z.enum(['right_handed_y_up', 'left_handed_y_down']),
  /** Positive rotation direction as seen on screen. */
  rotationDirection: z.enum(['counter_clockwise', 'clockwise']),
  angleUnit: z.literal('degrees')
}).strict();
export type RigCoordinateSystem = z.infer<typeof rigCoordinateSystemSchema>;

export const rigTransformSchema = z.object({
  offsetX: finiteNumberSchema,
  offsetY: finiteNumberSchema,
  offsetZ: finiteNumberSchema,
  rotationZ: finiteNumberSchema,
  scaleX: finiteNumberSchema,
  scaleY: finiteNumberSchema,
  skew: finiteNumberSchema,
  pivotX: finiteNumberSchema,
  pivotY: finiteNumberSchema
}).strict();
export type RigTransform = z.infer<typeof rigTransformSchema>;

export const rigChannelLimitSchema = z.object({
  channel: rigChannelSchema,
  min: finiteNumberSchema,
  max: finiteNumberSchema,
  /**
   * `clamp` silently limits the value and records it; `reject` fails the command. A rig that
   * declares `reject` is stating that exceeding the limit is a compile bug, not a style choice.
   */
  onViolation: z.enum(['clamp', 'reject'])
}).strict().refine(l => l.max >= l.min, { message: 'limit max must not be below min' });
export type RigChannelLimit = z.infer<typeof rigChannelLimitSchema>;

/**
 * A single addressable controller.
 *
 * `controllerId` is the stable identity a plan compiler references. `target` is the Harmony-like
 * descriptor the simulator (and, one day, a real executor) resolves it to. Keeping them separate
 * is what lets a rig be renamed in Harmony without invalidating every compiled plan.
 */
export const rigControllerV1Schema = z.object({
  controllerId: z.string().regex(/^[a-z][a-z0-9_]*$/, 'controllerId must be lower_snake_case'),
  displayName: z.string().min(1),
  kind: rigControllerKindSchema,

  target: z.object({
    nodePath: z.string().regex(/^(Top)(\/[A-Za-z0-9_][A-Za-z0-9_\-. ]*)*$/, 'node path must start at Top'),
    nodeType: z.string().min(1),
    /** Column name prefix this controller's function columns use. */
    columnPrefix: z.string().min(1)
  }).strict(),

  parentId: z.string().nullable(),
  localTransform: rigTransformSchema,
  restTransform: rigTransformSchema,

  channels: z.array(rigChannelSchema).min(1),
  limits: z.array(rigChannelLimitSchema).default([]),

  /** Opposite-side controller, for symmetry checks. Must be reciprocal when present. */
  mirrorPairId: z.string().nullable(),
  /** Role in an IK chain, when the controller participates in one. */
  ikRole: z.enum(['root', 'mid', 'end', 'pole', 'none']).default('none'),
  /** Alternative names a plan compiler may use. Must be globally unique across the rig. */
  aliases: z.array(z.string().min(1)).default([]),

  provenance: z.object({
    author: z.string().min(1),
    createdAt: z.string().min(4),
    /** Where the controller came from: a hand-authored fixture, a template, or a capture. */
    source: z.enum(['hand_authored_fixture', 'rig_template', 'harmony_capture', 'derived'])
  }).strict()
}).strict()
  .refine(c => c.limits.every(l => c.channels.includes(l.channel)), { message: 'a limit may only be declared for a channel the controller accepts' })
  .refine(c => c.parentId !== c.controllerId, { message: 'a controller cannot be its own parent' })
  .refine(c => c.mirrorPairId !== c.controllerId, { message: 'a controller cannot mirror itself' });
export type RigControllerV1 = z.infer<typeof rigControllerV1Schema>;

export const rigIkChainSchema = z.object({
  chainId: z.string().min(1),
  rootControllerId: z.string().min(1),
  midControllerId: z.string().min(1),
  endControllerId: z.string().min(1),
  poleSign: z.union([z.literal(1), z.literal(-1)])
}).strict()
  .refine(c => new Set([c.rootControllerId, c.midControllerId, c.endControllerId]).size === 3, { message: 'an IK chain needs three distinct controllers' });
export type RigIkChain = z.infer<typeof rigIkChainSchema>;

export const rigSwitchDrawingSchema = z.object({
  controllerId: z.string().min(1),
  elementName: z.string().min(1),
  /** Every drawing name this switch may legally select. A plan naming anything else is rejected. */
  drawings: z.array(z.string().min(1)).min(1),
  defaultDrawing: z.string().min(1)
}).strict()
  .refine(s => s.drawings.includes(s.defaultDrawing), { message: 'defaultDrawing must be one of drawings' });
export type RigSwitchDrawing = z.infer<typeof rigSwitchDrawingSchema>;

export const rigMouthChartSchema = z.object({
  controllerId: z.string().min(1),
  elementName: z.string().min(1),
  /** Phoneme-group → drawing name. The keys are the project's viseme vocabulary. */
  shapes: z.record(z.string().min(1)),
  restShape: z.string().min(1)
}).strict()
  .refine(m => Object.values(m.shapes).includes(m.restShape), { message: 'restShape must be one of the mapped shapes' });

export const rigEyeControlSchema = z.object({
  controllerId: z.string().min(1),
  blinkChannel: rigChannelSchema,
  lookXChannel: rigChannelSchema,
  lookYChannel: rigChannelSchema,
  blinkClosedValue: finiteNumberSchema,
  blinkOpenValue: finiteNumberSchema
}).strict();

export const rigConstraintSchema = z.object({
  constraintId: z.string().min(1),
  kind: z.enum(['parent', 'aim', 'position', 'orientation', 'limit']),
  sourceControllerId: z.string().min(1),
  targetControllerId: z.string().min(1),
  weight: z.number().min(0).max(1)
}).strict();

/**
 * Command types the rig declares it can receive. The compatibility validator refuses a plan
 * containing anything outside this set, so an unsupported category fails before execution
 * rather than halfway through it.
 */
export const rigSupportedCommandSchema = z.string().min(1);

export const rigManifestV1Schema = z.object({
  schemaVersion: z.literal(RIG_MANIFEST_SCHEMA_VERSION),
  rigId: z.string().regex(/^[a-z][a-z0-9_]*$/),
  rigVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  displayName: z.string().min(1),

  fps: positiveFiniteSchema,
  sceneWidth: z.number().int().positive(),
  sceneHeight: z.number().int().positive(),
  coordinateSystem: rigCoordinateSystemSchema,

  rootControllerId: z.string().min(1),
  controllers: z.array(rigControllerV1Schema).min(1),

  /** Drawing elements the rig owns, with the drawing names each one exposes. */
  drawings: z.array(z.object({
    elementName: z.string().min(1),
    nodePath: z.string().min(1),
    drawings: z.array(z.string().min(1)).min(1)
  }).strict()).default([]),

  deformers: z.array(z.object({
    deformerId: z.string().min(1),
    chainName: z.string().min(1),
    attachedControllerId: z.string().min(1),
    kind: z.enum(['bone', 'curve'])
  }).strict()).default([]),

  constraints: z.array(rigConstraintSchema).default([]),
  ikChains: z.array(rigIkChainSchema).default([]),
  switchDrawings: z.array(rigSwitchDrawingSchema).default([]),
  mouthChart: rigMouthChartSchema.nullable().default(null),
  eyeControls: z.array(rigEyeControlSchema).default([]),

  /** Canonical joint → controller mapping, so a PIR can be bound without guessing. */
  channelMappings: z.array(z.object({
    canonicalJoint: z.string().min(1),
    controllerId: z.string().min(1),
    channel: rigChannelSchema
  }).strict()).default([]),

  supportedCapabilities: z.array(z.enum([
    'transform_keys', 'drawing_substitution', 'switch_selection', 'deformers',
    'palettes', 'camera_animation', 'grouping', 'sound', 'vector_drawing'
  ])).default([]),
  requiredCommandTypes: z.array(rigSupportedCommandSchema).default([]),

  compatibility: z.object({
    /** Harmony versions this rig was authored against. Informational; never a claim of testing. */
    harmonyVersions: z.array(z.string().min(1)).default([]),
    minimumPlanSchemaVersion: z.string().min(1),
    notes: z.string().default('')
  }).strict()
}).strict();
export type RigManifestV1 = z.infer<typeof rigManifestV1Schema>;

/* ------------------------------------------------------------------- invariants ------ */

export interface RigInvariantViolation {
  rule: string;
  controllerId: string | null;
  detail: string;
  severity: 'error' | 'warning';
}

/**
 * Structural checks a Zod schema cannot express: cross-references, cycles and symmetry.
 * Returns violations instead of throwing so a validator can report them all at once.
 */
export function checkRigInvariants(manifest: RigManifestV1): RigInvariantViolation[] {
  const violations: RigInvariantViolation[] = [];
  const byId = new Map(manifest.controllers.map(c => [c.controllerId, c]));

  const push = (rule: string, controllerId: string | null, detail: string, severity: 'error' | 'warning' = 'error') =>
    violations.push({ rule, controllerId, detail, severity });

  if (byId.size !== manifest.controllers.length) {
    push('duplicate_controller_id', null, 'two controllers share a controllerId');
  }
  if (!byId.has(manifest.rootControllerId)) {
    push('missing_root_controller', manifest.rootControllerId, 'rootControllerId does not name a declared controller');
  }

  // --- aliases must be globally unique, and must not collide with a controllerId ----------
  const aliasOwner = new Map<string, string>();
  for (const controller of manifest.controllers) {
    for (const alias of controller.aliases) {
      if (byId.has(alias) && alias !== controller.controllerId) {
        push('alias_shadows_controller', controller.controllerId, `alias ${alias} shadows another controllerId`);
      }
      const previous = aliasOwner.get(alias);
      if (previous && previous !== controller.controllerId) {
        push('duplicate_alias', controller.controllerId, `alias ${alias} is already claimed by ${previous}`);
      }
      aliasOwner.set(alias, controller.controllerId);
    }
  }

  // --- parent hierarchy: every parent exists, and there is no cycle -----------------------
  for (const controller of manifest.controllers) {
    if (controller.parentId !== null && !byId.has(controller.parentId)) {
      push('missing_parent', controller.controllerId, `parentId ${controller.parentId} does not exist`);
    }
  }
  for (const controller of manifest.controllers) {
    const seen = new Set<string>([controller.controllerId]);
    let cursor = controller.parentId;
    let depth = 0;
    while (cursor !== null && depth < manifest.controllers.length + 1) {
      if (seen.has(cursor)) {
        push('controller_cycle', controller.controllerId, `parent chain revisits ${cursor}`);
        break;
      }
      seen.add(cursor);
      cursor = byId.get(cursor)?.parentId ?? null;
      depth += 1;
    }
    if (depth > manifest.controllers.length) {
      push('controller_cycle', controller.controllerId, 'parent chain exceeds the controller count');
    }
  }

  // --- mirror pairing must be reciprocal --------------------------------------------------
  for (const controller of manifest.controllers) {
    if (controller.mirrorPairId === null) continue;
    const partner = byId.get(controller.mirrorPairId);
    if (!partner) {
      push('mirror_missing', controller.controllerId, `mirrorPairId ${controller.mirrorPairId} does not exist`);
      continue;
    }
    if (partner.mirrorPairId !== controller.controllerId) {
      push('mirror_not_reciprocal', controller.controllerId, `${partner.controllerId} does not mirror back`);
    }
  }

  // --- IK chains must reference existing controllers with coherent roles ------------------
  for (const chain of manifest.ikChains) {
    for (const [role, id] of [['root', chain.rootControllerId], ['mid', chain.midControllerId], ['end', chain.endControllerId]] as const) {
      const controller = byId.get(id);
      if (!controller) {
        push('ik_missing_controller', id, `chain ${chain.chainId} names an unknown ${role} controller`);
        continue;
      }
      if (controller.ikRole !== role && controller.ikRole !== 'none') {
        push('ik_role_mismatch', id, `chain ${chain.chainId} uses it as ${role} but it declares ikRole=${controller.ikRole}`, 'warning');
      }
    }
    // A chain is only meaningful when mid is parented under root and end under mid.
    const mid = byId.get(chain.midControllerId);
    const end = byId.get(chain.endControllerId);
    if (mid && mid.parentId !== chain.rootControllerId) {
      push('ik_chain_not_parented', chain.midControllerId, `chain ${chain.chainId}: mid is not parented to root`, 'warning');
    }
    if (end && end.parentId !== chain.midControllerId) {
      push('ik_chain_not_parented', chain.endControllerId, `chain ${chain.chainId}: end is not parented to mid`, 'warning');
    }
  }

  // --- switch drawings and mouth chart must reference declared elements -------------------
  const elements = new Map(manifest.drawings.map(d => [d.elementName, new Set(d.drawings)]));
  for (const entry of manifest.switchDrawings) {
    if (!byId.has(entry.controllerId)) {
      push('switch_missing_controller', entry.controllerId, `switch on ${entry.elementName} names an unknown controller`);
    }
    const declared = elements.get(entry.elementName);
    if (!declared) {
      push('switch_missing_element', entry.controllerId, `element ${entry.elementName} is not declared in drawings[]`);
      continue;
    }
    for (const drawing of entry.drawings) {
      if (!declared.has(drawing)) {
        push('switch_unknown_drawing', entry.controllerId, `${entry.elementName} does not expose drawing ${drawing}`);
      }
    }
  }
  if (manifest.mouthChart) {
    const declared = elements.get(manifest.mouthChart.elementName);
    if (!declared) {
      push('mouth_missing_element', manifest.mouthChart.controllerId, `mouth element ${manifest.mouthChart.elementName} is not declared`);
    } else {
      for (const [viseme, drawing] of Object.entries(manifest.mouthChart.shapes)) {
        if (!declared.has(drawing)) {
          push('mouth_unknown_drawing', manifest.mouthChart.controllerId, `viseme ${viseme} maps to unknown drawing ${drawing}`);
        }
      }
    }
  }

  // --- channel mappings must name real controllers and accepted channels ------------------
  for (const mapping of manifest.channelMappings) {
    const controller = byId.get(mapping.controllerId);
    if (!controller) {
      push('mapping_missing_controller', mapping.controllerId, `channelMapping for ${mapping.canonicalJoint} names an unknown controller`);
      continue;
    }
    if (!controller.channels.includes(mapping.channel)) {
      push('mapping_channel_unsupported', mapping.controllerId, `${mapping.controllerId} does not accept ${mapping.channel}`);
    }
  }

  // --- deformers and constraints ----------------------------------------------------------
  for (const deformer of manifest.deformers) {
    if (!byId.has(deformer.attachedControllerId)) {
      push('deformer_missing_controller', deformer.attachedControllerId, `deformer ${deformer.deformerId} is attached to an unknown controller`);
    }
  }
  for (const constraint of manifest.constraints) {
    for (const id of [constraint.sourceControllerId, constraint.targetControllerId]) {
      if (!byId.has(id)) push('constraint_missing_controller', id, `constraint ${constraint.constraintId} names an unknown controller`);
    }
  }

  // --- node paths must be unique across controllers ---------------------------------------
  const pathOwner = new Map<string, string>();
  for (const controller of manifest.controllers) {
    const previous = pathOwner.get(controller.target.nodePath);
    if (previous) {
      push('duplicate_node_path', controller.controllerId, `node path ${controller.target.nodePath} is already used by ${previous}`);
    }
    pathOwner.set(controller.target.nodePath, controller.controllerId);
  }

  return violations;
}

/** Resolves a controllerId or alias to its controller. Aliases are resolved case-sensitively. */
export function resolveController(manifest: RigManifestV1, idOrAlias: string): RigControllerV1 | undefined {
  const direct = manifest.controllers.find(c => c.controllerId === idOrAlias);
  if (direct) return direct;
  return manifest.controllers.find(c => c.aliases.includes(idOrAlias));
}

/** Resolves a Harmony node path back to the controller that owns it. */
export function controllerForNodePath(manifest: RigManifestV1, nodePath: string): RigControllerV1 | undefined {
  return manifest.controllers.find(c => c.target.nodePath === nodePath);
}
