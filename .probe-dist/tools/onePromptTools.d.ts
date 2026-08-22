import { z } from 'zod';
/**
 * onePromptTools — the main entry points for the Moonshot mode.
 *
 * Each entry uses defineTool() so `args` is inferred from its own inputSchema;
 * a local ToolDef[] annotation would erase that back to `any`.
 */
export declare const onePromptTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    prompt: z.ZodString;
    targetDurationMinutes: z.ZodOptional<z.ZodNumber>;
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
    mode: z.ZodOptional<z.ZodEnum<["real", "simulation", "hybrid", "moonshot"]>>;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    mode?: "real" | "simulation" | "hybrid" | "moonshot" | undefined;
    fps?: number | undefined;
    resolution?: {
        width: number;
        height: number;
    } | undefined;
    targetDurationMinutes?: number | undefined;
}, {
    prompt: string;
    mode?: "real" | "simulation" | "hybrid" | "moonshot" | undefined;
    fps?: number | undefined;
    resolution?: {
        width: number;
        height: number;
    } | undefined;
    targetDurationMinutes?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    prompt: z.ZodString;
    targetDurationMinutes: z.ZodOptional<z.ZodNumber>;
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
    outputDir: z.ZodOptional<z.ZodString>;
    mode: z.ZodOptional<z.ZodEnum<["real", "simulation", "hybrid", "moonshot"]>>;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    mode?: "real" | "simulation" | "hybrid" | "moonshot" | undefined;
    fps?: number | undefined;
    outputDir?: string | undefined;
    resolution?: {
        width: number;
        height: number;
    } | undefined;
    targetDurationMinutes?: number | undefined;
}, {
    prompt: string;
    mode?: "real" | "simulation" | "hybrid" | "moonshot" | undefined;
    fps?: number | undefined;
    outputDir?: string | undefined;
    resolution?: {
        width: number;
        height: number;
    } | undefined;
    targetDurationMinutes?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    prompt: z.ZodString;
    targetDurationMinutes: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    targetDurationMinutes?: number | undefined;
}, {
    prompt: string;
    targetDurationMinutes?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    prompt: z.ZodString;
    episodePlan: z.ZodAny;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    episodePlan?: any;
}, {
    prompt: string;
    episodePlan?: any;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    prompt: z.ZodString;
    targetDurationMinutes: z.ZodOptional<z.ZodNumber>;
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
    prompt: string;
    fps?: number | undefined;
    resolution?: {
        width: number;
        height: number;
    } | undefined;
    targetDurationMinutes?: number | undefined;
}, {
    prompt: string;
    fps?: number | undefined;
    resolution?: {
        width: number;
        height: number;
    } | undefined;
    targetDurationMinutes?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    episodePlan: z.ZodAny;
}, "strip", z.ZodTypeAny, {
    episodePlan?: any;
}, {
    episodePlan?: any;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    analysis: z.ZodAny;
    seriesBible: z.ZodAny;
}, "strip", z.ZodTypeAny, {
    analysis?: any;
    seriesBible?: any;
}, {
    analysis?: any;
    seriesBible?: any;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    characterSpecs: z.ZodArray<z.ZodAny, "many">;
    episodePlan: z.ZodAny;
    rig360Specs: z.ZodArray<z.ZodAny, "many">;
}, "strip", z.ZodTypeAny, {
    characterSpecs: any[];
    rig360Specs: any[];
    episodePlan?: any;
}, {
    characterSpecs: any[];
    rig360Specs: any[];
    episodePlan?: any;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    characterSpecs: z.ZodArray<z.ZodAny, "many">;
}, "strip", z.ZodTypeAny, {
    characterSpecs: any[];
}, {
    characterSpecs: any[];
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
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
    prompt: z.ZodString;
    targetDurationMinutes: z.ZodOptional<z.ZodNumber>;
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
    outputDir: z.ZodOptional<z.ZodString>;
    mode: z.ZodOptional<z.ZodEnum<["real", "simulation", "hybrid", "moonshot"]>>;
    maxIterations: z.ZodOptional<z.ZodNumber>;
    targetScore: z.ZodOptional<z.ZodNumber>;
    executeInHarmony: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    mode?: "real" | "simulation" | "hybrid" | "moonshot" | undefined;
    fps?: number | undefined;
    outputDir?: string | undefined;
    resolution?: {
        width: number;
        height: number;
    } | undefined;
    targetDurationMinutes?: number | undefined;
    maxIterations?: number | undefined;
    targetScore?: number | undefined;
    executeInHarmony?: boolean | undefined;
}, {
    prompt: string;
    mode?: "real" | "simulation" | "hybrid" | "moonshot" | undefined;
    fps?: number | undefined;
    outputDir?: string | undefined;
    resolution?: {
        width: number;
        height: number;
    } | undefined;
    targetDurationMinutes?: number | undefined;
    maxIterations?: number | undefined;
    targetScore?: number | undefined;
    executeInHarmony?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    prompt: z.ZodString;
    targetDurationMinutes: z.ZodOptional<z.ZodNumber>;
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
    outputDir: z.ZodOptional<z.ZodString>;
    mode: z.ZodOptional<z.ZodEnum<["real", "simulation", "hybrid", "moonshot"]>>;
    humanApproved: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    mode?: "real" | "simulation" | "hybrid" | "moonshot" | undefined;
    fps?: number | undefined;
    outputDir?: string | undefined;
    resolution?: {
        width: number;
        height: number;
    } | undefined;
    targetDurationMinutes?: number | undefined;
    humanApproved?: boolean | undefined;
}, {
    prompt: string;
    mode?: "real" | "simulation" | "hybrid" | "moonshot" | undefined;
    fps?: number | undefined;
    outputDir?: string | undefined;
    resolution?: {
        width: number;
        height: number;
    } | undefined;
    targetDurationMinutes?: number | undefined;
    humanApproved?: boolean | undefined;
}>>)[];
