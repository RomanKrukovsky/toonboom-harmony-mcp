import { z } from 'zod';

/**
 * sceneIntelligence.ts — Scene Understanding Engine + AI Director schemas.
 *
 * Iteration 1 of AI Animation Studio (Master Prompt §1 and §2).
 * Provides a strict, Zod-validated contract between:
 *   - SceneUnderstandingEngine (rule-based scene understanding)
 *   - ScriptDirector (shot decomposition + camera + blocking + variants)
 *   - downstream tools (key poses, performance, motion, critic)
 *
 * Rule-based baseline is the only required path. An optional LLM adapter
 * may refine beats/intents later but must NOT be a hard dependency.
 */

export const SCENE_INTELLIGENCE_SCHEMA_VERSION = '1.0';

// ─────────────────────────────────────────────────────────────────────────────
// Uncertainty & Assumptions (Honest limitations — Master Prompt §"Окружение без Harmony")
// ─────────────────────────────────────────────────────────────────────────────

export const uncertaintySchema = z.object({
  level: z.enum(['low', 'medium', 'high', 'critical']).describe(
    'Низкий = вывод механически выведен из письменных маркеров в сценарии. ' +
    'Высокий = требуется ручная проверка, итог является гипотезой.'
  ),
  reason: z.string().min(1).describe('Краткое объяснение источника неопределённости.'),
  needsHumanReview: z.boolean().default(false)
}).strict();

export const assumptionSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()).default([]),
  falsifiable: z.boolean().default(true)
}).strict();

// ─────────────────────────────────────────────────────────────────────────────
// Character Intent (one per character per scene)
// ─────────────────────────────────────────────────────────────────────────────

export const characterIntentSchema = z.object({
  characterId: z.string().min(1),
  name: z.string().min(1),
  role: z.enum(['protagonist', 'antagonist', 'supporting', 'background', 'unknown']).default('unknown'),
  goalInScene: z.string().describe('Чего персонаж хочет в терминах действия, не эмоции.'),
  emotionalArc: z.string().describe('Краткая эмоциональная дуга (напр. calm → tense → rage).'),
  stance: z.enum(['standing', 'sitting', 'lying', 'moving', 'unknown']).default('unknown'),
  hasDialogue: z.boolean(),
  speaksFirst: z.boolean().default(false),
  receivesReaction: z.boolean().default(false),
  visibleOnScreen: z.boolean().default(true)
}).strict();

// ─────────────────────────────────────────────────────────────────────────────
// Dramatic Beats — atomic units of scene structure
// ─────────────────────────────────────────────────────────────────────────────

export const beatKindSchema = z.enum([
  'setup', 'rising_action', 'turn', 'revelation', 'confrontation',
  'pause', 'reaction', 'resolution', 'tag', 'unknown'
]);

export const dramaticBeatSchema = z.object({
  beatId: z.string().min(1).regex(/^beat_\d+$/),
  startTime: z.number().min(0),
  endTime: z.number().min(0),
  primaryCharacter: z.string().min(1),
  intent: z.string().min(1).describe(
    'Глагол драматического намерения (accuse, reveal, hide, seduce, threaten, plead…). ' +
    'Всегда активный, всегда с точки зрения персонажа, не зрительской позиции.'
  ),
  emotion: z.string().min(1),
  action: z.string().min(1).describe('Физическое действие или отсутствие (hold, breathe, look away).'),
  reactionTarget: z.string().optional().nullable().describe('ID персонажа-адресата реакции, если есть.'),
  importance: z.number().min(0).max(1).describe(
    'Драматический вес: 1.0 = поворотный момент сцены, 0.1 = проходная пауза.'
  ),
  suggestedPauseBefore: z.number().min(0).default(0).describe('Рекомендованная пауза в секундах перед битом.'),
  beatKind: beatKindSchema.default('unknown'),
  supportsStoryArc: z.boolean().default(true),
  confidence: z.number().min(0).max(1).default(0.6),
  assumptionIds: z.array(z.string()).default([])
}).strict();

// ─────────────────────────────────────────────────────────────────────────────
// Action / Reaction Beats (deduced from dialogue attribution)
// ─────────────────────────────────────────────────────────────────────────────

export const actionBeatSchema = z.object({
  beatId: z.string().min(1),
  speaker: z.string().min(1),
  actionVerb: z.string().min(1),
  durationSec: z.number().positive(),
  energy: z.enum(['low', 'medium', 'high', 'spike']).default('medium'),
  confidence: z.number().min(0).max(1).default(0.5)
}).strict();

export const reactionBeatSchema = z.object({
  beatId: z.string().min(1),
  reactor: z.string().min(1),
  triggerBeatId: z.string().min(1),
  reactionType: z.enum(['silent_listen', 'micro', 'vocal', 'physical', 'turn_away', 'double_take']).default('silent_listen'),
  confidence: z.number().min(0).max(1).default(0.4)
}).strict();

// ─────────────────────────────────────────────────────────────────────────────
// Emotion Curve (sparse samples per character)
// ─────────────────────────────────────────────────────────────────────────────

export const emotionCurveSampleSchema = z.object({
  time: z.number().min(0),
  characterId: z.string().min(1),
  valence: z.number().min(-1).max(1).describe('-1 = негатив, +1 = позитив.'),
  arousal: z.number().min(-1).max(1).describe('-1 = пассивность, +1 = возбуждение.'),
  label: z.string().min(1).describe('Словесная метка эмоции (anger, fear, joy…).'),
  confidence: z.number().min(0).max(1).default(0.5),
  sourceBeatId: z.string().optional().nullable()
}).strict();

export const emotionCurveSchema = z.array(emotionCurveSampleSchema).min(0);

// ─────────────────────────────────────────────────────────────────────────────
// Attention Target — who/what the audience should focus on at each moment
// ─────────────────────────────────────────────────────────────────────────────

export const attentionTargetSchema = z.object({
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().nonnegative(),
  focusCharacterId: z.string().min(1),
  focusType: z.enum(['speaker', 'reactor', 'object', 'environment', 'shared']).default('speaker'),
  reason: z.string().min(1),
  confidence: z.number().min(0).max(1).default(0.6)
}).strict();

// ─────────────────────────────────────────────────────────────────────────────
// Continuity Constraint (screen direction, blocking, eyeline)
// ─────────────────────────────────────────────────────────────────────────────

export const continuityConstraintSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['screen_direction', 'eyeline', 'screen_position', 'costume', 'prop', 'lighting']),
  description: z.string().min(1),
  locked: z.boolean().default(false).describe('Заблокировано художником — нарушение критично.')
}).strict();

// ─────────────────────────────────────────────────────────────────────────────
// Scene Understanding Result (Composite)
// ─────────────────────────────────────────────────────────────────────────────

export const sceneUnderstandingSchema = z.object({
  schemaVersion: z.literal(SCENE_INTELLIGENCE_SCHEMA_VERSION),
  sceneId: z.string().min(1),
  sceneName: z.string().min(1),
  sourceScript: z.string(),
  totalDurationSeconds: z.number().positive(),
  fps: z.number().positive().default(24),
  startFrame: z.number().int().nonnegative().default(1),
  endFrame: z.number().int().positive(),
  sceneIntent: z.string().min(1).describe('Драматическая задача всей сцены (одна фраза).'),
  sceneIntentConfidence: z.number().min(0).max(1).default(0.6),
  characters: z.array(characterIntentSchema).min(1),
  beats: z.array(dramaticBeatSchema).min(1),
  actionBeats: z.array(actionBeatSchema).default([]),
  reactionBeats: z.array(reactionBeatSchema).default([]),
  emotionCurve: emotionCurveSchema.default([]),
  attentionTargets: z.array(attentionTargetSchema).default([]),
  continuity: z.array(continuityConstraintSchema).default([]),
  assumptions: z.array(assumptionSchema).default([]),
  uncertainties: z.array(uncertaintySchema).default([]),
  provenance: z.object({
    engine: z.literal('rule_based SceneUnderstandingEngine v1'),
    createdAt: z.string().datetime(),
    notes: z.string().default('Rule-based baseline. LLM optional adapter not used.')
  }).strict()
}).strict().superRefine((s, ctx) => {
  for (const b of s.beats) {
    if (b.endTime <= b.startTime) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Beat ${b.beatId} has non-positive duration` });
    }
  }
  const charIds = new Set(s.characters.map((c) => c.characterId));
  for (const b of s.beats) {
    if (!charIds.has(b.primaryCharacter)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Beat ${b.beatId} references unknown primaryCharacter "${b.primaryCharacter}"` });
    }
    if (b.reactionTarget && !charIds.has(b.reactionTarget)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Beat ${b.beatId} references unknown reactionTarget "${b.reactionTarget}"` });
    }
  }
  for (const ab of s.actionBeats) {
    if (!charIds.has(ab.speaker)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `ActionBeat ${ab.beatId} references unknown speaker "${ab.speaker}"` });
    }
  }
  for (const rb of s.reactionBeats) {
    if (!charIds.has(rb.reactor)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `ReactionBeat ${rb.beatId} references unknown reactor "${rb.reactor}"` });
    }
  }
});

export type SceneUnderstanding = z.infer<typeof sceneUnderstandingSchema>;
export type DramaticBeat = z.infer<typeof dramaticBeatSchema>;
export type CharacterIntent = z.infer<typeof characterIntentSchema>;
export type AttentionTarget = z.infer<typeof attentionTargetSchema>;
export type Uncertainty = z.infer<typeof uncertaintySchema>;
export type Assumption = z.infer<typeof assumptionSchema>;
export type EmotionCurveSample = z.infer<typeof emotionCurveSampleSchema>;
export type ActionBeat = z.infer<typeof actionBeatSchema>;
export type ReactionBeat = z.infer<typeof reactionBeatSchema>;
export type ContinuityConstraint = z.infer<typeof continuityConstraintSchema>;
export type EmotionCurve = z.infer<typeof emotionCurveSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// DIRECTOR PLAN (ScriptDirector output — Master Prompt §2)
// ─────────────────────────────────────────────────────────────────────────────

export const shotFramingSchema = z.enum([
  'extreme_wide', 'wide', 'medium_wide', 'medium', 'medium_close',
  'close_up', 'extreme_close_up', 'OTS', 'POV', 'two_shot', 'insert'
]);

export const cameraMoveSchema = z.enum([
  'static', 'pan_left', 'pan_right', 'tilt_up', 'tilt_down',
  'zoom_in', 'zoom_out', 'dolly_in', 'dolly_out', 'truck_left',
  'truck_right', 'pedestal_up', 'pedestal_down', 'arc', 'handheld',
  'crane', 'rack_focus'
]);

export const shotPlanSchema = z.object({
  shotId: z.string().min(1).regex(/^shot_\d+$/),
  shotIndex: z.number().int().nonnegative(),
  beatId: z.string().optional().nullable().describe('Привязка к конкретному dramaticBeat из scene understanding.'),
  framing: shotFramingSchema,
  cameraMove: cameraMoveSchema,
  durationFrames: z.number().int().positive(),
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(),
  charactersInFrame: z.array(z.string().min(1)),
  primaryFocusCharacterId: z.string().min(1),
  staging: z.enum(['left', 'center', 'right', 'left_right', 'center_foreground', 'right_background', 'symmetric']).default('center'),
  dialogue: z.boolean().default(false),
  eyeline: z.string().optional().nullable().describe('Куда направлен взгляд: left/right/offscreen/objectId.'),
  description: z.string().min(1),
  rationale: z.string().min(1).describe('Почему именно этот кадр (одна фраза).'),
  confidence: z.number().min(0).max(1).default(0.6)
}).strict();

export const blockingPlanSchema = z.object({
  characterId: z.string().min(1),
  startPosition: z.enum(['left', 'center_left', 'center', 'center_right', 'right', 'offscreen_left', 'offscreen_right']).default('center'),
  endPosition: z.enum(['left', 'center_left', 'center', 'center_right', 'right', 'offscreen_left', 'offscreen_right']).default('center'),
  movement: z.enum(['none', 'enter', 'exit', 'cross', 'turn', 'sit', 'stand', 'approach', 'retreat']).default('none'),
  notes: z.string().default('')
}).strict();

export const cameraPlanSchema = z.object({
  shotCount: z.number().int().positive(),
  dominantFraming: shotFramingSchema,
  dominantCameraMove: cameraMoveSchema,
  hasCameraMotion: z.boolean().default(false),
  pushInBeatIds: z.array(z.string()).default([]),
  reactionShotIds: z.array(z.string()).default([])
}).strict();

export const attentionPlanSchema = z.object({
  shotId: z.string().min(1),
  focusCharacterId: z.string().min(1),
  focusType: z.enum(['speaker', 'reactor', 'object', 'environment', 'shared']).default('speaker'),
  reason: z.string().min(1)
}).strict();

export const editDecisionSchema = z.object({
  cutFrame: z.number().int().nonnegative(),
  fromShotId: z.string().min(1),
  toShotId: z.string().min(1),
  cutType: z.enum(['hard', 'soft', 'match_action', 'match_on_look', 'L_cut', 'J_cut', 'smash']).default('hard'),
  rationale: z.string().min(1)
}).strict();

export const directorStrategySchema = z.enum([
  'restrained_dialogue',
  'commercial_dynamic',
  'dramatic_closeup',
  'comedic_timing',
  'anime_limited',
  'theatrical_staging',
  'single_take',
  'custom'
]);

export const directorPlanSchema = z.object({
  schemaVersion: z.literal(SCENE_INTELLIGENCE_SCHEMA_VERSION),
  planId: z.string().min(8),
  sceneId: z.string().min(1),
  strategy: directorStrategySchema,
  strategyDescription: z.string().min(1).describe('Человеко-читаемое объяснение режиссёрской стратегии.'),
  shots: z.array(shotPlanSchema).min(1),
  camera: cameraPlanSchema,
  blocking: z.array(blockingPlanSchema).default([]),
  attention: z.array(attentionPlanSchema).default([]),
  editDecisions: z.array(editDecisionSchema).default([]),
  pauses: z.array(z.object({
    beatId: z.string().min(1),
    durationFrames: z.number().int().positive(),
    rationale: z.string().min(1)
  }).strict()).default([]),
  dramaticEmphasisBeatIds: z.array(z.string()).default([]).describe('Биты с явным усилением (close-up, slow push, surprise cut).'),
  reactionShotCount: z.number().int().nonnegative().default(0),
  shotCount: z.number().int().positive(),
  totalDurationFrames: z.number().int().positive(),
  confidence: z.number().min(0).max(1).default(0.5),
  rationale: z.string().min(1).describe('Объяснение всего плана в одной фразе.'),
  provenance: z.object({
    engine: z.literal('rule_based ScriptDirector v1'),
    createdAt: z.string().datetime()
  }).strict()
}).strict().superRefine((p, ctx) => {
  const charIds = new Set(p.blocking.map((b) => b.characterId));
  for (const s of p.shots) {
    for (const c of s.charactersInFrame) {
      if (charIds.size > 0 && !charIds.has(c)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Shot ${s.shotId} references unblocked character "${c}"` });
      }
    }
  }
});

export type DirectorPlan = z.infer<typeof directorPlanSchema>;
export type ShotPlan = z.infer<typeof shotPlanSchema>;
export type CameraPlan = z.infer<typeof cameraPlanSchema>;
export type BlockingPlan = z.infer<typeof blockingPlanSchema>;
export type AttentionPlan = z.infer<typeof attentionPlanSchema>;
export type EditDecision = z.infer<typeof editDecisionSchema>;
export type DirectorStrategy = z.infer<typeof directorStrategySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Variant Set — multiple director plans for the same scene
// ─────────────────────────────────────────────────────────────────────────────

export const directorVariantSetSchema = z.object({
  schemaVersion: z.literal(SCENE_INTELLIGENCE_SCHEMA_VERSION),
  sceneId: z.string().min(1),
  strategyCount: z.number().int().positive(),
  variants: z.array(directorPlanSchema).min(1),
  notes: z.string().default('Each variant uses a distinct strategy; the choice is downstream of the Animation Critic.')
}).strict();

export type DirectorVariantSet = z.infer<typeof directorVariantSetSchema>;