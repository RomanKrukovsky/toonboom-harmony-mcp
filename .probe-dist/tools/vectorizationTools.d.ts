import { z } from 'zod';
export declare const vectorizationTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    inputPath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    inputPath: string;
}, {
    inputPath: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    inputPath: z.ZodString;
    targetNode: z.ZodDefault<z.ZodString>;
    targetDrawing: z.ZodDefault<z.ZodString>;
    targetFrame: z.ZodDefault<z.ZodNumber>;
    artLayer: z.ZodDefault<z.ZodEnum<["underlay", "line", "color", "overlay"]>>;
    vectorizationMode: z.ZodDefault<z.ZodEnum<["black_and_white_lineart", "flat_colour_character", "coloured_illustration", "manual_guided"]>>;
    qualityPreset: z.ZodDefault<z.ZodEnum<["draft", "production", "archival"]>>;
    paletteMode: z.ZodDefault<z.ZodEnum<["create_new_palette", "map_to_existing_palette", "line_only"]>>;
    dryRun: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    dryRun: boolean;
    targetFrame: number;
    artLayer: "underlay" | "line" | "color" | "overlay";
    targetNode: string;
    qualityPreset: "production" | "draft" | "archival";
    inputPath: string;
    targetDrawing: string;
    vectorizationMode: "black_and_white_lineart" | "flat_colour_character" | "coloured_illustration" | "manual_guided";
    paletteMode: "create_new_palette" | "map_to_existing_palette" | "line_only";
}, {
    inputPath: string;
    dryRun?: boolean | undefined;
    targetFrame?: number | undefined;
    artLayer?: "underlay" | "line" | "color" | "overlay" | undefined;
    targetNode?: string | undefined;
    qualityPreset?: "production" | "draft" | "archival" | undefined;
    targetDrawing?: string | undefined;
    vectorizationMode?: "black_and_white_lineart" | "flat_colour_character" | "coloured_illustration" | "manual_guided" | undefined;
    paletteMode?: "create_new_palette" | "map_to_existing_palette" | "line_only" | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    confirmationToken: z.ZodString;
    previewHash: z.ZodString;
    sceneStateHash: z.ZodString;
    dryRun: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    confirm: z.ZodOptional<z.ZodBoolean>;
    confirmationText: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    dryRun: boolean;
    confirmationToken: string;
    previewHash: string;
    sceneStateHash: string;
    confirm?: boolean | undefined;
    confirmationText?: string | undefined;
}, {
    confirmationToken: string;
    previewHash: string;
    sceneStateHash: string;
    confirm?: boolean | undefined;
    dryRun?: boolean | undefined;
    confirmationText?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    targetNode: z.ZodString;
    targetDrawing: z.ZodString;
}, "strip", z.ZodTypeAny, {
    targetNode: string;
    targetDrawing: string;
}, {
    targetNode: string;
    targetDrawing: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    inputPath: z.ZodString;
    targetNode: z.ZodString;
    targetDrawing: z.ZodString;
    frame: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    frame: number;
    targetNode: string;
    inputPath: string;
    targetDrawing: string;
}, {
    targetNode: string;
    inputPath: string;
    targetDrawing: string;
    frame?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    runId: z.ZodString;
    confirm: z.ZodOptional<z.ZodBoolean>;
    confirmationText: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    runId: string;
    confirm?: boolean | undefined;
    confirmationText?: string | undefined;
}, {
    runId: string;
    confirm?: boolean | undefined;
    confirmationText?: string | undefined;
}>>)[];
