import { z } from 'zod';
/**
 * Planner tools — bridge between production-plan sources (Kitsu, shot list,
 * file on disk) and Harmony Autopilot's execution layer.
 *
 * Marketing must-have items implemented here:
 *  - scene_plan.json schema (locked, versioned)
 *  - Kitsu ingest (highest-value integration)
 *  - shot list file import (CSV/JSON)
 *  - time-savings report
 */
export declare const plannerTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    plan: z.ZodAny;
}, "strip", z.ZodTypeAny, {
    plan?: any;
}, {
    plan?: any;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    filePath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    filePath: string;
}, {
    filePath: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    baseUrl: z.ZodString;
    token: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
    production: z.ZodString;
    episode: z.ZodString;
}, "strip", z.ZodTypeAny, {
    production: string;
    episode: string;
    baseUrl: string;
    password?: string | undefined;
    token?: string | undefined;
    email?: string | undefined;
}, {
    production: string;
    episode: string;
    baseUrl: string;
    password?: string | undefined;
    token?: string | undefined;
    email?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    baseUrl: z.ZodString;
    token: z.ZodOptional<z.ZodString>;
    shotTaskId: z.ZodString;
    status: z.ZodEnum<["todo", "in_progress", "ready_for", "done", "failed"]>;
    comment: z.ZodOptional<z.ZodString>;
    confirm: z.ZodBoolean;
    confirmationText: z.ZodString;
}, "strip", z.ZodTypeAny, {
    confirm: boolean;
    status: "failed" | "todo" | "in_progress" | "ready_for" | "done";
    confirmationText: string;
    baseUrl: string;
    shotTaskId: string;
    token?: string | undefined;
    comment?: string | undefined;
}, {
    confirm: boolean;
    status: "failed" | "todo" | "in_progress" | "ready_for" | "done";
    confirmationText: string;
    baseUrl: string;
    shotTaskId: string;
    token?: string | undefined;
    comment?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    filePath: z.ZodString;
    production: z.ZodString;
    episode: z.ZodString;
    fps: z.ZodDefault<z.ZodNumber>;
    defaultResolution: z.ZodOptional<z.ZodObject<{
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
    fps: number;
    production: string;
    episode: string;
    filePath: string;
    defaultResolution?: {
        width: number;
        height: number;
    } | undefined;
}, {
    production: string;
    episode: string;
    filePath: string;
    fps?: number | undefined;
    defaultResolution?: {
        width: number;
        height: number;
    } | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sceneName: z.ZodString;
    manualMinutes: z.ZodNumber;
    autopilotMinutes: z.ZodNumber;
    artistHourlyRateUSD: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    sceneName: string;
    manualMinutes: number;
    autopilotMinutes: number;
    artistHourlyRateUSD: number;
}, {
    sceneName: string;
    manualMinutes: number;
    autopilotMinutes: number;
    artistHourlyRateUSD?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodString;
    outputDir: z.ZodString;
    packageName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    projectPath: string;
    outputDir: string;
    packageName: string;
}, {
    projectPath: string;
    outputDir: string;
    packageName: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    prompt: z.ZodString;
    production: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    episode: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    sceneName: z.ZodOptional<z.ZodString>;
    fps: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    durationSeconds: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    validatePlan: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    saveToPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    fps: number;
    durationSeconds: number;
    production: string;
    episode: string;
    prompt: string;
    validatePlan: boolean;
    sceneName?: string | undefined;
    saveToPath?: string | undefined;
}, {
    prompt: string;
    fps?: number | undefined;
    durationSeconds?: number | undefined;
    sceneName?: string | undefined;
    production?: string | undefined;
    episode?: string | undefined;
    saveToPath?: string | undefined;
    validatePlan?: boolean | undefined;
}>>)[];
