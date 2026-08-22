import { z } from 'zod';
export declare const legalTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    packageDir: z.ZodString;
    forbiddenSources: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    writeReport: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    packageDir: string;
    writeReport: boolean;
    forbiddenSources?: string[] | undefined;
}, {
    packageDir: string;
    forbiddenSources?: string[] | undefined;
    writeReport?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    packageDir: z.ZodString;
    assetId: z.ZodString;
    forbiddenSources: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    assetId: string;
    packageDir: string;
    forbiddenSources?: string[] | undefined;
}, {
    assetId: string;
    packageDir: string;
    forbiddenSources?: string[] | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    packageDir: z.ZodString;
    forbiddenSources: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    allowIncomplete: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    packageDir: string;
    allowIncomplete: boolean;
    forbiddenSources?: string[] | undefined;
}, {
    packageDir: string;
    forbiddenSources?: string[] | undefined;
    allowIncomplete?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    packageDir: z.ZodString;
    forbiddenSources: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    packageDir: string;
    forbiddenSources?: string[] | undefined;
}, {
    packageDir: string;
    forbiddenSources?: string[] | undefined;
}>>)[];
