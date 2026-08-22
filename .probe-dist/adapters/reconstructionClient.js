import fs from 'fs';
import { config } from '../config.js';
import { HarmonyError } from '../security.js';
import { reconstructionManifestSchema } from '../schemas/reconstruction.js';
export class ReconstructionClient {
    baseUrl;
    timeoutMs;
    constructor(baseUrl = config.reconstruction.coreUrl, timeoutMs = config.reconstruction.requestTimeoutMs) {
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
                throw new HarmonyError('RECONSTRUCTION_FAILED', body.detail?.message || body.message || `Reconstruction core returned HTTP ${response.status}`, body.detail || body);
            }
            return body;
        }
        catch (error) {
            if (error instanceof HarmonyError)
                throw error;
            throw new HarmonyError('RECONSTRUCTION_CORE_UNAVAILABLE', `Reconstruction core недоступен по адресу ${this.baseUrl}: ${error.message}`);
        }
        finally {
            clearTimeout(timeout);
        }
    }
    health() {
        return this.request('/health');
    }
    analyze(input) {
        return this.request('/v1/analyze', {
            method: 'POST', body: JSON.stringify(input)
        });
    }
    reconstruct(input) {
        return this.request('/v1/reconstruct', {
            method: 'POST', body: JSON.stringify(input)
        });
    }
    getJob(jobId) {
        return this.request(`/v1/jobs/${encodeURIComponent(jobId)}`);
    }
    cancelJob(jobId) {
        return this.request(`/v1/jobs/${encodeURIComponent(jobId)}/cancel`, { method: 'POST' });
    }
    compareRender(pairs) {
        return this.request('/v1/compare-render', {
            method: 'POST', body: JSON.stringify({ pairs })
        });
    }
    refineRange(jobId, input) {
        return this.request(`/v1/jobs/${encodeURIComponent(jobId)}/refine-range`, {
            method: 'POST', body: JSON.stringify(input)
        });
    }
    listVersions(jobId) {
        return this.request(`/v1/jobs/${encodeURIComponent(jobId)}/versions`);
    }
    rollbackVersion(jobId, version) {
        return this.request(`/v1/jobs/${encodeURIComponent(jobId)}/rollback`, {
            method: 'POST', body: JSON.stringify({ version })
        });
    }
    lockElements(jobId, elementId, locked) {
        return this.request(`/v1/jobs/${encodeURIComponent(jobId)}/lock-elements`, {
            method: 'POST', body: JSON.stringify({ elementId, locked })
        });
    }
    proposeVariants(jobId) {
        return this.request(`/v1/jobs/${encodeURIComponent(jobId)}/variants/propose`, {
            method: 'POST'
        });
    }
    listVariants(jobId) {
        return this.request(`/v1/jobs/${encodeURIComponent(jobId)}/variants`);
    }
    getVariant(jobId, variantId) {
        return this.request(`/v1/jobs/${encodeURIComponent(jobId)}/variants/${encodeURIComponent(variantId)}`);
    }
    compareVariants(jobId) {
        return this.request(`/v1/jobs/${encodeURIComponent(jobId)}/variants-compare`);
    }
    selectVariant(jobId, variantId, options) {
        return this.request(`/v1/jobs/${encodeURIComponent(jobId)}/variants/select`, {
            method: 'POST', body: JSON.stringify({ variantId, ...options })
        });
    }
    discardVariant(jobId, variantId) {
        return this.request(`/v1/jobs/${encodeURIComponent(jobId)}/variants/discard`, {
            method: 'POST', body: JSON.stringify({ variantId })
        });
    }
    rollbackVariantSelection(jobId) {
        return this.request(`/v1/jobs/${encodeURIComponent(jobId)}/variants/rollback-selection`, {
            method: 'POST'
        });
    }
    analyzeMotionFactorization(jobId) {
        return this.request(`/v1/jobs/${encodeURIComponent(jobId)}/motion-factorization`, {
            method: 'POST'
        });
    }
    previewTransform(jobId) {
        return this.request(`/v1/jobs/${encodeURIComponent(jobId)}/preview-transform`, {
            method: 'POST'
        });
    }
    applyTransform(jobId) {
        return this.request(`/v1/jobs/${encodeURIComponent(jobId)}/apply-transform`, {
            method: 'POST'
        });
    }
    rejectTransform(jobId) {
        return this.request(`/v1/jobs/${encodeURIComponent(jobId)}/reject-transform`, {
            method: 'POST'
        });
    }
    loadManifest(manifestPath) {
        const parsed = reconstructionManifestSchema.safeParse(JSON.parse(fs.readFileSync(manifestPath, 'utf8')));
        if (!parsed.success) {
            throw new HarmonyError('INVALID_RECONSTRUCTION_MANIFEST', 'Манифест не прошёл Zod-валидацию.', parsed.error.flatten());
        }
        return parsed.data;
    }
    async retargetAnalyze(input) {
        return this.request('/v1/retarget/analyze', {
            method: 'POST', body: JSON.stringify(input)
        });
    }
    async retargetPreview(input) {
        return this.request('/v1/retarget/preview', {
            method: 'POST', body: JSON.stringify(input)
        });
    }
    async retargetApply(input) {
        return this.request('/v1/retarget/apply', {
            method: 'POST', body: JSON.stringify(input)
        });
    }
    async perceiveVideo(input) {
        return this.request('/v1/perceive-video', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
    }
}
