import { type PartDecomposition } from '../../schemas/partDecomposition.js';
export interface DecompositionInput {
    characterId: string;
    frameCount: number;
    fps?: number;
    bodyType?: 'humanoid' | 'quadruped' | 'creature' | 'object' | 'unknown';
    frameRegions?: FrameRegion[];
    motionHints?: MotionHint[];
}
export interface FrameRegion {
    frame: number;
    regions: {
        label: string;
        x: number;
        y: number;
        width: number;
        height: number;
        confidence?: number;
    }[];
}
export interface MotionHint {
    partId: string;
    motionType: 'rigid' | 'articulated' | 'deformable' | 'static';
    confidence: number;
}
export declare class CharacterPartDecomposer {
    decompose(input: DecompositionInput): PartDecomposition;
    private buildGenericParts;
}
