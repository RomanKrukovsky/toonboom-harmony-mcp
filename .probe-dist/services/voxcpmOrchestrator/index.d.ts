import { z } from 'zod';
export declare const voxcpmGenerateOptionsSchema: z.ZodObject<{
    text: z.ZodString;
    outputWavPath: z.ZodString;
    voiceDescription: z.ZodOptional<z.ZodString>;
    referenceWavPath: z.ZodOptional<z.ZodString>;
    instruct: z.ZodOptional<z.ZodString>;
    guidanceScale: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    numSteps: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    text: string;
    outputWavPath: string;
    guidanceScale: number;
    numSteps: number;
    voiceDescription?: string | undefined;
    referenceWavPath?: string | undefined;
    instruct?: string | undefined;
}, {
    text: string;
    outputWavPath: string;
    voiceDescription?: string | undefined;
    referenceWavPath?: string | undefined;
    instruct?: string | undefined;
    guidanceScale?: number | undefined;
    numSteps?: number | undefined;
}>;
export declare const voxcpmResultSchema: z.ZodObject<{
    status: z.ZodString;
    realInferenceExecuted: z.ZodBoolean;
    outputWavPath: z.ZodOptional<z.ZodString>;
    sampleRate: z.ZodNumber;
    durationSec: z.ZodNumber;
    provider: z.ZodString;
    errors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    status: string;
    errors: string[];
    durationSec: number;
    sampleRate: number;
    realInferenceExecuted: boolean;
    provider: string;
    outputWavPath?: string | undefined;
}, {
    status: string;
    durationSec: number;
    sampleRate: number;
    realInferenceExecuted: boolean;
    provider: string;
    errors?: string[] | undefined;
    outputWavPath?: string | undefined;
}>;
export type VoxCPMGenerateOptions = z.input<typeof voxcpmGenerateOptionsSchema>;
export type VoxCPMResult = z.infer<typeof voxcpmResultSchema>;
export declare class VoxCPMOrchestrator {
    private readonly baseUrl;
    constructor(baseUrl?: string);
    /**
     * Triggers VoxCPM2 audio synthesis (Voice Design or Voice Cloning) via ML Runtime.
     */
    generateAudio(options: VoxCPMGenerateOptions): Promise<VoxCPMResult>;
}
