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

/* ==========================================================================================
 * V2 CONTRACTS
 *
 * Everything above this line is V1 and is deliberately left byte-for-byte unchanged: evidence
 * files written by earlier sprints parse against it and must keep parsing. V2 is additive.
 * Migration helpers at the bottom read V1 and produce V2 where the information is recoverable;
 * where it is not (coordinate space, weights hash, whether inference was real) V2 refuses to
 * invent it and the migration reports the gap instead.
 * ======================================================================================== */

/** Every confidence in V2 is a probability. No exceptions, no "scores" that exceed 1. */
export const confidenceSchema = z.number().min(0).max(1);

/** Rejects NaN and ±Infinity, which `z.number()` alone happily accepts. */
export const finiteNumberSchema = z.number().refine(Number.isFinite, { message: 'must be finite (NaN and Infinity are rejected)' });
export const nonNegativeFiniteSchema = finiteNumberSchema.pipe(z.number().min(0));
export const positiveFiniteSchema = finiteNumberSchema.pipe(z.number().positive());

export const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/, 'must be a lowercase hex SHA-256');
export const isoInstantSchema = z.string().datetime({ offset: true });

export const mlTaskTypeSchema = z.enum([
  'pose_estimation',
  'character_segmentation',
  'video_segmentation',
  'point_tracking',
  'face_performance_extraction',
  'speech_transcription',
  'phoneme_alignment',
  'viseme_generation',
  'tts',
  'motion_reference_generation',
  'inbetween_generation',
  'frame_interpolation',
  'line_art_colorization',
  'depth_estimation',
  'optical_flow',
  'visual_quality_review',
  'sound_effect_retrieval',
  'sound_effect_generation',
  'music_generation'
]);
export type MlTaskType = z.infer<typeof mlTaskTypeSchema>;

export const executionModeSchema = z.enum(['simulation', 'offline_deterministic', 'real_ml', 'hybrid', 'real_harmony']);
export type ExecutionMode = z.infer<typeof executionModeSchema>;

export const commercialModeSchema = z.enum(['commercial', 'preview', 'research']);

/**
 * Strict provenance. Replaces every `provenance: z.any()` in the V1 block.
 * `realInferenceExecuted` may only be true when a checkpoint was actually run — the refinement
 * below makes the dishonest combination unrepresentable rather than merely discouraged.
 */
export const modelExecutionProvenanceSchema = z.object({
  providerId: z.string().min(1),
  modelId: z.string().min(1),
  modelRevision: z.string().min(1),
  repositoryUrl: z.string().url().nullable(),
  repositoryCommit: z.string().regex(/^[a-f0-9]{7,40}$/).nullable(),
  weightsFiles: z.array(z.string().min(1)),
  weightsSha256: z.array(sha256Schema),
  runtimeName: z.string().min(1),
  runtimeVersion: z.string().min(1),
  pythonVersion: z.string().min(1),
  device: z.string().min(1),
  precision: z.string().min(1),
  startedAt: isoInstantSchema,
  completedAt: isoInstantSchema,
  durationMs: nonNegativeFiniteSchema,
  peakMemoryMb: nonNegativeFiniteSchema.nullable(),
  seed: z.number().int().nullable(),
  deterministic: z.boolean(),
  inputArtifactHashes: z.array(sha256Schema),
  outputArtifactHashes: z.array(sha256Schema),
  licenseDecisionId: z.string().min(1),
  commercialMode: commercialModeSchema,
  realInferenceExecuted: z.boolean(),
  simulated: z.boolean(),
  cacheHit: z.boolean(),
  correlationId: z.string().min(1),
  jobId: z.string().min(1)
}).strict()
  .refine(p => !(p.realInferenceExecuted && p.simulated), { message: 'realInferenceExecuted and simulated cannot both be true' })
  .refine(p => !(p.realInferenceExecuted && p.weightsSha256.length === 0), { message: 'realInferenceExecuted=true requires at least one verified weights digest' })
  .refine(p => Date.parse(p.completedAt) >= Date.parse(p.startedAt), { message: 'completedAt must not precede startedAt' })
  .refine(p => p.weightsFiles.length === p.weightsSha256.length, { message: 'weightsFiles and weightsSha256 must be parallel arrays' });
export type ModelExecutionProvenance = z.infer<typeof modelExecutionProvenanceSchema>;

/**
 * An explicit coordinate model. V1 emitted bare x/y and left every consumer to guess whether
 * they were pixels, normalised, top-left or centre origin. Harmony field coordinates are
 * centre-origin with +Y up, so the conversion is not a no-op and must be recorded.
 */
export const coordinateSpaceSchema = z.object({
  coordinateSpace: z.enum(['image_pixels', 'image_normalized', 'harmony_field', 'harmony_opengl']),
  origin: z.enum(['top_left', 'bottom_left', 'center']),
  axisDirection: z.object({
    x: z.enum(['right', 'left']),
    y: z.enum(['down', 'up'])
  }).strict(),
  width: positiveFiniteSchema,
  height: positiveFiniteSchema,
  normalized: z.boolean(),
  pixelAspectRatio: positiveFiniteSchema,
  /** Affine image→Harmony-field transform, row-major [a b tx; c d ty]. Null when not derived. */
  harmonyFieldTransform: z.object({
    a: finiteNumberSchema, b: finiteNumberSchema, tx: finiteNumberSchema,
    c: finiteNumberSchema, d: finiteNumberSchema, ty: finiteNumberSchema,
    unitsPerField: positiveFiniteSchema
  }).strict().nullable()
}).strict();
export type CoordinateSpace = z.infer<typeof coordinateSpaceSchema>;

/**
 * Frame timing. Harmony timelines are 1-based; `frameBase: 1` therefore forbids frame 0, and
 * the refinement enforces it rather than leaving it to a comment.
 */
export const frameTimingSchema = z.object({
  frameBase: z.union([z.literal(0), z.literal(1)]),
  fps: positiveFiniteSchema,
  frameCount: z.number().int().nonnegative(),
  startFrame: z.number().int(),
  endFrame: z.number().int()
}).strict()
  .refine(t => t.endFrame >= t.startFrame, { message: 'endFrame must not precede startFrame' })
  .refine(t => t.frameBase === 0 || t.startFrame >= 1, { message: 'frameBase=1 forbids frame 0' })
  .refine(t => t.frameCount === 0 || t.endFrame - t.startFrame + 1 === t.frameCount, { message: 'frameCount must equal endFrame - startFrame + 1' });
export type FrameTiming = z.infer<typeof frameTimingSchema>;

export const boundingBoxV2Schema = z.object({
  x: finiteNumberSchema,
  y: finiteNumberSchema,
  width: positiveFiniteSchema,
  height: positiveFiniteSchema
}).strict();

/* ---------------------------------------------------------------------------- pose ------ */

/**
 * Canonical joint vocabulary for this project. DWPose/COCO/OpenProse indices are mapped onto
 * these names by a configurable skeleton mapping; downstream rigging code never sees a raw
 * model index.
 */
export const canonicalJointSchema = z.enum([
  'nose', 'neck', 'head_top',
  'eye_left', 'eye_right', 'ear_left', 'ear_right',
  'shoulder_left', 'elbow_left', 'wrist_left',
  'shoulder_right', 'elbow_right', 'wrist_right',
  'hip_center', 'hip_left', 'knee_left', 'ankle_left', 'foot_left',
  'hip_right', 'knee_right', 'ankle_right', 'foot_right',
  'spine_mid'
]);
export type CanonicalJoint = z.infer<typeof canonicalJointSchema>;

export const skeletonConventionSchema = z.enum(['coco17', 'coco_wholebody133', 'openpose18', 'harmony_internal']);

export const poseKeypointV2Schema = z.object({
  joint: canonicalJointSchema,
  /** Index in the source model's own keypoint ordering, kept so raw output stays traceable. */
  sourceIndex: z.number().int().nonnegative(),
  x: finiteNumberSchema,
  y: finiteNumberSchema,
  confidence: confidenceSchema,
  /** True when the value was filled by gap interpolation rather than observed. */
  interpolated: z.boolean(),
  /** True when the detector reported the joint but confidence fell below the gate. */
  gated: z.boolean()
}).strict();

export const poseFrameV2Schema = z.object({
  frame: z.number().int(),
  personId: z.string().min(1),
  bbox: boundingBoxV2Schema.nullable(),
  detectionScore: confidenceSchema.nullable(),
  keypoints: z.array(poseKeypointV2Schema),
  mirrored: z.boolean()
}).strict();

export const poseSequenceV2Schema = z.object({
  schemaVersion: z.literal('2.0'),
  sequenceId: z.string().min(1),
  taskType: z.literal('pose_estimation'),
  skeletonConvention: skeletonConventionSchema,
  /** Named mapping used to translate source indices to canonical joints. */
  skeletonMappingId: z.string().min(1),
  coordinates: coordinateSpaceSchema,
  timing: frameTimingSchema,
  frames: z.array(poseFrameV2Schema),
  /** Untouched model output, referenced by artifact id — never inlined as base64. */
  rawOutputArtifactId: z.string().min(1).nullable(),
  overlayArtifactId: z.string().min(1).nullable(),
  /** Post-processing that was actually applied, so a reviewer can tell measurement from cleanup. */
  postProcessing: z.object({
    confidenceGate: confidenceSchema,
    maxInterpolatedGapFrames: z.number().int().nonnegative(),
    outlierRejection: z.enum(['none', 'median_absolute_deviation', 'velocity_clamp']),
    temporalSmoothing: z.enum(['none', 'savitzky_golay', 'one_euro']),
    smoothingParameters: z.record(finiteNumberSchema),
    scaleNormalized: z.boolean()
  }).strict(),
  warnings: z.array(z.string()),
  provenance: modelExecutionProvenanceSchema
}).strict();
export type PoseSequenceV2 = z.infer<typeof poseSequenceV2Schema>;

/* --------------------------------------------------------------------- segmentation ----- */

/**
 * Closed ontology. A mask may only claim one of these labels; anything the detector cannot
 * ground into the ontology becomes `unclassified` with `requiresHuman=true`. This is what stops
 * "the blob near the top" from being labelled `head`.
 */
export const partLabelSchema = z.enum([
  'head', 'hair_front', 'hair_back', 'face',
  'eye_left', 'eye_right', 'brow_left', 'brow_right', 'mouth',
  'torso',
  'upper_arm_left', 'forearm_left', 'hand_left',
  'upper_arm_right', 'forearm_right', 'hand_right',
  'thigh_left', 'shin_left', 'foot_left',
  'thigh_right', 'shin_right', 'foot_right',
  'clothing', 'prop', 'unclassified'
]);
export type PartLabel = z.infer<typeof partLabelSchema>;

export const segmentationObjectV2Schema = z.object({
  objectId: z.string().min(1),
  label: partLabelSchema,
  /** Free text the grounding model produced, kept separate from the ontology decision. */
  groundingPhrase: z.string().nullable(),
  labelConfidence: confidenceSchema,
  maskScore: confidenceSchema,
  bbox: boundingBoxV2Schema,
  /** Lossless mask reference: RLE inline for small masks, artifact id for large ones. */
  maskRle: z.object({ counts: z.string(), size: z.tuple([z.number().int().positive(), z.number().int().positive()]) }).strict().nullable(),
  maskArtifactId: z.string().min(1).nullable(),
  occluded: z.boolean(),
  areaPixels: nonNegativeFiniteSchema,
  requiresHuman: z.boolean()
}).strict()
  .refine(o => o.maskRle !== null || o.maskArtifactId !== null, { message: 'a mask must be carried either as RLE or as an artifact reference' })
  .refine(o => o.label !== 'unclassified' || o.requiresHuman, { message: 'unclassified masks must set requiresHuman=true' });

export const segmentationFrameV2Schema = z.object({
  frame: z.number().int(),
  objects: z.array(segmentationObjectV2Schema)
}).strict();

export const segmentationManifestV2Schema = z.object({
  schemaVersion: z.literal('2.0'),
  taskType: z.enum(['character_segmentation', 'video_segmentation']),
  coordinates: coordinateSpaceSchema,
  timing: frameTimingSchema,
  frames: z.array(segmentationFrameV2Schema),
  cleanup: z.object({
    morphologicalOpenRadius: z.number().int().nonnegative(),
    morphologicalCloseRadius: z.number().int().nonnegative(),
    holesFilled: z.boolean(),
    minComponentAreaPixels: nonNegativeFiniteSchema,
    contourSimplificationEpsilon: nonNegativeFiniteSchema,
    temporalConsistencyEnforced: z.boolean()
  }).strict(),
  warnings: z.array(z.string()),
  provenance: modelExecutionProvenanceSchema
}).strict();
export type SegmentationManifestV2 = z.infer<typeof segmentationManifestV2Schema>;

/* -------------------------------------------------------------------- point tracking ---- */

export const trackedPointV2Schema = z.object({
  pointId: z.string().min(1),
  /** Stable semantic name supplied by the caller (e.g. `hair_tip_left`), not a model index. */
  semanticId: z.string().min(1),
  frame: z.number().int(),
  x: finiteNumberSchema,
  y: finiteNumberSchema,
  visibility: confidenceSchema,
  confidence: confidenceSchema,
  occluded: z.boolean(),
  /** True when the tracker was re-seeded here after a long occlusion. */
  reinitialized: z.boolean()
}).strict();

export const pointTrackPirSchema = z.object({
  schemaVersion: z.literal('2.0'),
  taskType: z.literal('point_tracking'),
  trackingRevision: z.string().min(1),
  sourceSpace: coordinateSpaceSchema,
  timing: frameTimingSchema,
  points: z.array(trackedPointV2Schema),
  quality: z.object({
    backwardVerificationError: nonNegativeFiniteSchema.nullable(),
    maxDriftPixels: nonNegativeFiniteSchema.nullable(),
    reinitializationCount: z.number().int().nonnegative()
  }).strict(),
  warnings: z.array(z.string()),
  provenance: modelExecutionProvenanceSchema
}).strict();
export type PointTrackPir = z.infer<typeof pointTrackPirSchema>;

/* -------------------------------------------------------------------------- speech ------ */

export const asrWordV2Schema = z.object({
  text: z.string(),
  startSeconds: nonNegativeFiniteSchema,
  endSeconds: nonNegativeFiniteSchema,
  confidence: confidenceSchema,
  speakerId: z.string().nullable()
}).strict().refine(w => w.endSeconds >= w.startSeconds, { message: 'word end must not precede start' });

/**
 * Forced-aligned phonemes are a *different* measurement from ASR word timings and are kept in a
 * separate array with their own aligner identity. Presenting WhisperX word boundaries as
 * phonemes is precisely the conflation this split exists to prevent.
 */
export const forcedPhonemeSchema = z.object({
  phone: z.string().min(1),
  /** Phone set the symbol belongs to, e.g. `mfa_russian_v2_0_0` or `arpabet`. */
  phoneSet: z.string().min(1),
  startSeconds: nonNegativeFiniteSchema,
  endSeconds: nonNegativeFiniteSchema,
  confidence: confidenceSchema,
  word: z.string()
}).strict().refine(p => p.endSeconds >= p.startSeconds, { message: 'phone end must not precede start' });

export const speechAnalysisPirSchema = z.object({
  schemaVersion: z.literal('2.0'),
  taskType: z.literal('speech_transcription'),
  language: z.string().min(2),
  durationSeconds: positiveFiniteSchema,
  transcript: z.string(),
  transcriptConfirmedByHuman: z.boolean(),
  words: z.array(asrWordV2Schema),
  segments: z.array(z.object({
    segmentId: z.string().min(1),
    startSeconds: nonNegativeFiniteSchema,
    endSeconds: nonNegativeFiniteSchema,
    text: z.string(),
    speakerId: z.string().nullable()
  }).strict()),
  /** Empty until a forced aligner has actually run. ASR alone never populates this. */
  phonemes: z.array(forcedPhonemeSchema),
  alignerId: z.string().nullable(),
  alignerKind: z.enum(['forced_alignment', 'heuristic_fallback', 'none']),
  warnings: z.array(z.string()),
  provenance: modelExecutionProvenanceSchema
}).strict()
  .refine(s => s.phonemes.length === 0 || s.alignerKind !== 'none', { message: 'phonemes require a declared aligner' })
  .refine(s => s.alignerKind === 'none' || s.alignerId !== null, { message: 'a declared aligner must be identified' });
export type SpeechAnalysisPir = z.infer<typeof speechAnalysisPirSchema>;

/* ------------------------------------------------------------------- generic job io ----- */

export const artifactReferenceSchema = z.object({
  artifactId: z.string().min(1),
  sha256: sha256Schema,
  sizeBytes: z.number().int().nonnegative(),
  mimeType: z.string().min(1),
  /** Store-relative path. Absolute paths and `..` are rejected by the artifact store, not here. */
  relativePath: z.string().min(1).refine(p => !p.startsWith('/') && !p.includes('..'), { message: 'artifact paths must be store-relative and must not traverse' }),
  role: z.string().min(1)
}).strict();
export type ArtifactReference = z.infer<typeof artifactReferenceSchema>;

export const mlJobRequestV2Schema = z.object({
  schemaVersion: z.literal('2.0'),
  jobId: z.string().min(1),
  correlationId: z.string().min(1),
  idempotencyKey: z.string().min(16),
  taskType: mlTaskTypeSchema,
  providerId: z.string().min(1),
  modelId: z.string().min(1),
  modelRevision: z.string().min(1),
  executionMode: executionModeSchema,
  commercialMode: commercialModeSchema,
  inputArtifacts: z.array(artifactReferenceSchema),
  /** Provider-specific, validated a second time by the provider's own input schema. */
  parameters: z.record(z.unknown()),
  timeoutMs: z.number().int().positive(),
  seed: z.number().int().nullable(),
  requestedDevice: z.enum(['auto', 'cpu', 'mps', 'cuda', 'remote']).default('auto')
}).strict();
export type MlJobRequestV2 = z.infer<typeof mlJobRequestV2Schema>;

export const mlJobStatusSchema = z.enum([
  'queued', 'preparing', 'loading_model', 'running', 'writing_artifacts',
  'succeeded', 'failed', 'cancelled', 'blocked', 'interrupted'
]);
export type MlJobStatus = z.infer<typeof mlJobStatusSchema>;

export const mlJobResultV2Schema = z.object({
  schemaVersion: z.literal('2.0'),
  jobId: z.string().min(1),
  correlationId: z.string().min(1),
  idempotencyKey: z.string().min(16),
  taskType: mlTaskTypeSchema,
  status: mlJobStatusSchema,
  attempt: z.number().int().positive(),
  outputArtifacts: z.array(artifactReferenceSchema),
  /** Normalised PIR payload, already validated against its own task-specific schema. */
  normalizedPir: z.unknown().nullable(),
  error: z.object({
    code: z.string().min(1),
    message: z.string(),
    retryable: z.boolean()
  }).strict().nullable(),
  warnings: z.array(z.string()),
  provenance: modelExecutionProvenanceSchema.nullable()
}).strict()
  .refine(r => r.status !== 'succeeded' || r.provenance !== null, { message: 'a succeeded job must carry provenance' })
  .refine(r => r.status !== 'succeeded' || r.error === null, { message: 'a succeeded job must not carry an error' })
  .refine(r => !['failed', 'blocked'].includes(r.status) || r.error !== null, { message: 'failed and blocked jobs must state an error code' });
export type MlJobResultV2 = z.infer<typeof mlJobResultV2Schema>;

/* ----------------------------------------------------------------- V1 → V2 migration ---- */

export interface V1MigrationGap {
  field: string;
  reason: string;
}

export interface V1MigrationReport<T> {
  migrated: T | null;
  gaps: V1MigrationGap[];
}

/**
 * Reads a V1 pose sequence and reports precisely which V2 fields cannot be recovered from it.
 * It intentionally returns `migrated: null` rather than fabricating a coordinate space, a
 * weights digest or a provenance record that the V1 document never contained.
 */
export function inspectPoseSequenceV1ForV2(input: unknown): V1MigrationReport<PoseSequenceV2> {
  const parsed = poseSequenceSchema.safeParse(input);
  if (!parsed.success) {
    return { migrated: null, gaps: [{ field: '$', reason: `not a valid V1 pose sequence: ${parsed.error.message}` }] };
  }
  const gaps: V1MigrationGap[] = [
    { field: 'coordinates', reason: 'V1 stored bare x/y with no declared space, origin, axis direction or source resolution' },
    { field: 'timing.frameBase', reason: 'V1 did not record whether frames were 0- or 1-based' },
    { field: 'provenance.weightsSha256', reason: 'V1 provenance carried tool/version/backend only; no weights digest exists to migrate' },
    { field: 'provenance.realInferenceExecuted', reason: 'V1 could not distinguish a real run from a simulated one' },
    { field: 'skeletonMappingId', reason: 'V1 keyed landmarks by free-form string with no declared skeleton convention' }
  ];
  return { migrated: null, gaps };
}

