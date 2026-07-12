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

  refineRange(jobId: string, input: { startFrame: number; endFrame: number; maxPointsPerShape?: number }) {
    return this.request<Record<string, any>>(`/v1/jobs/${encodeURIComponent(jobId)}/refine-range`, {
      method: 'POST', body: JSON.stringify(input)
    });
  }

  listVersions(jobId: string) {
    return this.request<Array<any>>(`/v1/jobs/${encodeURIComponent(jobId)}/versions`);
  }

  rollbackVersion(jobId: string, version: number) {
    return this.request<Record<string, any>>(`/v1/jobs/${encodeURIComponent(jobId)}/rollback`, {
      method: 'POST', body: JSON.stringify({ version })
    });
  }

  lockElements(jobId: string, elementId: string, locked: boolean) {
    return this.request<Record<string, any>>(`/v1/jobs/${encodeURIComponent(jobId)}/lock-elements`, {
      method: 'POST', body: JSON.stringify({ elementId, locked })
    });
  }

  proposeVariants(jobId: string) {
    return this.request<Array<any>>(`/v1/jobs/${encodeURIComponent(jobId)}/variants/propose`, {
      method: 'POST'
    });
  }

  listVariants(jobId: string) {
    return this.request<Array<any>>(`/v1/jobs/${encodeURIComponent(jobId)}/variants`);
  }

  getVariant(jobId: string, variantId: string) {
    return this.request<Record<string, any>>(`/v1/jobs/${encodeURIComponent(jobId)}/variants/${encodeURIComponent(variantId)}`);
  }

  compareVariants(jobId: string) {
    return this.request<Record<string, any>>(`/v1/jobs/${encodeURIComponent(jobId)}/variants-compare`);
  }

  selectVariant(jobId: string, variantId: string, options?: { startFrame?: number; endFrame?: number; reason?: string; user?: string }) {
    return this.request<Record<string, any>>(`/v1/jobs/${encodeURIComponent(jobId)}/variants/select`, {
      method: 'POST', body: JSON.stringify({ variantId, ...options })
    });
  }

  discardVariant(jobId: string, variantId: string) {
    return this.request<Record<string, any>>(`/v1/jobs/${encodeURIComponent(jobId)}/variants/discard`, {
      method: 'POST', body: JSON.stringify({ variantId })
    });
  }

  rollbackVariantSelection(jobId: string) {
    return this.request<Record<string, any>>(`/v1/jobs/${encodeURIComponent(jobId)}/variants/rollback-selection`, {
      method: 'POST'
    });
  }

  analyzeMotionFactorization(jobId: string) {
    return this.request<Record<string, any>>(`/v1/jobs/${encodeURIComponent(jobId)}/motion-factorization`, {
      method: 'POST'
    });
  }

  previewTransform(jobId: string) {
    return this.request<Record<string, any>>(`/v1/jobs/${encodeURIComponent(jobId)}/preview-transform`, {
      method: 'POST'
    });
  }

  applyTransform(jobId: string) {
    return this.request<Record<string, any>>(`/v1/jobs/${encodeURIComponent(jobId)}/apply-transform`, {
      method: 'POST'
    });
  }

  rejectTransform(jobId: string) {
    return this.request<Record<string, any>>(`/v1/jobs/${encodeURIComponent(jobId)}/reject-transform`, {
      method: 'POST'
    });
  }

  loadManifest(manifestPath: string): HarmonyReconstructionManifest {
    const parsed = reconstructionManifestSchema.safeParse(JSON.parse(fs.readFileSync(manifestPath, 'utf8')));
    if (!parsed.success) {
      throw new HarmonyError('INVALID_RECONSTRUCTION_MANIFEST', 'Манифест не прошёл Zod-валидацию.', parsed.error.flatten());
    }
    return parsed.data;
  }

  async retargetAnalyze(input: Record<string, unknown>): Promise<any> {
    return this.request<any>('/v1/retarget/analyze', {
      method: 'POST', body: JSON.stringify(input)
    });
  }

  async retargetPreview(input: Record<string, unknown>): Promise<any> {
    return this.request<any>('/v1/retarget/preview', {
      method: 'POST', body: JSON.stringify(input)
    });
  }

  async retargetApply(input: Record<string, unknown>): Promise<any> {
    return this.request<any>('/v1/retarget/apply', {
      method: 'POST', body: JSON.stringify(input)
    });
  }

  async perceiveVideo(input: { videoPath: string; audioPath: string; outputDir: string }): Promise<any> {
    return this.request<any>('/v1/perceive-video', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
  }
}
