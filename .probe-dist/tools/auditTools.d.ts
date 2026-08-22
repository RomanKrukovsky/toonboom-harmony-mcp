import { z } from 'zod';
export declare const auditTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    deepScan: z.ZodOptional<z.ZodBoolean>;
    checkCompositeModes: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    checkNegativeScale: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    checkDrawingKeyframes: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    checkCompositeModes: boolean;
    checkNegativeScale: boolean;
    checkDrawingKeyframes: boolean;
    projectPath?: string | undefined;
    deepScan?: boolean | undefined;
}, {
    projectPath?: string | undefined;
    deepScan?: boolean | undefined;
    checkCompositeModes?: boolean | undefined;
    checkNegativeScale?: boolean | undefined;
    checkDrawingKeyframes?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    environmentName: z.ZodString;
    jobName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    environmentName: string;
    jobName: string;
}, {
    environmentName: string;
    jobName: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    environmentName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    environmentName: string;
}, {
    environmentName: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    projectPath?: string | undefined;
}, {
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    deepScan: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    projectPath?: string | undefined;
    deepScan?: boolean | undefined;
}, {
    projectPath?: string | undefined;
    deepScan?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    framesDirectory: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    projectPath?: string | undefined;
    framesDirectory?: string | undefined;
}, {
    projectPath?: string | undefined;
    framesDirectory?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    includeWarnings: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    maxRecipes: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    includeWarnings: boolean;
    maxRecipes: number;
    projectPath?: string | undefined;
}, {
    projectPath?: string | undefined;
    includeWarnings?: boolean | undefined;
    maxRecipes?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    projectPath: string;
}, {
    projectPath: string;
}>>)[];
