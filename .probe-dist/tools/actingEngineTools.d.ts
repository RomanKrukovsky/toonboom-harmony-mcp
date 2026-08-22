import { z } from 'zod';
export declare const actingEngineTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    shotId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    shotId: string;
}, {
    shotId: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    characterId: z.ZodString;
    performanceId: z.ZodString;
    bindingHash: z.ZodString;
}, "strip", z.ZodTypeAny, {
    characterId: string;
    performanceId: string;
    bindingHash: string;
}, {
    characterId: string;
    performanceId: string;
    bindingHash: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    characterId: z.ZodString;
    performanceId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    characterId: string;
    performanceId: string;
}, {
    characterId: string;
    performanceId: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    targetNodeId: z.ZodString;
    frameAPath: z.ZodString;
    frameBPath: z.ZodString;
    count: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    count: number;
    targetNodeId: string;
    frameAPath: string;
    frameBPath: string;
}, {
    targetNodeId: string;
    frameAPath: string;
    frameBPath: string;
    count?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    characterId: z.ZodString;
    motionClipId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    characterId: string;
    motionClipId: string;
}, {
    characterId: string;
    motionClipId: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    characterId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    characterId: string;
}, {
    characterId: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    characterId: z.ZodString;
    reactionType: z.ZodString;
}, "strip", z.ZodTypeAny, {
    characterId: string;
    reactionType: string;
}, {
    characterId: string;
    reactionType: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    characterId: z.ZodString;
    dialogueId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    characterId: string;
    dialogueId: string;
}, {
    characterId: string;
    dialogueId: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    nodePath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    nodePath: string;
}, {
    nodePath: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    issueId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    issueId: string;
}, {
    issueId: string;
}>>)[];
