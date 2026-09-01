import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { type ShotManifest, type ShowBibleCrossRefs } from '../../schemas/shotManifest.js';
import { MohoShowBibleLoader, type LoadedMohoShowBible } from '../../services/mohoShowBibleLoader/index.js';
import { MohoPerformancePirCompiler } from '../../services/mohoPerformancePirCompiler/index.js';
import { MohoCommandBuilder } from '../../services/mohoCommandBuilder/index.js';
import { emitMohoLua } from '../../services/mohoLuaEmitter/index.js';
import { MohoRenderRunner } from '../../services/mohoRenderRunner/index.js';
import { MohoQaGate } from '../../services/mohoQaGate/index.js';
import { MohoRetakeEngine } from '../../services/mohoRetakeEngine/index.js';
import { type MohoPerformancePir } from '../../schemas/mohoPerformancePir.js';
import { type MohoCommandPlan } from '../../schemas/mohoCommandPlan.js';

export const MOHO_FACTORY_VERSION = 'moho-factory-orchestrator-v1';

export type MohoFactoryStage =
  | 'init'
  | 'show_bible_loaded'
  | 'shot_manifest_built'
  | 'pir_compiled'
  | 'command_plan_built'
  | 'lua_emitted'
  | 'rendered'
  | 'qa_evaluated'
  | 'retake_patches'
  | 'done'
  | 'failed';

export interface MohoFactoryStageState {
  id: MohoFactoryStage;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'requires_approval';
  startedAt?: string;
  completedAt?: string;
  outputArtifacts: string[];
  error?: string;
  fingerprint: string;
}

export interface MohoFactoryRunOptions {
  showBiblePath: string;
  shotManifests: ShotManifest[];
  outputRoot: string;
  mode: 'offline_dry_run' | 'live_render';
  requireHumanApprovalFor?: MohoFactoryStage[];
  fps?: number;
  timeoutMs?: number;
}

export interface MohoFactoryShotResult {
  shotId: string;
  status: 'completed' | 'failed' | 'requires_approval';
  pirFingerprint: string;
  planFingerprint: string;
  qaStatus: 'pass' | 'warn' | 'fail';
  retakeCount: number;
  artifacts: string[];
  durationMs: number;
}

export interface MohoFactoryRunState {
  runId: string;
  projectName: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  status: 'initializing' | 'running' | 'paused' | 'awaiting_approval' | 'completed' | 'failed';
  currentStage?: MohoFactoryStage;
  stages: Record<MohoFactoryStage, MohoFactoryStageState>;
  shotResults: MohoFactoryShotResult[];
  totalShots: number;
  completedShots: number;
  warnings: string[];
  errors: string[];
  fingerprint: string;
}

const STAGE_ORDER: MohoFactoryStage[] = [
  'init',
  'show_bible_loaded',
  'shot_manifest_built',
  'pir_compiled',
  'command_plan_built',
  'lua_emitted',
  'rendered',
  'qa_evaluated',
  'retake_patches',
  'done',
  'failed'
];

const STAGE_NAMES: Record<MohoFactoryStage, string> = {
  init: 'Init',
  show_bible_loaded: 'Show Bible Loaded',
  shot_manifest_built: 'Shot Manifest Validated',
  pir_compiled: 'Performance PIR Compiled',
  command_plan_built: 'Command Plan Built',
  lua_emitted: 'Lua Emitted',
  rendered: 'Rendered',
  qa_evaluated: 'QA Evaluated',
  retake_patches: 'Retake Patches',
  done: 'Done',
  failed: 'Failed'
};

function canonicalize(value: unknown): string {
  return JSON.stringify(value, (_key, v) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(v as Record<string, unknown>).sort()) {
        sorted[k] = (v as Record<string, unknown>)[k];
      }
      return sorted;
    }
    return v;
  });
}

export class MohoFactoryOrchestrator {
  private readonly options: MohoFactoryRunOptions;
  private state: MohoFactoryRunState;
  private loadedBible: LoadedMohoShowBible | null = null;

  constructor(options: MohoFactoryRunOptions) {
    this.options = options;
    this.state = MohoFactoryOrchestrator.defaultStages();
    this.state.runId = MohoFactoryOrchestrator.generateRunId();
    this.state.projectName = options.outputRoot.split(path.sep).pop() ?? 'moho_factory';
    this.state.totalShots = options.shotManifests.length;
  }

  public async run(): Promise<MohoFactoryRunState> {
    this.state.status = 'running';
    this.state.updatedAt = new Date().toISOString();

    if (!fs.existsSync(this.options.outputRoot)) {
      fs.mkdirSync(this.options.outputRoot, { recursive: true });
    }

    try {
      await this.runStage('init', async () => {
        return { artifacts: [] as string[] };
      });

      await this.runStage('show_bible_loaded', async () => {
        const loader = new MohoShowBibleLoader();
        this.loadedBible = loader.load(this.options.showBiblePath);
        const biblePath = path.join(this.options.outputRoot, 'moho_show_bible_loaded.json');
        fs.writeFileSync(biblePath, JSON.stringify(this.loadedBible.mohoShowBible, null, 2), 'utf8');
        return { artifacts: [biblePath] };
      });

      const requireApproval = new Set<MohoFactoryStage>(
        this.options.requireHumanApprovalFor ?? ['pir_compiled', 'rendered']
      );

      for (const shot of this.options.shotManifests) {
        if ((this.state.status as string) === 'paused') {
          this.state.status = 'paused';
          this.state.updatedAt = new Date().toISOString();
          this.state.fingerprint = MohoFactoryOrchestrator.computeRunStateFingerprint(this.state);
          return this.state;
        }

        const result = await this.runOneShot(shot);
        this.state.shotResults.push(result);

        if (result.status === 'requires_approval') {
          this.state.status = 'awaiting_approval';
          this.state.currentStage = this.lastPendingApprovalStage();
          if (this.state.currentStage && requireApproval.has(this.state.currentStage)) {
            this.state.stages[this.state.currentStage].status = 'requires_approval';
          }
        } else if (result.status === 'failed') {
          this.state.status = 'failed';
          this.state.errors.push(`shot ${shot.shotId} failed`);
        } else {
          this.state.completedShots += 1;
        }

        this.state.updatedAt = new Date().toISOString();
        this.state.fingerprint = MohoFactoryOrchestrator.computeRunStateFingerprint(this.state);
      }

      if (this.state.status === 'awaiting_approval') {
        return this.state;
      }

      if (this.state.completedShots === this.state.totalShots) {
        this.state.status = 'completed';
        const doneStage = this.state.stages.done;
        doneStage.status = 'completed';
        doneStage.completedAt = new Date().toISOString();
        doneStage.fingerprint = this.fingerprint('done');
      } else if (this.state.status !== 'failed') {
        this.state.status = 'completed';
      }

      this.state.completedAt = new Date().toISOString();
      this.state.updatedAt = this.state.completedAt;
      this.state.fingerprint = MohoFactoryOrchestrator.computeRunStateFingerprint(this.state);
      return this.state;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.state.status = 'failed';
      this.state.errors.push(message);
      this.markCurrentFailed(message);
      this.state.completedAt = new Date().toISOString();
      this.state.updatedAt = this.state.completedAt;
      this.state.fingerprint = MohoFactoryOrchestrator.computeRunStateFingerprint(this.state);
      return this.state;
    }
  }

  public async runOneShot(shot: ShotManifest): Promise<MohoFactoryShotResult> {
    const startedAt = Date.now();
    const artifacts: string[] = [];
    const warnings: string[] = [];

    if (!this.loadedBible) {
      return {
        shotId: shot.shotId,
        status: 'failed',
        pirFingerprint: '',
        planFingerprint: '',
        qaStatus: 'fail',
        retakeCount: 0,
        artifacts: [],
        durationMs: Date.now() - startedAt
      };
    }

    let pir: MohoPerformancePir | null = null;
    let plan: MohoCommandPlan | null = null;
    let qaStatus: 'pass' | 'warn' | 'fail' = 'pass';
    let retakeCount = 0;
    let overallStatus: 'completed' | 'failed' | 'requires_approval' = 'completed';
    const pirHolder: { value: MohoPerformancePir | null } = { value: null };
    const planHolder: { value: MohoCommandPlan | null } = { value: null };

    try {
      await this.runStage('shot_manifest_built', async () => {
        const refs: ShowBibleCrossRefs = {
          cameraRules: this.loadedBible!.crossRefs.cameraRules,
          motionGrammar: this.loadedBible!.crossRefs.motionGrammar,
          characterIds: this.loadedBible!.crossRefs.characterIds,
          allowedRigTypes: this.loadedBible!.crossRefs.allowedRigTypes
        };
        const manifestPath = path.join(this.options.outputRoot, `${shot.shotId}_manifest.json`);
        fs.writeFileSync(manifestPath, JSON.stringify(shot, null, 2), 'utf8');
        return { artifacts: [manifestPath], warnings };
      });

      const characterId = shot.beats[0]?.characterId;
      const characterBible = this.loadedBible.characterBibles.find(cb => cb.characterId === characterId);
      if (!characterBible) {
        throw new Error(`character_bible for "${characterId}" not in show bible`);
      }

      const refs: ShowBibleCrossRefs = {
        cameraRules: this.loadedBible.crossRefs.cameraRules,
        motionGrammar: this.loadedBible.crossRefs.motionGrammar,
        characterIds: this.loadedBible.crossRefs.characterIds,
        allowedRigTypes: this.loadedBible.crossRefs.allowedRigTypes
      };

      await this.runStage('pir_compiled', async () => {
        const compiler = new MohoPerformancePirCompiler();
        const compileResult = compiler.compile({
          shotManifest: shot,
          characterBible,
          cameraRules: this.loadedBible!.cameraRules,
          motionGrammar: this.loadedBible!.motionGrammar,
          crossRefs: refs
        });
        pir = compileResult.pir;
        pirHolder.value = compileResult.pir;
        warnings.push(...compileResult.warnings);
        if (compileResult.violations.length > 0) {
          warnings.push(`cross-ref violations: ${compileResult.violations.length}`);
        }
        const pirPath = path.join(this.options.outputRoot, `${shot.shotId}_pir.json`);
        fs.writeFileSync(pirPath, JSON.stringify(pir, null, 2), 'utf8');
        return { artifacts: [pirPath], warnings };
      });

      let planFingerprint = '';
      await this.runStage('command_plan_built', async () => {
        const builder = new MohoCommandBuilder();
        const built = builder.buildWithFingerprint({ pir: pir!, characterBible });
        plan = built.plan;
        planHolder.value = built.plan;
        planFingerprint = built.fingerprint;
        const planPath = path.join(this.options.outputRoot, `${shot.shotId}_plan.json`);
        fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), 'utf8');
        return { artifacts: [planPath], warnings };
      });

      await this.runStage('lua_emitted', async () => {
        const lua = emitMohoLua(plan!, characterBible.name);
        const luaPath = path.join(this.options.outputRoot, `${shot.shotId}_build.lua`);
        fs.writeFileSync(luaPath, lua, 'utf8');
        return { artifacts: [luaPath], warnings };
      });

      let renderResultStatus: 'rendered' | 'requires_real_moho' | 'requires_moho_pro' | 'dry_run' | 'failed' = 'dry_run';
      let renderError: string | undefined;
      let renderedFiles: string[] = [];

      await this.runStage('rendered', async () => {
        const runner = new MohoRenderRunner();
        const renderOutputDir = path.join(this.options.outputRoot, `${shot.shotId}_render`);
        if (!fs.existsSync(renderOutputDir)) fs.mkdirSync(renderOutputDir, { recursive: true });
        const result = await runner.run({
          commandPlan: plan!,
          outputDir: renderOutputDir,
          fps: this.options.fps ?? 24,
          dryRun: this.options.mode === 'offline_dry_run',
          timeoutMs: this.options.timeoutMs
        });
        renderResultStatus = result.status;
        renderError = result.errorMessage;
        renderedFiles = result.renderedFiles;
        artifacts.push(...renderedFiles);
        return { artifacts: renderedFiles, warnings };
      });

      let qaFingerprint = '';
      await this.runStage('qa_evaluated', async () => {
        const gate = new MohoQaGate();
        const renderOutputDir = path.join(this.options.outputRoot, `${shot.shotId}_render`);
        const fakeResult = {
          jobId: `synth_${shot.shotId}`,
          status: renderResultStatus,
          detectedMohoPath: null,
          commandLine: '',
          outputDir: renderOutputDir,
          renderedFiles,
          totalFrames: shot.timing.totalFrames,
          durationMs: 0,
          fps: this.options.fps ?? 24,
          resolution: { width: 1920, height: 1080 },
          codec: null,
          qaFindings: [],
          exitCode: renderResultStatus === 'rendered' ? 0 : 1,
          errorMessage: renderError
        };
        const qaResult = gate.evaluate({
          shotId: shot.shotId,
          renderResult: fakeResult,
          pir: pir!,
          thresholds: this.loadedBible!.qaThresholds,
          characterBible: {
            characterId: characterBible.characterId,
            bones: characterBible.controllers.map(c => ({ boneId: c.boneId, boneName: c.boneName }))
          }
        });
        qaStatus = qaResult.overallStatus;
        qaFingerprint = qaResult.fingerprint;
        const qaPath = path.join(this.options.outputRoot, `${shot.shotId}_qa.json`);
        fs.writeFileSync(qaPath, JSON.stringify(qaResult, null, 2), 'utf8');
        artifacts.push(qaPath);

        if (
          renderResultStatus === 'requires_real_moho'
          || renderResultStatus === 'requires_moho_pro'
        ) {
          overallStatus = 'requires_approval';
          warnings.push(`${renderResultStatus}: render skipped — awaiting human approval`);
        }
        return { artifacts: [qaPath], warnings };
      });

      await this.runStage('retake_patches', async () => {
        if (qaStatus === 'pass') {
          return { artifacts: [] as string[], warnings };
        }
        const engine = new MohoRetakeEngine();
        const fakeResult = {
          jobId: `synth_${shot.shotId}`,
          status: renderResultStatus,
          detectedMohoPath: null,
          commandLine: '',
          outputDir: path.join(this.options.outputRoot, `${shot.shotId}_render`),
          renderedFiles,
          totalFrames: shot.timing.totalFrames,
          durationMs: 0,
          fps: this.options.fps ?? 24,
          resolution: { width: 1920, height: 1080 },
          codec: null,
          qaFindings: [],
          exitCode: renderResultStatus === 'rendered' ? 0 : 1,
          errorMessage: renderError
        };
        const gate = new MohoQaGate();
        const qaResult = gate.evaluate({
          shotId: shot.shotId,
          renderResult: fakeResult,
          pir: pir!,
          thresholds: this.loadedBible!.qaThresholds,
          characterBible: {
            characterId: characterBible.characterId,
            bones: characterBible.controllers.map(c => ({ boneId: c.boneId, boneName: c.boneName }))
          }
        });
        const retake = engine.generatePatches({
          pir: pir!,
          characterBible,
          qaResult,
          thresholds: this.loadedBible!.qaThresholds
        });
        retakeCount = retake.patches.length;
        if (retake.requiresHumanApproval) {
          overallStatus = 'requires_approval';
        }
        const retakePath = path.join(this.options.outputRoot, `${shot.shotId}_retake.json`);
        fs.writeFileSync(retakePath, JSON.stringify(retake, null, 2), 'utf8');
        artifacts.push(retakePath);
        return { artifacts: [retakePath], warnings };
      });

      const pirSnapshot: MohoPerformancePir | null = pirHolder.value;
      return {
        shotId: shot.shotId,
        status: overallStatus,
        pirFingerprint: pirSnapshot?.deterministicFingerprint ?? '',
        planFingerprint: planFingerprint,
        qaStatus,
        retakeCount,
        artifacts,
        durationMs: Date.now() - startedAt
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.state.errors.push(`shot ${shot.shotId}: ${message}`);
      const pirSnapshot: MohoPerformancePir | null = pirHolder.value;
      return {
        shotId: shot.shotId,
        status: 'failed',
        pirFingerprint: pirSnapshot?.deterministicFingerprint ?? '',
        planFingerprint: '',
        qaStatus: 'fail',
        retakeCount: 0,
        artifacts,
        durationMs: Date.now() - startedAt
      };
    }
  }

  public pause(): void {
    if (this.state.status === 'running') {
      this.state.status = 'paused';
      this.state.updatedAt = new Date().toISOString();
      this.state.fingerprint = MohoFactoryOrchestrator.computeRunStateFingerprint(this.state);
    }
  }

  public resume(): void {
    if (this.state.status === 'paused') {
      this.state.status = 'running';
      this.state.updatedAt = new Date().toISOString();
      this.state.fingerprint = MohoFactoryOrchestrator.computeRunStateFingerprint(this.state);
    }
  }

  public approve(stage: MohoFactoryStage): void {
    const s = this.state.stages[stage];
    if (s && s.status === 'requires_approval') {
      s.status = 'completed';
      s.completedAt = new Date().toISOString();
      s.fingerprint = this.fingerprint(stage);
      this.state.status = 'running';
      this.state.updatedAt = new Date().toISOString();
      this.state.fingerprint = MohoFactoryOrchestrator.computeRunStateFingerprint(this.state);
    }
  }

  public getState(): MohoFactoryRunState {
    return this.state;
  }

  public abort(): MohoFactoryRunState {
    this.state.status = 'failed';
    this.state.errors.push('aborted by caller');
    this.state.completedAt = new Date().toISOString();
    this.state.updatedAt = this.state.completedAt;
    this.markCurrentFailed('aborted');
    this.state.fingerprint = MohoFactoryOrchestrator.computeRunStateFingerprint(this.state);
    return this.state;
  }

  static generateRunId(): string {
    return `moho_factory_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  static defaultStages(): MohoFactoryRunState {
    const stages = {} as Record<MohoFactoryStage, MohoFactoryStageState>;
    for (const id of STAGE_ORDER) {
      stages[id] = {
        id,
        name: STAGE_NAMES[id],
        status: 'pending',
        outputArtifacts: [],
        fingerprint: crypto.createHash('sha256').update(`stage:${id}`).digest('hex').slice(0, 16)
      };
    }
    return {
      runId: '',
      projectName: '',
      startedAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
      status: 'initializing',
      stages,
      shotResults: [],
      totalShots: 0,
      completedShots: 0,
      warnings: [],
      errors: [],
      fingerprint: ''
    };
  }

  static computeRunStateFingerprint(state: MohoFactoryRunState): string {
    const stageFp = Object.fromEntries(
      Object.entries(state.stages).map(([k, v]) => [k, v.fingerprint])
    );
    const payload = {
      runId: state.runId,
      projectName: state.projectName,
      status: state.status,
      currentStage: state.currentStage,
      stageFp,
      shotResults: state.shotResults.map(s => ({
        shotId: s.shotId,
        status: s.status,
        pirFingerprint: s.pirFingerprint,
        planFingerprint: s.planFingerprint,
        qaStatus: s.qaStatus,
        retakeCount: s.retakeCount
      })),
      totalShots: state.totalShots,
      completedShots: state.completedShots
    };
    return crypto.createHash('sha256').update(canonicalize(payload)).digest('hex');
  }

  private async runStage(
    stageId: MohoFactoryStage,
    fn: () => Promise<{ artifacts: string[]; warnings?: string[] }>
  ): Promise<void> {
    const stage = this.state.stages[stageId];
    stage.status = 'in_progress';
    stage.startedAt = new Date().toISOString();
    stage.outputArtifacts = [];
    this.state.currentStage = stageId;
    this.state.updatedAt = stage.startedAt;

    const result = await fn();
    stage.outputArtifacts.push(...result.artifacts);
    if (result.warnings) {
      this.state.warnings.push(...result.warnings);
    }
    stage.status = 'completed';
    stage.completedAt = new Date().toISOString();
    stage.fingerprint = this.fingerprint(stageId);
    this.state.fingerprint = MohoFactoryOrchestrator.computeRunStateFingerprint(this.state);
  }

  private markCurrentFailed(message: string): void {
    const cur = this.state.currentStage;
    if (cur) {
      const s = this.state.stages[cur];
      s.status = 'failed';
      s.error = message;
      s.completedAt = new Date().toISOString();
      s.fingerprint = this.fingerprint(cur);
    }
    const failStage = this.state.stages.failed;
    failStage.status = 'completed';
    failStage.completedAt = new Date().toISOString();
    failStage.fingerprint = this.fingerprint('failed');
  }

  private lastPendingApprovalStage(): MohoFactoryStage | undefined {
    const order: MohoFactoryStage[] = [
      'show_bible_loaded',
      'shot_manifest_built',
      'pir_compiled',
      'command_plan_built',
      'lua_emitted',
      'rendered',
      'qa_evaluated',
      'retake_patches'
    ];
    for (let i = order.length - 1; i >= 0; i--) {
      const s = this.state.stages[order[i]];
      if (s.status === 'requires_approval') return order[i];
    }
    return undefined;
  }

  private fingerprint(stageId: MohoFactoryStage): string {
    const stage = this.state.stages[stageId];
    const payload = {
      stageId,
      status: stage.status,
      artifacts: stage.outputArtifacts,
      error: stage.error
    };
    return crypto.createHash('sha256').update(canonicalize(payload)).digest('hex').slice(0, 16);
  }
}

export default MohoFactoryOrchestrator;
