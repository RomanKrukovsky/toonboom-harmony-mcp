import type { EpisodePlan } from '../../schemas/episodePlan.js';
/**
 * ActingPlanner — generates rough acting beats per character per scene.
 * Not final animation. Outputs acting_plan.json for manual or Harmony
 * application (ACTOR §8).
 */
export declare class ActingPlanner {
    generateActingPlans(script: any, characterSpecs: any[], episodePlan: EpisodePlan): any[];
    analyzeDialogue(dialogue: string): {
        pace: 'slow' | 'normal' | 'fast';
        volume: 'whisper' | 'normal' | 'loud' | 'shout';
        emotionHint: string;
    };
    generateEmotionalBeats(scene: any, character: string): any[];
    generatePoseBeats(scene: any): any[];
    generateMicroActions(scene: any): string[];
    generateGesturePlan(scene: any): any[];
    /**
     * Blink timing across the shot.
     *
     * Uses a seeded RNG so the same scene always yields the same plan. With raw
     * Math.random() two runs on identical input produced different blink frames,
     * which makes a plan unreproducible and diffs meaningless — the exact bug
     * DeterministicRng was introduced to prevent.
     */
    generateBlinkPlan(scene: any): any[];
    generateHeadMotionPlan(scene: any): any[];
    generateBodyLanguagePlan(scene: any): any[];
    buildActingPlan(character: string, scene: any, script: any): any;
    estimateReadability(emotionalArc: any[]): number;
}
