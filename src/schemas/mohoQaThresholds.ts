import { z } from 'zod';

export const MOHO_QA_THRESHOLDS_SCHEMA_VERSION = '1.0';

export const mohoQaThresholdsSchema = z.object({
  schemaVersion: z.literal('1.0'),
  thresholdsId: z.string().min(1),
  silhouetteQualityMin: z.number().min(0).max(1).default(0.7),
  lipsyncDriftMaxMs: z.number().int().positive().default(80),
  continuityMaxDeltaFrames: z.number().int().positive().default(2),
  lineThicknessTolerancePt: z.number().positive().default(0.5),
  paletteDeltaMax: z.number().min(0).max(1).default(0.02),
  poseLibraryMatchMin: z.number().min(0).max(1).default(0.85),
  autoFixableSeverityMax: z.enum(['low', 'medium']).default('medium'),
  requireHumanApprovalFor: z.array(z.string()).default(['key_pose', 'camera_move', 'dialogue_timing']),
  boneAngleToleranceDeg: z.number().min(0).max(45).default(2),
  meshWarpMaxPointsMoved: z.number().int().positive().default(8),
  switchLayerMaxChangesPerSecond: z.number().positive().default(6),
  forbidOrphanBones: z.boolean().default(true),
  provenance: z.object({
    approver: z.string().min(1),
    approvedAt: z.string().datetime()
  })
}).strict();

export type MohoQaThresholds = z.infer<typeof mohoQaThresholdsSchema>;

export function assertMohoQaThresholdsVersion(doc: unknown): asserts doc is MohoQaThresholds {
  const parsed = mohoQaThresholdsSchema.safeParse(doc);
  if (!parsed.success) {
    throw new Error(`Invalid MohoQaThresholds: ${parsed.error.message}`);
  }
  if (parsed.data.schemaVersion !== MOHO_QA_THRESHOLDS_SCHEMA_VERSION) {
    throw new Error(
      `MohoQaThresholds schemaVersion mismatch: expected ${MOHO_QA_THRESHOLDS_SCHEMA_VERSION}, got ${parsed.data.schemaVersion}`
    );
  }
}