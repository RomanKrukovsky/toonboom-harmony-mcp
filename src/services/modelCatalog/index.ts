import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { z } from 'zod';
import { getProjectRoot } from '../../config.js';
import { MlError } from '../../errors/mlErrorRegistry.js';
import { mlTaskTypeSchema, type MlTaskType, sha256Schema } from '../../schemas/ml.js';

/**
 * Loads `data/models/registry/catalog.json` — the committed, machine-independent half of the
 * model registry. Physical locations are resolved at runtime from `HARMONY_MODEL_CACHE`
 * (default `<projectRoot>/.model-cache`) plus the catalog's logical `cacheKey`, so a checkout
 * is portable and no committed file names a user account.
 */

export const CATALOG_SCHEMA_VERSION = '2.0' as const;

export const hashSourceSchema = z.enum([
  'upstream_published_checksum',
  'upstream_url_path_segment',
  'huggingface_lfs_oid',
  'locally_computed_and_reviewed',
  'not_published_upstream'
]);

export const licenseStatusSchema = z.enum([
  'production_allowed',
  'production_allowed_with_attribution',
  'preview_only',
  'research_only',
  'legal_review_required',
  'blocked',
  'unknown'
]);
export type LicenseStatus = z.infer<typeof licenseStatusSchema>;

export const weightsFileSchema = z.object({
  role: z.string().min(1),
  fileName: z.string().regex(/^[A-Za-z0-9._-]+$/, 'weights file names must not contain path separators'),
  url: z.string().url(),
  sizeBytes: z.number().int().nonnegative().nullable(),
  format: z.enum(['onnx', 'safetensors', 'pytorch_pickle', 'tflite_task', 'gguf', 'zip', 'other']),
  sha256: sha256Schema.nullable(),
  hashSource: hashSourceSchema,
  requiresQuarantineReview: z.boolean()
}).strict()
  .refine(w => w.sha256 !== null || w.requiresQuarantineReview, { message: 'a file with no trusted digest must require quarantine review' });
export type CatalogWeightsFile = z.infer<typeof weightsFileSchema>;

export const licenseRecordSchema = z.object({
  codeLicense: z.string(),
  weightsLicense: z.string(),
  datasetLicense: z.string(),
  commercialUse: z.enum(['allowed', 'allowed_with_attribution', 'forbidden', 'unknown']),
  derivativeWeights: z.enum(['allowed', 'forbidden', 'unknown']),
  redistribution: z.enum(['allowed', 'forbidden', 'unknown']),
  attribution: z.string(),
  territorialRestrictions: z.array(z.string()),
  personalDataRisk: z.enum(['none', 'low', 'medium', 'high', 'unknown']),
  biometricDataRisk: z.enum(['none', 'low', 'medium', 'high', 'unknown']),
  consentRequired: z.boolean(),
  status: licenseStatusSchema,
  legalNotes: z.string(),
  verifiedSourceUrls: z.array(z.string().url()),
  verifiedAt: z.string().nullable(),
  verifiedBy: z.string().nullable()
}).strict()
  .refine(l => l.status !== 'production_allowed' || l.verifiedBy !== null, { message: 'production_allowed requires a signed verification (verifiedBy)' })
  .refine(l => l.status !== 'production_allowed_with_attribution' || (l.verifiedBy !== null && l.attribution.length > 0), { message: 'attribution status requires both a signature and attribution text' });
export type LicenseRecord = z.infer<typeof licenseRecordSchema>;

export const catalogEntrySchema = z.object({
  modelId: z.string().regex(/^[a-z0-9][a-z0-9._-]*$/),
  providerId: z.string().regex(/^[a-z0-9][a-z0-9_]*$/),
  taskTypes: z.array(mlTaskTypeSchema).min(1),
  displayName: z.string().min(1),
  upstreamRepository: z.string().url().nullable(),
  upstreamCommit: z.string().regex(/^[a-f0-9]{7,40}$/).nullable(),
  revision: z.string().min(1),
  cacheKey: z.string().regex(/^[a-z0-9][a-z0-9._-]*(\/[a-z0-9][a-z0-9._-]*)*$/, 'cacheKey must be a logical relative key, never an absolute path'),
  weightsFiles: z.array(weightsFileSchema),
  runtime: z.object({
    kind: z.enum(['onnxruntime', 'pytorch', 'mediapipe', 'huggingface_transformers', 'external_binary', 'not_integrated']),
    trustRemoteCode: z.literal(false),
    requiresPickle: z.boolean(),
    pythonEnvironment: z.enum(['ml-runtime', 'ml-core', 'reconstruction-core', 'external']).optional(),
    requirementsLock: z.string().nullable().optional()
  }).strict(),
  hardware: z.object({
    devices: z.array(z.enum(['cpu', 'mps', 'cuda', 'remote'])).min(1),
    minRamGb: z.number().nonnegative(),
    minVramGb: z.number().nonnegative().nullable().optional(),
    recommendedProfiles: z.array(z.enum(['cpu_only', 'apple_silicon', 'cuda_8gb', 'cuda_16gb', 'cuda_24gb', 'cuda_48gb', 'cuda_80gb', 'remote_gpu'])).optional()
  }).strict(),
  license: licenseRecordSchema,
  maturity: z.enum(['planned', 'schema_only', 'stub', 'fixture_verified', 'contract_verified', 'offline_verified', 'real_model_verified', 'blocked', 'deprecated']),
  notes: z.string().optional()
}).strict();
export type CatalogEntry = z.infer<typeof catalogEntrySchema>;

export const catalogSchema = z.object({
  schemaVersion: z.literal(CATALOG_SCHEMA_VERSION),
  generatedAt: z.string(),
  $comment: z.string().optional(),
  models: z.array(catalogEntrySchema)
}).strict();

export interface CatalogIssue {
  modelId: string | null;
  severity: 'error' | 'warning';
  code: string;
  message: string;
}

export function modelCacheRoot(): string {
  const raw = process.env.HARMONY_MODEL_CACHE;
  return raw ? path.resolve(raw) : path.join(getProjectRoot(), '.model-cache');
}

/**
 * Locates the repository root for catalog purposes.
 *
 * `getProjectRoot()` is `process.cwd()`, which is correct when the server is started from the
 * repository root but wrong when a tool is invoked from a subdirectory. Walking upwards for the
 * catalog file keeps it findable either way, without hard-coding a path into the source.
 */
function catalogRoot(): string {
  const start = getProjectRoot();
  let dir = start;
  for (let depth = 0; depth < 10; depth += 1) {
    if (fs.existsSync(path.join(dir, 'data', 'models', 'registry', 'catalog.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

export function catalogPath(): string {
  return path.join(catalogRoot(), 'data', 'models', 'registry', 'catalog.json');
}

export function localStatePath(): string {
  return path.join(catalogRoot(), 'data', 'models', 'registry', 'local-state.json');
}

export interface LocalModelState {
  modelId: string;
  installed: boolean;
  installedRevision: string | null;
  verifiedFiles: Record<string, string>;
  status: 'not_installed' | 'quarantined' | 'installed_unverified' | 'ready' | 'degraded' | 'failed';
  lastVerifiedAt: string | null;
}

export interface ModelReadiness {
  modelId: string;
  installed: boolean;
  /** Every declared weights file exists AND its digest matches a trusted catalog entry. */
  hashVerified: boolean;
  missingFiles: string[];
  mismatchedFiles: string[];
  untrustedFiles: string[];
  licenseStatus: LicenseStatus;
  maturity: CatalogEntry['maturity'];
  blockingReason: string | null;
}

export class ModelCatalog {
  private readonly entries = new Map<string, CatalogEntry>();
  private readonly issues: CatalogIssue[] = [];

  private constructor(entries: CatalogEntry[], issues: CatalogIssue[]) {
    for (const entry of entries) this.entries.set(entry.modelId, entry);
    this.issues = issues;
  }

  /**
   * Reads and validates the catalog. A structurally invalid catalog throws — it is never
   * silently replaced with defaults, which is how the previous registry ended up inventing
   * four models with placeholder digests.
   */
  static load(file: string = catalogPath()): ModelCatalog {
    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch (error) {
      throw new MlError('ML_CATALOG_INVALID', `cannot read model catalog at ${file}: ${(error as Error).message}`, {}, { cause: error });
    }
    const parsed = catalogSchema.safeParse(raw);
    if (!parsed.success) {
      throw new MlError('ML_CATALOG_INVALID', `model catalog failed validation: ${parsed.error.message}`);
    }
    const issues = validateCatalogSemantics(parsed.data.models);
    if (issues.some(i => i.severity === 'error')) {
      const first = issues.find(i => i.severity === 'error')!;
      throw new MlError('ML_CATALOG_INVALID', `${first.code}: ${first.message}`, { modelId: first.modelId ?? undefined });
    }
    return new ModelCatalog(parsed.data.models, issues);
  }

  getIssues(): readonly CatalogIssue[] {
    return this.issues;
  }

  get(modelId: string): CatalogEntry | undefined {
    return this.entries.get(modelId);
  }

  require(modelId: string): CatalogEntry {
    const entry = this.entries.get(modelId);
    if (!entry) throw new MlError('ML_MODEL_NOT_INSTALLED', `model ${modelId} is not in the catalog`, { modelId });
    return entry;
  }

  list(): CatalogEntry[] {
    return Array.from(this.entries.values());
  }

  forTask(task: MlTaskType): CatalogEntry[] {
    return this.list().filter(e => e.taskTypes.includes(task));
  }

  /** Absolute directory for a model's weights on this machine. Not committed anywhere. */
  cacheDir(modelId: string): string {
    return path.join(modelCacheRoot(), this.require(modelId).cacheKey);
  }

  /**
   * Measures what is actually on disk. `hashVerified` is only true when every declared file is
   * present and matches a digest the catalog marks as trusted. A file whose catalog digest is
   * null can never be `hashVerified`, no matter what is on disk.
   */
  getModelReadiness(modelId: string, opts: { extraSearchDirs?: string[] } = {}): ModelReadiness {
    const entry = this.require(modelId);
    const dirs = [this.cacheDir(modelId), ...(opts.extraSearchDirs ?? [])];
    const missingFiles: string[] = [];
    const mismatchedFiles: string[] = [];
    const untrustedFiles: string[] = [];

    for (const file of entry.weightsFiles) {
      const found = dirs.map(d => path.join(d, file.fileName)).find(p => fs.existsSync(p) && fs.statSync(p).isFile());
      if (!found) {
        missingFiles.push(file.fileName);
        continue;
      }
      if (file.sha256 === null) {
        untrustedFiles.push(file.fileName);
        continue;
      }
      const digest = sha256File(found);
      if (digest !== file.sha256) mismatchedFiles.push(file.fileName);
    }

    const installed = entry.weightsFiles.length > 0 && missingFiles.length === 0;
    const hashVerified = installed && mismatchedFiles.length === 0 && untrustedFiles.length === 0;

    let blockingReason: string | null = null;
    if (entry.weightsFiles.length === 0) blockingReason = 'catalog declares no weights files; this integration is metadata only';
    else if (missingFiles.length) blockingReason = `weights not installed: ${missingFiles.join(', ')}`;
    else if (mismatchedFiles.length) blockingReason = `digest mismatch: ${mismatchedFiles.join(', ')}`;
    else if (untrustedFiles.length) blockingReason = `no trusted digest in catalog for: ${untrustedFiles.join(', ')}`;

    return {
      modelId,
      installed,
      hashVerified,
      missingFiles,
      mismatchedFiles,
      untrustedFiles,
      licenseStatus: entry.license.status,
      maturity: entry.maturity,
      blockingReason
    };
  }

  readLocalState(): Record<string, LocalModelState> {
    const file = localStatePath();
    if (!fs.existsSync(file)) return {};
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf-8')) as { models?: Record<string, LocalModelState> };
      return raw.models ?? {};
    } catch (error) {
      throw new MlError('ML_CATALOG_INVALID', `local-state.json is corrupt: ${(error as Error).message}`, {}, { cause: error });
    }
  }
}

export function sha256File(file: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(file));
  return hash.digest('hex');
}

/**
 * Semantic checks a JSON Schema cannot express: duplicate ids, provider/task coherence,
 * fabricated-looking digests, and maturity claims that outrun the evidence.
 */
export function validateCatalogSemantics(models: CatalogEntry[]): CatalogIssue[] {
  const issues: CatalogIssue[] = [];
  const seenIds = new Set<string>();
  const cacheKeys = new Map<string, string>();

  for (const model of models) {
    if (seenIds.has(model.modelId)) {
      issues.push({ modelId: model.modelId, severity: 'error', code: 'DUPLICATE_MODEL_ID', message: `modelId ${model.modelId} appears more than once` });
    }
    seenIds.add(model.modelId);

    const previousOwner = cacheKeys.get(model.cacheKey);
    if (previousOwner && previousOwner !== model.modelId) {
      issues.push({ modelId: model.modelId, severity: 'error', code: 'CACHE_KEY_COLLISION', message: `cacheKey ${model.cacheKey} is already claimed by ${previousOwner}` });
    }
    cacheKeys.set(model.cacheKey, model.modelId);

    if (/[/\\]/.test(model.cacheKey.replace(/\//g, '')) || path.isAbsolute(model.cacheKey)) {
      issues.push({ modelId: model.modelId, severity: 'error', code: 'ABSOLUTE_CACHE_KEY', message: 'cacheKey must be relative' });
    }

    for (const file of model.weightsFiles) {
      if (file.sha256 && looksFabricated(file.sha256)) {
        issues.push({ modelId: model.modelId, severity: 'error', code: 'IMPLAUSIBLE_DIGEST', message: `${file.fileName}: digest ${file.sha256} contains a repeating pattern and is almost certainly not a real SHA-256` });
      }
      if (file.sha256 === null && !file.requiresQuarantineReview) {
        issues.push({ modelId: model.modelId, severity: 'error', code: 'UNQUARANTINED_UNKNOWN_DIGEST', message: `${file.fileName}: no digest but quarantine review not required` });
      }
    }

    if (model.maturity === 'real_model_verified' && model.weightsFiles.every(f => f.sha256 === null)) {
      issues.push({ modelId: model.modelId, severity: 'error', code: 'UNSUPPORTED_MATURITY_CLAIM', message: 'real_model_verified requires at least one file with a trusted digest' });
    }

    if (model.license.status === 'unknown') {
      issues.push({ modelId: model.modelId, severity: 'warning', code: 'LICENSE_UNKNOWN', message: 'licence status is unknown; commercial builds will refuse this model' });
    }
    if (model.upstreamCommit === null && model.runtime.kind !== 'not_integrated') {
      issues.push({ modelId: model.modelId, severity: 'warning', code: 'UNPINNED_UPSTREAM', message: 'upstreamCommit is null; the integration is not reproducibly pinned' });
    }
  }

  return issues;
}

/**
 * A cheap structural sanity check for hand-written digests. Real SHA-256 output effectively
 * never contains a 4-nibble group repeated four times in a row; the two digests removed from
 * the old registry both did (`…cf8cf8cf8cf8…`, `…9241924192419241`).
 */
export function looksFabricated(digest: string): boolean {
  if (/(.{3,4})\1{3,}/.test(digest)) return true;
  const distinct = new Set(digest.split('')).size;
  return distinct <= 6;
}

let cached: ModelCatalog | null = null;
export function getModelCatalog(forceReload = false): ModelCatalog {
  if (!cached || forceReload) cached = ModelCatalog.load();
  return cached;
}
