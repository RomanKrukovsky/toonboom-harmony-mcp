import { z } from 'zod';
export declare const listNodesSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    projectPath?: string | undefined;
}, {
    projectPath?: string | undefined;
}>;
export declare const searchNodesSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    query: z.ZodString;
}, "strip", z.ZodTypeAny, {
    query: string;
    projectPath?: string | undefined;
}, {
    query: string;
    projectPath?: string | undefined;
}>;
export declare const getNodeSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    nodePath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    nodePath: string;
    projectPath?: string | undefined;
}, {
    nodePath: string;
    projectPath?: string | undefined;
}>;
export declare const createNodeSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    parentGroup: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    nodeType: z.ZodString;
    nodeName: z.ZodString;
    separatePosition: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    lockDrawingMode: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    nodeName: string;
    parentGroup: string;
    nodeType: string;
    separatePosition: boolean;
    lockDrawingMode: boolean;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    nodeName: string;
    nodeType: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    parentGroup?: string | undefined;
    separatePosition?: boolean | undefined;
    lockDrawingMode?: boolean | undefined;
}>;
export declare const deleteNodeSchema: z.ZodObject<{
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
}>;
export declare const renameNodeSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    nodePath: z.ZodString;
    newName: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    newName: string;
    nodePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    newName: string;
    nodePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>;
export declare const connectNodesSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    srcNodePath: z.ZodString;
    destNodePath: z.ZodString;
    srcPort: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    destPort: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    semanticPort: z.ZodOptional<z.ZodEnum<["default", "matte", "image", "cutter_matte", "cutter_image", "pass_through", "line_art", "color_art"]>>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    srcNodePath: string;
    destNodePath: string;
    srcPort: number;
    destPort: number;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    semanticPort?: "image" | "default" | "matte" | "cutter_matte" | "cutter_image" | "pass_through" | "line_art" | "color_art" | undefined;
}, {
    srcNodePath: string;
    destNodePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    srcPort?: number | undefined;
    destPort?: number | undefined;
    semanticPort?: "image" | "default" | "matte" | "cutter_matte" | "cutter_image" | "pass_through" | "line_art" | "color_art" | undefined;
}>;
export declare const disconnectNodesSchema: z.ZodObject<{
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
}>;
export declare const getNodeAttrSchema: z.ZodObject<{
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
}>;
export declare const setNodeAttrSchema: z.ZodObject<{
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
}>;
export declare const groupNodesSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    nodePaths: z.ZodArray<z.ZodString, "many">;
    groupName: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    nodePaths: string[];
    groupName: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    nodePaths: string[];
    groupName: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>;
export declare const ungroupNodesSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    groupPath: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    groupPath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    groupPath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>;
export declare const findBrokenConnectionsSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    projectPath?: string | undefined;
}, {
    projectPath?: string | undefined;
}>;
export declare const cleanUnusedNodesSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>;
export declare const createEffectChainSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    targetNodePath: z.ZodString;
    effects: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    preset: z.ZodOptional<z.ZodEnum<["seamless_autopatch_arm", "seamless_limb", "simple_overlay_arm", "eye_cutter_mask", "kinematic_isolation", "multi_angle_deformation", "light_shading"]>>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    targetNodePath: string;
    effects: string[];
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    preset?: "seamless_autopatch_arm" | "seamless_limb" | "simple_overlay_arm" | "eye_cutter_mask" | "kinematic_isolation" | "multi_angle_deformation" | "light_shading" | undefined;
}, {
    targetNodePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    effects?: string[] | undefined;
    preset?: "seamless_autopatch_arm" | "seamless_limb" | "simple_overlay_arm" | "eye_cutter_mask" | "kinematic_isolation" | "multi_angle_deformation" | "light_shading" | undefined;
}>;
export declare const resetToRestPoseSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    nodePath: z.ZodOptional<z.ZodString>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    nodePath?: string | undefined;
}, {
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    nodePath?: string | undefined;
}>;
export declare const resolveCyclesSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>;
export declare const releaseLockSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    projectPath?: string | undefined;
}, {
    projectPath?: string | undefined;
}>;
export declare const setWriteRgbaSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    writeNodePath: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    writeNodePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    writeNodePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>;
export declare const setCompositePassthroughSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    compositeNodePath: z.ZodString;
    mode: z.ZodDefault<z.ZodOptional<z.ZodEnum<["Pass Through", "As Bitmap", "As Vector"]>>>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    mode: "Pass Through" | "As Bitmap" | "As Vector";
    compositeNodePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    compositeNodePath: string;
    dryRun?: boolean | undefined;
    mode?: "Pass Through" | "As Bitmap" | "As Vector" | undefined;
    projectPath?: string | undefined;
}>;
