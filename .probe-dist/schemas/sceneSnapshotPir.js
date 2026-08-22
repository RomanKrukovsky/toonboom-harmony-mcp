import { z } from 'zod';
export const snapshotNodeSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string()
});
export const snapshotConnectionSchema = z.object({
    from_node: z.string(),
    from_port: z.number().default(0),
    to_node: z.string(),
    to_port: z.number().default(0)
});
export const snapshotTransformKeyframeSchema = z.object({
    frame: z.number().int(),
    x: z.number(),
    y: z.number(),
    rotation: z.number(),
    scaleX: z.number(),
    scaleY: z.number(),
    interpolation: z.enum(['LINEAR', 'CONSTANT', 'BEZIER']).default('LINEAR')
});
export const snapshotExposureSchema = z.object({
    frame: z.number().int(),
    drawing: z.string() // The name of the drawing substitution exposed at this frame
});
export const snapshotNodeDataSchema = z.object({
    nodeId: z.string(),
    transformKeys: z.array(snapshotTransformKeyframeSchema).optional(),
    exposures: z.array(snapshotExposureSchema).optional()
});
export const sceneSnapshotPirSchema = z.object({
    format: z.literal('SceneSnapshotPIR'),
    version: z.literal('1.0.0'),
    sceneId: z.string(),
    timestamp: z.string().datetime(),
    nodes: z.array(snapshotNodeSchema),
    connections: z.array(snapshotConnectionSchema),
    nodeData: z.array(snapshotNodeDataSchema)
});
