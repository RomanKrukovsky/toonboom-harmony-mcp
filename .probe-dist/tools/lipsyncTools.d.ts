import { z } from 'zod';
export declare const lipsyncTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    audioFilePath: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    audioFilePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    audioFilePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    audioFilePath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    audioFilePath: string;
}, {
    audioFilePath: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    timingFilePath: z.ZodString;
    mouthLayerNodePath: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    timingFilePath: string;
    mouthLayerNodePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    timingFilePath: string;
    mouthLayerNodePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    mouthLayer: z.ZodString;
    frames: z.ZodArray<z.ZodObject<{
        frame: z.ZodNumber;
        shape: z.ZodEnum<["A", "B", "C", "D", "E", "F", "G", "X"]>;
    }, "strip", z.ZodTypeAny, {
        frame: number;
        shape: "A" | "E" | "F" | "X" | "B" | "C" | "D" | "G";
    }, {
        frame: number;
        shape: "A" | "E" | "F" | "X" | "B" | "C" | "D" | "G";
    }>, "many">;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    frames: {
        frame: number;
        shape: "A" | "E" | "F" | "X" | "B" | "C" | "D" | "G";
    }[];
    mouthLayer: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    frames: {
        frame: number;
        shape: "A" | "E" | "F" | "X" | "B" | "C" | "D" | "G";
    }[];
    mouthLayer: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    mouthLayerNodePath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    mouthLayerNodePath: string;
    projectPath?: string | undefined;
}, {
    mouthLayerNodePath: string;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    mouthLayerNodePath: z.ZodString;
    audioFilePath: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    audioFilePath: string;
    mouthLayerNodePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}, {
    audioFilePath: string;
    mouthLayerNodePath: string;
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    dialogues: z.ZodArray<z.ZodObject<{
        character: z.ZodString;
        text: z.ZodString;
        startFrame: z.ZodNumber;
        endFrame: z.ZodNumber;
        audioFile: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        startFrame: number;
        endFrame: number;
        character: string;
        text: string;
        audioFile?: string | undefined;
    }, {
        startFrame: number;
        endFrame: number;
        character: string;
        text: string;
        audioFile?: string | undefined;
    }>, "many">;
    fps: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    engine: z.ZodDefault<z.ZodOptional<z.ZodEnum<["placeholder", "rhubarb", "papagayo"]>>>;
    mouthLayerPattern: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    saveToPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    fps: number;
    dialogues: {
        startFrame: number;
        endFrame: number;
        character: string;
        text: string;
        audioFile?: string | undefined;
    }[];
    engine: "placeholder" | "rhubarb" | "papagayo";
    mouthLayerPattern: string;
    saveToPath?: string | undefined;
}, {
    dialogues: {
        startFrame: number;
        endFrame: number;
        character: string;
        text: string;
        audioFile?: string | undefined;
    }[];
    fps?: number | undefined;
    engine?: "placeholder" | "rhubarb" | "papagayo" | undefined;
    mouthLayerPattern?: string | undefined;
    saveToPath?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    projectPath: z.ZodOptional<z.ZodString>;
    lipsyncPlanPath: z.ZodOptional<z.ZodString>;
    lipsyncPlanInline: z.ZodOptional<z.ZodAny>;
    mouthLayerPattern: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    dryRun: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    dryRun: boolean;
    mouthLayerPattern: string;
    projectPath?: string | undefined;
    lipsyncPlanInline?: any;
    lipsyncPlanPath?: string | undefined;
}, {
    dryRun?: boolean | undefined;
    projectPath?: string | undefined;
    mouthLayerPattern?: string | undefined;
    lipsyncPlanInline?: any;
    lipsyncPlanPath?: string | undefined;
}>>)[];
