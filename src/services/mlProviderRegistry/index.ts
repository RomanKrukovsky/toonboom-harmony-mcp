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

export class MlProviderRegistry {
  private providers: Map<string, MlProvider<any, any>> = new Map();

  register<TInput, TOutput>(provider: MlProvider<TInput, TOutput>) {
    if (this.providers.has(provider.id)) {
      throw new Error(`Provider ${provider.id} is already registered`);
    }
    this.providers.set(provider.id, provider);
  }

  get(id: string): MlProvider<any, any> | undefined {
    return this.providers.get(id);
  }

  getAll(): MlProvider<any, any>[] {
    return Array.from(this.providers.values());
  }
}
