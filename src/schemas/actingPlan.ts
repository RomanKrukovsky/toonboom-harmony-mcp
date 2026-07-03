import { z } from 'zod';
import { honestyOriginSchema } from './onePrompt.js';

/**
 * actingPlan.ts — the acting director's blocking plan per character per scene.
 *
 * This is NOT final animation. It is the acting planning layer that
 * downstream humans or Harmony apply_rough_acting consume (ACTOR §8).
 */

export const emotionalBeatSchema = z.object({
  frames: z.array(z.number()).length(2),
  emotion: z.string(),
  pose: z.string(),
  microActions: z.array(z.string()).default([]),
  dialogue: z.string().optional(),
  voiceLevel: z.enum(['whisper','normal','loud','shout','silent']).optional()
});

export const actingPlanSchema = z.object({
  character: z.string(),
  scene: z.string(),
  emotionalArc: z.array(emotionalBeatSchema),
  gesturePlan: z.array(z.object({
    frames: z.array(z.number()).length(2),
    gesture: z.string(),
    intensity: z.enum(['subtle','moderate','strong']).default('moderate')
  })).default([]),
  blinkPlan: z.array(z.object({
    frame: z.number(),
    type: z.enum(['single','double','triple','dart']).default('single')
  })).default([]),
  headMotionPlan: z.array(z.object({
    frames: z.array(z.number()).length(2),
    motion: z.string(),
    direction: z.enum(['left','right','up','down','tilt','none']).default('none')
  })).default([]),
  bodyLanguagePlan: z.array(z.object({
    frames: z.array(z.number()).length(2),
    description: z.string(),
    weight: z.enum(['left','right','center']).default('center')
  })).default([]),
  readabilityScore: z.number().min(0).max(100).optional(),
  appliedToHarmony: z.boolean().default(false),
  origin: honestyOriginSchema.default('planned')
});