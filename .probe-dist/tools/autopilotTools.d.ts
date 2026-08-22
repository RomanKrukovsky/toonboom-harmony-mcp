import { z } from 'zod';
export declare const autopilotTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    scenePlanPath: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    scenePlanPath: string;
    dryRun?: boolean | undefined;
}, {
    scenePlanPath: string;
    dryRun?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    scenePlanPath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    scenePlanPath: string;
}, {
    scenePlanPath: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    stepId: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    stepId: string;
    dryRun?: boolean | undefined;
}, {
    stepId: string;
    dryRun?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    stepId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    stepId: string;
}, {
    stepId: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    stepId: z.ZodString;
    error: z.ZodString;
}, "strip", z.ZodTypeAny, {
    error: string;
    stepId: string;
}, {
    error: string;
    stepId: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    dryRun?: boolean | undefined;
}, {
    dryRun?: boolean | undefined;
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
}, "strip", z.ZodTypeAny, {
    projectPath: string;
}, {
    projectPath: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    prompt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    prompt: string;
}, {
    prompt: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    scenePlanPath: z.ZodOptional<z.ZodString>;
    scenePlanInline: z.ZodOptional<z.ZodAny>;
    dryRun: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    autoFix: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    skipAudit: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    dryRun: boolean;
    autoFix: boolean;
    skipAudit: boolean;
    scenePlanPath?: string | undefined;
    scenePlanInline?: any;
}, {
    dryRun?: boolean | undefined;
    scenePlanPath?: string | undefined;
    scenePlanInline?: any;
    autoFix?: boolean | undefined;
    skipAudit?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    scenePlanInline: z.ZodOptional<z.ZodAny>;
    checkLevel: z.ZodDefault<z.ZodOptional<z.ZodEnum<["quick", "standard", "deep"]>>>;
}, "strip", z.ZodTypeAny, {
    checkLevel: "quick" | "standard" | "deep";
    projectPath?: string | undefined;
    scenePlanInline?: any;
}, {
    projectPath?: string | undefined;
    scenePlanInline?: any;
    checkLevel?: "quick" | "standard" | "deep" | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    issues: z.ZodArray<z.ZodAny, "many">;
    projectPath: z.ZodOptional<z.ZodString>;
    scenePlanInline: z.ZodOptional<z.ZodAny>;
    dryRun: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    dryRun: boolean;
    issues: any[];
    projectPath?: string | undefined;
    scenePlanInline?: any;
}, {
    issues: any[];
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    scenePlanInline?: any;
}>>)[];
