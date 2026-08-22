import type { SceneUnderstanding } from '../../schemas/sceneIntelligence.js';
import { type VoiceAnalysis, type PerformancePlan, type PerformanceStyle, type PerformanceVariantSet } from '../../schemas/voicePerformance.js';
export declare const ALL_PERFORMANCE_STYLES: PerformanceStyle[];
export declare class PerformanceGenerator {
    static defaultStyles(): PerformanceStyle[];
    generate(scene: SceneUnderstanding, voice: VoiceAnalysis, characterId: string, style: PerformanceStyle): PerformancePlan;
    generateVariants(scene: SceneUnderstanding, voice: VoiceAnalysis, characterId: string, count?: number, styles?: PerformanceStyle[]): PerformanceVariantSet;
    mix(base: PerformancePlan, gestureTiming: PerformancePlan, finalPose: PerformancePlan): PerformancePlan;
    private addBeatEvents;
}
