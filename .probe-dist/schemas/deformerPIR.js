import { z } from 'zod';
export const deformerTypeSchema = z.enum(['Envelope', 'Curve', 'Bone']);
export const deformerSpecSchema = z.object({
    deformerId: z.string(),
    type: deformerTypeSchema,
    targetNode: z.string(),
    numPoints: z.number().default(3),
    closed: z.boolean().default(false)
});
export const mcWidgetTypeSchema = z.enum(['Grid', 'Slider']);
export const masterControllerSpecSchema = z.object({
    mcId: z.string(),
    name: z.string(),
    widgetType: mcWidgetTypeSchema,
    controlledNodes: z.array(z.string()),
    gridWidth: z.number().optional(),
    gridHeight: z.number().optional()
});
export const deformerAssemblyPlanSchema = z.object({
    planId: z.string(),
    characterName: z.string(),
    deformers: z.array(deformerSpecSchema),
    masterControllers: z.array(masterControllerSpecSchema)
});
