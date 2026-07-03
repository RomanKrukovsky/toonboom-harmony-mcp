import type { EpisodePlan, Shot } from '../../schemas/episodePlan.js';

/**
 * QualityDirector — AI production reviewer that scores scenes/episode
 * and emits fix lists (ACTOR §10).
 */
export class QualityDirector {
  reviewEpisode(data: {
    episodePlan: EpisodePlan;
    shotList: Shot[];
    characterSpecs: any[];
    rig360Specs: any[];
    actingPlans: any[];
    cameraPlans: any[];
    fxPlans: any[];
  }): any[] {
    const reports = [];
    for (const scene of data.episodePlan.scenes) {
      reports.push(this.reviewScene(scene, data));
    }
    reports.push(this.reviewEpisodePlan(data.episodePlan));
    reports.push(this.reviewRigs(data.rig360Specs));
    reports.push(this.reviewActing(data.actingPlans));
    return reports;
  }

  reviewScene(scene: any, data: any): any {
    const issues: string[] = [];
    const score = this.scoreScene(scene, data);
    if (!scene.location) issues.push('Missing location — composition unclear');
    if (scene.characters.length === 0) issues.push('No characters listed in scene');
    if (scene.durationFrames < 24) issues.push('Scene extremely short — check timing');
    if (score.composition < 60) issues.push('Composition score low — consider establishing shot');
    if (score.acting < 60) issues.push('Acting readability low — add gesture/emphasis');
    if (score.continuity < 60) issues.push('Continuity risk — verify character positions');

    return {
      type: 'scene',
      target: scene.sceneId,
      sceneScore: score.total,
      categories: score,
      issues,
      fixes: issues.map(i => `[${i}]`),
      origin: 'planned'
    };
  }

  reviewEpisodePlan(episodePlan: EpisodePlan): any {
    const totalFrames = episodePlan.scenes.reduce((acc, s) => acc + s.durationFrames, 0);
    const expected = episodePlan.durationMinutes * 60 * episodePlan.fps;
    return {
      type: 'episode_plan',
      target: episodePlan.episodeTitle,
      sceneCount: episodePlan.scenes.length,
      totalFrames,
      expectedFrames: expected,
      frameDrift: Math.abs(totalFrames - expected),
      assetCount: (episodePlan.assetRequirements || []).length,
      issues: totalFrames !== expected ? ['Episode frame total does not match target duration'] : [],
      origin: 'planned'
    };
  }

  reviewRigs(rig360Specs: any[]): any {
    const issues: string[] = [];
    let placeholderCount = 0;
    for (const r of rig360Specs) {
      if (!r.realRigCreated && r.placeholderRigCreated) {
        placeholderCount++;
        issues.push(`${r.characterName}: placeholder rig — needs ${(r.missingAssets || []).length} assets`);
      }
    }
    return {
      type: 'rigs',
      target: 'all characters',
      placeholderCount,
      realRigCount: rig360Specs.length - placeholderCount,
      issues,
      origin: 'planned'
    };
  }

  reviewActing(actingPlans: any[]): any {
    const scores = actingPlans.map(a => a.readabilityScore || 0);
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return {
      type: 'acting',
      target: `${actingPlans.length} plans`,
      averageReadability: Math.round(avg),
      minReadability: scores.length ? Math.min(...scores) : 0,
      issues: avg < 70 ? ['Average acting readability below 70 — add clearer pose beats'] : [],
      origin: 'planned'
    };
  }

  scoreScene(scene: any, data: any): { total: number; composition: number; acting: number; timing: number; technical: number; continuity: number } {
    const cameraNotes = scene.cameraNotes || '';
    const hasDynamicCamera = /dolly|truck|pan|tilt|zoom|crane|push/.test(cameraNotes.toLowerCase());
    const composition = hasDynamicCamera ? 90 : (scene.cameraNotes ? 80 : 55);
    const acting = scene.mood && scene.mood !== 'generic' ? 85 : 50;
    const timing = scene.durationFrames >= 60 ? 90 : (scene.durationFrames > 24 ? 80 : 45);
    const technical = 90;
    const continuity = scene.characters.length > 1 ? 85 : (scene.characters.length > 0 ? 75 : 50);
    const total = Math.round((composition + acting + timing + technical + continuity) / 5);
    return { total, composition, acting, timing, technical, continuity };
  }

  scoreEpisode(reports: any[]): number {
    const sceneReports = reports.filter(r => r.type === 'scene');
    if (sceneReports.length === 0) return 0;
    const total = sceneReports.reduce((acc, r) => acc + r.sceneScore, 0);
    return Math.round(total / sceneReports.length);
  }

  generateFixList(reports: any[]): string[] {
    const fixes: string[] = [];
    for (const r of reports) {
      if (r.fixes) fixes.push(...r.fixes);
      if (r.issues) fixes.push(...r.issues.map((i: string) => `[${r.type}/${r.target}] ${i}`));
    }
    return fixes;
  }
}