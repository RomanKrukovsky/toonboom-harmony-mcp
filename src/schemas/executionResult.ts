import { z } from 'zod';

export type EngineMode = 'simulation' | 'dry_run' | 'real' | 'hybrid' | 'moonshot';
export type ExecutionStatus =
  | 'success'
  | 'partial_success'
  | 'simulation_success'
  | 'unsupported'
  | 'blocked'
  | 'failed'
  | 'requires_human';

export interface StandardExecutionResult {
  mode: EngineMode;
  status: ExecutionStatus;
  isRealHarmonyExecution: boolean;
  simulated: boolean;
  placeholder: boolean;
  requiresHumanReview: boolean;
  requiresRealHarmony: boolean;
  warnings: string[];
  errors: string[];
  artifacts: string[];
  executionReportPath: string;
  correlationId: string;
  startedAt: string;
  completedAt: string;
  details?: Record<string, any>;
}

export const standardExecutionResultSchema = z.object({
  mode: z.enum(['simulation', 'dry_run', 'real', 'hybrid', 'moonshot']),
  status: z.enum(['success', 'partial_success', 'simulation_success', 'unsupported', 'blocked', 'failed', 'requires_human']),
  isRealHarmonyExecution: z.boolean(),
  simulated: z.boolean(),
  placeholder: z.boolean(),
  requiresHumanReview: z.boolean(),
  requiresRealHarmony: z.boolean(),
  warnings: z.array(z.string()),
  errors: z.array(z.string()),
  artifacts: z.array(z.string()),
  executionReportPath: z.string(),
  correlationId: z.string(),
  startedAt: z.string(),
  completedAt: z.string(),
  details: z.record(z.any()).optional()
});

export function createStandardExecutionResult(params: {
  mode?: EngineMode;
  status?: ExecutionStatus;
  isRealHarmonyExecution?: boolean;
  simulated?: boolean;
  placeholder?: boolean;
  requiresHumanReview?: boolean;
  requiresRealHarmony?: boolean;
  warnings?: string[];
  errors?: string[];
  artifacts?: string[];
  executionReportPath?: string;
  correlationId?: string;
  startedAt?: string;
  details?: Record<string, any>;
}): StandardExecutionResult {
  const startedAt = params.startedAt || new Date().toISOString();
  const completedAt = new Date().toISOString();
  const mode = params.mode || (process.env.HARMONY_ENGINE_MODE as EngineMode) || 'simulation';
  const isReal = params.isRealHarmonyExecution ?? (mode === 'real');
  const simulated = params.simulated ?? (mode === 'simulation' || !isReal);
  const status = params.status || (simulated ? 'simulation_success' : 'success');

  return {
    mode,
    status,
    isRealHarmonyExecution: isReal,
    simulated,
    placeholder: params.placeholder ?? false,
    requiresHumanReview: params.requiresHumanReview ?? false,
    requiresRealHarmony: params.requiresRealHarmony ?? false,
    warnings: params.warnings || [],
    errors: params.errors || [],
    artifacts: params.artifacts || [],
    executionReportPath: params.executionReportPath || '',
    correlationId: params.correlationId || `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    startedAt,
    completedAt,
    details: params.details
  };
}
