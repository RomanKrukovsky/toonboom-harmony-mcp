import sqlite3 from 'sqlite3';
import path from 'path';
import crypto from 'crypto';
import { config } from '../../config.js';
import { MlError } from '../../errors/mlErrorRegistry.js';
import { ML_MIGRATIONS, type Migration } from './migrations.js';
import type { MlJobRequestV2, MlJobResultV2, MlJobStatus, ModelExecutionProvenance } from '../../schemas/ml.js';
import type { LicenseDecision } from '../licensePolicyEngine/index.js';

/**
 * Durable job store. Jobs survive a restart of the MCP server and of the Python runtime:
 * `recoverInterruptedJobs()` is called at startup and moves anything left mid-flight to
 * `interrupted`, which is a real state rather than a job that silently hangs forever.
 */

export interface StoredJob {
  jobId: string;
  correlationId: string;
  idempotencyKey: string;
  taskType: string;
  providerId: string;
  modelId: string;
  modelRevision: string;
  executionMode: string;
  commercialMode: string;
  status: MlJobStatus;
  attempt: number;
  maxAttempts: number;
  request: MlJobRequestV2;
  result: MlJobResultV2 | null;
  provenance: ModelExecutionProvenance | null;
  errorCode: string | null;
  errorMessage: string | null;
  licenseDecisionId: string | null;
  inputHash: string;
  timeoutMs: number;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  cancelRequested: boolean;
}

interface JobRow {
  job_id: string; correlation_id: string; idempotency_key: string; task_type: string;
  provider_id: string; model_id: string; model_revision: string; execution_mode: string;
  commercial_mode: string; status: string; attempt: number; max_attempts: number;
  request_json: string; result_json: string | null; provenance_json: string | null;
  error_code: string | null; error_message: string | null; license_decision_id: string | null;
  input_hash: string; timeout_ms: number; created_at: string; updated_at: string;
  started_at: string | null; finished_at: string | null; cancel_requested: number;
}

/** States from which a process crash leaves the job unrecoverable without operator action. */
const IN_FLIGHT: readonly MlJobStatus[] = ['queued', 'preparing', 'loading_model', 'running', 'writing_artifacts'];

export class MlJobStore {
  private db: sqlite3.Database;
  private initialised = false;

  constructor(dbPath?: string) {
    const file = dbPath ?? path.join(config.allowedRoots[0] || '.', 'harmony_workflow.db');
    this.db = new sqlite3.Database(file);
  }

  private run(sql: string, params: unknown[] = []): Promise<sqlite3.RunResult> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (this: sqlite3.RunResult, err: Error | null) {
        if (err) reject(err); else resolve(this);
      });
    });
  }

  private get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err: Error | null, row: unknown) => {
        if (err) reject(err); else resolve(row as T | undefined);
      });
    });
  }

  private all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err: Error | null, rows: unknown[]) => {
        if (err) reject(err); else resolve(rows as T[]);
      });
    });
  }

  async initialize(): Promise<{ applied: number[]; alreadyApplied: number[] }> {
    if (this.initialised) return { applied: [], alreadyApplied: ML_MIGRATIONS.map(m => m.version) };
    await this.run('PRAGMA foreign_keys = ON');
    await this.run(`CREATE TABLE IF NOT EXISTS ml_schema_migrations (
      version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL DEFAULT (datetime('now')))`);

    const applied: number[] = [];
    const alreadyApplied: number[] = [];
    for (const migration of ML_MIGRATIONS) {
      const existing = await this.get<{ version: number }>('SELECT version FROM ml_schema_migrations WHERE version = ?', [migration.version]);
      if (existing) { alreadyApplied.push(migration.version); continue; }
      await this.applyMigration(migration);
      applied.push(migration.version);
    }
    this.initialised = true;
    return { applied, alreadyApplied };
  }

  private async applyMigration(migration: Migration): Promise<void> {
    await this.run('BEGIN IMMEDIATE');
    try {
      for (const statement of migration.statements) await this.run(statement);
      await this.run('INSERT INTO ml_schema_migrations (version, name) VALUES (?, ?)', [migration.version, migration.name]);
      await this.run('COMMIT');
    } catch (error) {
      await this.run('ROLLBACK').catch(() => undefined);
      throw new MlError('ML_CATALOG_INVALID', `migration ${migration.version} (${migration.name}) failed: ${(error as Error).message}`, {}, { cause: error });
    }
  }

  /* --------------------------------------------------------------------------- jobs -- */

  async insertJob(job: Omit<StoredJob, 'createdAt' | 'updatedAt' | 'startedAt' | 'finishedAt' | 'cancelRequested'>): Promise<StoredJob> {
    const now = new Date().toISOString();
    try {
      await this.run(
        `INSERT INTO ml_jobs (job_id, correlation_id, idempotency_key, task_type, provider_id, model_id,
          model_revision, execution_mode, commercial_mode, status, attempt, max_attempts, request_json,
          result_json, provenance_json, error_code, error_message, license_decision_id, input_hash,
          timeout_ms, created_at, updated_at, cancel_requested)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)`,
        [
          job.jobId, job.correlationId, job.idempotencyKey, job.taskType, job.providerId, job.modelId,
          job.modelRevision, job.executionMode, job.commercialMode, job.status, job.attempt, job.maxAttempts,
          JSON.stringify(job.request), job.result ? JSON.stringify(job.result) : null,
          job.provenance ? JSON.stringify(job.provenance) : null, job.errorCode, job.errorMessage,
          job.licenseDecisionId, job.inputHash, job.timeoutMs, now, now
        ]
      );
    } catch (error) {
      const message = (error as Error).message;
      if (message.includes('UNIQUE constraint failed')) {
        // The unique index is the idempotency mechanism; surface the existing job rather than
        // creating a duplicate expensive computation.
        const existing = await this.findByIdempotency(job.idempotencyKey, job.providerId, job.modelId, job.modelRevision, job.inputHash);
        if (existing) return existing;
      }
      throw error;
    }
    return (await this.getJob(job.jobId))!;
  }

  async getJob(jobId: string): Promise<StoredJob | null> {
    const row = await this.get<JobRow>('SELECT * FROM ml_jobs WHERE job_id = ?', [jobId]);
    return row ? rowToJob(row) : null;
  }

  async findByIdempotency(idempotencyKey: string, providerId: string, modelId: string, modelRevision: string, inputHash: string): Promise<StoredJob | null> {
    const row = await this.get<JobRow>(
      `SELECT * FROM ml_jobs WHERE idempotency_key = ? AND provider_id = ? AND model_id = ? AND model_revision = ? AND input_hash = ?`,
      [idempotencyKey, providerId, modelId, modelRevision, inputHash]
    );
    return row ? rowToJob(row) : null;
  }

  async updateStatus(jobId: string, status: MlJobStatus, patch: Partial<Pick<StoredJob, 'errorCode' | 'errorMessage' | 'result' | 'provenance' | 'attempt' | 'startedAt' | 'finishedAt'>> = {}): Promise<void> {
    const now = new Date().toISOString();
    await this.run(
      `UPDATE ml_jobs SET status = ?, updated_at = ?,
        error_code = COALESCE(?, error_code),
        error_message = COALESCE(?, error_message),
        result_json = COALESCE(?, result_json),
        provenance_json = COALESCE(?, provenance_json),
        attempt = COALESCE(?, attempt),
        started_at = COALESCE(?, started_at),
        finished_at = COALESCE(?, finished_at)
       WHERE job_id = ?`,
      [
        status, now, patch.errorCode ?? null, patch.errorMessage ?? null,
        patch.result ? JSON.stringify(patch.result) : null,
        patch.provenance ? JSON.stringify(patch.provenance) : null,
        patch.attempt ?? null, patch.startedAt ?? null, patch.finishedAt ?? null, jobId
      ]
    );
  }

  async requestCancel(jobId: string): Promise<boolean> {
    const result = await this.run('UPDATE ml_jobs SET cancel_requested = 1, updated_at = ? WHERE job_id = ?', [new Date().toISOString(), jobId]);
    return result.changes > 0;
  }

  async isCancelRequested(jobId: string): Promise<boolean> {
    const row = await this.get<{ cancel_requested: number }>('SELECT cancel_requested FROM ml_jobs WHERE job_id = ?', [jobId]);
    return row?.cancel_requested === 1;
  }

  async recordAttempt(jobId: string, attempt: number, data: {
    status: string; device?: string | null; startedAt: string; finishedAt?: string | null;
    durationMs?: number | null; peakMemoryMb?: number | null; errorCode?: string | null;
    errorMessage?: string | null; retryClass?: string | null;
  }): Promise<void> {
    await this.run(
      `INSERT OR REPLACE INTO ml_job_attempts (job_id, attempt, status, device, started_at, finished_at, duration_ms, peak_memory_mb, error_code, error_message, retry_class)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [jobId, attempt, data.status, data.device ?? null, data.startedAt, data.finishedAt ?? null,
       data.durationMs ?? null, data.peakMemoryMb ?? null, data.errorCode ?? null, data.errorMessage ?? null, data.retryClass ?? null]
    );
  }

  async listAttempts(jobId: string): Promise<Array<{ attempt: number; status: string; errorCode: string | null; durationMs: number | null }>> {
    const rows = await this.all<{ attempt: number; status: string; error_code: string | null; duration_ms: number | null }>(
      'SELECT attempt, status, error_code, duration_ms FROM ml_job_attempts WHERE job_id = ? ORDER BY attempt', [jobId]);
    return rows.map(r => ({ attempt: r.attempt, status: r.status, errorCode: r.error_code, durationMs: r.duration_ms }));
  }

  /**
   * Startup recovery. Anything the database still believes is running cannot be running, because
   * the process that owned it is gone. Marking these `interrupted` is honest; leaving them
   * `running` would make the queue depth metric permanently wrong.
   */
  async recoverInterruptedJobs(): Promise<string[]> {
    const placeholders = IN_FLIGHT.map(() => '?').join(',');
    const rows = await this.all<{ job_id: string }>(`SELECT job_id FROM ml_jobs WHERE status IN (${placeholders})`, [...IN_FLIGHT]);
    if (rows.length === 0) return [];
    const now = new Date().toISOString();
    await this.run(
      `UPDATE ml_jobs SET status = 'interrupted', updated_at = ?, error_code = 'ML_WORKER_CRASHED',
        error_message = 'process restarted while the job was in flight' WHERE status IN (${placeholders})`,
      [now, ...IN_FLIGHT]
    );
    return rows.map(r => r.job_id);
  }

  async countByStatus(): Promise<Record<string, number>> {
    const rows = await this.all<{ status: string; n: number }>('SELECT status, COUNT(*) as n FROM ml_jobs GROUP BY status');
    return Object.fromEntries(rows.map(r => [r.status, r.n]));
  }

  /* ---------------------------------------------------------------- license & models -- */

  async recordLicenseDecision(decision: LicenseDecision): Promise<void> {
    await this.run(
      `INSERT OR REPLACE INTO license_decisions (decision_id, model_id, model_revision, gate, use_case,
        allowed, status, reason_codes, human_reason, commercial_build, studio_region, license_record_sha256, decided_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [decision.decisionId, decision.modelId, decision.modelRevision, decision.gate, decision.use,
       decision.allowed ? 1 : 0, decision.status, JSON.stringify(decision.reasonCodes), decision.humanReason,
       decision.commercialBuild ? 1 : 0, decision.studioRegion, decision.licenseRecordSha256, decision.decidedAt]
    );
  }

  async upsertModel(model: {
    modelId: string; providerId: string; displayName: string; taskTypes: string[];
    upstreamRepository: string | null; upstreamCommit: string | null; cacheKey: string; maturity: string;
  }): Promise<void> {
    await this.run(
      `INSERT INTO ml_models (model_id, provider_id, display_name, task_types, upstream_repository, upstream_commit, cache_key, maturity)
       VALUES (?,?,?,?,?,?,?,?)
       ON CONFLICT(model_id) DO UPDATE SET provider_id=excluded.provider_id, display_name=excluded.display_name,
         task_types=excluded.task_types, upstream_repository=excluded.upstream_repository,
         upstream_commit=excluded.upstream_commit, cache_key=excluded.cache_key, maturity=excluded.maturity`,
      [model.modelId, model.providerId, model.displayName, JSON.stringify(model.taskTypes),
       model.upstreamRepository, model.upstreamCommit, model.cacheKey, model.maturity]
    );
  }

  async upsertModelRevision(rev: {
    modelId: string; revision: string; weightsFiles: string[]; weightsSha256: string[];
    hashSource: string; installed: boolean; hashVerified: boolean;
  }): Promise<void> {
    await this.run(
      `INSERT INTO ml_model_revisions (model_id, revision, weights_files, weights_sha256, hash_source, installed, hash_verified, verified_at)
       VALUES (?,?,?,?,?,?,?,?)
       ON CONFLICT(model_id, revision) DO UPDATE SET weights_files=excluded.weights_files,
         weights_sha256=excluded.weights_sha256, hash_source=excluded.hash_source,
         installed=excluded.installed, hash_verified=excluded.hash_verified, verified_at=excluded.verified_at`,
      [rev.modelId, rev.revision, JSON.stringify(rev.weightsFiles), JSON.stringify(rev.weightsSha256),
       rev.hashSource, rev.installed ? 1 : 0, rev.hashVerified ? 1 : 0, new Date().toISOString()]
    );
  }

  async recordArtifact(artifact: {
    artifactId: string; sha256: string; sizeBytes: number; mimeType: string; relativePath: string;
    role: string; producerJobId: string | null; licenseDecisionId: string | null;
    consentId?: string | null; parentArtifactIds?: string[]; retention?: string;
  }): Promise<void> {
    await this.run(
      `INSERT OR REPLACE INTO ml_artifacts (artifact_id, sha256, size_bytes, mime_type, relative_path, role,
        producer_job_id, license_decision_id, consent_id, parent_artifact_ids, retention)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [artifact.artifactId, artifact.sha256, artifact.sizeBytes, artifact.mimeType, artifact.relativePath,
       artifact.role, artifact.producerJobId, artifact.licenseDecisionId, artifact.consentId ?? null,
       JSON.stringify(artifact.parentArtifactIds ?? []), artifact.retention ?? 'project']
    );
  }

  async getConsent(consentId: string): Promise<{ consentId: string; revoked: boolean; permittedProjects: string[]; permittedUntil: string | null } | null> {
    const row = await this.get<{ consent_id: string; revoked: number; permitted_projects: string; permitted_until: string | null }>(
      'SELECT consent_id, revoked, permitted_projects, permitted_until FROM consent_records WHERE consent_id = ?', [consentId]);
    if (!row) return null;
    return { consentId: row.consent_id, revoked: row.revoked === 1, permittedProjects: JSON.parse(row.permitted_projects), permittedUntil: row.permitted_until };
  }

  close(): void {
    this.db.close();
  }
}

function rowToJob(row: JobRow): StoredJob {
  return {
    jobId: row.job_id,
    correlationId: row.correlation_id,
    idempotencyKey: row.idempotency_key,
    taskType: row.task_type,
    providerId: row.provider_id,
    modelId: row.model_id,
    modelRevision: row.model_revision,
    executionMode: row.execution_mode,
    commercialMode: row.commercial_mode,
    status: row.status as MlJobStatus,
    attempt: row.attempt,
    maxAttempts: row.max_attempts,
    request: JSON.parse(row.request_json) as MlJobRequestV2,
    result: row.result_json ? (JSON.parse(row.result_json) as MlJobResultV2) : null,
    provenance: row.provenance_json ? (JSON.parse(row.provenance_json) as ModelExecutionProvenance) : null,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    licenseDecisionId: row.license_decision_id,
    inputHash: row.input_hash,
    timeoutMs: row.timeout_ms,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    cancelRequested: row.cancel_requested === 1
  };
}

/**
 * Canonical input hash. Two submissions collide only when the provider, model, revision,
 * every input artifact digest and every parameter are identical — which is exactly when
 * re-running the model would be wasted work.
 */
export function computeInputHash(request: Pick<MlJobRequestV2, 'inputArtifacts' | 'parameters' | 'seed' | 'taskType'>): string {
  const canonical = JSON.stringify({
    taskType: request.taskType,
    inputs: [...request.inputArtifacts].map(a => `${a.role}:${a.sha256}`).sort(),
    parameters: sortedJson(request.parameters),
    seed: request.seed
  });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

function sortedJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortedJson);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, sortedJson(v)]));
  }
  return value;
}
