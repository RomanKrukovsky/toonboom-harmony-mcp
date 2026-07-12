import fs from 'fs';
import { config } from '../config.js';
import { HarmonyError } from '../security.js';
import { reconstructionManifestSchema, type HarmonyReconstructionManifest } from '../schemas/reconstruction.js';

export interface ReconstructionJobResponse {
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  stage: string;
  progress: number;
  manifestPath?: string;
  analysisPath?: string;
  error?: { code: string; message: string };
  report?: Record<string, unknown>;
}

export class ReconstructionClient {
  constructor(
    private readonly baseUrl = config.reconstruction.coreUrl,
    private readonly timeoutMs = config.reconstruction.requestTimeoutMs
  ) {}

  private async request<T>(pathname: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(new URL(pathname, this.baseUrl), {
        ...init,
        headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
        signal: controller.signal
      });
      const body = await response.json().catch(() => ({ message: response.statusText })) as any;
      if (!response.ok) {
        throw new HarmonyError(
          'RECONSTRUCTION_FAILED',
          body.detail?.message || body.message || `Reconstruction core returned HTTP ${response.status}`,
          body.detail || body
        );
      }
      return body as T;
    } catch (error: any) {
      if (error instanceof HarmonyError) throw error;
      throw new HarmonyError(
        'RECONSTRUCTION_CORE_UNAVAILABLE',
        `Reconstruction core недоступен по адресу ${this.baseUrl}: ${error.message}`
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  health() {
    return this.request<Record<string, unknown>>('/health');
  }

  analyze(input: Record<string, unknown>) {
    return this.request<ReconstructionJobResponse>('/v1/analyze', {
      method: 'POST', body: JSON.stringify(input)
    });
  }

  reconstruct(input: Record<string, unknown>) {
    return this.request<ReconstructionJobResponse>('/v1/reconstruct', {
      method: 'POST', body: JSON.stringify(input)
    });
  }

  getJob(jobId: string) {
    return this.request<ReconstructionJobResponse>(`/v1/jobs/${encodeURIComponent(jobId)}`);
  }

  cancelJob(jobId: string) {
    return this.request<ReconstructionJobResponse>(`/v1/jobs/${encodeURIComponent(jobId)}/cancel`, { method: 'POST' });
  }

  compareRender(pairs: Array<{ frame: number; sourcePath: string; renderPath: string }>) {
    return this.request<Record<string, any>>('/v1/compare-render', {
      method: 'POST', body: JSON.stringify({ pairs })
    });
  }

  loadManifest(manifestPath: string): HarmonyReconstructionManifest {
    const parsed = reconstructionManifestSchema.safeParse(JSON.parse(fs.readFileSync(manifestPath, 'utf8')));
    if (!parsed.success) {
      throw new HarmonyError('INVALID_RECONSTRUCTION_MANIFEST', 'Манифест не прошёл Zod-валидацию.', parsed.error.flatten());
    }
    return parsed.data;
  }
}
