import type { EpisodePlan, Shot, AssetRequirement } from '../../schemas/episodePlan.js';
import type { ScenePlan } from '../../schemas/scenePlan.js';
import { scenePlanSchema, SCENE_PLAN_VERSION } from '../../schemas/scenePlan.js';

/**
 * EpisodeAssembler — converts an EpisodePlan + camera/FX plans into
 * scene_plan.json files that Harmony Autopilot can consume.
 *
 * Per ACTOR §11: in real mode we would call Harmony. Here we produce
 * structured editable plans (and optionally placeholders).
 */
export class EpisodeAssembler {
  generateRenderPlan(episodePlan: EpisodePlan, cameraPlans: any[], fxPlans: any[]): any {
    return {
      episodeTitle: episodePlan.episodeTitle,
      fps: episodePlan.fps,
      resolution: episodePlan.resolution,
      sceneCount: episodePlan.scenes.length,
      format: 'png_sequence',
      quality: 'preview',
      scenes: episodePlan.scenes.map(s => ({
        sceneId: s.sceneId,
        sceneName: s.sceneName,
        frameRange: [s.startFrame, s.endFrame],
        outputPattern: `${s.sceneId}_preview_%04d.png`,
        camera: cameraPlans.find(c => c.sceneId === s.sceneId)?.cameraMove || 'static',
        fx: fxPlans.find(f => f.sceneId === s.sceneId)?.elements || []
      })),
      origin: 'planned'
    };
  }

  assembleScenePlans(episodePlan: EpisodePlan, characterSpecs: any[], cameraPlans: any[], fxPlans: any[]): ScenePlan[] {
    return episodePlan.scenes.map(scene => this.buildScenePlan(scene, episodePlan, characterSpecs, cameraPlans, fxPlans));
  }

  private buildScenePlan(
    scene: EpisodePlan['scenes'][number],
    episodePlan: EpisodePlan,
    characterSpecs: any[],
    cameraPlans: any[],
    fxPlans: any[]
  ): ScenePlan {
    const sceneShots = (episodePlan.shots || []).filter(s => s.sceneId === scene.sceneId);
    const camera = cameraPlans.find(c => c.sceneId === scene.sceneId);
    const fx = fxPlans.find(f => f.sceneId === scene.sceneId);

    return {
      schemaVersion: SCENE_PLAN_VERSION,
      production: episodePlan.episodeTitle,
      episode: String(episodePlan.episodeNumber ?? 1),
      sceneName: scene.sceneId,
      resolution: episodePlan.resolution,
      fps: episodePlan.fps,
      durationFrames: scene.durationFrames,
      background: {
        file: `bg:${scene.location}`,
        layerName: 'BG',
        position: { x: 0, y: 0, z: -1 },
        scale: 1
      },
      characters: scene.characters.map(name => ({
        name,
        rig: `rig:${name}`,
        positionPreset: 'center',
        startFrame: scene.startFrame,
        endFrame: scene.endFrame,
        actions: sceneShots.filter(s => s.charactersInFrame.includes(name)).map((s, idx) => ({
          type: idx === 0 ? 'enter' : 'act',
          name: s.shotType,
          frames: [s.startFrame ?? 0, s.endFrame ?? scene.durationFrames],
          audio: s.dialogue
        }))
      })),
      camera: {
        preset: camera?.cameraMove || 'static',
        startFrame: scene.startFrame,
        endFrame: scene.endFrame
      },
      effects: (fx?.elements || []).map((e: string) => ({
        type: e,
        target: 'scene',
        frames: [scene.startFrame, scene.endFrame]
      })),
      render: {
        preview: true,
        format: 'png',
        quality: 'preview'
      }
    } as ScenePlan;
  }
}