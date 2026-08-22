import { z } from 'zod';
export declare const reconstructionTools: (import("./defineTool.js").TypedTool<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>> | import("./defineTool.js").TypedTool<z.ZodObject<Pick<{
    videoPath: z.ZodString;
    targetProjectPath: z.ZodOptional<z.ZodString>;
    outputProjectPath: z.ZodOptional<z.ZodString>;
    startFrame: z.ZodOptional<z.ZodNumber>;
    endFrame: z.ZodOptional<z.ZodNumber>;
    mode: z.ZodDefault<z.ZodEnum<["frame_by_frame_vector"]>>;
    targetFps: z.ZodOptional<z.ZodNumber>;
    maxColors: z.ZodDefault<z.ZodNumber>;
    maxPointsPerShape: z.ZodDefault<z.ZodNumber>;
    dedupThreshold: z.ZodDefault<z.ZodNumber>;
    cleanupProfile: z.ZodDefault<z.ZodEnum<["preserve_generated_look", "production_cleanup"]>>;
    backgroundMode: z.ZodDefault<z.ZodEnum<["keep", "transparent"]>>;
    dryRun: z.ZodDefault<z.ZodBoolean>;
    confirm: z.ZodOptional<z.ZodBoolean>;
    confirmationText: z.ZodOptional<z.ZodString>;
}, "startFrame" | "endFrame" | "videoPath" | "targetFps" | "maxColors" | "dedupThreshold" | "cleanupProfile" | "backgroundMode">, "strict", z.ZodTypeAny, {
    videoPath: string;
    maxColors: number;
    dedupThreshold: number;
    cleanupProfile: "preserve_generated_look" | "production_cleanup";
    backgroundMode: "keep" | "transparent";
    startFrame?: number | undefined;
    endFrame?: number | undefined;
    targetFps?: number | undefined;
}, {
    videoPath: string;
    startFrame?: number | undefined;
    endFrame?: number | undefined;
    targetFps?: number | undefined;
    maxColors?: number | undefined;
    dedupThreshold?: number | undefined;
    cleanupProfile?: "preserve_generated_look" | "production_cleanup" | undefined;
    backgroundMode?: "keep" | "transparent" | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    videoPath: z.ZodString;
    targetProjectPath: z.ZodOptional<z.ZodString>;
    outputProjectPath: z.ZodOptional<z.ZodString>;
    startFrame: z.ZodOptional<z.ZodNumber>;
    endFrame: z.ZodOptional<z.ZodNumber>;
    mode: z.ZodDefault<z.ZodEnum<["frame_by_frame_vector"]>>;
    targetFps: z.ZodOptional<z.ZodNumber>;
    maxColors: z.ZodDefault<z.ZodNumber>;
    maxPointsPerShape: z.ZodDefault<z.ZodNumber>;
    dedupThreshold: z.ZodDefault<z.ZodNumber>;
    cleanupProfile: z.ZodDefault<z.ZodEnum<["preserve_generated_look", "production_cleanup"]>>;
    backgroundMode: z.ZodDefault<z.ZodEnum<["keep", "transparent"]>>;
    dryRun: z.ZodDefault<z.ZodBoolean>;
    confirm: z.ZodOptional<z.ZodBoolean>;
    confirmationText: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    dryRun: boolean;
    mode: "frame_by_frame_vector";
    videoPath: string;
    maxColors: number;
    maxPointsPerShape: number;
    dedupThreshold: number;
    cleanupProfile: "preserve_generated_look" | "production_cleanup";
    backgroundMode: "keep" | "transparent";
    confirm?: boolean | undefined;
    startFrame?: number | undefined;
    endFrame?: number | undefined;
    targetProjectPath?: string | undefined;
    outputProjectPath?: string | undefined;
    targetFps?: number | undefined;
    confirmationText?: string | undefined;
}, {
    videoPath: string;
    confirm?: boolean | undefined;
    dryRun?: boolean | undefined;
    startFrame?: number | undefined;
    endFrame?: number | undefined;
    mode?: "frame_by_frame_vector" | undefined;
    targetProjectPath?: string | undefined;
    outputProjectPath?: string | undefined;
    targetFps?: number | undefined;
    maxColors?: number | undefined;
    maxPointsPerShape?: number | undefined;
    dedupThreshold?: number | undefined;
    cleanupProfile?: "preserve_generated_look" | "production_cleanup" | undefined;
    backgroundMode?: "keep" | "transparent" | undefined;
    confirmationText?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    jobId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    jobId: string;
}, {
    jobId: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    manifestPath: z.ZodString;
    targetProjectPath: z.ZodString;
    outputProjectPath: z.ZodString;
    dryRun: z.ZodDefault<z.ZodBoolean>;
    confirm: z.ZodOptional<z.ZodBoolean>;
    confirmationText: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    dryRun: boolean;
    targetProjectPath: string;
    outputProjectPath: string;
    manifestPath: string;
    confirm?: boolean | undefined;
    confirmationText?: string | undefined;
}, {
    targetProjectPath: string;
    outputProjectPath: string;
    manifestPath: string;
    confirm?: boolean | undefined;
    dryRun?: boolean | undefined;
    confirmationText?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    jobId: z.ZodString;
    frame: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    frame: number;
    jobId: string;
}, {
    frame: number;
    jobId: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    jobId: z.ZodString;
    startFrame: z.ZodNumber;
    endFrame: z.ZodNumber;
    maxPointsPerShape: z.ZodOptional<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    startFrame: number;
    endFrame: number;
    jobId: string;
    maxPointsPerShape?: number | undefined;
}, {
    startFrame: number;
    endFrame: number;
    jobId: string;
    maxPointsPerShape?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    jobId: z.ZodString;
    elementId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    jobId: string;
    elementId: string;
}, {
    jobId: string;
    elementId: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    jobId: z.ZodString;
    version: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    version: number;
    jobId: string;
}, {
    version: number;
    jobId: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    jobId: z.ZodString;
    variantId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    jobId: string;
    variantId: string;
}, {
    jobId: string;
    variantId: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    jobId: z.ZodString;
    variantId: z.ZodString;
    startFrame: z.ZodOptional<z.ZodNumber>;
    endFrame: z.ZodOptional<z.ZodNumber>;
    reason: z.ZodOptional<z.ZodString>;
    user: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    jobId: string;
    variantId: string;
    startFrame?: number | undefined;
    endFrame?: number | undefined;
    reason?: string | undefined;
    user?: string | undefined;
}, {
    jobId: string;
    variantId: string;
    startFrame?: number | undefined;
    endFrame?: number | undefined;
    reason?: string | undefined;
    user?: string | undefined;
}>>)[];
