import fs from 'fs';
import path from 'path';
import {
  FactoryFoundationStore,
  type FactoryApproval,
  type FactoryRole,
  type Principal
} from '../../adapters/factoryFoundation/index.js';
import {
  MOHO_PRODUCTION_V3_STAGES,
  mohoProductionV3StartInputSchema,
  mohoProductionV3ErrorCodeSchema,
  type MohoProductionV3ErrorCode,
  type MohoProductionV3Gate,
  type MohoProductionV3Stage,
  type MohoProductionV3StartInput,
  type MohoProductionV3Status
} from '../../schemas/mohoProductionV3.js';
import { verifyPathAccess } from '../../security.js';

export interface MohoProductionV3StageArtifactOutput {
  path: string;
  mediaType: string;
  provenance: Record<string, unknown>;
}

export interface MohoProductionV3StageResult {
  checkpoint: Record<string, unknown>;
  artifacts: MohoProductionV3StageArtifactOutput[];
  confidence?: number;
  modelCalls?: Array<{
    provider: string;
    model: string;
    requestSha256: string;
    responseSha256?: string;
    status: 'running' | 'completed' | 'failed';
    metadata?: Record<string, unknown>;
  }>;
}

export interface MohoProductionV3StageContext {
  jobId: string;
  stage: MohoProductionV3Stage;
  input: MohoProductionV3StartInput;
  previousCheckpoints: Partial<Record<MohoProductionV3Stage, Record<string, unknown>>>;
  patches: ApprovalPatchV3[];
  attempt: number;
}

export type MohoProductionV3StageExecutor = (
  context: MohoProductionV3StageContext
) => Promise<MohoProductionV3StageResult>;

export interface ApprovalPatchV3 {
  patchType: 'pivot' | 'rig' | 'drawing' | 'timing' | 'pose' | 'camera' | 'render' | 'style' | 'stage_instruction';
  targetStage: MohoProductionV3Stage;
  instruction: string;
  annotationPaths: string[];
}

export interface MohoProductionV3StatusView {
  jobId: string;
  status: MohoProductionV3Status;
  progress: number;
  currentStage: MohoProductionV3Stage | null;
  pendingApproval: FactoryApproval | null;
  approvals: FactoryApproval[];
  retakesUsed: number;
  error: { code: MohoProductionV3ErrorCode; message: string; stage?: string } | null;
  delivery: { mohoPath: string; mp4Path: string } | null;
  steps: Array<{ name: string; status: string; attempt: number; checkpoint: Record<string, unknown> | null }>;
}

class ProductionStageError extends Error {
  constructor(
    readonly code: MohoProductionV3ErrorCode,
    message: string,
    readonly disposition: 'blocked' | 'failed' = 'failed'
  ) {
    super(message);
    this.name = 'ProductionStageError';
  }
}

const GATE_AFTER_STAGE: Partial<Record<MohoProductionV3Stage, MohoProductionV3Gate>> = {
  rig_blueprint: 'rig_blueprint',
  key_pose_animatic: 'key_pose_animatic',
  qa: 'final_render'
};

const RETAKE_STAGE: Record<MohoProductionV3Gate, MohoProductionV3Stage> = {
  rig_blueprint: 'rig_blueprint',
  key_pose_animatic: 'performance_plan',
  final_render: 'final_animation'
};

function inputAssetPaths(input: MohoProductionV3StartInput): string[] {
  const paths = [...input.styleReferencePaths, ...input.dialogueTracks.map(track => track.audioPath)];
  switch (input.artwork.mode) {
    case 'layered_manifest':
      paths.push(
        input.artwork.manifestPath,
        ...input.artwork.assetPaths,
        ...input.artwork.propPaths
      );
      if (input.artwork.backgroundPath) paths.push(input.artwork.backgroundPath);
      break;
    case 'flat_characters':
      paths.push(...input.artwork.imagePaths, ...input.artwork.propPaths);
      if (input.artwork.backgroundPath) paths.push(input.artwork.backgroundPath);
      break;
    case 'flat_scene':
      paths.push(input.artwork.imagePath);
      break;
    default: {
      const exhaustive: never = input.artwork;
      return exhaustive;
    }
  }
  return paths;
}

function translateFeedback(
  gate: MohoProductionV3Gate,
  text: string,
  annotationPaths: string[]
): ApprovalPatchV3[] {
  const normalized = text.toLowerCase();
  let patchType: ApprovalPatchV3['patchType'] = 'stage_instruction';
  if (/pivot|пивот|сустав|joint/.test(normalized)) patchType = 'pivot';
  else if (/bone|кость|rig|риг|binding|привяз/.test(normalized)) patchType = 'rig';
  else if (/draw|рисун|mouth|рот|eye|глаз|hand|рук/.test(normalized)) patchType = 'drawing';
  else if (/timing|тайм|frame|кадр|lip|синхрон/.test(normalized)) patchType = 'timing';
  else if (/pose|поз|gesture|жест|emotion|эмоц/.test(normalized)) patchType = 'pose';
  else if (/camera|камер|zoom|зум/.test(normalized)) patchType = 'camera';
  else if (/render|рендер|artifact|артефакт/.test(normalized)) patchType = 'render';
  else if (/color|цвет|style|стил|palette|палитр/.test(normalized)) patchType = 'style';
  const targetStage = gate === 'rig_blueprint' && (patchType === 'drawing' || patchType === 'style')
    ? 'decomposition'
    : RETAKE_STAGE[gate];
  return [{ patchType, targetStage, instruction: text, annotationPaths }];
}

function asError(error: unknown, stage: MohoProductionV3Stage): {
  code: MohoProductionV3ErrorCode;
  message: string;
  stage: MohoProductionV3Stage;
  disposition: 'blocked' | 'failed';
} {
  if (error instanceof ProductionStageError) {
    return { code: error.code, message: error.message, stage, disposition: error.disposition };
  }
  if (error && typeof error === 'object' && 'code' in error) {
    const rawCode = String((error as { code: unknown }).code);
    const nativeCode = mohoProductionV3ErrorCodeSchema.safeParse(rawCode);
    if (nativeCode.success) {
      return { code: nativeCode.data, message: error instanceof Error ? error.message : String(error), stage, disposition: 'failed' };
    }
    if (rawCode.startsWith('PROVIDER_')) {
      return { code: 'PROVIDER_UNAVAILABLE', message: error instanceof Error ? error.message : String(error), stage, disposition: 'failed' };
    }
    if (rawCode === 'ALIGNER_UNAVAILABLE') {
      return { code: 'ALIGNER_UNAVAILABLE', message: error instanceof Error ? error.message : String(error), stage, disposition: 'blocked' };
    }
    if (rawCode.startsWith('ALIGNMENT_')) {
      return { code: 'ALIGNMENT_FAILED', message: error instanceof Error ? error.message : String(error), stage, disposition: 'failed' };
    }
  }
  return {
    code: 'UNSUPPORTED',
    message: error instanceof Error ? error.message : String(error),
    stage,
    disposition: 'failed'
  };
}

export class MohoProductionV3Orchestrator {
  private readonly store: FactoryFoundationStore;
  private readonly executor: MohoProductionV3StageExecutor;
  private readonly activeJobs = new Map<string, Promise<MohoProductionV3StatusView>>();

  constructor(options: { store?: FactoryFoundationStore; executor: MohoProductionV3StageExecutor }) {
    this.store = options.store ?? new FactoryFoundationStore();
    this.executor = options.executor;
  }

  async start(rawInput: unknown): Promise<MohoProductionV3StatusView> {
    const input = mohoProductionV3StartInputSchema.parse(rawInput);
    const outputDir = verifyPathAccess(input.outputDir);
    for (const assetPath of inputAssetPaths(input)) {
      const verifiedPath = verifyPathAccess(assetPath);
      if (!fs.existsSync(verifiedPath) || !fs.statSync(verifiedPath).isFile() || fs.statSync(verifiedPath).size === 0) {
        throw new ProductionStageError('ASSET_UNREADABLE', `Asset is missing, empty, or not a file: ${assetPath}`);
      }
    }
    fs.mkdirSync(outputDir, { recursive: true });
    const job = await this.store.createJob(
      'moho.production.v3',
      { ...input, outputDir },
      [...MOHO_PRODUCTION_V3_STAGES]
    );
    return this.resume(job.jobId);
  }

  async resume(jobId: string): Promise<MohoProductionV3StatusView> {
    const running = this.activeJobs.get(jobId);
    if (running) return running;
    const execution = this.advance(jobId).finally(() => this.activeJobs.delete(jobId));
    this.activeJobs.set(jobId, execution);
    return execution;
  }

  async cancel(jobId: string): Promise<MohoProductionV3StatusView> {
    await this.store.cancel(jobId);
    return this.status(jobId);
  }

  async approve(
    jobId: string,
    approvalId: string,
    decision: 'approve' | 'reject',
    principal: Principal,
    feedback: { text: string; annotationPaths?: string[] }
  ): Promise<MohoProductionV3StatusView> {
    if (!['director', 'pipeline_admin', 'system_admin'].includes(principal.role)) {
      throw new Error('Approval decisions require director role.');
    }
    const approvals = await this.store.listApprovals(jobId);
    const approval = approvals.find(item => item.approvalId === approvalId);
    if (!approval) throw new Error(`Approval ${approvalId} does not belong to job ${jobId}.`);
    const annotationPaths = feedback.annotationPaths ?? [];
    for (const annotationPath of annotationPaths) {
      const verifiedPath = verifyPathAccess(annotationPath);
      if (!fs.existsSync(verifiedPath) || !fs.statSync(verifiedPath).isFile()) {
        throw new Error(`Approval annotation is missing: ${annotationPath}`);
      }
    }
    const patches = decision === 'reject'
      ? translateFeedback(approval.gate as MohoProductionV3Gate, feedback.text, annotationPaths)
      : [];
    await this.store.decideApproval(approvalId, decision, principal.id, { ...feedback, annotationPaths, patches });
    if (decision === 'reject') {
      const rejects = await this.store.countApprovalRejects(jobId);
      if (rejects >= 2) {
        await this.store.setJob(jobId, 'blocked', (await this.store.getJob(jobId)).progress, undefined, {
          code: 'RETAKE_BUDGET_EXHAUSTED',
          message: 'The shared two-retake budget is exhausted.',
          stage: approval.stage
        });
        return this.status(jobId);
      }
      const restartStage = patches
        .map(patch => patch.targetStage)
        .sort((left, right) => MOHO_PRODUCTION_V3_STAGES.indexOf(left) - MOHO_PRODUCTION_V3_STAGES.indexOf(right))[0]
        ?? RETAKE_STAGE[approval.gate as MohoProductionV3Gate];
      await this.store.invalidateStagesFrom(
        jobId,
        restartStage,
        [...MOHO_PRODUCTION_V3_STAGES],
        principal.role,
        feedback.text
      );
      return this.status(jobId);
    }
    const job = await this.store.getJob(jobId);
    await this.store.setJob(jobId, 'queued', job.progress, { approvedGate: approval.gate });
    return this.status(jobId);
  }

  async rerunStage(
    jobId: string,
    stage: MohoProductionV3Stage,
    principal: Principal,
    reason: string
  ): Promise<MohoProductionV3StatusView> {
    await this.store.invalidateStagesFrom(
      jobId,
      stage,
      [...MOHO_PRODUCTION_V3_STAGES],
      principal.role,
      reason
    );
    return this.resume(jobId);
  }

  async inspectStage(jobId: string, stage: MohoProductionV3Stage): Promise<{
    jobId: string;
    stage: MohoProductionV3Stage;
    step: Record<string, unknown> | null;
    artifacts: Awaited<ReturnType<FactoryFoundationStore['listStageArtifacts']>>;
    approvals: FactoryApproval[];
  }> {
    const job = await this.store.getJob(jobId);
    return {
      jobId,
      stage,
      step: job.steps.find(item => item.name === stage) ?? null,
      artifacts: await this.store.listStageArtifacts(jobId, stage),
      approvals: (await this.store.listApprovals(jobId)).filter(item => item.stage === stage)
    };
  }

  async status(jobId: string): Promise<MohoProductionV3StatusView> {
    const job = await this.store.getJob(jobId);
    const approvals = await this.store.listApprovals(jobId);
    const pendingApproval = [...approvals].reverse().find(item => item.status === 'pending') ?? null;
    const currentStep = job.steps.find(item => item.status !== 'completed');
    const delivery = job.status === 'completed'
      ? await this.deliveryEvidence(jobId)
      : null;
    return {
      jobId,
      status: job.status as MohoProductionV3Status,
      progress: job.progress,
      currentStage: (currentStep?.name as MohoProductionV3Stage | undefined) ?? null,
      pendingApproval,
      approvals,
      retakesUsed: await this.store.countApprovalRejects(jobId),
      error: job.error,
      delivery,
      steps: job.steps
    };
  }

  private async advance(jobId: string): Promise<MohoProductionV3StatusView> {
    let job = await this.store.getJob(jobId);
    if (['completed', 'cancelled', 'blocked'].includes(job.status)) return this.status(jobId);
    const pending = (await this.store.listApprovals(jobId)).find(item => item.status === 'pending');
    if (pending) {
      await this.store.setJob(jobId, 'awaiting_approval', job.progress, { pendingApprovalId: pending.approvalId });
      return this.status(jobId);
    }
    await this.store.setJob(jobId, 'running', job.progress);
    const input = mohoProductionV3StartInputSchema.parse(job.input);

    for (const [stageIndex, stage] of MOHO_PRODUCTION_V3_STAGES.entries()) {
      job = await this.store.getJob(jobId);
      if (job.cancelRequested) {
        await this.store.setJob(jobId, 'cancelled', job.progress, undefined, { code: 'CANCELLED', message: 'Job was cancelled.', stage });
        return this.status(jobId);
      }
      const step = job.steps.find(item => item.name === stage);
      if (step?.status === 'completed') continue;
      try {
        await this.store.setStep(jobId, stage, 'running', { startedAt: new Date().toISOString() });
        const refreshed = await this.store.getJob(jobId);
        const previousCheckpoints = Object.fromEntries(
          refreshed.steps
            .filter(item => item.status === 'completed' && item.checkpoint)
            .map(item => [item.name, item.checkpoint])
        ) as Partial<Record<MohoProductionV3Stage, Record<string, unknown>>>;
        const patches = (await this.store.listApprovals(jobId))
          .filter(approval => approval.status === 'rejected')
          .flatMap(approval => {
            const decisionPatches = approval.decision?.patches;
            return Array.isArray(decisionPatches) ? decisionPatches : [];
          }) as ApprovalPatchV3[];
        const result = await this.executor({
          jobId,
          stage,
          input,
          previousCheckpoints,
          patches,
          attempt: Number(step?.attempt ?? 0) + 1
        });
        for (const modelCall of result.modelCalls ?? []) {
          await this.store.recordModelCall({ jobId, stage, ...modelCall });
        }
        const linkedArtifacts = [];
        for (const artifact of result.artifacts) {
          linkedArtifacts.push(await this.store.recordStageArtifact(
            jobId,
            stage,
            artifact.path,
            artifact.mediaType,
            artifact.provenance
          ));
        }
        const checkpoint = {
          ...result.checkpoint,
          artifactIds: linkedArtifacts.map(artifact => artifact.artifactId),
          artifactSha256: linkedArtifacts.map(artifact => artifact.sha256),
          ...(result.confidence === undefined ? {} : { confidence: result.confidence }),
          ...(stage === 'decomposition' && result.confidence !== undefined && result.confidence < 0.85
            ? { lowConfidenceConfirmationRequired: true }
            : {})
        };
        await this.store.setStep(jobId, stage, 'completed', checkpoint);
        const progress = (stageIndex + 1) / MOHO_PRODUCTION_V3_STAGES.length;
        await this.store.setJob(jobId, 'running', progress);
        if (stage === 'decomposition' && (result.confidence === undefined || result.confidence < 0.6)) {
          throw new ProductionStageError(
            'DECOMPOSITION_LOW_CONFIDENCE',
            `Artwork decomposition confidence ${String(result.confidence)} is below 0.6.`,
            'blocked'
          );
        }
        const gate = GATE_AFTER_STAGE[stage];
        if (gate) {
          const approvals = await this.store.listApprovals(jobId);
          const alreadyApproved = approvals.some(item => item.gate === gate && item.status === 'approved');
          if (!alreadyApproved) {
            const gateArtifacts = gate === 'final_render'
              ? (await this.store.listStageArtifacts(jobId)).filter(artifact => artifact.valid).map(artifact => artifact.artifactId)
              : linkedArtifacts.map(artifact => artifact.artifactId);
            const approval = await this.store.requestApproval(jobId, gate, stage, gateArtifacts);
            await this.store.setJob(jobId, 'awaiting_approval', progress, { pendingApprovalId: approval.approvalId });
            return this.status(jobId);
          }
        }
      } catch (error) {
        const normalized = asError(error, stage);
        await this.store.setStep(jobId, stage, normalized.disposition, { error: normalized.message, code: normalized.code });
        await this.store.setJob(jobId, normalized.disposition, stageIndex / MOHO_PRODUCTION_V3_STAGES.length, undefined, normalized);
        return this.status(jobId);
      }
    }

    const delivery = await this.assertDeliveryEvidence(jobId);
    await this.store.setJob(jobId, 'completed', 1, delivery);
    return this.status(jobId);
  }

  private async deliveryEvidence(jobId: string): Promise<{ mohoPath: string; mp4Path: string } | null> {
    const artifacts = (await this.store.listStageArtifacts(jobId)).filter(artifact => artifact.valid);
    const moho = artifacts.find(artifact => artifact.sourcePath.toLowerCase().endsWith('.moho'));
    const mp4 = artifacts.find(artifact => artifact.sourcePath.toLowerCase().endsWith('.mp4'));
    return moho && mp4 ? { mohoPath: moho.sourcePath, mp4Path: mp4.sourcePath } : null;
  }

  private async assertDeliveryEvidence(jobId: string): Promise<{ mohoPath: string; mp4Path: string }> {
    const job = await this.store.getJob(jobId);
    const nativeRig = job.steps.find(item => item.name === 'native_rig')?.checkpoint;
    const nativeRender = job.steps.find(item => item.name === 'native_render')?.checkpoint;
    const qa = job.steps.find(item => item.name === 'qa')?.checkpoint;
    const delivery = await this.deliveryEvidence(jobId);
    if (!delivery || nativeRig?.verified !== true || nativeRig?.freshProcessRoundTrip !== true) {
      throw new ProductionStageError('RIG_NATIVE_FAILED', 'Verified .moho fresh-process roundtrip evidence is missing.');
    }
    if (nativeRender?.verified !== true || !nativeRender?.ffprobe) {
      throw new ProductionStageError('RENDER_FAILED', 'Verified MP4 and ffprobe evidence is missing.');
    }
    if (qa?.passed !== true) {
      throw new ProductionStageError('QA_FAILED', 'Final QA did not pass.');
    }
    for (const artifactPath of [delivery.mohoPath, delivery.mp4Path]) {
      if (!fs.existsSync(artifactPath) || fs.statSync(artifactPath).size === 0) {
        throw new ProductionStageError('RENDER_FAILED', `Delivery artifact is missing or empty: ${path.basename(artifactPath)}`);
      }
    }
    return delivery;
  }
}

export function minimumRoleForV3Action(action: 'start' | 'status' | 'resume' | 'cancel' | 'approve' | 'inspect_stage' | 'rerun_stage'): FactoryRole {
  switch (action) {
    case 'start': return 'artist';
    case 'status': return 'viewer';
    case 'resume': return 'artist';
    case 'cancel': return 'artist';
    case 'approve': return 'director';
    case 'inspect_stage': return 'viewer';
    case 'rerun_stage': return 'artist';
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}
