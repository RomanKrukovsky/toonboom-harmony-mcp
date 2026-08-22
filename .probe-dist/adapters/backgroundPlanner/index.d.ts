import type { EpisodePlan } from '../../schemas/episodePlan.js';
export interface BackgroundPlan {
    location: string;
    sceneIds: string[];
    description: string;
    layers: BackgroundLayer[];
    requiredAssets: string[];
    providedAssets: string[];
    placeholder: boolean;
    origin: 'placeholder' | 'planned' | 'requires_external_model';
}
export interface BackgroundLayer {
    name: string;
    depth: number;
    description: string;
    assetKey: string;
}
/**
 * BackgroundPlanner — generates background scene requirements and
 * placeholder layer plans for each unique location in the episode.
 *
 * Per ACTOR §2.10: without real painted backgrounds, it produces a
 * full brief and placeholder structure for external generation.
 */
export declare class BackgroundPlanner {
    generatePlans(episodePlan: EpisodePlan): BackgroundPlan[];
    private collectLocations;
    private buildPlan;
    private describeLocation;
}
