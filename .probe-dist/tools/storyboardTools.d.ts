import { z } from 'zod';
export declare const storyboardTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    sceneId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    sceneId: string;
}, {
    sceneId: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    shotList: z.ZodArray<z.ZodAny, "many">;
}, "strip", z.ZodTypeAny, {
    shotList: any[];
}, {
    shotList: any[];
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    panelId: z.ZodString;
    instruction: z.ZodString;
}, "strip", z.ZodTypeAny, {
    instruction: string;
    panelId: string;
}, {
    instruction: string;
    panelId: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    storyboardId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    storyboardId: string;
}, {
    storyboardId: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    panelId: z.ZodString;
    newDurationFrames: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    panelId: string;
    newDurationFrames: number;
}, {
    panelId: string;
    newDurationFrames: number;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    animaticId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    animaticId: string;
}, {
    animaticId: string;
}>>)[];
