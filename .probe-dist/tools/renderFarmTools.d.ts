import { z } from 'zod';
export declare const renderFarmTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodString;
    frame: z.ZodDefault<z.ZodNumber>;
    outputPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    frame: number;
    projectPath: string;
    outputPath?: string | undefined;
}, {
    projectPath: string;
    frame?: number | undefined;
    outputPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodString;
    outputPath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    projectPath: string;
    outputPath: string;
}, {
    projectPath: string;
    outputPath: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodString;
    outputDir: z.ZodString;
}, "strip", z.ZodTypeAny, {
    projectPath: string;
    outputDir: string;
}, {
    projectPath: string;
    outputDir: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodString;
    priority: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    projectPath: string;
    priority: number;
}, {
    projectPath: string;
    priority?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    jobId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    jobId: string;
}, {
    jobId: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    filePath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    filePath: string;
}, {
    filePath: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    packageDir: z.ZodString;
}, "strip", z.ZodTypeAny, {
    packageDir: string;
}, {
    packageDir: string;
}>>)[];
