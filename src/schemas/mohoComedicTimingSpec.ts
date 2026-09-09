import { z } from 'zod';

export const comedicModifierTypeSchema = z.enum([
  'comedic_hold',
  'eye_dart_anticipation',
  'delayed_blink',
  'anticipation_squash'
]);
export type ComedicModifierType = z.infer<typeof comedicModifierTypeSchema>;

export const comedicEventSchema = z.object({
  triggerFrame: z.number().int().min(1),
  type: comedicModifierTypeSchema,
  durationFrames: z.number().int().min(1).default(12),
  intensity: z.number().default(1.0)
});
export type ComedicEvent = z.infer<typeof comedicEventSchema>;

export const comedicTimingInputSchema = z.object({
  characterId: z.string().min(1),
  baseDurationFrames: z.number().int().min(1).default(72),
  events: z.array(comedicEventSchema).min(1)
});
export type ComedicTimingInput = z.infer<typeof comedicTimingInputSchema>;

export const retimedKeyframeSchema = z.object({
  frame: z.number().int().min(1),
  value: z.number(),
  isHold: z.boolean().default(false),
  tag: z.string().optional()
});
export type RetimedKeyframe = z.infer<typeof retimedKeyframeSchema>;

export const retimedTrackSchema = z.object({
  channel: z.string().min(1),
  keys: z.array(retimedKeyframeSchema)
});
export type RetimedTrack = z.infer<typeof retimedTrackSchema>;
