import { type ArtistCorrection, type TrainingSample, type PairwisePreference, type DatasetExport } from '../../schemas/artistCorrection.js';
export interface CorrectionStorage {
    corrections: ArtistCorrection[];
    preferences: PairwisePreference[];
    trainingSamples: TrainingSample[];
}
export declare class ArtistCorrectionEngine {
    private storagePath;
    private storage;
    constructor(storagePath?: string);
    private loadStorage;
    private saveStorage;
    private generateId;
    recordCorrection(correction: Omit<ArtistCorrection, 'correctionId' | 'timestamp'>): ArtistCorrection;
    recordPreference(preference: Omit<PairwisePreference, 'preferenceId' | 'timestamp'>): PairwisePreference;
    getCorrections(sceneId?: string): ArtistCorrection[];
    getPreferences(sceneId?: string): PairwisePreference[];
    getCorrectionHistory(sceneId: string): ArtistCorrection[];
    generateTrainingSample(sceneId: string, correctionId: string, inputManifest: any, correctedManifest: any, criticReportBefore?: any, criticReportAfter?: any): TrainingSample | null;
    exportDataset(exportConfig: Omit<DatasetExport, 'exportId' | 'timestamp'>): {
        exportId: string;
        path: string;
        count: number;
    };
    detectChanges(versionBefore: any, versionAfter: any): Record<string, any>;
    previewPropagation(correction: ArtistCorrection, targetManifest: any): any;
    lockCorrection(correctionId: string): boolean;
    unlockCorrection(correctionId: string): boolean;
    revertCorrection(correctionId: string): ArtistCorrection | null;
    getStats(): {
        totalCorrections: number;
        totalPreferences: number;
        totalSamples: number;
        scenesWithCorrections: number;
    };
}
