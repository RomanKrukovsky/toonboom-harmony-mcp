import { type CriticReport } from '../../schemas/animationCritic.js';
export interface CriticInput {
    variantId: string;
    sceneId: string;
    sceneUnderstanding?: any;
    cameraLayout?: any;
    keyPoses?: any;
    motionTracks?: any;
    partDecomposition?: any;
    routingPlan?: any;
    voiceAnalysis?: any;
    performancePlan?: any;
}
export declare class AnimationCritic {
    /**
     * Run all critic checks on a variant
     */
    critique(input: CriticInput): CriticReport;
    /**
     * Technical checks (Master Prompt §12)
     */
    private runTechnicalChecks;
    /**
     * Artistic proxy checks (Master Prompt §12)
     */
    private runArtisticChecks;
    private checkMissingDrawings;
    private checkBrokenExposures;
    private checkHoles;
    private checkLayerOrder;
    private checkPaletteConsistency;
    private checkDetachedParts;
    private checkBrokenPivots;
    private checkInvalidDeformers;
    private checkExcessiveKeys;
    private checkUnstableContours;
    private checkFrozenMotion;
    private checkLostMotionEvents;
    private checkTimingMismatch;
    private checkPoseReadability;
    private checkSilhouetteClarity;
    private checkStaging;
    private checkEmotionalClarity;
    private checkGestureMotivation;
    private checkTiming;
    private checkAnticipation;
    private checkFollowThrough;
    private checkOveracting;
    private checkUnderacting;
    private checkDeadMotion;
    private checkMechanicalMotion;
    private checkRepetitiveGestures;
    private checkGazeDirection;
    private checkReactionTiming;
    private checkCameraMotivation;
    private createCheck;
    private calculateAverageScore;
    private generateRecommendations;
}
