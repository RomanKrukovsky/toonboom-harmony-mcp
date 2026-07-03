import type { AnalysisResult, OnePromptInput } from '../../schemas/onePrompt.js';
import type { EpisodePlan, ScenePlanRef } from '../../schemas/episodePlan.js';

/**
 * EpisodePlanner — splits the episode into N scenes.
 */
export class EpisodePlanner {
  createEpisodePlan(analysis: AnalysisResult, input: OnePromptInput): EpisodePlan {
    const fps = input.fps ?? 24;
    const totalFrames = Math.round(analysis.durationMinutes * 60 * fps);
    const sceneCount = analysis.estimatedSceneCount;
    const framesPerScene = Math.floor(totalFrames / sceneCount);

    const scenes: ScenePlanRef[] = [];
    for (let i = 0; i < sceneCount; i++) {
      const duration = (i === sceneCount - 1)
        ? totalFrames - i * framesPerScene
        : framesPerScene;
      const start = i * framesPerScene;
      scenes.push({
        sceneId: `SC_${String(i + 1).padStart(3, '0')}`,
        sceneName: this.sceneNameFor(i, analysis),
        durationFrames: duration,
        startFrame: start,
        endFrame: start + duration,
        shotCount: Math.max(2, Math.round(duration / 72)),
        characters: analysis.candidateCharacters.map(c => c.name),
        location: analysis.setting,
        mood: i === 0 ? 'establish' : (i === sceneCount - 1 ? 'climax' : 'rising'),
        cameraNotes: i === 0 ? 'establishing wide' : (i === sceneCount - 1 ? 'dramatic close' : 'medium coverage'),
        fxNotes: i === sceneCount - 1 ? 'portal explosion + smoke' : 'ambient particles'
      });
    }

    return {
      episodeTitle: `${analysis.candidateCharacters[0]?.name || 'Pilot'} v1`,
      episodeNumber: 1,
      durationMinutes: analysis.durationMinutes,
      fps,
      resolution: input.resolution ?? { width: 1920, height: 1080 },
      scriptLogLine: analysis.logLine,
      scenes,
      shots: [],
      assetRequirements: [],
      recurringAssetsNeeded: analysis.candidateCharacters.map(c => `rig:${c.name}`),
      origin: 'planned',
      readiness: 'planned'
    };
  }

  private sceneNameFor(index: number, analysis: AnalysisResult): string {
    const beatNames = ['arrival', 'tour', 'experiment', 'mistake', 'escalation', 'portal', 'climax', 'aftermath', 'reveal', 'resolution'];
    const name = beatNames[index % beatNames.length];
    return `${analysis.candidateCharacters[0]?.name?.split(' ')[0] || 'Hero'}_${name}`;
  }
}