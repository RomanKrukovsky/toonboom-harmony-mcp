import fs from 'fs';
import path from 'path';
import {
  artistCorrectionSchema,
  trainingSampleSchema,
  pairwisePreferenceSchema,
  datasetExportSchema,
  type ArtistCorrection,
  type TrainingSample,
  type PairwisePreference,
  type DatasetExport
} from '../../schemas/artistCorrection.js';
import { config } from '../../config.js';
import { verifyPathAccess } from '../../security.js';

export interface CorrectionStorage {
  corrections: ArtistCorrection[];
  preferences: PairwisePreference[];
  trainingSamples: TrainingSample[];
}

export class ArtistCorrectionEngine {
  private storagePath: string;
  private storage: CorrectionStorage;

  constructor(storagePath?: string) {
    this.storagePath = storagePath || path.join(config.logDir, 'artist_corrections.json');
    this.storage = this.loadStorage();
  }

  private loadStorage(): CorrectionStorage {
    if (fs.existsSync(this.storagePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.storagePath, 'utf-8'));
        return {
          corrections: data.corrections || [],
          preferences: data.preferences || [],
          trainingSamples: data.trainingSamples || []
        };
      } catch (e) {
        console.warn('Failed to load correction storage, starting fresh:', e);
      }
    }
    return { corrections: [], preferences: [], trainingSamples: [] };
  }

  private saveStorage(): void {
    const dir = path.dirname(this.storagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.storagePath, JSON.stringify(this.storage, null, 2), 'utf-8');
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  recordCorrection(correction: Omit<ArtistCorrection, 'correctionId' | 'timestamp'>): ArtistCorrection {
    const fullCorrection: ArtistCorrection = {
      ...correction,
      correctionId: this.generateId('corr'),
      timestamp: new Date().toISOString()
    };

    const validated = artistCorrectionSchema.parse(fullCorrection);
    this.storage.corrections.push(validated);
    this.saveStorage();
    return validated;
  }

  recordPreference(preference: Omit<PairwisePreference, 'preferenceId' | 'timestamp'>): PairwisePreference {
    const fullPreference: PairwisePreference = {
      ...preference,
      preferenceId: this.generateId('pref'),
      timestamp: new Date().toISOString()
    };

    const validated = pairwisePreferenceSchema.parse(fullPreference);
    this.storage.preferences.push(validated);
    this.saveStorage();
    return validated;
  }

  getCorrections(sceneId?: string): ArtistCorrection[] {
    if (sceneId) {
      return this.storage.corrections.filter(c => c.sceneId === sceneId);
    }
    return this.storage.corrections;
  }

  getPreferences(sceneId?: string): PairwisePreference[] {
    if (sceneId) {
      return this.storage.preferences.filter(p => p.sceneId === sceneId);
    }
    return this.storage.preferences;
  }

  getCorrectionHistory(sceneId: string): ArtistCorrection[] {
    return this.storage.corrections
      .filter(c => c.sceneId === sceneId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  generateTrainingSample(
    sceneId: string,
    correctionId: string,
    inputManifest: any,
    correctedManifest: any,
    criticReportBefore?: any,
    criticReportAfter?: any
  ): TrainingSample | null {
    const correction = this.storage.corrections.find(c => c.correctionId === correctionId);
    if (!correction || correction.sceneId !== sceneId) {
      return null;
    }

    const sample: TrainingSample = {
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

  exportDataset(exportConfig: Omit<DatasetExport, 'exportId' | 'timestamp'>): { exportId: string; path: string; count: number } {
    const exportId = this.generateId('export');
    const timestamp = new Date().toISOString();

    let samples: TrainingSample[] = [];
    let preferences: PairwisePreference[] = [];

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
      const lines: string[] = [];
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
    } else if (exportConfig.format === 'json') {
      const output = {
        exportId,
        timestamp,
        samples,
        preferences
      };
      fs.writeFileSync(verifiedOutputPath, JSON.stringify(output, null, 2), 'utf-8');
    }

    const exportRecord: DatasetExport = {
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

  detectChanges(versionBefore: any, versionAfter: any): Record<string, any> {
    const delta: Record<string, any> = {};

    const compare = (before: any, after: any, prefix: string = '') => {
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
        } else if (!(key in after)) {
          delta[newPrefix] = { before: before[key], after: undefined };
        } else {
          compare(before[key], after[key], newPrefix);
        }
      }
    };

    compare(versionBefore, versionAfter);
    return delta;
  }

  previewPropagation(correction: ArtistCorrection, targetManifest: any): any {
    const propagated = JSON.parse(JSON.stringify(targetManifest));

    const applyDelta = (obj: any, delta: Record<string, any>) => {
      for (const [pathKey, change] of Object.entries(delta)) {
        const keys = pathKey.split('.');
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) current[keys[i]] = {};
          current = current[keys[i]];
        }
        if (change.after === undefined) {
          delete current[keys[keys.length - 1]];
        } else {
          current[keys[keys.length - 1]] = change.after;
        }
      }
    };

    applyDelta(propagated, correction.delta);
    return propagated;
  }

  lockCorrection(correctionId: string): boolean {
    const correction = this.storage.corrections.find(c => c.correctionId === correctionId);
    if (correction) {
      correction.accepted = true;
      this.saveStorage();
      return true;
    }
    return false;
  }

  unlockCorrection(correctionId: string): boolean {
    const correction = this.storage.corrections.find(c => c.correctionId === correctionId);
    if (correction) {
      correction.accepted = false;
      this.saveStorage();
      return true;
    }
    return false;
  }

  revertCorrection(correctionId: string): ArtistCorrection | null {
    const index = this.storage.corrections.findIndex(c => c.correctionId === correctionId);
    if (index !== -1) {
      const reverted = this.storage.corrections.splice(index, 1)[0];
      this.saveStorage();
      return reverted;
    }
    return null;
  }

  getStats(): { totalCorrections: number; totalPreferences: number; totalSamples: number; scenesWithCorrections: number } {
    const scenesWithCorrections = new Set(this.storage.corrections.map(c => c.sceneId)).size;
    return {
      totalCorrections: this.storage.corrections.length,
      totalPreferences: this.storage.preferences.length,
      totalSamples: this.storage.trainingSamples.length,
      scenesWithCorrections
    };
  }
}