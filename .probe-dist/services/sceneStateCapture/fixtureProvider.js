/**
 * Offline scene state provider backed by JSON fixtures.
 *
 * Its `source` is always `fixture`, so nothing it produces can be mistaken for a real
 * Harmony read anywhere downstream. Used by the offline vertical slice and the test suite.
 */
import fs from 'fs';
import { HarmonyError, verifyPathAccess } from '../../security.js';
export class FixtureSceneStateProvider {
    options;
    source = 'fixture';
    cursor = 0;
    constructor(options) {
        this.options = options;
        if (options.statePaths.length === 0) {
            throw new HarmonyError('INVALID_INPUT', 'FixtureSceneStateProvider requires at least one fixture path.');
        }
    }
    async describe() {
        const missing = this.options.statePaths.filter(p => !fs.existsSync(p));
        return {
            source: this.source,
            available: missing.length === 0,
            blockingReason: missing.length > 0 ? `Missing fixture files: ${missing.join(', ')}` : undefined
        };
    }
    async captureFull() {
        const index = Math.min(this.cursor, this.options.statePaths.length - 1);
        this.cursor = Math.min(this.cursor + 1, this.options.statePaths.length - 1);
        return this.load(this.options.statePaths[index]);
    }
    /** Fixtures cannot scope a read; the recorder falls back to a full read. */
    async captureEntities() {
        return undefined;
    }
    load(filePath) {
        const canonical = verifyPathAccess(filePath);
        if (!fs.existsSync(canonical)) {
            throw new HarmonyError('INVALID_INPUT', `Scene state fixture not found: ${filePath}`);
        }
        let parsed;
        try {
            parsed = JSON.parse(fs.readFileSync(canonical, 'utf-8'));
        }
        catch (error) {
            throw new HarmonyError('INVALID_INPUT', `Scene state fixture is not valid JSON: ${error.message}`);
        }
        if (!parsed || !Array.isArray(parsed.nodes) || !parsed.sceneSettings) {
            throw new HarmonyError('INVALID_INPUT', `Scene state fixture "${filePath}" is missing required fields (nodes, sceneSettings).`);
        }
        return {
            nodes: parsed.nodes ?? [],
            connections: parsed.connections ?? [],
            nodeAttributes: parsed.nodeAttributes ?? [],
            columns: parsed.columns ?? [],
            keyframes: parsed.keyframes ?? [],
            exposures: parsed.exposures ?? [],
            camera: parsed.camera,
            sceneSettings: parsed.sceneSettings,
            warnings: parsed.warnings ?? [],
            errors: parsed.errors ?? []
        };
    }
}
