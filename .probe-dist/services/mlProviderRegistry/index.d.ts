export interface MlProviderDetectionResult {
    status: 'installed_verified' | 'installed_unverified' | 'remote_available' | 'dependency_missing' | 'weights_missing' | 'license_restricted' | 'unsupported_platform' | 'requires_gpu' | 'disabled';
    version?: string;
    device?: string;
    message?: string;
}
export interface MlProviderHealth {
    isHealthy: boolean;
    status: string;
    loaded: boolean;
    memoryUsageMb?: number;
}
export interface MlValidationResult {
    isValid: boolean;
    errors: string[];
}
export interface MlExecutionContext {
    jobId: string;
    correlationId: string;
    timeoutMs: number;
    mode: 'simulation' | 'dry_run' | 'real';
}
export interface MlProvider<TInput, TOutput> {
    readonly id: string;
    readonly modelId: string;
    readonly capabilities: string[];
    detect(): Promise<MlProviderDetectionResult>;
    healthCheck(): Promise<MlProviderHealth>;
    validateInput(input: TInput): Promise<MlValidationResult>;
    run(input: TInput, context: MlExecutionContext): Promise<TOutput>;
    cancel(jobId: string): Promise<void>;
    unload?(): Promise<void>;
}
export declare class MlProviderRegistry {
    private providers;
    register<TInput, TOutput>(provider: MlProvider<TInput, TOutput>): void;
    get(id: string): MlProvider<any, any> | undefined;
    getAll(): MlProvider<any, any>[];
}
