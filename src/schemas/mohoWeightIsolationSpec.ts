import { z } from 'zod';

export const vector2DSchema = z.object({
  x: z.number(),
  y: z.number()
});
export type Vector2D = z.infer<typeof vector2DSchema>;

export const boneCapsuleSchema = z.object({
  boneId: z.string().min(1),
  start: vector2DSchema,
  end: vector2DSchema,
  influenceRadius: z.number().positive()
});
export type BoneCapsule = z.infer<typeof boneCapsuleSchema>;

export const pointDefinitionSchema = z.object({
  pointId: z.number().int().nonnegative(),
  position: vector2DSchema,
  layerGroup: z.string().min(1)
});
export type PointDefinition = z.infer<typeof pointDefinitionSchema>;

export const isolationRuleSchema = z.object({
  layerGroup: z.string().min(1),
  allowedBones: z.array(z.string().min(1)).min(1)
});
export type IsolationRule = z.infer<typeof isolationRuleSchema>;

export const weightIsolationInputSchema = z.object({
  characterId: z.string().min(1),
  bones: z.array(boneCapsuleSchema).min(1),
  points: z.array(pointDefinitionSchema).min(1),
  isolationRules: z.array(isolationRuleSchema).default([])
});
export type WeightIsolationInput = z.infer<typeof weightIsolationInputSchema>;

export const pointWeightResultSchema = z.object({
  pointId: z.number().int().nonnegative(),
  weights: z.record(z.string(), z.number())
});
export type PointWeightResult = z.infer<typeof pointWeightResultSchema>;
