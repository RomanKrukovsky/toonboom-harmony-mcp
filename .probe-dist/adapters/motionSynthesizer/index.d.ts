import { type SceneUnderstanding } from '../../schemas/sceneIntelligence.js';
import { type DigitalActor } from '../../schemas/digitalActor.js';
import { type KeyPoseSet, type MotionSynthesisPlan } from '../../schemas/keyPoseMotion.js';
export declare class MotionSynthesizer {
    /**
     * Synthesizes motion tracks by interpolating between key poses.
     */
    synthesize(scene: SceneUnderstanding, poses: KeyPoseSet, actor: DigitalActor, tolerance?: number): MotionSynthesisPlan;
    /**
     * Simple tolerance-based key reduction (similar to Ramer-Douglas-Peucker on 1D series).
     */
    private reduceKeyframes;
    /**
     * Interpolate value at frame to calculate verification residual error.
     */
    private getInterpolatedValue;
}
