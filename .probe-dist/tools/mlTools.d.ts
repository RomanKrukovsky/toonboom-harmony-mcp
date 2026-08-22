import { z } from 'zod';
export declare const mlTools: (import("./defineTool.js").TypedTool<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    modelId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    modelId: string;
}, {
    modelId: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    videoPath: z.ZodString;
    modelId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    videoPath: string;
    modelId?: string | undefined;
}, {
    videoPath: string;
    modelId?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    videoPath: z.ZodString;
    queryPoints: z.ZodArray<z.ZodObject<{
        pointId: z.ZodString;
        x: z.ZodNumber;
        y: z.ZodNumber;
        frame: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
        frame: number;
        pointId: string;
    }, {
        x: number;
        y: number;
        frame: number;
        pointId: string;
    }>, "many">;
    modelId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    videoPath: string;
    queryPoints: {
        x: number;
        y: number;
        frame: number;
        pointId: string;
    }[];
    modelId?: string | undefined;
}, {
    videoPath: string;
    queryPoints: {
        x: number;
        y: number;
        frame: number;
        pointId: string;
    }[];
    modelId?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    audioPath: z.ZodString;
    modelId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    audioPath: string;
    modelId?: string | undefined;
}, {
    audioPath: string;
    modelId?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    videoPath: z.ZodString;
    tasks: z.ZodArray<z.ZodString, "many">;
    audioPath: z.ZodOptional<z.ZodString>;
    profile: z.ZodOptional<z.ZodString>;
    quality: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    videoPath: string;
    tasks: string[];
    quality?: string | undefined;
    audioPath?: string | undefined;
    profile?: string | undefined;
}, {
    videoPath: string;
    tasks: string[];
    quality?: string | undefined;
    audioPath?: string | undefined;
    profile?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    jobId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    jobId: string;
}, {
    jobId: string;
}>>)[];
