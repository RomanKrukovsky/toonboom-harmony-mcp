import { z } from 'zod';
import { SeriesPlanner } from '../adapters/seriesPlanner/index.js';
import { EpisodePlanner } from '../adapters/episodePlanner/index.js';
import { ShotPlanner } from '../adapters/shotPlanner/index.js';
import { CharacterDesigner } from '../adapters/characterDesigner/index.js';
import { OnePromptEngine } from '../adapters/onePromptEngine/index.js';

/**
 * seriesTools — Autonomous Series Mode entry points (ACTOR §9).
 */
export const seriesTools = [
  {
    name: 'harmony.series.create_bible',
    description: 'Создать series_bible.json из промпта.',
    inputSchema: z.object({
      prompt: z.string().min(1),
      targetDurationMinutes: z.number().optional()
    }),
    handler: async (args: any) => {
      const analysis = new OnePromptEngine().analyzePrompt(args);
      const bible = new SeriesPlanner().createBible(analysis, args);
      return { status: 'success', seriesBible: bible };
    }
  },

  {
    name: 'harmony.series.create_episode_ideas',
    description: 'Сгенерировать идеи эпизодов из bible.',
    inputSchema: z.object({
      seriesBible: z.any(),
      count: z.number().optional().default(6)
    }),
    handler: async (args: any) => {
      const bible = args.seriesBible;
      const count = args.count ?? 6;
      const ideas = [];
      for (let i = 1; i <= count; i++) {
        ideas.push({
          episodeNumber: i,
          title: bible.episodeTitles[i - 1] || `E${String(i).padStart(2, '0')}: Untitled`,
          logLine: `Episode ${i} explores ${bible.themes[i % bible.themes.length]} with ${bible.recurringCharacters[i % bible.recurringCharacters.length]?.name || 'the cast'}.`,
          characters: bible.recurringCharacters.map((c: any) => c.name),
          location: bible.recurringLocations[i % bible.recurringLocations.length]
        });
      }
      return { status: 'success', count: ideas.length, episodeIdeas: ideas };
    }
  },

  {
    name: 'harmony.series.create_episode_plan',
    description: 'Создать episode plan для выбранной идеи эпизода.',
    inputSchema: z.object({
      seriesBible: z.any(),
      episodeNumber: z.number(),
      durationMinutes: z.number().optional(),
      fps: z.number().optional(),
      resolution: z.object({ width: z.number(), height: z.number() }).optional()
    }),
    handler: async (args: any) => {
      const analysis = new OnePromptEngine().analyzePrompt({
        prompt: args.seriesBible.logLine,
        targetDurationMinutes: args.durationMinutes ?? 2,
        fps: args.fps,
        resolution: args.resolution
      });
      const episode = new EpisodePlanner().createEpisodePlan(analysis, {
        ...args,
        targetDurationMinutes: args.durationMinutes ?? 2
      });
      return { status: 'success', analysis, episodePlan: episode };
    }
  },

  {
    name: 'harmony.series.create_shot_list',
    description: 'Создать shot list для эпизода.',
    inputSchema: z.object({
      episodePlan: z.any()
    }),
    handler: async (args: any) => {
      const shots = new ShotPlanner().generateShots(args.episodePlan);
      return { status: 'success', shotCount: shots.length, shots };
    }
  },

  {
    name: 'harmony.series.generate_recurring_asset_library',
    description: 'Собрать library повторяющихся ассетов на основе bible.',
    inputSchema: z.object({
      seriesBible: z.any()
    }),
    handler: async (args: any) => {
      const bible = args.seriesBible;
      const library = {
        characters: bible.recurringCharacters.map((c: any) => ({
          name: c.name,
          turnaroundNeeded: true,
          mouthChartNeeded: true,
          handPosesNeeded: true,
          rigPlan: `rig360_placeholder_${c.name}`
        })),
        locations: bible.recurringLocations.map((loc: string) => ({
          name: loc,
          layers: ['sky','walls','furniture','props'],
          notes: 'Establishing + 3 coverage angles'
        })),
        palettes: ['character_master','background_master','fx_master'],
        origin: 'planned'
      };
      return { status: 'success', assetLibrary: library };
    }
  },

  {
    name: 'harmony.series.run_episode_pipeline',
    description: 'Запустить полный pipeline для одного эпизода серии.',
    inputSchema: z.object({
      seriesBible: z.any(),
      episodeNumber: z.number(),
      durationMinutes: z.number().optional(),
      outputDir: z.string().optional(),
      mode: z.enum(['real','simulation','hybrid','moonshot']).optional()
    }),
    handler: async (args: any) => {
      const prompt = args.seriesBible.logLine;
      const previewTool = (await import('./onePromptTools.js')).onePromptTools.find((t: any) => t.name === 'harmony.oneprompt.run_to_preview_episode');
      const result = await previewTool!.handler({
        prompt,
        targetDurationMinutes: args.durationMinutes ?? 2,
        outputDir: args.outputDir,
        mode: args.mode
      });
      return { status: result.status, ...result, note: 'Autonomous Series Mode is a production accelerator, not a replacement for human creative direction.' };
    }
  },

  {
    name: 'harmony.series.generate_review_package',
    description: 'Создать review package для серии.',
    inputSchema: z.object({
      episodeResults: z.array(z.any()),
      outputDir: z.string()
    }),
    handler: async (args: any) => {
      const fs = await import('fs');
      const path = await import('path');
      if (!fs.existsSync(args.outputDir)) fs.mkdirSync(args.outputDir, { recursive: true });
      const file = path.join(args.outputDir, 'series_review_package.json');
      fs.writeFileSync(file, JSON.stringify({ episodes: args.episodeResults, generatedAt: new Date().toISOString() }, null, 2));
      return { status: 'success', file, episodeCount: args.episodeResults.length };
    }
  }
];