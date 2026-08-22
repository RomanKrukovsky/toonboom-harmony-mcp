export declare const timelineTools: (import("./defineTool.js").TypedTool<import("zod").ZodObject<{
    projectPath: import("zod").ZodOptional<import("zod").ZodString>;
}, "strip", import("zod").ZodTypeAny, {
    projectPath?: string | undefined;
}, {
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<import("zod").ZodObject<{
    projectPath: import("zod").ZodOptional<import("zod").ZodString>;
    startFrame: import("zod").ZodNumber;
    endFrame: import("zod").ZodNumber;
    dryRun: import("zod").ZodOptional<import("zod").ZodBoolean>;
}, "strip", import("zod").ZodTypeAny, {
    startFrame: number;
    endFrame: number;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    startFrame: number;
    endFrame: number;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<import("zod").ZodObject<{
    projectPath: import("zod").ZodOptional<import("zod").ZodString>;
    nodePath: import("zod").ZodString;
    startFrame: import("zod").ZodOptional<import("zod").ZodNumber>;
    duration: import("zod").ZodOptional<import("zod").ZodNumber>;
    drawingName: import("zod").ZodOptional<import("zod").ZodString>;
    exposures: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
        startFrame: import("zod").ZodNumber;
        duration: import("zod").ZodNumber;
        drawingName: import("zod").ZodString;
    }, "strip", import("zod").ZodTypeAny, {
        duration: number;
        startFrame: number;
        drawingName: string;
    }, {
        duration: number;
        startFrame: number;
        drawingName: string;
    }>, "many">>;
    dryRun: import("zod").ZodOptional<import("zod").ZodBoolean>;
}, "strip", import("zod").ZodTypeAny, {
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
}>> | import("./defineTool.js").TypedTool<import("zod").ZodObject<{
    projectPath: import("zod").ZodOptional<import("zod").ZodString>;
    nodePath: import("zod").ZodString;
    startFrame: import("zod").ZodNumber;
    duration: import("zod").ZodNumber;
    dryRun: import("zod").ZodOptional<import("zod").ZodBoolean>;
}, "strip", import("zod").ZodTypeAny, {
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
}>> | import("./defineTool.js").TypedTool<import("zod").ZodObject<{
    projectPath: import("zod").ZodOptional<import("zod").ZodString>;
    nodePath: import("zod").ZodString;
    attributeName: import("zod").ZodString;
    frame: import("zod").ZodNumber;
    value: import("zod").ZodNumber;
    dryRun: import("zod").ZodOptional<import("zod").ZodBoolean>;
}, "strip", import("zod").ZodTypeAny, {
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
}>> | import("./defineTool.js").TypedTool<import("zod").ZodObject<{
    projectPath: import("zod").ZodOptional<import("zod").ZodString>;
    nodePath: import("zod").ZodString;
    attributeName: import("zod").ZodString;
    sourceFrame: import("zod").ZodNumber;
    targetFrame: import("zod").ZodNumber;
    dryRun: import("zod").ZodOptional<import("zod").ZodBoolean>;
}, "strip", import("zod").ZodTypeAny, {
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
}>> | import("./defineTool.js").TypedTool<import("zod").ZodObject<{
    projectPath: import("zod").ZodOptional<import("zod").ZodString>;
    nodePath: import("zod").ZodString;
    attributeName: import("zod").ZodString;
    startFrame: import("zod").ZodNumber;
    endFrame: import("zod").ZodNumber;
    targetFrame: import("zod").ZodNumber;
    dryRun: import("zod").ZodOptional<import("zod").ZodBoolean>;
}, "strip", import("zod").ZodTypeAny, {
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
}>> | import("./defineTool.js").TypedTool<import("zod").ZodObject<{
    projectPath: import("zod").ZodOptional<import("zod").ZodString>;
    nodePath: import("zod").ZodString;
    attributeName: import("zod").ZodString;
    startFrame: import("zod").ZodNumber;
    endFrame: import("zod").ZodNumber;
    dryRun: import("zod").ZodOptional<import("zod").ZodBoolean>;
}, "strip", import("zod").ZodTypeAny, {
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
}>> | import("./defineTool.js").TypedTool<import("zod").ZodObject<{
    projectPath: import("zod").ZodOptional<import("zod").ZodString>;
    nodePath: import("zod").ZodString;
    startFrame: import("zod").ZodNumber;
    holdFrames: import("zod").ZodNumber;
    dryRun: import("zod").ZodOptional<import("zod").ZodBoolean>;
}, "strip", import("zod").ZodTypeAny, {
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
}>> | import("./defineTool.js").TypedTool<import("zod").ZodObject<{
    projectPath: import("zod").ZodOptional<import("zod").ZodString>;
    eyeNodePath: import("zod").ZodString;
    blinkFrame: import("zod").ZodNumber;
    duration: import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodNumber>>;
    dryRun: import("zod").ZodOptional<import("zod").ZodBoolean>;
}, "strip", import("zod").ZodTypeAny, {
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
}>> | import("./defineTool.js").TypedTool<import("zod").ZodObject<{
    projectPath: import("zod").ZodOptional<import("zod").ZodString>;
    cameraNodePath: import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodString>>;
    startFrame: import("zod").ZodNumber;
    endFrame: import("zod").ZodNumber;
    startPos: import("zod").ZodArray<import("zod").ZodNumber, "many">;
    endPos: import("zod").ZodArray<import("zod").ZodNumber, "many">;
    dryRun: import("zod").ZodOptional<import("zod").ZodBoolean>;
}, "strip", import("zod").ZodTypeAny, {
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
}>> | import("./defineTool.js").TypedTool<import("zod").ZodObject<{
    projectPath: import("zod").ZodOptional<import("zod").ZodString>;
    outputPath: import("zod").ZodOptional<import("zod").ZodString>;
    dryRun: import("zod").ZodOptional<import("zod").ZodBoolean>;
}, "strip", import("zod").ZodTypeAny, {
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    outputPath?: string | undefined;
}, {
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    outputPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<import("zod").ZodObject<{
    projectPath: import("zod").ZodOptional<import("zod").ZodString>;
    otioFilePath: import("zod").ZodString;
    dryRun: import("zod").ZodOptional<import("zod").ZodBoolean>;
}, "strip", import("zod").ZodTypeAny, {
    otioFilePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    otioFilePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>>)[];
