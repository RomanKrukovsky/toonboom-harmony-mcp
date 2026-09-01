import { z } from 'zod';
import { MohoFactoryOrchestrator, type MohoFactoryRunOptions, type MohoFactoryRunState, type MohoFactoryShotResult } from '../orchestrators/mohoFactory/index.js';
import { MohoApprovalCheckpoints, type MohoApprovalRecord } from '../services/mohoApprovalCheckpoints/index.js';
import { MohoEpisodeBatchCompiler, type MohoEpisodeBatch, type MohoBatchCompileOptions } from '../services/mohoEpisodeBatchCompiler/index.js';

const runShowBibleInputSchema = z.object({
  showBiblePath: z.string().describe('Путь к JSON-файлу Show Bible, описывающему персонажей, правила камеры и motion grammar.'),
  shotManifests: z.array(z.any()).describe('Массив ShotManifest для запуска в рамках эпизода/серии.'),
  outputRoot: z.string().describe('Корневая директория, куда фабрика запишет артефакты (PIR, plan, lua, render, QA).'),
  mode: z.enum(['offline_dry_run', 'live_render']).optional().describe('Режим работы: offline_dry_run (без реального Moho) или live_render.'),
  requireHumanApprovalFor: z.array(z.string()).optional().describe('Список стадий, требующих явного человеческого одобрения (например pir_compiled, rendered).'),
  timeoutMs: z.number().optional().describe('Таймаут рендера в миллисекундах.')
}).strict();

const runOneShotInputSchema = z.object({
  showBiblePath: z.string().describe('Путь к JSON-файлу Show Bible для одиночного шота.'),
  shotManifest: z.any().describe('ShotManifest — описание одного шота (beats, timing, персонажи).'),
  outputRoot: z.string().describe('Директория, куда будут записаны артефакты шота.'),
  mode: z.enum(['offline_dry_run', 'live_render']).optional().describe('Режим рендера (offline_dry_run или live_render).'),
  timeoutMs: z.number().optional().describe('Таймаут рендера в миллисекундах.')
}).strict();

const approveInputSchema = z.object({
  approvalId: z.string().describe('UUID одобрения, ранее запрошенного через request().'),
  approver: z.string().describe('Идентификатор (имя/email) человека, одобряющего запрос.'),
  notes: z.string().optional().describe('Опциональные комментарии к решению.'),
  evidenceDir: z.string().describe('Директория evidence, где хранятся pending.jsonl/approved.jsonl/rejected.jsonl.')
}).strict();

const rejectInputSchema = z.object({
  approvalId: z.string().describe('UUID одобрения, которое нужно отклонить.'),
  approver: z.string().describe('Идентификатор человека, отклоняющего запрос.'),
  notes: z.string().optional().describe('Опциональные комментарии (причина отклонения).'),
  evidenceDir: z.string().describe('Директория evidence с журналом approval-запросов.')
}).strict();

const listPendingInputSchema = z.object({
  evidenceDir: z.string().describe('Директория evidence, откуда читается pending.jsonl.')
}).strict();

const compileEpisodeBatchInputSchema = z.object({
  production: z.string().describe('Кодовое имя продакшена (например, moho_demo).'),
  episode: z.string().describe('Идентификатор эпизода в продакшене.'),
  shotManifests: z.array(z.any()).describe('Массив ShotManifest, входящих в эпизод (1..100 шотов).'),
  showBiblePath: z.string().describe('Путь к Show Bible, общему для всех шотов эпизода.')
}).strict();

export const mohoFactoryTools = [
  {
    name: 'moho.factory.run_show_bible',
    description:
      'Запустить полный цикл Moho Factory по списку шотов: загрузить Show Bible, скомпилировать ' +
      'Performance PIR, собрать Command Plan, эмиттировать Lua, отрендерить и прогнать QA + ' +
      'retake-patches. Возвращает финальный MohoFactoryRunState со статусом (success / ' +
      'awaiting_approval / failed) и пошаговыми stage-стейтами. Если указан ' +
      'requireHumanApprovalFor, соответствующие стадии переводят прогон в awaiting_approval.',
    inputSchema: runShowBibleInputSchema,
    handler: async (args: {
      showBiblePath: string;
      shotManifests: unknown[];
      outputRoot: string;
      mode?: 'offline_dry_run' | 'live_render';
      requireHumanApprovalFor?: string[];
      timeoutMs?: number;
    }): Promise<
      | { status: 'success'; runState: MohoFactoryRunState }
      | { status: 'awaiting_approval'; runState: MohoFactoryRunState }
      | { status: 'error'; code: string; message: string }
    > => {
      try {
        const opts: MohoFactoryRunOptions = {
          showBiblePath: args.showBiblePath,
          shotManifests: args.shotManifests as any,
          outputRoot: args.outputRoot,
          mode: args.mode ?? 'offline_dry_run',
          requireHumanApprovalFor: args.requireHumanApprovalFor as any,
          timeoutMs: args.timeoutMs
        };
        const orchestrator = new MohoFactoryOrchestrator(opts);
        const runState = await orchestrator.run();
        if (runState.status === 'awaiting_approval') {
          return { status: 'awaiting_approval', runState };
        }
        return { status: 'success', runState };
      } catch (err: any) {
        return {
          status: 'error',
          code: err?.code ?? 'MOHO_FACTORY_RUN_FAILED',
          message: err?.message ?? String(err)
        };
      }
    }
  },
  {
    name: 'moho.factory.run_one_shot',
    description:
      'Запустить Moho Factory только для одного шота: загрузить Show Bible (через переданный ' +
      'path) и выполнить полный пайплайн одного ShotManifest (PIR -> plan -> lua -> render -> ' +
      'QA -> retake). Возвращает MohoFactoryShotResult со статусами, fingerprint-ами и ' +
      'артефактами шота.',
    inputSchema: runOneShotInputSchema,
    handler: async (args: {
      showBiblePath: string;
      shotManifest: unknown;
      outputRoot: string;
      mode?: 'offline_dry_run' | 'live_render';
      timeoutMs?: number;
    }): Promise<
      | { status: 'success'; shotResult: MohoFactoryShotResult }
      | { status: 'awaiting_approval'; shotResult: MohoFactoryShotResult }
      | { status: 'error'; code: string; message: string }
    > => {
      try {
        const opts: MohoFactoryRunOptions = {
          showBiblePath: args.showBiblePath,
          shotManifests: [args.shotManifest as any],
          outputRoot: args.outputRoot,
          mode: args.mode ?? 'offline_dry_run',
          timeoutMs: args.timeoutMs
        };
        const orchestrator = new MohoFactoryOrchestrator(opts);
        await orchestrator.run();
        const state = orchestrator.getState();
        const shotResult = state.shotResults[state.shotResults.length - 1];
        if (!shotResult) {
          return {
            status: 'error' as const,
            code: 'MOHO_FACTORY_NO_SHOT_RESULT',
            message: 'Orchestrator completed without producing shot result.'
          };
        }
        if (shotResult.status === 'requires_approval') {
          return { status: 'awaiting_approval' as const, shotResult };
        }
        if (shotResult.status === 'failed') {
          return {
            status: 'error' as const,
            code: 'MOHO_FACTORY_SHOT_FAILED',
            message: `Shot ${shotResult.shotId} failed during factory pipeline.`
          };
        }
        return { status: 'success' as const, shotResult };
      } catch (err: any) {
        return {
          status: 'error' as const,
          code: err?.code ?? 'MOHO_FACTORY_ONE_SHOT_FAILED',
          message: err?.message ?? String(err)
        };
      }
    }
  },
  {
    name: 'moho.factory.approve',
    description:
      'Одобрить ранее запрошенный approval checkpoint: переносит запись из pending.jsonl в ' +
      'approved.jsonl, проставляет approver, approvedAt и notes. Возвращает обновлённый ' +
      'MohoApprovalRecord. Если approvalId отсутствует в pending — выбрасывается ошибка.',
    inputSchema: approveInputSchema,
    handler: async (args: {
      approvalId: string;
      approver: string;
      notes?: string;
      evidenceDir: string;
    }): Promise<
      | { status: 'success'; record: MohoApprovalRecord }
      | { status: 'error'; code: string; message: string }
    > => {
      try {
        const checkpoints = new MohoApprovalCheckpoints(args.evidenceDir);
        const record = await checkpoints.approve(args.approvalId, args.approver, args.notes);
        return { status: 'success', record };
      } catch (err: any) {
        return {
          status: 'error',
          code: err?.code ?? 'MOHO_FACTORY_APPROVE_FAILED',
          message: err?.message ?? String(err)
        };
      }
    }
  },
  {
    name: 'moho.factory.reject',
    description:
      'Отклонить ранее запрошенный approval checkpoint: переносит запись из pending.jsonl в ' +
      'rejected.jsonl, проставляет approver, approvedAt и notes (обычно — причину отклонения). ' +
      'Возвращает обновлённый MohoApprovalRecord.',
    inputSchema: rejectInputSchema,
    handler: async (args: {
      approvalId: string;
      approver: string;
      notes?: string;
      evidenceDir: string;
    }): Promise<
      | { status: 'success'; record: MohoApprovalRecord }
      | { status: 'error'; code: string; message: string }
    > => {
      try {
        const checkpoints = new MohoApprovalCheckpoints(args.evidenceDir);
        const record = await checkpoints.reject(args.approvalId, args.approver, args.notes);
        return { status: 'success', record };
      } catch (err: any) {
        return {
          status: 'error',
          code: err?.code ?? 'MOHO_FACTORY_REJECT_FAILED',
          message: err?.message ?? String(err)
        };
      }
    }
  },
  {
    name: 'moho.factory.list_pending',
    description:
      'Получить список всех pending approval checkpoints из evidenceDir (файл pending.jsonl). ' +
      'Возвращает массив MohoApprovalRecord — каждый со decision="pending", runId, stage, ' +
      'shotId и fingerprint. Используется для построения review-очереди.',
    inputSchema: listPendingInputSchema,
    handler: async (args: {
      evidenceDir: string;
    }): Promise<
      | { status: 'success'; pending: MohoApprovalRecord[] }
      | { status: 'error'; code: string; message: string }
    > => {
      try {
        const checkpoints = new MohoApprovalCheckpoints(args.evidenceDir);
        const pending = await checkpoints.listPending();
        return { status: 'success', pending };
      } catch (err: any) {
        return {
          status: 'error',
          code: err?.code ?? 'MOHO_FACTORY_LIST_PENDING_FAILED',
          message: err?.message ?? String(err)
        };
      }
    }
  },
  {
    name: 'moho.factory.compile_episode_batch',
    description:
      'Скомпилировать episode-batch для Moho Factory: валидирует состав шотов (1..100, без ' +
      'дублей shotId, одинаковый showBibleRef), собирает MohoEpisodeBatch с batchId, ' +
      'createdAt и sha256-fingerprint. Возвращает готовый MohoEpisodeBatch для последующей ' +
      'передачи в рендер-ферму / pipeline-раннер.',
    inputSchema: compileEpisodeBatchInputSchema,
    handler: async (args: {
      production: string;
      episode: string;
      shotManifests: unknown[];
      showBiblePath: string;
    }): Promise<
      | { status: 'success'; batch: MohoEpisodeBatch }
      | { status: 'error'; code: string; message: string }
    > => {
      try {
        const opts: MohoBatchCompileOptions = {
          production: args.production,
          episode: args.episode,
          shotManifests: args.shotManifests as any,
          showBiblePath: args.showBiblePath
        };
        const batch = new MohoEpisodeBatchCompiler().compile(opts);
        return { status: 'success', batch };
      } catch (err: any) {
        return {
          status: 'error',
          code: err?.code ?? 'MOHO_FACTORY_BATCH_FAILED',
          message: err?.message ?? String(err)
        };
      }
    }
  }
];