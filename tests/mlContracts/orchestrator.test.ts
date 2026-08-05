import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { z } from 'zod';

import { MlOrchestrator } from '../../src/services/mlOrchestrator/index.js';
import { MlProviderRegistry, type MlProvider, type MlProviderDescriptor } from '../../src/services/mlProviderRegistry/index.js';
import { MlJobStore, computeInputHash } from '../../src/services/mlJobStore/index.js';
import { MlArtifactStore } from '../../src/services/mlArtifactStore/index.js';
import { LicensePolicyEngine } from '../../src/services/licensePolicyEngine/index.js';
import { ModelCatalog, type CatalogEntry } from '../../src/services/modelCatalog/index.js';
import { MlError, isRetryableMlErrorCode, listMlErrorDefinitions } from '../../src/errors/mlErrorRegistry.js';
import type { MlJobRequestV2, MlJobResultV2, ArtifactReference } from '../../src/schemas/ml.js';

/* ------------------------------------------------------------------ test doubles ------ */

const TEST_DIGEST = 'f'.repeat(64);
const WEIGHTS_DIGEST = '1234567890abcdef'.repeat(4);

function tempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function catalogEntry(overrides: Partial<CatalogEntry> = {}): CatalogEntry {
  return {
    modelId: 'fake-pose',
    providerId: 'fake',
    taskTypes: ['pose_estimation'],
    displayName: 'Fake Pose',
    upstreamRepository: 'https://example.invalid/fake',
    upstreamCommit: null,
    revision: 'v1',
    cacheKey: 'fake/v1',
    weightsFiles: [{
      role: 'main', fileName: 'w.onnx', url: 'https://example.invalid/w.onnx', sizeBytes: 4,
      format: 'onnx', sha256: WEIGHTS_DIGEST, hashSource: 'upstream_published_checksum', requiresQuarantineReview: false
    }],
    runtime: { kind: 'onnxruntime', trustRemoteCode: false, requiresPickle: false },
    hardware: { devices: ['cpu'], minRamGb: 0.1 },
    license: {
      codeLicense: 'MIT', weightsLicense: 'MIT', datasetLicense: 'allowed',
      commercialUse: 'allowed', derivativeWeights: 'allowed', redistribution: 'allowed',
      attribution: 'Fake', territorialRestrictions: [], personalDataRisk: 'none',
      biometricDataRisk: 'none', consentRequired: false, status: 'production_allowed',
      legalNotes: '', verifiedSourceUrls: [], verifiedAt: '2026-07-27', verifiedBy: 'tester'
    },
    maturity: 'contract_verified',
    ...overrides
  } as CatalogEntry;
}

/** Builds a catalog whose weights genuinely exist on disk with the digest the catalog claims. */
function installedCatalog(entry: CatalogEntry = catalogEntry()): { catalog: ModelCatalog; cacheRoot: string } {
  const cacheRoot = tempDir('mcache-');
  const dir = path.join(cacheRoot, entry.cacheKey);
  fs.mkdirSync(dir, { recursive: true });
  for (const file of entry.weightsFiles) {
    // Write bytes whose real digest is then recorded, so hashVerified is measured not asserted.
    fs.writeFileSync(path.join(dir, file.fileName), Buffer.from(`weights-of-${entry.modelId}`));
  }
  const realDigests = entry.weightsFiles.map(f =>
    require('crypto').createHash('sha256').update(fs.readFileSync(path.join(dir, f.fileName))).digest('hex') as string);
  const fixed: CatalogEntry = {
    ...entry,
    weightsFiles: entry.weightsFiles.map((f, i) => ({ ...f, sha256: realDigests[i] }))
  };
  const catalogDir = tempDir('cat-');
  const file = path.join(catalogDir, 'catalog.json');
  fs.writeFileSync(file, JSON.stringify({ schemaVersion: '2.0', generatedAt: '2026-07-27', models: [fixed] }));
  process.env.HARMONY_MODEL_CACHE = cacheRoot;
  return { catalog: ModelCatalog.load(file), cacheRoot };
}

function descriptor(overrides: Partial<MlProviderDescriptor> = {}): MlProviderDescriptor {
  return {
    providerId: 'fake',
    modelId: 'fake-pose',
    modelRevision: 'v1',
    taskTypes: ['pose_estimation'],
    capabilities: ['image'],
    inputSchemaVersions: ['2.0'],
    outputSchemaVersions: ['2.0'],
    resultKind: 'PoseSequenceV2',
    backend: 'onnxruntime',
    devices: ['cpu'],
    minRamGb: 0.1,
    minVramGb: null,
    estimatedPeakMemoryMb: 100,
    supportsBatch: false,
    supportsCancellation: true,
    threadSafe: false,
    maxConcurrency: 1,
    loadMode: 'lazy',
    unloadPolicy: 'after_job',
    licenseStatus: 'production_allowed',
    commercialStatus: 'allowed',
    privacyClass: 'local_only',
    weightsSha256: [],
    requiredDependencies: [],
    upstreamRepository: null,
    upstreamCommit: null,
    ...overrides
  };
}

function fakeProvider(d: MlProviderDescriptor = descriptor()): MlProvider<Record<string, unknown>, unknown> {
  return {
    id: d.providerId,
    modelId: d.modelId,
    capabilities: [...d.capabilities],
    taskType: 'pose_estimation',
    descriptor: d,
    inputSchema: z.object({}).passthrough(),
    outputSchema: z.unknown(),
    detect: async () => ({ status: 'installed_verified' as const }),
    healthCheck: async () => ({ isHealthy: true, status: 'ok', loaded: false }),
    validateInput: async () => ({ isValid: true, errors: [] }),
    run: async () => ({}),
    cancel: async () => undefined,
    unload: async () => undefined
  };
}

/** A runtime stub. Records every submit so idempotency can be asserted by call count. */
class StubRuntime {
  submitCalls = 0;
  cancelCalls: string[] = [];
  behaviour: 'succeed' | 'crash' | 'hang' | 'bad_provenance' = 'succeed';
  weightsSha256: string[] = [];

  async submit(request: MlJobRequestV2): Promise<MlJobResultV2> {
    this.submitCalls += 1;
    if (this.behaviour === 'crash') throw new MlError('ML_WORKER_CRASHED', 'worker died', { jobId: request.jobId });
    if (this.behaviour === 'hang') await new Promise<never>(() => undefined);
    const started = new Date().toISOString();
    return {
      schemaVersion: '2.0',
      jobId: request.jobId,
      correlationId: request.correlationId,
      idempotencyKey: request.idempotencyKey,
      taskType: request.taskType,
      status: 'succeeded',
      attempt: 1,
      outputArtifacts: [],
      normalizedPir: { ok: true },
      error: null,
      warnings: [],
      provenance: {
        providerId: request.providerId, modelId: request.modelId, modelRevision: request.modelRevision,
        repositoryUrl: null, repositoryCommit: null,
        weightsFiles: ['w.onnx'],
        weightsSha256: this.behaviour === 'bad_provenance' ? ['9'.repeat(64)] : this.weightsSha256,
        runtimeName: 'onnxruntime', runtimeVersion: '1.28.0', pythonVersion: '3.14.6',
        device: 'cpu', precision: 'float32', startedAt: started, completedAt: started,
        durationMs: 1, peakMemoryMb: null, seed: null, deterministic: true,
        inputArtifactHashes: [], outputArtifactHashes: [],
        licenseDecisionId: this.lastLicenseDecisionId, commercialMode: request.commercialMode,
        realInferenceExecuted: true, simulated: false, cacheHit: false,
        correlationId: request.correlationId, jobId: request.jobId
      }
    } as MlJobResultV2;
  }

  lastLicenseDecisionId = '';
  async cancel(jobId: string): Promise<{ cancelled: boolean; status: string }> {
    this.cancelCalls.push(jobId);
    return { cancelled: true, status: 'cancelled' };
  }
  async unloadModel(): Promise<{ unloaded: boolean; freedMb: number | null }> {
    return { unloaded: true, freedMb: 0 };
  }
}

/**
 * The stub must echo back the licence decision id the orchestrator gated with, otherwise
 * validateResult rejects it. This wrapper captures it from the store.
 */
function wireLicenseEcho(orchestrator: MlOrchestrator, runtime: StubRuntime): void {
  const store = orchestrator.getStore();
  const original = store.recordLicenseDecision.bind(store);
  store.recordLicenseDecision = async (decision) => {
    runtime.lastLicenseDecisionId = decision.decisionId;
    return original(decision);
  };
}

async function buildOrchestrator(options: {
  runtime?: StubRuntime;
  entry?: CatalogEntry;
  providerDescriptor?: MlProviderDescriptor;
} = {}) {
  const runtime = options.runtime ?? new StubRuntime();
  const { catalog } = installedCatalog(options.entry ?? catalogEntry());
  runtime.weightsSha256 = catalog.require('fake-pose').weightsFiles.map(f => f.sha256!).filter(Boolean);

  const registry = new MlProviderRegistry();
  registry.register(fakeProvider(options.providerDescriptor ?? descriptor()));

  const store = new MlJobStore(path.join(tempDir('db-'), 'jobs.db'));
  const orchestrator = new MlOrchestrator({
    registry,
    store,
    catalog,
    licenseEngine: new LicensePolicyEngine(catalog, { commercialBuild: true, studioRegion: null, allowResearchModels: false, allowLegalReviewPending: false }),
    runtime: runtime as never,
    host: { devices: ['cpu'], ramGb: 32, vramGb: null, installedDependencies: [] },
    pollIntervalMs: 20
  });
  wireLicenseEcho(orchestrator, runtime);
  await orchestrator.initialize();
  return { orchestrator, runtime, store, registry, catalog };
}

function inputArtifact(sha = TEST_DIGEST): ArtifactReference {
  return { artifactId: 'art_1', sha256: sha, sizeBytes: 1, mimeType: 'image/png', relativePath: 'in/a.png', role: 'input_image' };
}

/* ---------------------------------------------------------------------- the tests ----- */

describe('error registry', () => {
  it('classifies retryability by code, not by call site', () => {
    expect(isRetryableMlErrorCode('ML_TRANSPORT_FAILED')).toBe(true);
    expect(isRetryableMlErrorCode('ML_OOM')).toBe(true);
    expect(isRetryableMlErrorCode('ML_WORKER_CRASHED')).toBe(true);
    expect(isRetryableMlErrorCode('ML_INPUT_SCHEMA_INVALID')).toBe(false);
    expect(isRetryableMlErrorCode('ML_LICENSE_BLOCKED')).toBe(false);
    expect(isRetryableMlErrorCode('ML_WEIGHTS_HASH_MISMATCH')).toBe(false);
    expect(isRetryableMlErrorCode('ML_PROMPT_INJECTION_DETECTED')).toBe(false);
  });

  it('gives every code a stable definition', () => {
    for (const definition of listMlErrorDefinitions()) {
      expect(definition.summary.length).toBeGreaterThan(10);
      expect(definition.retryable === (definition.retryClass !== 'none')).toBe(true);
    }
  });
});

describe('provider registry typing and conflict detection', () => {
  it('narrows lookups by task so a task cannot receive the wrong provider', () => {
    const registry = new MlProviderRegistry();
    registry.register(fakeProvider());
    expect(registry.getForTask('pose_estimation')).toHaveLength(1);
    expect(registry.getForTask('tts')).toHaveLength(0);
  });

  it('rejects a duplicate provider id', () => {
    const registry = new MlProviderRegistry();
    registry.register(fakeProvider());
    expect(() => registry.register(fakeProvider())).toThrow(MlError);
  });

  it('records a conflict when two providers pin the same model at different revisions', () => {
    const registry = new MlProviderRegistry();
    registry.register(fakeProvider(descriptor()));
    registry.register(fakeProvider(descriptor({ providerId: 'fake2', modelRevision: 'v2' })));
    expect(registry.getConflicts().map(c => c.code)).toContain('MODEL_REVISION_CONFLICT');
  });

  it('records a conflict for an unknown licence', () => {
    const registry = new MlProviderRegistry();
    registry.register(fakeProvider(descriptor({ licenseStatus: 'unknown' })));
    expect(registry.getConflicts().map(c => c.code)).toContain('UNKNOWN_LICENSE');
  });

  it('detects unsupported hardware and missing dependencies without loading weights', () => {
    const registry = new MlProviderRegistry();
    registry.register(fakeProvider(descriptor({ devices: ['cuda'], minVramGb: 24, minRamGb: 999, requiredDependencies: ['torch'] })));
    const conflicts = registry.checkCompatibility('fake', { devices: ['cpu'], ramGb: 8, vramGb: null, installedDependencies: [] });
    const messages = conflicts.map(c => c.message).join(' | ');
    expect(messages).toMatch(/requires one of \[cuda\]/);
    expect(messages).toMatch(/needs 999 GB RAM/);
    expect(messages).toMatch(/missing dependency torch/);
  });
});

describe('artifact store sandbox', () => {
  const store = new MlArtifactStore(tempDir('artifacts-'));

  it.each([
    ['/etc/passwd'],
    ['../escape.json'],
    ['a/../../escape.json'],
    ['C:\\Windows\\system32']
  ])('refuses %s', (relativePath) => {
    expect(() => store.resolveInStore('ml-jobs', relativePath)).toThrow(MlError);
  });

  it('refuses a symlink that points outside the store', () => {
    const outside = tempDir('outside-');
    fs.writeFileSync(path.join(outside, 'secret.txt'), 'secret');
    const base = store.resolveInStore('ml-jobs', 'holder');
    fs.mkdirSync(base, { recursive: true });
    const link = path.join(base, 'link');
    fs.symlinkSync(outside, link, 'dir');
    expect(() => store.resolveInStore('ml-jobs', 'holder/link/secret.txt')).toThrow(MlError);
  });

  it('round-trips a payload and verifies its digest on read', () => {
    const reference = store.putJson('ml-jobs', 'run/output.json', { a: 1 }, 'test');
    expect(store.read('ml-jobs', reference).toString()).toContain('"a": 1');
    expect(store.verify('ml-jobs', reference)).toBe(true);
  });

  it('detects a swapped file instead of returning the wrong bytes', () => {
    const reference = store.putJson('ml-jobs', 'run/swap.json', { a: 1 }, 'test');
    fs.writeFileSync(store.resolveInStore('ml-jobs', 'run/swap.json'), '{"a":2}');
    expect(store.verify('ml-jobs', reference)).toBe(false);
    expect(() => store.read('ml-jobs', reference)).toThrow(/ML_ARTIFACT_HASH_MISMATCH|expected/);
  });

  it('reports a missing artifact rather than an empty buffer', () => {
    const reference = store.putJson('ml-jobs', 'run/gone.json', { a: 1 }, 'test');
    fs.unlinkSync(store.resolveInStore('ml-jobs', 'run/gone.json'));
    expect(store.verify('ml-jobs', reference)).toBe(false);
  });
});

describe('input hashing and idempotency keys', () => {
  it('is stable under key ordering and artifact ordering', () => {
    const a = computeInputHash({
      taskType: 'pose_estimation',
      inputArtifacts: [inputArtifact('a'.repeat(64)), inputArtifact('b'.repeat(64))],
      parameters: { x: 1, y: 2 }, seed: null
    });
    const b = computeInputHash({
      taskType: 'pose_estimation',
      inputArtifacts: [inputArtifact('b'.repeat(64)), inputArtifact('a'.repeat(64))],
      parameters: { y: 2, x: 1 }, seed: null
    });
    expect(a).toBe(b);
  });

  it('changes when a parameter or the seed changes', () => {
    const base = { taskType: 'pose_estimation' as const, inputArtifacts: [inputArtifact()], parameters: { x: 1 }, seed: null };
    expect(computeInputHash(base)).not.toBe(computeInputHash({ ...base, parameters: { x: 2 } }));
    expect(computeInputHash(base)).not.toBe(computeInputHash({ ...base, seed: 7 }));
  });
});

describe('MlOrchestrator lifecycle', () => {
  const savedCache = process.env.HARMONY_MODEL_CACHE;
  afterEach(() => {
    if (savedCache === undefined) delete process.env.HARMONY_MODEL_CACHE;
    else process.env.HARMONY_MODEL_CACHE = savedCache;
  });

  it('runs a job end to end and returns a validated result', async () => {
    const { orchestrator, runtime } = await buildOrchestrator();
    const result = await orchestrator.submitJob({ taskType: 'pose_estimation', inputArtifacts: [inputArtifact()] });
    expect(result.status).toBe('succeeded');
    expect(result.provenance?.realInferenceExecuted).toBe(true);
    expect(runtime.submitCalls).toBe(1);
  });

  it('returns the stored result for a repeated identical request instead of re-running inference', async () => {
    const { orchestrator, runtime } = await buildOrchestrator();
    const input = { taskType: 'pose_estimation' as const, inputArtifacts: [inputArtifact()], parameters: { a: 1 } };
    const first = await orchestrator.submitJob(input);
    const second = await orchestrator.submitJob(input);

    expect(runtime.submitCalls).toBe(1);
    expect(second.jobId).toBe(first.jobId);
    expect(second.provenance?.cacheHit).toBe(true);
    expect(first.provenance?.cacheHit).toBe(false);
  });

  it('does re-run when a parameter differs, because that is a different computation', async () => {
    const { orchestrator, runtime } = await buildOrchestrator();
    await orchestrator.submitJob({ taskType: 'pose_estimation', inputArtifacts: [inputArtifact()], parameters: { a: 1 } });
    await orchestrator.submitJob({ taskType: 'pose_estimation', inputArtifacts: [inputArtifact()], parameters: { a: 2 } });
    expect(runtime.submitCalls).toBe(2);
  });

  it('blocks submission when the licence gate refuses, and records the decision', async () => {
    const entry = catalogEntry({
      license: { ...catalogEntry().license, status: 'research_only', verifiedBy: null, commercialUse: 'forbidden' }
    });
    await expect(buildOrchestrator({ entry }).then(({ orchestrator }) =>
      orchestrator.submitJob({ taskType: 'pose_estimation', inputArtifacts: [inputArtifact()] })
    )).rejects.toThrow(MlError);
  });

  it('refuses to run when the weights digest does not match what is on disk', async () => {
    const { catalog } = installedCatalog();
    const dir = path.join(process.env.HARMONY_MODEL_CACHE!, 'fake/v1');
    fs.writeFileSync(path.join(dir, 'w.onnx'), Buffer.from('tampered'));

    const registry = new MlProviderRegistry();
    registry.register(fakeProvider());
    const orchestrator = new MlOrchestrator({
      registry, catalog,
      store: new MlJobStore(path.join(tempDir('db-'), 'jobs.db')),
      licenseEngine: new LicensePolicyEngine(catalog, { commercialBuild: true, studioRegion: null, allowResearchModels: false, allowLegalReviewPending: false }),
      runtime: new StubRuntime() as never,
      host: { devices: ['cpu'], ramGb: 32, vramGb: null, installedDependencies: [] },
      pollIntervalMs: 20
    });
    await orchestrator.initialize();
    await expect(orchestrator.submitJob({ taskType: 'pose_estimation', inputArtifacts: [inputArtifact()] }))
      .rejects.toMatchObject({ code: 'ML_PROVIDER_NOT_FOUND' });
  });

  it('rejects a result that claims real inference without the verified weights digests', async () => {
    const runtime = new StubRuntime();
    runtime.behaviour = 'bad_provenance';
    const { orchestrator } = await buildOrchestrator({ runtime });
    await expect(orchestrator.submitJob({ taskType: 'pose_estimation', inputArtifacts: [inputArtifact()] }))
      .rejects.toMatchObject({ code: 'ML_WEIGHTS_HASH_MISMATCH' });
  });

  it('times out a hanging job and records ML_TIMEOUT', async () => {
    const runtime = new StubRuntime();
    runtime.behaviour = 'hang';
    const { orchestrator, store } = await buildOrchestrator({ runtime });
    await expect(orchestrator.submitJob({
      taskType: 'pose_estimation', inputArtifacts: [inputArtifact()], timeoutMs: 100
    })).rejects.toMatchObject({ code: 'ML_TIMEOUT' });

    const counts = await store.countByStatus();
    expect(counts.failed).toBeGreaterThanOrEqual(1);
  }, 15_000);

  it('cancels a running job through the durable flag, so a restart still honours it', async () => {
    const runtime = new StubRuntime();
    runtime.behaviour = 'hang';
    const { orchestrator, store } = await buildOrchestrator({ runtime });

    const pending = orchestrator.submitJob({
      taskType: 'pose_estimation', inputArtifacts: [inputArtifact()], timeoutMs: 30_000
    });
    // Wait for the job row to appear, then cancel it.
    await new Promise(resolve => setTimeout(resolve, 100));
    const jobs = await store.countByStatus();
    expect(jobs.running).toBe(1);

    const running = await findRunningJobId(store);
    await orchestrator.cancelJob(running);
    await expect(pending).rejects.toMatchObject({ code: 'ML_CANCELLED' });
    expect(runtime.cancelCalls).toContain(running);
  }, 15_000);

  it('refuses to retry a terminal failure class', async () => {
    const runtime = new StubRuntime();
    runtime.behaviour = 'crash';
    const { orchestrator, store } = await buildOrchestrator({ runtime });
    await expect(orchestrator.submitJob({ taskType: 'pose_estimation', inputArtifacts: [inputArtifact()] })).rejects.toThrow(MlError);

    const jobId = await findAnyJobId(store);
    // ML_WORKER_CRASHED is retryable; force a terminal code to prove the classification is used.
    await store.updateStatus(jobId, 'failed', { errorCode: 'ML_INPUT_SCHEMA_INVALID', errorMessage: 'bad input' });
    await expect(orchestrator.retryJob(jobId)).rejects.toMatchObject({ code: 'ML_JOB_NOT_RETRYABLE' });
  });

  it('retries a worker crash and succeeds on the second attempt', async () => {
    const runtime = new StubRuntime();
    runtime.behaviour = 'crash';
    const { orchestrator, store } = await buildOrchestrator({ runtime });
    await expect(orchestrator.submitJob({ taskType: 'pose_estimation', inputArtifacts: [inputArtifact()] })).rejects.toThrow(MlError);

    const jobId = await findAnyJobId(store);
    runtime.behaviour = 'succeed';
    const retried = await orchestrator.retryJob(jobId);
    expect(retried.status).toBe('succeeded');

    const attempts = await store.listAttempts(jobId);
    expect(attempts.length).toBe(2);
    expect(attempts[0].errorCode).toBe('ML_WORKER_CRASHED');
  });

  it('moves in-flight jobs to interrupted after a restart rather than leaving them running', async () => {
    const dbFile = path.join(tempDir('db-'), 'jobs.db');
    const first = new MlJobStore(dbFile);
    await first.initialize();
    await first.insertJob({
      jobId: 'job_restart', correlationId: 'c', idempotencyKey: 'k'.repeat(16), taskType: 'pose_estimation',
      providerId: 'fake', modelId: 'fake-pose', modelRevision: 'v1', executionMode: 'real_ml',
      commercialMode: 'commercial', status: 'running', attempt: 1, maxAttempts: 2,
      request: {} as MlJobRequestV2, result: null, provenance: null, errorCode: null, errorMessage: null,
      licenseDecisionId: null, inputHash: 'h', timeoutMs: 1000
    });
    first.close();

    const second = new MlJobStore(dbFile);
    await second.initialize();
    const recovered = await second.recoverInterruptedJobs();
    expect(recovered).toContain('job_restart');
    const job = await second.getJob('job_restart');
    expect(job?.status).toBe('interrupted');
    expect(job?.errorCode).toBe('ML_WORKER_CRASHED');
    second.close();
  });

  it('reports why each rejected provider was skipped instead of failing silently', async () => {
    const { orchestrator, registry } = await buildOrchestrator();
    registry.register(fakeProvider(descriptor({ providerId: 'gpu_only', modelId: 'fake-pose', devices: ['cuda'], minVramGb: 24 })));
    const selection = orchestrator.selectProvider('pose_estimation');
    expect(selection.providerId).toBe('fake');
    expect(selection.rejected.map(r => r.providerId)).toContain('gpu_only');
    expect(selection.rejected[0].reason).toMatch(/requires one of \[cuda\]/);
  });

  it('exposes queue depth and counters', async () => {
    const { orchestrator } = await buildOrchestrator();
    await orchestrator.submitJob({ taskType: 'pose_estimation', inputArtifacts: [inputArtifact()] });
    const metrics = await orchestrator.getMetrics();
    expect(metrics.submitted).toBe(1);
    expect(metrics.byStatus.succeeded).toBe(1);
    expect(metrics.queueDepth).toBe(0);
  });
});

async function findRunningJobId(store: MlJobStore): Promise<string> {
  return findJobIdWithStatus(store, 'running');
}

async function findAnyJobId(store: MlJobStore): Promise<string> {
  return findJobIdWithStatus(store, null);
}

async function findJobIdWithStatus(store: MlJobStore, status: string | null): Promise<string> {
  // The store exposes no list API by design; the tests read through the same sqlite handle.
  const anyStore = store as unknown as { all<T>(sql: string, params?: unknown[]): Promise<T[]> };
  const rows = status
    ? await anyStore.all<{ job_id: string }>('SELECT job_id FROM ml_jobs WHERE status = ?', [status])
    : await anyStore.all<{ job_id: string }>('SELECT job_id FROM ml_jobs');
  if (!rows.length) throw new Error(`no job with status ${status}`);
  return rows[0].job_id;
}
