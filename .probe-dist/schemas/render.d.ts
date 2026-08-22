import { z } from 'zod';
export declare const localRenderSchema: z.ZodObject<{
    projectPath: z.ZodString;
    startFrame: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    endFrame: z.ZodOptional<z.ZodNumber>;
    resolutionWidth: z.ZodOptional<z.ZodNumber>;
    resolutionHeight: z.ZodOptional<z.ZodNumber>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    startFrame: number;
    projectPath: string;
    dryRun?: boolean | undefined;
    endFrame?: number | undefined;
    resolutionWidth?: number | undefined;
    resolutionHeight?: number | undefined;
}, {
    projectPath: string;
    dryRun?: boolean | undefined;
    startFrame?: number | undefined;
    endFrame?: number | undefined;
    resolutionWidth?: number | undefined;
    resolutionHeight?: number | undefined;
}>;
export declare const queueSceneSchema: z.ZodObject<{
    sceneName: z.ZodString;
    environmentName: z.ZodString;
    jobName: z.ZodString;
    versionNumber: z.ZodNumber;
    startFrame: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    endFrame: z.ZodOptional<z.ZodNumber>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    startFrame: number;
    environmentName: string;
    jobName: string;
    sceneName: string;
    versionNumber: number;
    dryRun?: boolean | undefined;
    endFrame?: number | undefined;
}, {
    environmentName: string;
    jobName: string;
    sceneName: string;
    versionNumber: number;
    dryRun?: boolean | undefined;
    startFrame?: number | undefined;
    endFrame?: number | undefined;
}>;
export declare const listQueueSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare const cancelJobSchema: z.ZodObject<{
    queueId: z.ZodNumber;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    queueId: number;
    dryRun?: boolean | undefined;
}, {
    queueId: number;
    dryRun?: boolean | undefined;
}>;
export declare const retryFailedRendersSchema: z.ZodObject<{
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    dryRun?: boolean | undefined;
}, {
    dryRun?: boolean | undefined;
}>;
export declare const collectOutputsSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    projectPath?: string | undefined;
}, {
    projectPath?: string | undefined;
}>;
export declare const validateFramesSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    framesDirectory: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    projectPath?: string | undefined;
    framesDirectory?: string | undefined;
}, {
    projectPath?: string | undefined;
    framesDirectory?: string | undefined;
}>;
export declare const makeMp4PreviewSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    framesDirectory: z.ZodOptional<z.ZodString>;
    outputPath: z.ZodString;
    fps: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    fps: number;
    outputPath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    framesDirectory?: string | undefined;
}, {
    outputPath: string;
    dryRun?: boolean | undefined;
    fps?: number | undefined;
    projectPath?: string | undefined;
    framesDirectory?: string | undefined;
}>;
export declare const queueDrawingsSchema: z.ZodObject<{
    projectPath: z.ZodString;
    drawingsPaths: z.ZodArray<z.ZodString, "many">;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    projectPath: string;
    drawingsPaths: string[];
    dryRun?: boolean | undefined;
}, {
    projectPath: string;
    drawingsPaths: string[];
    dryRun?: boolean | undefined;
}>;
export declare const listVectorizeQueueSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare const retryFailedVectorizationsSchema: z.ZodObject<{
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    dryRun?: boolean | undefined;
}, {
    dryRun?: boolean | undefined;
}>;
export declare const diagnoseHeavyNodesSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    projectPath?: string | undefined;
}, {
    projectPath?: string | undefined;
}>;
