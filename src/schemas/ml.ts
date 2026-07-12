import { z } from 'zod';

export const mlSystemProfileSchema = z.object({
  os: z.string(),
  architecture: z.string(),
  appleSilicon: z.boolean(),
  mpsAvailable: z.boolean(),
  cudaAvailable: z.boolean(),
  onnxProviders: z.array(z.string()),
  ramGb: z.number(),
  freeDiskGb: z.number(),
  recommendedProfile: z.string()
}).strict();

export const mlJobResponseSchema = z.object({
  jobId: z.string(),
  status: z.enum(['queued', 'preparing', 'downloading', 'loading_model', 'processing', 'writing_artifacts', 'completed', 'failed', 'cancelled']),
  stage: z.string(),
  progress: z.number(),
  artifacts: z.array(z.string()),
  error: z.object({ code: z.string(), message: z.string() }).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  logs: z.array(z.string())
}).strict();

export const point3DSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number().default(0),
  visibility: z.number().default(1)
}).strict();

export const poseFrameSchema = z.object({
  frame: z.number(),
  landmarks: z.record(point3DSchema)
}).strict();

export const poseSequenceSchema = z.object({
  schemaVersion: z.literal('1.0'),
  modelId: z.string(),
  frameCount: z.number(),
  fps: z.number(),
  poses: z.array(poseFrameSchema),
  provenance: z.object({
    tool: z.string(),
    version: z.string(),
    backend: z.string(),
    device: z.string(),
    precision: z.string(),
    timestamp: z.string()
  }).strict()
}).strict();

export const boundingBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number()
}).strict();

export const segmentationObjectSchema = z.object({
  objectId: z.string(),
  label: z.string(),
  bbox: boundingBoxSchema,
  maskPath: z.string(),
  confidence: z.number()
}).strict();

export const segmentationFrameSchema = z.object({
  frame: z.number(),
  objects: z.array(segmentationObjectSchema)
}).strict();

export const segmentationManifestSchema = z.object({
  schemaVersion: z.literal('1.0'),
  modelId: z.string(),
  frameCount: z.number(),
  fps: z.number(),
  frames: z.array(segmentationFrameSchema),
  provenance: z.any()
}).strict();

export const trackedPointSchema = z.object({
  pointId: z.string(),
  x: z.number(),
  y: z.number(),
  visible: z.boolean(),
  confidence: z.number()
}).strict();

export const pointTrackingFrameSchema = z.object({
  frame: z.number(),
  points: z.array(trackedPointSchema)
}).strict();

export const pointTrackingManifestSchema = z.object({
  schemaVersion: z.literal('1.0'),
  modelId: z.string(),
  points: z.array(pointTrackingFrameSchema),
  provenance: z.any()
}).strict();

export const speechWordSchema = z.object({
  text: z.string(),
  start: z.number(),
  end: z.number(),
  confidence: z.number()
}).strict();

export const speechPhonemeSchema = z.object({
  text: z.string(),
  start: z.number(),
  end: z.number(),
  confidence: z.number(),
  word: z.string()
}).strict();

export const speechAnalysisManifestSchema = z.object({
  schemaVersion: z.literal('1.0'),
  modelId: z.string(),
  durationSeconds: z.number(),
  transcript: z.string(),
  words: z.array(speechWordSchema),
  phonemes: z.array(speechPhonemeSchema),
  energySamples: z.array(z.number()),
  peakRms: z.number(),
  activeRatio: z.number(),
  provenance: z.any()
}).strict();

export const videoPerceptionManifestSchema = z.object({
  schemaVersion: z.literal('1.0'),
  videoPath: z.string(),
  audioPath: z.string().nullable().optional(),
  width: z.number(),
  height: z.number(),
  fps: z.number(),
  frameCount: z.number(),
  durationSeconds: z.number(),
  pose: poseSequenceSchema.nullable().optional(),
  segmentation: segmentationManifestSchema.nullable().optional(),
  pointTracking: pointTrackingManifestSchema.nullable().optional(),
  speech: speechAnalysisManifestSchema.nullable().optional(),
  warnings: z.array(z.string()),
  provenance: z.any()
}).strict();

export type MLSystemProfile = z.infer<typeof mlSystemProfileSchema>;
export type MLJobResponse = z.infer<typeof mlJobResponseSchema>;
export type VideoPerceptionManifest = z.infer<typeof videoPerceptionManifestSchema>;
export type PoseSequence = z.infer<typeof poseSequenceSchema>;
export type SegmentationManifest = z.infer<typeof segmentationManifestSchema>;
export type PointTrackingManifest = z.infer<typeof pointTrackingManifestSchema>;
export type SpeechAnalysisManifest = z.infer<typeof speechAnalysisManifestSchema>;
