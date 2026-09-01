import crypto from 'crypto';
import { z } from 'zod';
import { mohoScenePlanSchema } from '../schemas/mohoScenePlan.js';

function computeFingerprint(scenePlan: unknown): string {
  const canonical = JSON.stringify(scenePlan, (_key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(value as Record<string, unknown>).sort()) {
        sorted[k] = (value as Record<string, unknown>)[k];
      }
      return sorted;
    }
    return value;
  });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

export const mohoScenePlanTools = [
  {
    name: 'moho.scene_plan.validate',
    description:
      'Провалидировать Moho ScenePlan против схемы mohoScenePlanSchema (schemaVersion 1.0). ' +
      'Возвращает status valid/invalid, fingerprint при успехе и список ошибок zod при отказе. ' +
      'Не требует файла на диске — принимает сырой JSON-объект. Удобно для быстрой проверки ' +
      'плана перед компиляцией в CommandPlan.',
    inputSchema: z.object({
      scenePlan: z.any().describe('Сырой JSON-объект Moho ScenePlan для валидации.')
    }),
    handler: async (args: { scenePlan: unknown }): Promise<
      | { status: 'valid'; fingerprint: string }
      | { status: 'invalid'; errors: string[] }
    > => {
      try {
        const parsed = mohoScenePlanSchema.parse(args.scenePlan);
        const fingerprint = computeFingerprint(parsed);
        return { status: 'valid', fingerprint };
      } catch (err: any) {
        const issues: any[] = err?.issues ?? [];
        const messages = issues.length
          ? issues.map((i: any) => `${i.path?.join('.') ?? '?'}: ${i.message}`)
          : [err?.message ?? String(err)];
        return { status: 'invalid', errors: messages };
      }
    }
  },
  {
    name: 'moho.scene_plan.to_command_plan',
    description:
      'Устаревший интерфейс ScenePlan. Заглушка отключена, потому что пустой CommandPlan нельзя выдавать за успешную компиляцию. Для production используйте moho.production.v3.start.',
    inputSchema: z.object({
      scenePlan: z.any().describe('Moho ScenePlan для компиляции.'),
      mohoShowBiblePath: z.string().describe('Путь к moho_show_bible.json (внутри allowedRoots).')
    }),
    handler: async (args: { scenePlan: unknown; mohoShowBiblePath: string }): Promise<
      { status: 'deprecated'; code: string; message: string; fingerprint?: string }
    > => {
      try {
        const parsed = mohoScenePlanSchema.parse(args.scenePlan);
        const fingerprint = computeFingerprint(parsed);
        if (typeof args.mohoShowBiblePath !== 'string' || args.mohoShowBiblePath.length === 0) {
          return {
            status: 'deprecated',
            code: 'MOHO_SHOW_BIBLE_PATH_REQUIRED',
            message: 'mohoShowBiblePath должен быть непустой строкой.'
          };
        }
        return {
          status: 'deprecated',
          code: 'USE_MOHO_PRODUCTION_V3',
          message: 'Пустая компиляция отключена. Используйте moho.production.v3.start.',
          fingerprint
        };
      } catch (err: any) {
        const issues: any[] = err?.issues ?? [];
        const message = issues.length
          ? issues.map((i: any) => `${i.path?.join('.') ?? '?'}: ${i.message}`).join('; ')
          : err?.message ?? String(err);
        return {
          status: 'deprecated',
          code: 'MOHO_SCENE_PLAN_TO_COMMAND_PLAN_FAILED',
          message
        };
      }
    }
  },
  {
    name: 'moho.scene_plan.fingerprint',
    description:
      'Посчитать детерминированный SHA-256 fingerprint (64 hex символа) канонизированного ' +
      'Moho ScenePlan. Один и тот же JSON-объект всегда даёт одинаковый fingerprint вне ' +
      'зависимости от порядка ключей.',
    inputSchema: z.object({
      scenePlan: z.any().describe('Moho ScenePlan для вычисления fingerprint.')
    }),
    handler: async (args: { scenePlan: unknown }): Promise<
      { status: 'success'; fingerprint: string } | { status: 'error'; code: string; message: string }
    > => {
      try {
        const parsed = mohoScenePlanSchema.parse(args.scenePlan);
        const fingerprint = computeFingerprint(parsed);
        return { status: 'success', fingerprint };
      } catch (err: any) {
        const issues: any[] = err?.issues ?? [];
        const message = issues.length
          ? issues.map((i: any) => `${i.path?.join('.') ?? '?'}: ${i.message}`).join('; ')
          : err?.message ?? String(err);
        return {
          status: 'error',
          code: 'MOHO_SCENE_PLAN_FINGERPRINT_FAILED',
          message
        };
      }
    }
  }
];
