import fs from 'fs';
import path from 'path';
import { artistCorrectionSchema, trainingSampleSchema, pairwisePreferenceSchema } from '../../schemas/artistCorrection.js';
import { config } from '../../config.js';
import { verifyPathAccess } from '../../security.js';
export class ArtistCorrectionEngine {
    storagePath;
    storage;
    constructor(storagePath) {
        this.storagePath = storagePath || path.join(config.logDir, 'artist_corrections.json');
        this.storage = this.loadStorage();
    }
    loadStorage() {
        if (fs.existsSync(this.storagePath)) {
            try {
                const data = JSON.parse(fs.readFileSync(this.storagePath, 'utf-8'));
                return {
                    corrections: data.corrections || [],
                    preferences: data.preferences || [],
                    trainingSamples: data.trainingSamples || []
                };
            }
            catch (e) {
                console.warn('Failed to load correction storage, starting fresh:', e);
            }
        }
        return { corrections: [], preferences: [], trainingSamples: [] };
    }
    saveStorage() {
        const dir = path.dirname(this.storagePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.storagePath, JSON.stringify(this.storage, null, 2), 'utf-8');
    }
    generateId(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    recordCorrection(correction) {
        const fullCorrection = {
            ...correction,
            correctionId: this.generateId('corr'),
            timestamp: new Date().toISOString()
        };
        const validated = artistCorrectionSchema.parse(fullCorrection);
        this.storage.corrections.push(validated);
        this.saveStorage();
        return validated;
    }
    recordPreference(preference) {
        const fullPreference = {
            ...preference,
            preferenceId: this.generateId('pref'),
            timestamp: new Date().toISOString()
        };
        const validated = pairwisePreferenceSchema.parse(fullPreference);
        this.storage.preferences.push(validated);
        this.saveStorage();
        return validated;
    }
    getCorrections(sceneId) {
        if (sceneId) {
            return this.storage.corrections.filter(c => c.sceneId === sceneId);
        }
        return this.storage.corrections;
    }
    getPreferences(sceneId) {
        if (sceneId) {
            return this.storage.preferences.filter(p => p.sceneId === sceneId);
        }
        return this.storage.preferences;
    }
    getCorrectionHistory(sceneId) {
        return this.storage.corrections
            .filter(c => c.sceneId === sceneId)
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
    generateTrainingSample(sceneId, correctionId, inputManifest, correctedManifest, criticReportBefore, criticReportAfter) {
        const correction = this.storage.corrections.find(c => c.correctionId === correctionId);
        if (!correction || correction.sceneId !== sceneId) {
            return null;
        }
        const sample = {
            sampleId: this.generateId('sample'),
            sceneId,
            version: correction.versionAfter,
            correctionId,
            inputManifest,
            correctedManifest,
            correctionDelta: correction.delta,
            artistComment: correction.comment,
            criticReportBefore,
            criticReportAfter,
            scope: correction.scope,
            representationBefore: correction.chosenRepresentation,
            representationAfter: correction.chosenRepresentation,
            qualityImprovement: criticReportBefore && criticReportAfter ? {
                technicalScoreDelta: criticReportAfter.technicalScore - criticReportBefore.technicalScore,
                artisticScoreDelta: criticReportAfter.artisticScore - criticReportBefore.artisticScore,
                overallScoreDelta: criticReportAfter.overallScore - criticReportBefore.overallScore
            } : undefined,
            privacyLevel: 'studio_only',
            timestamp: new Date().toISOString()
        };
        const validated = trainingSampleSchema.parse(sample);
        this.storage.trainingSamples.push(validated);
        this.saveStorage();
        return validated;
    }
    exportDataset(exportConfig) {
        const exportId = this.generateId('export');
        const timestamp = new Date().toISOString();
        let samples = [];
        let preferences = [];
        if (exportConfig.includeCorrections) {
            samples = exportConfig.sceneIds.length > 0
                ? this.storage.trainingSamples.filter(s => exportConfig.sceneIds.includes(s.sceneId))
                : this.storage.trainingSamples;
        }
        if (exportConfig.includePreferences) {
            preferences = exportConfig.sceneIds.length > 0
                ? this.storage.preferences.filter(p => exportConfig.sceneIds.includes(p.sceneId))
                : this.storage.preferences;
        }
        const verifiedOutputPath = verifyPathAccess(exportConfig.outputPath);
        const dir = path.dirname(verifiedOutputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        if (exportConfig.format === 'jsonl') {
            const lines = [];
            if (exportConfig.includeCorrections) {
                for (const sample of samples) {
                    lines.push(JSON.stringify(sample));
                }
            }
            if (exportConfig.includePreferences) {
                for (const pref of preferences) {
                    lines.push(JSON.stringify(pref));
                }
            }
            fs.writeFileSync(verifiedOutputPath, lines.join('\n'), 'utf-8');
        }
        else if (exportConfig.format === 'json') {
            const output = {
                exportId,
                timestamp,
                samples,
                preferences
            };
            fs.writeFileSync(verifiedOutputPath, JSON.stringify(output, null, 2), 'utf-8');
        }
        const exportRecord = {
            exportId,
            sceneIds: exportConfig.sceneIds,
            format: exportConfig.format,
            includeCorrections: exportConfig.includeCorrections,
            includePreferences: exportConfig.includePreferences,
            includeCriticReports: exportConfig.includeCriticReports,
            privacyLevel: exportConfig.privacyLevel,
            outputPath: verifiedOutputPath,
            timestamp
        };
        return { exportId, path: verifiedOutputPath, count: samples.length + preferences.length };
    }
    detectChanges(versionBefore, versionAfter) {
        const delta = {};
        const compare = (before, after, prefix = '') => {
            if (typeof before !== 'object' || typeof after !== 'object' || before === null || after === null) {
                if (before !== after) {
                    delta[prefix] = { before, after };
                }
                return;
            }
            const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
            for (const key of allKeys) {
                const newPrefix = prefix ? `${prefix}.${key}` : key;
                if (!(key in before)) {
                    delta[newPrefix] = { before: undefined, after: after[key] };
                }
                else if (!(key in after)) {
                    delta[newPrefix] = { before: before[key], after: undefined };
                }
                else {
                    compare(before[key], after[key], newPrefix);
                }
            }
        };
        compare(versionBefore, versionAfter);
        return delta;
    }
    previewPropagation(correction, targetManifest) {
        const propagated = JSON.parse(JSON.stringify(targetManifest));
        const applyDelta = (obj, delta) => {
            for (const [pathKey, change] of Object.entries(delta)) {
                const keys = pathKey.split('.');
                let current = obj;
                for (let i = 0; i < keys.length - 1; i++) {
                    if (!current[keys[i]])
                        current[keys[i]] = {};
                    current = current[keys[i]];
                }
                if (change.after === undefined) {
                    delete current[keys[keys.length - 1]];
                }
                else {
                    current[keys[keys.length - 1]] = change.after;
                }
            }
        };
        applyDelta(propagated, correction.delta);
        return propagated;
    }
    lockCorrection(correctionId) {
        const correction = this.storage.corrections.find(c => c.correctionId === correctionId);
        if (correction) {
            correction.accepted = true;
            this.saveStorage();
            return true;
        }
        return false;
    }
    unlockCorrection(correctionId) {
        const correction = this.storage.corrections.find(c => c.correctionId === correctionId);
        if (correction) {
            correction.accepted = false;
            this.saveStorage();
            return true;
        }
        return false;
    }
    revertCorrection(correctionId) {
        const index = this.storage.corrections.findIndex(c => c.correctionId === correctionId);
        if (index !== -1) {
            const reverted = this.storage.corrections.splice(index, 1)[0];
            this.saveStorage();
            return reverted;
        }
        return null;
    }
    getStats() {
        const scenesWithCorrections = new Set(this.storage.corrections.map(c => c.sceneId)).size;
        return {
            totalCorrections: this.storage.corrections.length,
            totalPreferences: this.storage.preferences.length,
            totalSamples: this.storage.trainingSamples.length,
            scenesWithCorrections
        };
    }
}
