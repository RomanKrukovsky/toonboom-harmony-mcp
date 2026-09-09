import { z } from 'zod';
import { CountryballsStudioOrchestrator } from '../countryballs/orchestrator/studioOrchestrator.js';
import { DEFAULT_COUNTRYBALLS_SERIES_BIBLE } from '../countryballs/seriesBible/defaultBible.js';
import { ALL_COUNTRYBALL_ACTIONS } from '../countryballs/acting/actionVocabulary.js';
import { CountryballsWritersRoom } from '../countryballs/writersRoom/writersRoom.js';
import { CountryballsDirectorEngine } from '../countryballs/director/directorEngine.js';
import { CountryballsAiCritic } from '../countryballs/critic/aiCritic.js';
import { CountryballsRevisionPatcher } from '../countryballs/critic/revisionPatcher.js';
import { episodeIRSchema } from '../schemas/countryballs/episodeIR.js';
import { createStandardExecutionResult } from '../schemas/executionResult.js';

export const countryballsProduceEpisodeSchema = z.object({
  topic: z.string().min(1).describe('Core topic, incident, or premise for the Countryballs episode'),
  projectName: z.string().optional().describe('Project directory name (defaults to auto-generated ID)'),
  outputRoot: z.string().optional().describe('Root output folder for generated episode packages'),
  backend: z.enum(['animate', 'harmony', 'moho']).default('animate').describe('Target DCC animation compiler'),
  mainCharacters: z.array(z.string()).optional().describe('List of protagonist countryballs (e.g. ["Poland", "Russia", "USA"])'),
  tone: z.string().default('absurd_comedy').describe('Comedy style and tone'),
  autoFixEnabled: z.boolean().default(true).describe('Automatically apply AI-Critic revision patches if QA fails')
});

export const countryballsTools = [
  {
    name: 'countryballs.studio.produce_episode',
    description: 'ГЛАВНЫЙ ИНСТРУМЕНТ АВТОНОМНОЙ СТУДИИ. Проводит полный цикл производства серии Countryballs: от сценарной комнаты и режиссуры до компиляции в Adobe Animate (.fla), гармонизации тайминга шуток, озвучки и AI-критика.',
    inputSchema: countryballsProduceEpisodeSchema,
    handler: async (args: any) => {
      const orchestrator = new CountryballsStudioOrchestrator();
      const result = orchestrator.produceEpisode(args);
      return createStandardExecutionResult({
        status: result.success ? 'success' : 'failed',
        details: result
      });
    }
  },

  {
    name: 'countryballs.bible.inspect',
    description: 'Инспектировать Series Bible сериала Countryballs: список стран, характеры, правила речи (Engrish), визуальные каноны и доступные аксессуары.',
    inputSchema: z.object({
      characterId: z.string().optional().describe('ID конкретной страны для детального осмотра (Poland, Russia, USA, Germany, UK)')
    }),
    handler: async (args: { characterId?: string }) => {
      if (args.characterId) {
        const char = DEFAULT_COUNTRYBALLS_SERIES_BIBLE.characters[args.characterId];
        if (!char) {
          return createStandardExecutionResult({
            status: 'failed',
            errors: [`Character '${args.characterId}' not found in default bible.`]
          });
        }
        return createStandardExecutionResult({
          status: 'success',
          details: char
        });
      }
      return createStandardExecutionResult({
        status: 'success',
        details: {
          title: DEFAULT_COUNTRYBALLS_SERIES_BIBLE.title,
          characters: Object.keys(DEFAULT_COUNTRYBALLS_SERIES_BIBLE.characters),
          visualRules: DEFAULT_COUNTRYBALLS_SERIES_BIBLE.visualRules,
          comedyRules: DEFAULT_COUNTRYBALLS_SERIES_BIBLE.comedyRules,
          recurringLocations: DEFAULT_COUNTRYBALLS_SERIES_BIBLE.recurringLocations
        }
      });
    }
  },

  {
    name: 'countryballs.acting.list_actions',
    description: 'Получить словарь из 300+ доступных переиспользуемых действий персонажей (Locomotion, Takes, Emotional Idles, Micro-expressions, Slapstick gags).',
    inputSchema: z.object({
      category: z.enum(['locomotion', 'reaction_take', 'emotional_idle', 'gaze_micro', 'slapstick_gag', 'all']).default('all'),
      limit: z.number().int().default(50)
    }),
    handler: async (args: { category: string; limit: number }) => {
      let filtered = ALL_COUNTRYBALL_ACTIONS;
      if (args.category !== 'all') {
        filtered = filtered.filter(a => a.category === args.category);
      }
      return createStandardExecutionResult({
        status: 'success',
        details: {
          totalAvailable: filtered.length,
          actions: filtered.slice(0, args.limit).map(a => ({
            id: a.id,
            category: a.category,
            defaultDurationFrames: a.defaultDurationFrames,
            recommendedEyeState: a.recommendedEyeState,
            description: a.description
          }))
        }
      });
    }
  },

  {
    name: 'countryballs.writers_room.generate_script',
    description: 'Запустить виртуальную сценарную комнату (Showrunner, Researcher, Story Architect, Comedy Writer, Dialogue Writer) для генерации сценария серии.',
    inputSchema: z.object({
      topic: z.string().min(1),
      mainCharacters: z.array(z.string()).optional()
    }),
    handler: async (args: { topic: string; mainCharacters?: string[] }) => {
      const room = new CountryballsWritersRoom(DEFAULT_COUNTRYBALLS_SERIES_BIBLE);
      const script = room.produceScreenplay(args);
      return createStandardExecutionResult({
        status: 'success',
        details: script
      });
    }
  },

  {
    name: 'countryballs.director.compile_ir',
    description: 'Превратить сценарий в режиссерский Episode IR (декомпозиция на кадры, стейджинг персонажей, тайминг пауз).',
    inputSchema: z.object({
      topic: z.string().min(1),
      mainCharacters: z.array(z.string()).optional()
    }),
    handler: async (args: { topic: string; mainCharacters?: string[] }) => {
      const room = new CountryballsWritersRoom(DEFAULT_COUNTRYBALLS_SERIES_BIBLE);
      const script = room.produceScreenplay(args);
      const director = new CountryballsDirectorEngine(DEFAULT_COUNTRYBALLS_SERIES_BIBLE);
      const ir = director.directEpisode(script);
      return createStandardExecutionResult({
        status: 'success',
        details: ir
      });
    }
  },

  {
    name: 'countryballs.critic.audit_episode',
    description: 'Выполнить строгий аудит готового Episode IR через AI-Критика: поиск визуальных перекрытий, клиппинга, наложений диалогов и спешки в шутках.',
    inputSchema: z.object({
      episode: episodeIRSchema
    }),
    handler: async (args: { episode: any }) => {
      const critic = new CountryballsAiCritic(DEFAULT_COUNTRYBALLS_SERIES_BIBLE);
      const report = critic.audit(args.episode);
      return createStandardExecutionResult({
        status: 'success',
        details: report
      });
    }
  },

  {
    name: 'countryballs.critic.apply_revision_plan',
    description: 'Автоматически применить revision_plan.json к Episode IR, устранив найденные критиком дефекты.',
    inputSchema: z.object({
      episode: episodeIRSchema
    }),
    handler: async (args: { episode: any }) => {
      const critic = new CountryballsAiCritic(DEFAULT_COUNTRYBALLS_SERIES_BIBLE);
      const report = critic.audit(args.episode);
      const plan = CountryballsRevisionPatcher.generateRevisionPlan(report);
      const patched = CountryballsRevisionPatcher.applyRevisionPlan(args.episode, plan);
      return createStandardExecutionResult({
        status: 'success',
        details: {
          originalIssuesCount: report.issues.length,
          revisionPlan: plan,
          patchedEpisode: patched
        }
      });
    }
  }
];
