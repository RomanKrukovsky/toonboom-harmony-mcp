import { z } from 'zod';

export const canonicalAngleSchema = z.enum(['0', '45', '90', '135', '180']);
export type CanonicalAngle = z.infer<typeof canonicalAngleSchema>;

export const layerDepthSpecSchema = z.object({
  layerName: z.string().min(1),
  amplitude: z.number().default(1.0),
  phaseOffsetDeg: z.number().default(0.0),
  baseZ: z.number().default(0.0)
});
export type LayerDepthSpec = z.infer<typeof layerDepthSpecSchema>;

export const edgeLoopPointSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  loopId: z.string(),
  isPerimeter: z.boolean().default(false)
});
export type EdgeLoopPoint = z.infer<typeof edgeLoopPointSchema>;

export const turnaround360ConfigSchema = z.object({
  characterId: z.string().min(1),
  angles: z.array(canonicalAngleSchema).min(3).default(['0', '45', '90', '135', '180']),
  layerDepths: z.array(layerDepthSpecSchema).min(1),
  contourLoops: z.array(edgeLoopPointSchema).optional(),
  masterController: z.object({
    xRange: z.tuple([z.number(), z.number()]).default([0, 360]),
    yRange: z.tuple([z.number(), z.number()]).default([-30, 30])
  }).default({
    xRange: [0, 360],
    yRange: [-30, 30]
  })
});
export type Turnaround360Config = z.infer<typeof turnaround360ConfigSchema>;
