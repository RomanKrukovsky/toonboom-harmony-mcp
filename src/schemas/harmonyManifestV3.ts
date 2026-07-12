import { z } from 'zod';
import { sceneUnderstandingSchema } from './sceneIntelligence.js';
import { keyPoseSetSchema } from './keyPoseMotion.js';
import { voiceAnalysisSchema, performancePlanSchema } from './voicePerformance.js';
import { cameraLayoutPlanSchema } from './cameraLayout.js';
import { partDecompositionSchema } from './partDecomposition.js';
import { routingPlanSchema } from './representationRouter.js';
import { criticReportSchema } from './animationCritic.js';

export const HARMONY_MANIFEST_V3_SCHEMA_VERSION = '3.0';

// Re-export schemas that are part of the manifest
export {
  sceneUnderstandingSchema,
  keyPoseSetSchema,
  voiceAnalysisSchema,
  performancePlanSchema,
  cameraLayoutPlanSchema,
  partDecompositionSchema,
  routingPlanSchema,
  criticReportSchema
};

export const motionTrackSchema = z.object({
  trackId: z.string(),
  characterId: z.string(),
  partId: z.string(),
  representation: z.enum(['peg_transform', 'curve_deformer', 'envelope_deformer', 'bone_deformer', 'drawing_substitution', 'frame_by_frame_vector']),
  keyframes: z.array(z.object({
    frame: z.number().int().positive(),
    position: z.object({ x: z.number(), y: z.number() }).optional(),
    rotation: z.number().optional(),
    scale: z.number().positive().optional(),
    interpolation: z.enum(['linear', 'ease_in', 'ease_out', 'ease_in_out', 'hold']).default('ease_in_out')
  }).strict()),
  startFrame: z.number().int().positive(),
  endFrame: z.number().int().positive()
}).strict();

export const exposureBlockSchema = z.object({
  exposureId: z.string(),
  partId: z.string(),
  startFrame: z.number().int().positive(),
  endFrame: z.number().int().positive(),
  drawingId: z.string()
}).strict();

export const paletteEntrySchema = z.object({
  colorId: z.string(),
  name: z.string(),
  r: z.number().min(0).max(255),
  g: z.number().min(0).max(255),
  b: z.number().min(0).max(255),
  a: z.number().min(0).max(255).default(255)
}).strict();

export const paletteSchema = z.object({
  paletteId: z.string(),
  name: z.string(),
  colors: z.array(paletteEntrySchema)
}).strict();

export const drawingAssetSchema = z.object({
  drawingId: z.string(),
  partId: z.string(),
  name: z.string(),
  path: z.string(),
  variantType: z.enum(['front', 'side', 'three_quarter', 'back', 'extreme']).default('front'),
  inferred: z.boolean().default(false)
}).strict();

export const tasteScoreSchema = z.object({
  variantId: z.string(),
  variantA: z.string(),
  variantB: z.string(),
  preferredVariant: z.string(),
  score: z.number().min(0).max(1),
  reasons: z.array(z.string()),
  conflictWithTechnicalMetrics: z.boolean().default(false),
  confidence: z.number().min(0).max(1)
}).strict();

export const selectionHistoryEntrySchema = z.object({
  timestamp: z.string(),
  variantId: z.string(),
  selectedBy: z.string(),
  reason: z.string(),
  automated: z.boolean().default(true)
}).strict();

export const artistCorrectionSchema = z.object({
  correctionId: z.string(),
  versionBefore: z.string(),
  versionAfter: z.string(),
  delta: z.record(z.any()),
  comment: z.string().optional(),
  accepted: z.boolean().default(true),
  affectedFrames: z.array(z.number().int()).default([]),
  affectedParts: z.array(z.string()).default([]),
  timestamp: z.string()
}).strict();

export const trainingSignalSchema = z.object({
  signalId: z.string(),
  type: z.enum(['pairwise_preference', 'absolute_score', 'correction_delta']),
  data: z.record(z.any()),
  privacyLevel: z.enum(['public', 'studio_only', 'private']).default('studio_only'),
  timestamp: z.string()
}).strict();

export const representationSegmentSchema = z.object({
  partId: z.string(),
  startFrame: z.number().int().positive(),
  endFrame: z.number().int().positive(),
  representation: z.enum(['peg_transform', 'curve_deformer', 'envelope_deformer', 'bone_deformer', 'drawing_substitution', 'frame_by_frame_vector']),
  explanation: z.string(),
  confidence: z.number().min(0).max(1)
}).strict();

export const harmonyManifestV3Schema = z.object({
  schemaVersion: z.literal('3.0').default(HARMONY_MANIFEST_V3_SCHEMA_VERSION),
  manifestId: z.string(),
  sceneId: z.string(),
  createdAt: z.string(),
  // Core scene understanding
  sceneUnderstanding: sceneUnderstandingSchema.optional(),
  directorPlans: z.array(z.any()).optional(),
  performancePlans: z.array(performancePlanSchema).optional(),
  voiceAnalysis: voiceAnalysisSchema.optional(),
  // Character and rigging
  digitalActors: z.array(z.any()).optional(),
  partDecomposition: partDecompositionSchema.optional(),
  occlusionGraph: z.array(z.any()).optional(),
  // Animation
  keyPoses: keyPoseSetSchema.optional(),
  motionTracks: z.array(motionTrackSchema).optional(),
  cameraTrack: z.any().optional(),
  cameraLayout: cameraLayoutPlanSchema.optional(),
  // Representation
  routingPlan: routingPlanSchema.optional(),
  representationSegments: z.array(representationSegmentSchema).optional(),
  // Events
  gestureEvents: z.array(z.any()).optional(),
  gazeEvents: z.array(z.any()).optional(),
  facialEvents: z.array(z.any()).optional(),
  // Assets
  drawings: z.array(drawingAssetSchema).optional(),
  palettes: z.array(paletteSchema).optional(),
  exposureBlocks: z.array(exposureBlockSchema).optional(),
  // Quality and selection
  criticReports: z.array(criticReportSchema).optional(),
  variantTournament: z.any().optional(),
  tasteScores: z.array(tasteScoreSchema).optional(),
  selectionHistory: z.array(selectionHistoryEntrySchema).optional(),
  artistCorrections: z.array(artistCorrectionSchema).optional(),
  trainingSignals: z.array(trainingSignalSchema).optional(),
  // Metadata
  provenance: z.object({
    pipeline: z.string(),
    iterations: z.array(z.number().int()),
    engine: z.string(),
    timestamp: z.string()
  }).strict(),
  // Honest limitations
  limitations: z.object({
    ruleBasedBaseline: z.boolean().default(true),
    noMlAdapters: z.boolean().default(true),
    noHarmonyApplied: z.boolean().default(true),
    artistIntentInferred: z.boolean().default(true)
  }).strict()
}).strict();

export type HarmonyManifestV3 = z.infer<typeof harmonyManifestV3Schema>;
export type MotionTrack = z.infer<typeof motionTrackSchema>;
export type ExposureBlock = z.infer<typeof exposureBlockSchema>;
export type DrawingAsset = z.infer<typeof drawingAssetSchema>;
export type Palette = z.infer<typeof paletteSchema>;
export type TasteScore = z.infer<typeof tasteScoreSchema>;
export type SelectionHistoryEntry = z.infer<typeof selectionHistoryEntrySchema>;
export type ArtistCorrection = z.infer<typeof artistCorrectionSchema>;
export type TrainingSignal = z.infer<typeof trainingSignalSchema>;
export type RepresentationSegment = z.infer<typeof representationSegmentSchema>;
