import { z } from 'zod';

export const MOHO_RETAKE_MANIFEST_SCHEMA_VERSION = '1.0';

export const mohoRetakePatchSchema = z.object({
  patchId: z.string(),
  targetRigType: z.enum(['humanoid_2leg', 'quadruped', 'creature', 'mechanical']),
  boneId: z.number().int().optional(),
  boneName: z.string().optional(),
  channel: z.enum(['rotation', 'translation', 'scale', 'opacity']),
  frame: z.number().int().min(1),
  newValue: z.number(),
  interpolation: z.enum(['linear', 'ease_in', 'ease_out', 'ease_in_out', 'step']).default('ease_in_out'),
  note: z.string().optional(),
  recordedBy: z.string(),
  recordedAt: z.string().datetime()
}).strict();

export const mohoRetakeManifestSchema = z.object({
  schemaVersion: z.literal('1.0'),
  retakeId: z.string(),
  sourcePerformanceId: z.string(),
  sourceMohoCommandPlanId: z.string(),
  rigType: z.enum(['humanoid_2leg', 'quadruped', 'creature', 'mechanical']),
  patches: z.array(mohoRetakePatchSchema).default([]),
  severity: z.enum(['low', 'medium', 'high']).default('low'),
  autoApplicable: z.boolean().default(false),
  provenance: z.object({
    recordedBy: z.string(),
    recordedAt: z.string().datetime(),
    approvedBy: z.string().optional(),
    approvedAt: z.string().datetime().optional()
  }).strict()
}).strict().refine(
  (m) => !(m.autoApplicable && m.severity === 'high'),
  { message: 'autoApplicable=true is forbidden when severity is high', path: ['autoApplicable'] }
);

export type MohoRetakePatch = z.infer<typeof mohoRetakePatchSchema>;
export type MohoRetakeManifest = z.infer<typeof mohoRetakeManifestSchema>;