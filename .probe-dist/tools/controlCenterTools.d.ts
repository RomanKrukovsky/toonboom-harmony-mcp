import { z } from 'zod';
export declare const controlCenterTools: (import("./defineTool.js").TypedTool<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    script: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    script: string;
    dryRun?: boolean | undefined;
}, {
    script: string;
    dryRun?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    name: z.ZodString;
    role: z.ZodEnum<["Operator", "Artist", "Supervising Artist", "Director", "Administrator"]>;
    password: z.ZodOptional<z.ZodString>;
    confirm: z.ZodOptional<z.ZodBoolean>;
    confirmationText: z.ZodOptional<z.ZodString>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    role: "Operator" | "Artist" | "Supervising Artist" | "Director" | "Administrator";
    password?: string | undefined;
    confirm?: boolean | undefined;
    dryRun?: boolean | undefined;
    confirmationText?: string | undefined;
}, {
    name: string;
    role: "Operator" | "Artist" | "Supervising Artist" | "Director" | "Administrator";
    password?: string | undefined;
    confirm?: boolean | undefined;
    dryRun?: boolean | undefined;
    confirmationText?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    name: z.ZodString;
    path: z.ZodString;
    server: z.ZodString;
    user: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    path: string;
    name: string;
    server: string;
    user: string;
    dryRun?: boolean | undefined;
}, {
    path: string;
    name: string;
    server: string;
    dryRun?: boolean | undefined;
    user?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    environmentName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    environmentName: string;
}, {
    environmentName: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    environmentName: z.ZodString;
    jobName: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    environmentName: string;
    jobName: string;
    dryRun?: boolean | undefined;
}, {
    environmentName: string;
    jobName: string;
    dryRun?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    environmentName: z.ZodString;
    jobName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    environmentName: string;
    jobName: string;
}, {
    environmentName: string;
    jobName: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    environmentName: z.ZodString;
    jobName: z.ZodString;
    sceneName: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    environmentName: string;
    jobName: string;
    sceneName: string;
    dryRun?: boolean | undefined;
}, {
    environmentName: string;
    jobName: string;
    sceneName: string;
    dryRun?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    environmentName: z.ZodString;
    jobName: z.ZodString;
    oldName: z.ZodString;
    newName: z.ZodString;
    confirm: z.ZodOptional<z.ZodBoolean>;
    confirmationText: z.ZodOptional<z.ZodString>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    environmentName: string;
    jobName: string;
    oldName: string;
    newName: string;
    confirm?: boolean | undefined;
    dryRun?: boolean | undefined;
    confirmationText?: string | undefined;
}, {
    environmentName: string;
    jobName: string;
    oldName: string;
    newName: string;
    confirm?: boolean | undefined;
    dryRun?: boolean | undefined;
    confirmationText?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    environmentName: z.ZodString;
    jobName: z.ZodString;
    sceneName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    environmentName: string;
    jobName: string;
    sceneName: string;
}, {
    environmentName: string;
    jobName: string;
    sceneName: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    environmentName: z.ZodString;
    jobName: z.ZodString;
    packagePath: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    environmentName: string;
    jobName: string;
    packagePath: string;
    dryRun?: boolean | undefined;
}, {
    environmentName: string;
    jobName: string;
    packagePath: string;
    dryRun?: boolean | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    environmentName: z.ZodString;
    jobName: z.ZodString;
    sceneName: z.ZodString;
    versionNumber: z.ZodNumber;
    packagePath: z.ZodString;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    environmentName: string;
    jobName: string;
    sceneName: string;
    packagePath: string;
    versionNumber: number;
    dryRun?: boolean | undefined;
}, {
    environmentName: string;
    jobName: string;
    sceneName: string;
    packagePath: string;
    versionNumber: number;
    dryRun?: boolean | undefined;
}>>)[];
