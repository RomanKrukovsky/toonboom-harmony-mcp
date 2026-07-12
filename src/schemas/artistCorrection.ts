import { z } from 'zod';

export const ARTIST_CORRECTION_SCHEMA_VERSION = '1.0';

export const correctionScopeSchema = z.enum([
  'key_poses',
  'timing',
  'camera',
  'layer_structure',
  'palette',
  'representation',
  'full_scene'
]);

export const correctionTypeSchema = z.enum([
  'position',
  'rotation',
  'scale',
  'keyframe_timing',
  'keyframe_value',
  'exposure_change',
  'drawing_substitution',
  'deformer_adjustment',
  'palette_color',
  'camera_move',
  'representation_change',
  'structural'
]);

export const artistCorrectionSchema = z.object({
  correctionId: z.string(),
  sceneId: z.string(),
  versionBefore: z.string(),
  versionAfter: z.string(),
  timestamp: z.string(),
  artistId: z.string().optional(),
  scope: correctionScopeSchema,
  type: correctionTypeSchema,
  affectedParts: z.array(z.string()).default([]),
  affectedFrames: z.array(z.number().int().positive()).default([]),
  delta: z.record(z.any()),
  comment: z.string().optional(),
  reason: z.string().optional(),
  timeSpentMinutes: z.number().min(0).optional(),
  accepted: z.boolean().default(true),
  previousCriticOutput: z.any().optional(),
  chosenRepresentation: z.string().optional()
}).strict();

export const artistCorrectionHistoryEntrySchema = z.object({
  correctionId: z.string(),
  sceneId: z.string(),
  version: z.string(),
  timestamp: z.string(),
  artistId: z.string().optional(),
  summary: z.string(),
  accepted: z.boolean()
}).strict();

export const trainingSampleSchema = z.object({
  sampleId: z.string(),
  sceneId: z.string(),
  version: z.string(),
  correctionId: z.string(),
  inputManifest: z.any(),
  correctedManifest: z.any(),
  correctionDelta: z.record(z.any()),
  artistComment: z.string().optional(),
  criticReportBefore: z.any().optional(),
  criticReportAfter: z.any().optional(),
  scope: correctionScopeSchema,
  representationBefore: z.string().optional(),
  representationAfter: z.string().optional(),
  qualityImprovement: z.object({
    technicalScoreDelta: z.number().optional(),
    artisticScoreDelta: z.number().optional(),
    overallScoreDelta: z.number().optional()
  }).optional(),
  privacyLevel: z.enum(['public', 'studio_only', 'private']).default('studio_only'),
  timestamp: z.string()
}).strict();

export const pairwisePreferenceSchema = z.object({
  preferenceId: z.string(),
  sceneId: z.string(),
  versionA: z.string(),
  versionB: z.string(),
  preferredVersion: z.string(),
  artistId: z.string().optional(),
  reason: z.string().optional(),
  criteria: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(1),
  timestamp: z.string()
}).strict();

export const datasetExportSchema = z.object({
  exportId: z.string(),
  sceneIds: z.array(z.string()),
  format: z.enum(['jsonl', 'json', 'parquet']).default('jsonl'),
  includeCorrections: z.boolean().default(true),
  includePreferences: z.boolean().default(true),
  includeCriticReports: z.boolean().default(false),
  privacyLevel: z.enum(['public', 'studio_only', 'private']).default('studio_only'),
  outputPath: z.string(),
  timestamp: z.string()
}).strict();

export type ArtistCorrection = z.infer<typeof artistCorrectionSchema>;
export type ArtistCorrectionHistoryEntry = z.infer<typeof artistCorrectionHistoryEntrySchema>;
export type TrainingSample = z.infer<typeof trainingSampleSchema>;
export type PairwisePreference = z.infer<typeof pairwisePreferenceSchema>;
export type DatasetExport = z.infer<typeof datasetExportSchema>;