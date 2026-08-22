import { z } from 'zod';
export declare const styleTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    assetId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    assetId: string;
}, {
    assetId: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    v1Path: z.ZodString;
    v2Path: z.ZodString;
}, "strip", z.ZodTypeAny, {
    v1Path: string;
    v2Path: string;
}, {
    v1Path: string;
    v2Path: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sceneId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    sceneId: string;
}, {
    sceneId: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    characterId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    characterId: string;
}, {
    characterId: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    issues: z.ZodArray<z.ZodAny, "many">;
}, "strip", z.ZodTypeAny, {
    issues: any[];
}, {
    issues: any[];
}>>)[];
