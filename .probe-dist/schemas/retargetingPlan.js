import { z } from 'zod';
import { transformTrackSchema } from './performancePir.js';
export const retargetingPlanSchema = z.object({
    schema: z.literal('toon-boom-mcp/retargeting-plan-v1'),
    characterId: z.string(),
    performanceId: z.string(),
    bindingHash: z.string(),
    tracks: z.array(transformTrackSchema),
    warnings: z.array(z.string()).default([])
});
