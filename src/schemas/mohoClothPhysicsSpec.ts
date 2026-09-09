import { z } from 'zod';
import { vector2DSchema } from './mohoWeightIsolationSpec.js';

export const clothBoneNodeSchema = z.object({
  boneId: z.string().min(1),
  lengthPx: z.number().positive(),
  baseAngleDeg: z.number().default(0)
});
export type ClothBoneNode = z.infer<typeof clothBoneNodeSchema>;

export const clothChainSchema = z.object({
  chainId: z.string().min(1),
  rootBone: z.string().min(1),
  nodes: z.array(clothBoneNodeSchema).min(1)
});
export type ClothChain = z.infer<typeof clothChainSchema>;

export const barrierPlaneSchema = z.object({
  origin: vector2DSchema,
  normal: vector2DSchema // Normal pointing towards allowed free space
});
export type BarrierPlane = z.infer<typeof barrierPlaneSchema>;

export const clothPhysicsInputSchema = z.object({
  characterId: z.string().min(1),
  chains: z.array(clothChainSchema).min(1),
  totalFrames: z.number().int().min(1).default(24),
  waveFrequency: z.number().positive().default(0.2),
  waveAmplitudeDeg: z.number().min(0).default(18),
  dampingFactor: z.number().min(0).max(1).default(0.12),
  windVector: vector2DSchema.default({ x: 4, y: 0 }),
  barrierPlane: barrierPlaneSchema.optional()
});
export type ClothPhysicsInput = z.infer<typeof clothPhysicsInputSchema>;

export const clothKeyframeChannelSchema = z.object({
  boneId: z.string().min(1),
  keys: z.array(z.object({
    frame: z.number().int().min(1),
    angleDeg: z.number()
  }))
});
export type ClothKeyframeChannel = z.infer<typeof clothKeyframeChannelSchema>;
