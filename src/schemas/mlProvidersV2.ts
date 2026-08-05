/**
 * Provider-specific PIR contracts introduced with the `feat/industrial-ml-production-os`
 * branch. The existing PIR types live next to the data they describe (`partDecomposition.ts`,
 * `characterRigPIR.ts`, `performancePir.ts`, `keyPoseMotion.ts`); the files in here are *new*
 * types for providers that did not previously have a typed output, and whose contract the
 * orchestrator validates against `provider.outputSchema`.
 *
 * Conventions:
 *   - `provenance` is `modelExecutionProvenanceSchema` and nothing else. The V1
 *     `provenance: z.any()` fields in this directory were removed.
 *   - Coordinates always carry an explicit `coordinateSpaceSchema`. The downstream retargeter
 *     uses that to know whether to multiply by -1.
 *   - Confidence is `[0, 1]`. Anything outside that range is a schema error, not a magic value.
 *   - Frame indices are `startFrame + offset` for `frameBase` either `0` or `1`. The provider
 *     records `frameBase` so consumers do not have to guess.
 *   - NaN, Infinity and negative durations are blocked at the schema layer.
 */

import { z } from 'zod';
import {
  coordinateSpaceSchema,
  isoInstantSchema,
  modelExecutionProvenanceSchema,
  nonNegativeFiniteSchema,
  positiveFiniteSchema,
  sha256Schema
} from './ml.js';

/* ============================================================================ SAM 2 === */

export const sam2PromptSchema = z.object({
  objectId: z.string().min(1).max(64),
  positivePoints: z.array(z.object({ x: nonNegativeFiniteSchema, y: nonNegativeFiniteSchema, label: z.string().optional() })).default([]),
  negativePoints: z.array(z.object({ x: nonNegativeFiniteSchema, y: nonNegativeFiniteSchema, label: z.string().optional() })).default([]),
  box: z.object({ x: nonNegativeFiniteSchema, y: nonNegativeFiniteSchema, width: positiveFiniteSchema, height: positiveFiniteSchema }).nullable().optional(),
  maskReference: z.string().nullable().optional()
}).strict();
export type Sam2Prompt = z.infer<typeof sam2PromptSchema>;

export const sam2MaskObjectSchema = z.object({
  objectId: z.string().min(1),
  label: z.string().min(1),
  bbox: z.object({
    x: nonNegativeFiniteSchema,
    y: nonNegativeFiniteSchema,
    width: positiveFiniteSchema,
    height: positiveFiniteSchema
  }).strict(),
  score: z.number().min(0).max(1),
  /** PNG mask, content-addressed. The artifact SHA-256 lives here; the relative path is in `masks[].artifactId`. */
  maskArtifactId: z.string().min(1).nullable(),
  maskSha256: sha256Schema.nullable(),
  rle: z.object({ size: z.tuple([positiveFiniteSchema, positiveFiniteSchema]), counts: z.string().min(1) }).strict().nullable(),
  areaPixels: positiveFiniteSchema,
  occluded: z.boolean(),
  requiresHumanReview: z.boolean()
}).strict();
export type Sam2MaskObject = z.infer<typeof sam2MaskObjectSchema>;

export const sam2FrameResultSchema = z.object({
  frameIndex: z.number().int().min(0),
  frameBase: z.union([z.literal(0), z.literal(1)]),
  sourceWidth: positiveFiniteSchema,
  sourceHeight: positiveFiniteSchema,
  coordinateSpace: coordinateSpaceSchema,
  objects: z.array(sam2MaskObjectSchema)
}).strict();
export type Sam2FrameResult = z.infer<typeof sam2FrameResultSchema>;

export const sam2VideoSegmentationRequestV2Schema = z.object({
  schemaVersion: z.literal('2.0'),
  providerId: z.literal('sam2'),
  modelId: z.string().min(1),
  modelRevision: z.string().min(1),
  taskType: z.enum(['character_segmentation', 'video_segmentation']),
  inputMode: z.enum(['image', 'frame_sequence', 'video']),
  frameBase: z.union([z.literal(0), z.literal(1)]),
  coordinateSpace: coordinateSpaceSchema,
  fps: positiveFiniteSchema,
  prompts: z.array(sam2PromptSchema),
  morphology: z.object({
    closingPx: z.number().int().nonnegative(),
    openingPx: z.number().int().nonnegative(),
    minAreaPx: positiveFiniteSchema,
    contourEpsilon: nonNegativeFiniteSchema
  }).strict().default({ closingPx: 0, openingPx: 0, minAreaPx: 16, contourEpsilon: 0 })
}).strict();
export type Sam2VideoSegmentationRequestV2 = z.infer<typeof sam2VideoSegmentationRequestV2Schema>;

export const sam2VideoSegmentationResultV2Schema = z.object({
  schemaVersion: z.literal('2.0'),
  requestFingerprint: sha256Schema,
  frameCount: positiveFiniteSchema,
  frames: z.array(sam2FrameResultSchema),
  provenance: modelExecutionProvenanceSchema
}).strict();
export type Sam2VideoSegmentationResultV2 = z.infer<typeof sam2VideoSegmentationResultV2Schema>;

/** Allowed semantic categories for the part decomposition adapter that follows SAM 2. */
export const sam2PartCategorySchema = z.enum([
  'head', 'hair_front', 'hair_back', 'face', 'eye_left', 'eye_right',
  'brow_left', 'brow_right', 'mouth', 'torso',
  'upper_arm_left', 'forearm_left', 'hand_left',
  'upper_arm_right', 'forearm_right', 'hand_right',
  'thigh_left', 'shin_left', 'foot_left',
  'thigh_right', 'shin_right', 'foot_right',
  'clothing', 'prop', 'unclassified'
]);
export type Sam2PartCategory = z.infer<typeof sam2PartCategorySchema>;

export const sam2PartMappingSchema = z.object({
  objectId: z.string().min(1),
  category: sam2PartCategorySchema,
  confidence: z.number().min(0).max(1),
  mirrorOf: z.string().min(1).nullable().optional(),
  requiresHuman: z.boolean()
}).strict();
export type Sam2PartMapping = z.infer<typeof sam2PartMappingSchema>;

/* ============================================================================ CoTracker === */

export const cotrackerQueryPointSchema = z.object({
  pointId: z.string().min(1),
  x: nonNegativeFiniteSchema,
  y: nonNegativeFiniteSchema,
  /** Optional semantic binding (e.g. `"hair_tip"`, `"hand_left"`). Helps the retargeter route tracks. */
  semantic: z.string().min(1).optional(),
  initialFrame: z.number().int().min(0)
}).strict();

export const cotrackerTrackSchema = z.object({
  pointId: z.string().min(1),
  semantic: z.string().optional(),
  visibility: z.array(z.number().min(0).max(1)),
  confidence: z.array(z.number().min(0).max(1)),
  occluded: z.array(z.boolean()),
  positions: z.array(z.object({ x: nonNegativeFiniteSchema, y: nonNegativeFiniteSchema }).strict())
}).strict()
  .refine(t => t.visibility.length === t.positions.length && t.visibility.length === t.confidence.length && t.visibility.length === t.occluded.length, {
    message: 'visibility / confidence / occluded / positions must be parallel arrays'
  });
export type CotrackerTrack = z.infer<typeof cotrackerTrackSchema>;

export const cotrackerRequestV2Schema = z.object({
  schemaVersion: z.literal('2.0'),
  providerId: z.literal('cotracker'),
  modelId: z.string().min(1),
  modelRevision: z.string().min(1),
  taskType: z.literal('point_tracking'),
  inputMode: z.enum(['frame_sequence', 'video']),
  frameBase: z.union([z.literal(0), z.literal(1)]),
  fps: positiveFiniteSchema,
  queryPoints: z.array(cotrackerQueryPointSchema),
  coordinateSpace: coordinateSpaceSchema,
  driftTolerancePx: positiveFiniteSchema.default(8),
  reinitAfterFrames: z.number().int().nonnegative().default(45)
}).strict();
export type CotrackerRequestV2 = z.infer<typeof cotrackerRequestV2Schema>;

export const cotrackerResultV2Schema = z.object({
  schemaVersion: z.literal('2.0'),
  requestFingerprint: sha256Schema,
  frameCount: positiveFiniteSchema,
  sourceWidth: positiveFiniteSchema,
  sourceHeight: positiveFiniteSchema,
  coordinateSpace: coordinateSpaceSchema,
  tracks: z.array(cotrackerTrackSchema),
  provenance: modelExecutionProvenanceSchema
}).strict();
export type CotrackerResultV2 = z.infer<typeof cotrackerResultV2Schema>;

/* ============================================================================ WhisperX === */

export const whisperxWordV2Schema = z.object({
  text: z.string(),
  startSec: nonNegativeFiniteSchema,
  endSec: nonNegativeFiniteSchema,
  /** ASR confidence for the word boundary. Phoneme timing from MFA carries its own confidence. */
  confidence: z.number().min(0).max(1),
  speaker: z.string().min(1).optional()
}).strict()
  .refine(w => w.endSec >= w.startSec, { message: 'word endSec must be >= startSec' });
export type WhisperxWordV2 = z.infer<typeof whisperxWordV2Schema>;

export const whisperxSegmentV2Schema = z.object({
  segmentId: z.string().min(1),
  text: z.string(),
  startSec: nonNegativeFiniteSchema,
  endSec: nonNegativeFiniteSchema,
  language: z.string().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/),
  words: z.array(whisperxWordV2Schema),
  speaker: z.string().min(1).optional()
}).strict()
  .refine(s => s.endSec >= s.startSec, { message: 'segment endSec must be >= startSec' });
export type WhisperxSegmentV2 = z.infer<typeof whisperxSegmentV2Schema>;

export const whisperxPhonemeV2Schema = z.object({
  phoneme: z.string().min(1).max(8),
  startSec: nonNegativeFiniteSchema,
  endSec: nonNegativeFiniteSchema,
  confidence: z.number().min(0).max(1),
  /** Word index in the ASR transcript this phoneme belongs to. */
  wordIndex: z.number().int().nonnegative()
}).strict()
  .refine(p => p.endSec >= p.startSec, { message: 'phoneme endSec must be >= startSec' });
export type WhisperxPhonemeV2 = z.infer<typeof whisperxPhonemeV2Schema>;

export const whisperxSpeechAnalysisV2Schema = z.object({
  schemaVersion: z.literal('2.0'),
  providerId: z.literal('whisperx'),
  modelId: z.string().min(1),
  modelRevision: z.string().min(1),
  language: z.string().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/),
  durationSec: nonNegativeFiniteSchema,
  segments: z.array(whisperxSegmentV2Schema),
  phonemes: z.array(whisperxPhonemeV2Schema),
  alignmentSource: z.enum(['whisperx_word_level', 'montreal_forced_aligner', 'rhubarb_heuristic']),
  provenance: modelExecutionProvenanceSchema
}).strict();
export type WhisperxSpeechAnalysisV2 = z.infer<typeof whisperxSpeechAnalysisV2Schema>;

export const whisperxRequestV2Schema = z.object({
  schemaVersion: z.literal('2.0'),
  providerId: z.literal('whisperx'),
  modelId: z.string().min(1),
  modelRevision: z.string().min(1),
  taskType: z.enum(['speech_transcription', 'phoneme_alignment']),
  language: z.string().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/),
  alignmentSource: z.enum(['whisperx_word_level', 'montreal_forced_aligner', 'rhubarb_heuristic']).default('whisperx_word_level'),
  pronunciationDictionaryId: z.string().nullable().optional(),
  diarize: z.boolean().default(false)
}).strict();
export type WhisperxRequestV2 = z.infer<typeof whisperxRequestV2Schema>;

/* ============================================================================ Viseme mapping === */

export const visemeSetSchema = z.enum([
  'preston_blair_basic', 'mery_phoneme_basic', 'shape_preston_blair_v2', 'custom'
]);

export const visemeShapeSchema = z.object({
  visemeId: z.string().min(1),
  /** Phoneme list that maps to this shape. Empty list means the shape is a fallback. */
  triggers: z.array(z.string().min(1).max(8)),
  minHoldFrames: z.number().int().min(1).max(8),
  /** Closed mouth shape used for silences. */
  isRest: z.boolean().default(false)
}).strict();

export const visemeMappingV2Schema = z.object({
  schemaVersion: z.literal('2.0'),
  characterId: z.string().min(1),
  rigVersion: z.string().min(1),
  visemeSet: visemeSetSchema,
  shapes: z.array(visemeShapeSchema),
  silenceShapeId: z.string().min(1),
  breathingShapeId: z.string().min(1).nullable().optional(),
  /** Coarticulation rules. Each one says "when shape X follows shape Y, blend with shape Z for `frames` frames." */
  coarticulation: z.array(z.object({
    previous: z.string().min(1),
    next: z.string().min(1),
    blendWith: z.string().min(1),
    frames: z.number().int().min(0).max(6)
  }).strict()).default([])
}).strict();
export type VisemeMappingV2 = z.infer<typeof visemeMappingV2Schema>;

/* ============================================================================ Face performance === */

export const facePerformanceShapeV2Schema = z.object({
  yaw: z.number().min(-1).max(1),
  pitch: z.number().min(-1).max(1),
  roll: z.number().min(-1).max(1),
  jawOpen: z.number().min(0).max(1),
  mouthWidth: z.number().min(0).max(1),
  smile: z.number().min(-1).max(1),
  eyeBlinkLeft: z.number().min(0).max(1),
  eyeBlinkRight: z.number().min(0).max(1),
  eyeLookX: z.number().min(-1).max(1),
  eyeLookY: z.number().min(-1).max(1),
  browRaiseLeft: z.number().min(0).max(1),
  browRaiseRight: z.number().min(0).max(1),
  cheekRaise: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  source: z.enum(['liveportrait', 'mediapipe_face_landmarker', 'emotion_recognition_secondary'])
}).strict();

export const facePerformanceRequestV2Schema = z.object({
  schemaVersion: z.literal('2.0'),
  providerId: z.enum(['liveportrait', 'mediapipe_face_landmarker']),
  modelId: z.string().min(1),
  modelRevision: z.string().min(1),
  taskType: z.literal('face_performance_extraction'),
  inputMode: z.enum(['image', 'frame_sequence', 'video']),
  frameBase: z.union([z.literal(0), z.literal(1)]),
  fps: positiveFiniteSchema,
  calibrationClipId: z.string().nullable().optional(),
  perCharacterRanges: z.record(z.string(), z.object({
    yawMin: z.number().min(-1).max(1),
    yawMax: z.number().min(-1).max(1),
    pitchMin: z.number().min(-1).max(1),
    pitchMax: z.number().min(-1).max(1)
  }).strict()).optional()
}).strict();
export type FacePerformanceRequestV2 = z.infer<typeof facePerformanceRequestV2Schema>;

export const facePerformanceResultV2Schema = z.object({
  schemaVersion: z.literal('2.0'),
  requestFingerprint: sha256Schema,
  frameCount: positiveFiniteSchema,
  fps: positiveFiniteSchema,
  shapes: z.array(facePerformanceShapeV2Schema),
  provenance: modelExecutionProvenanceSchema
}).strict();
export type FacePerformanceResultV2 = z.infer<typeof facePerformanceResultV2Schema>;

/* ============================================================================ TTS / Consent === */

export const consentRecordV2Schema = z.object({
  consentId: z.string().min(1),
  subjectPseudonym: z.string().min(1),
  scope: z.enum(['voice_clone', 'face_performance_clone', 'full_digital_actor_clone']),
  permittedProjects: z.array(z.string().min(1)),
  permittedUntil: isoInstantSchema.nullable(),
  revoked: z.boolean(),
  revokedAt: isoInstantSchema.nullable(),
  sourceRecordingSha256: sha256Schema.nullable(),
  createdAt: isoInstantSchema
}).strict();
export type ConsentRecordV2 = z.infer<typeof consentRecordV2Schema>;

export const ttsRequestV2Schema = z.object({
  schemaVersion: z.literal('2.0'),
  providerId: z.enum(['voxcpm', 'cosyvoice2']),
  modelId: z.string().min(1),
  modelRevision: z.string().min(1),
  taskType: z.literal('tts'),
  voiceMode: z.enum(['licensed_stock_voice', 'studio_owned_voice', 'consented_clone', 'synthetic_designed_voice']),
  text: z.string().min(1).max(20_000),
  language: z.string().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/),
  speakerProfileId: z.string().min(1),
  consentId: z.string().min(1).nullable(),
  seed: z.number().int().nullable().default(null),
  loudnessTargetDb: z.number().min(-30).max(0).default(-16),
  normalizeLoudness: z.boolean().default(true),
  silenceTrimMs: z.number().int().nonnegative().default(120)
}).strict()
  .refine(r => !(r.voiceMode === 'consented_clone' && r.consentId === null), { message: 'consented_clone requires a consentId' })
  .refine(r => !(r.voiceMode === 'consented_clone' && r.consentId !== null), { message: 'consentId is only valid for consented_clone' });
export type TtsRequestV2 = z.infer<typeof ttsRequestV2Schema>;

const ttsVoiceModeSchema = z.enum(['licensed_stock_voice', 'studio_owned_voice', 'consented_clone', 'synthetic_designed_voice']);
const ttsLanguageSchema = z.string().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/);

export const ttsResultV2Schema = z.object({
  schemaVersion: z.literal('2.0'),
  requestFingerprint: sha256Schema,
  voiceMode: ttsVoiceModeSchema,
  language: ttsLanguageSchema,
  sampleRateHz: z.number().int().positive(),
  durationSec: positiveFiniteSchema,
  transcriptSha256: sha256Schema,
  audioArtifactId: z.string().min(1),
  consentId: z.string().min(1).nullable(),
  loudnessDb: z.number().min(-60).max(0).nullable(),
  clippingDetected: z.boolean(),
  seed: z.number().int().nullable(),
  provenance: modelExecutionProvenanceSchema
}).strict();
export type TtsResultV2 = z.infer<typeof ttsResultV2Schema>;

/* ============================================================================ Inbetween === */

export const inbetweenRequestV2Schema = z.object({
  schemaVersion: z.literal('2.0'),
  providerId: z.enum(['tooncrafter', 'animeinterp', 'animeinbet', 'tooncomposer']),
  modelId: z.string().min(1),
  modelRevision: z.string().min(1),
  taskType: z.enum(['inbetween_generation', 'frame_interpolation']),
  mode: z.enum(['two_keyframes', 'color_reference_plus_sparse_sketch', 'sketch_plus_prompt']),
  fps: positiveFiniteSchema,
  outputFrameCount: z.number().int().min(1).max(64),
  approvedKeyframeIndices: z.array(z.number().int().nonnegative()).min(2),
  prompt: z.string().max(2_000).optional(),
  sketchHints: z.array(z.object({
    frameIndex: z.number().int().nonnegative(),
    artifactId: z.string().min(1)
  }).strict()).default([]),
  seed: z.number().int().nullable().default(null)
}).strict();
export type InbetweenRequestV2 = z.infer<typeof inbetweenRequestV2Schema>;

export const inbetweenFrameResultV2Schema = z.object({
  frameIndex: z.number().int().nonnegative(),
  rasterArtifactId: z.string().min(1).nullable(),
  maskArtifactId: z.string().min(1).nullable(),
  qualityScore: z.number().min(0).max(1).nullable(),
  editable: z.literal(false),
  representation: z.enum(['raster_sequence', 'bitmap_cutout', 'frame_by_frame_vector'])
}).strict();

const inbetweenModeSchema = z.enum(['two_keyframes', 'color_reference_plus_sparse_sketch', 'sketch_plus_prompt']);

export const inbetweenResultV2Schema = z.object({
  schemaVersion: z.literal('2.0'),
  requestFingerprint: sha256Schema,
  mode: inbetweenModeSchema,
  outputFrameCount: z.number().int().min(1),
  frames: z.array(inbetweenFrameResultV2Schema),
  reasonCodes: z.array(z.string()).default([]),
  editabilityScore: z.number().min(0).max(1),
  licenseStatus: z.enum(['allowed', 'preview_only', 'research_only', 'unknown']),
  expectedLatencyMs: positiveFiniteSchema,
  expectedVramGb: nonNegativeFiniteSchema.nullable(),
  temporalDriftRisk: z.enum(['low', 'medium', 'high']),
  humanApprovalRequired: z.boolean(),
  provenance: modelExecutionProvenanceSchema
}).strict();
export type InbetweenResultV2 = z.infer<typeof inbetweenResultV2Schema>;

/* ============================================================================ Colorization === */

export const colorizationRequestV2Schema = z.object({
  schemaVersion: z.literal('2.0'),
  providerId: z.enum(['manganinjia']),
  modelId: z.string().min(1),
  modelRevision: z.string().min(1),
  taskType: z.literal('line_art_colorization'),
  approvedPaletteIds: z.array(z.string().regex(/^0x[0-9a-fA-F]{16}$/)).min(1),
  paletteCharacterId: z.string().min(1),
  referenceArtifactId: z.string().min(1).nullable(),
  pointHints: z.array(z.object({ x: nonNegativeFiniteSchema, y: nonNegativeFiniteSchema, paletteId: z.string().regex(/^0x[0-9a-fA-F]{16}$/) }).strict()).default([])
}).strict();
export type ColorizationRequestV2 = z.infer<typeof colorizationRequestV2Schema>;

const approvedPaletteIdsSchema = z.array(z.string().regex(/^0x[0-9a-fA-F]{16}$/)).min(1);

export const colorizationResultV2Schema = z.object({
  schemaVersion: z.literal('2.0'),
  requestFingerprint: sha256Schema,
  approvedPaletteIds: approvedPaletteIdsSchema,
  regionCount: z.number().int().min(0),
  bleedOutsideLinework: z.boolean(),
  unfilledAreaPixels: z.number().int().nonnegative(),
  paletteSubstitutions: z.number().int().nonnegative(),
  provenance: modelExecutionProvenanceSchema
}).strict();
export type ColorizationResultV2 = z.infer<typeof colorizationResultV2Schema>;

/* ============================================================================ Visual critic === */

export const visualIssueSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export const visualIssueV2Schema = z.object({
  issueId: z.string().min(1),
  issueType: z.enum([
    'identity_drift', 'line_inconsistency', 'palette_drift', 'temporal_flicker',
    'duplicate_frame', 'topology_change', 'unexpected_object', 'edge_crawl',
    'background_movement', 'hand_count_anomaly', 'face_landmark_instability',
    'mouth_off_audio', 'camera_safe_area_breach', 'editability_degraded'
  ]),
  severity: visualIssueSeveritySchema,
  confidence: z.number().min(0).max(1),
  frameRange: z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]).nullable(),
  boundingBoxes: z.array(z.object({
    x: nonNegativeFiniteSchema,
    y: nonNegativeFiniteSchema,
    width: positiveFiniteSchema,
    height: positiveFiniteSchema
  }).strict()).default([]),
  evidenceArtifacts: z.array(z.string().min(1)).default([]),
  description: z.string().min(1)
}).strict();

export const visualCriticReportV2Schema = z.object({
  schemaVersion: z.literal('2.0'),
  providerId: z.enum(['qwen3-vl']),
  modelId: z.string().min(1),
  modelRevision: z.string().min(1),
  requestFingerprint: sha256Schema,
  overallSeverity: visualIssueSeveritySchema,
  issues: z.array(visualIssueV2Schema),
  /** The critic may suggest changes; only `ReviewNotePIR` and `RetakeSuggestionPIR` are allowed. */
  suggestions: z.array(z.object({
    kind: z.enum(['ReviewNotePIR', 'RetakeSuggestionPIR']),
    payload: z.string()
  }).strict()).default([]),
  /** VLM never speaks for technical QA. `mechanicalChecksRequired` forces the deterministic QA pass before approval. */
  mechanicalChecksRequired: z.array(z.string()).default([]),
  promptInjectionDetected: z.boolean(),
  provenance: modelExecutionProvenanceSchema
}).strict()
  .refine(r => !r.suggestions.some(s => s.kind.includes('Approval')), { message: 'VLM cannot propose approval actions' });
export type VisualCriticReportV2 = z.infer<typeof visualCriticReportV2Schema>;

/* ============================================================================ Generic status === */

export const providerStatusV2Schema = z.enum([
  'succeeded',
  'succeeded_cached',
  'blocked_weights_missing',
  'blocked_license',
  'blocked_hardware',
  'blocked_unsupported',
  'failed_runtime',
  'failed_input',
  'failed_output',
  'cancelled'
]);
export type ProviderStatusV2 = z.infer<typeof providerStatusV2Schema>;
