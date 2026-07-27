import { z } from 'zod';
import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';

export const point2DConstraintSchema = z.object({
  x: z.number().default(0),
  y: z.number().default(0)
});

export const backdropGroupSchema = z.enum(['head', 'torso', 'arms', 'legs', 'master', 'accessories']);

export const partRigSpecSchema = z.object({
  partId: z.string(),
  drawingNodeName: z.string(),
  pegNodeName: z.string(),
  parentPartId: z.string().nullable().default(null),
  semanticGroup: z.string(),
  artLayer: z.enum(['underlay', 'line', 'color', 'overlay']).default('line'),
  pivot: point2DConstraintSchema.default({ x: 0, y: 0 }),
  zOffset: z.number().default(0.0001),
  separatePosition: z.boolean().default(true),
  lockDrawingMode: z.boolean().default(true),
  hasDeformer: z.boolean().default(false),
  isKinematicAccessory: z.boolean().default(false),
  backdropGroup: backdropGroupSchema.default('master')
});
export type PartRigSpec = z.infer<typeof partRigSpecSchema>;

export const autoPatchJointSpecSchema = z.object({
  jointId: z.string(),
  jointName: z.string(),
  partA: z.string(),
  partB: z.string(),
  patchRadius: z.number().default(15.0)
});
export type AutoPatchJointSpec = z.infer<typeof autoPatchJointSpecSchema>;

export const kinematicAccessorySpecSchema = z.object({
  accessoryId: z.string(),
  parentPart: z.string(),
  accessoryPart: z.string()
});
export type KinematicAccessorySpec = z.infer<typeof kinematicAccessorySpecSchema>;

export const backdropSpecSchema = z.object({
  title: z.string(),
  color: z.enum(['green', 'blue', 'yellow', 'purple', 'red', 'gray']),
  nodes: z.array(z.string())
});
export type BackdropSpec = z.infer<typeof backdropSpecSchema>;

export const characterRigAssemblyPlanSchema = z.object({
  planId: z.string(),
  characterName: z.string(),
  masterPegName: z.string().default('Master_P'),
  parts: z.array(partRigSpecSchema),
  autoPatchJoints: z.array(autoPatchJointSpecSchema).default([]),
  kinematicAccessories: z.array(kinematicAccessorySpecSchema).default([]),
  backdrops: z.array(backdropSpecSchema).default([]),
  planHash: z.string().optional(),
  createdAt: z.string().optional()
});
export type CharacterRigAssemblyPlan = z.infer<typeof characterRigAssemblyPlanSchema>;

export function computeRigPlanHash(plan: Omit<CharacterRigAssemblyPlan, 'planHash'>): string {
  const normalized = stringify(plan);
  return crypto.createHash('sha256').update(normalized).digest('hex');
}
