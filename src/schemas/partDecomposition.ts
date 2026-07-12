import { z } from 'zod';

export const PART_DECOMPOSITION_SCHEMA_VERSION = '1.0';

export const humanoidPartIdSchema = z.enum([
  'head', 'hair', 'face', 'eyes', 'brows', 'mouth',
  'torso', 'upper_arm_left', 'upper_arm_right',
  'forearm_left', 'forearm_right',
  'hand_left', 'hand_right',
  'upper_leg_left', 'upper_leg_right',
  'lower_leg_left', 'lower_leg_right',
  'foot_left', 'foot_right',
  'clothing', 'accessories', 'props'
]);

export const nonHumanoidPartIdSchema = z.string();

export const partIdSchema = z.union([humanoidPartIdSchema, nonHumanoidPartIdSchema]);

export const maskRegionSchema = z.object({
  contourPoints: z.array(z.object({ x: z.number(), y: z.number() }).strict()),
  boundingBox: z.object({
    x: z.number(), y: z.number(), width: z.number(), height: z.number()
  }).strict(),
  area: z.number().min(0),
  confidence: z.number().min(0).max(1)
}).strict();

export const partIdentitySchema = z.object({
  partId: z.string(),
  label: z.string(),
  isHumanoidPart: z.boolean(),
  parentPartId: z.string().nullable(),
  depthOrder: z.number().int(),
  inferred: z.boolean().default(false)
}).strict();

export const occlusionEdgeSchema = z.object({
  occluderPartId: z.string(),
  occludedPartId: z.string(),
  overlapRatio: z.number().min(0).max(1),
  frameRange: z.object({ start: z.number().int(), end: z.number().int() }).strict(),
  confidence: z.number().min(0).max(1)
}).strict();

export const partFrameStateSchema = z.object({
  frame: z.number().int(),
  visibleMask: maskRegionSchema.optional(),
  amodalMask: maskRegionSchema.optional(),
  center: z.object({ x: z.number(), y: z.number() }).strict(),
  motionDelta: z.object({ dx: z.number(), dy: z.number() }).default({ dx: 0, dy: 0 }),
  occluded: z.boolean().default(false),
  confidence: z.number().min(0).max(1)
}).strict();

export const partTrackSchema = z.object({
  partId: z.string(),
  identity: partIdentitySchema,
  frameStates: z.array(partFrameStateSchema),
  motionCluster: z.enum([
    'rigid', 'articulated', 'deformable', 'static', 'unknown'
  ]).default('unknown'),
  articulationHints: z.array(z.object({
    frame: z.number().int(),
    hint: z.string(),
    confidence: z.number().min(0).max(1)
  }).strict()).default([]),
  problemRanges: z.array(z.object({
    startFrame: z.number().int(),
    endFrame: z.number().int(),
    reason: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical'])
  }).strict()).default([])
}).strict();

export const partDecompositionSchema = z.object({
  schemaVersion: z.string().default(PART_DECOMPOSITION_SCHEMA_VERSION),
  characterId: z.string(),
  bodyType: z.enum(['humanoid', 'quadruped', 'creature', 'object', 'unknown']).default('unknown'),
  parts: z.array(partTrackSchema),
  occlusionGraph: z.array(occlusionEdgeSchema),
  identityContinuityScore: z.number().min(0).max(1),
  totalProblemRanges: z.number().int().min(0),
  provenance: z.object({
    engine: z.string(),
    createdAt: z.string(),
    method: z.enum(['cpu_heuristic', 'ml_segmenter', 'hybrid'])
  }).strict()
}).strict();

export type PartDecomposition = z.infer<typeof partDecompositionSchema>;
export type PartTrack = z.infer<typeof partTrackSchema>;
export type PartFrameState = z.infer<typeof partFrameStateSchema>;
export type OcclusionEdge = z.infer<typeof occlusionEdgeSchema>;
export type MaskRegion = z.infer<typeof maskRegionSchema>;
