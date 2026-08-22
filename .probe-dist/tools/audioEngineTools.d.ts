import { z } from 'zod';
export declare const audioEngineTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    characters: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    characters: string[];
}, {
    characters: string[];
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    characterId: z.ZodString;
    text: z.ZodString;
    outputWavPath: z.ZodOptional<z.ZodString>;
    voiceDescription: z.ZodOptional<z.ZodString>;
    referenceWavPath: z.ZodOptional<z.ZodString>;
    instruct: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    characterId: string;
    text: string;
    outputWavPath?: string | undefined;
    voiceDescription?: string | undefined;
    referenceWavPath?: string | undefined;
    instruct?: string | undefined;
}, {
    characterId: string;
    text: string;
    outputWavPath?: string | undefined;
    voiceDescription?: string | undefined;
    referenceWavPath?: string | undefined;
    instruct?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    filePath: z.ZodString;
    characterId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    characterId: string;
    filePath: string;
}, {
    characterId: string;
    filePath: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    audioPath: z.ZodString;
    text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    text: string;
    audioPath: string;
}, {
    text: string;
    audioPath: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    audioPath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    audioPath: string;
}, {
    audioPath: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    nodeId: z.ZodString;
    audioHash: z.ZodString;
    visemes: z.ZodArray<z.ZodObject<{
        startFrame: z.ZodNumber;
        endFrame: z.ZodNumber;
        phoneme: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        startFrame: number;
        endFrame: number;
        phoneme: string;
    }, {
        startFrame: number;
        endFrame: number;
        phoneme: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    nodeId: string;
    visemes: {
        startFrame: number;
        endFrame: number;
        phoneme: string;
    }[];
    audioHash: string;
}, {
    nodeId: string;
    visemes: {
        startFrame: number;
        endFrame: number;
        phoneme: string;
    }[];
    audioHash: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sceneId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    sceneId: string;
}, {
    sceneId: string;
}>>)[];
