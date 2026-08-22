import { type SceneUnderstanding } from '../../schemas/sceneIntelligence.js';
import { type PerformancePlan } from '../../schemas/voicePerformance.js';
import { type DigitalActor } from '../../schemas/digitalActor.js';
import { type KeyPoseSet } from '../../schemas/keyPoseMotion.js';
export declare class KeyPoseGenerator {
    /**
     * Generates key poses for a character based on the scene script and voice performance details.
     */
    generate(scene: SceneUnderstanding, performance: PerformancePlan, actor: DigitalActor): KeyPoseSet;
}
