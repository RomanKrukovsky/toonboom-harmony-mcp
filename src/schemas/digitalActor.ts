import { z } from 'zod';
import { honestyOriginSchema } from './onePrompt.js';
import { DEFAULT_360_VIEWS, DEFAULT_MOUTH_SHAPES } from './characterSpec.js';

export const DIGITAL_ACTOR_SCHEMA_VERSION = '3.0';

export const colorSwatchSchema = z.object({
  colorId: z.string(),
  name: z.string(),
  r: z.number().min(0).max(255),
  g: z.number().min(0).max(255),
  b: z.number().min(0).max(255),
  a: z.number().min(0).max(255).default(255)
}).strict();

export const actorPaletteSchema = z.object({
  paletteId: z.string(),
  name: z.string(),
  colors: z.array(colorSwatchSchema)
}).strict();

export const masterDrawingSchema = z.object({
  drawingId: z.string(),
  name: z.string(),
  path: z.string(),
  inferred: z.boolean().default(false)
}).strict();

export const actorPivotSchema = z.object({
  partId: z.string(),
  x: z.number(),
  y: z.number(),
  inferred: z.boolean().default(false)
}).strict();

export const hierarchyNodeSchema = z.object({
  partId: z.string(),
  parentId: z.string().nullable()
}).strict();

export const deformRuleSchema = z.object({
  ruleId: z.string(),
  partId: z.string(),
  deformerType: z.enum(['bone', 'curve', 'envelope', 'freeform']),
  parameters: z.record(z.any())
}).strict();

export const substitutionSchema = z.object({
  partId: z.string(),
  drawingId: z.string(),
  name: z.string()
}).strict();

export const poseFamilySchema = z.object({
  poseId: z.string(),
  name: z.string(),
  category: z.string(), // e.g. 'happy', 'sad', 'neutral'
  values: z.record(z.object({
    positionX: z.number().optional(),
    positionY: z.number().optional(),
    rotation: z.number().optional(),
    scaleX: z.number().optional(),
    scaleY: z.number().optional(),
    skew: z.number().optional()
  })),
  inferred: z.boolean().default(false)
}).strict();

export const gestureLibraryEntrySchema = z.object({
  gestureId: z.string(),
  name: z.string(),
  partId: z.string(),
  frameCount: z.number(),
  keys: z.array(z.object({
    frame: z.number(),
    positionX: z.number().optional(),
    positionY: z.number().optional(),
    rotation: z.number().optional(),
    scaleX: z.number().optional(),
    scaleY: z.number().optional()
  }))
}).strict();

export const actingProfileSchema = z.object({
  defaultStyle: z.string().default('restrained'),
  tempoBias: z.number().default(1.0),
  gestureRate: z.number().default(0.5)
}).strict();

export const digitalActorSchema = z.object({
  schemaVersion: z.string().default(DIGITAL_ACTOR_SCHEMA_VERSION),
  actorId: z.string(),
  identity: z.object({
    name: z.string(),
    description: z.string(),
    tags: z.array(z.string()).default([])
  }).strict(),
  modelSheets: z.array(z.string()).default([]),
  palettes: z.array(actorPaletteSchema).default([]),
  masterDrawings: z.array(masterDrawingSchema).default([]),
  headViews: z.array(z.string()).default(DEFAULT_360_VIEWS),
  bodyViews: z.array(z.string()).default(DEFAULT_360_VIEWS),
  eyes: z.array(z.string()).default([]),
  brows: z.array(z.string()).default([]),
  mouths: z.array(z.string()).default(DEFAULT_MOUTH_SHAPES),
  hands: z.array(z.string()).default([]),
  props: z.array(z.string()).default([]),
  pivots: z.array(actorPivotSchema).default([]),
  hierarchy: z.array(hierarchyNodeSchema).default([]),
  deformRules: z.array(deformRuleSchema).default([]),
  substitutions: z.array(substitutionSchema).default([]),
  poseFamilies: z.array(poseFamilySchema).default([]),
  gestureLibrary: z.array(gestureLibraryEntrySchema).default([]),
  actingProfile: actingProfileSchema.default({}),
  provenance: z.object({
    importedFrom: z.string(),
    importedAt: z.string(),
    inferredParts: z.array(z.string()).default([])
  }).strict(),
  origin: honestyOriginSchema.default('planned')
}).strict();

export type DigitalActor = z.infer<typeof digitalActorSchema>;

export const digitalActorValidationSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  inferredCount: z.number(),
  checks: z.object({
    viewsCoverage: z.boolean(),
    hierarchyCycleFree: z.boolean(),
    pivotsCompleteness: z.boolean(),
    colorConflictFree: z.boolean(),
    substitutionsCompleteness: z.boolean()
  }).strict()
}).strict();

export type DigitalActorValidation = z.infer<typeof digitalActorValidationSchema>;
