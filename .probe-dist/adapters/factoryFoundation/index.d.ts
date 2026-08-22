export type FactoryRole = 'viewer' | 'artist' | 'director' | 'pipeline_admin' | 'system_admin';
export interface Principal {
    id: string;
    role: FactoryRole;
    authMode: 'token' | 'local_degraded';
}
export declare class FactoryAuth {
    authorize(token: string | undefined, minimum: FactoryRole): Principal;
}
export declare class FactoryFoundationStore {
    readonly root: string;
    private db;
    constructor(root?: string);
    initialize(): Promise<void>;
    createJob(type: string, input: any, steps: string[]): Promise<{
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
    setJob(id: string, status: string, progress: number, result?: any, error?: any): Promise<void>;
    setStep(jobId: string, name: string, status: string, checkpoint?: any): Promise<void>;
    getJob(id: string): Promise<{
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
    cancel(id: string): Promise<{
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
    register(kind: string, name: string, revision: string, checksum: string, status: string, metadata: any): Promise<{
        id: string;
        kind: string;
        name: string;
        revision: string;
        checksum: string;
        status: string;
        metadata: any;
    }>;
    listRegistry(kind?: string): Promise<any[]>;
    ingest(source: string, mediaType?: string): Promise<{
        id: string;
        sha256: string;
        size: number;
        mediaType: string;
        sourcePath: string;
        storedPath: string;
        verified: boolean;
    }>;
    metric(name: string, value: number, labels?: any): Promise<void>;
    private exec;
    private run;
    private get;
    private all;
}
