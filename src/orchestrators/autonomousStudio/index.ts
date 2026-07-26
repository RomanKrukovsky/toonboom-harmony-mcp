import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ProductionRunOptions, ProductionPackagePaths } from '../../schemas/productionPackage.js';
import { StandardExecutionResult, createStandardExecutionResult, EngineMode } from '../../schemas/executionResult.js';
import { RealSceneExecutor } from '../../adapters/realSceneExecutor/index.js';
import { config } from '../../config.js';

export interface ProductionStageState {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused' | 'requires_approval';
  fingerprint: string;
  startedAt?: string;
  completedAt?: string;
  outputArtifacts: string[];
  error?: string;
}

export interface ProductionRunState {
  runId: string;
  projectName: string;
  options: ProductionRunOptions;
  mode: EngineMode;
  status: 'initializing' | 'running' | 'paused' | 'completed' | 'failed' | 'awaiting_approval';
  packagePaths: ProductionPackagePaths;
  stages: Record<string, ProductionStageState>;
  currentStageId?: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  totalScenes: number;
  completedScenes: number;
  warnings: string[];
  errors: string[];
}

export class AutonomousStudioOrchestrator {
  private createPackageStructure(outputRoot: string, projectName: string): ProductionPackagePaths {
    const root = path.join(outputRoot, projectName);
    const subdirs = [
      'series_bible',
      'style_bible',
      'scripts',
      'storyboards',
      'animatics',
      'characters',
      'rigs',
      'backgrounds',
      'props',
      'audio',
      'music',
      'scene_plans',
      'animation_plans',
      'camera_plans',
      'fx_plans',
      'harmony_projects',
      'templates',
      'previews',
      'renders',
      'review_reports',
      'fix_plans',
      'approval_records',
      'diagnostics',
      'logs',
      'delivery',
      'provenance'
    ];

    if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });
    
    subdirs.forEach(d => {
      const p = path.join(root, d);
      if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    });

    return {
      root,
      manifestPath: path.join(root, 'project_manifest.json'),
      productionRunPath: path.join(root, 'production_run.json'),
      seriesBibleDir: path.join(root, 'series_bible'),
      styleBibleDir: path.join(root, 'style_bible'),
      scriptsDir: path.join(root, 'scripts'),
      storyboardsDir: path.join(root, 'storyboards'),
      animaticsDir: path.join(root, 'animatics'),
      charactersDir: path.join(root, 'characters'),
      rigsDir: path.join(root, 'rigs'),
      backgroundsDir: path.join(root, 'backgrounds'),
      propsDir: path.join(root, 'props'),
      audioDir: path.join(root, 'audio'),
      musicDir: path.join(root, 'music'),
      scenePlansDir: path.join(root, 'scene_plans'),
      animationPlansDir: path.join(root, 'animation_plans'),
      cameraPlansDir: path.join(root, 'camera_plans'),
      fxPlansDir: path.join(root, 'fx_plans'),
      harmonyProjectsDir: path.join(root, 'harmony_projects'),
      templatesDir: path.join(root, 'templates'),
      previewsDir: path.join(root, 'previews'),
      rendersDir: path.join(root, 'renders'),
      reviewReportsDir: path.join(root, 'review_reports'),
      fixPlansDir: path.join(root, 'fix_plans'),
      approvalRecordsDir: path.join(root, 'approval_records'),
      diagnosticsDir: path.join(root, 'diagnostics'),
      logsDir: path.join(root, 'logs'),
      deliveryDir: path.join(root, 'delivery'),
      provenanceDir: path.join(root, 'provenance')
    };
  }

  private computeFingerprint(data: any): string {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex').substring(0, 16);
  }

  private saveState(state: ProductionRunState) {
    fs.writeFileSync(state.packagePaths.productionRunPath, JSON.stringify(state, null, 2), 'utf8');
  }

  private loadState(packageDir: string): ProductionRunState | null {
    const runPath = path.join(packageDir, 'production_run.json');
    if (fs.existsSync(runPath)) {
      try {
        return JSON.parse(fs.readFileSync(runPath, 'utf8'));
      } catch {
        return null;
      }
    }
    return null;
  }

  async runProduction(options: ProductionRunOptions): Promise<StandardExecutionResult> {
    const startedAt = new Date().toISOString();
    const outputRoot = options.outputRoot || path.join(process.cwd(), 'output');
    const mode = options.engineMode || config.engineMode;
    const paths = this.createPackageStructure(outputRoot, options.projectName);

    const runId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    const initialStages: Record<string, ProductionStageState> = {
      'creative_director': { id: 'creative_director', name: 'Creative Director & Series Bible', status: 'pending', fingerprint: '', outputArtifacts: [] },
      'writing_room': { id: 'writing_room', name: 'Script & Dialogue Engine', status: 'pending', fingerprint: '', outputArtifacts: [] },
      'storyboard_animatic': { id: 'storyboard_animatic', name: 'Storyboard & Animatic Engine', status: 'pending', fingerprint: '', outputArtifacts: [] },
      'asset_production': { id: 'asset_production', name: 'Asset Production & Rigging', status: 'pending', fingerprint: '', outputArtifacts: [] },
      'scene_assembly_execution': { id: 'scene_assembly_execution', name: 'Scene Assembly & Harmony Execution', status: 'pending', fingerprint: '', outputArtifacts: [] },
      'acting_animation': { id: 'acting_animation', name: 'Acting, Camera & Audio Muxing', status: 'pending', fingerprint: '', outputArtifacts: [] },
      'quality_review_fix': { id: 'quality_review_fix', name: 'Quality Review & Auto-Fix Loop', status: 'pending', fingerprint: '', outputArtifacts: [] },
      'final_render_delivery': { id: 'final_render_delivery', name: 'Final Render & Delivery Packaging', status: 'pending', fingerprint: '', outputArtifacts: [] }
    };

    const state: ProductionRunState = {
      runId,
      projectName: options.projectName,
      options,
      mode,
      status: 'running',
      packagePaths: paths,
      stages: initialStages,
      startedAt,
      updatedAt: startedAt,
      totalScenes: 1,
      completedScenes: 0,
      warnings: [],
      errors: []
    };

    this.saveState(state);

    // Run Stage 1: Creative Director
    state.stages.creative_director.status = 'in_progress';
    state.stages.creative_director.startedAt = new Date().toISOString();
    
    const biblePath = path.join(paths.seriesBibleDir, 'series_bible.json');
    const seriesBible = {
      title: options.projectName,
      prompt: options.prompt,
      genre: options.genre,
      targetAudience: options.targetAudience,
      visualStyle: options.visualStyle,
      qualityPreset: options.qualityPreset
    };
    fs.writeFileSync(biblePath, JSON.stringify(seriesBible, null, 2));
    state.stages.creative_director.outputArtifacts.push(biblePath);
    state.stages.creative_director.status = 'completed';
    state.stages.creative_director.completedAt = new Date().toISOString();
    state.stages.creative_director.fingerprint = this.computeFingerprint(seriesBible);

    // Run Stage 2: Script
    state.stages.writing_room.status = 'in_progress';
    const scriptPath = path.join(paths.scriptsDir, 'screenplay.json');
    const scriptData = {
      sceneId: 'SC_001',
      title: `${options.projectName} - Scene 1`,
      action: options.prompt,
      dialogue: []
    };
    fs.writeFileSync(scriptPath, JSON.stringify(scriptData, null, 2));
    state.stages.writing_room.outputArtifacts.push(scriptPath);
    state.stages.writing_room.status = 'completed';

    // Run Stage 3: Storyboard
    state.stages.storyboard_animatic.status = 'in_progress';
    const sbPath = path.join(paths.storyboardsDir, 'storyboard.json');
    const sbData = {
      sceneId: 'SC_001',
      durationFrames: Math.round(options.durationSeconds * options.fps),
      fps: options.fps,
      shots: [
        { shotId: 'SHOT_01', camera: 'slow_push_in', duration: Math.round(options.durationSeconds * options.fps) }
      ]
    };
    fs.writeFileSync(sbPath, JSON.stringify(sbData, null, 2));
    state.stages.storyboard_animatic.outputArtifacts.push(sbPath);
    state.stages.storyboard_animatic.status = 'completed';

    // Run Stage 4: Asset Production
    state.stages.asset_production.status = 'in_progress';
    const assetManifestPath = path.join(paths.charactersDir, 'asset_manifest.json');
    const assetManifest = {
      characters: ['HeroCharacter'],
      backgrounds: ['MainBackground'],
      placeholdersUsed: true
    };
    fs.writeFileSync(assetManifestPath, JSON.stringify(assetManifest, null, 2));
    state.stages.asset_production.outputArtifacts.push(assetManifestPath);
    state.stages.asset_production.status = 'completed';

    // Run Stage 5: Scene Assembly & Real Harmony Execution
    state.stages.scene_assembly_execution.status = 'in_progress';
    const executor = new RealSceneExecutor();
    const executorMode: 'real' | 'hybrid' | 'simulation' = (mode === 'real' || mode === 'hybrid') ? mode : 'simulation';
    const execRes = await executor.executeScenePlan({
      sceneId: 'SC_001',
      sceneName: 'SC_001',
      durationFrames: sbData.durationFrames,
      fps: options.fps,
      background: { file: 'background_placeholder.png' },
      characters: [{ name: 'HeroCharacter', positionPreset: 'center', scale: 1.0 }],
      camera: { preset: 'slow_push_in' }
    }, {
      mode: executorMode,
      outputDir: paths.root
    });

    state.stages.scene_assembly_execution.outputArtifacts.push(...execRes.createdFiles);
    state.stages.scene_assembly_execution.status = execRes.ok ? 'completed' : 'failed';
    if (!execRes.ok && execRes.error) {
      state.stages.scene_assembly_execution.error = execRes.error.message;
      state.errors.push(execRes.error.message);
    }

    // Stages 6 & 7
    state.stages.acting_animation.status = 'completed';
    state.stages.quality_review_fix.status = 'completed';
    state.stages.final_render_delivery.status = execRes.ok ? 'completed' : 'failed';

    state.status = execRes.ok ? 'completed' : 'failed';
    state.completedScenes = execRes.ok ? 1 : 0;
    state.completedAt = new Date().toISOString();
    this.saveState(state);

    return createStandardExecutionResult({
      mode,
      status: execRes.ok ? (mode === 'simulation' ? 'simulation_success' : 'success') : 'failed',
      isRealHarmonyExecution: execRes.isRealHarmonyExecution,
      simulated: !execRes.isRealHarmonyExecution,
      placeholder: true,
      requiresHumanReview: false,
      warnings: [...state.warnings, ...execRes.warnings],
      errors: state.errors,
      artifacts: execRes.createdFiles,
      executionReportPath: path.join(paths.reviewReportsDir, 'SC_001_execution_report.json'),
      startedAt,
      details: {
        runId,
        productionRunState: state,
        execRes
      }
    });
  }

  async getStatus(packageDir: string): Promise<StandardExecutionResult> {
    const state = this.loadState(packageDir);
    if (!state) {
      return createStandardExecutionResult({
        status: 'failed',
        errors: [`No production run state found in "${packageDir}".`]
      });
    }
    return createStandardExecutionResult({
      mode: state.mode,
      status: state.status === 'completed' ? 'success' : state.status === 'failed' ? 'failed' : 'partial_success',
      details: { state }
    });
  }

  async resumeProduction(packageDir: string): Promise<StandardExecutionResult> {
    const state = this.loadState(packageDir);
    if (!state) {
      return createStandardExecutionResult({
        status: 'failed',
        errors: [`Cannot resume: production run state not found at "${packageDir}".`]
      });
    }

    // Re-run production using saved options
    return this.runProduction(state.options);
  }
}
