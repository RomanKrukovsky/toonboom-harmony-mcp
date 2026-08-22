import { z } from 'zod';
export declare const reviewLoopTools: import("./defineTool.js").TypedTool<z.ZodObject<{
    sceneId: z.ZodString;
    maxIterations: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    sceneId: string;
    maxIterations?: number | undefined;
}, {
    sceneId: string;
    maxIterations?: number | undefined;
}>>[];
