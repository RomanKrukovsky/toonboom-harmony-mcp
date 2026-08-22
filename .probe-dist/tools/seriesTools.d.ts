import { z } from 'zod';
/**
 * seriesTools — Autonomous Series Mode entry points (ACTOR §9).
 */
export declare const seriesTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    prompt: z.ZodString;
    targetDurationMinutes: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    targetDurationMinutes?: number | undefined;
}, {
    prompt: string;
    targetDurationMinutes?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    seriesBible: z.ZodAny;
    count: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    count: number;
    seriesBible?: any;
}, {
    seriesBible?: any;
    count?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    seriesBible: z.ZodAny;
    episodeNumber: z.ZodNumber;
    durationMinutes: z.ZodOptional<z.ZodNumber>;
    fps: z.ZodOptional<z.ZodNumber>;
    resolution: z.ZodOptional<z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
    }, {
        width: number;
        height: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    episodeNumber: number;
    fps?: number | undefined;
    resolution?: {
        width: number;
        height: number;
    } | undefined;
    durationMinutes?: number | undefined;
    seriesBible?: any;
}, {
    episodeNumber: number;
    fps?: number | undefined;
    resolution?: {
        width: number;
        height: number;
    } | undefined;
    durationMinutes?: number | undefined;
    seriesBible?: any;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    episodePlan: z.ZodAny;
}, "strip", z.ZodTypeAny, {
    episodePlan?: any;
}, {
    episodePlan?: any;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    seriesBible: z.ZodAny;
}, "strip", z.ZodTypeAny, {
    seriesBible?: any;
}, {
    seriesBible?: any;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    seriesBible: z.ZodAny;
    episodeNumber: z.ZodNumber;
    durationMinutes: z.ZodOptional<z.ZodNumber>;
    outputDir: z.ZodOptional<z.ZodString>;
    mode: z.ZodOptional<z.ZodEnum<["real", "simulation", "hybrid", "moonshot"]>>;
}, "strip", z.ZodTypeAny, {
    episodeNumber: number;
    mode?: "real" | "simulation" | "hybrid" | "moonshot" | undefined;
    outputDir?: string | undefined;
    durationMinutes?: number | undefined;
    seriesBible?: any;
}, {
    episodeNumber: number;
    mode?: "real" | "simulation" | "hybrid" | "moonshot" | undefined;
    outputDir?: string | undefined;
    durationMinutes?: number | undefined;
    seriesBible?: any;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    episodeResults: z.ZodArray<z.ZodAny, "many">;
    outputDir: z.ZodString;
}, "strip", z.ZodTypeAny, {
    outputDir: string;
    episodeResults: any[];
}, {
    outputDir: string;
    episodeResults: any[];
}>>)[];
