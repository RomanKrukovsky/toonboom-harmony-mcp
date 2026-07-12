import { z } from 'zod';

export const CAMERA_LAYOUT_SCHEMA_VERSION = '1.0';

export const shotSizeSchema = z.enum([
  'extreme_close_up',
  'close_up',
  'medium_close_up',
  'medium_shot',
  'medium_full_shot',
  'full_shot',
  'long_shot',
  'extreme_long_shot'
]);

export const cameraMovementSchema = z.enum([
  'static',
  'pan_left',
  'pan_right',
  'tilt_up',
  'tilt_down',
  'dolly_in',
  'dolly_out',
  'truck_left',
  'truck_right',
  'pedestal_up',
  'pedestal_down',
  'zoom_in',
  'zoom_out',
  'arc_left',
  'arc_right',
  'crane_up',
  'crane_down'
]);

export const framingRuleSchema = z.enum([
  'rule_of_thirds',
  'center_framing',
  'leading_space',
  'headroom',
  'look_room',
  'short_space',
  'long_space'
]);

export const shotPlanSchema = z.object({
  shotId: z.string(),
  sceneId: z.string(),
  beatIds: z.array(z.string()),
  characterIds: z.array(z.string()),
  startTime: z.number().min(0),
  endTime: z.number().min(0),
  duration: z.number().min(0),
  shotSize: shotSizeSchema,
  cameraPosition: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number()
  }).strict(),
  cameraScale: z.number().positive(),
  cameraMovement: cameraMovementSchema,
  framingRules: z.array(framingRuleSchema),
  focusOfAttention: z.object({
    x: z.number(),
    y: z.number()
  }).strict(),
  safeMargins: z.object({
    top: z.number().min(0).max(0.5),
    bottom: z.number().min(0).max(0.5),
    left: z.number().min(0).max(0.5),
    right: z.number().min(0).max(0.5)
  }).strict(),
  eyelines: z.array(z.object({
    fromCharacterId: z.string(),
    toCharacterId: z.string().nullable(),
    direction: z.number().min(-180).max(180)
  }).strict()),
  continuityNotes: z.array(z.string()),
  transitionIn: z.enum(['cut', 'dissolve', 'fade_in', 'wipe']).default('cut'),
  transitionOut: z.enum(['cut', 'dissolve', 'fade_out', 'wipe']).default('cut'),
  confidence: z.number().min(0).max(1),
  explanation: z.string()
}).strict();

export const cameraKeyframeSchema = z.object({
  frame: z.number().int().positive(),
  position: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number()
  }).strict(),
  scale: z.number().positive(),
  rotation: z.number().optional(),
  interpolation: z.enum(['linear', 'ease_in', 'ease_out', 'ease_in_out', 'hold']).default('ease_in_out')
}).strict();

export const cameraTrackSchema = z.object({
  trackId: z.string(),
  sceneId: z.string(),
  keyframes: z.array(cameraKeyframeSchema),
  totalDuration: z.number().min(0),
  movementType: cameraMovementSchema
}).strict();

export const blockingPositionSchema = z.object({
  characterId: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number()
  }).strict(),
  scale: z.number().positive().default(1),
  facing: z.number().min(-180).max(180).default(0),
  preset: z.enum(['left', 'center', 'right', 'close_up', 'background']).optional()
}).strict();

export const blockingPlanSchema = z.object({
  planId: z.string(),
  sceneId: z.string(),
  shotId: z.string(),
  positions: z.array(blockingPositionSchema),
  continuityConstraints: z.array(z.string())
}).strict();

export const cameraLayoutPlanSchema = z.object({
  schemaVersion: z.string().default(CAMERA_LAYOUT_SCHEMA_VERSION),
  sceneId: z.string(),
  shots: z.array(shotPlanSchema),
  cameraTrack: cameraTrackSchema,
  blockingPlans: z.array(blockingPlanSchema),
  summary: z.object({
    totalShots: z.number().int(),
    averageShotDuration: z.number().min(0),
    cameraMovements: z.record(cameraMovementSchema, z.number().int()),
    shotSizes: z.record(shotSizeSchema, z.number().int()),
    totalKeyframes: z.number().int()
  }).strict(),
  provenance: z.object({
    engine: z.string(),
    createdAt: z.string(),
    method: z.enum(['rule_based', 'ml_director', 'hybrid'])
  }).strict()
}).strict();

export type CameraLayoutPlan = z.infer<typeof cameraLayoutPlanSchema>;
export type ShotPlan = z.infer<typeof shotPlanSchema>;
export type CameraKeyframe = z.infer<typeof cameraKeyframeSchema>;
export type CameraTrack = z.infer<typeof cameraTrackSchema>;
export type BlockingPlan = z.infer<typeof blockingPlanSchema>;
export type BlockingPosition = z.infer<typeof blockingPositionSchema>;
