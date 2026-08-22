import { z } from 'zod';
export declare const sceneTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    projectPath: string;
}, {
    projectPath: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    projectPath?: string | undefined;
}, {
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    query: z.ZodString;
}, "strip", z.ZodTypeAny, {
    query: string;
    projectPath?: string | undefined;
}, {
    query: string;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    nodePath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    nodePath: string;
    projectPath?: string | undefined;
}, {
    nodePath: string;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    parentGroup: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    nodeType: z.ZodString;
    nodeName: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    nodeName: string;
    parentGroup: string;
    nodeType: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    nodeName: string;
    nodeType: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    parentGroup?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    nodePath: z.ZodString;
    confirm: z.ZodOptional<z.ZodBoolean>;
    confirmationText: z.ZodOptional<z.ZodString>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    nodePath: string;
    confirm?: boolean | undefined;
    dryRun?: boolean | undefined;
    confirmationText?: string | undefined;
    projectPath?: string | undefined;
}, {
    nodePath: string;
    confirm?: boolean | undefined;
    dryRun?: boolean | undefined;
    confirmationText?: string | undefined;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    srcNodePath: z.ZodString;
    destNodePath: z.ZodString;
    srcPort: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    destPort: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    srcNodePath: string;
    destNodePath: string;
    srcPort: number;
    destPort: number;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    srcNodePath: string;
    destNodePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    srcPort?: number | undefined;
    destPort?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    destNodePath: z.ZodString;
    destPort: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    destNodePath: string;
    destPort: number;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    destNodePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    destPort?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    nodePath: z.ZodString;
    attributeName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    nodePath: string;
    attributeName: string;
    projectPath?: string | undefined;
}, {
    nodePath: string;
    attributeName: string;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    nodePath: z.ZodString;
    attributeName: z.ZodString;
    value: z.ZodAny;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    nodePath: string;
    attributeName: string;
    dryRun?: boolean | undefined;
    value?: any;
    projectPath?: string | undefined;
}, {
    nodePath: string;
    attributeName: string;
    dryRun?: boolean | undefined;
    value?: any;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    nodePath: z.ZodString;
    attributeName: z.ZodString;
    frame: z.ZodNumber;
    value: z.ZodAny;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    frame: number;
    nodePath: string;
    attributeName: string;
    dryRun?: boolean | undefined;
    value?: any;
    projectPath?: string | undefined;
}, {
    frame: number;
    nodePath: string;
    attributeName: string;
    dryRun?: boolean | undefined;
    value?: any;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    assetPath: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    assetPath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    assetPath: string;
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
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    frame: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    outputPath: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    frame: number;
    outputPath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    outputPath: string;
    dryRun?: boolean | undefined;
    frame?: number | undefined;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    scenePlanPath: z.ZodOptional<z.ZodString>;
    scenePlan: z.ZodOptional<z.ZodAny>;
    projectPath: z.ZodOptional<z.ZodString>;
    outputDir: z.ZodOptional<z.ZodString>;
    mode: z.ZodOptional<z.ZodEnum<["real", "hybrid", "simulation"]>>;
}, "strip", z.ZodTypeAny, {
    mode?: "real" | "simulation" | "hybrid" | undefined;
    projectPath?: string | undefined;
    scenePlanPath?: string | undefined;
    scenePlan?: any;
    outputDir?: string | undefined;
}, {
    mode?: "real" | "simulation" | "hybrid" | undefined;
    projectPath?: string | undefined;
    scenePlanPath?: string | undefined;
    scenePlan?: any;
    outputDir?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    outputDir: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    outputDir?: string | undefined;
}, {
    outputDir?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    tempDir: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tempDir?: string | undefined;
}, {
    tempDir?: string | undefined;
}>>)[];
