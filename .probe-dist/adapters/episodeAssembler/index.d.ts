import type { EpisodePlan } from '../../schemas/episodePlan.js';
import type { ScenePlan } from '../../schemas/scenePlan.js';
/**
 * EpisodeAssembler — converts an EpisodePlan + camera/FX plans into
 * scene_plan.json files that Harmony Autopilot can consume.
 *
 * Per ACTOR §11: in real mode we would call Harmony. Here we produce
 * structured editable plans (and optionally placeholders).
 */
export declare class EpisodeAssembler {
    generateRenderPlan(episodePlan: EpisodePlan, cameraPlans: any[], fxPlans: any[]): any;
    assembleScenePlans(episodePlan: EpisodePlan, characterSpecs: any[], cameraPlans: any[], fxPlans: any[], actingPlans?: any[], lipsyncPlans?: any[], backgroundPlans?: any[]): ScenePlan[];
    private buildScenePlan;
}
