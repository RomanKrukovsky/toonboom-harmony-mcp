import crypto from 'crypto';
import os from 'os';
import { MlProviderRegistry, type HostCapabilities, type MlProviderDescriptor, type ProviderReadiness } from '../mlProviderRegistry/index.js';
import { MlJobStore, computeInputHash, type StoredJob } from '../mlJobStore/index.js';
import { getModelCatalog, type ModelCatalog, type ModelReadiness } from '../modelCatalog/index.js';
import { LicensePolicyEngine, type LicenseDecision } from '../licensePolicyEngine/index.js';
import { MlRuntimeClient } from '../../clients/mlRuntimeClient.js';
import { MlError, toMlError, isRetryableMlErrorCode, type MlErrorCode } from '../../errors/mlErrorRegistry.js';
import {
  mlJobRequestV2Schema,
  mlJobResultV2Schema,
  modelExecutionProvenanceSchema,
  type MlJobRequestV2,
  type MlJobResultV2,
  type MlTaskType,
  type ExecutionMode,
  type ArtifactReference
} from '../../schemas/ml.js';

/**
 * MlOrchestrator.
 *
 * Replaces the eleven-line facade that held a registry reference and a comment. The lifecycle
 * it actually implements:
 *
 *   validate request  ->  select provider  ->  licence gate  ->  hardware & memory gate
 *   ->  weights readiness (digest re-checked)  ->  idempotency lookup  ->  persist job
 *   ->  dispatch to the Python runtime  ->  poll with timeout and cancellation
 *   ->  validate output against the provider's contract  ->  persist provenance  ->  return typed result
 *
 * Honesty rules encoded here rather than documented elsewhere:
 *   - `realInferenceExecuted` is copied from the runtime and cross-checked against the weights
 *     digest; a result claiming real inference with no digest is rejected as invalid output.
 *   - A cache hit returns the *stored* provenance with `cacheHit: true`. It never re-stamps
 *     fresh timestamps onto an old computation.
 *   - Retry is allowed only for transport, post-unload OOM and isolated-worker crashes. Schema,
 *     licence and untrusted-input failures are terminal by construction, because the decision
 *     comes from the error registry rather than from a call-site judgement.
 */

export interface SubmitJobInput {
  taskType: MlTaskType;
  /** Optional: when omitted, `selectProvider` picks one. */
  providerId?: string;
  inputArtifacts: ArtifactReference[];
  parameters?: Record<string, unknown>;
  executionMode?: ExecutionMode;
  correlationId?: string;
  idempotencyKey?: string;
  timeoutMs?: number;
  seed?: number | null;
  requestedDevice?: 'auto' | 'cpu' | 'mps' | 'cuda' | 'remote';
  maxAttempts?: number;
}

export interface ProviderSelection {
  providerId: string;
  descriptor: MlProviderDescriptor;
  reasonCodes: string[];
  rejected: Array<{ providerId: string; reason: string }>;
}

export interface OrchestratorOptions {
  registry?: MlProviderRegistry;
  store?: MlJobStore;
  catalog?: ModelCatalog;
  licenseEngine?: LicensePolicyEngine;
  runtime?: MlRuntimeClient;
  host?: HostCapabilities;
  /** Polling interval while waiting for a runtime job. */
  pollIntervalMs?: number;
}

export interface OrchestratorMetrics {
  queueDepth: number;
  byStatus: Record<string, number>;
  cacheHits: number;
  licenseBlocks: number;
  oomCount: number;
  cancellations: number;
  submitted: number;
}

export class MlOrchestrator {
  private readonly registry: MlProviderRegistry;
  private readonly store: MlJobStore;
  private readonly catalog: ModelCatalog;
  private readonly licenseEngine: LicensePolicyEngine;
  private readonly runtime: MlRuntimeClient;
  private readonly host: HostCapabilities;
  private readonly pollIntervalMs: number;

  private readonly inFlight = new Map<string, AbortController>();
  private readonly readinessCache = new Map<string, ModelReadiness>();
  private readonly counters = { cacheHits: 0, licenseBlocks: 0, oomCount: 0, cancellations: 0, submitted: 0 };

  constructor(registryOrOptions: MlProviderRegistry | OrchestratorOptions = {}, maybeOptions: OrchestratorOptions = {}) {
    // The old constructor took a bare registry. Both shapes are accepted so existing callers
    // keep working while new code passes a full options object.
    const options: OrchestratorOptions = registryOrOptions instanceof MlProviderRegistry
      ? { ...maybeOptions, registry: registryOrOptions }
      : registryOrOptions;

    this.registry = options.registry ?? new MlProviderRegistry();
    this.store = options.store ?? new MlJobStore();
    this.catalog = options.catalog ?? getModelCatalog();
    this.licenseEngine = options.licenseEngine ?? new LicensePolicyEngine(this.catalog);
    this.runtime = options.runtime ?? new MlRuntimeClient();
    this.host = options.host ?? probeHostCapabilities();
    this.pollIntervalMs = options.pollIntervalMs ?? 500;
  }

  getRegistry(): MlProviderRegistry { return this.registry; }
  getStore(): MlJobStore { return this.store; }

  async initialize(): Promise<{ migrations: number[]; interruptedJobs: string[] }> {
    const migrations = await this.store.initialize();
    const interruptedJobs = await this.store.recoverInterruptedJobs();
    for (const entry of this.catalog.list()) {
      await this.store.upsertModel({
        modelId: entry.modelId,
        providerId: entry.providerId,
        displayName: entry.displayName,
        taskTypes: [...entry.taskTypes],
        upstreamRepository: entry.upstreamRepository,
        upstreamCommit: entry.upstreamCommit,
        cacheKey: entry.cacheKey,
        maturity: entry.maturity
      });
      const readiness = this.getModelReadiness(entry.modelId);
      await this.store.upsertModelRevision({
        modelId: entry.modelId,
        revision: entry.revision,
        weightsFiles: entry.weightsFiles.map(f => f.fileName),
        weightsSha256: entry.weightsFiles.map(f => f.sha256).filter((s): s is string => s !== null),
        hashSource: entry.weightsFiles[0]?.hashSource ?? 'not_published_upstream',
        installed: readiness.installed,
        hashVerified: readiness.hashVerified
      });
    }
    return { migrations: migrations.applied, interruptedJobs };
  }

  /* ------------------------------------------------------------------- readiness --- */

  getModelReadiness(modelId: string, forceReload = false): ModelReadiness {
    if (!forceReload && this.readinessCache.has(modelId)) return this.readinessCache.get(modelId)!;
    const readiness = this.catalog.getModelReadiness(modelId, { extraSearchDirs: legacyWeightDirs(modelId) });
    this.readinessCache.set(modelId, readiness);
    return readiness;
  }

  async getProviderReadiness(providerId: string): Promise<ProviderReadiness> {
    return this.registry.getProviderReadiness(providerId, this.host);
  }

  invalidateCache(scope: { modelId?: string } = {}): void {
    if (scope.modelId) this.readinessCache.delete(scope.modelId);
    else this.readinessCache.clear();
  }

  async unloadModel(modelId: string): Promise<{ unloaded: boolean; freedMb: number | null }> {
    this.invalidateCache({ modelId });
    for (const provider of this.registry.getAll()) {
      if (provider.modelId === modelId && provider.unload) await provider.unload();
    }
    try {
      return await this.runtime.unloadModel(modelId);
    } catch (error) {
      // Unloading a model the runtime never loaded is not an error worth propagating, but the
      // reason is still reported rather than swallowed.
      if (error instanceof MlError && error.code === 'ML_RUNTIME_UNAVAILABLE') {
        return { unloaded: false, freedMb: null };
      }
      throw error;
    }
  }

  /* ------------------------------------------------------------ provider selection --- */

  /**
   * Picks a provider for a task. Rejections are returned, not hidden, so the caller can explain
   * to a human exactly why the obvious candidate was skipped.
   */
  selectProvider(taskType: MlTaskType, opts: { preferredProviderId?: string; requireCommercial?: boolean } = {}): ProviderSelection {
    const candidates = this.registry.getForTask(taskType).filter(p => p.descriptor !== undefined);
    if (candidates.length === 0) {
      throw new MlError('ML_PROVIDER_NOT_FOUND', `no provider is registered for task ${taskType}`, { detail: { taskType } });
    }

    const rejected: Array<{ providerId: string; reason: string }> = [];
    const viable: MlProviderDescriptor[] = [];
    const commercial = opts.requireCommercial ?? this.licenseEngine.getConfig().commercialBuild;

    for (const candidate of candidates) {
      const descriptor = candidate.descriptor!;
      if (opts.preferredProviderId && descriptor.providerId !== opts.preferredProviderId) continue;

      const hardware = this.registry.checkCompatibility(descriptor.providerId, this.host);
      if (hardware.length > 0) {
        rejected.push({ providerId: descriptor.providerId, reason: hardware.map(h => h.message).join('; ') });
        continue;
      }
      const readiness = this.getModelReadiness(descriptor.modelId);
      if (!readiness.hashVerified) {
        rejected.push({ providerId: descriptor.providerId, reason: readiness.blockingReason ?? 'weights not verified' });
        continue;
      }
      if (commercial) {
        const decision = this.licenseEngine.evaluate(descriptor.modelId, 'before_inference', 'inference');
        if (!decision.allowed) {
          rejected.push({ providerId: descriptor.providerId, reason: `licence: ${decision.humanReason}` });
          continue;
        }
      }
      viable.push(descriptor);
    }

    if (viable.length === 0) {
      throw new MlError('ML_PROVIDER_NOT_FOUND', `no viable provider for ${taskType}`, { detail: { taskType, rejected } });
    }

    // Prefer a local device over remote, then the cheaper memory footprint. Nothing here picks
    // a profile from the operating system name; the host probe supplies real device facts.
    viable.sort((a, b) => {
      const localA = a.devices.some(d => d !== 'remote') ? 0 : 1;
      const localB = b.devices.some(d => d !== 'remote') ? 0 : 1;
      if (localA !== localB) return localA - localB;
      return (a.estimatedPeakMemoryMb ?? Number.MAX_SAFE_INTEGER) - (b.estimatedPeakMemoryMb ?? Number.MAX_SAFE_INTEGER);
    });

    const chosen = viable[0];
    return {
      providerId: chosen.providerId,
      descriptor: chosen,
      reasonCodes: [
        chosen.devices.some(d => d !== 'remote') ? 'LOCAL_DEVICE_AVAILABLE' : 'REMOTE_ONLY',
        'WEIGHTS_HASH_VERIFIED',
        commercial ? 'LICENSE_CLEARED_FOR_COMMERCIAL' : 'LICENSE_NOT_REQUIRED_NON_COMMERCIAL'
      ],
      rejected
    };
  }

  /* ------------------------------------------------------------------------ submit --- */

  async submitJob(input: SubmitJobInput): Promise<MlJobResultV2> {
    this.counters.submitted += 1;
    const correlationId = input.correlationId ?? `corr_${crypto.randomUUID()}`;
    const executionMode = input.executionMode ?? 'real_ml';

    const selection = this.selectProviderOrThrow(input, correlationId);
    const descriptor = selection.descriptor;
    const entry = this.catalog.require(descriptor.modelId);

    const request: MlJobRequestV2 = {
      schemaVersion: '2.0',
      jobId: `job_${crypto.randomUUID()}`,
      correlationId,
      idempotencyKey: input.idempotencyKey ?? deriveIdempotencyKey(input, descriptor),
      taskType: input.taskType,
      providerId: descriptor.providerId,
      modelId: descriptor.modelId,
      modelRevision: descriptor.modelRevision,
      executionMode,
      commercialMode: this.licenseEngine.getConfig().commercialBuild ? 'commercial' : 'preview',
      inputArtifacts: input.inputArtifacts,
      parameters: input.parameters ?? {},
      timeoutMs: input.timeoutMs ?? 600_000,
      seed: input.seed ?? null,
      requestedDevice: input.requestedDevice ?? 'auto'
    };

    const parsedRequest = mlJobRequestV2Schema.safeParse(request);
    if (!parsedRequest.success) {
      throw new MlError('ML_INPUT_SCHEMA_INVALID', `job request failed MlJobRequestV2: ${parsedRequest.error.message}`, { correlationId });
    }

    // Provider-specific validation, in addition to the generic envelope.
    const provider = this.registry.get(descriptor.providerId);
    if (provider?.inputSchema) {
      const providerParse = provider.inputSchema.safeParse(request.parameters);
      if (!providerParse.success) {
        throw new MlError('ML_INPUT_SCHEMA_INVALID', `parameters failed ${descriptor.providerId} input contract: ${providerParse.error.message}`, { correlationId, providerId: descriptor.providerId });
      }
    }

    // Licence gate before inference — separate decision from the download and packaging gates.
    let licenseDecision: LicenseDecision;
    try {
      licenseDecision = this.licenseEngine.requireAllowed(descriptor.modelId, 'before_inference', 'inference');
    } catch (error) {
      this.counters.licenseBlocks += 1;
      await this.store.recordLicenseDecision(this.licenseEngine.evaluate(descriptor.modelId, 'before_inference', 'inference'));
      throw error;
    }
    await this.store.recordLicenseDecision(licenseDecision);

    // Weights must be present AND digest-matched. This is re-checked at submit time rather than
    // trusted from a cached readiness snapshot taken at startup.
    const readiness = this.getModelReadiness(descriptor.modelId, true);
    if (!readiness.hashVerified && executionMode === 'real_ml') {
      const code: MlErrorCode = readiness.mismatchedFiles.length ? 'ML_WEIGHTS_HASH_MISMATCH'
        : readiness.untrustedFiles.length ? 'ML_WEIGHTS_HASH_UNVERIFIED'
        : 'ML_MODEL_NOT_INSTALLED';
      throw new MlError(code, readiness.blockingReason ?? 'weights are not verified', { modelId: descriptor.modelId, correlationId });
    }

    const inputHash = computeInputHash(request);

    // Idempotency: identical provider + model + revision + inputs + parameters returns the
    // stored success instead of paying for the same inference twice.
    const existing = await this.store.findByIdempotency(request.idempotencyKey, descriptor.providerId, descriptor.modelId, descriptor.modelRevision, inputHash);
    if (existing && existing.status === 'succeeded' && existing.result) {
      this.counters.cacheHits += 1;
      return withCacheHit(existing.result);
    }
    if (existing && existing.status !== 'succeeded' && existing.status !== 'failed' && existing.status !== 'interrupted') {
      // Same computation already in flight: hand back its live state rather than starting a rival.
      return await this.getJob(existing.jobId);
    }

    const stored = await this.store.insertJob({
      jobId: request.jobId,
      correlationId,
      idempotencyKey: request.idempotencyKey,
      taskType: request.taskType,
      providerId: descriptor.providerId,
      modelId: descriptor.modelId,
      modelRevision: descriptor.modelRevision,
      executionMode,
      commercialMode: request.commercialMode,
      status: 'queued',
      attempt: 0,
      maxAttempts: input.maxAttempts ?? 2,
      request,
      result: null,
      provenance: null,
      errorCode: null,
      errorMessage: null,
      licenseDecisionId: licenseDecision.decisionId,
      inputHash,
      timeoutMs: request.timeoutMs
    });

    if (stored.jobId !== request.jobId && stored.status === 'succeeded' && stored.result) {
      // Lost an idempotency race against a concurrent submitter; their result is ours.
      this.counters.cacheHits += 1;
      return withCacheHit(stored.result);
    }

    return this.executeAttempt(stored, licenseDecision, entry.weightsFiles.map(f => f.sha256).filter((s): s is string => s !== null));
  }

  private selectProviderOrThrow(input: SubmitJobInput, correlationId: string): ProviderSelection {
    try {
      return this.selectProvider(input.taskType, { preferredProviderId: input.providerId });
    } catch (error) {
      throw toMlError(error, 'ML_PROVIDER_NOT_FOUND', { correlationId, detail: { taskType: input.taskType, requestedProviderId: input.providerId } });
    }
  }

  private async executeAttempt(job: StoredJob, licenseDecision: LicenseDecision, weightsSha256: string[]): Promise<MlJobResultV2> {
    const attempt = job.attempt + 1;
    const startedAt = new Date().toISOString();
    const controller = new AbortController();
    this.inFlight.set(job.jobId, controller);

    await this.store.updateStatus(job.jobId, 'running', { attempt, startedAt });
    await this.store.recordAttempt(job.jobId, attempt, { status: 'running', startedAt });

    const deadline = Date.now() + job.timeoutMs;
    try {
      const result = await this.raceWithTimeoutAndCancel(job, controller, deadline);
      const validated = this.validateResult(job, result, weightsSha256, licenseDecision);
      await this.store.updateStatus(job.jobId, validated.status, {
        result: validated,
        provenance: validated.provenance,
        finishedAt: new Date().toISOString()
      });
      await this.store.recordAttempt(job.jobId, attempt, {
        status: validated.status, startedAt, finishedAt: new Date().toISOString(),
        durationMs: validated.provenance?.durationMs ?? null,
        peakMemoryMb: validated.provenance?.peakMemoryMb ?? null,
        device: validated.provenance?.device ?? null
      });
      return validated;
    } catch (error) {
      const mlError = toMlError(error, 'ML_WORKER_CRASHED', { jobId: job.jobId, correlationId: job.correlationId, providerId: job.providerId, modelId: job.modelId });
      if (mlError.code === 'ML_OOM') this.counters.oomCount += 1;
      if (mlError.code === 'ML_CANCELLED') this.counters.cancellations += 1;

      const status = mlError.code === 'ML_CANCELLED' ? 'cancelled' : mlError.code === 'ML_LICENSE_BLOCKED' ? 'blocked' : 'failed';
      await this.store.updateStatus(job.jobId, status, {
        errorCode: mlError.code, errorMessage: mlError.message, finishedAt: new Date().toISOString()
      });
      await this.store.recordAttempt(job.jobId, attempt, {
        status, startedAt, finishedAt: new Date().toISOString(),
        errorCode: mlError.code, errorMessage: mlError.message, retryClass: mlError.retryClass
      });
      throw mlError;
    } finally {
      this.inFlight.delete(job.jobId);
    }
  }

  /**
   * Runs the dispatch against three competing outcomes: completion, timeout and cancellation.
   * Cancellation is observed through the durable store, so a cancel issued by a different
   * process (or after a restart) is still honoured.
   */
  private async raceWithTimeoutAndCancel(job: StoredJob, controller: AbortController, deadline: number): Promise<MlJobResultV2> {
    const dispatch = this.runtime.submit(job.request);

    let settled = false;
    const watchdog = (async (): Promise<never> => {
      while (!settled) {
        if (Date.now() > deadline) {
          controller.abort();
          await this.runtime.cancel(job.jobId).catch(() => undefined);
          throw new MlError('ML_TIMEOUT', `job ${job.jobId} exceeded ${job.timeoutMs} ms`, { jobId: job.jobId });
        }
        if (await this.store.isCancelRequested(job.jobId)) {
          controller.abort();
          await this.runtime.cancel(job.jobId).catch(() => undefined);
          throw new MlError('ML_CANCELLED', `job ${job.jobId} was cancelled`, { jobId: job.jobId });
        }
        await sleep(this.pollIntervalMs);
      }
      throw new MlError('ML_WORKER_CRASHED', 'watchdog exited unexpectedly', { jobId: job.jobId });
    })();

    try {
      return await Promise.race([dispatch, watchdog]);
    } finally {
      settled = true;
      watchdog.catch(() => undefined);
    }
  }

  /**
   * Cross-checks what the runtime claims against what we can prove. A result asserting real
   * inference must carry the same weights digests the catalog verified on disk; otherwise the
   * claim is rejected rather than recorded.
   */
  private validateResult(job: StoredJob, result: MlJobResultV2, expectedWeights: string[], licenseDecision: LicenseDecision): MlJobResultV2 {
    const parsed = mlJobResultV2Schema.safeParse(result);
    if (!parsed.success) {
      throw new MlError('ML_OUTPUT_SCHEMA_INVALID', `result failed MlJobResultV2: ${parsed.error.message}`, { jobId: job.jobId });
    }
    const value = parsed.data;

    if (value.jobId !== job.jobId) {
      throw new MlError('ML_OUTPUT_SCHEMA_INVALID', `runtime returned jobId ${value.jobId} for job ${job.jobId}`, { jobId: job.jobId });
    }

    if (value.provenance) {
      const provenanceParse = modelExecutionProvenanceSchema.safeParse(value.provenance);
      if (!provenanceParse.success) {
        throw new MlError('ML_OUTPUT_SCHEMA_INVALID', `provenance failed its contract: ${provenanceParse.error.message}`, { jobId: job.jobId });
      }
      const provenance = provenanceParse.data;
      if (provenance.realInferenceExecuted && expectedWeights.length > 0) {
        const claimed = new Set(provenance.weightsSha256);
        const missing = expectedWeights.filter(w => !claimed.has(w));
        if (missing.length > 0) {
          throw new MlError('ML_WEIGHTS_HASH_MISMATCH',
            `result claims real inference but its provenance omits verified weights digests: ${missing.join(', ')}`,
            { jobId: job.jobId, modelId: job.modelId });
        }
      }
      if (provenance.licenseDecisionId !== licenseDecision.decisionId) {
        throw new MlError('ML_OUTPUT_SCHEMA_INVALID',
          'provenance references a licence decision other than the one this job was gated by',
          { jobId: job.jobId });
      }
    }

    // Provider-specific output contract.
    const provider = this.registry.get(job.providerId);
    if (provider?.outputSchema && value.normalizedPir !== null) {
      const outputParse = provider.outputSchema.safeParse(value.normalizedPir);
      if (!outputParse.success) {
        throw new MlError('ML_OUTPUT_SCHEMA_INVALID', `normalizedPir failed ${job.providerId} output contract: ${outputParse.error.message}`, { jobId: job.jobId, providerId: job.providerId });
      }
    }

    return value;
  }

  /* ------------------------------------------------------------------ job lifecycle --- */

  async getJob(jobId: string): Promise<MlJobResultV2> {
    const job = await this.store.getJob(jobId);
    if (!job) throw new MlError('ML_JOB_NOT_FOUND', `no job ${jobId}`, { jobId });
    if (job.result) return job.result;
    return {
      schemaVersion: '2.0',
      jobId: job.jobId,
      correlationId: job.correlationId,
      idempotencyKey: job.idempotencyKey,
      taskType: job.taskType as MlTaskType,
      status: job.status,
      attempt: Math.max(1, job.attempt),
      outputArtifacts: [],
      normalizedPir: null,
      error: job.errorCode ? { code: job.errorCode, message: job.errorMessage ?? '', retryable: isRetryableMlErrorCode(job.errorCode as MlErrorCode) } : null,
      warnings: [],
      provenance: null
    };
  }

  /** Blocks until the job leaves a non-terminal state, or the caller's own deadline expires. */
  async waitForJob(jobId: string, opts: { timeoutMs?: number } = {}): Promise<MlJobResultV2> {
    const deadline = Date.now() + (opts.timeoutMs ?? 600_000);
    const terminal = new Set(['succeeded', 'failed', 'cancelled', 'blocked', 'interrupted']);
    for (;;) {
      const result = await this.getJob(jobId);
      if (terminal.has(result.status)) return result;
      if (Date.now() > deadline) {
        throw new MlError('ML_TIMEOUT', `waitForJob(${jobId}) exceeded its own deadline`, { jobId });
      }
      await sleep(this.pollIntervalMs);
    }
  }

  async cancelJob(jobId: string): Promise<{ cancelled: boolean; status: string }> {
    const job = await this.store.getJob(jobId);
    if (!job) throw new MlError('ML_JOB_NOT_FOUND', `no job ${jobId}`, { jobId });
    await this.store.requestCancel(jobId);
    this.inFlight.get(jobId)?.abort();
    try {
      await this.runtime.cancel(jobId);
    } catch (error) {
      // The runtime may already have forgotten the job; the durable cancel flag still stands.
      if (!(error instanceof MlError)) throw error;
    }
    this.counters.cancellations += 1;
    return { cancelled: true, status: 'cancelled' };
  }

  /**
   * Retries a failed job. The decision is made from the recorded error code, not from the
   * caller's optimism: schema, licence, hash and untrusted-input failures are refused because
   * repeating them would produce exactly the same failure.
   */
  async retryJob(jobId: string): Promise<MlJobResultV2> {
    const job = await this.store.getJob(jobId);
    if (!job) throw new MlError('ML_JOB_NOT_FOUND', `no job ${jobId}`, { jobId });
    if (job.status === 'succeeded' && job.result) {
      this.counters.cacheHits += 1;
      return withCacheHit(job.result);
    }
    if (!job.errorCode) {
      throw new MlError('ML_JOB_NOT_RETRYABLE', `job ${jobId} is ${job.status} and has no recorded failure to retry`, { jobId });
    }
    const code = job.errorCode as MlErrorCode;
    if (!isRetryableMlErrorCode(code) && job.status !== 'interrupted') {
      throw new MlError('ML_JOB_NOT_RETRYABLE', `${code} is terminal by classification; a retry cannot change the outcome`, { jobId, detail: { errorCode: code } });
    }
    if (job.attempt >= job.maxAttempts) {
      throw new MlError('ML_JOB_NOT_RETRYABLE', `job ${jobId} already used ${job.attempt} of ${job.maxAttempts} attempts`, { jobId });
    }

    // An OOM retry is only meaningful after memory has actually been released.
    if (code === 'ML_OOM') await this.unloadModel(job.modelId);

    const licenseDecision = this.licenseEngine.requireAllowed(job.modelId, 'before_inference', 'inference');
    await this.store.recordLicenseDecision(licenseDecision);
    const entry = this.catalog.require(job.modelId);
    return this.executeAttempt(job, licenseDecision, entry.weightsFiles.map(f => f.sha256).filter((s): s is string => s !== null));
  }

  async getMetrics(): Promise<OrchestratorMetrics> {
    const byStatus = await this.store.countByStatus();
    const queued = (byStatus.queued ?? 0) + (byStatus.running ?? 0) + (byStatus.preparing ?? 0) + (byStatus.loading_model ?? 0);
    return { queueDepth: queued, byStatus, ...this.counters };
  }
}

/* ------------------------------------------------------------------------- helpers --- */

function withCacheHit(result: MlJobResultV2): MlJobResultV2 {
  return {
    ...result,
    provenance: result.provenance ? { ...result.provenance, cacheHit: true } : null
  };
}

function deriveIdempotencyKey(input: SubmitJobInput, descriptor: MlProviderDescriptor): string {
  const canonical = JSON.stringify({
    task: input.taskType,
    provider: descriptor.providerId,
    model: descriptor.modelId,
    revision: descriptor.modelRevision,
    inputs: input.inputArtifacts.map(a => a.sha256).sort(),
    parameters: input.parameters ?? {},
    seed: input.seed ?? null
  });
  return `idem_${crypto.createHash('sha256').update(canonical).digest('hex').slice(0, 32)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Real device facts. Deliberately does *not* infer a profile from `process.platform`: an Apple
 * Silicon host without a working MPS build is a CPU host, and saying otherwise routes jobs onto
 * a device that will fail.
 */
export function probeHostCapabilities(): HostCapabilities {
  const devices: Array<'cpu' | 'mps' | 'cuda' | 'remote'> = ['cpu'];
  if (process.env.HARMONY_MPS_AVAILABLE === 'true') devices.push('mps');
  if (process.env.HARMONY_CUDA_AVAILABLE === 'true') devices.push('cuda');
  if (process.env.ML_ALLOW_REMOTE_GPU === 'true') devices.push('remote');
  return {
    devices,
    ramGb: Math.round((os.totalmem() / 1024 ** 3) * 10) / 10,
    vramGb: process.env.HARMONY_VRAM_GB ? Number(process.env.HARMONY_VRAM_GB) : null,
    installedDependencies: (process.env.HARMONY_INSTALLED_DEPENDENCIES ?? '').split(',').map(s => s.trim()).filter(Boolean)
  };
}

/**
 * DWPose weights predate the `.model-cache` layout and live under
 * `services/ml-runtime/weights/dwpose`. Rather than move 335 MB of verified binaries (and
 * invalidate the existing evidence that references them), the catalog search includes the
 * legacy directory for that model only.
 */
function legacyWeightDirs(modelId: string): string[] {
  if (modelId === 'dwpose-ll-ucoco-384') {
    return ['services/ml-runtime/weights/dwpose'].map(p => new URL(`file://${process.cwd()}/${p}`).pathname);
  }
  return [];
}
