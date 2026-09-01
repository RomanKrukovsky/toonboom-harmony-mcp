import { z } from 'zod';

export const MOHO_PRODUCTION_V3_STAGES = [
  'ingest',
  'decomposition',
  'rig_blueprint',
  'native_rig',
  'performance_plan',
  'key_pose_animatic',
  'final_animation',
  'native_render',
  'qa',
  'delivery'
] as const;

export const MOHO_PRODUCTION_V3_GATES = [
  'rig_blueprint',
  'key_pose_animatic',
  'final_render'
] as const;

export const mohoProductionV3StageSchema = z.enum(MOHO_PRODUCTION_V3_STAGES);
export const mohoProductionV3GateSchema = z.enum(MOHO_PRODUCTION_V3_GATES);
export const mohoProductionV3StatusSchema = z.enum([
  'queued',
  'running',
  'awaiting_approval',
  'completed',
  'failed',
  'blocked',
  'cancelled'
]);

const rasterOrVectorPathSchema = z.string().min(1).refine(
  value => /\.(?:png|jpe?g|svg)$/i.test(value),
  'Artwork must be PNG, JPG, JPEG, or SVG. PSD is not supported.'
);

const pngPathSchema = z.string().min(1).refine(
  value => /\.png$/i.test(value),
  'Generated part and mask assets must be PNG.'
);

const wavPathSchema = z.string().min(1).refine(
  value => /\.wav$/i.test(value),
  'Dialogue audio must be WAV.'
);

export const mohoProductionV3ArtworkInputSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('layered_manifest'),
    manifestPath: z.string().min(1).refine(value => /\.json$/i.test(value), 'Layer manifest must be JSON.'),
    assetPaths: z.array(rasterOrVectorPathSchema).default([]),
    backgroundPath: rasterOrVectorPathSchema.optional(),
    propPaths: z.array(rasterOrVectorPathSchema).default([])
  }).strict(),
  z.object({
    mode: z.literal('flat_characters'),
    imagePaths: z.array(rasterOrVectorPathSchema).min(1),
    characterRefs: z.array(z.string().min(1)).optional(),
    backgroundPath: rasterOrVectorPathSchema.optional(),
    propPaths: z.array(rasterOrVectorPathSchema).default([])
  }).strict(),
  z.object({
    mode: z.literal('flat_scene'),
    imagePath: rasterOrVectorPathSchema
  }).strict()
]).superRefine((value, context) => {
  if (value.mode === 'flat_characters' && value.characterRefs && value.characterRefs.length !== value.imagePaths.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['characterRefs'],
      message: 'characterRefs must match imagePaths length.'
    });
  }
});

export const mohoProductionV3DialogueTrackSchema = z.object({
  characterRef: z.string().min(1),
  audioPath: wavPathSchema,
  text: z.string().min(1),
  startFrame: z.number().int().nonnegative()
}).strict();

export const mohoProductionV3StartInputSchema = z.object({
  schemaVersion: z.literal('3.0').default('3.0'),
  shotId: z.string().min(1).max(128),
  outputDir: z.string().min(1),
  artwork: mohoProductionV3ArtworkInputSchema,
  styleReferencePaths: z.array(rasterOrVectorPathSchema).default([]),
  brief: z.string().min(1),
  durationFrames: z.number().int().positive(),
  fps: z.number().int().min(1).max(120).default(24),
  width: z.number().int().min(16).max(16384).default(1920),
  height: z.number().int().min(16).max(16384).default(1080),
  outputFormat: z.literal('mp4_h264').default('mp4_h264'),
  dialogueTracks: z.array(mohoProductionV3DialogueTrackSchema).default([])
}).strict();

export const modelProvenanceV3Schema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  callId: z.string().min(1),
  inputSha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  outputSha256: z.string().regex(/^[a-f0-9]{64}$/).optional()
}).strict();

const pointSchema = z.object({ x: z.number().finite(), y: z.number().finite() }).strict();

export const mohoProductionV3LayeredManifestSchema = z.object({
  schemaVersion: z.literal('3.0'),
  parts: z.array(z.object({
    partId: z.string().regex(/^[A-Za-z0-9_.-]+$/),
    characterRef: z.string().min(1).nullable().default(null),
    sourcePath: rasterOrVectorPathSchema,
    maskPath: rasterOrVectorPathSchema.nullable().default(null),
    zIndex: z.number().int(),
    confidence: z.number().min(0).max(1).default(1),
    pivot: pointSchema,
    view: z.string().min(1).default('front')
  }).strict()).min(1),
  occlusionGraph: z.array(z.object({
    frontPartId: z.string().min(1),
    backPartId: z.string().min(1)
  }).strict()).default([]),
  joints: z.array(z.object({
    jointId: z.string().min(1),
    parentPartId: z.string().min(1),
    childPartId: z.string().min(1),
    x: z.number().finite(),
    y: z.number().finite(),
    confidence: z.number().min(0).max(1).default(1)
  }).strict()).default([]),
  requiredViews: z.array(z.string().min(1)).min(1).default(['front']),
  drawingAssets: z.array(z.object({
    drawingId: z.string().regex(/^[A-Za-z0-9_.-]+$/),
    kind: z.enum(['mouth', 'eye', 'hand', 'view']),
    choiceName: z.string().min(1),
    sourcePath: rasterOrVectorPathSchema,
    confidence: z.number().min(0).max(1).default(1)
  }).strict()).default([]),
  overallConfidence: z.number().min(0).max(1).default(1)
}).strict().superRefine((value, context) => {
  const partIds = new Set<string>();
  for (const [index, part] of value.parts.entries()) {
    if (partIds.has(part.partId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['parts', index, 'partId'], message: 'partId must be unique.' });
    }
    partIds.add(part.partId);
  }
  const drawingIds = new Set<string>();
  for (const [index, drawing] of value.drawingAssets.entries()) {
    if (drawingIds.has(drawing.drawingId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['drawingAssets', index, 'drawingId'], message: 'drawingId must be unique.' });
    }
    drawingIds.add(drawing.drawingId);
  }
  for (const [index, edge] of value.occlusionGraph.entries()) {
    if (!partIds.has(edge.frontPartId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['occlusionGraph', index, 'frontPartId'], message: 'frontPartId must reference a known part.' });
    }
    if (!partIds.has(edge.backPartId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['occlusionGraph', index, 'backPartId'], message: 'backPartId must reference a known part.' });
    }
  }
  for (const [index, joint] of value.joints.entries()) {
    if (!partIds.has(joint.parentPartId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['joints', index, 'parentPartId'], message: 'parentPartId must reference a known part.' });
    }
    if (!partIds.has(joint.childPartId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['joints', index, 'childPartId'], message: 'childPartId must reference a known part.' });
    }
  }
});

export const artworkPackV3Schema = z.object({
  schemaVersion: z.literal('3.0'),
  shotId: z.string().min(1),
  parts: z.array(z.object({
    partId: z.string().min(1),
    characterRef: z.string().min(1).nullable().default(null),
    sourcePath: pngPathSchema,
    maskPath: pngPathSchema.nullable().default(null),
    zIndex: z.number().int(),
    confidence: z.number().min(0).max(1),
    pivot: pointSchema,
    synthesized: z.boolean().default(false),
    view: z.string().min(1).default('front')
  }).strict()).min(1),
  occlusionGraph: z.array(z.object({
    frontPartId: z.string().min(1),
    backPartId: z.string().min(1)
  }).strict()),
  joints: z.array(z.object({
    jointId: z.string().min(1),
    parentPartId: z.string().min(1),
    childPartId: z.string().min(1),
    x: z.number().finite(),
    y: z.number().finite(),
    confidence: z.number().min(0).max(1)
  }).strict()),
  requiredViews: z.array(z.string().min(1)),
  drawingSets: z.object({
    mouth: z.array(z.string().min(1)),
    eyes: z.array(z.string().min(1)),
    hands: z.array(z.string().min(1))
  }).strict(),
  drawingAssets: z.array(z.object({
    drawingId: z.string().min(1),
    kind: z.enum(['mouth', 'eye', 'hand', 'view']),
    sourcePath: pngPathSchema,
    confidence: z.number().min(0).max(1)
  }).strict()).default([]),
  overallConfidence: z.number().min(0).max(1),
  provenance: modelProvenanceV3Schema
}).strict();

export const rigBlueprintV3Schema = z.object({
  schemaVersion: z.literal('3.0'),
  shotId: z.string().min(1),
  bones: z.array(z.object({
    boneId: z.string().min(1),
    name: z.string().min(1),
    parentBoneId: z.string().min(1).nullable(),
    x: z.number().finite(),
    y: z.number().finite(),
    angleDeg: z.number().finite(),
    lengthPx: z.number().positive()
  }).strict()).min(1),
  bindings: z.array(z.object({
    partId: z.string().min(1),
    boneId: z.string().min(1),
    mode: z.enum(['layer', 'flexi', 'point'])
  }).strict()),
  constraints: z.array(z.object({
    boneId: z.string().min(1),
    minAngleDeg: z.number().finite(),
    maxAngleDeg: z.number().finite()
  }).strict()),
  switches: z.array(z.object({
    switchId: z.string().min(1),
    layerName: z.string().min(1),
    choices: z.array(z.object({
      choiceId: z.string().min(1),
      partId: z.string().min(1)
    }).strict()).min(1)
  }).strict()),
  actions: z.array(z.object({
    actionId: z.string().min(1),
    driverBoneId: z.string().min(1),
    driverMinAngleDeg: z.number().finite(),
    driverMaxAngleDeg: z.number().finite(),
    targets: z.array(z.object({
      boneId: z.string().min(1),
      minAngleDeg: z.number().finite(),
      maxAngleDeg: z.number().finite()
    }).strict()).min(1),
    minFrame: z.number().int().nonnegative().default(0),
    maxFrame: z.number().int().positive().default(100)
  }).strict()),
  warpMeshes: z.array(z.object({
    meshId: z.string().min(1),
    targetPartId: z.string().min(1),
    points: z.array(pointSchema).min(4)
  }).strict()),
  controlPoses: z.array(z.object({
    poseId: z.string().min(1),
    boneAngles: z.record(z.number().finite())
  }).strict()),
  vitruvianGroups: z.array(z.object({
    groupName: z.string().min(1),
    defaultActiveBoneId: z.string().min(1),
    boneIds: z.array(z.string().min(1)).min(1)
  }).strict()).default([]),
  shadows: z.array(z.object({
    layerName: z.string().min(1),
    rootBoneId: z.string().min(1),
    scaleY: z.number().finite().negative().default(-0.25)
  }).strict()).optional(),
  provenance: modelProvenanceV3Schema
}).strict().superRefine((value, context) => {
  const ids = new Set<string>();
  for (const [index, bone] of value.bones.entries()) {
    if (ids.has(bone.boneId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['bones', index, 'boneId'], message: 'boneId must be unique.' });
    }
    ids.add(bone.boneId);
  }
  for (const [index, bone] of value.bones.entries()) {
    if (bone.parentBoneId !== null && !ids.has(bone.parentBoneId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['bones', index, 'parentBoneId'], message: 'parentBoneId must reference a known bone.' });
    }
  }
});

const performanceBoneKeySchema = z.object({
  frame: z.number().int().nonnegative(),
  boneId: z.string().min(1),
  channel: z.enum(['rotation', 'translation', 'scale']),
  value: z.number().finite()
}).strict();

const performanceSwitchKeySchema = z.object({
  frame: z.number().int().nonnegative(),
  switchId: z.string().min(1),
  choice: z.string().min(1)
}).strict();

export const performancePlanV3Schema = z.object({
  schemaVersion: z.literal('3.0'),
  shotId: z.string().min(1),
  characters: z.array(z.object({
    characterRef: z.string().min(1),
    poseKeys: z.array(performanceBoneKeySchema),
    gazeKeys: z.array(performanceBoneKeySchema),
    emotionKeys: z.array(performanceSwitchKeySchema),
    gestureKeys: z.array(performanceBoneKeySchema),
    mouthKeys: z.array(performanceSwitchKeySchema),
    blinkKeys: z.array(performanceSwitchKeySchema),
    secondaryMotionKeys: z.array(performanceBoneKeySchema),
    interactionKeys: z.array(performanceBoneKeySchema)
  }).strict()).min(1),
  cameraKeys: z.array(z.object({
    frame: z.number().int().nonnegative(),
    xPixels: z.number().finite(),
    yPixels: z.number().finite(),
    zoom: z.number().positive(),
    rotationDeg: z.number().finite()
  }).strict()),
  continuityChecks: z.array(z.object({
    fromFrame: z.number().int().nonnegative(),
    toFrame: z.number().int().nonnegative(),
    passed: z.boolean(),
    note: z.string()
  }).strict()),
  unknownControllers: z.array(z.string()),
  interactionConflicts: z.array(z.string()),
  provenance: modelProvenanceV3Schema
}).strict();

export const mohoProductionV3ErrorCodeSchema = z.enum([
  'INPUT_INVALID',
  'ASSET_UNREADABLE',
  'DECOMPOSITION_LOW_CONFIDENCE',
  'RIG_NATIVE_FAILED',
  'MOHO_NOT_FOUND',
  'MOHO_PRO_REQUIRED',
  'MOHO_TIMEOUT',
  'LUA_FAILED',
  'RENDER_FAILED',
  'QA_FAILED',
  'RETAKE_BUDGET_EXHAUSTED',
  'APPROVAL_REQUIRED',
  'CANCELLED',
  'PROVIDER_UNAVAILABLE',
  'ALIGNER_UNAVAILABLE',
  'ALIGNMENT_FAILED',
  'UNSUPPORTED'
]);

export type MohoProductionV3Stage = z.infer<typeof mohoProductionV3StageSchema>;
export type MohoProductionV3Gate = z.infer<typeof mohoProductionV3GateSchema>;
export type MohoProductionV3Status = z.infer<typeof mohoProductionV3StatusSchema>;
export type MohoProductionV3StartInput = z.infer<typeof mohoProductionV3StartInputSchema>;
export type MohoProductionV3LayeredManifest = z.infer<typeof mohoProductionV3LayeredManifestSchema>;
export type ArtworkPackV3 = z.infer<typeof artworkPackV3Schema>;
export type RigBlueprintV3 = z.infer<typeof rigBlueprintV3Schema>;
export type PerformancePlanV3 = z.infer<typeof performancePlanV3Schema>;
export type MohoProductionV3ErrorCode = z.infer<typeof mohoProductionV3ErrorCodeSchema>;
