import { MlError, toMlError, ML_ERROR_CODES, type MlErrorCode } from '../errors/mlErrorRegistry.js';
import { mlJobResultV2Schema, type MlJobRequestV2, type MlJobResultV2 } from '../schemas/ml.js';

/**
 * Client for the versioned Python ML runtime (`/v2/*`).
 *
 * One protocol for every provider. The legacy `/jobs/execute` and `/infer/*` endpoints still
 * exist on the server as thin deprecated adapters, but nothing in TypeScript targets them any
 * more — a second code path is how the runtime ended up with per-model business logic scattered
 * across ad-hoc handlers.
 */

export interface MlRuntimeProviderInfo {
  providerId: string;
  modelId: string;
  modelRevision: string;
  taskTypes: string[];
  backend: string;
  devices: string[];
  ready: boolean;
  blockingReason: string | null;
  weightsSha256: string[];
}

export interface MlRuntimeHealth {
  status: string;
  version: string;
  pythonVersion: string;
}

export interface MlRuntimeReadiness {
  runtimeReady: boolean;
  inferenceReady: boolean;
  status: string;
  readyProviders: string[];
  blockedProviders: Record<string, string>;
}

export class MlRuntimeClient {
  constructor(
    private readonly baseUrl: string = process.env.ML_RUNTIME_URL ?? 'http://127.0.0.1:8000',
    private readonly defaultTimeoutMs: number = Number(process.env.ML_RUNTIME_TIMEOUT_MS ?? 600_000)
  ) {}

  private authHeaders(): Record<string, string> {
    const key = process.env.ML_RUNTIME_API_KEY;
    return key ? { 'x-api-key': key } : {};
  }

  private async request<T>(pathname: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), init.timeoutMs ?? this.defaultTimeoutMs);
    try {
      const response = await fetch(new URL(pathname, this.baseUrl), {
        ...init,
        headers: { 'content-type': 'application/json', ...this.authHeaders(), ...(init.headers ?? {}) },
        signal: controller.signal
      });
      const text = await response.text();
      const body = text ? safeJson(text) : {};
      if (!response.ok) {
        const detail = (body as { detail?: { code?: string; message?: string } }).detail;
        const code = detail?.code;
        throw new MlError(
          mapHttpToCode(response.status, code),
          detail?.message ?? `ML runtime returned HTTP ${response.status}`,
          { detail: { httpStatus: response.status, runtimeCode: code } }
        );
      }
      return body as T;
    } catch (error) {
      if (error instanceof MlError) throw error;
      if ((error as Error).name === 'AbortError') {
        throw new MlError('ML_TIMEOUT', `ML runtime did not answer within ${init.timeoutMs ?? this.defaultTimeoutMs} ms`);
      }
      // Connection-level failures are idempotent from our side and are therefore retryable.
      throw toMlError(error, 'ML_RUNTIME_UNAVAILABLE', { detail: { baseUrl: redactUrl(this.baseUrl) } });
    } finally {
      clearTimeout(timeout);
    }
  }

  async health(): Promise<MlRuntimeHealth> {
    return this.request<MlRuntimeHealth>('/health', { timeoutMs: 5_000 });
  }

  async readiness(): Promise<MlRuntimeReadiness> {
    return this.request<MlRuntimeReadiness>('/readiness', { timeoutMs: 10_000 });
  }

  async listProviders(): Promise<MlRuntimeProviderInfo[]> {
    const body = await this.request<{ providers: MlRuntimeProviderInfo[] }>('/v2/providers', { timeoutMs: 15_000 });
    return body.providers;
  }

  async listModels(): Promise<Array<{ modelId: string; revision: string; installed: boolean; hashVerified: boolean; blockingReason: string | null }>> {
    const body = await this.request<{ models: Array<{ modelId: string; revision: string; installed: boolean; hashVerified: boolean; blockingReason: string | null }> }>('/v2/models', { timeoutMs: 15_000 });
    return body.models;
  }

  async submit(request: MlJobResultV2 | MlJobRequestV2): Promise<MlJobResultV2>;
  async submit(request: MlJobRequestV2): Promise<MlJobResultV2> {
    const raw = await this.request<unknown>('/v2/jobs', {
      method: 'POST',
      body: JSON.stringify(request),
      timeoutMs: request.timeoutMs
    });
    const parsed = mlJobResultV2Schema.safeParse(raw);
    if (!parsed.success) {
      throw new MlError('ML_OUTPUT_SCHEMA_INVALID', `runtime returned a result that fails MlJobResultV2: ${parsed.error.message}`, { jobId: request.jobId });
    }
    return parsed.data;
  }

  /** Uploads base64-encoded bytes into the runtime's content-addressed store and returns
   *  a typed ArtifactReference that can be passed as an inputArtifact in `submit`. */
  async uploadArtifact(input: { namespace: string; relativePath: string; role: string; mimeType?: string; base64: string }): Promise<{
    artifactId: string;
    sha256: string;
    sizeBytes: number;
    mimeType: string;
    relativePath: string;
    role: string;
  }> {
    return this.request('/v2/artifacts', { method: 'POST', body: JSON.stringify(input), timeoutMs: 30_000 });
  }

  async getJob(jobId: string): Promise<MlJobResultV2> {
    const raw = await this.request<unknown>(`/v2/jobs/${encodeURIComponent(jobId)}`, { timeoutMs: 15_000 });
    const parsed = mlJobResultV2Schema.safeParse(raw);
    if (!parsed.success) {
      throw new MlError('ML_OUTPUT_SCHEMA_INVALID', `runtime job status fails MlJobResultV2: ${parsed.error.message}`, { jobId });
    }
    return parsed.data;
  }

  async cancel(jobId: string): Promise<{ cancelled: boolean; status: string }> {
    return this.request<{ cancelled: boolean; status: string }>(`/v2/jobs/${encodeURIComponent(jobId)}/cancel`, { method: 'POST', timeoutMs: 15_000 });
  }

  async unloadModel(modelId: string): Promise<{ unloaded: boolean; freedMb: number | null }> {
    return this.request<{ unloaded: boolean; freedMb: number | null }>(`/v2/models/${encodeURIComponent(modelId)}/unload`, { method: 'POST', timeoutMs: 60_000 });
  }

  async metrics(): Promise<Record<string, number>> {
    return this.request<Record<string, number>>('/metrics', { timeoutMs: 10_000 });
  }
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return { message: text.slice(0, 500) }; }
}

function mapHttpToCode(status: number, runtimeCode?: string): MlErrorCode {
  // The runtime speaks the same error vocabulary, so a code it supplies wins over the status.
  if (runtimeCode && (ML_ERROR_CODES as readonly string[]).includes(runtimeCode)) return runtimeCode as MlErrorCode;
  switch (status) {
    case 400: return 'ML_INPUT_SCHEMA_INVALID';
    case 403: return 'ML_LICENSE_BLOCKED';
    case 404: return 'ML_PROVIDER_NOT_FOUND';
    case 412: return 'ML_MODEL_NOT_INSTALLED';
    case 422: return 'ML_INPUT_SCHEMA_INVALID';
    case 499: return 'ML_CANCELLED';
    case 503: return 'ML_RUNTIME_UNAVAILABLE';
    case 504: return 'ML_TIMEOUT';
    default: return 'ML_WORKER_CRASHED';
  }
}

/** Keeps credentials out of logs when a URL carries userinfo. */
function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.username = '';
    parsed.password = '';
    return parsed.toString();
  } catch {
    return url;
  }
}
