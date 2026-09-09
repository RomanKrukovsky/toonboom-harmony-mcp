import { z } from 'zod';
import { vector2DSchema } from './mohoWeightIsolationSpec.js';

export const limbJointTypeSchema = z.enum([
  'shoulder',
  'elbow',
  'wrist',
  'hip',
  'knee',
  'ankle'
]);
export type LimbJointType = z.infer<typeof limbJointTypeSchema>;

export const limbJointInputSchema = z.object({
  jointId: z.string().min(1),
  jointType: limbJointTypeSchema,
  pivot: vector2DSchema,
  direction: vector2DSchema, // direction vector along limb bone
  radiusPx: z.number().min(16).default(18),
  arcAngleDeg: z.number().min(90).max(360).default(180)
});
export type LimbJointInput = z.infer<typeof limbJointInputSchema>;

export const inpaintLimbRequestSchema = z.object({
  characterId: z.string().min(1),
  layerName: z.string().min(1),
  joints: z.array(limbJointInputSchema).min(1)
});
export type InpaintLimbRequest = z.infer<typeof inpaintLimbRequestSchema>;

export const inpaintedCapResultSchema = z.object({
  jointId: z.string().min(1),
  contourPoints: z.array(vector2DSchema),
  overlapPaddingPx: z.number().min(16),
  svgPath: z.string()
});
export type InpaintedCapResult = z.infer<typeof inpaintedCapResultSchema>;
