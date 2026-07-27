import { z } from 'zod';
import { ShowBibleLoader } from '../services/showBibleLoader/index.js';
import { ShotManifestCompiler } from '../services/shotManifestCompiler/index.js';
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
  }
];