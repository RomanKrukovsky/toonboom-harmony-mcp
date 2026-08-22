import { ProductionRunOptions, ProductionPackagePaths } from '../../schemas/productionPackage.js';
import { StandardExecutionResult, EngineMode } from '../../schemas/executionResult.js';
export interface ProductionStageState {
    id: string;
    name: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused' | 'requires_approval';
    fingerprint: string;
    startedAt?: string;
    completedAt?: string;
    outputArtifacts: string[];
    error?: string;
}
export interface ProductionRunState {
    runId: string;
    projectName: string;
    options: ProductionRunOptions;
    mode: EngineMode;
    status: 'initializing' | 'running' | 'paused' | 'completed' | 'failed' | 'awaiting_approval';
    packagePaths: ProductionPackagePaths;
    stages: Record<string, ProductionStageState>;
    currentStageId?: string;
    startedAt: string;
    updatedAt: string;
    completedAt?: string;
    totalScenes: number;
    completedScenes: number;
    warnings: string[];
    errors: string[];
}
export declare class AutonomousStudioOrchestrator {
    private createPackageStructure;
    private computeFingerprint;
    private saveState;
    private loadState;
    runProduction(options: ProductionRunOptions): Promise<StandardExecutionResult>;
    getStatus(packageDir: string): Promise<StandardExecutionResult>;
    resumeProduction(packageDir: string): Promise<StandardExecutionResult>;
}
