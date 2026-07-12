import { z } from 'zod';

export const reconstructionModeSchema = z.enum(['frame_by_frame_vector']);

export const pointSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite()
}).strict();

export const vectorShapeSchema = z.object({
  id: z.string().min(1),
  colorId: z.string().min(1),
  closed: z.literal(true),
  points: z.array(pointSchema).min(3),
  area: z.number().nonnegative(),
  source: z.object({
    frame: z.number().int().positive(),
    method: z.enum(['contour_trace', 'harmony_vectorize'])
  }).strict(),
  confidence: z.number().min(0.0).max(1.0).default(1.0),
  uncertaintyCategories: z.array(z.string()).default([])
}).strict();

export const paletteColorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  rgba: z.tuple([
    z.number().int().min(0).max(255),
    z.number().int().min(0).max(255),
    z.number().int().min(0).max(255),
    z.number().int().min(0).max(255)
  ]),
  originalRgba: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  replacementError: z.number().nonnegative(),
  confidence: z.number().min(0.0).max(1.0).default(1.0),
  artistModified: z.boolean().default(false),
  artistLocked: z.boolean().default(false)
}).strict();

export const reconstructionDrawingSchema = z.object({
  id: z.string().min(1),
  name: z.string().regex(/^[A-Za-z0-9_-]+$/),
  sourceFrame: z.number().int().positive(),
  normalizedImagePath: z.string().min(1),
  shapes: z.array(vectorShapeSchema),
  pointCount: z.number().int().nonnegative(),
  locked: z.boolean().default(false),
  artistModified: z.boolean().default(false),
  artistLocked: z.boolean().default(false),
  confidence: z.number().min(0.0).max(1.0).default(1.0),
  uncertaintyCategories: z.array(z.string()).default([]),
  provenance: z.string().default('automatic_video_reconstruction')
}).strict();

export const exposureSchema = z.object({
  frame: z.number().int().positive(),
  duration: z.number().int().positive(),
  drawingId: z.string().min(1),
  confidence: z.number().min(0.0).max(1.0).default(1.0)
}).strict();

export const problemFrameSchema = z.object({
  frame: z.number().int().positive(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  category: z.string(),
  sourcePreviewPath: z.string(),
  vectorPreviewPath: z.string(),
  differencePreviewPath: z.string(),
  affectedDrawingId: z.string().optional().nullable(),
  metrics: z.record(z.number()).default({}),
  recommendedAction: z.string()
}).strict();

export const representationSegmentSchema = z.object({
  startFrame: z.number().int().positive(),
  endFrame: z.number().int().positive(),
  routingChoice: z.enum(['frame_by_frame_vector', 'peg_transform', 'deformer', 'substitution']),
  averageConfidence: z.number().min(0.0).max(1.0),
  drawingIds: z.array(z.string()),
  problemFrames: z.array(z.number()),
  explanation: z.string()
}).strict();

export const provenanceInfoSchema = z.object({
  tool: z.string().default('harmony-reconstruction-core'),
  version: z.string().default('2.0.0'),
  arguments: z.record(z.any()).default({}),
  timestamp: z.string()
}).strict();

export const reconstructionManifestSchema = z.object({
  schemaVersion: z.string().default('2.0'),
  manifestId: z.string().min(8),
  createdAt: z.string().datetime(),
  mode: reconstructionModeSchema,
  source: z.object({
    videoPath: z.string().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    fps: z.number().positive(),
    timeBase: z.string().min(1),
    durationSeconds: z.number().positive(),
    frameCount: z.number().int().positive(),
    variableFrameRate: z.boolean(),
    rotation: z.number(),
    colorSpace: z.string(),
    hasAlpha: z.boolean()
  }).strict(),
  scene: z.object({
    name: z.string().min(1),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    fps: z.number().positive(),
    startFrame: z.literal(1),
    endFrame: z.number().int().positive()
  }).strict(),
  palettes: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    colors: z.array(paletteColorSchema).min(1)
  }).strict()).min(1),
  elements: z.array(z.object({
    id: z.string().min(1),
    name: z.string().regex(/^[A-Za-z0-9_-]+$/),
    nodeName: z.string().regex(/^[A-Za-z0-9_-]+$/),
    drawingIds: z.array(z.string().min(1)).min(1),
    locked: z.boolean(),
    artistModified: z.boolean().default(false),
    artistLocked: z.boolean().default(false)
  }).strict()).length(1),
  drawings: z.array(reconstructionDrawingSchema).min(1),
  exposures: z.array(exposureSchema).min(1),
  nodes: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    type: z.enum(['READ', 'COMPOSITE', 'DISPLAY']),
    autoCreated: z.boolean(),
    locked: z.boolean(),
    artistModified: z.boolean().default(false),
    artistLocked: z.boolean().default(false)
  }).strict()).min(3),
  connections: z.array(z.object({
    from: z.string().min(1),
    to: z.string().min(1),
    fromPort: z.number().int().nonnegative(),
    toPort: z.number().int().nonnegative()
  }).strict()).min(2),
  diagnostics: z.object({
    uniqueDrawingCount: z.number().int().positive(),
    duplicateFrameCount: z.number().int().nonnegative(),
    paletteColorCount: z.number().int().positive(),
    totalPointCount: z.number().int().nonnegative(),
    warnings: z.array(z.string()),
    stageDurationsMs: z.record(z.number().nonnegative()),
    capability: z.object({
      vectorBackend: z.enum(['python_dom_shapes', 'harmony_vectorize']),
      lineArt: z.boolean(),
      colourArt: z.boolean(),
      nativeTvgRequired: z.literal(true)
    }).strict(),
    problemFrames: z.array(problemFrameSchema).default([]),
    representationSegments: z.array(representationSegmentSchema).default([])
  }).strict(),
  provenance: provenanceInfoSchema.optional().nullable()
}).strict().superRefine((manifest, ctx) => {
  const drawingIds = new Set(manifest.drawings.map(d => d.id));
  const colorIds = new Set(manifest.palettes.flatMap(p => p.colors.map(c => c.id)));
  for (const exposure of manifest.exposures) {
    if (!drawingIds.has(exposure.drawingId)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Unknown drawingId in exposure: ${exposure.drawingId}` });
    }
  }
  for (const drawing of manifest.drawings) {
    for (const shape of drawing.shapes) {
      if (!colorIds.has(shape.colorId)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Unknown colorId in shape: ${shape.colorId}` });
      }
    }
  }
  for (const element of manifest.elements) {
    for (const drawingId of element.drawingIds) {
      if (!drawingIds.has(drawingId)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Unknown drawingId in element: ${drawingId}` });
      }
    }
  }
  let nextFrame = 1;
  for (const exposure of manifest.exposures) {
    if (exposure.frame !== nextFrame) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Exposures are not contiguous at frame ${nextFrame}` });
    }
    nextFrame += exposure.duration;
  }
  const covered = manifest.exposures.reduce((sum, item) => sum + item.duration, 0);
  if (covered !== manifest.source.frameCount) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Exposures cover ${covered} frames, expected ${manifest.source.frameCount}` });
  }
});

export type HarmonyReconstructionManifest = z.infer<typeof reconstructionManifestSchema>;

export const reconstructionRequestSchema = z.object({
  videoPath: z.string().min(1).describe('Абсолютный путь к MP4 или другому видео.'),
  targetProjectPath: z.string().min(1).optional().describe('Существующая сцена .xstage для реального применения.'),
  outputProjectPath: z.string().min(1).optional().describe('Новый путь .xstage. Исходная сцена не меняется.'),
  startFrame: z.number().int().positive().optional(),
  endFrame: z.number().int().positive().optional(),
  mode: reconstructionModeSchema.default('frame_by_frame_vector'),
  targetFps: z.number().positive().max(120).optional(),
  maxColors: z.number().int().min(2).max(64).default(12),
  maxPointsPerShape: z.number().int().min(4).max(1000).default(120),
  dedupThreshold: z.number().min(0).max(1).default(0.035),
  cleanupProfile: z.enum(['preserve_generated_look', 'production_cleanup']).default('production_cleanup'),
  backgroundMode: z.enum(['keep', 'transparent']).default('keep'),
  dryRun: z.boolean().default(true),
  confirm: z.boolean().optional(),
  confirmationText: z.string().optional()
}).strict();

export const commandTypeSchema = z.enum([
  'create_palette',
  'add_palette_swatch',
  'create_drawing_element',
  'create_drawing',
  'write_path',
  'set_exposure',
  'create_node',
  'connect_nodes',
  'save_project'
]);

export const commandSchema = z.object({
  type: commandTypeSchema,
  params: z.record(z.any())
}).strict();

export const harmonyCommandPlanSchema = z.object({
  planId: z.string().min(8),
  manifestId: z.string().min(8),
  commands: z.array(commandSchema)
}).strict();

export type HarmonyCommandPlan = z.infer<typeof harmonyCommandPlanSchema>;
