import { z } from 'zod';
/**
 * qualityDirectorTools — review and score generated plans.
 */
export declare const qualityDirectorTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    episodePlan: z.ZodAny;
    shotList: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
    characterSpecs: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
    rig360Specs: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
    actingPlans: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
    cameraPlans: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
    fxPlans: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
}, "strip", z.ZodTypeAny, {
    characterSpecs?: any[] | undefined;
    episodePlan?: any;
    shotList?: any[] | undefined;
    rig360Specs?: any[] | undefined;
    actingPlans?: any[] | undefined;
    cameraPlans?: any[] | undefined;
    fxPlans?: any[] | undefined;
}, {
    characterSpecs?: any[] | undefined;
    episodePlan?: any;
    shotList?: any[] | undefined;
    rig360Specs?: any[] | undefined;
    actingPlans?: any[] | undefined;
    cameraPlans?: any[] | undefined;
    fxPlans?: any[] | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    scene: z.ZodAny;
    episodePlan: z.ZodOptional<z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    scene?: any;
    episodePlan?: any;
}, {
    scene?: any;
    episodePlan?: any;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    actingPlans: z.ZodArray<z.ZodAny, "many">;
}, "strip", z.ZodTypeAny, {
    actingPlans: any[];
}, {
    actingPlans: any[];
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    rig360Specs: z.ZodArray<z.ZodAny, "many">;
}, "strip", z.ZodTypeAny, {
    rig360Specs: any[];
}, {
    rig360Specs: any[];
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    reports: z.ZodArray<z.ZodAny, "many">;
}, "strip", z.ZodTypeAny, {
    reports: any[];
}, {
    reports: any[];
}>>)[];
