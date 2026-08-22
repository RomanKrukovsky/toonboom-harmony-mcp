import { z } from 'zod';
export const lipSyncVisemeSchema = z.object({
    startFrame: z.number().int().min(1),
    endFrame: z.number().int().min(1),
    phoneme: z.string() // E.g., 'A', 'B', 'C', 'X' etc.
});
export const lipSyncPirSchema = z.object({
    format: z.literal('LipSyncPIR'),
    version: z.literal('1.0.0'),
    sourceAudioHash: z.string(),
    frameRate: z.number().positive(),
    visemes: z.array(lipSyncVisemeSchema)
});
