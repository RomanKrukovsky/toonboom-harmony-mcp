import { z } from 'zod';
/**
 * episodeAssemblyTools — assemble episode plans into editable
 * Harmony scene plans and render plans.
 */
export declare const episodeAssemblyTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    episodePlan: z.ZodAny;
    characterSpecs: z.ZodArray<z.ZodAny, "many">;
    cameraPlans: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
    fxPlans: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
}, "strip", z.ZodTypeAny, {
    characterSpecs: any[];
    episodePlan?: any;
    cameraPlans?: any[] | undefined;
    fxPlans?: any[] | undefined;
}, {
    characterSpecs: any[];
    episodePlan?: any;
    cameraPlans?: any[] | undefined;
    fxPlans?: any[] | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    episodePlan: z.ZodAny;
    cameraPlans: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
    fxPlans: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
}, "strip", z.ZodTypeAny, {
    episodePlan?: any;
    cameraPlans?: any[] | undefined;
    fxPlans?: any[] | undefined;
}, {
    episodePlan?: any;
    cameraPlans?: any[] | undefined;
    fxPlans?: any[] | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    packageInput: z.ZodAny;
    outputDir: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    outputDir?: string | undefined;
    packageInput?: any;
}, {
    outputDir?: string | undefined;
    packageInput?: any;
}>>)[];
