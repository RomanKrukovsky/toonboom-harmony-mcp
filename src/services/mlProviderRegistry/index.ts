import type { z } from 'zod';
import { MlError } from '../../errors/mlErrorRegistry.js';
import type { MlTaskType, ExecutionMode } from '../../schemas/ml.js';
import type { LicenseStatus } from '../modelCatalog/index.js';

/**
 * Typed ML provider registry.
 *
 * The previous implementation was a `Map<string, MlProvider<any, any>>` with no notion of what
 * a provider is *for*. `any` on the public execution path meant the compiler could not tell a
 * pose request from an audio one, and nothing prevented two providers from claiming the same
 * model at different revisions.
 *
 * What changed:
 *  - `MlProvider` is parameterised by task type, so `getForTask('tts')` cannot return a
 *    segmentation provider.
 *  - Providers carry a full `MlProviderDescriptor`: schema versions, hardware needs, licence
 *    status, revision, weights digests, concurrency and unload policy.
 *  - Registration runs conflict detection instead of only checking for a duplicate id.
 *
 * The original `MlProvider`, `MlProviderDetectionResult`, `MlProviderHealth`,
 * `MlValidationResult` and `MlExecutionContext` names are preserved so existing callers and
 * `tests/mlRuntime.test.ts` keep compiling.
 */

export interface MlProviderDetectionResult {
  status:
    | 'installed_verified'
    | 'installed_unverified'
    | 'remote_available'
    | 'dependency_missing'
    | 'weights_missing'
    | 'license_restricted'
    | 'unsupported_platform'
    | 'requires_gpu'
    | 'disabled';
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
  /**
   * Kept as the original three-value union for source compatibility; `executionMode` carries
   * the five-mode production vocabulary and is the field new code should read.
   */
  mode: 'simulation' | 'dry_run' | 'real';
  executionMode?: ExecutionMode;
  signal?: AbortSignal;
}

export type MlBackend = 'onnxruntime' | 'pytorch' | 'mediapipe' | 'huggingface_transformers' | 'external_binary' | 'remote';
export type MlDevice = 'cpu' | 'mps' | 'cuda' | 'remote';
export type MlPrivacyClass = 'local_only' | 'remote_allowed' | 'remote_forbidden_personal_data';
export type MlLoadMode = 'eager' | 'lazy' | 'per_call';
export type MlUnloadPolicy = 'never' | 'after_job' | 'idle_timeout' | 'on_memory_pressure';

/**
 * Everything the router, the licence gate and the memory planner need to decide whether this
 * provider may run, without loading a single byte of weights.
 */
export interface MlProviderDescriptor {
  readonly providerId: string;
  readonly modelId: string;
  readonly modelRevision: string;
  readonly taskTypes: readonly MlTaskType[];
  readonly capabilities: readonly string[];

  readonly inputSchemaVersions: readonly string[];
  readonly outputSchemaVersions: readonly string[];
  /** Name of the normalised PIR the provider emits, e.g. `PoseSequenceV2`. */
  readonly resultKind: string;

  readonly backend: MlBackend;
  readonly devices: readonly MlDevice[];
  readonly minRamGb: number;
  readonly minVramGb: number | null;
  readonly estimatedPeakMemoryMb: number | null;

  readonly supportsBatch: boolean;
  readonly supportsCancellation: boolean;
  readonly threadSafe: boolean;
  readonly maxConcurrency: number;
  readonly loadMode: MlLoadMode;
  readonly unloadPolicy: MlUnloadPolicy;

  readonly licenseStatus: LicenseStatus;
  readonly commercialStatus: 'allowed' | 'allowed_with_attribution' | 'forbidden' | 'unknown';
  readonly privacyClass: MlPrivacyClass;
  readonly weightsSha256: readonly string[];

  /** Python packages / binaries the provider needs. Used by readiness, not by import. */
  readonly requiredDependencies: readonly string[];
  readonly upstreamRepository: string | null;
  readonly upstreamCommit: string | null;
}

/**
 * A provider bound to a task. `TTask` narrows what the registry will hand back, and
 * `inputSchema`/`outputSchema` replace the `any` that used to sit on `run`.
 */
export interface MlProvider<TInput = unknown, TOutput = unknown, TTask extends MlTaskType = MlTaskType> {
  readonly id: string;
  readonly modelId: string;
  readonly capabilities: string[];
  readonly taskType?: TTask;
  readonly descriptor?: MlProviderDescriptor;
  readonly inputSchema?: z.ZodType<TInput>;
  readonly outputSchema?: z.ZodType<TOutput>;

  detect(): Promise<MlProviderDetectionResult>;
  healthCheck(): Promise<MlProviderHealth>;
  validateInput(input: TInput): Promise<MlValidationResult>;
  run(input: TInput, context: MlExecutionContext): Promise<TOutput>;
  cancel(jobId: string): Promise<void>;
  unload?(): Promise<void>;
}

/** A provider that carries a full descriptor. Only these participate in routing. */
export interface DescribedMlProvider<TInput = unknown, TOutput = unknown, TTask extends MlTaskType = MlTaskType>
  extends MlProvider<TInput, TOutput, TTask> {
  readonly taskType: TTask;
  readonly descriptor: MlProviderDescriptor;
  readonly inputSchema: z.ZodType<TInput>;
  readonly outputSchema: z.ZodType<TOutput>;
}

export interface ProviderConflict {
  severity: 'error' | 'warning';
  code:
    | 'DUPLICATE_PROVIDER_ID'
    | 'MODEL_REVISION_CONFLICT'
    | 'TASK_SCHEMA_INCOMPATIBLE'
    | 'UNKNOWN_LICENSE'
    | 'UNSUPPORTED_HARDWARE'
    | 'PREVIEW_OR_RESEARCH_ONLY'
    | 'MISSING_DEPENDENCY';
  providerId: string;
  message: string;
}

export interface HostCapabilities {
  devices: readonly MlDevice[];
  ramGb: number;
  vramGb: number | null;
  installedDependencies: readonly string[];
}

export interface ProviderReadiness {
  providerId: string;
  ready: boolean;
  detection: MlProviderDetectionResult;
  conflicts: ProviderConflict[];
  blockingReason: string | null;
}

export class MlProviderRegistry {
  private readonly providers = new Map<string, MlProvider<unknown, unknown>>();
  private readonly byTask = new Map<MlTaskType, Set<string>>();
  private readonly conflicts: ProviderConflict[] = [];

  register<TInput, TOutput, TTask extends MlTaskType>(provider: MlProvider<TInput, TOutput, TTask>): void {
    if (this.providers.has(provider.id)) {
      throw new MlError('ML_PROVIDER_ALREADY_REGISTERED', `Provider ${provider.id} is already registered`, { providerId: provider.id });
    }

    const descriptor = provider.descriptor;
    if (descriptor) {
      if (descriptor.providerId !== provider.id) {
        throw new MlError('ML_PROVIDER_CONFLICT', `descriptor.providerId ${descriptor.providerId} does not match provider id ${provider.id}`, { providerId: provider.id });
      }
      // Two providers may serve the same model, but not at contradictory revisions: that
      // combination silently produces results that cannot be reproduced from provenance.
      for (const existing of this.providers.values()) {
        const other = existing.descriptor;
        if (!other) continue;
        if (other.modelId === descriptor.modelId && other.modelRevision !== descriptor.modelRevision) {
          this.conflicts.push({
            severity: 'error',
            code: 'MODEL_REVISION_CONFLICT',
            providerId: provider.id,
            message: `${provider.id} pins ${descriptor.modelId}@${descriptor.modelRevision} while ${existing.id} pins @${other.modelRevision}`
          });
        }
      }
      if (descriptor.licenseStatus === 'unknown') {
        this.conflicts.push({ severity: 'error', code: 'UNKNOWN_LICENSE', providerId: provider.id, message: `${provider.id} has an unknown licence status` });
      }
      if (descriptor.licenseStatus === 'preview_only' || descriptor.licenseStatus === 'research_only') {
        this.conflicts.push({ severity: 'warning', code: 'PREVIEW_OR_RESEARCH_ONLY', providerId: provider.id, message: `${provider.id} is ${descriptor.licenseStatus} and cannot enter a commercial package` });
      }
    }

    this.providers.set(provider.id, provider as unknown as MlProvider<unknown, unknown>);

    const task = provider.taskType ?? descriptor?.taskTypes?.[0];
    if (task) {
      const set = this.byTask.get(task) ?? new Set<string>();
      set.add(provider.id);
      this.byTask.set(task, set);
    }
    for (const extra of descriptor?.taskTypes ?? []) {
      const set = this.byTask.get(extra) ?? new Set<string>();
      set.add(provider.id);
      this.byTask.set(extra, set);
    }
  }

  unregister(providerId: string): boolean {
    const removed = this.providers.delete(providerId);
    for (const set of this.byTask.values()) set.delete(providerId);
    return removed;
  }

  get(id: string): MlProvider<unknown, unknown> | undefined {
    return this.providers.get(id);
  }

  require(id: string): MlProvider<unknown, unknown> {
    const provider = this.providers.get(id);
    if (!provider) throw new MlError('ML_PROVIDER_NOT_FOUND', `Provider ${id} is not registered`, { providerId: id });
    return provider;
  }

  getAll(): MlProvider<unknown, unknown>[] {
    return Array.from(this.providers.values());
  }

  /** Typed lookup. The return type is narrowed by the task, so a caller cannot mix tasks up. */
  getForTask<TTask extends MlTaskType>(task: TTask): MlProvider<unknown, unknown, TTask>[] {
    const ids = this.byTask.get(task);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.providers.get(id))
      .filter((p): p is MlProvider<unknown, unknown> => p !== undefined) as MlProvider<unknown, unknown, TTask>[];
  }

  getDescriptors(): MlProviderDescriptor[] {
    return this.getAll().map(p => p.descriptor).filter((d): d is MlProviderDescriptor => d !== undefined);
  }

  getConflicts(): readonly ProviderConflict[] {
    return this.conflicts;
  }

  /**
   * Static, host-aware compatibility check. Runs without loading weights so a `doctor` command
   * can report what would happen before anything is downloaded.
   */
  checkCompatibility(providerId: string, host: HostCapabilities): ProviderConflict[] {
    const provider = this.require(providerId);
    const descriptor = provider.descriptor;
    if (!descriptor) return [];
    const found: ProviderConflict[] = [];

    if (!descriptor.devices.some(d => host.devices.includes(d))) {
      found.push({ severity: 'error', code: 'UNSUPPORTED_HARDWARE', providerId, message: `requires one of [${descriptor.devices.join(', ')}]; host offers [${host.devices.join(', ')}]` });
    }
    if (host.ramGb < descriptor.minRamGb) {
      found.push({ severity: 'error', code: 'UNSUPPORTED_HARDWARE', providerId, message: `needs ${descriptor.minRamGb} GB RAM; host has ${host.ramGb}` });
    }
    if (descriptor.minVramGb !== null && descriptor.devices.includes('cuda') && !descriptor.devices.some(d => d === 'cpu' || d === 'mps')) {
      if (host.vramGb === null || host.vramGb < descriptor.minVramGb) {
        found.push({ severity: 'error', code: 'UNSUPPORTED_HARDWARE', providerId, message: `needs ${descriptor.minVramGb} GB VRAM; host reports ${host.vramGb ?? 'none'}` });
      }
    }
    for (const dependency of descriptor.requiredDependencies) {
      if (!host.installedDependencies.includes(dependency)) {
        found.push({ severity: 'error', code: 'MISSING_DEPENDENCY', providerId, message: `missing dependency ${dependency}` });
      }
    }
    return found;
  }

  async getProviderReadiness(providerId: string, host?: HostCapabilities): Promise<ProviderReadiness> {
    const provider = this.require(providerId);
    const detection = await provider.detect();
    const conflicts = [
      ...this.conflicts.filter(c => c.providerId === providerId),
      ...(host ? this.checkCompatibility(providerId, host) : [])
    ];
    const hardBlock = conflicts.find(c => c.severity === 'error');
    const detectionBlocks = detection.status !== 'installed_verified' && detection.status !== 'remote_available';
    const blockingReason = hardBlock
      ? `${hardBlock.code}: ${hardBlock.message}`
      : detectionBlocks
        ? `${detection.status}${detection.message ? `: ${detection.message}` : ''}`
        : null;
    return { providerId, ready: blockingReason === null, detection, conflicts, blockingReason };
  }
}
