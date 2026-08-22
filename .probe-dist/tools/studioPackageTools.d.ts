import { z } from 'zod';
export declare const studioPackageTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    packageDir: z.ZodString;
    outputDir: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    packageDir: string;
    outputDir?: string | undefined;
}, {
    packageDir: string;
    outputDir?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    episodePlan: z.ZodOptional<z.ZodAny>;
    characterSpecs: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
    outputDir: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    outputDir?: string | undefined;
    characterSpecs?: any[] | undefined;
    episodePlan?: any;
}, {
    outputDir?: string | undefined;
    characterSpecs?: any[] | undefined;
    episodePlan?: any;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sceneCount: z.ZodDefault<z.ZodNumber>;
    characterCount: z.ZodDefault<z.ZodNumber>;
    durationMinutes: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    durationMinutes: number;
    characterCount: number;
    sceneCount: number;
}, {
    durationMinutes?: number | undefined;
    characterCount?: number | undefined;
    sceneCount?: number | undefined;
}>>)[];
