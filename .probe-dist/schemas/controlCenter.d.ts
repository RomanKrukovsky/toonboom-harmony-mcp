import { z } from 'zod';
export declare const listUsersSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare const createUserSchema: z.ZodObject<{
    name: z.ZodString;
    role: z.ZodEnum<["Operator", "Artist", "Supervising Artist", "Director", "Administrator"]>;
    password: z.ZodOptional<z.ZodString>;
    confirm: z.ZodOptional<z.ZodBoolean>;
    confirmationText: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    role: "Operator" | "Artist" | "Supervising Artist" | "Director" | "Administrator";
    password?: string | undefined;
    confirm?: boolean | undefined;
    confirmationText?: string | undefined;
}, {
    name: string;
    role: "Operator" | "Artist" | "Supervising Artist" | "Director" | "Administrator";
    password?: string | undefined;
    confirm?: boolean | undefined;
    confirmationText?: string | undefined;
}>;
export declare const modifyUserSchema: z.ZodObject<{
    name: z.ZodString;
    role: z.ZodOptional<z.ZodEnum<["Operator", "Artist", "Supervising Artist", "Director", "Administrator"]>>;
    password: z.ZodOptional<z.ZodString>;
    confirm: z.ZodOptional<z.ZodBoolean>;
    confirmationText: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    password?: string | undefined;
    confirm?: boolean | undefined;
    confirmationText?: string | undefined;
    role?: "Operator" | "Artist" | "Supervising Artist" | "Director" | "Administrator" | undefined;
}, {
    name: string;
    password?: string | undefined;
    confirm?: boolean | undefined;
    confirmationText?: string | undefined;
    role?: "Operator" | "Artist" | "Supervising Artist" | "Director" | "Administrator" | undefined;
}>;
export declare const deleteUserSchema: z.ZodObject<{
    name: z.ZodString;
    confirm: z.ZodOptional<z.ZodBoolean>;
    confirmationText: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    confirm?: boolean | undefined;
    confirmationText?: string | undefined;
}, {
    name: string;
    confirm?: boolean | undefined;
    confirmationText?: string | undefined;
}>;
export declare const listEnvironmentsSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare const createEnvironmentSchema: z.ZodObject<{
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
}>;
export declare const listJobsSchema: z.ZodObject<{
    environmentName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    environmentName: string;
}, {
    environmentName: string;
}>;
export declare const createJobSchema: z.ZodObject<{
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
}>;
export declare const listScenesSchema: z.ZodObject<{
    environmentName: z.ZodString;
    jobName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    environmentName: string;
    jobName: string;
}, {
    environmentName: string;
    jobName: string;
}>;
export declare const createSceneSchema: z.ZodObject<{
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
}>;
export declare const renameSceneSchema: z.ZodObject<{
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
}>;
export declare const deleteSceneSchema: z.ZodObject<{
    environmentName: z.ZodString;
    jobName: z.ZodString;
    sceneName: z.ZodString;
    confirm: z.ZodOptional<z.ZodBoolean>;
    confirmationText: z.ZodOptional<z.ZodString>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    environmentName: string;
    jobName: string;
    sceneName: string;
    confirm?: boolean | undefined;
    dryRun?: boolean | undefined;
    confirmationText?: string | undefined;
}, {
    environmentName: string;
    jobName: string;
    sceneName: string;
    confirm?: boolean | undefined;
    dryRun?: boolean | undefined;
    confirmationText?: string | undefined;
}>;
export declare const listVersionsSchema: z.ZodObject<{
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
}>;
export declare const listLockedScenesSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare const importScenePackageSchema: z.ZodObject<{
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
}>;
export declare const exportScenePackageSchema: z.ZodObject<{
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
}>;
