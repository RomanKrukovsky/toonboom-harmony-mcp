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

const engine = new SceneUnderstandingEngine();
const director = new ScriptDirector();
const reportBuilder = new SceneIntelligenceReportBuilder();

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
  }
];