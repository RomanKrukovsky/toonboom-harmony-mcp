import { z } from 'zod';
export declare const drawingTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    projectPath?: string | undefined;
}, {
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    layerNodePath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    layerNodePath: string;
    projectPath?: string | undefined;
}, {
    layerNodePath: string;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    layerName: z.ZodString;
    parentGroup: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    parentGroup: string;
    layerName: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    layerName: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    parentGroup?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    layerNodePath: z.ZodString;
    drawingName: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    drawingName: string;
    layerNodePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    drawingName: string;
    layerNodePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    imagePath: z.ZodString;
    layerNodePath: z.ZodString;
    drawingName: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    drawingName: string;
    layerNodePath: string;
    imagePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    drawingName: string;
    layerNodePath: string;
    imagePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    sequenceFolderPath: z.ZodString;
    layerNodePath: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    layerNodePath: string;
    sequenceFolderPath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    layerNodePath: string;
    sequenceFolderPath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    layerNodePath: z.ZodString;
    drawingName: z.ZodString;
    newImagePath: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    drawingName: string;
    layerNodePath: string;
    newImagePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    drawingName: string;
    layerNodePath: string;
    newImagePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodString;
    drawingsPaths: z.ZodArray<z.ZodString, "many">;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    projectPath: string;
    drawingsPaths: string[];
    dryRun?: boolean | undefined;
}, {
    projectPath: string;
    drawingsPaths: string[];
    dryRun?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    layerNodePath: z.ZodString;
    sourceSubName: z.ZodString;
    targetSubNames: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    syncWithParentPeg: z.ZodOptional<z.ZodBoolean>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    layerNodePath: string;
    sourceSubName: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    targetSubNames?: string[] | undefined;
    syncWithParentPeg?: boolean | undefined;
}, {
    layerNodePath: string;
    sourceSubName: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    targetSubNames?: string[] | undefined;
    syncWithParentPeg?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    nodePath: z.ZodString;
    frame: z.ZodNumber;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    frame: number;
    nodePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    frame: number;
    nodePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>>)[];
