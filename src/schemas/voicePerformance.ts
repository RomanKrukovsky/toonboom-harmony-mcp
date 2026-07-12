import { z } from 'zod';
import { sceneUnderstandingSchema } from './sceneIntelligence.js';

export const VOICE_PERFORMANCE_SCHEMA_VERSION = '1.0';

const timedTokenSchema = z.object({
  text: z.string().min(1),
  startTime: z.number().nonnegative(),
  endTime: z.number().positive(),
  confidence: z.number().min(0).max(1)
}).strict();

export const voiceAnalysisSchema = z.object({
  schemaVersion: z.literal(VOICE_PERFORMANCE_SCHEMA_VERSION),
  audioPath: z.string().nullable(),
  audioAvailable: z.boolean(),
  durationSeconds: z.number().positive(),
  sampleRate: z.number().int().positive().nullable(),
  transcript: z.string(),
  words: z.array(timedTokenSchema),
  phonemes: z.array(timedTokenSchema.extend({ word: z.string() }).strict()),
  stresses: z.array(z.object({ wordIndex: z.number().int().nonnegative(), time: z.number().nonnegative(), strength: z.number().min(0).max(1) }).strict()),
  pauses: z.array(z.object({ startTime: z.number().nonnegative(), endTime: z.number().positive(), duration: z.number().positive(), kind: z.enum(['breath', 'hesitation', 'turn_gap', 'silence']) }).strict()),
  loudness: z.array(z.object({ time: z.number().nonnegative(), rms: z.number().min(0).max(1) }).strict()),
  pitchContour: z.array(z.object({ time: z.number().nonnegative(), hz: z.number().nonnegative(), confidence: z.number().min(0).max(1) }).strict()),
  speechRateWpm: z.number().nonnegative(),
  breathPoints: z.array(z.number().nonnegative()),
  emotionalPeaks: z.array(z.object({ time: z.number().nonnegative(), strength: z.number().min(0).max(1), label: z.enum(['energy_peak', 'pitch_peak', 'text_emphasis']), confidence: z.number().min(0).max(1), alternatives: z.array(z.string()) }).strict()),
  turnTaking: z.array(z.object({ speaker: z.string(), startTime: z.number().nonnegative(), endTime: z.number().positive() }).strict()),
  interruptions: z.array(z.object({ atTime: z.number().nonnegative(), speaker: z.string(), interruptedSpeaker: z.string() }).strict()),
  reactionWindows: z.array(z.object({ startTime: z.number().nonnegative(), endTime: z.number().positive(), trigger: z.string() }).strict()),
  assumptions: z.array(z.string()),
  provenance: z.object({ engine: z.literal('cpu VoicePerformanceAnalyzer v1'), alignment: z.enum(['energy_guided', 'duration_proportional', 'transcript_only']), emotionIsProxy: z.literal(true), createdAt: z.string().datetime() }).strict()
}).strict();

export const performanceStyleSchema = z.enum(['restrained', 'energetic', 'sarcastic', 'anxious', 'aggressive', 'comedic', 'custom']);
export const performanceEventKindSchema = z.enum(['pose', 'gesture', 'gaze', 'blink', 'breath', 'weight_shift', 'facial_expression', 'reaction', 'head_accent', 'body_accent', 'hold']);

export const performanceEventSchema = z.object({
  eventId: z.string().min(1),
  kind: performanceEventKindSchema,
  startTime: z.number().nonnegative(),
  endTime: z.number().positive(),
  intensity: z.number().min(0).max(1),
  target: z.string().nullable(),
  bodyPart: z.string(),
  relatedBeatId: z.string().nullable(),
  description: z.string().min(1),
  confidence: z.number().min(0).max(1),
  provenance: z.enum(['voice_energy', 'voice_pitch', 'text_rule', 'scene_beat', 'style_rule', 'human_hint']),
  alternatives: z.array(z.string())
}).strict();

export const performancePlanSchema = z.object({
  schemaVersion: z.literal(VOICE_PERFORMANCE_SCHEMA_VERSION),
  planId: z.string().min(8),
  sceneId: z.string(),
  characterId: z.string(),
  style: performanceStyleSchema,
  styleDescription: z.string(),
  events: z.array(performanceEventSchema).min(1),
  eventCount: z.number().int().positive(),
  confidence: z.number().min(0).max(1),
  assumptions: z.array(z.string()),
  provenance: z.object({ engine: z.literal('rule_based PerformanceGenerator v1'), createdAt: z.string().datetime() }).strict()
}).strict().superRefine((plan, ctx) => {
  if (plan.eventCount !== plan.events.length) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'eventCount does not match events.length' });
  for (const event of plan.events) if (event.endTime <= event.startTime) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${event.eventId} has invalid duration` });
});

export const performanceVariantSetSchema = z.object({
  schemaVersion: z.literal(VOICE_PERFORMANCE_SCHEMA_VERSION),
  sceneId: z.string(),
  characterId: z.string(),
  variants: z.array(performancePlanSchema).min(1),
  voiceAnalysis: voiceAnalysisSchema,
  sourceScene: sceneUnderstandingSchema,
  notes: z.string()
}).strict();

export type VoiceAnalysis = z.infer<typeof voiceAnalysisSchema>;
export type PerformancePlan = z.infer<typeof performancePlanSchema>;
export type PerformanceEvent = z.infer<typeof performanceEventSchema>;
export type PerformanceStyle = z.infer<typeof performanceStyleSchema>;
export type PerformanceVariantSet = z.infer<typeof performanceVariantSetSchema>;
