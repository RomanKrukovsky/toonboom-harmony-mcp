import { z } from 'zod';
import { mohoRetakeManifestSchema } from './mohoRetakeManifest.js';

export const MOHO_RETAKE_DATASET_SCHEMA_VERSION = '1.0';

export const mohoDatasetEntrySchema = z.object({
  entryId: z.string().min(1),
  sessionId: z.string().min(1),
  shotId: z.string().min(1),
  rigType: z.enum(['humanoid_2leg', 'quadruped', 'creature', 'mechanical']),
  intent: z.enum(['manual_fix', 'auto_retake', 'composite']),
  retakeManifest: mohoRetakeManifestSchema,
  notes: z.string(),
  recordedAt: z.string().datetime(),
  recordedBy: z.string().min(1),
  provenance: z.object({
    beforePerformanceId: z.string(),
    afterPerformanceId: z.string(),
    beforeSnapshotPath: z.string().optional(),
    afterSnapshotPath: z.string().optional()
  })
}).strict();

export const mohoRetakeDatasetSchema = z.object({
  schemaVersion: z.literal('1.0'),
  datasetId: z.string().min(1),
  production: z.string().min(1),
  rigType: z.enum(['humanoid_2leg', 'quadruped', 'creature', 'mechanical']).optional(),
  entries: z.array(mohoDatasetEntrySchema).default([]),
  fingerprint: z.string().describe('SHA-256 of canonicalised entries'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  provenance: z.object({
    curator: z.string().min(1),
    approvedAt: z.string().datetime()
  })
}).strict();

export type MohoDatasetEntry = z.infer<typeof mohoDatasetEntrySchema>;
export type MohoRetakeDataset = z.infer<typeof mohoRetakeDatasetSchema>;

export function assertMohoRetakeDatasetVersion(doc: unknown): asserts doc is MohoRetakeDataset {
  const parsed = mohoRetakeDatasetSchema.safeParse(doc);
  if (!parsed.success) {
    throw new Error(`Invalid MohoRetakeDataset: ${parsed.error.message}`);
  }
  if (parsed.data.schemaVersion !== MOHO_RETAKE_DATASET_SCHEMA_VERSION) {
    throw new Error(
      `MohoRetakeDataset schemaVersion mismatch: expected ${MOHO_RETAKE_DATASET_SCHEMA_VERSION}, got ${parsed.data.schemaVersion}`
    );
  }
}
