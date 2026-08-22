import type { KeyPoseSet } from '../../schemas/keyPoseMotion.js';
export interface KeyPoseRankingResult {
    poseId: string;
    rank: number;
    score: number;
    silhouetteQualityScore: number;
    lineOfActionScore: number;
    readabilityStatus: 'high' | 'medium' | 'low';
    recommendations: string[];
}
export declare class KeyPoseRankingEngine {
    rankPoses(keyPoseSet: KeyPoseSet): KeyPoseRankingResult[];
}
