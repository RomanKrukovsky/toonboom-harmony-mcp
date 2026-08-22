import { z } from 'zod';
export declare const openProjectSchema: z.ZodObject<{
    projectPath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    projectPath: string;
}, {
    projectPath: string;
}>;
export declare const closeProjectSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    projectPath?: string | undefined;
}, {
    projectPath?: string | undefined;
}>;
export declare const inspectSceneSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    projectPath?: string | undefined;
}, {
    projectPath?: string | undefined;
}>;
export declare const saveSceneSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>;
export declare const saveSceneAsSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    newPath: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    newPath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    newPath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>;
export declare const auditSceneSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    projectPath?: string | undefined;
}, {
    projectPath?: string | undefined;
}>;
export declare const fixCommonErrorsSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>;
export declare const setResolutionSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    width: z.ZodNumber;
    height: z.ZodNumber;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    width: number;
    height: number;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    width: number;
    height: number;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>;
export declare const setFpsSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    fps: z.ZodNumber;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    fps: number;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    fps: number;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>;
export declare const setLengthSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    frames: z.ZodNumber;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    frames: number;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    frames: number;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>;
export declare const createCameraSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    name: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>;
export declare const createDisplaySchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    parentGroup: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    parentGroup: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    name: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    parentGroup?: string | undefined;
}>;
export declare const createCompositeSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    parentGroup: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    parentGroup: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    name: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    parentGroup?: string | undefined;
}>;
export declare const exportPreviewSchema: z.ZodObject<{
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
}>;
