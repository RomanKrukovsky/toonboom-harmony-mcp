import { z } from 'zod';

export const MOHO_PERFORMANCE_PIR_SCHEMA_VERSION = '1.0';

export const mohoBoneKeySchema = z.object({
  boneId: z.number().int().min(0),
  boneName: z.string(),
  channel: z.enum(['rotation', 'translation', 'scale', 'opacity']),
  frame: z.number().int().min(1),
  value: z.number(),
  interpolation: z.enum(['linear', 'ease_in', 'ease_out', 'ease_in_out', 'step']).default('ease_in_out')
}).strict();

export const mohoSwitchKeySchema = z.object({
  switchLayerName: z.string(),
  frame: z.number().int().min(1),
  choice: z.string(),
  interpolation: z.literal('step')
}).strict();

export const mohoSmartBoneActionKeySchema = z.object({
  actionName: z.string(),
  targetBone: z.string(),
  frame: z.number().int().min(1),
  angleDeg: z.number(),
  scaleX: z.number().positive().default(1),
  scaleY: z.number().positive().default(1)
}).strict();

export const mohoPerformancePirSchema = z.object({
  schemaVersion: z.literal('1.0'),
  performanceId: z.string(),
  rigType: z.enum(['humanoid_2leg', 'quadruped', 'creature', 'mechanical']),
  shotManifestRef: z.string(),
  mohoShowBibleRef: z.string(),
  boneKeys: z.array(mohoBoneKeySchema).default([]),
  switchKeys: z.array(mohoSwitchKeySchema).default([]),
  smartBoneActions: z.array(mohoSmartBoneActionKeySchema).default([]),
  cameraKeys: z.array(z.object({
    frame: z.number().int().min(1),
    x: z.number().optional(),
    y: z.number().optional(),
    zoom: z.number().positive().optional(),
    rotation: z.number().optional()
  }).strict()).default([]),
  fxKeys: z.array(z.object({
    type: z.string(),
    target: z.string(),
    frame: z.number().int().min(1),
    value: z.number()
  }).strict()).default([]),
  deterministicFingerprint: z.string().describe('SHA-256 of canonicalised JSON'),
  provenance: z.object({
    compiledAt: z.string().datetime(),
    compilerVersion: z.string()
  }).strict()
}).strict();

export type MohoBoneKey = z.infer<typeof mohoBoneKeySchema>;
export type MohoSwitchKey = z.infer<typeof mohoSwitchKeySchema>;
export type MohoSmartBoneActionKey = z.infer<typeof mohoSmartBoneActionKeySchema>;
export type MohoPerformancePir = z.infer<typeof mohoPerformancePirSchema>;