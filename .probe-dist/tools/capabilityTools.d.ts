import { z } from 'zod';
export declare const capabilityTools: (import("./defineTool.js").TypedTool<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    projectPath: string;
}, {
    projectPath: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    operation: z.ZodString;
}, "strip", z.ZodTypeAny, {
    operation: string;
}, {
    operation: string;
}>>)[];
