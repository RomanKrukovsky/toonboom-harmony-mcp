import { z } from 'zod';

export const REPRESENTATION_ROUTER_SCHEMA_VERSION = '1.0';

export const representationTypeSchema = z.enum([
  'peg_transform',
  'curve_deformer',
  'envelope_deformer',
  'bone_deformer',
  'drawing_substitution',
  'frame_by_frame_vector',
  'raster_texture_layer',
  'reference_only'
]);

export const routingDecisionSchema = z.object({
  decisionId: z.string(),
  partId: z.string(),
  startFrame: z.number().int(),
  endFrame: z.number().int(),
  representation: representationTypeSchema,
  explanation: z.string(),
  confidence: z.number().min(0).max(1),
  factors: z.object({
    rigidMotion: z.number().min(0).max(1),
    silhouetteChange: z.number().min(0).max(1),
    articulation: z.number().min(0).max(1),
    occlusion: z.number().min(0).max(1),
    topologyChange: z.number().min(0).max(1),
    lineStability: z.number().min(0).max(1),
    residualError: z.number().min(0),
    estimatedKeyCount: z.number().int().min(0),
    nodeViewComplexity: z.enum(['low', 'medium', 'high']),
    editability: z.number().min(0).max(1),
    artistLocked: z.boolean().default(false)
  }).strict(),
  alternatives: z.array(z.object({
    representation: representationTypeSchema,
    score: z.number().min(0).max(1),
    reason: z.string()
  }).strict()).default([])
}).strict();

export const representationSegmentSchema = z.object({
  partId: z.string(),
  segments: z.array(z.object({
    startFrame: z.number().int(),
    endFrame: z.number().int(),
    representation: representationTypeSchema,
    decisionId: z.string(),
    explanation: z.string(),
    confidence: z.number().min(0).max(1)
  }).strict())
}).strict();

export const routingPlanSchema = z.object({
  schemaVersion: z.string().default(REPRESENTATION_ROUTER_SCHEMA_VERSION),
  characterId: z.string(),
  sceneId: z.string(),
  decisions: z.array(routingDecisionSchema),
  segments: z.array(representationSegmentSchema),
  studioProfile: z.object({
    preferredRepresentation: representationTypeSchema.optional(),
    maxDeformersPerPart: z.number().int().positive().optional(),
    editabilityPriority: z.number().min(0).max(1).default(0.5),
    frameByFrameAllowed: z.boolean().default(true)
  }).default({}),
  summary: z.object({
    totalDecisions: z.number().int(),
    representationCounts: z.record(representationTypeSchema, z.number().int()),
    averageConfidence: z.number().min(0).max(1),
    lockedPartCount: z.number().int()
  }).strict(),
  provenance: z.object({
    engine: z.string(),
    createdAt: z.string()
  }).strict()
}).strict();

export type RoutingPlan = z.infer<typeof routingPlanSchema>;
export type RoutingDecision = z.infer<typeof routingDecisionSchema>;
export type RepresentationType = z.infer<typeof representationTypeSchema>;
