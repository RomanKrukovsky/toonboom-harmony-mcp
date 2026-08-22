import { PIRv1 } from '../../schemas/pirV1.js';
export interface FrameKeyframeTransform {
    frame: number;
    pegId: string;
    position: {
        x: number;
        y: number;
        z: number;
    };
    rotation: {
        angleZ: number;
    };
    scale: {
        x: number;
        y: number;
    };
}
export interface ActingPerformanceCurves {
    totalFrames: number;
    keyframes: FrameKeyframeTransform[];
    primitivesEvaluated: string[];
    maxPeakRecoilAngle: number;
}
export declare class ActingPrimitivesEngine {
    evaluatePerformance(pir: PIRv1): ActingPerformanceCurves;
}
