import { z } from 'zod';
import { createStandardExecutionResult } from '../schemas/executionResult.js';

export const approvalTools = [
  {
    name: 'harmony.review.request_approval',
    description: 'Запросить подтверждение этапа (Approval Gate).',
    inputSchema: z.object({ gateName: z.string(), artifactPath: z.string() }),
    handler: async (args: { gateName: string; artifactPath: string }) => {
      return createStandardExecutionResult({
        status: 'requires_human',
        requiresHumanReview: true,
        details: { gateName: args.gateName, artifactPath: args.artifactPath }
      });
    }
  },

  {
    name: 'harmony.review.submit_decision',
    description: 'Передать решение человека (Approve / Reject) по gate.',
    inputSchema: z.object({ gateName: z.string(), approved: z.boolean(), notes: z.string().optional() }),
    handler: async (args: { gateName: string; approved: boolean; notes?: string }) => {
      return createStandardExecutionResult({
        status: args.approved ? 'success' : 'blocked',
        details: { gateName: args.gateName, approved: args.approved, notes: args.notes }
      });
    }
  },

  {
    name: 'harmony.review.list_pending',
    description: 'Получить список этапов, ожидающих проверки человека.',
    inputSchema: z.object({ packageDir: z.string() }),
    handler: async () => {
      return createStandardExecutionResult({
        status: 'success',
        details: { pendingApprovals: [] }
      });
    }
  },

  {
    name: 'harmony.review.apply_notes',
    description: 'Применить правки человека к этапу.',
    inputSchema: z.object({ stageId: z.string(), notes: z.string() }),
    handler: async (args: { stageId: string; notes: string }) => {
      return createStandardExecutionResult({
        status: 'success',
        details: { stageId: args.stageId, notesApplied: args.notes }
      });
    }
  }
];
