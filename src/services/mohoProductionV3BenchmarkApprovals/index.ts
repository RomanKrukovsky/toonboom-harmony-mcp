import fs from 'fs';
import { z } from 'zod';
import { mohoProductionV3GateSchema } from '../../schemas/mohoProductionV3.js';

const directorApprovalSchema = z.object({
  shotId: z.string().min(1),
  gate: mohoProductionV3GateSchema,
  approvalId: z.string().min(1),
  decision: z.enum(['approve', 'reject']),
  feedbackText: z.string().min(1),
  reviewerId: z.string().min(1),
  decidedAt: z.string().datetime()
}).strict();

export const mohoProductionV3DirectorApprovalFileSchema = z.object({
  schemaVersion: z.literal('1.0'),
  approvals: z.array(directorApprovalSchema)
}).strict().superRefine((file, context) => {
  const keys = new Set<string>();
  for (const [index, approval] of file.approvals.entries()) {
    const key = `${approval.shotId}\0${approval.gate}\0${approval.approvalId}`;
    if (keys.has(key)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['approvals', index, 'approvalId'],
        message: 'Director approval entries must be unique by shotId, gate and approvalId.'
      });
    }
    keys.add(key);
  }
});

export interface MohoProductionV3PendingApprovalIdentity {
  shotId: string;
  gate: z.infer<typeof mohoProductionV3GateSchema>;
  approvalId: string;
}

export interface MohoProductionV3DirectorDecision {
  decision: 'approve' | 'reject';
  feedbackText: string;
  reviewerId: string;
  decidedAt: string;
}

export interface MohoProductionV3BenchmarkDirector {
  id: string;
  role: 'director' | 'pipeline_admin' | 'system_admin';
}

const tokenRegistrySchema = z.record(z.object({
  id: z.string().min(1),
  role: z.enum(['viewer', 'artist', 'director', 'pipeline_admin', 'system_admin'])
}).strict());

export function resolveMohoV3BenchmarkDirector(input: {
  benchmarkToken: string | undefined;
  tokenRegistryJson: string | undefined;
}): MohoProductionV3BenchmarkDirector {
  if (!input.tokenRegistryJson?.trim()) {
    throw new Error('HARMONY_FACTORY_TOKENS must explicitly configure the benchmark director.');
  }
  if (!input.benchmarkToken?.trim()) {
    throw new Error('MOHO_BENCHMARK_AUTH_TOKEN is required.');
  }
  const registry = tokenRegistrySchema.parse(JSON.parse(input.tokenRegistryJson));
  const principal = registry[input.benchmarkToken];
  if (!principal || !['director', 'pipeline_admin', 'system_admin'].includes(principal.role)) {
    throw new Error('MOHO_BENCHMARK_AUTH_TOKEN must identify a director or higher role.');
  }
  return principal as MohoProductionV3BenchmarkDirector;
}

export function findMohoV3DirectorApproval(
  filePath: string,
  pending: MohoProductionV3PendingApprovalIdentity
): MohoProductionV3DirectorDecision | null {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return null;
  const file = mohoProductionV3DirectorApprovalFileSchema.parse(
    JSON.parse(fs.readFileSync(filePath, 'utf8'))
  );
  const approval = file.approvals.find(entry =>
    entry.shotId === pending.shotId
    && entry.gate === pending.gate
    && entry.approvalId === pending.approvalId
  );
  if (!approval) return null;
  return {
    decision: approval.decision,
    feedbackText: approval.feedbackText,
    reviewerId: approval.reviewerId,
    decidedAt: approval.decidedAt
  };
}
