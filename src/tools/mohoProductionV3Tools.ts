import { z } from 'zod';
import { FactoryAuth, FactoryFoundationStore } from '../adapters/factoryFoundation/index.js';
import { MohoProductionV3Orchestrator, minimumRoleForV3Action } from '../orchestrators/mohoProductionV3/index.js';
import {
  mohoProductionV3StageSchema,
  mohoProductionV3StartInputSchema
} from '../schemas/mohoProductionV3.js';
import { createMohoProductionV3StageExecutor } from '../services/mohoProductionV3StageExecutor/index.js';

const authTokenSchema = z.string().optional().describe('Factory access token when HARMONY_FACTORY_TOKENS is configured.');
const jobSchema = z.object({
  jobId: z.string().min(1),
  authToken: authTokenSchema
}).strict();

type ProductionOrchestrator = Pick<
  MohoProductionV3Orchestrator,
  'start' | 'status' | 'resume' | 'cancel' | 'approve' | 'inspectStage' | 'rerunStage'
>;

export function createMohoProductionV3Tools(options: {
  orchestrator?: ProductionOrchestrator;
  auth?: FactoryAuth;
} = {}) {
  const auth = options.auth ?? new FactoryAuth();
  const orchestrator = options.orchestrator ?? new MohoProductionV3Orchestrator({
    store: new FactoryFoundationStore(),
    executor: createMohoProductionV3StageExecutor()
  });
  return [
    {
      name: 'moho.production.v3.start',
      description: 'Starts the fail-closed Moho Pro 14 production pipeline from artwork, brief and optional WAV dialogue. PSD is unsupported.',
      inputSchema: mohoProductionV3StartInputSchema.extend({ authToken: authTokenSchema }),
      handler: async (args: z.input<typeof mohoProductionV3StartInputSchema> & { authToken?: string }) => {
        auth.authorize(args.authToken, minimumRoleForV3Action('start'));
        const { authToken: _authToken, ...input } = args;
        return orchestrator.start(input);
      }
    },
    {
      name: 'moho.production.v3.status',
      description: 'Returns durable status, stage progress, approvals, retake usage, errors and verified delivery paths.',
      inputSchema: jobSchema,
      handler: async (args: z.infer<typeof jobSchema>) => {
        auth.authorize(args.authToken, minimumRoleForV3Action('status'));
        return orchestrator.status(args.jobId);
      }
    },
    {
      name: 'moho.production.v3.resume',
      description: 'Resumes from the last completed and hash-recorded checkpoint. It never restarts completed stages needlessly.',
      inputSchema: jobSchema,
      handler: async (args: z.infer<typeof jobSchema>) => {
        auth.authorize(args.authToken, minimumRoleForV3Action('resume'));
        return orchestrator.resume(args.jobId);
      }
    },
    {
      name: 'moho.production.v3.cancel',
      description: 'Cancels a production job without publishing unverified output.',
      inputSchema: jobSchema,
      handler: async (args: z.infer<typeof jobSchema>) => {
        auth.authorize(args.authToken, minimumRoleForV3Action('cancel'));
        return orchestrator.cancel(args.jobId);
      }
    },
    {
      name: 'moho.production.v3.approve',
      description: 'Director approval or rejection for rig blueprint, key-pose animatic or final render. Rejection consumes the shared two-retake budget.',
      inputSchema: z.object({
        jobId: z.string().min(1),
        approvalId: z.string().min(1),
        decision: z.enum(['approve', 'reject']),
        feedbackText: z.string().default('Approved.'),
        annotationPaths: z.array(z.string().min(1)).default([]),
        authToken: authTokenSchema
      }).strict(),
      handler: async (args: {
        jobId: string;
        approvalId: string;
        decision: 'approve' | 'reject';
        feedbackText?: string;
        annotationPaths?: string[];
        authToken?: string;
      }) => {
        const principal = auth.authorize(args.authToken, minimumRoleForV3Action('approve'));
        return orchestrator.approve(args.jobId, args.approvalId, args.decision, principal, {
          text: args.feedbackText ?? 'Approved.',
          annotationPaths: args.annotationPaths ?? []
        });
      }
    },
    {
      name: 'moho.production.v3.inspect_stage',
      description: 'Inspects one stage checkpoint, immutable artifacts, hashes, provenance and approval history.',
      inputSchema: z.object({
        jobId: z.string().min(1),
        stage: mohoProductionV3StageSchema,
        authToken: authTokenSchema
      }).strict(),
      handler: async (args: { jobId: string; stage: z.infer<typeof mohoProductionV3StageSchema>; authToken?: string }) => {
        auth.authorize(args.authToken, minimumRoleForV3Action('inspect_stage'));
        return orchestrator.inspectStage(args.jobId, args.stage);
      }
    },
    {
      name: 'moho.production.v3.rerun_stage',
      description: 'Invalidates a stage and every dependent artifact. Resetting approved work requires director rights and a reason.',
      inputSchema: z.object({
        jobId: z.string().min(1),
        stage: mohoProductionV3StageSchema,
        reason: z.string().min(1),
        authToken: authTokenSchema
      }).strict(),
      handler: async (args: { jobId: string; stage: z.infer<typeof mohoProductionV3StageSchema>; reason: string; authToken?: string }) => {
        const principal = auth.authorize(args.authToken, minimumRoleForV3Action('rerun_stage'));
        return orchestrator.rerunStage(args.jobId, args.stage, principal, args.reason);
      }
    }
  ];
}

export const mohoProductionV3Tools = createMohoProductionV3Tools();
