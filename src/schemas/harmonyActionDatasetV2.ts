import { z } from 'zod';
import { sha256Schema, isoInstantSchema, nonNegativeFiniteSchema } from './ml.js';

/**
 * Harmony Action Dataset Entry V2.
 *
 * Extends `harmonyActionDataset.ts` (V1) with the categories the V1 contract explicitly
 * marked `notCapturedV1`: palettes, deformer chains, master controllers, sound columns,
 * camera state, write node state. V2 captures these because the V2 model produces higher
 * quality edits when its supervision signal includes them.
 *
 * V1 readers continue to work: V2 is a strict superset with a new schema version.
 */

export const HARMONY_ACTION_DATASET_V2 = '2.0.0' as const;

export const harmonyVersionSchema = z.object({
  product: z.enum(['Harmony Premium', 'Harmony Essentials', 'Harmony Indie', 'unknown']),
  version: z.string().min(1),
  buildId: z.string().nullable()
}).strict();

export const paletteDiffV2Schema = z.object({
  paletteName: z.string().min(1),
  beforeColorIds: z.array(z.string()).default([]),
  afterColorIds: z.array(z.string()).default([]),
  addedSwatches: z.array(z.object({
    colorId: z.string(),
    colorName: z.string(),
    rgba: z.object({ r: z.number().int().min(0).max(255), g: z.number().int().min(0).max(255), b: z.number().int().min(0).max(255), a: z.number().int().min(0).max(255) }).strict()
  }).strict()).default([]),
  removedSwatches: z.array(z.object({ colorId: z.string(), colorName: z.string() }).strict()).default([])
}).strict();

export const deformerChainV2Schema = z.object({
  chainId: z.string().min(1),
  affectedElementPath: z.string().min(1),
  beforeDeformerIds: z.array(z.string()).default([]),
  afterDeformerIds: z.array(z.string()).default([]),
  boneParams: z.array(z.object({
    boneId: z.string().min(1),
    rotationBefore: z.array(z.number()).nullable().optional(),
    rotationAfter: z.array(z.number()).nullable().optional()
  }).strict()).default([]),
  curveParams: z.array(z.object({
    curveId: z.string().min(1),
    pointsBefore: z.number().int().min(0).nullable().optional(),
    pointsAfter: z.number().int().min(0).nullable().optional()
  }).strict()).default([])
}).strict();

export const masterControllerChangeV2Schema = z.object({
  controllerPath: z.string().min(1),
  attributeName: z.string().min(1),
  valueBefore: z.number().nullable(),
  valueAfter: z.number().nullable(),
  affectedFrame: z.number().int().min(1).nullable()
}).strict();

export const soundColumnV2Schema = z.object({
  columnPath: z.string().min(1),
  audioArtifactSha256: sha256Schema.nullable(),
  startSec: nonNegativeFiniteSchema,
  endSec: nonNegativeFiniteSchema,
  mute: z.boolean(),
  gainDb: nonNegativeFiniteSchema.nullable()
}).strict();

export const cameraStateV2Schema = z.object({
  cameraPath: z.string().min(1),
  positionBefore: z.array(z.number()).nullable(),
  positionAfter: z.array(z.number()).nullable(),
  focalBefore: nonNegativeFiniteSchema.nullable(),
  focalAfter: nonNegativeFiniteSchema.nullable(),
  safeAreaViolation: z.boolean()
}).strict();

export const writeNodeStateV2Schema = z.object({
  writePath: z.string().min(1),
  resolution: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }).strict(),
  frameRange: z.object({ start: z.number().int().min(1), end: z.number().int().min(1) }).strict(),
  format: z.string().min(1)
}).strict();

export const retakeContextV2Schema = z.object({
  reason: z.string().min(1),
  issuedBy: z.enum(['animator', 'supervisor', 'director', 'producer', 'vlm_critic']).default('animator'),
  severity: z.enum(['minor', 'major', 'critical']).default('major'),
  affectedFrameRange: z.tuple([z.number().int().min(1), z.number().int().min(1)]).nullable()
}).strict();

export const harmonyActionDatasetEntryV2Schema = z.object({
  schemaVersion: z.literal(HARMONY_ACTION_DATASET_V2),
  entryId: z.string().min(1),
  sessionId: z.string().min(1),
  instruction: z.string().min(1),
  retakeContext: retakeContextV2Schema.nullable(),
  sceneBeforeSha256: sha256Schema,
  sceneAfterSha256: sha256Schema,
  semanticDiff: z.object({
    affectedNodes: z.array(z.string()),
    affectedFrames: z.array(z.number().int().min(1)),
    palettes: z.array(paletteDiffV2Schema),
    deformerChains: z.array(deformerChainV2Schema),
    masterControllerChanges: z.array(masterControllerChangeV2Schema),
    soundColumns: z.array(soundColumnV2Schema),
    cameraStates: z.array(cameraStateV2Schema),
    writeNodes: z.array(writeNodeStateV2Schema),
    functionCurves: z.array(z.object({
      nodeId: z.string().min(1),
      attribute: z.string().min(1),
      pointCountBefore: z.number().int().min(0).nullable(),
      pointCountAfter: z.number().int().min(0).nullable()
    }).strict()).default([])
  }).strict(),
  forwardPatch: z.array(z.object({
    opId: z.string().min(1),
    opcode: z.string().min(1),
    inverseOpId: z.string().min(1)
  }).strict()),
  inversePatch: z.array(z.object({
    opId: z.string().min(1),
    opcode: z.string().min(1)
  }).strict()),
  approvalDecision: z.enum(['approved', 'rejected', 'pending']),
  rejectionReason: z.string().nullable(),
  operatorType: z.enum(['animator', 'supervisor', 'system']),
  projectId: z.string().min(1),
  episodeId: z.string().nullable(),
  sequenceId: z.string().nullable(),
  shotId: z.string().nullable(),
  assetId: z.string().nullable(),
  characterId: z.string().nullable(),
  rigVersion: z.string().nullable(),
  harmonyVersion: harmonyVersionSchema,
  licenseRefs: z.array(z.string()),
  consentRefs: z.array(z.string()),
  synthetic: z.boolean().default(false),
  hashSha256: sha256Schema,
  recordedAt: isoInstantSchema
}).strict()
  .refine(e => !e.synthetic || e.operatorType !== 'animator', { message: 'synthetic entries cannot be attributed to a human animator' });
export type HarmonyActionDatasetEntryV2 = z.infer<typeof harmonyActionDatasetEntryV2Schema>;
