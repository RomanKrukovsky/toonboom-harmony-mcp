import { z } from 'zod';
export declare const factoryFoundationTools: ({
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        authToken: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        authToken?: string | undefined;
    }, {
        authToken?: string | undefined;
    }>;
    handler: (a: any) => Promise<{
        status: string;
        executed: boolean;
        verified: boolean;
        artifactCreated: boolean;
        warnings: string[];
        provenance: {
            jobBackend: string;
            artifactStore: string;
            principal: import("../adapters/factoryFoundation/index.js").Principal;
        };
        capabilities: {
            durableJobs: boolean;
            resume: boolean;
            cancel: boolean;
            registries: boolean;
            artifactIntegrity: boolean;
            heavyMlOutsideNode: boolean;
            postgres: boolean;
            redis: boolean;
            harmonyAvailable: boolean;
        };
    }>;
} | {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        authToken: z.ZodOptional<z.ZodString>;
    } & {
        type: z.ZodDefault<z.ZodString>;
        input: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        input: Record<string, any>;
        authToken?: string | undefined;
    }, {
        type?: string | undefined;
        authToken?: string | undefined;
        input?: Record<string, any> | undefined;
    }>;
    handler: (a: any) => Promise<{
        jobId: any;
        type: any;
        status: any;
        progress: any;
        input: any;
        result: any;
        error: any;
        cancelRequested: boolean;
        steps: {
            name: any;
            status: any;
            attempt: any;
            dependsOn: any;
            checkpoint: any;
        }[];
        createdAt: any;
        updatedAt: any;
    }>;
} | {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        authToken: z.ZodOptional<z.ZodString>;
    } & {
        jobId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        jobId: string;
        authToken?: string | undefined;
    }, {
        jobId: string;
        authToken?: string | undefined;
    }>;
    handler: (a: any) => Promise<{
        jobId: any;
        type: any;
        status: any;
        progress: any;
        input: any;
        result: any;
        error: any;
        cancelRequested: boolean;
        steps: {
            name: any;
            status: any;
            attempt: any;
            dependsOn: any;
            checkpoint: any;
        }[];
        createdAt: any;
        updatedAt: any;
    }>;
} | {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        authToken: z.ZodOptional<z.ZodString>;
    } & {
        kind: z.ZodEnum<["model", "dataset"]>;
        name: z.ZodString;
        revision: z.ZodString;
        checksum: z.ZodString;
        status: z.ZodEnum<["available", "disabled", "unverified"]>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        status: "available" | "disabled" | "unverified";
        name: string;
        kind: "model" | "dataset";
        metadata: Record<string, any>;
        revision: string;
        checksum: string;
        authToken?: string | undefined;
    }, {
        status: "available" | "disabled" | "unverified";
        name: string;
        kind: "model" | "dataset";
        revision: string;
        checksum: string;
        metadata?: Record<string, any> | undefined;
        authToken?: string | undefined;
    }>;
    handler: (a: any) => Promise<{
        id: string;
        kind: string;
        name: string;
        revision: string;
        checksum: string;
        status: string;
        metadata: any;
    }>;
} | {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        authToken: z.ZodOptional<z.ZodString>;
    } & {
        kind: z.ZodOptional<z.ZodEnum<["model", "dataset"]>>;
    }, "strip", z.ZodTypeAny, {
        kind?: "model" | "dataset" | undefined;
        authToken?: string | undefined;
    }, {
        kind?: "model" | "dataset" | undefined;
        authToken?: string | undefined;
    }>;
    handler: (a: any) => Promise<any[]>;
} | {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        authToken: z.ZodOptional<z.ZodString>;
    } & {
        sourcePath: z.ZodString;
        mediaType: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        sourcePath: string;
        mediaType: string;
        authToken?: string | undefined;
    }, {
        sourcePath: string;
        authToken?: string | undefined;
        mediaType?: string | undefined;
    }>;
    handler: (a: any) => Promise<{
        status: string;
        executed: boolean;
        verified: boolean;
        artifactCreated: boolean;
        artifact: {
            id: string;
            sha256: string;
            size: number;
            mediaType: string;
            sourcePath: string;
            storedPath: string;
            verified: boolean;
        };
        warnings: never[];
        provenance: {
            store: string;
        };
    }>;
} | {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        authToken: z.ZodOptional<z.ZodString>;
    } & {
        videoPath: z.ZodString;
        audioPath: z.ZodString;
        outputDir: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        videoPath: string;
        outputDir: string;
        audioPath: string;
        authToken?: string | undefined;
    }, {
        videoPath: string;
        outputDir: string;
        audioPath: string;
        authToken?: string | undefined;
    }>;
    handler: (a: any) => Promise<{
        jobId: any;
        type: any;
        status: any;
        progress: any;
        input: any;
        result: any;
        error: any;
        cancelRequested: boolean;
        steps: {
            name: any;
            status: any;
            attempt: any;
            dependsOn: any;
            checkpoint: any;
        }[];
        createdAt: any;
        updatedAt: any;
    }>;
})[];
