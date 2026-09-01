import { z } from 'zod';

export const MOHO_FACTORY_STATE_SCHEMA_VERSION = '1.0';

export const mohoFactoryStageSchema = z.enum([
  'init',
  'parse_input',
  'load_show_bible',
  'plan_production',
  'design_rig',
  'design_scene',
  'render_performance',
  'render_scene',
  'qa_review',
  'retake',
  'finalize'
]);

export const mohoFactoryStageStateSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'requires_approval']),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  outputArtifacts: z.array(z.string()).default([]),
  error: z.string().optional(),
  fingerprint: z.string()
}).strict();

export const mohoFactoryShotResultSchema = z.object({
  shotId: z.string(),
  status: z.enum(['completed', 'failed', 'requires_approval']),
  pirFingerprint: z.string(),
  planFingerprint: z.string(),
  qaStatus: z.enum(['pass', 'warn', 'fail']).optional(),
  retakeCount: z.number().int().nonnegative().default(0),
  artifacts: z.array(z.string()).default([]),
  durationMs: z.number().int().nonnegative()
}).strict();

export const mohoFactoryRunStateSchema = z.object({
  schemaVersion: z.literal(MOHO_FACTORY_STATE_SCHEMA_VERSION),
  runId: z.string().min(1),
  projectName: z.string().min(1),
  startedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  status: z.enum(['initializing', 'running', 'paused', 'awaiting_approval', 'completed', 'failed']),
  currentStage: z.string().optional(),
  stages: z.record(z.string(), mohoFactoryStageStateSchema),
  shotResults: z.array(mohoFactoryShotResultSchema).default([]),
  totalShots: z.number().int().nonnegative(),
  completedShots: z.number().int().nonnegative(),
  warnings: z.array(z.string()).default([]),
  errors: z.array(z.string()).default([]),
  fingerprint: z.string()
}).strict();

export type MohoFactoryStage = z.infer<typeof mohoFactoryStageSchema>;
export type MohoFactoryStageState = z.infer<typeof mohoFactoryStageStateSchema>;
export type MohoFactoryShotResult = z.infer<typeof mohoFactoryShotResultSchema>;
export type MohoFactoryRunState = z.infer<typeof mohoFactoryRunStateSchema>;