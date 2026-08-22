import { z } from 'zod';
export declare const autonomousStudioTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    prompt: z.ZodString;
    projectName: z.ZodDefault<z.ZodString>;
    outputRoot: z.ZodOptional<z.ZodString>;
    engineMode: z.ZodOptional<z.ZodEnum<["simulation", "dry_run", "real", "hybrid", "moonshot"]>>;
    durationSeconds: z.ZodDefault<z.ZodNumber>;
    episodeCount: z.ZodDefault<z.ZodNumber>;
    targetAudience: z.ZodDefault<z.ZodString>;
    genre: z.ZodDefault<z.ZodString>;
    visualStyle: z.ZodDefault<z.ZodString>;
    animationStyle: z.ZodDefault<z.ZodString>;
    referenceFiles: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    referenceImages: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    characterReferences: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    resolution: z.ZodDefault<z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
    }, {
        width: number;
        height: number;
    }>>;
    fps: z.ZodDefault<z.ZodNumber>;
    aspectRatio: z.ZodDefault<z.ZodString>;
    language: z.ZodDefault<z.ZodString>;
    voicePreferences: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    musicPreferences: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    qualityPreset: z.ZodDefault<z.ZodEnum<["draft", "standard", "broadcast", "cinematic"]>>;
    budgetPreset: z.ZodDefault<z.ZodEnum<["indie", "tv_series", "commercial", "feature"]>>;
    deadlinePreset: z.ZodDefault<z.ZodEnum<["fast", "balanced", "thorough"]>>;
    allowGeneratedAssets: z.ZodDefault<z.ZodBoolean>;
    allowPlaceholderAssets: z.ZodDefault<z.ZodBoolean>;
    allowUiAutomation: z.ZodDefault<z.ZodBoolean>;
    allowExperimentalOperations: z.ZodDefault<z.ZodBoolean>;
    maximumIterations: z.ZodDefault<z.ZodNumber>;
    humanApprovalPolicy: z.ZodDefault<z.ZodEnum<["fully_autonomous", "approve_critical", "approve_each_department", "manual_supervision"]>>;
}, "strip", z.ZodTypeAny, {
    fps: number;
    durationSeconds: number;
    resolution: {
        width: number;
        height: number;
    };
    language: string;
    prompt: string;
    animationStyle: string;
    genre: string;
    targetAudience: string;
    visualStyle: string;
    projectName: string;
    episodeCount: number;
    aspectRatio: string;
    qualityPreset: "draft" | "standard" | "cinematic" | "broadcast";
    budgetPreset: "indie" | "tv_series" | "commercial" | "feature";
    deadlinePreset: "fast" | "balanced" | "thorough";
    allowGeneratedAssets: boolean;
    allowPlaceholderAssets: boolean;
    allowUiAutomation: boolean;
    allowExperimentalOperations: boolean;
    maximumIterations: number;
    humanApprovalPolicy: "fully_autonomous" | "approve_critical" | "approve_each_department" | "manual_supervision";
    outputRoot?: string | undefined;
    engineMode?: "real" | "simulation" | "hybrid" | "moonshot" | "dry_run" | undefined;
    referenceFiles?: string[] | undefined;
    referenceImages?: string[] | undefined;
    characterReferences?: string[] | undefined;
    voicePreferences?: Record<string, string> | undefined;
    musicPreferences?: Record<string, string> | undefined;
}, {
    prompt: string;
    fps?: number | undefined;
    durationSeconds?: number | undefined;
    resolution?: {
        width: number;
        height: number;
    } | undefined;
    language?: string | undefined;
    animationStyle?: string | undefined;
    genre?: string | undefined;
    targetAudience?: string | undefined;
    visualStyle?: string | undefined;
    projectName?: string | undefined;
    outputRoot?: string | undefined;
    engineMode?: "real" | "simulation" | "hybrid" | "moonshot" | "dry_run" | undefined;
    episodeCount?: number | undefined;
    referenceFiles?: string[] | undefined;
    referenceImages?: string[] | undefined;
    characterReferences?: string[] | undefined;
    aspectRatio?: string | undefined;
    voicePreferences?: Record<string, string> | undefined;
    musicPreferences?: Record<string, string> | undefined;
    qualityPreset?: "draft" | "standard" | "cinematic" | "broadcast" | undefined;
    budgetPreset?: "indie" | "tv_series" | "commercial" | "feature" | undefined;
    deadlinePreset?: "fast" | "balanced" | "thorough" | undefined;
    allowGeneratedAssets?: boolean | undefined;
    allowPlaceholderAssets?: boolean | undefined;
    allowUiAutomation?: boolean | undefined;
    allowExperimentalOperations?: boolean | undefined;
    maximumIterations?: number | undefined;
    humanApprovalPolicy?: "fully_autonomous" | "approve_critical" | "approve_each_department" | "manual_supervision" | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    packageDir: z.ZodString;
}, "strip", z.ZodTypeAny, {
    packageDir: string;
}, {
    packageDir: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    packageDir: z.ZodString;
    stageId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    packageDir: string;
    stageId: string;
}, {
    packageDir: string;
    stageId: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    packageDir: z.ZodString;
    stageId: z.ZodString;
    approver: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    packageDir: string;
    stageId: string;
    approver?: string | undefined;
}, {
    packageDir: string;
    stageId: string;
    approver?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    packageDir: z.ZodString;
    stageId: z.ZodString;
    notes: z.ZodString;
}, "strip", z.ZodTypeAny, {
    notes: string;
    packageDir: string;
    stageId: string;
}, {
    notes: string;
    packageDir: string;
    stageId: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    prompt: z.ZodString;
    durationSeconds: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    durationSeconds: number;
    prompt: string;
}, {
    prompt: string;
    durationSeconds?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    runId1: z.ZodString;
    runId2: z.ZodString;
}, "strip", z.ZodTypeAny, {
    runId1: string;
    runId2: string;
}, {
    runId1: string;
    runId2: string;
}>>)[];
