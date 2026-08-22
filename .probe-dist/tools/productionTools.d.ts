import { z } from 'zod';
export declare const productionTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    dryRun?: boolean | undefined;
    description?: string | undefined;
}, {
    name: string;
    dryRun?: boolean | undefined;
    description?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    productionId: z.ZodNumber;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    productionId: number;
    dryRun?: boolean | undefined;
    description?: string | undefined;
}, {
    name: string;
    productionId: number;
    dryRun?: boolean | undefined;
    description?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    episodeId: z.ZodNumber;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    episodeId: number;
    dryRun?: boolean | undefined;
    description?: string | undefined;
}, {
    name: string;
    episodeId: number;
    dryRun?: boolean | undefined;
    description?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sequenceId: z.ZodNumber;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    harmonyEnv: z.ZodOptional<z.ZodString>;
    harmonyJob: z.ZodOptional<z.ZodString>;
    harmonyScene: z.ZodOptional<z.ZodString>;
    harmonyVersion: z.ZodOptional<z.ZodNumber>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    sequenceId: number;
    dryRun?: boolean | undefined;
    description?: string | undefined;
    harmonyEnv?: string | undefined;
    harmonyJob?: string | undefined;
    harmonyScene?: string | undefined;
    harmonyVersion?: number | undefined;
}, {
    name: string;
    sequenceId: number;
    dryRun?: boolean | undefined;
    description?: string | undefined;
    harmonyEnv?: string | undefined;
    harmonyJob?: string | undefined;
    harmonyScene?: string | undefined;
    harmonyVersion?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    shotId: z.ZodNumber;
    name: z.ZodString;
    assignedUserId: z.ZodOptional<z.ZodNumber>;
    dueDate: z.ZodOptional<z.ZodString>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    shotId: number;
    dryRun?: boolean | undefined;
    assignedUserId?: number | undefined;
    dueDate?: string | undefined;
}, {
    name: string;
    shotId: number;
    dryRun?: boolean | undefined;
    assignedUserId?: number | undefined;
    dueDate?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    entityType: z.ZodEnum<["shot", "task"]>;
    entityId: z.ZodNumber;
    status: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    status: string;
    entityType: "shot" | "task";
    entityId: number;
    dryRun?: boolean | undefined;
}, {
    status: string;
    entityType: "shot" | "task";
    entityId: number;
    dryRun?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    episodeId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    episodeId: number;
}, {
    episodeId: number;
}>>)[];
