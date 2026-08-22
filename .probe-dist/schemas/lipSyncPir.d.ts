import { z } from 'zod';
export declare const lipSyncVisemeSchema: z.ZodObject<{
    startFrame: z.ZodNumber;
    endFrame: z.ZodNumber;
    phoneme: z.ZodString;
}, "strip", z.ZodTypeAny, {
    startFrame: number;
    endFrame: number;
    phoneme: string;
}, {
    startFrame: number;
    endFrame: number;
    phoneme: string;
}>;
export declare const lipSyncPirSchema: z.ZodObject<{
    format: z.ZodLiteral<"LipSyncPIR">;
    version: z.ZodLiteral<"1.0.0">;
    sourceAudioHash: z.ZodString;
    frameRate: z.ZodNumber;
    visemes: z.ZodArray<z.ZodObject<{
        startFrame: z.ZodNumber;
        endFrame: z.ZodNumber;
        phoneme: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        startFrame: number;
        endFrame: number;
        phoneme: string;
    }, {
        startFrame: number;
        endFrame: number;
        phoneme: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    version: "1.0.0";
    format: "LipSyncPIR";
    visemes: {
        startFrame: number;
        endFrame: number;
        phoneme: string;
    }[];
    sourceAudioHash: string;
    frameRate: number;
}, {
    version: "1.0.0";
    format: "LipSyncPIR";
    visemes: {
        startFrame: number;
        endFrame: number;
        phoneme: string;
    }[];
    sourceAudioHash: string;
    frameRate: number;
}>;
export type LipSyncViseme = z.infer<typeof lipSyncVisemeSchema>;
export type LipSyncPIR = z.infer<typeof lipSyncPirSchema>;
