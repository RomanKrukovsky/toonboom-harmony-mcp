import { z } from 'zod';
export declare const sceneAssemblyTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodString;
    filePath: z.ZodString;
    layerName: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    scale: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    projectPath: string;
    layerName: string;
    scale: number;
    filePath: string;
    dryRun?: boolean | undefined;
}, {
    projectPath: string;
    filePath: string;
    dryRun?: boolean | undefined;
    layerName?: string | undefined;
    scale?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodString;
    characterName: z.ZodString;
    audioPath: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    projectPath: string;
    characterName: string;
    audioPath: string;
    dryRun?: boolean | undefined;
}, {
    projectPath: string;
    characterName: string;
    audioPath: string;
    dryRun?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodString;
    characterName: z.ZodString;
    x: z.ZodOptional<z.ZodNumber>;
    y: z.ZodOptional<z.ZodNumber>;
    preset: z.ZodOptional<z.ZodEnum<["left", "center", "right", "close_up"]>>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    projectPath: string;
    characterName: string;
    dryRun?: boolean | undefined;
    x?: number | undefined;
    y?: number | undefined;
    preset?: "center" | "left" | "right" | "close_up" | undefined;
}, {
    projectPath: string;
    characterName: string;
    dryRun?: boolean | undefined;
    x?: number | undefined;
    y?: number | undefined;
    preset?: "center" | "left" | "right" | "close_up" | undefined;
}>>)[];
