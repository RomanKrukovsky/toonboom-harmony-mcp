import { z } from 'zod';
import { characterDrawingPIRSchema } from './vectorizationPIR.js';
import { masterControllerSpecSchema } from './deformerPIR.js';
export const headAngleSchema = z.enum(['0', '45', '90', '135', '180']); // Front, Quarter, Side, Quarter-Back, Back
export const rig360SpecSchema = z.object({
    specId: z.string(),
    characterName: z.string(),
    angles: z.record(headAngleSchema, characterDrawingPIRSchema),
    masterController: masterControllerSpecSchema
});
export const rig360AssemblyPlanSchema = z.object({
    planId: z.string(),
    characterName: z.string(),
    targetNodes: z.array(z.string()),
    substitutions: z.record(z.string(), z.array(z.object({
        angle: headAngleSchema,
        drawingId: z.string()
    }))),
    masterControllerPlan: masterControllerSpecSchema
});
