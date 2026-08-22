import { z } from 'zod';
export declare const scriptTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    prompt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    prompt: string;
}, {
    prompt: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    concept: z.ZodString;
}, "strip", z.ZodTypeAny, {
    concept: string;
}, {
    concept: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sceneId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    sceneId: string;
}, {
    sceneId: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sceneId: z.ZodString;
    instruction: z.ZodString;
}, "strip", z.ZodTypeAny, {
    sceneId: string;
    instruction: string;
}, {
    sceneId: string;
    instruction: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    dialogue: z.ZodArray<z.ZodAny, "many">;
}, "strip", z.ZodTypeAny, {
    dialogue: any[];
}, {
    dialogue: any[];
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    screenplay: z.ZodAny;
}, "strip", z.ZodTypeAny, {
    screenplay?: any;
}, {
    screenplay?: any;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    screenplayId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    screenplayId: string;
}, {
    screenplayId: string;
}>>)[];
