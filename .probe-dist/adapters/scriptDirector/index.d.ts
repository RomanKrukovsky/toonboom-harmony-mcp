import { type DirectorPlan, type DirectorStrategy, type DirectorVariantSet, type ShotPlan, type SceneUnderstanding } from '../../schemas/sceneIntelligence.js';
/**
 * ScriptDirector — Rule-based AI Director (Master Prompt §2).
 *
 * Takes a previously-computed SceneUnderstanding and produces ≥3 distinct
 * director plans differing by readable strategy:
 *   - restrained_dialogue
 *   - commercial_dynamic
 *   - dramatic_closeup
 *   - comedic_timing
 *   - anime_limited
 *   - theatrical_staging
 *   - single_take
 *
 * Each plan is fully Zod-validated and produces shot decomposition, blocking,
 * attention plan and edit decisions. The default variant count is 3 but the
 * ScriptDirector exposes `generateVariants(count)` so downstream tools can
 * request more.
 *
 * The director does NOT edit Harmony — it produces the planning layer that
 * later passes through KeyPoseGenerator → MotionSynthesizer → Critic.
 *
 * Example shot decomposition from the demo beats:
 *   beat_01 (Masha, controlled_anger, asks)   → OTS → Masha close → reaction shot Ivan
 *   beat_02 (Ivan, fear, denies               → Ivan close → silent_listen Masha
 *   beat_03 (Masha, surprise, points_to_door  → wide → push-in → holds on door
 */
export declare const ALL_STRATEGIES: DirectorStrategy[];
export interface DirectorStrategyProfile {
    strategy: DirectorStrategy;
    description: string;
    defaultFraming: ShotPlan['framing'];
    defaultCameraMove: ShotPlan['cameraMove'];
    editingPace: 'slow' | 'medium' | 'fast';
    reactionShotRatio: number;
    pushInOnClimax: boolean;
    pauseBias: number;
    blockingKeysByImportance: boolean;
    custom?: string;
}
export declare class ScriptDirector {
    /** Default demo strategies — 3 readable variants per Master Prompt §2. */
    static defaultStrategies(): DirectorStrategy[];
    /** Full cast of available strategies exposed for downstream selectors. */
    static allStrategies(): DirectorStrategy[];
    /** Generate ≥3 variants by distinct strategies. Default 3 lines up with Master Prompt §2.
     *  A `seed` makes the entire variant set reproducible (used by demo + audit tests). */
    generateVariants(scene: SceneUnderstanding, count?: number, requested?: DirectorStrategy[], seed?: number): DirectorVariantSet;
    /** Build a single validated DirectorPlan for one strategy. Optional `seed`
     *  makes the plan reproducible — used by demo + regression tests. */
    generate(scene: SceneUnderstanding, strategy: DirectorStrategy, opts?: {
        seed?: number;
    }): DirectorPlan;
}
/** DeterministicRng — xorshift32 PRNG with a stable seed so that a given scene
 *  + strategy always produces an identical plan. Avoids the non-determinism bug
 *  flagged in the integration audit (Math.random() produced different shot counts
 *  across demo runs). */
export declare class DeterministicRng {
    private state;
    constructor(seed?: number);
    /** Returns a float in [0, 1) — same range as Math.random(). */
    next(): number;
}
