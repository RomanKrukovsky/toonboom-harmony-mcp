/**
 * FxPlanner — derives a concrete Harmony effect list from a scene description.
 *
 * The previous implementation was eight lines that ignored its input entirely
 * and always answered `{ status: "success", fxList: [] }`. A caller could not
 * tell "no effects are needed" from "nothing was planned", and the scene text
 * was never read.
 *
 * This version is a real keyword/mood planner: it reads the prompt, setting,
 * mood and time of day out of a scene plan and maps them onto actual Harmony
 * node types with parameters. It is heuristic — there is no LLM here (see
 * PromptParser's note on the same constraint) — but it is deterministic and
 * driven by the input, so identical scenes plan identically and different
 * scenes plan differently.
 */
/** Harmony node types this planner is allowed to emit. */
export type HarmonyFxNodeType = 'Blur-Radial' | 'Blur-Directional' | 'Glow' | 'Tone' | 'Highlight' | 'Shadow' | 'Colour-Card' | 'Colour-Scale' | 'Transparency' | 'Particle-Baker' | 'Particle-Visualizer' | 'Turbulence' | 'Focus-Apply';
export interface PlannedFx {
    /** Stable, scene-scoped identifier — also the Harmony node name suffix. */
    fxId: string;
    /** Short semantic label, e.g. `smoke`, `sparks`, `glow`. */
    kind: string;
    nodeType: HarmonyFxNodeType;
    /** Harmony attribute values for the node. */
    parameters: Record<string, number | string | boolean>;
    /**
     * Where the effect sits relative to the artwork it modifies:
     *   `pre_composite`  — between the drawing and the Composite,
     *   `post_composite` — after the Composite, affecting the whole frame.
     */
    stage: 'pre_composite' | 'post_composite';
    /** Why the planner chose this — the trigger that matched. */
    reason: string;
    /** Whether a particle system (Baker + Visualizer pair) is required. */
    requiresParticleSystem: boolean;
}
export interface FxPlanResult {
    status: 'success' | 'partial_success';
    sceneId: string;
    fxList: PlannedFx[];
    /** Effects requested by keyword that this planner has no node mapping for. */
    unmapped: string[];
    /** Signals that drove the plan, so the result is explainable. */
    derivedFrom: {
        keywords: string[];
        mood: string;
        timeOfDay: string;
        setting: string;
    };
    warnings: string[];
}
export declare class FxPlanner {
    /**
     * Plan effects for a scene.
     *
     * Accepts either a scene-plan object or a bare prompt string. Returns the
     * effects the description actually justifies, plus the signals used, so a
     * reviewer can see why each node is there.
     */
    planFx(scenePlan: any): Promise<FxPlanResult>;
    /** Synchronous core: the planning itself does no I/O. */
    planFxSync(scenePlan: any): FxPlanResult;
    /**
     * Mood heuristic, kept aligned with PromptParser.extractMood so a scene
     * parsed there and planned here agree on the mood label.
     */
    private inferMood;
    /** Time-of-day heuristic, same vocabulary as PromptParser.extractTimeOfDay. */
    private inferTimeOfDay;
}
