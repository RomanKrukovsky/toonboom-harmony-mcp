import { z } from 'zod';

export const inbetweenFrameSchema = z.object({
  frameNumber: z.number().int().min(1),
  rasterImagePath: z.string(),
  confidence: z.number().min(0).max(1)
});

export const inbetweenPirSchema = z.object({
  format: z.literal('InbetweenPIR'),
  version: z.literal('1.0.0'),
  sourceKeyframes: z.tuple([
    z.object({ frame: z.number().int(), path: z.string() }),
    z.object({ frame: z.number().int(), path: z.string() })
  ]),
  inbetweens: z.array(inbetweenFrameSchema)
});

export type InbetweenFrame = z.infer<typeof inbetweenFrameSchema>;
export type InbetweenPIR = z.infer<typeof inbetweenPirSchema>;
