import type { CharacterSpec } from '../../schemas/characterSpec.js';
import type { EpisodePlan, AssetRequirement } from '../../schemas/episodePlan.js';
import type { Rig360Spec } from '../../schemas/rig360Spec.js';
/**
 * AssetGenerator — produces a flat list of asset requirements from
 * character specs, scene backgrounds, and rigs. Honest: each asset is
 * marked `missing` until provided/generated externally.
 */
export declare class AssetGenerator {
    generateRequirements(characters: CharacterSpec[], episodePlan: EpisodePlan, rigSpecs: Rig360Spec[]): AssetRequirement[];
}
