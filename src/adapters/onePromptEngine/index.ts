/**
 * onePromptEngine — the orchestrator that turns one creative prompt
 * into a complete production package (ACTOR §1–§5).
 *
 * It does NOT pretend to produce final Pixar-quality output. It produces
 * a structured production intelligence package; the "what really
 * happened" truth is in every result's `whatWasReal` log.
 */

import { config } from '../../config.js';
import type {
  OnePromptInput,
  AnalysisResult
} from '../../schemas/onePrompt.js';
import type { SeriesBible } from '../../schemas/seriesBible.js';
import type { EpisodePlan } from '../../schemas/episodePlan.js';
import type { CharacterSpec } from '../../schemas/characterSpec.js';
import type { Rig360Spec } from '../../schemas/rig360Spec.js';
import { SeriesPlanner } from '../seriesPlanner/index.js';
import { EpisodePlanner } from '../episodePlanner/index.js';
import { ScriptPlanner } from '../scriptPlanner/index.js';
import { ShotPlanner } from '../shotPlanner/index.js';
import { CharacterDesigner } from '../characterDesigner/index.js';
import { AssetGenerator } from '../assetGenerator/index.js';
import { Rig360Synthesizer } from '../rig360Synthesizer/index.js';
import { ActingPlanner } from '../actingPlanner/index.js';
import { AnimationDirector } from '../animationDirector/index.js';
import { QualityDirector } from '../qualityDirector/index.js';
import { EpisodeAssembler } from '../episodeAssembler/index.js';
import { FinalPackager } from '../finalPackage/index.js';
import { LipsyncPlanner } from '../lipsyncPlanner/index.js';
import { BackgroundPlanner } from '../backgroundPlanner/index.js';
import { generateDialogue, generateBackground, synthesizeDialogue } from '../backends/index.js';

export interface ProductionPackage {
  prompt: string;
  mode: string;
  analysis: AnalysisResult;
  seriesBible: SeriesBible;
  episodePlan: EpisodePlan;
  shotList: EpisodePlan['shots'];
  characterSpecs: CharacterSpec[];
  rig360Specs: Rig360Spec[];
  assetRequirements: EpisodePlan['assetRequirements'];
  actingPlans: any[];
  lipsyncPlans: any[];
  cameraPlans: any[];
  fxPlans: any[];
  backgroundPlans: any[];
  renderPlan: any;
  reviewReports: any[];
  scenePlans?: any[];
  finalPackage: any;
  whatWasReal: WhatWasRealLog[];
}

export interface WhatWasRealLog {
  module: string;
  whatWasDone: string;
  classification: 'generated' | 'assembled' | 'simulated' | 'planned' | 'placeholder' | 'requires_human' | 'requires_external_model' | 'requires_real_harmony';
}

export class OnePromptEngine {
  analyzePrompt(input: OnePromptInput): AnalysisResult {
    const minutes = input.targetDurationMinutes ?? 2;
    const sceneCount = Math.max(3, Math.round(minutes * 1.5));
    const shotCount = Math.max(sceneCount, Math.round(minutes * 6));
    return {
      logLine: encryptLogLine(input.prompt),
      genre: detectGenre(input.prompt),
      tone: detectTone(input.prompt),
      setting: detectSetting(input.prompt),
      targetAudience: detectAudience(input.prompt),
      durationMinutes: minutes,
      estimatedSceneCount: sceneCount,
      estimatedShotCount: shotCount,
      candidateCharacters: parseCandidateCharacters(input.prompt),
      themes: parseThemes(input.prompt),
      origin: 'planned'
    };
  }

  async generateProductionPackage(input: OnePromptInput): Promise<ProductionPackage> {
    const mode = input.mode ?? config.engineMode;
    const whatWasReal: WhatWasRealLog[] = [];

    // 1. Analysis
    const analysis = this.analyzePrompt(input);
    whatWasReal.push({ module: 'onePromptEngine.analyze', whatWasDone: 'Анализ промпта → структурированный plan', classification: 'planned' });

    // 2. Series bible
    const seriesPlanner = new SeriesPlanner();
    const seriesBible = seriesPlanner.createBible(analysis, input);
    whatWasReal.push({ module: 'seriesPlanner', whatWasDone: 'Сгенерирован series_bible.json', classification: seriesBible.origin });

    // 3. Episode plan
    const episodePlanner = new EpisodePlanner();
    const episodePlan = episodePlanner.createEpisodePlan(analysis, input);
    whatWasReal.push({ module: 'episodePlanner', whatWasDone: 'Сгенерирован episode_plan.json', classification: episodePlan.origin });

    // 4. Shot list
    const shotPlanner = new ShotPlanner();
    const shotList = shotPlanner.generateShots(episodePlan);
    episodePlan.shots = shotList;
    whatWasReal.push({ module: 'shotPlanner', whatWasDone: `Сгенерирован shot_list (${shotList.length} шотов)`, classification: 'planned' });

    // 5. Character specs
    const designer = new CharacterDesigner();
    const characterSpecs = designer.generateSpecs(analysis.candidateCharacters, seriesBible);
    whatWasReal.push({
      module: 'characterDesigner',
      whatWasDone: characterSpecs.some(c => c.assetBackend === 'missing')
        ? 'Спецификации созданы; asset generation backend отсутствует — созданы asset briefs'
        : 'Созданы полные character specs',
      classification: characterSpecs.some(c => c.assetBackend === 'missing') ? 'requires_external_model' : 'generated'
    });

    // 6. Rig360 specs
    const rig360 = new Rig360Synthesizer();
    const rig360Specs = characterSpecs.map(c => rig360.generateSpec(c));
    whatWasReal.push({
      module: 'rig360Synthesizer',
      whatWasDone: rig360Specs.some(r => !r.realRigCreated && r.placeholderRigCreated)
        ? 'Placeholder rig360 specs созданы; требуется реальная отрисовка для full rig'
        : 'Rig360 specs созданы',
      classification: rig360Specs.some(r => !r.realRigCreated && r.placeholderRigCreated) ? 'placeholder' : 'planned'
    });

    // 7. Asset requirements
    const assetGen = new AssetGenerator();
    const assetRequirements = assetGen.generateRequirements(characterSpecs, episodePlan, rig360Specs);
    whatWasReal.push({ module: 'assetGenerator', whatWasDone: `Сгенерированы asset requirements (${assetRequirements.length})`, classification: 'planned' });

    // 8. Acting plans
    const actingPlanner = new ActingPlanner();
    const scriptPlanner = new ScriptPlanner();
    let script = scriptPlanner.generateScript(episodePlan, analysis);
    if (config.backends.llm !== 'none') {
      script = await enhanceScriptWithLlm(script, episodePlan, analysis);
      whatWasReal.push({ module: 'llmBackend', whatWasDone: `Dialogue enhanced via ${config.backends.llm} backend`, classification: script.origin === 'real' ? 'generated' : 'requires_external_model' });
    }
    const actingPlans = actingPlanner.generateActingPlans(script, characterSpecs, episodePlan);
    whatWasReal.push({ module: 'actingPlanner', whatWasDone: `Сгенерированы acting plans (${actingPlans.length} сцен)`, classification: 'planned' });

    // 8b. Lipsync plans
    const lipsyncPlanner = new LipsyncPlanner();
    let lipsyncPlans = lipsyncPlanner.generatePlans(script, episodePlan);
    if (config.backends.audio !== 'none') {
      lipsyncPlans = await generateLipsyncAudio(lipsyncPlans);
      whatWasReal.push({ module: 'audioBackend', whatWasDone: `Dialogue audio synthesized via ${config.backends.audio} backend`, classification: 'generated' });
    }
    const lipsyncNeedsAudio = lipsyncPlans.some(p => p.missingAssets.includes('recorded dialogue audio'));
    whatWasReal.push({
      module: 'lipsyncPlanner',
      whatWasDone: `Сгенерированы lipsync plans (${lipsyncPlans.length} сцен)`,
      classification: lipsyncNeedsAudio ? 'placeholder' : 'planned'
    });

    // 9. Background plans
    const backgroundPlanner = new BackgroundPlanner();
    let backgroundPlans = backgroundPlanner.generatePlans(episodePlan);
    if (config.backends.image !== 'none') {
      backgroundPlans = await generateBackgroundArt(backgroundPlans);
      whatWasReal.push({ module: 'imageBackend', whatWasDone: `Background art generated via ${config.backends.image} backend`, classification: 'generated' });
    }
    whatWasReal.push({ module: 'backgroundPlanner', whatWasDone: `Background plans (${backgroundPlans.length} locations)`, classification: 'placeholder' });

    // 10. Camera & FX plans
    const animationDirector = new AnimationDirector();
    const cameraPlans = animationDirector.generateCameraPlans(episodePlan, shotList);
    const fxPlans = animationDirector.generateFxPlans(episodePlan);
    whatWasReal.push({ module: 'animationDirector', whatWasDone: 'Camera/FX планы созданы', classification: 'planned' });

    // 10. Quality review
    const quality = new QualityDirector();
    const reviewReports = quality.reviewEpisode({ episodePlan, shotList, characterSpecs, rig360Specs, actingPlans, cameraPlans, fxPlans });
    whatWasReal.push({ module: 'qualityDirector', whatWasDone: `Quality reports (${reviewReports.length}); итоговый скор: ${quality.scoreEpisode(reviewReports)}`, classification: 'planned' });

    // 11. Episode assembly
    const assembler = new EpisodeAssembler();
    const scenePlans = assembler.assembleScenePlans(episodePlan, characterSpecs, cameraPlans, fxPlans, actingPlans, lipsyncPlans, backgroundPlans);
    const renderPlan = assembler.generateRenderPlan(episodePlan, cameraPlans, fxPlans);
    whatWasReal.push({ module: 'episodeAssembler', whatWasDone: `Scene plans assembled (${scenePlans.length}) with acting/lipsync/background references`, classification: mode === 'real' ? 'assembled' : 'planned' });

    // 13. Final package
    const packager = new FinalPackager();
    const finalPackage = packager.assemble({
      prompt: input.prompt,
      mode,
      analysis,
      seriesBible,
      episodePlan,
      shotList,
      characterSpecs,
      rig360Specs,
      assetRequirements,
      actingPlans,
      lipsyncPlans,
      cameraPlans,
      fxPlans,
      backgroundPlans,
      renderPlan,
      reviewReports,
      scenePlans
    });
    whatWasReal.push({ module: 'finalPackager', whatWasDone: 'Собран production package', classification: 'assembled' });

    return {
      prompt: input.prompt,
      mode,
      analysis,
      seriesBible,
      episodePlan,
      shotList,
      characterSpecs,
      rig360Specs,
      assetRequirements,
      actingPlans,
      lipsyncPlans,
      cameraPlans,
      fxPlans,
      backgroundPlans,
      renderPlan,
      reviewReports,
      scenePlans,
      finalPackage,
      whatWasReal
    };
  }
}

// Backend integration helpers — only run when a backend feature flag is enabled.
async function enhanceScriptWithLlm(script: any, episodePlan: EpisodePlan, analysis: any): Promise<any> {
  const enhanced = { ...script, scenes: [...script.scenes], origin: 'planned' };
  for (const scene of enhanced.scenes) {
    const characters = scene.characters || [];
    if (characters.length === 0) continue;
    const prompt = `Scene "${scene.sceneName}" in ${scene.location || 'unknown location'}. Mood: ${scene.mood || 'neutral'}.`;
    const context = {
      location: scene.location,
      mood: scene.mood,
      durationFrames: scene.durationFrames,
      fps: episodePlan.fps
    };
    const result = await generateDialogue(prompt, characters, context);
    if (result.status === 'success' && result.dialogue.length > 0) {
      const beatNames = ['establish', 'setup', 'turn', 'punchline'];
      scene.dialogue = result.dialogue.map((line, idx) => ({
        speaker: line.speaker,
        text: line.text,
        beat: beatNames[idx % beatNames.length],
        emotion: emotionForBeat(idx, scene.mood),
        voiceLevel: voiceForBeat(idx, scene.mood)
      }));
      if (result.origin === 'real') enhanced.origin = 'real';
    }
  }
  return enhanced;
}

async function generateLipsyncAudio(lipsyncPlans: any[]): Promise<any[]> {
  return Promise.all(lipsyncPlans.map(async plan => {
    if (!plan.dialogues || plan.dialogues.length === 0) return plan;
    const enriched = { ...plan, generatedAudio: [] as any[], origin: config.backends.audio };
    for (const line of plan.dialogues) {
      if (!line.text) continue;
      const audio = await synthesizeDialogue(line.text, 'alloy');
      enriched.generatedAudio.push({
        speaker: line.speaker,
        text: line.text,
        path: audio.outputPath,
        origin: audio.origin,
        status: audio.status
      });
    }
    if (enriched.generatedAudio.every((a: any) => a.origin === 'real')) {
      enriched.missingAssets = (enriched.missingAssets || []).filter((m: string) => m !== 'recorded dialogue audio');
    }
    return enriched;
  }));
}

async function generateBackgroundArt(backgroundPlans: any[]): Promise<any[]> {
  return Promise.all(backgroundPlans.map(async plan => {
    const style = plan.style || 'animated series style';
    const result = await generateBackground(plan.location, style);
    return {
      ...plan,
      imagePath: result.outputPath,
      imageOrigin: result.origin,
      imageStatus: result.status,
      imagePrompt: result.prompt
    };
  }));
}

function emotionForBeat(beat: number, mood: string): string {
  const base = ['neutral', 'curious', 'alarmed', 'shock'];
  if (mood === 'establish') return base[0];
  if (mood === 'climax') return base[3];
  return base[beat % base.length];
}

function voiceFromBeat(beat: number, mood: string): 'whisper' | 'normal' | 'loud' | 'shout' | 'silent' {
  if (mood === 'climax' && beat === 3) return 'shout';
  if (beat === 0) return 'normal';
  return beat >= 2 ? 'loud' : 'normal';
}

function voiceForBeat(beat: number, mood: string): 'whisper' | 'normal' | 'loud' | 'shout' | 'silent' {
  return voiceFromBeat(beat, mood);
}

// Heuristic helpers — these are deterministic prompt parsers, NOT LLMs.
// They produce a structured baseline; an LLM could be swapped in later.
function encryptLogLine(prompt: string): string {
  const trimmed = prompt.replace(/\s+/g, ' ').trim();
  return trimmed.length > 200 ? `${trimmed.slice(0, 197)}...` : trimmed;
}

function detectGenre(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (/sci[- ]?fi|науч|космо|робот|иноплан/.test(lower)) return 'sci-fi comedy';
  if (/фэнтези|магия|дракон|фея/.test(lower)) return 'fantasy';
  if (/хоррор|жутк|страшн|монстр/.test(lower)) return 'horror comedy';
  if (/детектив|криминал|расслед/.test(lower)) return 'detective';
  return 'slice-of-life comedy';
}

function detectTone(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (/драмат|серьёзн|тяжел/.test(lower)) return 'dramatic';
  if (/дарк|тёмн|кайджи|киберпанк/.test(lower)) return 'dark';
  return 'comedic';
}

function detectSetting(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (/лаборатор|научн/.test(lower)) return 'научная лаборатория';
  if (/школ|универс|студент/.test(lower)) return 'учебное заведение';
  if (/космо|станци|корабл/.test(lower)) return 'космическая станция';
  if (/город|улиц|квартир/.test(lower)) return 'городская квартира';
  return 'универсальный сеттинг';
}

function detectAudience(prompt: string): string | undefined {
  const lower = prompt.toLowerCase();
  if (/детск|семейн/.test(lower)) return 'family';
  if (/взросл/.test(lower)) return 'adult';
  if (/подрост|тинейдж|teen/.test(lower)) return 'teen';
  return undefined;
}

function parseCandidateCharacters(prompt: string): AnalysisResult['candidateCharacters'] {
  const lower = prompt.toLowerCase();
  const candidates: AnalysisResult['candidateCharacters'] = [];

  if (/профессор|professor/.test(lower)) {
    candidates.push({ name: 'Professor Vex', role: 'безумный учёный-наставник', oneLine: 'блестящий, хаотичный, театральный' });
  }
  if (/студент|student/.test(lower)) {
    candidates.push({ name: 'Sam', role: 'нервный студент-ассистент', oneLine: 'напряжённый, ответственный, на грани срыва' });
  }
  if (/робот|robot|android/.test(lower)) {
    candidates.push({ name: 'Unit-7', role: 'лабораторный ассистент-робот', oneLine: 'буквальный, невозмутимый, сухой юмор' });
  }
  if (candidates.length === 0) {
    candidates.push({ name: 'Hero', role: 'главный герой', oneLine: 'определяется на этапе сценария' });
  }
  return candidates;
}

function parseThemes(prompt: string): string[] {
  const themes: string[] = [];
  if (/наук|научн/.test(prompt)) themes.push('ethics of science');
  if (/дружб|friend/.test(prompt)) themes.push('friendship under pressure');
  if (/комеди|comedy/.test(prompt)) themes.push('comedic contrast');
  if (themes.length === 0) themes.push('coming of age');
  return themes;
}