import { z } from 'zod';

export const combatSocketSchema = z.enum([
  'hand_r',
  'hand_l',
  'foot_r',
  'foot_l',
  'head',
  'jaw_l',
  'jaw_r',
  'torso',
  'wrist_l',
  'wrist_r'
]);
export type CombatSocket = z.infer<typeof combatSocketSchema>;

export const vector2DSchema = z.object({
  x: z.number(),
  y: z.number()
});
export type Vector2D = z.infer<typeof vector2DSchema>;

export const combatTrajectoryKeySchema = z.object({
  frame: z.number(),
  position: vector2DSchema,
  socketOffset: vector2DSchema.optional()
});
export type CombatTrajectoryKey = z.infer<typeof combatTrajectoryKeySchema>;

export const combatActorRoleSchema = z.enum(['attacker', 'defender']);
export type CombatActorRole = z.infer<typeof combatActorRoleSchema>;

export const combatActionTypeSchema = z.enum([
  'punch_straight',
  'punch_hook',
  'kick_roundhouse',
  'grapple_hold',
  'block',
  'recoil_heavy',
  'knockback',
  'fall'
]);
export type CombatActionType = z.infer<typeof combatActionTypeSchema>;

export const combatActorSpecSchema = z.object({
  characterId: z.string().min(1),
  role: combatActorRoleSchema,
  socket: combatSocketSchema,
  actionType: combatActionTypeSchema,
  trajectory: z.array(combatTrajectoryKeySchema).min(1)
});
export type CombatActorSpec = z.infer<typeof combatActorSpecSchema>;

export const impactSpecSchema = z.object({
  contactFrame: z.number().int().min(1),
  hitStopFrames: z.number().int().min(0).max(12).default(3),
  impulseVector: vector2DSchema,
  cameraShake: z.object({
    intensity: z.number().min(0),
    decayFrames: z.number().int().min(1)
  }),
  vfxPreset: z.enum(['impact_star', 'speed_burst', 'dust_puff', 'none']).default('impact_star')
});
export type ImpactSpec = z.infer<typeof impactSpecSchema>;

export const constraintHandOffSchema = z.object({
  enabled: z.boolean().default(false),
  handOffFrame: z.number().int().optional(),
  sourceSocket: combatSocketSchema.optional(),
  targetSocket: combatSocketSchema.optional(),
  blendDurationFrames: z.number().int().min(1).default(2)
});
export type ConstraintHandOff = z.infer<typeof constraintHandOffSchema>;

export const combatActionSpecSchema = z.object({
  specId: z.string().min(1),
  sceneId: z.string().optional(),
  attacker: combatActorSpecSchema,
  defender: combatActorSpecSchema,
  impact: impactSpecSchema,
  constraintHandOff: constraintHandOffSchema.optional()
});
export type CombatActionSpec = z.infer<typeof combatActionSpecSchema>;
