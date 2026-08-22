import { z } from 'zod';
export declare const paletteTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    projectPath?: string | undefined;
}, {
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    paletteName: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    paletteName: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    paletteName: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    paletteFilePath: z.ZodString;
    backupDirectoryPath: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    paletteFilePath: string;
    backupDirectoryPath: string;
    dryRun?: boolean | undefined;
}, {
    paletteFilePath: string;
    backupDirectoryPath: string;
    dryRun?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sourcePaletteFilePath: z.ZodString;
    targetPaletteLibraryPath: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    sourcePaletteFilePath: string;
    targetPaletteLibraryPath: string;
    dryRun?: boolean | undefined;
}, {
    sourcePaletteFilePath: string;
    targetPaletteLibraryPath: string;
    dryRun?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    paletteFilePath: z.ZodString;
    exportDestinationPath: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    paletteFilePath: string;
    exportDestinationPath: string;
    dryRun?: boolean | undefined;
}, {
    paletteFilePath: string;
    exportDestinationPath: string;
    dryRun?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    paletteName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    paletteName: string;
    projectPath?: string | undefined;
}, {
    paletteName: string;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    paletteName: z.ZodString;
    colourName: z.ZodString;
    rgba: z.ZodArray<z.ZodNumber, "many">;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    rgba: number[];
    paletteName: string;
    colourName: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    rgba: number[];
    paletteName: string;
    colourName: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    paletteName: z.ZodString;
    oldColourName: z.ZodString;
    newColourName: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    paletteName: string;
    oldColourName: string;
    newColourName: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    paletteName: string;
    oldColourName: string;
    newColourName: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    paletteName: z.ZodString;
    colourName: z.ZodString;
    newRgba: z.ZodArray<z.ZodNumber, "many">;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    paletteName: string;
    colourName: string;
    newRgba: number[];
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    paletteName: string;
    colourName: string;
    newRgba: number[];
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>>)[];
