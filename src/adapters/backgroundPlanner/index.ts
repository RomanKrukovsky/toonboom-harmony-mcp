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
export class BackgroundPlanner {
  generatePlans(episodePlan: EpisodePlan): BackgroundPlan[] {
    const locations = this.collectLocations(episodePlan);
    return locations.map(location => this.buildPlan(location, episodePlan));
  }

  private collectLocations(episodePlan: EpisodePlan): string[] {
    const set = new Set<string>();
    for (const scene of episodePlan.scenes) {
      if (scene.location) set.add(scene.location);
    }
    if (set.size === 0) set.add('generic_set');
    return [...set];
  }

  private buildPlan(location: string, episodePlan: EpisodePlan): BackgroundPlan {
    const sceneIds = episodePlan.scenes
      .filter(s => s.location === location)
      .map(s => s.sceneId);

    const layers: BackgroundLayer[] = [
      { name: 'SKY', depth: -100, description: 'Sky/ceiling atmosphere', assetKey: `${location}_sky` },
      { name: 'FAR_BG', depth: -50, description: 'Far background elements', assetKey: `${location}_far_bg` },
      { name: 'MID_BG', depth: -20, description: 'Midground architecture/props', assetKey: `${location}_mid_bg` },
      { name: 'FLOOR', depth: 0, description: 'Floor/ground plane', assetKey: `${location}_floor` },
      { name: 'FOREGROUND', depth: 50, description: 'Foreground details for depth', assetKey: `${location}_foreground` }
    ];

    const requiredAssets = layers.map(l => l.assetKey);

    return {
      location,
      sceneIds,
      description: this.describeLocation(location),
      layers,
      requiredAssets,
      providedAssets: [],
      placeholder: true,
      origin: 'placeholder'
    };
  }

  private describeLocation(location: string): string {
    const lower = location.toLowerCase();
    if (/лаборатор|laborator/.test(lower)) return 'High-tech science lab with workstations, glassware, and glowing equipment.';
    if (/школ|универс|classroom/.test(lower)) return 'University classroom with desks, blackboard, and overhead projector.';
    if (/космо|корабл|ship/.test(lower)) return 'Spaceship interior with control panels and viewport to stars.';
    if (/улиц|город|street/.test(lower)) return 'City street with buildings, signage, and atmospheric perspective.';
    if (/квартир|apartment/.test(lower)) return 'Residential apartment with furniture and warm lighting.';
    return 'Generic production set — customize per episode art direction.';
  }
}
