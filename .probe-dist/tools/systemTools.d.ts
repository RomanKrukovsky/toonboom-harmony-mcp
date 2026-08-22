import { z } from 'zod';
export declare const systemTools: (import("./defineTool.js").TypedTool<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    path: z.ZodString;
    checkHarmonyPreferences: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    path: string;
    checkHarmonyPreferences: boolean;
}, {
    path: string;
    checkHarmonyPreferences?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    lines: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    lines: number;
}, {
    lines?: number | undefined;
}>>)[];
