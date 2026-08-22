import { z } from 'zod';
export declare const assetRegistryTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    sceneId: z.ZodString;
    characters: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    locations: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    props: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    requiresLipSync: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    viewAngles: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
}, "strip", z.ZodTypeAny, {
    characters: string[];
    sceneId: string;
    props: string[];
    locations: string[];
    requiresLipSync: boolean;
    viewAngles: string[];
}, {
    sceneId: string;
    characters?: string[] | undefined;
    props?: string[] | undefined;
    locations?: string[] | undefined;
    requiresLipSync?: boolean | undefined;
    viewAngles?: string[] | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    assetId: z.ZodString;
    prompt: z.ZodString;
    assetType: z.ZodDefault<z.ZodOptional<z.ZodEnum<["character", "background", "prop", "rig", "palette", "audio", "font", "other"]>>>;
    view: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    outputPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    view: string;
    assetId: string;
    assetType: "audio" | "palette" | "character" | "background" | "rig" | "prop" | "other" | "font";
    outputPath?: string | undefined;
}, {
    prompt: string;
    assetId: string;
    outputPath?: string | undefined;
    view?: string | undefined;
    assetType?: "audio" | "palette" | "character" | "background" | "rig" | "prop" | "other" | "font" | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    filePath: z.ZodString;
    assetType: z.ZodEnum<["character", "background", "prop", "rig", "palette", "audio", "font", "other"]>;
    assetId: z.ZodOptional<z.ZodString>;
    registryDir: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    filePath: string;
    assetType: "audio" | "palette" | "character" | "background" | "rig" | "prop" | "other" | "font";
    assetId?: string | undefined;
    registryDir?: string | undefined;
}, {
    filePath: string;
    assetType: "audio" | "palette" | "character" | "background" | "rig" | "prop" | "other" | "font";
    assetId?: string | undefined;
    registryDir?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    filePath: z.ZodString;
    minWidth: z.ZodOptional<z.ZodNumber>;
    minHeight: z.ZodOptional<z.ZodNumber>;
    requireAlpha: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    expectedFormats: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    filePath: string;
    requireAlpha: boolean;
    minWidth?: number | undefined;
    minHeight?: number | undefined;
    expectedFormats?: string[] | undefined;
}, {
    filePath: string;
    minWidth?: number | undefined;
    minHeight?: number | undefined;
    requireAlpha?: boolean | undefined;
    expectedFormats?: string[] | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    assetId: z.ZodString;
    registryDir: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    assetId: string;
    registryDir?: string | undefined;
}, {
    assetId: string;
    registryDir?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    assetId: z.ZodString;
    approvedBy: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    registryDir: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    assetId: string;
    approvedBy: string;
    registryDir?: string | undefined;
}, {
    assetId: string;
    registryDir?: string | undefined;
    approvedBy?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    assetType: z.ZodOptional<z.ZodEnum<["character", "background", "prop", "rig", "palette", "audio", "font", "other"]>>;
    approvedOnly: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    nameContains: z.ZodOptional<z.ZodString>;
    registryDir: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    approvedOnly: boolean;
    assetType?: "audio" | "palette" | "character" | "background" | "rig" | "prop" | "other" | "font" | undefined;
    registryDir?: string | undefined;
    nameContains?: string | undefined;
}, {
    assetType?: "audio" | "palette" | "character" | "background" | "rig" | "prop" | "other" | "font" | undefined;
    registryDir?: string | undefined;
    approvedOnly?: boolean | undefined;
    nameContains?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    assetName: z.ZodString;
    outputDir: z.ZodString;
}, "strip", z.ZodTypeAny, {
    outputDir: string;
    assetName: string;
}, {
    outputDir: string;
    assetName: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    assetId: z.ZodOptional<z.ZodString>;
    filePath: z.ZodOptional<z.ZodString>;
    forbiddenSources: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    registryDir: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    filePath?: string | undefined;
    forbiddenSources?: string[] | undefined;
    assetId?: string | undefined;
    registryDir?: string | undefined;
}, {
    filePath?: string | undefined;
    forbiddenSources?: string[] | undefined;
    assetId?: string | undefined;
    registryDir?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    packageDir: z.ZodString;
    registryDir: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    packageDir: string;
    registryDir?: string | undefined;
}, {
    packageDir: string;
    registryDir?: string | undefined;
}>>)[];
