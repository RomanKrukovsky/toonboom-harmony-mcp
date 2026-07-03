import { z } from 'zod';
import { honestyOriginSchema } from './onePrompt.js';

/**
 * rig360Spec.ts — the production spec for a Harmony 360° turn rig.
 *
 * The Rig360 Synthesizer produces this spec plus a placeholder rig
 * template structure. Real rig assembly requires drawn layered assets
 * — the spec + placeholder is the honest fallback (ACTOR §7).
 */

export const deformerPlanSchema = z.object({
  targetLayer: z.string(),
  deformerType: z.enum(['curve','envelope','perspective','quadric']),
  axis: z.enum(['x','y','z','free']).default('free'),
  range: z.array(z.number()).length(2).optional()
});

export const masterControllerPlanSchema = z.object({
  name: z.string(),
  controls: z.array(z.object({
    node: z.string(),
    attributeName: z.string(),
    min: z.number().optional(),
    max: z.number().optional(),
    defaultValue: z.number().optional()
  }))
});

export const faceControlPlanSchema = z.object({
  groupName: z.enum(['mouth','eyes','brows','head','expressions']),
  controllers: z.array(masterControllerPlanSchema)
});

export const bodyTurnPlanSchema = z.object({
  axis: z.enum(['x','y']),
  keyFrames: z.array(z.object({
    frame: z.number(),
    angle: z.number(),
    description: z.string().optional()
  })),
  interpolation: z.enum(['linear','bezier','step']).default('bezier')
});

export const rig360SpecSchema = z.object({
  characterName: z.string(),
  requiredAssets: z.array(z.object({
    view: z.string(),
    layer: z.string(),
    status: z.enum(['missing','placeholder','provided','generated'])
  })).default([]),
  masterControllers: z.array(masterControllerPlanSchema).default([]),
  deformers: z.array(deformerPlanSchema).default([]),
  faceControls: z.array(faceControlPlanSchema).default([]),
  bodyTurn: z.array(bodyTurnPlanSchema).default([]),
  placeholderRigCreated: z.boolean().default(false),
  realRigCreated: z.boolean().default(false),
  missingAssets: z.array(z.string()).default([]),
  providedAssets: z.array(z.string()).default([]),
  nextBestAction: z.string().optional(),
  origin: honestyOriginSchema.default('planned')
});

export type Rig360Spec = z.infer<typeof rig360SpecSchema>;
export type DeformerPlan = z.infer<typeof deformerPlanSchema>;
export type MasterControllerPlan = z.infer<typeof masterControllerPlanSchema>;
export type FaceControlPlan = z.infer<typeof faceControlPlanSchema>;
export type BodyTurnPlan = z.infer<typeof bodyTurnPlanSchema>;