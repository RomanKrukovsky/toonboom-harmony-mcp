import fs from 'fs';
import { z } from 'zod';
import {
  MohoRenderRunner,
  type MohoRenderRunnerOptions,
  type MohoRenderRunnerResult
} from '../services/mohoRenderRunner/index.js';
import { MohoRenderManager } from '../services/mohoRenderManager/index.js';
import { MohoVisualDiffer } from '../services/mohoVisualDiffer/index.js';

const renderRunner = new MohoRenderRunner();

export const mohoRenderTools = [
  {
    name: 'moho.render.run',
    description:
      'Запустить batch-рендер Moho-документа по скомпилированному CommandPlan. Эмитит Lua-сценарий ' +
      'build_rig.lua, собирает CLI-команду для Moho Pro и исполняет её, если бинарь найден. При ' +
      'dryRun=true возвращает status=dry_run без запуска. При отсутствии Moho возвращает ' +
      'status=requires_real_moho с уже сохранённым Lua-сценарием.',
    inputSchema: z.object({
      commandPlan: z.any().describe('Moho CommandPlan — источник документа, костей и операций.'),
      outputDir: z.string().describe('Каталог, куда пишется render_<planId>.* и build_rig.lua.'),
      format: z.enum(['png_sequence', 'mp4', 'prores', 'gif']).optional().describe('Формат вывода (default: png_sequence).'),
      startFrame: z.number().int().optional().describe('Стартовый кадр (default: 1).'),
      endFrame: z.number().int().optional().describe('Конечный кадр (default: 120).'),
      width: z.number().int().optional().describe('Ширина кадра в пикселях (default: 1920).'),
      height: z.number().int().optional().describe('Высота кадра в пикселях (default: 1080).'),
      fps: z.number().optional().describe('Целевой FPS (default: 24).'),
      antialiasing: z.boolean().optional().describe('Включить antialiasing (default: true).'),
      halfSize: z.boolean().optional().describe('Рендерить в половине разрешения (default: false).'),
      timeoutMs: z.number().int().optional().describe('Таймаут execFile в мс (default: 600000).'),
      dryRun: z.boolean().optional().describe('Только эмитнуть Lua и собрать команду, не запускать бинарь (default: false).')
    }).strict(),
    handler: async (args: MohoRenderRunnerOptions): Promise<
      { status: 'success'; result: MohoRenderRunnerResult } | { status: 'error'; code: string; message: string }
    > => {
      try {
        const result = await renderRunner.run(args);
        return { status: 'success', result };
      } catch (err: any) {
        return {
          status: 'error',
          code: err?.code ?? 'MOHO_RENDER_RUN_FAILED',
          message: err?.message ?? String(err)
        };
      }
    }
  },
  {
    name: 'moho.render.detect_moho',
    description:
      'Обнаружить бинарь Moho Pro в стандартных путях (macOS: /Applications/Moho*.app, Windows: ' +
      'Program Files, /usr/bin/moho). Возвращает абсолютный путь или null, если Moho не установлен.',
    inputSchema: z.object({}).strict(),
    handler: async (): Promise<{ status: 'success'; detected: boolean; path: string | null }> => {
      const path = MohoRenderManager.detectMohoExecutable();
      return { status: 'success', detected: path !== null, path };
    }
  },
  {
    name: 'moho.visual_diff.run',
    description:
      'Сравнить две директории PNG-кадров (baseline vs candidate) и собрать агрегированные метрики ' +
      'MSE/SSIM/perceptualHash по каждому кадру, список кадров с высокой дельтой и passes-флаг. ' +
      'Использует встроенный PNG-декодер (без внешних библиотек); поддерживает frameRange.',
    inputSchema: z.object({
      baselineFramesDir: z.string().describe('Каталог с эталонными PNG-кадрами (frame_*.png или *.png).'),
      candidateFramesDir: z.string().describe('Каталог с проверяемыми PNG-кадрами.'),
      frameRange: z
        .object({
          start: z.number().int().describe('Начальный номер кадра (включительно).'),
          end: z.number().int().describe('Конечный номер кадра (включительно).')
        })
        .optional()
        .describe('Опциональный диапазон кадров для сравнения.')
    }).strict(),
    handler: async (args: {
      baselineFramesDir: string;
      candidateFramesDir: string;
      frameRange?: { start: number; end: number };
    }): Promise<
      { status: 'success'; result: Awaited<ReturnType<MohoVisualDiffer['diff']>> }
      | { status: 'error'; code: string; message: string }
    > => {
      try {
        if (!fs.existsSync(args.baselineFramesDir)) {
          return {
            status: 'error',
            code: 'FRAMES_DIR_MISSING',
            message: `Baseline frames directory not found: ${args.baselineFramesDir}`
          };
        }
        if (!fs.existsSync(args.candidateFramesDir)) {
          return {
            status: 'error',
            code: 'FRAMES_DIR_MISSING',
            message: `Candidate frames directory not found: ${args.candidateFramesDir}`
          };
        }
        const differ = new MohoVisualDiffer();
        const result = await differ.diff(args);
        return { status: 'success', result };
      } catch (err: any) {
        return {
          status: 'error',
          code: err?.code ?? 'MOHO_VISUAL_DIFF_FAILED',
          message: err?.message ?? String(err)
        };
      }
    }
  },
  {
    name: 'moho.visual_diff.compute_metrics',
    description:
      'Посчитать MSE, SSIM и perceptualHashDistance для двух PNG-кадров (по абсолютным путям). ' +
      'Возвращает сырые метрики без агрегации — для сравнения директорий используйте moho.visual_diff.run.',
    inputSchema: z.object({
      baselinePath: z.string().describe('Путь к эталонному PNG-кадру.'),
      candidatePath: z.string().describe('Путь к проверяемому PNG-кадру.')
    }).strict(),
    handler: async (args: { baselinePath: string; candidatePath: string }): Promise<
      | {
          status: 'success';
          mse: number;
          ssim: number;
          perceptualHashDistance: number;
        }
      | { status: 'error'; code: string; message: string }
    > => {
      try {
        if (!fs.existsSync(args.baselinePath)) {
          return {
            status: 'error',
            code: 'FRAME_READ_FAILED',
            message: `Baseline PNG not found: ${args.baselinePath}`
          };
        }
        if (!fs.existsSync(args.candidatePath)) {
          return {
            status: 'error',
            code: 'FRAME_READ_FAILED',
            message: `Candidate PNG not found: ${args.candidatePath}`
          };
        }
        const buf1 = fs.readFileSync(args.baselinePath);
        const buf2 = fs.readFileSync(args.candidatePath);
        const mse = MohoVisualDiffer.computeMSE(buf1, buf2);
        const ssim = MohoVisualDiffer.computeSSIM(buf1, buf2);
        const hash1 = MohoVisualDiffer.computePerceptualHash(buf1);
        const hash2 = MohoVisualDiffer.computePerceptualHash(buf2);
        const perceptualHashDistance = MohoVisualDiffer.hammingDistance(hash1, hash2);
        return { status: 'success', mse, ssim, perceptualHashDistance };
      } catch (err: any) {
        return {
          status: 'error',
          code: err?.code ?? 'MOHO_VISUAL_DIFF_METRICS_FAILED',
          message: err?.message ?? String(err)
        };
      }
    }
  }
];