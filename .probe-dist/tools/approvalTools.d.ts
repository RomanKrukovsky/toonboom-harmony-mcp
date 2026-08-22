import { z } from 'zod';
export declare const approvalTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    gateName: z.ZodString;
    artifactPath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    gateName: string;
    artifactPath: string;
}, {
    gateName: string;
    artifactPath: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    gateName: z.ZodString;
    approved: z.ZodBoolean;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    approved: boolean;
    gateName: string;
    notes?: string | undefined;
}, {
    approved: boolean;
    gateName: string;
    notes?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    packageDir: z.ZodString;
}, "strip", z.ZodTypeAny, {
    packageDir: string;
}, {
    packageDir: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    stageId: z.ZodString;
    notes: z.ZodString;
}, "strip", z.ZodTypeAny, {
    notes: string;
    stageId: string;
}, {
    notes: string;
    stageId: string;
}>>)[];
