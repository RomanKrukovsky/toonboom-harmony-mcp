import { z } from 'zod';
import { honestyOriginSchema } from './onePrompt.js';

export const KEY_POSE_MOTION_SCHEMA_VERSION = '1.0';

export const keyPoseTypeSchema = z.enum([
  'KeyPose',
  'BreakdownPose',
  'ExtremePose',
  'AnticipationPose',
  'OvershootPose',
  'SettlePose',
  'SmearPose',
  'HoldPose'
]);

export const keyPoseSchema = z.object({
  poseId: z.string(),
  characterId: z.string(),
  frame: z.number().int().positive(),
  type: keyPoseTypeSchema,
  description: z.string(),
  mode: z.enum(['library_adaptation', 'generated_pose']),
  confidence: z.number().min(0).max(1),
  features: z.object({
    storytellingPose: z.string(),
    silhouetteQuality: z.number().min(0).max(1),
    lineOfAction: z.string(),
    balance: z.string(),
    weightDistribution: z.string(),
    facialExpression: z.string(),
    handShape: z.string(),
    gazeDirection: z.string(),
    relationToCamera: z.string()
  }).strict(),
  skeletonControlGraph: z.record(z.object({
    x: z.number(),
    y: z.number(),
    angle: z.number().optional()
  })).optional(),
  fittedDrawings: z.record(z.string()).default({}),
  transforms: z.record(z.object({
    positionX: z.number(),
    positionY: z.number(),
    rotation: z.number(),
    scaleX: z.number(),
    scaleY: z.number(),
    skew: z.number()
  })).default({}),
  inferred: z.boolean().default(false),
  provenance: z.string()
}).strict();

export const keyPoseSetSchema = z.object({
  schemaVersion: z.string().default(KEY_POSE_MOTION_SCHEMA_VERSION),
  sceneId: z.string(),
  poses: z.array(keyPoseSchema),
  poseCount: z.number(),
  createdAt: z.string()
}).strict();

export const motionKeyframeSchema = z.object({
  frame: z.number().int().positive(),
  value: z.number(),
  interpolation: z.enum([
    'step', 'linear', 'ease-in', 'ease-out', 'ease-in-out',
    'hold', 'overshoot', 'bounce', 'settle', 'custom_bezier'
  ]),
  bezierParams: z.array(z.number()).length(4).optional()
}).strict();

export const motionTrackSchema = z.object({
  trackId: z.string(),
  characterId: z.string(),
  partId: z.string(),
  property: z.enum(['positionX', 'positionY', 'rotation', 'scaleX', 'scaleY', 'skew']),
  keyframes: z.array(motionKeyframeSchema),
  residualError: z.number().default(0),
  keyReductionMetrics: z.object({
    originalKeyCount: z.number(),
    reducedKeyCount: z.number(),
    compressionRatio: z.number(),
    maxError: z.number()
  }).optional()
}).strict();

export const motionSynthesisPlanSchema = z.object({
  schemaVersion: z.string().default(KEY_POSE_MOTION_SCHEMA_VERSION),
  sceneId: z.string(),
  tracks: z.array(motionTrackSchema),
  drawingSubstitutions: z.array(z.object({
    frame: z.number().int().positive(),
    partId: z.string(),
    drawingId: z.string()
  })).default([]),
  exposureBlocks: z.array(z.object({
    partId: z.string(),
    startFrame: z.number().int().positive(),
    endFrame: z.number().int().positive(),
    drawingId: z.string()
  })).default([]),
  frameByFrameExceptions: z.array(z.number().int().positive()).default([]),
  origin: honestyOriginSchema.default('planned')
}).strict();

export type KeyPose = z.infer<typeof keyPoseSchema>;
export type KeyPoseSet = z.infer<typeof keyPoseSetSchema>;
export type MotionKeyframe = z.infer<typeof motionKeyframeSchema>;
export type MotionTrack = z.infer<typeof motionTrackSchema>;
export type MotionSynthesisPlan = z.infer<typeof motionSynthesisPlanSchema>;
