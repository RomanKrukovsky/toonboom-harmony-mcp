import { z } from 'zod';
import { honestyOriginSchema } from './onePrompt.js';

/**
 * characterSpec.ts — the full spec for one character.
 *
 * Drives the Character Designer, the Rig360 Synthesizer, and the Asset
 * Generator. Even without any image backend, this spec is itself the
 * deliverable ("asset brief for external generation") per ACTOR §6/§14.
 */

const HUMAN_MOUTH_SHAPES = ['A','E','I','O','U','M','F','L','S','rest'];
const HUMAN_VIEWS_360 = [
  'front','front_3q_left','side_left','back_3q_left','back',
  'back_3q_right','side_right','front_3q_right'
];

export const characterSpecSchema = z.object({
  name: z.string(),
  role: z.string(),
  personality: z.string(),
  visualStyle: z.string(),
  bodyType: z.string(),
  colorPalette: z.array(z.string()).optional(),
  requiredViews: z.array(z.string()).default(HUMAN_VIEWS_360),
  requiredExpressions: z.array(z.string()).default([
    'neutral','happy','angry','fear','surprised','smirk','panic','thinking'
  ]),
  requiredMouthShapes: z.array(z.string()).default(HUMAN_MOUTH_SHAPES),
  requiredHandPoses: z.array(z.string()).default([
    'open','fist','point','hold_object','gesture_up','gesture_down'
  ]),
  layerPlan: z.object({
    head: z.array(z.string()).default(['skull','eyes','brows','nose','mouth','ears','hair']),
    body: z.array(z.string()).default(['torso','neck','left_arm','right_arm','left_hand','right_hand','legs'])
  }).default({ head: ['skull','eyes','brows','nose','mouth','ears','hair'], body: ['torso','neck','left_arm','right_arm','left_hand','right_hand','legs'] }),
  designPrompts: z.object({
    turnaround: z.string(),
    expressionSheet: z.string(),
    mouthChart: z.string(),
    handPoses: z.string(),
    fullBodyPose: z.string()
  }).optional(),
  origin: honestyOriginSchema.default('planned'),
  assetBackend: z.enum(['available','missing']).default('missing')
});

export type CharacterSpec = z.infer<typeof characterSpecSchema>;
export const DEFAULT_MOUTH_SHAPES = HUMAN_MOUTH_SHAPES;
export const DEFAULT_360_VIEWS = HUMAN_VIEWS_360;