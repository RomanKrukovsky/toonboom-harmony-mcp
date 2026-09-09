import { z } from 'zod';
import { KitsuIngest } from '../adapters/kitsuIngest.js';

export const mohoKitsuIngestTool = {
  name: 'moho.planner.kitsu_ingest',
  description:
    'Ingests shots for an episode from a Kitsu REST API and formats them for the Moho production pipeline. ' +
    'Read-only — never writes back to Kitsu. Use moho.planner.kitsu_writeback to update task status.',
  inputSchema: z.object({
    baseUrl: z.string().describe('Kitsu base URL, e.g. https://kitsu.studio.example'),
    token: z.string().optional().describe('Bearer token'),
    email: z.string().optional(),
    password: z.string().optional(),
    production: z.string().describe('Kitsu project name.'),
    episode: z.string().describe('Kitsu episode name.')
  }),
  handler: async (args: {
    baseUrl: string;
    token?: string;
    email?: string;
    password?: string;
    production: string;
    episode: string;
  }) => {
    const kitsu = new KitsuIngest({
      baseUrl: args.baseUrl,
      token: args.token,
      email: args.email,
      password: args.password
    });
    try {
      const result = await kitsu.ingestEpisode(args.production, args.episode);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: result.unsupported.length ? 'partial_success' : 'success',
              source: 'kitsu',
              production: args.production,
              episode: args.episode,
              plansCount: result.plans.length,
              plans: result.plans,
              warnings: result.warnings,
              unsupported: result.unsupported
            }, null, 2)
          }
        ]
      };
    } catch (err: any) {
      const sanitized = (err?.message || String(err)).replace(/Bearer [^ ]+/g, 'Bearer ***');
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              code: 'KITSU_INGEST_FAILED',
              message: sanitized
            }, null, 2)
          }
        ]
      };
    }
  }
};

export const mohoKitsuWritebackTool = {
  name: 'moho.planner.kitsu_writeback',
  description:
    'After Moho pipeline certifies a shot, write the resulting status and review artifacts back to Kitsu tasks. ' +
    'Requires confirmation.',
  inputSchema: z.object({
    baseUrl: z.string(),
    token: z.string().optional(),
    shotTaskId: z.string().describe('Kitsu task ID to update.'),
    status: z.enum(['todo', 'in_progress', 'ready_for', 'done', 'failed']).describe('New status.'),
    comment: z.string().optional().describe('Review comment or QA score summary.'),
    confirm: z.boolean(),
    confirmationText: z.string()
  }),
  handler: async (args: {
    baseUrl: string;
    token?: string;
    shotTaskId: string;
    status: 'todo' | 'in_progress' | 'ready_for' | 'done' | 'failed';
    comment?: string;
    confirm: boolean;
    confirmationText: string;
  }) => {
    if (!args.confirm || args.confirmationText !== 'I understand this will modify the Kitsu production tracker') {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'unsupported',
              reason: 'DESTRUCTIVE_ACTION_REQUIRES_CONFIRMATION',
              requiredConfirmationText: 'I understand this will modify the Kitsu production tracker'
            }, null, 2)
          }
        ]
      };
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (args.token) headers['Authorization'] = `Bearer ${args.token}`;

    const statusShortName = args.status === 'done' ? 'app' : args.status === 'in_progress' ? 'wip' : 'todo';

    try {
      const res = await fetch(`${args.baseUrl}/api/tasks/${args.shotTaskId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ task_status_short_name: statusShortName, comment: args.comment })
      });

      if (!res.ok) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'error',
                reason: 'KITSU_WRITEBACK_FAILED',
                httpStatus: res.status,
                httpStatusText: res.statusText
              }, null, 2)
            }
          ]
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'success',
              shotTaskId: args.shotTaskId,
              newStatus: args.status
            }, null, 2)
          }
        ]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              reason: 'KITSU_NETWORK_ERROR',
              message: err?.message ?? String(err)
            }, null, 2)
          }
        ]
      };
    }
  }
};
