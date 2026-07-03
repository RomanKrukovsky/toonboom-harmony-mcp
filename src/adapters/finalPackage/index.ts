/**
 * finalPackage — bundles everything produced by One-Prompt Engine
 * into a single production package matching the ACTOR.MD layout.
 *
 * Layout:
 *   series_bible.json
 *   episode_plan.json
 *   script.json
 *   shot_list.json
 *   asset_requirements.json
 *   character_design_specs.json
 *   rig_requirements.json
 *   rig360_plan.json
 *   rig360_specs.json
 *   scene_plans/
 *   animation_blocking/
 *   camera_plans/
 *   lipsync_plans/
 *   fx_plans/
 *   render_plan.json
 *   review_reports/
 *   final_package/
 *   episode_package.json
 *   MANIFEST.json
 */

import fs from 'fs';
import path from 'path';

export interface PackageInput {
  prompt: string;
  mode: string;
  analysis: any;
  seriesBible: any;
  episodePlan: any;
  shotList: any[];
  characterSpecs: any[];
  rig360Specs: any[];
  assetRequirements: any[];
  actingPlans: any[];
  lipsyncPlans?: any[];
  cameraPlans: any[];
  fxPlans: any[];
  backgroundPlans?: any[];
  scenePlans?: any[];
  renderPlan: any;
  reviewReports: any[];
}

export interface PackageOutput {
  packagePath: string;
  manifestPath: string;
  artifacts: Record<string, string>;
  summary: any;
}

export class FinalPackager {
  assemble(input: PackageInput, outputDir?: string): PackageOutput {
    const root = outputDir || this.defaultOutputDir();
    if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });

    const artifacts: Record<string, string> = {};

    // Top-level production documents
    artifacts['series_bible.json'] = this.write(path.join(root, 'series_bible.json'), input.seriesBible);
    artifacts['episode_plan.json'] = this.write(path.join(root, 'episode_plan.json'), input.episodePlan);
    artifacts['script.json'] = this.write(path.join(root, 'script.json'), this.buildScriptJson(input));
    artifacts['shot_list.json'] = this.write(path.join(root, 'shot_list.json'), input.shotList);
    artifacts['asset_requirements.json'] = this.write(path.join(root, 'asset_requirements.json'), input.assetRequirements);
    artifacts['character_design_specs.json'] = this.write(path.join(root, 'character_design_specs.json'), input.characterSpecs);
    artifacts['rig_requirements.json'] = this.write(path.join(root, 'rig_requirements.json'), this.buildRigRequirements(input));
    artifacts['rig360_plan.json'] = this.write(path.join(root, 'rig360_plan.json'), this.buildRig360Plan(input));
    artifacts['rig360_specs.json'] = this.write(path.join(root, 'rig360_specs.json'), input.rig360Specs);
    artifacts['render_plan.json'] = this.write(path.join(root, 'render_plan.json'), input.renderPlan);

    // Scene plans
    const scenePlansDir = path.join(root, 'scene_plans');
    if (input.scenePlans?.length) {
      for (const sp of input.scenePlans) {
        const fileName = `${sp.sceneName || sp.sceneId || 'scene'}.scene_plan.json`;
        artifacts[`scene_plans/${fileName}`] = this.write(path.join(scenePlansDir, fileName), sp);
      }
    }

    // Animation blocking (acting plans)
    const animationBlockingDir = path.join(root, 'animation_blocking');
    for (let i = 0; i < input.actingPlans.length; i++) {
      const plan = input.actingPlans[i];
      const fileName = `${plan.scene || plan.character || i}.acting_plan.json`;
      artifacts[`animation_blocking/${fileName}`] = this.write(path.join(animationBlockingDir, fileName), plan);
    }

    // Camera plans
    const cameraPlansDir = path.join(root, 'camera_plans');
    for (let i = 0; i < input.cameraPlans.length; i++) {
      const plan = input.cameraPlans[i];
      const fileName = `${plan.sceneId || i}.camera_plan.json`;
      artifacts[`camera_plans/${fileName}`] = this.write(path.join(cameraPlansDir, fileName), plan);
    }

    // Lipsync plans
    const lipsyncPlansDir = path.join(root, 'lipsync_plans');
    for (const plan of input.lipsyncPlans || []) {
      const fileName = `${plan.sceneId || 'scene'}.lipsync_plan.json`;
      artifacts[`lipsync_plans/${fileName}`] = this.write(path.join(lipsyncPlansDir, fileName), plan);
    }

    // FX plans
    const fxPlansDir = path.join(root, 'fx_plans');
    for (let i = 0; i < input.fxPlans.length; i++) {
      const plan = input.fxPlans[i];
      const fileName = `${plan.sceneId || i}.fx_plan.json`;
      artifacts[`fx_plans/${fileName}`] = this.write(path.join(fxPlansDir, fileName), plan);
    }

    // Background plans
    const backgroundPlansDir = path.join(root, 'background_plans');
    for (const plan of input.backgroundPlans || []) {
      const fileName = `${plan.location.replace(/\s+/g, '_').toLowerCase()}.background_plan.json`;
      artifacts[`background_plans/${fileName}`] = this.write(path.join(backgroundPlansDir, fileName), plan);
    }

    // Review reports
    const reviewReportsDir = path.join(root, 'review_reports');
    for (let i = 0; i < input.reviewReports.length; i++) {
      const report = input.reviewReports[i];
      const fileName = `${report.type || i}.review_report.json`;
      artifacts[`review_reports/${fileName}`] = this.write(path.join(reviewReportsDir, fileName), report);
    }

    // Final package summary
    const finalPackageDir = path.join(root, 'final_package');
    const summary = {
      prompt: input.prompt,
      mode: input.mode,
      packageCreatedAt: new Date().toISOString(),
      sceneCount: input.episodePlan.scenes.length,
      shotCount: input.shotList.length,
      characterCount: input.characterSpecs.length,
      placeholderRigCount: input.rig360Specs.filter((r: any) => r.placeholderRigCreated && !r.realRigCreated).length,
      realRigCount: input.rig360Specs.filter((r: any) => r.realRigCreated).length,
      assetRequirementsCount: input.assetRequirements.length,
      lipsyncPlansCount: (input.lipsyncPlans || []).length,
      totalScore: this.calculateScore(input.reviewReports),
      truth: this.honestSummary(input),
      whatWasReal: this.summarizeWhatWasReal(input)
    };
    artifacts['final_package/summary.json'] = this.write(path.join(finalPackageDir, 'summary.json'), summary);
    artifacts['episode_package.json'] = this.write(path.join(root, 'episode_package.json'), summary);

    const manifestPath = path.join(root, 'MANIFEST.json');
    artifacts['MANIFEST.json'] = this.write(manifestPath, artifacts);

    return { packagePath: root, manifestPath, artifacts, summary };
  }

  private defaultOutputDir(): string {
    const base = process.cwd();
    return path.join(base, 'output', `oneprompt_${Date.now()}`);
  }

  private write(filePath: string, data: any): string {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return filePath;
  }

  private buildScriptJson(input: PackageInput): any {
    return {
      episodeTitle: input.episodePlan.episodeTitle,
      logLine: input.episodePlan.scriptLogLine,
      scenes: input.episodePlan.scenes.map((s: any) => ({
        sceneId: s.sceneId,
        sceneName: s.sceneName,
        location: s.location,
        mood: s.mood,
        characters: s.characters,
        durationFrames: s.durationFrames,
        beats: [
          { beat: 'establish', frames: [0, Math.round(s.durationFrames * 0.2)] },
          { beat: 'setup', frames: [Math.round(s.durationFrames * 0.2), Math.round(s.durationFrames * 0.5)] },
          { beat: 'turn', frames: [Math.round(s.durationFrames * 0.5), Math.round(s.durationFrames * 0.85)] },
          { beat: 'punchline', frames: [Math.round(s.durationFrames * 0.85), s.durationFrames] }
        ]
      })),
      origin: 'planned'
    };
  }

  private buildRigRequirements(input: PackageInput): any {
    return {
      characters: input.characterSpecs.map((c: any) => ({
        name: c.name,
        requiredViews: c.requiredViews,
        requiredExpressions: c.requiredExpressions,
        requiredMouthShapes: c.requiredMouthShapes,
        requiredHandPoses: c.requiredHandPoses,
        layerPlan: c.layerPlan
      })),
      rigs: input.rig360Specs.map((r: any) => ({
        characterName: r.characterName,
        realRigCreated: r.realRigCreated,
        placeholderRigCreated: r.placeholderRigCreated,
        missingAssets: r.missingAssets,
        nextBestAction: r.nextBestAction
      })),
      origin: 'planned'
    };
  }

  private buildRig360Plan(input: PackageInput): any {
    return {
      characters: input.rig360Specs.map((r: any) => ({
        characterName: r.characterName,
        masterControllers: r.masterControllers,
        deformers: r.deformers,
        faceControls: r.faceControls,
        bodyTurn: r.bodyTurn,
        missingAssets: r.missingAssets,
        nextBestAction: r.nextBestAction
      })),
      origin: 'planned'
    };
  }

  private summarizeWhatWasReal(input: PackageInput): any[] {
    const logs: any[] = [];
    logs.push({ module: 'seriesPlanner', classification: input.seriesBible.origin || 'planned' });
    logs.push({ module: 'episodePlanner', classification: input.episodePlan.origin || 'planned' });
    logs.push({ module: 'shotPlanner', classification: 'planned' });
    logs.push({
      module: 'characterDesigner',
      classification: input.characterSpecs.some((c: any) => c.assetBackend === 'missing') ? 'requires_external_model' : 'generated'
    });
    logs.push({
      module: 'rig360Synthesizer',
      classification: input.rig360Specs.some((r: any) => !r.realRigCreated && r.placeholderRigCreated) ? 'placeholder' : 'planned'
    });
    logs.push({ module: 'assetGenerator', classification: 'planned' });
    logs.push({ module: 'actingPlanner', classification: 'planned' });
    logs.push({
      module: 'lipsyncPlanner',
      classification: (input.lipsyncPlans || []).some((p: any) => p.origin === 'placeholder') ? 'placeholder' : 'planned'
    });
    logs.push({ module: 'animationDirector', classification: 'planned' });
    logs.push({ module: 'qualityDirector', classification: 'planned' });
    logs.push({ module: 'episodeAssembler', classification: input.mode === 'real' ? 'assembled' : 'planned' });
    logs.push({ module: 'finalPackager', classification: 'assembled' });
    return logs;
  }

  private calculateScore(reports: any[]): number {
    const sceneReports = reports.filter(r => r.type === 'scene');
    if (sceneReports.length === 0) return 0;
    return Math.round(sceneReports.reduce((acc, r) => acc + r.sceneScore, 0) / sceneReports.length);
  }

  private honestSummary(input: PackageInput): string {
    const placeholders = input.rig360Specs.filter((r: any) => r.placeholderRigCreated && !r.realRigCreated).length;
    const lipsyncPlaceholder = (input.lipsyncPlans || []).some((p: any) => p.origin === 'placeholder');
    const base = `Moonshot production package generated. ${placeholders} placeholder rig(s).`;
    const audioNote = lipsyncPlaceholder ? ' Lipsync is placeholder — recorded dialogue audio required.' : '';
    if (input.mode === 'simulation' || input.mode === 'moonshot') {
      return `${base}${audioNote} Real Harmony execution requires assets and installed Toon Boom Harmony.`;
    }
    if (input.mode === 'hybrid') {
      return `${base}${audioNote} Real Harmony assembly attempted where assets exist.`;
    }
    return `${base}${audioNote} Executed against Harmony installation.`;
  }
}
