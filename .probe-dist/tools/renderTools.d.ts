import { z } from 'zod';
export declare const renderTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
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
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
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
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    queueId: z.ZodNumber;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    queueId: number;
    dryRun?: boolean | undefined;
}, {
    queueId: number;
    dryRun?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    projectPath: string;
}, {
    projectPath: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
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
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    heavyNodeTypes: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    threshold: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    heavyNodeTypes: string[];
    threshold: number;
    projectPath?: string | undefined;
}, {
    projectPath?: string | undefined;
    heavyNodeTypes?: string[] | undefined;
    threshold?: number | undefined;
}>>)[];
