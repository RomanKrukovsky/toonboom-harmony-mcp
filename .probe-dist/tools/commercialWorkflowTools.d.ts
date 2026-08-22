import { z } from 'zod';
export declare const commercialWorkflowTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    shotListPath: z.ZodString;
    productionId: z.ZodNumber;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    productionId: number;
    shotListPath: string;
    dryRun?: boolean | undefined;
}, {
    productionId: number;
    shotListPath: string;
    dryRun?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    outputDirectory: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    outputDirectory: string;
    dryRun?: boolean | undefined;
}, {
    outputDirectory: string;
    dryRun?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    plansDirectory: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    plansDirectory: string;
    dryRun?: boolean | undefined;
}, {
    plansDirectory: string;
    dryRun?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    scenesList: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    scenesList: string[];
}, {
    scenesList: string[];
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    targetZipPath: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    targetZipPath: string;
    dryRun?: boolean | undefined;
}, {
    targetZipPath: string;
    dryRun?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    scenesCount: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    hourlyRate: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    scenesCount: number;
    hourlyRate: number;
}, {
    scenesCount?: number | undefined;
    hourlyRate?: number | undefined;
}>>)[];
