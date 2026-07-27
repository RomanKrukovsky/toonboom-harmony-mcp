/**
 * Sprint 1 — Face performance sequence TS schema (zod).
 *
 * Parity with services/ml-runtime/pipelines/face_performance_schema.py so a TS consumer
 * (capability registry, MCP tool surface, contract tests) validates the same shape that
 * the Python provider produces.
 *
 * Honest-blocking rule: `provenance.realInferenceExecuted` is the single source of truth.
 * When false, the sequence is a blocked placeholder, and consumers MUST NOT cite it as
 * real evidence. The capability promotion gate enforces this.
 */

import { z } from 'zod';

export const FACE_PERFORMANCE_SCHEMA_VERSION = '1.0.0';

export const FACE_BLENDSHAPE_NAMES = [
  '_neutral',
  'browDownLeft', 'browDownRight', 'browInnerUp',
  'browOuterUpLeft', 'browOuterUpRight',
  'cheekPuff', 'cheekSquintLeft', 'cheekSquintRight',
  'eyeBlinkLeft', 'eyeBlinkRight',
  'eyeLookDownLeft', 'eyeLookDownRight',
  'eyeLookInLeft', 'eyeLookInRight',
  'eyeLookOutLeft', 'eyeLookOutRight',
  'eyeLookUpLeft', 'eyeLookUpRight',
  'eyeSquintLeft', 'eyeSquintRight',
  'eyeWideLeft', 'eyeWideRight',
  'jawForward', 'jawLeft', 'jawOpen', 'jawRight',
  'mouthClose', 'mouthDimpleLeft', 'mouthDimpleRight',
  'mouthFrownLeft', 'mouthFrownRight',
  'mouthFunnel', 'mouthLeft', 'mouthLowerDownLeft', 'mouthLowerDownRight',
  'mouthPressLeft', 'mouthPressRight',
  'mouthPucker', 'mouthRight',
  'mouthRollLower', 'mouthRollUpper',
  'mouthShrugLower', 'mouthShrugUpper',
  'mouthSmileLeft', 'mouthSmileRight',
  'mouthStretchLeft', 'mouthStretchRight',
  'mouthUpperLeft', 'mouthUpperRight',
  'noseSneerLeft', 'noseSneerRight'
] as const;

export const faceLandmarkPointSchema = z.object({
  index: z.number().int().min(0).max(477),
  x: z.number(),
  y: z.number(),
  z: z.number(),
  presence: z.number().min(0).max(1),
  observed: z.boolean()
}).strict();

export const faceBlendshapeSampleSchema = z.object({
  name: z.string().min(1),
  value: z.number().min(0).max(1)
}).strict();

export const facePerformanceFrameSchema = z.object({
  frameIndex: z.number().int().min(0),
  timestampMs: z.number().int().min(0),
  landmarks: z.array(faceLandmarkPointSchema),
  blendshapes: z.array(faceBlendshapeSampleSchema),
  transformationMatrix: z.array(z.number()),
  inferenceDurationMs: z.number().min(0),
  warnings: z.array(z.string())
}).strict();

export const facePerformanceProvenanceSchema = z.object({
  engine: z.literal('mediapipe_face_landmarker'),
  modelTask: z.string().min(1),
  modelSha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  realInferenceExecuted: z.boolean(),
  runnerVersion: z.string().min(1),
  createdAt: z.string().min(1)
}).strict();

export const facePerformanceSequenceSchema = z.object({
  schemaVersion: z.literal(FACE_PERFORMANCE_SCHEMA_VERSION),
  sourceKind: z.enum(['video', 'blocked']),
  sourcePath: z.string().nullable(),
  sourceWidth: z.number().int().min(0),
  sourceHeight: z.number().int().min(0),
  analyzedFrames: z.number().int().min(0),
  framesWithFace: z.number().int().min(0),
  frames: z.array(facePerformanceFrameSchema),
  warnings: z.array(z.string()),
  provenance: facePerformanceProvenanceSchema
}).strict().superRefine((seq, ctx) => {
  // A 'video' sequence must carry real model output; a 'blocked' sequence must not.
  if (seq.sourceKind === 'video' && !seq.provenance.realInferenceExecuted) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'sourceKind="video" requires provenance.realInferenceExecuted=true',
      path: ['provenance', 'realInferenceExecuted']
    });
  }
  if (seq.sourceKind === 'blocked' && seq.provenance.realInferenceExecuted) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'sourceKind="blocked" must not have provenance.realInferenceExecuted=true',
      path: ['provenance', 'realInferenceExecuted']
    });
  }
  // A blocked sequence is required to be empty and to carry a warning.
  if (seq.sourceKind === 'blocked') {
    if (seq.frames.length !== 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'blocked sequence must have no frames', path: ['frames'] });
    }
    if (seq.analyzedFrames !== 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'blocked sequence must have analyzedFrames=0', path: ['analyzedFrames'] });
    }
    if (seq.framesWithFace !== 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'blocked sequence must have framesWithFace=0', path: ['framesWithFace'] });
    }
  }
});

export type FaceLandmarkPoint = z.infer<typeof faceLandmarkPointSchema>;
export type FaceBlendshapeSample = z.infer<typeof faceBlendshapeSampleSchema>;
export type FacePerformanceFrame = z.infer<typeof facePerformanceFrameSchema>;
export type FacePerformanceProvenance = z.infer<typeof facePerformanceProvenanceSchema>;
export type FacePerformanceSequence = z.infer<typeof facePerformanceSequenceSchema>;

/**
 * Build a blocked face performance sequence. This is the only sanctioned way to produce a
 * "no inference ran" object for TS consumers; it forces realInferenceExecuted=false,
 * sourceKind='blocked', and carries the blocking reason in warnings.
 */
export function buildBlockedFacePerformance(args: {
  reason: string;
  modelTask: string;
  createdAt: string;
}): FacePerformanceSequence {
  return facePerformanceSequenceSchema.parse({
    schemaVersion: FACE_PERFORMANCE_SCHEMA_VERSION,
    sourceKind: 'blocked',
    sourcePath: null,
    sourceWidth: 0,
    sourceHeight: 0,
    analyzedFrames: 0,
    framesWithFace: 0,
    frames: [],
    warnings: [args.reason],
    provenance: {
      engine: 'mediapipe_face_landmarker',
      modelTask: args.modelTask,
      modelSha256: null,
      realInferenceExecuted: false,
      runnerVersion: '1.0.0',
      createdAt: args.createdAt
    }
  });
}