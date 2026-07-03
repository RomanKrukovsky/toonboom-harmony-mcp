import type { CharacterSpec } from '../../schemas/characterSpec.js';
import type { EpisodePlan, AssetRequirement } from '../../schemas/episodePlan.js';
import type { Rig360Spec } from '../../schemas/rig360Spec.js';

/**
 * AssetGenerator — produces a flat list of asset requirements from
 * character specs, scene backgrounds, and rigs. Honest: each asset is
 * marked `missing` until provided/generated externally.
 */
export class AssetGenerator {
  generateRequirements(
    characters: CharacterSpec[],
    episodePlan: EpisodePlan,
    rigSpecs: Rig360Spec[]
  ): AssetRequirement[] {
    const reqs: AssetRequirement[] = [];

    // Characters & their rig + view assets
    for (const c of characters) {
      reqs.push({ type: 'character', name: c.name, status: 'missing', description: `${c.visualStyle}; body: ${c.bodyType}; personality: ${c.personality}` });
      reqs.push({ type: 'rig', name: `rig:${c.name}`, status: 'missing', description: '360 rig per rig360_spec' });

      // Turnaround views
      for (const v of c.requiredViews) {
        reqs.push({ type: 'character', name: `${c.name}_${v}`, status: 'missing', description: `Layered turnaround view: ${v}` });
      }
      for (const expr of c.requiredExpressions) {
        reqs.push({ type: 'character', name: `${c.name}_expr_${expr}`, status: 'missing', description: `Expression: ${expr}` });
      }
      for (const m of c.requiredMouthShapes) {
        reqs.push({ type: 'character', name: `${c.name}_mouth_${m}`, status: 'missing', description: `Mouth shape: ${m} (lipsync)` });
      }
      for (const h of c.requiredHandPoses) {
        reqs.push({ type: 'character', name: `${c.name}_hand_${h}`, status: 'missing', description: `Hand pose: ${h}` });
      }
    }

    // Backgrounds per scene location
    const locations = new Set(episodePlan.scenes.map(s => s.location).filter(Boolean));
    for (const loc of locations) {
      reqs.push({ type: 'background', name: `bg:${loc}`, status: 'missing', description: `Background art: ${loc}` });
    }

    // Palettes
    for (const c of characters) {
      reqs.push({ type: 'palette', name: `palette:${c.name}`, status: 'missing', description: `Color palette for ${c.name}` });
    }
    reqs.push({ type: 'palette', name: 'palette:background_master', status: 'missing', description: 'Master background palette' });

    // FX per scene
    for (const scene of episodePlan.scenes) {
      if (scene.fxNotes) {
        reqs.push({ type: 'fx', name: `fx:${scene.sceneId}`, status: 'missing', description: scene.fxNotes });
      }
    }

    // Rig placeholder assets (from rig360 specs)
    for (const r of rigSpecs) {
      for (const a of r.requiredAssets || []) {
        if (a.status === 'missing') {
          reqs.push({ type: 'rig', name: `${r.characterName}:${a.view}:${a.layer}`, status: 'missing', description: `Rig layer asset for ${r.characterName}` });
        }
      }
    }

    return reqs;
  }
}