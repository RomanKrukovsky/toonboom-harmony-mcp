import { z } from 'zod';
/**
 * actingTools — acting planning layer.
 */
export declare const actingTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    dialogue: z.ZodString;
}, "strip", z.ZodTypeAny, {
    dialogue: string;
}, {
    dialogue: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    scene: z.ZodAny;
    character: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    scene?: any;
    character?: string | undefined;
}, {
    scene?: any;
    character?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    scene: z.ZodAny;
}, "strip", z.ZodTypeAny, {
    scene?: any;
}, {
    scene?: any;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    scene: z.ZodAny;
    character: z.ZodString;
}, "strip", z.ZodTypeAny, {
    character: string;
    scene?: any;
}, {
    character: string;
    scene?: any;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    actingPlan: z.ZodAny;
}, "strip", z.ZodTypeAny, {
    actingPlan?: any;
}, {
    actingPlan?: any;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    actingPlan: z.ZodAny;
    dryRun: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    dryRun: boolean;
    projectPath?: string | undefined;
    actingPlan?: any;
}, {
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    actingPlan?: any;
}>>)[];
