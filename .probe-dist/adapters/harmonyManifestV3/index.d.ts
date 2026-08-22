import { type HarmonyManifestV3, type MotionTrack, type ExposureBlock, type DrawingAsset, type Palette } from '../../schemas/harmonyManifestV3.js';
export interface ManifestInput {
    sceneId: string;
    sceneUnderstanding?: any;
    directorPlans?: any[];
    performancePlans?: any[];
    voiceAnalysis?: any;
    digitalActors?: any[];
    partDecomposition?: any;
    occlusionGraph?: any[];
    keyPoses?: any;
    motionTracks?: MotionTrack[];
    cameraLayout?: any;
    routingPlan?: any;
    gestureEvents?: any[];
    gazeEvents?: any[];
    facialEvents?: any[];
    drawings?: DrawingAsset[];
    palettes?: Palette[];
    exposureBlocks?: ExposureBlock[];
    criticReports?: any[];
    variantTournament?: any;
    tasteScores?: any[];
    selectionHistory?: any[];
    artistCorrections?: any[];
    trainingSignals?: any[];
    iterations?: number[];
}
export declare class HarmonyManifestV3Compiler {
    compile(input: ManifestInput): HarmonyManifestV3;
    private buildRepresentationSegments;
}
