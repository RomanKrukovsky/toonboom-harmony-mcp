import { z } from 'zod';
import { MlError } from '../errors/mlErrorRegistry.js';
import { MlOrchestrator } from '../services/mlOrchestrator/index.js';
import { MlProviderRegistry } from '../services/mlProviderRegistry/index.js';
import { ModelRouter, type HostProfile } from '../services/modelRouter/index.js';
import { DataRegistry } from '../services/dataRegistry/index.js';
import { DatasetPolicyEngine } from '../services/datasetPolicyEngine/index.js';
import { ConsentRecordRegistry, makeConsent } from '../services/consentRecordRegistry/index.js';
import { QualityDirector, type QualityInput } from '../services/qualityDirector/index.js';
import { AcceptanceOrchestrator, type AcceptanceConfig } from '../services/acceptanceWorkflow/index.js';
import { HarmonyActionRecorderV2 } from '../services/harmonyActionRecorderV2/index.js';

const datasetIdSchema = z.string().min(1);
const consentIdSchema = z.string().min(1);

const consentInputShape = z.object({
  subjectPseudonym: z.string().min(1),
  scope: z.enum(['voice_clone', 'face_performance_clone', 'full_digital_actor_clone']),
  permittedProjects: z.array(z.string().min(1)).min(1),
  permittedUntil: z.string().nullable().optional(),
  sourceRecordingSha256: z.string().nullable().optional()
});

const qualityInputShape = z.object({
  scenePath: z.string().min(1),
  resolution: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }).strict(),
  fps: z.number().positive(),
  frameCount: z.number().int().positive(),
  startFrame: z.number().int().min(1),
  nodes: z.array(z.object({ nodeId: z.string().min(1), type: z.string().min(1), outputs: z.array(z.string()).default([]), inputs: z.array(z.string()).default([]) }).strict()),
  drawings: z.array(z.object({ elementName: z.string().min(1), drawingName: z.string().min(1), visibleFromFrame: z.number().int().min(1), visibleToFrame: z.number().int().min(1) }).strict()).default([]),
  palettes: z.array(z.object({ paletteName: z.string().min(1), colorIds: z.array(z.string()).default([]) }).strict()).default([]),
  functionPoints: z.array(z.object({ nodeId: z.string().min(1), attribute: z.string().min(1), count: z.number().int().min(0) }).strict()).default([]),
  audio: z.array(z.object({ nodeId: z.string().min(1), startSec: z.number().min(0), endSec: z.number().min(0), speechFrames: z.array(z.number().int().min(1)).default([]) }).strict()).default([]),
  bitmapsImported: z.boolean().default(false)
}).strict();

const acceptanceConfigShape = z.object({
  shotId: z.string().min(1),
  projectId: z.string().min(1),
  sessionId: z.string().min(1),
  instruction: z.string().min(1),
  scenePath: z.string().min(1),
  captureSource: z.enum(['harmony_qtscript_notifier', 'harmony_python_bridge', 'simulator_snapshot']),
  maxIterations: z.number().int().min(1).max(8).default(3),
  qualityInput: qualityInputShape
}).strict();

export interface MlProductionToolContext {
  orchestrator: MlOrchestrator;
  registry: MlProviderRegistry;
}

export function mlProductionTools(context: MlProductionToolContext): Array<{ name: string; description: string; inputSchema: Record<string, unknown>; handler: (args: unknown) => Promise<unknown> }> {
  const { orchestrator, registry } = context;
  const router = new ModelRouter();
  const datasets = new DataRegistry();
  const datasetPolicy = new DatasetPolicyEngine(datasets);
  const consents = new ConsentRecordRegistry();
  const recorder = new HarmonyActionRecorderV2();
  const director = new QualityDirector();
  const acceptance = new AcceptanceOrchestrator();

  return [
    {
      name: 'harmony.ml.router.select',
      description: 'Pick a provider for a task given a host profile.',
      inputSchema: {
        type: 'object',
        properties: {
          taskType: { type: 'string' },
          executionMode: { type: 'string' },
          preferredProviderId: { type: 'string' },
          allowAnyRepresentation: { type: 'boolean' }
        },
        required: ['taskType', 'executionMode']
      },
      handler: async (raw: unknown) => {
        const args = z.object({ taskType: z.string(), executionMode: z.string(), preferredProviderId: z.string().optional(), allowAnyRepresentation: z.boolean().optional() }).parse(raw);
        const host = orchestrator['host'] as unknown as HostProfile;
        const candidates = registry.getDescriptors().filter(d => d.taskTypes.includes(args.taskType as never));
        const decision = router.select({ taskType: args.taskType as never, executionMode: args.executionMode as never, candidateDescriptors: candidates, host, preferredProviderId: args.preferredProviderId, allowAnyRepresentation: args.allowAnyRepresentation });
        return { selectedProviderId: decision.selectedDescriptor?.providerId ?? null, reasonCodes: decision.reasonCodes, rejected: decision.rejected };
      }
    },
    {
      name: 'harmony.datasets.list',
      description: 'List registered external datasets and their licences.',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => datasets.list()
    },
    {
      name: 'harmony.datasets.evaluate',
      description: 'Run DatasetPolicyEngine on one dataset.',
      inputSchema: {
        type: 'object',
        properties: {
          datasetId: { type: 'string' },
          gate: { type: 'string', enum: ['before_download', 'before_training', 'before_evaluation'] },
          use: { type: 'string', enum: ['commercial_training', 'fine_tuning', 'evaluation_only', 'retrieval_only'] }
        },
        required: ['datasetId', 'gate', 'use']
      },
      handler: async (raw: unknown) => {
        const args = z.object({ datasetId: datasetIdSchema, gate: z.string(), use: z.string() }).parse(raw);
        return datasetPolicy.evaluate(args.datasetId, args.gate as never, args.use as never);
      }
    },
    {
      name: 'harmony.consent.create',
      description: 'Create and persist a consent record.',
      inputSchema: {
        type: 'object',
        properties: {
          subjectPseudonym: { type: 'string' },
          scope: { type: 'string', enum: ['voice_clone', 'face_performance_clone', 'full_digital_actor_clone'] },
          permittedProjects: { type: 'array', items: { type: 'string' } },
          permittedUntil: { type: 'string', nullable: true },
          sourceRecordingSha256: { type: 'string', nullable: true }
        },
        required: ['subjectPseudonym', 'scope', 'permittedProjects']
      },
      handler: async (raw: unknown) => {
        const args = consentInputShape.parse(raw);
        const record = makeConsent(args);
        consents.write(record);
        return record;
      }
    },
    {
      name: 'harmony.consent.requireGranted',
      description: 'Throws if the consent does not exist, is revoked, expired, or out of scope.',
      inputSchema: {
        type: 'object',
        properties: {
          consentId: { type: 'string' },
          projectId: { type: 'string' },
          scope: { type: 'string', enum: ['voice_clone', 'face_performance_clone', 'full_digital_actor_clone'] }
        },
        required: ['consentId']
      },
      handler: async (raw: unknown) => {
        const args = z.object({ consentId: consentIdSchema, projectId: z.string().optional(), scope: z.enum(['voice_clone', 'face_performance_clone', 'full_digital_actor_clone']).optional() }).parse(raw);
        return consents.requireGranted(args.consentId, { projectId: args.projectId, scope: args.scope });
      }
    },
    {
      name: 'harmony.consent.revoke',
      description: 'Revoke a consent record immediately.',
      inputSchema: { type: 'object', properties: { consentId: { type: 'string' } }, required: ['consentId'] },
      handler: async (raw: unknown) => {
        const args = z.object({ consentId: consentIdSchema }).parse(raw);
        return consents.revoke(args.consentId);
      }
    },
    {
      name: 'harmony.quality.evaluate',
      description: 'Run the deterministic QualityDirector on a structural scene snapshot.',
      inputSchema: { type: 'object', properties: { qualityInput: qualityInputShape }, required: ['qualityInput'] },
      handler: async (raw: unknown) => {
        const args = z.object({ qualityInput: qualityInputShape }).parse(raw);
        const input: QualityInput = { schemaVersion: '1.0', ...args.qualityInput };
        return director.evaluate(input);
      }
    },
    {
      name: 'harmony.workflow.acceptance',
      description: 'Run the end-to-end acceptance slice for one shot: QualityDirector → RetakeLoop → Recorder V2.',
      inputSchema: { type: 'object', properties: { config: acceptanceConfigShape }, required: ['config'] },
      handler: async (raw: unknown) => {
        const args = z.object({ config: acceptanceConfigShape }).parse(raw);
        const config: AcceptanceConfig = { ...args.config, qualityInput: { schemaVersion: '1.0', ...args.config.qualityInput } };
        const structuralApplier = {
          apply: async () => ({ qualityReport: director.evaluate(config.qualityInput) }),
          rollback: async () => undefined
        };
        const result = await acceptance.run(config, structuralApplier);
        return result;
      }
    },
    {
      name: 'harmony.actionRecorderV2.record',
      description: 'Record a V2 dataset entry. The recorder never reads keys or scenes outside the capture root.',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string' },
          projectId: { type: 'string' },
          instruction: { type: 'string' },
          sceneBefore: { type: 'object' },
          sceneAfter: { type: 'object' },
          semanticDiff: { type: 'object' },
          forwardPatch: { type: 'array', items: { type: 'object' } },
          inversePatch: { type: 'array', items: { type: 'object' } },
          approvalDecision: { type: 'string', enum: ['approved', 'rejected', 'pending'] },
          operatorType: { type: 'string', enum: ['animator', 'supervisor', 'system'] },
          episodeId: { type: 'string', nullable: true },
          sequenceId: { type: 'string', nullable: true },
          shotId: { type: 'string', nullable: true },
          harmonyVersion: { type: 'string' }
        },
        required: ['sessionId', 'projectId', 'instruction', 'sceneBefore', 'sceneAfter', 'semanticDiff', 'forwardPatch', 'inversePatch', 'harmonyVersion']
      },
      handler: async (raw: unknown) => {
        const args = z.object({
          sessionId: z.string().min(1),
          projectId: z.string().min(1),
          instruction: z.string().min(1),
          sceneBefore: z.record(z.unknown()),
          sceneAfter: z.record(z.unknown()),
          semanticDiff: z.record(z.unknown()),
          forwardPatch: z.array(z.record(z.unknown())),
          inversePatch: z.array(z.record(z.unknown())),
          approvalDecision: z.enum(['approved', 'rejected', 'pending']).default('pending'),
          operatorType: z.enum(['animator', 'supervisor', 'system']).default('animator'),
          episodeId: z.string().nullable().optional(),
          sequenceId: z.string().nullable().optional(),
          shotId: z.string().nullable().optional(),
          harmonyVersion: z.string().min(1)
        }).parse(raw);
        const entry = recorder.record({
          sessionId: args.sessionId,
          projectId: args.projectId,
          instruction: args.instruction,
          sceneBefore: args.sceneBefore,
          sceneAfter: args.sceneAfter,
          semanticDiff: {
            affectedNodes: [],
            affectedFrames: [],
            palettes: [],
            deformerChains: [],
            masterControllerChanges: [],
            soundColumns: [],
            cameraStates: [],
            writeNodes: [],
            functionCurves: [],
            ...((args.semanticDiff ?? {}) as Record<string, never>)
          },
          forwardPatch: args.forwardPatch.map(p => ({ opId: (p as { opId: string }).opId, opcode: (p as { opcode: string }).opcode, inverseOpId: (p as { inverseOpId?: string }).inverseOpId ?? `${(p as { opId: string }).opId}_inv` })),
          inversePatch: args.inversePatch.map(p => ({ opId: (p as { opId: string }).opId, opcode: (p as { opcode: string }).opcode })),
          approvalDecision: args.approvalDecision,
          operatorType: args.operatorType,
          episodeId: args.episodeId ?? null,
          sequenceId: args.sequenceId ?? null,
          shotId: args.shotId ?? null,
          harmonyVersion: { product: 'unknown', version: args.harmonyVersion, buildId: null }
        });
        return entry;
      }
    }
  ];
}
