import type { EpisodePlan, Shot } from '../../schemas/episodePlan.js';

/**
 * AnimationDirector — generates camera and FX plans per scene.
 * These are editable production plans, not rendered frames.
 */
export class AnimationDirector {
  generateCameraPlans(episodePlan: EpisodePlan, shots: Shot[]): any[] {
    const plans = [];
    for (const scene of episodePlan.scenes) {
      const sceneShots = shots.filter(s => s.sceneId === scene.sceneId);
      plans.push({
        sceneId: scene.sceneId,
        sceneName: scene.sceneName,
        cameraMove: scene.cameraNotes || 'static medium coverage',
        shotCount: sceneShots.length,
        moves: sceneShots.map((s, i) => ({
          shotId: s.shotId,
          framing: s.framing,
          startFrame: s.startFrame,
          endFrame: s.endFrame,
          moveType: s.cameraMove || 'static',
          intensity: i === 0 ? 'wide' : (i === sceneShots.length - 1 ? 'intimate' : 'medium'),
          notes: s.description
        })),
        origin: 'planned'
      });
    }
    return plans;
  }

  generateFxPlans(episodePlan: EpisodePlan): any[] {
    return episodePlan.scenes.map(scene => ({
      sceneId: scene.sceneId,
      sceneName: scene.sceneName,
      fx: scene.fxNotes || 'none',
      elements: this.elementsFor(scene.fxNotes),
      origin: 'planned'
    }));
  }

  private elementsFor(fxNotes?: string): string[] {
    if (!fxNotes) return [];
    const out: string[] = [];
    if (/explos/i.test(fxNotes)) out.push('explosion flash','smoke');
    if (/portal|wormhole/i.test(fxNotes)) out.push('portal vortex','glow rings');
    if (/particl/i.test(fxNotes)) out.push('dust motes','sparkles');
    if (/smoke/i.test(fxNotes)) out.push('smoke plume');
    if (out.length === 0) out.push('ambient glow');
    return out;
  }
}