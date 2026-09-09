import { z } from 'zod';
import { countryballEyeStateSchema, countryballMouthStateSchema } from './seriesBible.js';

export const irShotFramingSchema = z.enum([
  'extreme_wide',
  'wide',
  'medium',
  'close_up',
  'extreme_close_up',
  'reaction_shot'
]);
export type IRShotFraming = z.infer<typeof irShotFramingSchema>;

export const irCameraMoveSchema = z.enum([
  'static',
  'pan_left',
  'pan_right',
  'zoom_in',
  'zoom_out',
  'dutch_shake',
  'slow_push'
]);
export type IRCameraMove = z.infer<typeof irCameraMoveSchema>;

export const irActorPlacementSchema = z.object({
  actorId: z.string().min(1),
  x: z.number(),
  y: z.number(),
  scale: z.number().default(1.0),
  zOrder: z.number().int().default(0),
  facing: z.enum(['left', 'right']).default('right'),
  initialEyeState: countryballEyeStateSchema.default('normal'),
  initialMouthState: countryballMouthStateSchema.default('none')
});
export type IRActorPlacement = z.infer<typeof irActorPlacementSchema>;

export const irPhonemeCueSchema = z.object({
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(),
  phoneme: countryballMouthStateSchema
});
export type IRPhonemeCue = z.infer<typeof irPhonemeCueSchema>;

export const irSpeechEventSchema = z.object({
  text: z.string(),
  audioRef: z.string().optional(),
  emotion: z.string().default('neutral'),
  intensity: z.number().min(0).max(1).default(0.7),
  pace: z.number().default(1.0),
  pauseBeforeFrames: z.number().int().default(0),
  pauseAfterFrames: z.number().int().default(12),
  phonemes: z.array(irPhonemeCueSchema).default([]).optional()
});
export type IRSpeechEvent = z.infer<typeof irSpeechEventSchema>;

export const irActionEventSchema = z.object({
  type: z.string().min(1).describe('Semantic action identifier from the Action Vocabulary'),
  durationFrames: z.number().int().positive().default(14),
  targetActor: z.string().optional(),
  targetCoordinates: z.object({ x: z.number(), y: z.number() }).optional(),
  eyeState: countryballEyeStateSchema.optional(),
  intensity: z.number().min(0).max(2).default(1.0),
  params: z.record(z.any()).default({}).optional()
});
export type IRActionEvent = z.infer<typeof irActionEventSchema>;

export const irTimelineEventSchema = z.object({
  frame: z.number().int().nonnegative().describe('0-based frame within the shot'),
  actor: z.string().min(1),
  action: irActionEventSchema.optional(),
  speech: irSpeechEventSchema.optional(),
  hold: z.object({
    durationFrames: z.number().int().positive(),
    reason: z.string().optional()
  }).optional(),
  sfx: z.object({
    sfxId: z.string(),
    volume: z.number().min(0).max(1).default(0.8)
  }).optional()
});
export type IRTimelineEvent = z.infer<typeof irTimelineEventSchema>;

export const irShotSchema = z.object({
  shotId: z.string().min(1),
  framing: irShotFramingSchema.default('medium'),
  cameraMove: irCameraMoveSchema.default('static'),
  durationFrames: z.number().int().positive(),
  focusActor: z.string().optional(),
  actorsOnStage: z.array(irActorPlacementSchema).min(1),
  events: z.array(irTimelineEventSchema).default([]),
  directorNotes: z.string().optional()
});
export type IRShot = z.infer<typeof irShotSchema>;

export const irSceneSchema = z.object({
  sceneId: z.string().min(1),
  locationId: z.string().min(1),
  backgroundPreset: z.string().default('bg_default'),
  shots: z.array(irShotSchema).min(1),
  ambientTrack: z.string().optional()
});
export type IRScene = z.infer<typeof irSceneSchema>;

export const episodeIRSchema = z.object({
  episodeId: z.string().min(1),
  title: z.string().min(1),
  fps: z.number().int().positive().default(24),
  canvas: z.object({
    width: z.number().int().positive().default(1920),
    height: z.number().int().positive().default(1080)
  }),
  totalDurationFrames: z.number().int().positive(),
  characters: z.array(z.string()).min(1),
  scenes: z.array(irSceneSchema).min(1),
  metadata: z.object({
    tone: z.string().default('absurd_comedy'),
    targetAudience: z.string().default('general'),
    jokesPerMinute: z.number().default(4.0),
    visualGagCount: z.number().default(0),
    generatedAt: z.string().default(() => new Date().toISOString())
  })
});
export type EpisodeIR = z.infer<typeof episodeIRSchema>;
