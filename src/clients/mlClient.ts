import { config } from '../config.js';
import { HarmonyError } from '../security.js';
import {
  mlSystemProfileSchema,
  mlJobResponseSchema,
  videoPerceptionManifestSchema,
  type MLSystemProfile,
  type MLJobResponse,
  type VideoPerceptionManifest
} from '../schemas/ml.js';

export class MLClient {
  constructor(
    private readonly baseUrl = config.reconstruction.mlCoreUrl,
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
          body.detail?.message || body.message || `ML core returned HTTP ${response.status}`,
          body.detail || body
        );
      }
      return body as T;
    } catch (error: any) {
      if (error instanceof HarmonyError) throw error;
      throw new HarmonyError(
        'RECONSTRUCTION_CORE_UNAVAILABLE',
        `ML core perception stack недоступен по адресу ${this.baseUrl}: ${error.message}`
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async getSystemProfile(): Promise<MLSystemProfile> {
    const data = await this.request<any>('/v1/ml/system');
    return mlSystemProfileSchema.parse(data);
  }

  async listModels(): Promise<Array<any>> {
    return this.request<Array<any>>('/v1/ml/models');
  }

  async installModel(modelId: string): Promise<any> {
    return this.request<any>('/v1/ml/models/install', {
      method: 'POST',
      body: JSON.stringify({ modelId })
    });
  }

  async verifyModel(modelId: string): Promise<any> {
    return this.request<any>('/v1/ml/models/verify', {
      method: 'POST',
      body: JSON.stringify({ modelId })
    });
  }

  async listDatasets(): Promise<any> {
    return this.request<any>('/v1/ml/datasets');
  }

  async segmentVideo(videoPath: string, modelId?: string): Promise<MLJobResponse> {
    const data = await this.request<any>('/v1/ml/segment', {
      method: 'POST',
      body: JSON.stringify({ videoPath, modelId })
    });
    return mlJobResponseSchema.parse(data);
  }

  async estimatePose(videoPath: string, modelId?: string): Promise<MLJobResponse> {
    const data = await this.request<any>('/v1/ml/pose', {
      method: 'POST',
      body: JSON.stringify({ videoPath, modelId })
    });
    return mlJobResponseSchema.parse(data);
  }

  async trackPoints(videoPath: string, queryPoints: Array<any>, modelId?: string): Promise<MLJobResponse> {
    const data = await this.request<any>('/v1/ml/track/points', {
      method: 'POST',
      body: JSON.stringify({ videoPath, queryPoints, modelId })
    });
    return mlJobResponseSchema.parse(data);
  }

  async transcribeAudio(audioPath: string, modelId?: string): Promise<MLJobResponse> {
    const data = await this.request<any>('/v1/ml/transcribe', {
      method: 'POST',
      body: JSON.stringify({ audioPath, modelId })
    });
    return mlJobResponseSchema.parse(data);
  }

  async perceiveVideo(input: { videoPath: string; tasks: string[]; audioPath?: string; profile?: string; quality?: string }): Promise<MLJobResponse> {
    const data = await this.request<any>('/v1/ml/perceive-video', {
      method: 'POST',
      body: JSON.stringify(input)
    });
    return mlJobResponseSchema.parse(data);
  }

  async getJob(jobId: string): Promise<MLJobResponse> {
    const data = await this.request<any>(`/v1/ml/jobs/${encodeURIComponent(jobId)}`);
    return mlJobResponseSchema.parse(data);
  }

  async cancelJob(jobId: string): Promise<MLJobResponse> {
    const data = await this.request<any>(`/v1/ml/jobs/${encodeURIComponent(jobId)}/cancel`, {
      method: 'POST'
    });
    return mlJobResponseSchema.parse(data);
  }

  async getJobArtifacts(jobId: string): Promise<any> {
    return this.request<any>(`/v1/ml/jobs/${encodeURIComponent(jobId)}/artifacts`);
  }
}
