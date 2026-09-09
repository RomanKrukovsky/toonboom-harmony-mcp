import fs from 'fs';
import path from 'path';
import { CountryballsSeriesBible } from '../../schemas/countryballs/seriesBible.js';
import { DEFAULT_COUNTRYBALLS_SERIES_BIBLE } from '../seriesBible/defaultBible.js';
import { ContinuityLedger } from '../seriesBible/continuityLedger.js';
import { CountryballsWritersRoom, CountryballsScreenplay } from '../writersRoom/writersRoom.js';
import { CountryballsDirectorEngine } from '../director/directorEngine.js';
import { ComedyEngine } from '../comedy/comedyEngine.js';
import { CountryballsAudioLipsyncCompiler, AudioProductionManifest } from '../audio/audioLipsyncCompiler.js';
import { UniversalCountryballsDccAdapter, SupportedDccBackend, CompilationPackageResult } from '../compiler/universalDccAdapter.js';
import { CountryballsAiCritic, CountryballsQaReport } from '../critic/aiCritic.js';
import { CountryballsRevisionPatcher, RevisionPlan } from '../critic/revisionPatcher.js';
import { EpisodeIR } from '../../schemas/countryballs/episodeIR.js';

export interface ProduceEpisodeOptions {
  topic: string;
  projectName?: string;
  outputRoot?: string;
  backend?: SupportedDccBackend;
  mainCharacters?: string[];
  tone?: string;
  autoFixEnabled?: boolean;
  minHoldFrames?: number;
}

export interface ProduceEpisodeResult {
  success: boolean;
  episodeId: string;
  packageDirectory: string;
  artifacts: {
    screenplayPath: string;
    storyboardPath: string;
    episodeIrPath: string;
    audioManifestPath: string;
    dccProjectPath: string;
    dccScriptPath: string;
    qaReportPath: string;
    revisionPlanPath?: string;
    summaryPath: string;
  };
  metrics: {
    totalDurationFrames: number;
    totalDurationSeconds: number;
    scenesCount: number;
    shotsCount: number;
    jokesPerMinute: number;
    overallQaScore: number;
    revisionsApplied: number;
  };
}

export class CountryballsStudioOrchestrator {
  private bible: CountryballsSeriesBible;
  private continuity: ContinuityLedger;

  constructor(bible?: CountryballsSeriesBible, continuity?: ContinuityLedger) {
    this.bible = bible || DEFAULT_COUNTRYBALLS_SERIES_BIBLE;
    this.continuity = continuity || new ContinuityLedger();
  }

  public produceEpisode(options: ProduceEpisodeOptions): ProduceEpisodeResult {
    const projectName = options.projectName || `countryballs_${Date.now().toString(36)}`;
    const outputRoot = options.outputRoot || path.join(process.cwd(), 'output', 'countryballs');
    const packageDirectory = path.join(outputRoot, projectName);

    if (!fs.existsSync(packageDirectory)) {
      fs.mkdirSync(packageDirectory, { recursive: true });
    }

    const backend: SupportedDccBackend = options.backend || 'animate';
    const autoFix = options.autoFixEnabled !== false;

    // Stage 1: Virtual Writers Room
    const writersRoom = new CountryballsWritersRoom(this.bible, this.continuity);
    const screenplay: CountryballsScreenplay = writersRoom.produceScreenplay({
      topic: options.topic,
      tone: options.tone,
      mainCharacters: options.mainCharacters
    });

    const screenplayPath = path.join(packageDirectory, '01_screenplay.md');
    fs.writeFileSync(screenplayPath, screenplay.screenplayMarkdown, 'utf8');

    // Stage 2: Director Engine
    const director = new CountryballsDirectorEngine(this.bible);
    let episodeIR: EpisodeIR = director.directEpisode(screenplay);

    // Stage 3: Comedy Timing Engine (injection of holds)
    const comedyEngine = new ComedyEngine(this.continuity);
    episodeIR = comedyEngine.injectComedicTiming(episodeIR, options.minHoldFrames || 14);

    // Stage 4: Audio & Lip-Sync Compiler
    const audioCompiler = new CountryballsAudioLipsyncCompiler(this.bible);
    const { updatedEpisode, manifest } = audioCompiler.compileAudioAndLipsync(episodeIR);
    episodeIR = updatedEpisode;

    const audioManifestPath = path.join(packageDirectory, '04_audio_manifest.json');
    fs.writeFileSync(audioManifestPath, JSON.stringify(manifest, null, 2), 'utf8');

    // Stage 5: Initial QA Audit
    const critic = new CountryballsAiCritic(this.bible);
    let qaReport: CountryballsQaReport = critic.audit(episodeIR);
    let revisionsApplied = 0;
    let revisionPlanPath: string | undefined;

    // Stage 6: Self-Healing Revision Loop
    if (!qaReport.passed && autoFix && qaReport.issues.length > 0) {
      const revisionPlan: RevisionPlan = CountryballsRevisionPatcher.generateRevisionPlan(qaReport);
      revisionPlanPath = path.join(packageDirectory, '07_revision_plan.json');
      fs.writeFileSync(revisionPlanPath, JSON.stringify(revisionPlan, null, 2), 'utf8');

      episodeIR = CountryballsRevisionPatcher.applyRevisionPlan(episodeIR, revisionPlan);
      revisionsApplied = revisionPlan.totalPatches;

      // Re-audit after fixes
      qaReport = critic.audit(episodeIR);
    }

    // Save final Episode IR & Storyboard
    const episodeIrPath = path.join(packageDirectory, '03_episode_ir.json');
    fs.writeFileSync(episodeIrPath, JSON.stringify(episodeIR, null, 2), 'utf8');

    const storyboardPath = path.join(packageDirectory, '02_storyboard.json');
    const storyboardData = {
      episodeId: episodeIR.episodeId,
      title: episodeIR.title,
      shots: episodeIR.scenes.flatMap(s => s.shots.map(sh => ({
        shotId: sh.shotId,
        framing: sh.framing,
        cameraMove: sh.cameraMove,
        durationFrames: sh.durationFrames,
        actors: sh.actorsOnStage.map(a => a.actorId),
        directorNotes: sh.directorNotes
      })))
    };
    fs.writeFileSync(storyboardPath, JSON.stringify(storyboardData, null, 2), 'utf8');

    // Save QA Report
    const qaReportPath = path.join(packageDirectory, '06_qa_report.json');
    fs.writeFileSync(qaReportPath, JSON.stringify(qaReport, null, 2), 'utf8');

    // Stage 7: DCC Backend Compilation (Adobe Animate / Harmony / Moho)
    const dccAdapter = new UniversalCountryballsDccAdapter(this.bible);
    const dccResult: CompilationPackageResult = dccAdapter.compile(episodeIR, packageDirectory, backend);

    // Save Summary
    const summaryPath = path.join(packageDirectory, '08_production_summary.json');
    const totalDurationSeconds = Number((episodeIR.totalDurationFrames / (episodeIR.fps || 24)).toFixed(2));
    const totalShots = episodeIR.scenes.reduce((sum, s) => sum + s.shots.length, 0);

    const summary = {
      success: true,
      episodeId: episodeIR.episodeId,
      title: episodeIR.title,
      backend,
      totalDurationSeconds,
      scenesCount: episodeIR.scenes.length,
      shotsCount: totalShots,
      qaScore: qaReport.overallScore,
      qaPassed: qaReport.passed,
      revisionsApplied,
      generatedAt: new Date().toISOString()
    };
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');

    return {
      success: true,
      episodeId: episodeIR.episodeId,
      packageDirectory,
      artifacts: {
        screenplayPath,
        storyboardPath,
        episodeIrPath,
        audioManifestPath,
        dccProjectPath: dccResult.projectFilePath,
        dccScriptPath: dccResult.primaryScriptPath,
        qaReportPath,
        revisionPlanPath,
        summaryPath
      },
      metrics: {
        totalDurationFrames: episodeIR.totalDurationFrames,
        totalDurationSeconds,
        scenesCount: episodeIR.scenes.length,
        shotsCount: totalShots,
        jokesPerMinute: qaReport.comedyReport.jokesPerMinute,
        overallQaScore: qaReport.overallScore,
        revisionsApplied
      }
    };
  }
}
