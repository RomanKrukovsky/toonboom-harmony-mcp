export interface RunResult {
    lastID: number;
    changes: number;
}
export declare class SqliteTracker {
    private db;
    constructor();
    initialize(): Promise<void>;
    run(sql: string, params?: any[]): Promise<RunResult>;
    all<T = any>(sql: string, params?: any[]): Promise<T[]>;
    get<T = any>(sql: string, params?: any[]): Promise<T | undefined>;
    createProduction(name: string, description?: string): Promise<any>;
    listProductions(): Promise<any[]>;
    createEpisode(productionId: number, name: string, description?: string): Promise<any>;
    listEpisodes(productionId: number): Promise<any[]>;
    createSequence(episodeId: number, name: string, description?: string): Promise<any>;
    listSequences(episodeId: number): Promise<any[]>;
    createShot(sequenceId: number, name: string, description?: string): Promise<any>;
    listShots(sequenceId: number): Promise<any[]>;
    updateShotStatus(shotId: number, status: string): Promise<void>;
    assignShotUser(shotId: number, userId: number): Promise<void>;
    linkHarmony(shotId: number, env: string, job: string, scene: string, version: number): Promise<void>;
    createTask(shotId: number, name: string, assignedUserId?: number, dueDate?: string): Promise<any>;
    listTasks(shotId: number): Promise<any[]>;
    updateTaskStatus(taskId: number, status: string): Promise<void>;
    createAsset(productionId: number, name: string, type: string, harmonyPath?: string): Promise<any>;
    listAssets(productionId: number): Promise<any[]>;
    addNote(entityType: string, entityId: number, authorUserId: number, content: string): Promise<any>;
    listNotes(entityType: string, entityId: number): Promise<any[]>;
    getStatusReport(): Promise<any>;
    generateProductionReport(): Promise<any>;
    getCachedFileStats(filepath: string): Promise<{
        size: number;
        mtime: string;
    } | null>;
    setCachedFileStats(filepath: string, size: number, mtime: string): Promise<void>;
    clearCachedFileStats(filepath: string): Promise<void>;
    cachedExists(filepath: string): Promise<boolean>;
    addAuditReport(report: any): Promise<void>;
    close(): void;
}
export declare const tracker: SqliteTracker;
