import { z } from 'zod';
import fs from 'fs';
import path from 'path';

import {
  sceneUnderstandingSchema,
  directorVariantSetSchema,
  SCENE_INTELLIGENCE_SCHEMA_VERSION
} from '../schemas/sceneIntelligence.js';
import { SceneUnderstandingEngine } from '../adapters/sceneUnderstanding/index.js';
import { ScriptDirector, ALL_STRATEGIES } from '../adapters/scriptDirector/index.js';
import { SceneIntelligenceReportBuilder } from '../adapters/sceneIntelligenceReport/index.js';
import { verifyPathAccess, HarmonyError } from '../security.js';
import { config } from '../config.js';
import { voiceAnalysisSchema, performancePlanSchema, performanceStyleSchema, VOICE_PERFORMANCE_SCHEMA_VERSION } from '../schemas/voicePerformance.js';
import { VoicePerformanceAnalyzer } from '../adapters/voicePerformanceAnalyzer/index.js';
import { PerformanceGenerator, ALL_PERFORMANCE_STYLES } from '../adapters/performanceGenerator/index.js';
import { VoicePerformanceReportBuilder } from '../adapters/voicePerformanceReport/index.js';
import { DigitalActorRegistry } from '../adapters/digitalActorRegistry/index.js';
import { KeyPoseGenerator } from '../adapters/keyPoseGenerator/index.js';
import { MotionSynthesizer } from '../adapters/motionSynthesizer/index.js';
import { keyPoseSetSchema } from '../schemas/keyPoseMotion.js';
import { CharacterPartDecomposer } from '../adapters/characterPartDecomposer/index.js';
import { RepresentationRouterV3 } from '../adapters/representationRouterV3/index.js';
import { partDecompositionSchema } from '../schemas/partDecomposition.js';
import { routingPlanSchema } from '../schemas/representationRouter.js';
import { CameraLayoutDirector } from '../adapters/cameraLayoutDirector/index.js';
import { cameraLayoutPlanSchema } from '../schemas/cameraLayout.js';
import { AnimationCritic } from '../adapters/animationCritic/index.js';
import { VariantTournament } from '../adapters/variantTournament/index.js';

/**
 * AI Animation Studio — MCP tools (Master Prompt §20, §21).
 * Iteration 1 ships the Scene Intelligence layer:
 *   - harmony.ai_studio.analyze_scene
 *   - harmony.ai_studio.generate_director_variants
 *
 * Later iterations add build_digital_actor, generate_key_poses, synthesize_motion,
 * critique_variant, run_variant_tournament, etc.
 */

const characterInputSchema = z.object({
  name: z.string().min(1),
  characterId: z.string().optional(),
  role: z.enum(['protagonist', 'antagonist', 'supporting', 'background', 'unknown']).optional(),
  stance: z.enum(['standing', 'sitting', 'lying', 'moving', 'unknown']).optional(),
  visibleOnScreen: z.boolean().optional()
}).strict();

const dialogueLineInputSchema = z.object({
  speaker: z.string().min(1),
  text: z.string().min(1),
  startSec: z.number().min(0).optional(),
  endSec: z.number().min(0).optional()
}).strict();

const analyzeSceneSchema = z.object({
  script: z.string().min(1).describe(
    'Текст сцены. Поддерживаются два формата: (1) многострочный сценарий с ' +
    'аттрибуцией строк вида "Masha: ..." или "- Ivan: ..."; (2) цельный прозаический ' +
    'фрагмент — строки без аттрибуции станут ambient beats.'
  ),
  sceneName: z.string().optional().describe('Имя сцены (используется в отчёте и будущих манифестах).'),
  sceneId: z.string().optional().describe('Идентификатор сцены. Если опущено — будет scene_auto.'),
  fps: z.number().positive().max(120).default(24),
  durationSeconds: z.number().positive().max(600).default(6),
  characters: z.array(characterInputSchema).min(1).describe(
    'Список участников сцены с именами. role/stance — опциональные подсказки; ' +
    'движок выведет их сам, если опущены.'
  ),
  dialogue: z.array(dialogueLineInputSchema).optional().describe(
    'Явный тайминг реплик — атрибуция и текст строк. Если опущено, движок попытается ' +
    'разобрать строки из script регуляркой.'
  ),
  location: z.string().optional(),
  directorConstraints: z.array(z.string()).optional().describe(
    'Режиссёрские ограничения, которые фиксируются в continuity_constraints и ' +
    'помечаются как locked. Например: "Не уводить камеру с Саши в первом бите".'
  ),
  reportDir: z.string().optional().describe(
    'Каталог под HARMONY_ALLOWED_ROOTS для записи HTML-отчёта. Если опущено — ' +
    'отчёт не сохраняется на диск, а только возвращается в результате.'
  )
}).strict();

const generateVariantsSchema = z.object({
  sceneUnderstanding: sceneUnderstandingSchema.optional().describe(
    'Ранее вычисленное SceneUnderstanding. Если опущено — script/characters/dialogue ' +
    'будут выполнены заново через analyze_scene.'
  ),
  // Fallback path: re-run analyze inline if sceneUnderstanding not supplied.
  script: z.string().min(1).optional(),
  sceneName: z.string().optional(),
  sceneId: z.string().optional(),
  fps: z.number().positive().max(120).default(24),
  durationSeconds: z.number().positive().max(600).default(6),
  characters: z.array(characterInputSchema).optional(),
  dialogue: z.array(dialogueLineInputSchema).optional(),
  location: z.string().optional(),
  directorConstraints: z.array(z.string()).optional(),
  count: z.number().int().min(1).max(8).default(3).describe('Сколько вариантов создать.'),
  strategies: z.array(z.enum([
    'restrained_dialogue', 'commercial_dynamic', 'dramatic_closeup',
    'comedic_timing', 'anime_limited', 'theatrical_staging', 'single_take', 'custom'
  ])).optional().describe(
    'Явный список стратегий для вариантов. Если опущено — используются первые `count` ' +
    'дефолтных стратегий ScriptDirector.defaultStrategies | ALL_STRATEGIES.'
  ),
  reportDir: z.string().optional()
}).strict();

const analyzeVoiceSchema = z.object({
  audioPath: z.string().optional().describe('Путь к WAV PCM/float под HARMONY_ALLOWED_ROOTS.'),
  transcript: z.string().min(1),
  durationSeconds: z.number().positive().max(600).optional().describe('Нужно для режима без аудио.'),
  language: z.string().default('ru'),
  speaker: z.string().default('speaker_1'),
  emotionHints: z.array(z.string()).optional()
}).strict();

const generatePerformancesSchema = z.object({
  sceneUnderstanding: sceneUnderstandingSchema,
  voiceAnalysis: voiceAnalysisSchema,
  characterId: z.string().min(1),
  count: z.number().int().min(1).max(7).default(3),
  styles: z.array(performanceStyleSchema).optional(),
  reportDir: z.string().optional()
}).strict();

const mixPerformanceSchema = z.object({
  acting: performancePlanSchema,
  gestureTiming: performancePlanSchema,
  finalPose: performancePlanSchema
}).strict();

const buildDigitalActorSchema = z.object({
  name: z.string().min(1).describe('Имя персонажа.'),
  sourceType: z.enum(['manifest', 'psd', 'svg', 'png_dir', 'harmony_template', 'harmony_scene']).describe('Тип источника.'),
  sourcePath: z.string().min(1).describe('Путь к источнику под HARMONY_ALLOWED_ROOTS.'),
  outputDir: z.string().optional().describe('Каталог для сохранения (под HARMONY_ALLOWED_ROOTS).')
}).strict();

const generateKeyPosesSchema = z.object({
  sceneUnderstanding: sceneUnderstandingSchema,
  performancePlan: performancePlanSchema,
  actorId: z.string().min(1).describe('Идентификатор Digital Actor персонажа.'),
  outputDir: z.string().optional().describe('Каталог с реестром акторов для загрузки актора (под HARMONY_ALLOWED_ROOTS).')
}).strict();

const synthesizeMotionSchema = z.object({
  sceneUnderstanding: sceneUnderstandingSchema,
  keyPoseSet: keyPoseSetSchema,
  actorId: z.string().min(1).describe('Идентификатор Digital Actor персонажа.'),
  tolerance: z.number().optional().default(0.05).describe('Порог сжатия (key reduction tolerance).'),
  outputDir: z.string().optional()
}).strict();

const engine = new SceneUnderstandingEngine();
const director = new ScriptDirector();
const reportBuilder = new SceneIntelligenceReportBuilder();
const voiceAnalyzer = new VoicePerformanceAnalyzer();
const performanceGenerator = new PerformanceGenerator();
const voiceReportBuilder = new VoicePerformanceReportBuilder();
const keyPoseGenerator = new KeyPoseGenerator();
const motionSynthesizer = new MotionSynthesizer();

export const aiStudioTools = [
  {
    name: 'harmony.ai_studio.analyze_scene',
    description:
      'Scene Understanding Engine (Iteration 1). Принимает текст сцены, реплики, персонажей ' +
      'и возвращает структуру: sceneIntent, dramatic beats, action/reaction beats, emotion ' +
      'curve, attention targets, continuity, assumptions и uncertainties. Rule-based baseline, ' +
      'без LLM. Возвращает валидный SceneUnderstanding (Zod) и опционально пишет HTML-отчёт.',
    inputSchema: analyzeSceneSchema,
    handler: async (args: any) => {
      const scene = engine.analyze({
        script: args.script,
        sceneName: args.sceneName,
        sceneId: args.sceneId,
        fps: args.fps,
        durationSeconds: args.durationSeconds,
        characters: args.characters,
        dialogue: args.dialogue,
        location: args.location,
        directorConstraints: args.directorConstraints
      });
      let reportPath: string | undefined;
      if (args.reportDir) {
        const dir = verifyPathAccess(args.reportDir);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        reportPath = reportBuilder.buildToFile(
          { scene, variantSet: director.generateVariants(scene, Math.min(3, ALL_STRATEGIES.length)) },
          path.join(dir, `${scene.sceneId}_scene_intelligence.html`)
        );
      }
      return {
        status: 'success',
        schemaVersion: SCENE_INTELLIGENCE_SCHEMA_VERSION,
        sceneId: scene.sceneId,
        sceneName: scene.sceneName,
        sceneIntent: scene.sceneIntent,
        sceneIntentConfidence: scene.sceneIntentConfidence,
        characterCount: scene.characters.length,
        beatCount: scene.beats.length,
        emotionSampleCount: scene.emotionCurve.length,
        attentionTargetCount: scene.attentionTargets.length,
        assumptionCount: scene.assumptions.length,
        uncertaintyCount: scene.uncertainties.length,
        availableStrategies: ALL_STRATEGIES,
        reportPath,
        sceneUnderstanding: scene,
        provenance: scene.provenance,
        honestLimitations: {
          authorialIntentNotRecoverable: true,
          unshownAngleIsGenerated: true,
          emotionProxyNotAbsoluteTruth: true,
          complexPerformanceRequiresFallback: true,
          noHarmonyProvesNativeTvg: false
        }
      };
    }
  },
  {
    name: 'harmony.ai_studio.generate_director_variants',
    description:
      'AI Director (Iteration 1). Принимает ранее вычисленное SceneUnderstanding (или набор ' +
      '(scene входных параметров) и генерирует >=3 режиссёрских варианта отличающихся ' +
      'стратегией (restrained_dialogue, commercial_dynamic, dramatic_closeup, ...). ' +
      'Каждый вариант = shot decomposition + blocking + camera + attention + edit decisions. ' +
      'Rule-based, без LLM. Возвращает DirectorVariantSet (Zod-валидный) и опционально HTML.',
    inputSchema: generateVariantsSchema,
    handler: async (args: any) => {
      let scene = args.sceneUnderstanding;
      if (!scene) {
        if (!args.script || !args.characters || args.characters.length === 0) {
          throw new HarmonyError('INVALID_HARMONY_OBJECT',
            'generate_director_variants: требуется либо sceneUnderstanding, либо (script + characters + dialogue).');
        }
        scene = engine.analyze({
          script: args.script,
          sceneName: args.sceneName,
          sceneId: args.sceneId,
          fps: args.fps,
          durationSeconds: args.durationSeconds,
          characters: args.characters,
          dialogue: args.dialogue,
          location: args.location,
          directorConstraints: args.directorConstraints
        });
      }
      const sceneObj = sceneUnderstandingSchema.parse(scene);
      const strategies = args.strategies?.slice(0, args.count) ?? ScriptDirector.defaultStrategies().slice(0, args.count);
      const variantSet = director.generateVariants(sceneObj, args.count, strategies);
      let reportPath: string | undefined;
      if (args.reportDir) {
        const dir = verifyPathAccess(args.reportDir);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        reportPath = reportBuilder.buildToFile({ scene: sceneObj, variantSet },
          path.join(dir, `${sceneObj.sceneId}_scene_intelligence.html`));
      }
      return {
        status: 'success',
        schemaVersion: SCENE_INTELLIGENCE_SCHEMA_VERSION,
        sceneId: sceneObj.sceneId,
        strategyCount: variantSet.strategyCount,
        strategies: variantSet.variants.map((p) => ({
          strategy: p.strategy,
          shotCount: p.shotCount,
          reactionShotCount: p.reactionShotCount,
          confidence: p.confidence,
          planId: p.planId
        })),
        variantSet,
        reportPath,
        provenance: {
          engine: 'rule_based ScriptDirector v1',
          createdAt: new Date().toISOString()
        }
      };
    }
  },
  {
    name: 'harmony.ai_studio.analyze_voice',
    description: 'Voice-to-Performance CPU baseline (Iteration 2). Разбирает WAV и текст: слова, приблизительные фонемы, паузы, энергию, pitch, темп, дыхание и акценты. Эмоциональные пики всегда помечены как предположение.',
    inputSchema: analyzeVoiceSchema,
    handler: async (args: any) => {
      const audioPath = args.audioPath ? verifyPathAccess(args.audioPath) : undefined;
      const analysis = voiceAnalyzer.analyze({ ...args, audioPath });
      return { status:'success', schemaVersion:VOICE_PERFORMANCE_SCHEMA_VERSION, analysis, honestLimitations:{ alignmentIsApproximate:true, emotionIsProxy:true, phonemesAreGraphemeGroups:true } };
    }
  },
  {
    name: 'harmony.ai_studio.generate_performances',
    description: 'AI Actor baseline (Iteration 2). Создаёт разные варианты поз, взгляда, жестов, моргания, дыхания, переноса веса, реакций и holds из SceneUnderstanding и анализа голоса.',
    inputSchema: generatePerformancesSchema,
    handler: async (args: any) => {
      const scene=sceneUnderstandingSchema.parse(args.sceneUnderstanding), voice=voiceAnalysisSchema.parse(args.voiceAnalysis);
      const set=performanceGenerator.generateVariants(scene,voice,args.characterId,args.count,args.styles);
      let reportPath:string|undefined; if(args.reportDir){const dir=verifyPathAccess(args.reportDir);reportPath=voiceReportBuilder.buildToFile(set,path.join(dir,`${scene.sceneId}_${args.characterId}_performance.html`));}
      return {status:'success',schemaVersion:VOICE_PERFORMANCE_SCHEMA_VERSION,availableStyles:ALL_PERFORMANCE_STYLES,variantCount:set.variants.length,variantSet:set,reportPath,honestLimitations:{plansAreNotFinalAnimation:true,emotionIsProxy:true,harmonyApplied:false}};
    }
  },
  {
    name: 'harmony.ai_studio.mix_performance',
    description: 'Смешивает общую игру из одного варианта, тайминг жестов из второго и позы из третьего.',
    inputSchema: mixPerformanceSchema,
    handler: async (args:any) => ({status:'success',schemaVersion:VOICE_PERFORMANCE_SCHEMA_VERSION,performance:performanceGenerator.mix(args.acting,args.gestureTiming,args.finalPose)})
  },
  {
    name: 'harmony.ai_studio.build_digital_actor',
    description: 'Digital Actor baseline (Iteration 3). Импортирует персонажа из PSD, SVG, PNG layers, Harmony template, Harmony scene или reconstruction manifest. Проверяет полноту ассета, вычисляет pivots и строит Zod-валидный DigitalActor.',
    inputSchema: buildDigitalActorSchema,
    handler: async (args: any) => {
      const sourcePath = verifyPathAccess(args.sourcePath);
      const outputDir = args.outputDir ? verifyPathAccess(args.outputDir) : undefined;
      const registry = new DigitalActorRegistry(outputDir);
      
      let actor: any;
      if (args.sourceType === 'manifest') {
        actor = registry.importFromReconstructionManifest(sourcePath, args.name);
      } else {
        actor = registry.importFromFile(args.sourceType, sourcePath, args.name);
      }
      
      const validation = registry.validate(actor);
      let regResult = null;
      if (validation.valid) {
        regResult = registry.register(actor);
      }
      
      return {
        status: validation.valid ? 'success' : 'failed',
        schemaVersion: actor.schemaVersion,
        actorId: actor.actorId,
        valid: validation.valid,
        validation,
        actor,
        filePath: regResult?.filePath || null,
        sha256: regResult?.sha256 || null,
        honestLimitations: {
          viewsInferred: true,
          hierarchyRequiresVerification: true,
          noHarmonyProvesNativeTvg: false
        }
      };
    }
  },
  {
    name: 'harmony.ai_studio.generate_key_poses',
    description: 'Key Pose Generator baseline (Iteration 4). Планирует позы (key, breakdown, extreme, anticipation, overshoot, settle, hold) для Digital Actor на основе сценария и плана игры.',
    inputSchema: generateKeyPosesSchema,
    handler: async (args: any) => {
      const registry = new DigitalActorRegistry(args.outputDir ? verifyPathAccess(args.outputDir) : undefined);
      const actor = registry.getActor(args.actorId);
      const poseSet = keyPoseGenerator.generate(args.sceneUnderstanding, args.performancePlan, actor);
      return {
        status: 'success',
        sceneId: args.sceneUnderstanding.sceneId,
        poseCount: poseSet.poses.length,
        poseSet,
        honestLimitations: {
          skeletonsAre2D: true,
          drawingsAreFitted: true,
          noHarmonyProvesNativeTvg: false
        }
      };
    }
  },
  {
    name: 'harmony.ai_studio.synthesize_motion',
    description: 'Motion Synthesizer baseline (Iteration 4). Интерполирует движения частей тела между позами, строит траектории и тайминги, производит keyframe reduction с заданной погрешностью.',
    inputSchema: synthesizeMotionSchema,
    handler: async (args: any) => {
      const registry = new DigitalActorRegistry(args.outputDir ? verifyPathAccess(args.outputDir) : undefined);
      const actor = registry.getActor(args.actorId);
      const motionPlan = motionSynthesizer.synthesize(args.sceneUnderstanding, args.keyPoseSet, actor, args.tolerance);
      return {
        status: 'success',
        sceneId: args.sceneUnderstanding.sceneId,
        trackCount: motionPlan.tracks.length,
        motionPlan,
        honestLimitations: {
          motionIsFactorized: true,
          keyReductionIsApproximate: true,
          harmonyApplied: false
        }
      };
    }
  },
  {
    name: 'harmony.ai_studio.decompose_character_parts',
    description: 'Character Part Decomposition (Iteration 5). Разбивает персонажа на устойчивые части (head, torso, arms, legs и т.д.), строит occlusion graph, определяет motion clusters и проблемные диапазоны.',
    inputSchema: z.object({
      characterId: z.string().min(1),
      frameCount: z.number().int().positive(),
      fps: z.number().positive().optional(),
      bodyType: z.enum(['humanoid', 'quadruped', 'creature', 'object', 'unknown']).optional()
    }).strict(),
    handler: async (args: any) => {
      const decomposer = new CharacterPartDecomposer();
      const result = decomposer.decompose(args);
      return {
        status: 'success',
        characterId: args.characterId,
        partCount: result.parts.length,
        decomposition: result,
        honestLimitations: {
          cpuHeuristicBaseline: true,
          noMlSegmenterConnected: true,
          partsAreEstimated: !args.frameRegions
        }
      };
    }
  },
  {
    name: 'harmony.ai_studio.route_representations',
    description: 'Representation Router V3 (Iteration 5). Для каждой части персонажа выбирает оптимальное представление (Peg, Curve Deformer, Envelope, Bone, Drawing Substitution, frame-by-frame) на основе motion analysis, silhouette change, occlusion и studio profile.',
    inputSchema: z.object({
      characterId: z.string().min(1),
      sceneId: z.string().min(1),
      decomposition: partDecompositionSchema,
      studioProfile: z.object({
        preferredRepresentation: z.enum(['peg_transform', 'curve_deformer', 'envelope_deformer', 'bone_deformer', 'drawing_substitution', 'frame_by_frame_vector', 'raster_texture_layer', 'reference_only']).optional(),
        maxDeformersPerPart: z.number().int().positive().optional(),
        editabilityPriority: z.number().min(0).max(1).optional(),
        frameByFrameAllowed: z.boolean().optional()
      }).optional(),
      artistLocks: z.record(z.enum(['peg_transform', 'curve_deformer', 'envelope_deformer', 'bone_deformer', 'drawing_substitution', 'frame_by_frame_vector', 'raster_texture_layer', 'reference_only'])).optional()
    }).strict(),
    handler: async (args: any) => {
      const router = new RepresentationRouterV3();
      const plan = router.route(args);
      return {
        status: 'success',
        characterId: args.characterId,
        decisionCount: plan.decisions.length,
        routingPlan: plan,
        honestLimitations: {
          routingIsHeuristic: true,
          noStudioProfileTrained: true,
          harmonyApplied: false
        }
      };
    }
  },
  {
    name: 'harmony.ai_studio.generate_camera_plan',
    description: 'Camera & Layout Director (Iteration 6). Генерирует shot plan, blocking, camera keys и continuity checks на основе SceneUnderstanding.',
    inputSchema: z.object({
      sceneUnderstanding: sceneUnderstandingSchema,
      fps: z.number().positive().optional(),
      style: z.enum(['restrained', 'dynamic', 'dramatic', 'comedic']).optional()
    }).strict(),
    handler: async (args: any) => {
      const director = new CameraLayoutDirector();
      const plan = director.generate(args);
      return {
        status: 'success',
        sceneId: args.sceneUnderstanding.sceneId,
        shotCount: plan.shots.length,
        cameraPlan: plan,
        honestLimitations: {
          ruleBasedBaseline: true,
          noMlDirector: true,
          harmonyApplied: false
        }
      };
    }
  },
  {
    name: 'harmony.ai_studio.critique_variant',
    description: 'Animation Critic (Iteration 7). Запускает technical и artistic checks на variant, возвращает critic report с scores и recommendations.',
    inputSchema: z.object({
      variantId: z.string().min(1),
      sceneId: z.string().min(1),
      sceneUnderstanding: sceneUnderstandingSchema.optional(),
      cameraLayout: cameraLayoutPlanSchema.optional(),
      keyPoses: keyPoseSetSchema.optional(),
      motionTracks: z.any().optional(),
      partDecomposition: partDecompositionSchema.optional(),
      routingPlan: routingPlanSchema.optional(),
      voiceAnalysis: voiceAnalysisSchema.optional(),
      performancePlan: performancePlanSchema.optional()
    }).strict(),
    handler: async (args: any) => {
      const critic = new AnimationCritic();
      const report = critic.critique(args);
      return {
        status: 'success',
        variantId: args.variantId,
        passed: report.passed,
        overallScore: report.overallScore,
        technicalScore: report.technicalScore,
        artisticScore: report.artisticScore,
        criticalIssues: report.criticalIssues,
        highIssues: report.highIssues,
        humanReviewRequired: report.humanReviewRequired,
        criticReport: report,
        honestLimitations: {
          ruleBasedBaseline: true,
          noMlCritic: true,
          artisticScoresAreProxy: true
        }
      };
    }
  },
  {
    name: 'harmony.ai_studio.run_variant_tournament',
    description: 'Variant Tournament (Iteration 7). Запускает multi-round tournament для выбора лучшего variant из нескольких. Включает technical gate, artistic ranking, refinement и final selection.',
    inputSchema: z.object({
      sceneId: z.string().min(1),
      variants: z.array(z.object({
        variantId: z.string().min(1),
        variantName: z.string().min(1),
        variantType: z.enum(['director', 'performance', 'combined']),
        criticInput: z.object({
          variantId: z.string(),
          sceneId: z.string(),
          sceneUnderstanding: sceneUnderstandingSchema.optional(),
          cameraLayout: cameraLayoutPlanSchema.optional(),
          keyPoses: keyPoseSetSchema.optional(),
          motionTracks: z.any().optional(),
          partDecomposition: partDecompositionSchema.optional(),
          routingPlan: routingPlanSchema.optional(),
          voiceAnalysis: voiceAnalysisSchema.optional(),
          performancePlan: performancePlanSchema.optional()
        }).strict(),
        metadata: z.record(z.any()).optional()
      }).strict()).min(2),
      budget: z.object({
        maxVariants: z.number().int().positive(),
        maxComputeTimeMs: z.number().int().positive(),
        maxGpuMemoryMb: z.number().int().positive().optional(),
        maxRefinementRounds: z.number().int().nonnegative(),
        maxPreviewResolution: z.string().optional()
      }).strict()
    }).strict(),
    handler: async (args: any) => {
      const tournament = new VariantTournament();
      const result = tournament.run(args);
      return {
        status: 'success',
        tournamentId: result.tournamentId,
        sceneId: result.sceneId,
        roundCount: result.rounds.length,
        winner: result.winner ? {
          variantId: result.winner.variantId,
          variantName: result.winner.variantName,
          finalScore: result.winner.finalScore
        } : null,
        finalistCount: result.finalists.length,
        totalComputeTimeMs: result.totalComputeTimeMs,
        tournament: result,
        honestLimitations: {
          ruleBasedBaseline: true,
          noMlTournament: true,
          refinementIsSimulated: true
        }
      };
    }
  }
];
