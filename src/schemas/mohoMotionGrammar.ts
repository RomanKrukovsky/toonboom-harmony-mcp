import { z } from 'zod';

export const MOHO_MOTION_GRAMMAR_SCHEMA_VERSION = '1.0';

export const mohoMotionGrammarRuleSchema = z.object({
  ruleId: z.string().min(1),
  description: z.string().min(1),
  allowedGestures: z.array(z.string()).default([]),
  forbiddenGestures: z.array(z.string()).default([]),
  allowedEmotions: z.array(z.string()).default([]),
  poseLibraryRefs: z.array(z.string()).default([]),
  timing: z.object({
    minHoldFrames: z.number().int().positive().default(2),
    maxHoldFrames: z.number().int().positive().default(48),
    anticipationFrames: z.number().int().min(0).default(4),
    followThroughFrames: z.number().int().min(0).default(6)
  }).default({}),
  boneConstraints: z.array(z.object({
    boneName: z.string(),
    minAngleDeg: z.number().int(),
    maxAngleDeg: z.number().int()
  })).default([]),
  physicsChannels: z.array(z.enum(['spring', 'damping', 'mass', 'gravity'])).default([])
}).strict();

export const mohoMotionGrammarSchema = z.object({
  schemaVersion: z.literal('1.0'),
  grammarId: z.string().min(1),
  rules: z.array(mohoMotionGrammarRuleSchema).min(1),
  defaultTiming: z.object({
    fps: z.number().int().positive().default(24),
    minBeatFrames: z.number().int().positive().default(2),
    maxBeatFrames: z.number().int().positive().default(96)
  }).default({}),
  defaultEasing: z.enum(['linear', 'ease_in', 'ease_out', 'ease_in_out', 'custom']).default('ease_in_out'),
  provenance: z.object({
    approver: z.string().min(1),
    approvedAt: z.string().datetime()
  })
}).strict();

export type MohoMotionGrammarRule = z.infer<typeof mohoMotionGrammarRuleSchema>;
export type MohoMotionGrammar = z.infer<typeof mohoMotionGrammarSchema>;

export function assertMohoMotionGrammarVersion(doc: unknown): asserts doc is MohoMotionGrammar {
  const parsed = mohoMotionGrammarSchema.safeParse(doc);
  if (!parsed.success) {
    throw new Error(`Invalid mohoMotionGrammar: ${parsed.error.message}`);
  }
  if (parsed.data.schemaVersion !== MOHO_MOTION_GRAMMAR_SCHEMA_VERSION) {
    throw new Error(
      `mohoMotionGrammar schemaVersion ${parsed.data.schemaVersion} !== ${MOHO_MOTION_GRAMMAR_SCHEMA_VERSION}`
    );
  }
}