import type { CriticReport } from '../../schemas/animationCritic.js';
import type { ArtistCorrection } from '../../schemas/harmonyManifestV3.js';

export interface PairwiseComparisonInput {
  variantA: { variantId: string; criticReport: CriticReport; correctionsCount: number };
  variantB: { variantId: string; criticReport: CriticReport; correctionsCount: number };
}

export interface PairwiseComparisonResult {
  winnerId: string;
  loserId: string;
  preferenceMargin: number;
  rationale: string;
}

export interface TasteScoreResult {
  variantId: string;
  tasteScore: number; // 0.0 to 1.0
  overallQuality: number;
  artistAcceptanceProbability: number;
  factors: {
    technicalIntegrity: number;
    principlesAdherence: number;
    correctionOverheadPenalty: number;
  };
}

export class TasteModelEngine {
  evaluateTasteScore(variantId: string, criticReport: CriticReport, artistCorrections: ArtistCorrection[] = []): TasteScoreResult {
    const technical = criticReport.technicalScore ?? 0.8;
    const principles = criticReport.artisticScore ?? 0.85;

    // Fewer artist corrections required -> higher taste score
    const correctionPenalty = Math.min(0.3, artistCorrections.length * 0.05);

    const overallQuality = parseFloat((technical * 0.4 + principles * 0.6).toFixed(3));
    const tasteScore = parseFloat(Math.max(0.0, Math.min(1.0, overallQuality - correctionPenalty)).toFixed(3));
    const artistAcceptanceProbability = parseFloat(Math.max(0.0, Math.min(1.0, tasteScore * 1.1)).toFixed(3));

    return {
      variantId,
      tasteScore,
      overallQuality,
      artistAcceptanceProbability,
      factors: {
        technicalIntegrity: technical,
        principlesAdherence: principles,
        correctionOverheadPenalty: correctionPenalty
      }
    };
  }

  calculatePairwisePreference(input: PairwiseComparisonInput): PairwiseComparisonResult {
    const scoreA = this.evaluateTasteScore(input.variantA.variantId, input.variantA.criticReport, new Array(input.variantA.correctionsCount)).tasteScore;
    const scoreB = this.evaluateTasteScore(input.variantB.variantId, input.variantB.criticReport, new Array(input.variantB.correctionsCount)).tasteScore;

    const winnerId = scoreA >= scoreB ? input.variantA.variantId : input.variantB.variantId;
    const loserId = scoreA >= scoreB ? input.variantB.variantId : input.variantA.variantId;
    const preferenceMargin = parseFloat(Math.abs(scoreA - scoreB).toFixed(3));

    return {
      winnerId,
      loserId,
      preferenceMargin,
      rationale: scoreA >= scoreB
        ? `Variant ${input.variantA.variantId} preferred due to higher principles adherence and lower correction overhead`
        : `Variant ${input.variantB.variantId} preferred due to higher principles adherence and lower correction overhead`
    };
  }
}
