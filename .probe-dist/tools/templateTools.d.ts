import { z } from 'zod';
export declare const templateTools: (import("./defineTool.js").TypedTool<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    templatePath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    templatePath: string;
}, {
    templatePath: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    templatePath: z.ZodString;
    targetPath: z.ZodString;
    width: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    height: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    fps: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    frames: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    width: number;
    height: number;
    fps: number;
    frames: number;
    templatePath: string;
    targetPath: string;
    dryRun?: boolean | undefined;
}, {
    templatePath: string;
    targetPath: string;
    dryRun?: boolean | undefined;
    width?: number | undefined;
    height?: number | undefined;
    fps?: number | undefined;
    frames?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodString;
    rigPath: z.ZodString;
    characterName: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    projectPath: string;
    characterName: string;
    rigPath: string;
    dryRun?: boolean | undefined;
}, {
    projectPath: string;
    characterName: string;
    rigPath: string;
    dryRun?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodString;
    presetName: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    projectPath: string;
    presetName: string;
    dryRun?: boolean | undefined;
}, {
    projectPath: string;
    presetName: string;
    dryRun?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodString;
    presetType: z.ZodString;
    targetNode: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    projectPath: string;
    targetNode: string;
    presetType: string;
    dryRun?: boolean | undefined;
}, {
    projectPath: string;
    targetNode: string;
    presetType: string;
    dryRun?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodString;
    mouthChartName: z.ZodString;
    lipsyncData: z.ZodOptional<z.ZodAny>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    projectPath: string;
    mouthChartName: string;
    dryRun?: boolean | undefined;
    lipsyncData?: any;
}, {
    projectPath: string;
    mouthChartName: string;
    dryRun?: boolean | undefined;
    lipsyncData?: any;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    packName: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    packName: string;
    dryRun?: boolean | undefined;
}, {
    packName: string;
    dryRun?: boolean | undefined;
}>>)[];
