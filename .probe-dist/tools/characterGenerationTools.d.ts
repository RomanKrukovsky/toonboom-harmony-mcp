import { z } from 'zod';
/**
 * characterGenerationTools — character design layer tools.
 */
export declare const characterGenerationTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    name: z.ZodString;
    role: z.ZodString;
    personality: z.ZodString;
    visualStyle: z.ZodOptional<z.ZodString>;
    bodyType: z.ZodOptional<z.ZodString>;
    includeDesignPrompts: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    role: string;
    personality: string;
    includeDesignPrompts: boolean;
    visualStyle?: string | undefined;
    bodyType?: string | undefined;
}, {
    name: string;
    role: string;
    personality: string;
    visualStyle?: string | undefined;
    bodyType?: string | undefined;
    includeDesignPrompts?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    characterSpec: z.ZodAny;
}, "strip", z.ZodTypeAny, {
    characterSpec?: any;
}, {
    characterSpec?: any;
}>>)[];
