import { z } from 'zod';
export declare const uiOperatorTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    outputPath: z.ZodOptional<z.ZodString>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    dryRun?: boolean | undefined;
    outputPath?: string | undefined;
}, {
    dryRun?: boolean | undefined;
    outputPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    query: z.ZodString;
}, "strip", z.ZodTypeAny, {
    query: string;
}, {
    query: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    x: z.ZodNumber;
    y: z.ZodNumber;
    doubleClick: z.ZodOptional<z.ZodBoolean>;
    rightClick: z.ZodOptional<z.ZodBoolean>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    x: number;
    y: number;
    dryRun?: boolean | undefined;
    doubleClick?: boolean | undefined;
    rightClick?: boolean | undefined;
}, {
    x: number;
    y: number;
    dryRun?: boolean | undefined;
    doubleClick?: boolean | undefined;
    rightClick?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    keys: z.ZodArray<z.ZodString, "many">;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    keys: string[];
    dryRun?: boolean | undefined;
}, {
    keys: string[];
    dryRun?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    text: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    text: string;
    dryRun?: boolean | undefined;
}, {
    text: string;
    dryRun?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    menuPath: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    menuPath: string;
    dryRun?: boolean | undefined;
}, {
    menuPath: string;
    dryRun?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    filePath: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    filePath: string;
    dryRun?: boolean | undefined;
}, {
    filePath: string;
    dryRun?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    dialogTitle: z.ZodString;
    timeoutMs: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    dialogTitle: string;
    timeoutMs: number;
}, {
    dialogTitle: string;
    timeoutMs?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    dryRun?: boolean | undefined;
}, {
    dryRun?: boolean | undefined;
}>>)[];
