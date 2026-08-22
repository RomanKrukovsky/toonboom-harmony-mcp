import { z } from 'zod';
export declare const productionMemoryTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    query: z.ZodString;
}, "strip", z.ZodTypeAny, {
    query: string;
}, {
    query: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    decision: z.ZodString;
    context: z.ZodString;
}, "strip", z.ZodTypeAny, {
    decision: string;
    context: string;
}, {
    decision: string;
    context: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    characterId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    characterId: string;
}, {
    characterId: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    episodeId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    episodeId: string;
}, {
    episodeId: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    searchTags: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    searchTags: string[];
}, {
    searchTags: string[];
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    motionType: z.ZodString;
}, "strip", z.ZodTypeAny, {
    motionType: string;
}, {
    motionType: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sceneId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    sceneId: string;
}, {
    sceneId: string;
}>>)[];
