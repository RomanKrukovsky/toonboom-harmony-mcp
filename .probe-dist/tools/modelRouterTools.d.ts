import { z } from 'zod';
export declare const modelRouterTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    taskType: z.ZodString;
    priority: z.ZodDefault<z.ZodEnum<["speed", "quality", "cost", "free"]>>;
}, "strip", z.ZodTypeAny, {
    priority: "quality" | "free" | "speed" | "cost";
    taskType: string;
}, {
    taskType: string;
    priority?: "quality" | "free" | "speed" | "cost" | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    prompt: z.ZodString;
    systemPrompt: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodString>;
    temperature: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    temperature: number;
    model?: string | undefined;
    systemPrompt?: string | undefined;
}, {
    prompt: string;
    model?: string | undefined;
    systemPrompt?: string | undefined;
    temperature?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>)[];
