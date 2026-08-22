export interface RealSceneExecutionResult {
    ok: boolean;
    mode: 'real' | 'hybrid' | 'simulation';
    isRealHarmonyExecution: boolean;
    sceneName: string;
    createdFiles: string[];
    performedSteps: string[];
    skippedSteps: string[];
    warnings: string[];
    requiresHuman: boolean;
    assetsImported: string[];
    nodesCreated: string[];
    connectionsCreated: string[];
    keyframesCreated: any[];
    preview: {
        rendered: boolean;
        path: string;
        fileExists: boolean;
        fileSizeBytes: number;
        simulatedPreviewCreated?: boolean;
        isValidVideoFile?: boolean;
        truth?: string;
        reason?: string;
    };
    error?: {
        code: string;
        message: string;
    };
}
export declare class RealSceneExecutor {
    private static MINIMAL_PNG_HEX;
    private ensurePlaceholderAssets;
    private ensureProjectStructure;
    executeScenePlan(scenePlan: any, options?: {
        mode?: 'real' | 'hybrid' | 'simulation';
        projectPath?: string;
        outputDir?: string;
    }): Promise<RealSceneExecutionResult>;
}
