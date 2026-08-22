import type { EpisodePlan, Shot } from '../../schemas/episodePlan.js';
/**
 * AnimationDirector — generates camera and FX plans per scene.
 * These are editable production plans, not rendered frames.
 */
export declare class AnimationDirector {
    generateCameraPlans(episodePlan: EpisodePlan, shots: Shot[]): any[];
    generateFxPlans(episodePlan: EpisodePlan): any[];
    private elementsFor;
}
