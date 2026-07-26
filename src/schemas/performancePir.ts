import { z } from 'zod';

export const transformTrackSchema = z.object({
  nodeId: z.string(), // The stable node ID in the RigTemplate (e.g. NODE_LEFT_ARM_PEG)
  keys: z.array(z.object({
    frame: z.number().int().min(1),
    // All coordinates are expected to be normalized to the RigTemplate's coordinate space
    rotation: z.number().optional(), // in degrees
    x: z.number().optional(),
    y: z.number().optional(),
    scaleX: z.number().optional(),
    scaleY: z.number().optional(),
    interpolation: z.enum(['LINEAR', 'CONSTANT', 'BEZIER']).default('LINEAR')
  }))
});

export const performancePirSchema = z.object({
  schema: z.literal('toon-boom-mcp/performance-pir-v1'),
  performanceId: z.string(),
  characterId: z.string(),
  durationFrames: z.number().int().positive(),
  fps: z.number().int().positive().default(24),
  tracks: z.array(transformTrackSchema),
  holds: z.array(z.object({
    startFrame: z.number().int().min(1),
    endFrame: z.number().int().min(1)
  })).optional().default([])
});

export type PerformancePIR = z.infer<typeof performancePirSchema>;
export type TransformTrack = z.infer<typeof transformTrackSchema>;
