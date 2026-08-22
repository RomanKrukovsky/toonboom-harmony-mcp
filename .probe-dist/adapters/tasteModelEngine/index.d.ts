import type { CriticReport } from '../../schemas/animationCritic.js';
import type { ArtistCorrection } from '../../schemas/harmonyManifestV3.js';
export interface PairwiseComparisonInput {
    variantA: {
        variantId: string;
        criticReport: CriticReport;
        correctionsCount: number;
    };
    variantB: {
        variantId: string;
        criticReport: CriticReport;
        correctionsCount: number;
    };
}
export interface PairwiseComparisonResult {
    winnerId: string;
    loserId: string;
    preferenceMargin: number;
    rationale: string;
}
export interface TasteScoreResult {
    variantId: string;
    tasteScore: number;
    overallQuality: number;
    artistAcceptanceProbability: number;
    factors: {
        technicalIntegrity: number;
        principlesAdherence: number;
        correctionOverheadPenalty: number;
    };
}
export declare class TasteModelEngine {
    evaluateTasteScore(variantId: string, criticReport: CriticReport, artistCorrections?: ArtistCorrection[]): TasteScoreResult;
    calculatePairwisePreference(input: PairwiseComparisonInput): PairwiseComparisonResult;
}
