import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { ShowBibleLoader } from '../services/showBibleLoader/index.js';
import { ShotManifestCompiler } from '../services/shotManifestCompiler/index.js';
import { EpisodeBatchCompiler } from '../services/episodeBatchCompiler/index.js';
import { LlmDirector } from '../services/llmDirector/index.js';
import { SeasonDirector } from '../services/seasonDirector/index.js';
import { SeriesMemoryStore } from '../services/seriesMemory/index.js';
import { OpenRouterClient } from '../services/openRouterClient/index.js';
import { episodeBatchSchema } from '../schemas/episodeBatch.js';
import { performancePirSchema } from '../schemas/performancePir.js';
import type { ShotManifest } from '../schemas/shotManifest.js';

/**
 * harmony.factory.compile_shot
 *
 * Compiles a ShotManifest into a PerformancePIR, gated by the ShowBible
 * family. The LLM director is only allowed to make decisions that are
 * declared in the ShowBible; any unknown shot size / camera move / emotion /
 * character is a hard rejection.
 *
 * Roadmap contract (see ROADMAP.md):
 *   script -> ShotManifest -> PerformancePIR -> HarmonyCommandPlan
 */

const loader = new ShowBibleLoader();
const compiler = new ShotManifestCompiler();
const batchCompiler = new EpisodeBatchCompiler();

export const factoryCompilerTools = [
  {
    name: 'harmony.factory.compile_shot',
    description:
      'Компилировать ShotManifest в PerformancePIR с проверкой против ShowBible. ' +
      'Любой неизвестный shot size / camera move / emotion / character — жёсткий отказ. ' +
      'LLM-режиссёр может принимать решения только внутри ShowBible.',
    inputSchema: z.object({
      showBiblePath: z.string().describe('Путь к show_bible.json (остальные 5 документов грузятся по ссылкам).'),
      shotManifest: z.record(z.any()).describe('Объект shot_manifest.json.')
    }),
    handler: async (args: { showBiblePath: string; shotManifest: ShotManifest }) => {
      const loaded = loader.load(args.showBiblePath);
      const controllerMaps = loader.buildControllerMaps(loaded);
      const { performance, violations, warnings } = compiler.compile(
        args.shotManifest,
        loaded.crossRefs,
        { controllerMaps }
      );

      const pirParse = performancePirSchema.safeParse(performance);
      if (!pirParse.success) {
        return {
          status: 'error',
          executed: false,
          verified: false,
          violations,
          warnings,
          message: 'PerformancePIR failed schema validation after compile',
          errors: pirParse.error.issues
        };
      }

      if (violations.length > 0) {
        return {
          status: 'rejected',
          executed: false,
          verified: true,
          violations,
          warnings,
          showBible: {
            showId: loaded.showBible.showId,
            allowedShotSizes: loaded.crossRefs.cameraRules?.allowedShotSizes,
            allowedCameraMoves: loaded.crossRefs.cameraRules?.allowedCameraMoves,
            allowedEmotions: loaded.crossRefs.motionGrammar?.allowedEmotions,
            characterIds: loaded.crossRefs.characterIds
          },
          message: 'ShotManifest rejected: it references moves/emotions/characters not declared in the ShowBible.'
        };
      }

      return {
        status: 'success',
        executed: true,
        verified: true,
        violations,
        warnings,
        performancePIR: performance,
        showBible: {
          showId: loaded.showBible.showId,
          title: loaded.showBible.title
        },
        message: `Shot "${args.shotManifest.shotId}" compiled to PerformancePIR "${performance.performanceId}".`
      };
    }
  },
  {
    name: 'harmony.factory.direct_episode',
    description:
      'Промпт/сценарий -> EpisodeBatch через LLM-режиссёра (только OpenRouter :free модели), ' +
      'с жёсткой проверкой словаря ShowBible, затем компиляция всего эпизода в PerformancePIR + CommandPlan V4. ' +
      'Любое значение вне ShowBible — отказ с указанием точного нарушения. Ничего не выдумывается.',
    inputSchema: z.object({
      showBiblePath: z.string().describe('Путь к show_bible.json (словарь-гейт).'),
      script: z.string().min(20).describe('Сценарий или краткий бриф эпизода.'),
      episodeId: z.string().default('E01'),
      production: z.string().default('polygon_show'),
      director: z.string().default('openrouter_free_llm')
    }),
    handler: async (args: {
      showBiblePath: string;
      script: string;
      episodeId?: string;
      production?: string;
      director?: string;
    }) => {
      const director = new LlmDirector(loader, new OpenRouterClient());
      const directed = await director.directEpisode(
        {
          script: args.script,
          episodeId: args.episodeId,
          production: args.production,
          director: args.director
        },
        args.showBiblePath
      );

      if (directed.status !== 'ok' || !directed.episodeBatch) {
        return {
          status: 'refused',
          executed: false,
          verified: true,
          refusals: directed.refusals,
          meta: directed.meta,
          message: 'LLM director refused: model output left the approved ShowBible vocabulary or was unusable.'
        };
      }

      const loaded = loader.load(args.showBiblePath);
      const controllerMaps = loader.buildControllerMaps(loaded);
      const result = batchCompiler.compile(directed.episodeBatch, loaded.crossRefs, { controllerMaps });

      if (result.status !== 'compiled') {
        return {
          status: 'rejected',
          executed: false,
          verified: true,
          rejections: result.rejections,
          meta: directed.meta,
          message: 'Directed batch failed the compiler cross-reference gate.'
        };
      }

      const pirValid = result.shots.every(s => performancePirSchema.safeParse(s.performance).success);
      return {
        status: 'success',
        executed: true,
        verified: pirValid,
        meta: directed.meta,
        warnings: directed.warnings,
        episodeBatch: directed.episodeBatch,
        totals: result.totals,
        episodeContentDigest: result.episodeContentDigest,
        perShot: result.shots.map(s => ({
          shotId: s.spec.shotId,
          performanceId: s.performance.performanceId,
          keyframes: s.performance.tracks.reduce((n, t) => n + t.keys.length, 0),
          commands: s.commandPlan.commands.length
        })),
        message: `Episode "${directed.episodeBatch.episodeId}" directed and compiled: ${result.totals.shots} shots, ${result.totals.commands} commands.`
      };
    }
  },
  {
    name: 'harmony.factory.direct_season',
    description:
      'Один промпт -> сезон из N серий (2-6) с памятью шоу: каждая следующая серия получает ' +
      'контекст предыдущих (логлайны + состояние персонажей), компилируется в планы, ' +
      'записывается в output/series_memory/. Любой отказ словаря ShowBible честно останавливает сезон.',
    inputSchema: z.object({
      showBiblePath: z.string().describe('Путь к show_bible.json (словарь-гейт).'),
      script: z.string().min(20).describe('Сценарий/бриф сезона.'),
      episodeCount: z.number().int().min(1).max(6).default(2),
      production: z.string().default('polygon_show'),
      director: z.string().default('openrouter_free_llm')
    }),
    handler: async (args: {
      showBiblePath: string;
      script: string;
      episodeCount?: number;
      production?: string;
      director?: string;
    }) => {
      const client = new OpenRouterClient();
      const memoryRoot = path.join(process.cwd(), 'output');
      const season = new SeasonDirector(
        new LlmDirector(loader, client),
        new SeriesMemoryStore(memoryRoot),
        client
      );
      const gestureLibraries = ['fixtures/show_bible/gesture_tracks_mira.json', 'fixtures/gesture_library/gesture_library_v2.json']
        .filter(f => fs.existsSync(f))
        .map(f => JSON.parse(fs.readFileSync(f, 'utf8')));

      const result = await season.directSeason(
        {
          script: args.script,
          episodeCount: args.episodeCount ?? 2,
          production: args.production,
          director: args.director
        },
        args.showBiblePath,
        gestureLibraries
      );

      return {
        status: result.status,
        executed: result.completedEpisodes > 0,
        verified: true,
        completedEpisodes: result.completedEpisodes,
        requestedEpisodes: result.requestedEpisodes,
        episodes: result.episodes,
        seasonDigest: result.seasonDigest,
        warnings: result.warnings,
        message:
          result.status === 'completed'
            ? `Season compiled: ${result.completedEpisodes} episodes, digest ${result.seasonDigest}.`
            : `Season stopped early: ${result.completedEpisodes}/${result.requestedEpisodes} episodes compiled.`
      };
    }
  }
];