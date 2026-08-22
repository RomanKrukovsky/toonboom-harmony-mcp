import { z } from 'zod';
export declare const fxCompositingTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    sceneId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    sceneId: string;
}, {
    sceneId: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    fxTemplateId: z.ZodString;
    targetNode: z.ZodString;
}, "strip", z.ZodTypeAny, {
    targetNode: string;
    fxTemplateId: string;
}, {
    targetNode: string;
    fxTemplateId: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    particleType: z.ZodString;
}, "strip", z.ZodTypeAny, {
    particleType: string;
}, {
    particleType: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sceneId: z.ZodString;
    colorProfile: z.ZodString;
}, "strip", z.ZodTypeAny, {
    sceneId: string;
    colorProfile: string;
}, {
    sceneId: string;
    colorProfile: string;
}>>)[];
