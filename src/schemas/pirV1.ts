import { z } from 'zod';

export const pirInputContractSchema = z.object({
  characterId: z.string(),
  characterName: z.string(),
  topology: z.enum([
    'humanoid_standard',
    'humanoid_short',
    'quadruped_simple',
    'blob_custom'
  ]),
  turnaroundApproved: z.boolean(),
  mouthChartVersion: z.string()
});

export const pirActingPrimitiveSchema = z.object({
  type: z.enum(['anticipation', 'recoil', 'comedic_hold']),
  startFrame: z.number().int().min(1),
  endFrame: z.number().int().min(1),
  intensity: z.number().min(0).max(1),
  targetJoints: z.array(z.string()).optional()
});

export const pirValidationRulesSchema = z.object({
  maxOvershootClippingDegrees: z.number().default(5.0),
  maxFootSlidePixels: z.number().default(2.0),
  allowDeformerClipping: z.boolean().default(false),
  requireAutopatchIntegrity: z.boolean().default(true)
});

export const pirV1Schema = z.object({
  version: z.literal('1.0'),
  shotId: z.string(),
  durationFrames: z.number().int().positive(),
  fps: z.number().int().positive().default(24),
  productionProfile: z.string().default('limited_tv_2d_cutout_v1'),
  inputContract: pirInputContractSchema,
  actingPrimitives: z.array(pirActingPrimitiveSchema),
  validationRules: pirValidationRulesSchema
});

export type PIRv1 = z.infer<typeof pirV1Schema>;
export type PIRActingPrimitive = z.infer<typeof pirActingPrimitiveSchema>;

export const pirPatchSchema = z.object({
  patchId: z.string(),
  targetShotId: z.string(),
  defectReason: z.string(),
  primitiveModifications: z.array(z.object({
    primitiveIndex: z.number().int().nonnegative(),
    updatedIntensity: z.number().min(0).max(1).optional(),
    updatedStartFrame: z.number().int().positive().optional(),
    updatedEndFrame: z.number().int().positive().optional()
  })),
  updatedValidationRules: pirValidationRulesSchema.partial().optional()
});

export type PIRPatch = z.infer<typeof pirPatchSchema>;
