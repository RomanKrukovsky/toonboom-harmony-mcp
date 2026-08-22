import { z } from 'zod';
export declare const riggingEngineTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    filePath: z.ZodString;
    layerNames: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    filePath: string;
    layerNames?: string[] | undefined;
}, {
    filePath: string;
    layerNames?: string[] | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    templateId: z.ZodString;
    version: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    templateId: string;
    version?: string | undefined;
}, {
    templateId: string;
    version?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    characterId: z.ZodString;
    templateId: z.ZodString;
    pir: z.ZodObject<{
        points: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            x: z.ZodOptional<z.ZodNumber>;
            y: z.ZodOptional<z.ZodNumber>;
            confidence: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        }, "strip", z.ZodTypeAny, {
            confidence: number;
            name: string;
            x?: number | undefined;
            y?: number | undefined;
        }, {
            name: string;
            x?: number | undefined;
            y?: number | undefined;
            confidence?: number | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        points: {
            confidence: number;
            name: string;
            x?: number | undefined;
            y?: number | undefined;
        }[];
    }, {
        points: {
            name: string;
            x?: number | undefined;
            y?: number | undefined;
            confidence?: number | undefined;
        }[];
    }>;
    version: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    characterId: string;
    pir: {
        points: {
            confidence: number;
            name: string;
            x?: number | undefined;
            y?: number | undefined;
        }[];
    };
    templateId: string;
    version?: string | undefined;
}, {
    characterId: string;
    pir: {
        points: {
            name: string;
            x?: number | undefined;
            y?: number | undefined;
            confidence?: number | undefined;
        }[];
    };
    templateId: string;
    version?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    characterId: z.ZodString;
    templateId: z.ZodString;
    version: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    characterId: string;
    templateId: string;
    version?: string | undefined;
}, {
    characterId: string;
    templateId: string;
    version?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    characterId: z.ZodString;
    useMirroring: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    characterId: string;
    useMirroring: boolean;
}, {
    characterId: string;
    useMirroring?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    characterId: z.ZodString;
    mouthNodeName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    characterId: string;
    mouthNodeName?: string | undefined;
}, {
    characterId: string;
    mouthNodeName?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    characterId: z.ZodString;
    hands: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodEnum<["left", "right"]>, "many">>>;
}, "strip", z.ZodTypeAny, {
    characterId: string;
    hands: ("left" | "right")[];
}, {
    characterId: string;
    hands?: ("left" | "right")[] | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    characterId: z.ZodString;
    gridSize: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    characterId: string;
    gridSize: number;
}, {
    characterId: string;
    gridSize?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    characterId: z.ZodString;
    controllers: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodEnum<["head_turn", "body_turn", "face", "hands"]>, "many">>>;
}, "strip", z.ZodTypeAny, {
    characterId: string;
    controllers: ("face" | "head_turn" | "body_turn" | "hands")[];
}, {
    characterId: string;
    controllers?: ("face" | "head_turn" | "body_turn" | "hands")[] | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    characterId: z.ZodString;
    durationFrames: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    characterId: string;
    durationFrames: number;
}, {
    characterId: string;
    durationFrames?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    characterId: z.ZodString;
    templatePath: z.ZodString;
    rigSpec: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    templatePath: string;
    characterId: string;
    rigSpec?: Record<string, any> | undefined;
}, {
    templatePath: string;
    characterId: string;
    rigSpec?: Record<string, any> | undefined;
}>>)[];
