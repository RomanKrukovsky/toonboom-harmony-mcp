import { type HarmonyReconstructionManifest } from '../schemas/reconstruction.js';
export interface ReconstructionJobResponse {
    jobId: string;
    status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
    stage: string;
    progress: number;
    manifestPath?: string;
    analysisPath?: string;
    error?: {
        code: string;
        message: string;
    };
    report?: Record<string, unknown>;
}
export declare class ReconstructionClient {
    private readonly baseUrl;
    private readonly timeoutMs;
    constructor(baseUrl?: string, timeoutMs?: number);
    private request;
    health(): Promise<Record<string, unknown>>;
    analyze(input: Record<string, unknown>): Promise<ReconstructionJobResponse>;
    reconstruct(input: Record<string, unknown>): Promise<ReconstructionJobResponse>;
    getJob(jobId: string): Promise<ReconstructionJobResponse>;
    cancelJob(jobId: string): Promise<ReconstructionJobResponse>;
    compareRender(pairs: Array<{
        frame: number;
        sourcePath: string;
        renderPath: string;
    }>): Promise<Record<string, any>>;
    refineRange(jobId: string, input: {
        startFrame: number;
        endFrame: number;
        maxPointsPerShape?: number;
    }): Promise<Record<string, any>>;
    listVersions(jobId: string): Promise<any[]>;
    rollbackVersion(jobId: string, version: number): Promise<Record<string, any>>;
    lockElements(jobId: string, elementId: string, locked: boolean): Promise<Record<string, any>>;
    proposeVariants(jobId: string): Promise<any[]>;
    listVariants(jobId: string): Promise<any[]>;
    getVariant(jobId: string, variantId: string): Promise<Record<string, any>>;
    compareVariants(jobId: string): Promise<Record<string, any>>;
    selectVariant(jobId: string, variantId: string, options?: {
        startFrame?: number;
        endFrame?: number;
        reason?: string;
        user?: string;
    }): Promise<Record<string, any>>;
    discardVariant(jobId: string, variantId: string): Promise<Record<string, any>>;
    rollbackVariantSelection(jobId: string): Promise<Record<string, any>>;
    analyzeMotionFactorization(jobId: string): Promise<Record<string, any>>;
    previewTransform(jobId: string): Promise<Record<string, any>>;
    applyTransform(jobId: string): Promise<Record<string, any>>;
    rejectTransform(jobId: string): Promise<Record<string, any>>;
    loadManifest(manifestPath: string): HarmonyReconstructionManifest;
    retargetAnalyze(input: Record<string, unknown>): Promise<any>;
    retargetPreview(input: Record<string, unknown>): Promise<any>;
    retargetApply(input: Record<string, unknown>): Promise<any>;
    perceiveVideo(input: {
        videoPath: string;
        audioPath: string;
        outputDir: string;
    }): Promise<any>;
}
