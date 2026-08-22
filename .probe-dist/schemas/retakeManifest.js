import { z } from 'zod';
import { snapshotTransformKeyframeSchema, snapshotExposureSchema } from './sceneSnapshotPir.js';
export const nodeDeltaSchema = z.object({
    added: z.array(z.string()),
    removed: z.array(z.string())
});
export const connectionDeltaSchema = z.object({
    added: z.array(z.object({
        from_node: z.string(),
        from_port: z.number(),
        to_node: z.string(),
        to_port: z.number()
    })),
    removed: z.array(z.object({
        from_node: z.string(),
        from_port: z.number(),
        to_node: z.string(),
        to_port: z.number()
    }))
});
export const nodeDataDeltaSchema = z.object({
    nodeId: z.string(),
    transformKeys: z.object({
        added: z.array(snapshotTransformKeyframeSchema),
        modified: z.array(z.object({
            original: snapshotTransformKeyframeSchema,
            updated: snapshotTransformKeyframeSchema
        })),
        removed: z.array(snapshotTransformKeyframeSchema)
    }).optional(),
    exposures: z.object({
        added: z.array(snapshotExposureSchema),
        modified: z.array(z.object({
            original: snapshotExposureSchema,
            updated: snapshotExposureSchema
        })),
        removed: z.array(snapshotExposureSchema)
    }).optional()
});
export const retakeManifestSchema = z.object({
    format: z.literal('RetakeManifest'),
    version: z.literal('1.0.0'),
    sceneId: z.string(),
    snapshotV1Id: z.string(), // ID or hash of the "before" snapshot
    snapshotV2Id: z.string(), // ID or hash of the "after" snapshot
    nodes: nodeDeltaSchema,
    connections: connectionDeltaSchema,
    nodeDataChanges: z.array(nodeDataDeltaSchema)
});
