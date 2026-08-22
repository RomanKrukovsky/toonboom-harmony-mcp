import { z } from 'zod';
export declare const creativeTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    prompt: z.ZodString;
    genre: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    genre?: string | undefined;
}, {
    prompt: string;
    genre?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    title: z.ZodString;
    prompt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    title: string;
    prompt: string;
}, {
    title: string;
    prompt: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    visualStyle: z.ZodString;
}, "strip", z.ZodTypeAny, {
    visualStyle: string;
}, {
    visualStyle: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    characters: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    characters: string[];
}, {
    characters: string[];
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    packageDir: z.ZodString;
}, "strip", z.ZodTypeAny, {
    packageDir: string;
}, {
    packageDir: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    styleId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    styleId: string;
}, {
    styleId: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    images: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    images: string[];
}, {
    images: string[];
}>>)[];
