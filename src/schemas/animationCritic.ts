import { z } from 'zod';

export const ANIMATION_CRITIC_SCHEMA_VERSION = '1.0';

export const criticCheckTypeSchema = z.enum([
  // Technical checks
  'missing_drawings',
  'broken_exposures',
  'holes',
  'layer_order',
  'palette_inconsistency',
  'collisions',
  'detached_parts',
  'broken_pivots',
  'invalid_deformers',
  'excessive_keys',
  'unstable_contours',
  'frozen_motion',
  'lost_motion_events',
  'timing_mismatch',
  // Artistic proxy checks
  'pose_readability',
  'silhouette_clarity',
  'staging',
  'emotional_clarity',
  'gesture_motivation',
  'timing_quality',
  'spacing',
  'anticipation',
  'follow_through',
  'overacting',
  'underacting',
  'dead_motion',
  'mechanical_motion',
  'repetitive_gestures',
  'gaze_direction',
  'reaction_timing',
  'camera_motivation'
]);

export const criticCheckResultSchema = z.object({
  checkType: criticCheckTypeSchema,
  passed: z.boolean(),
  score: z.number().min(0).max(1),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  affectedFrames: z.array(z.number().int()).default([]),
  affectedParts: z.array(z.string()).default([]),
  evidence: z.string(),
  recommendation: z.string().optional(),
  alternative: z.string().optional(),
  confidence: z.number().min(0).max(1),
  humanReviewRequired: z.boolean().default(false)
}).strict();

export const criticReportSchema = z.object({
  reportId: z.string(),
  variantId: z.string(),
  sceneId: z.string(),
  timestamp: z.string(),
  technicalChecks: z.array(criticCheckResultSchema),
  artisticChecks: z.array(criticCheckResultSchema),
  overallScore: z.number().min(0).max(1),
  technicalScore: z.number().min(0).max(1),
  artisticScore: z.number().min(0).max(1),
  passed: z.boolean(),
  criticalIssues: z.number().int().min(0),
  highIssues: z.number().int().min(0),
  recommendations: z.array(z.string()),
  humanReviewRequired: z.boolean(),
  provenance: z.object({
    engine: z.string(),
    version: z.string(),
    method: z.enum(['rule_based', 'ml_critic', 'hybrid'])
  }).strict()
}).strict();

export type CriticReport = z.infer<typeof criticReportSchema>;
export type CriticCheckResult = z.infer<typeof criticCheckResultSchema>;
export type CriticCheckType = z.infer<typeof criticCheckTypeSchema>;
