import { config } from '../config.js';
import { HarmonyError } from '../security.js';
import { mlSystemProfileSchema, mlJobResponseSchema } from '../schemas/ml.js';
export class MLClient {
    baseUrl;
    timeoutMs;
    constructor(baseUrl = config.reconstruction.mlCoreUrl, timeoutMs = config.reconstruction.requestTimeoutMs) {
        this.baseUrl = baseUrl;
        this.timeoutMs = timeoutMs;
    }
    async request(pathname, init) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
            const response = await fetch(new URL(pathname, this.baseUrl), {
                ...init,
                headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
                signal: controller.signal
            });
            const body = await response.json().catch(() => ({ message: response.statusText }));
            if (!response.ok) {
                throw new HarmonyError('RECONSTRUCTION_FAILED', body.detail?.message || body.message || `ML core returned HTTP ${response.status}`, body.detail || body);
            }
            return body;
        }
        catch (error) {
            if (error instanceof HarmonyError)
                throw error;
            throw new HarmonyError('RECONSTRUCTION_CORE_UNAVAILABLE', `ML core perception stack недоступен по адресу ${this.baseUrl}: ${error.message}`);
        }
        finally {
            clearTimeout(timeout);
        }
    }
    async getSystemProfile() {
        const data = await this.request('/v1/ml/system');
        return mlSystemProfileSchema.parse(data);
    }
    async listModels() {
        return this.request('/v1/ml/models');
    }
    async installModel(modelId) {
        return this.request('/v1/ml/models/install', {
            method: 'POST',
            body: JSON.stringify({ modelId })
        });
    }
    async verifyModel(modelId) {
        return this.request('/v1/ml/models/verify', {
            method: 'POST',
            body: JSON.stringify({ modelId })
        });
    }
    async listDatasets() {
        return this.request('/v1/ml/datasets');
    }
    async segmentVideo(videoPath, modelId) {
        const data = await this.request('/v1/ml/segment', {
            method: 'POST',
            body: JSON.stringify({ videoPath, modelId })
        });
        return mlJobResponseSchema.parse(data);
    }
    async estimatePose(videoPath, modelId) {
        const data = await this.request('/v1/ml/pose', {
            method: 'POST',
            body: JSON.stringify({ videoPath, modelId })
        });
        return mlJobResponseSchema.parse(data);
    }
    async trackPoints(videoPath, queryPoints, modelId) {
        const data = await this.request('/v1/ml/track/points', {
            method: 'POST',
            body: JSON.stringify({ videoPath, queryPoints, modelId })
        });
        return mlJobResponseSchema.parse(data);
    }
    async transcribeAudio(audioPath, modelId) {
        const data = await this.request('/v1/ml/transcribe', {
            method: 'POST',
            body: JSON.stringify({ audioPath, modelId })
        });
        return mlJobResponseSchema.parse(data);
    }
    async perceiveVideo(input) {
        const data = await this.request('/v1/ml/perceive-video', {
            method: 'POST',
            body: JSON.stringify(input)
        });
        return mlJobResponseSchema.parse(data);
    }
    async getJob(jobId) {
        const data = await this.request(`/v1/ml/jobs/${encodeURIComponent(jobId)}`);
        return mlJobResponseSchema.parse(data);
    }
    async cancelJob(jobId) {
        const data = await this.request(`/v1/ml/jobs/${encodeURIComponent(jobId)}/cancel`, {
            method: 'POST'
        });
        return mlJobResponseSchema.parse(data);
    }
    async getJobArtifacts(jobId) {
        return this.request(`/v1/ml/jobs/${encodeURIComponent(jobId)}/artifacts`);
    }
}
