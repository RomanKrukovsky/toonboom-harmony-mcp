import { z } from 'zod';
export declare const getTimelineSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    projectPath?: string | undefined;
}, {
    projectPath?: string | undefined;
}>;
export declare const setFrameRangeSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    startFrame: z.ZodNumber;
    endFrame: z.ZodNumber;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    startFrame: number;
    endFrame: number;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    startFrame: number;
    endFrame: number;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>;
export declare const setExposureSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    nodePath: z.ZodString;
    startFrame: z.ZodOptional<z.ZodNumber>;
    duration: z.ZodOptional<z.ZodNumber>;
    drawingName: z.ZodOptional<z.ZodString>;
    exposures: z.ZodOptional<z.ZodArray<z.ZodObject<{
        startFrame: z.ZodNumber;
        duration: z.ZodNumber;
        drawingName: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        duration: number;
        startFrame: number;
        drawingName: string;
    }, {
        duration: number;
        startFrame: number;
        drawingName: string;
    }>, "many">>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    nodePath: string;
    dryRun?: boolean | undefined;
    duration?: number | undefined;
    startFrame?: number | undefined;
    exposures?: {
        duration: number;
        startFrame: number;
        drawingName: string;
    }[] | undefined;
    projectPath?: string | undefined;
    drawingName?: string | undefined;
}, {
    nodePath: string;
    dryRun?: boolean | undefined;
    duration?: number | undefined;
    startFrame?: number | undefined;
    exposures?: {
        duration: number;
        startFrame: number;
        drawingName: string;
    }[] | undefined;
    projectPath?: string | undefined;
    drawingName?: string | undefined;
}>;
export declare const clearExposureSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    nodePath: z.ZodString;
    startFrame: z.ZodNumber;
    duration: z.ZodNumber;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    duration: number;
    startFrame: number;
    nodePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    duration: number;
    startFrame: number;
    nodePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>;
export declare const createKeyframeSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    nodePath: z.ZodString;
    attributeName: z.ZodString;
    frame: z.ZodNumber;
    value: z.ZodNumber;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    value: number;
    frame: number;
    nodePath: string;
    attributeName: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    value: number;
    frame: number;
    nodePath: string;
    attributeName: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>;
export declare const moveKeyframeSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    nodePath: z.ZodString;
    attributeName: z.ZodString;
    sourceFrame: z.ZodNumber;
    targetFrame: z.ZodNumber;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    sourceFrame: number;
    nodePath: string;
    attributeName: string;
    targetFrame: number;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    sourceFrame: number;
    nodePath: string;
    attributeName: string;
    targetFrame: number;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>;
export declare const copyKeyframesSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    nodePath: z.ZodString;
    attributeName: z.ZodString;
    startFrame: z.ZodNumber;
    endFrame: z.ZodNumber;
    targetFrame: z.ZodNumber;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    startFrame: number;
    endFrame: number;
    nodePath: string;
    attributeName: string;
    targetFrame: number;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    startFrame: number;
    endFrame: number;
    nodePath: string;
    attributeName: string;
    targetFrame: number;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>;
export declare const deleteKeyframesSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    nodePath: z.ZodString;
    attributeName: z.ZodString;
    startFrame: z.ZodNumber;
    endFrame: z.ZodNumber;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    startFrame: number;
    endFrame: number;
    nodePath: string;
    attributeName: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    startFrame: number;
    endFrame: number;
    nodePath: string;
    attributeName: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>;
export declare const createHoldSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    nodePath: z.ZodString;
    startFrame: z.ZodNumber;
    holdFrames: z.ZodNumber;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    startFrame: number;
    nodePath: string;
    holdFrames: number;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    startFrame: number;
    nodePath: string;
    holdFrames: number;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>;
export declare const createBlinkSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    eyeNodePath: z.ZodString;
    blinkFrame: z.ZodNumber;
    duration: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    duration: number;
    eyeNodePath: string;
    blinkFrame: number;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    eyeNodePath: string;
    blinkFrame: number;
    dryRun?: boolean | undefined;
    duration?: number | undefined;
    projectPath?: string | undefined;
}>;
export declare const createCameraMoveSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    cameraNodePath: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    startFrame: z.ZodNumber;
    endFrame: z.ZodNumber;
    startPos: z.ZodArray<z.ZodNumber, "many">;
    endPos: z.ZodArray<z.ZodNumber, "many">;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    startFrame: number;
    endFrame: number;
    cameraNodePath: string;
    startPos: number[];
    endPos: number[];
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    startFrame: number;
    endFrame: number;
    startPos: number[];
    endPos: number[];
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    cameraNodePath?: string | undefined;
}>;
export declare const exportOtioSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    outputPath: z.ZodOptional<z.ZodString>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    outputPath?: string | undefined;
}, {
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    outputPath?: string | undefined;
}>;
export declare const importOtioSchema: z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    otioFilePath: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    otioFilePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    otioFilePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>;
