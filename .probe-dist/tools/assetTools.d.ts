import { z } from 'zod';
export declare const assetTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    libraryPath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    libraryPath: string;
}, {
    libraryPath: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    templatePath: z.ZodString;
    targetDirectory: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    templatePath: string;
    targetDirectory: string;
    dryRun?: boolean | undefined;
}, {
    templatePath: string;
    targetDirectory: string;
    dryRun?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sourcePath: z.ZodString;
    templateDestinationPath: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    sourcePath: string;
    templateDestinationPath: string;
    dryRun?: boolean | undefined;
}, {
    sourcePath: string;
    templateDestinationPath: string;
    dryRun?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    paletteLibraryPath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    paletteLibraryPath: string;
}, {
    paletteLibraryPath: string;
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
    projectPath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    projectPath: string;
}, {
    projectPath: string;
}>>)[];
