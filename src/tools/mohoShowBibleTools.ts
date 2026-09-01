import { z } from 'zod';
import {
  MohoShowBibleLoader,
  type LoadedMohoShowBible,
  type MohoShowBibleCrossRefs
} from '../services/mohoShowBibleLoader/index.js';

const loader = new MohoShowBibleLoader();

export const mohoShowBibleTools = [
  {
    name: 'moho.show_bible.load',
    description:
      'Загрузить семейство Moho ShowBible (6 документов) с диска и провалидировать каждую ссылку. ' +
      'Возвращает полный объединённый пакет: mohoShowBible, characterBibles, cameraRules, motionGrammar, ' +
      'paletteManifest, qaThresholds, crossRefs и fingerprint. Путь обязан быть внутри allowedRoots.',
    inputSchema: z.object({
      showBiblePath: z.string().describe('Путь к moho_show_bible.json (остальные 5 документов грузятся по ссылкам).')
    }),
    handler: async (args: { showBiblePath: string }): Promise<
      { status: 'success'; loaded: LoadedMohoShowBible } | { status: 'error'; code: string; message: string }
    > => {
      try {
        const loaded = loader.load(args.showBiblePath);
        return { status: 'success', loaded };
      } catch (err: any) {
        return {
          status: 'error',
          code: err?.code ?? 'MOHO_SHOW_BIBLE_LOAD_FAILED',
          message: err?.message ?? String(err)
        };
      }
    }
  },
  {
    name: 'moho.show_bible.validate',
    description:
      'Провалидировать Moho ShowBible без возврата полного пакета. Возвращает status valid/invalid, ' +
      'fingerprint при успехе и список ошибок при отказе. Удобно для быстрой проверки словаря перед компиляцией.',
    inputSchema: z.object({
      showBiblePath: z.string().describe('Путь к moho_show_bible.json.')
    }),
    handler: async (args: { showBiblePath: string }): Promise<
      | { status: 'valid'; fingerprint: string }
      | { status: 'invalid'; errors: string[] }
    > => {
      try {
        const loaded = loader.load(args.showBiblePath);
        return { status: 'valid', fingerprint: loaded.fingerprint };
      } catch (err: any) {
        const issues: any[] = err?.error?.issues ?? err?.details?.issues ?? [];
        const messages = issues.length
          ? issues.map((i: any) => `${i.path?.join('.') ?? '?'}: ${i.message}`)
          : [err?.message ?? String(err)];
        return { status: 'invalid', errors: messages };
      }
    }
  },
  {
    name: 'moho.show_bible.fingerprint',
    description:
      'Посчитать детерминированный SHA-256 fingerprint (64 hex символа) канонизированного Moho ShowBible ' +
      'бандла. Один и тот же набор JSON-документов на диске всегда даёт одинаковый fingerprint.',
    inputSchema: z.object({
      showBiblePath: z.string().describe('Путь к moho_show_bible.json.')
    }),
    handler: async (args: { showBiblePath: string }): Promise<
      { status: 'success'; fingerprint: string } | { status: 'error'; code: string; message: string }
    > => {
      try {
        const loaded = loader.load(args.showBiblePath);
        return { status: 'success', fingerprint: loaded.fingerprint };
      } catch (err: any) {
        return {
          status: 'error',
          code: err?.code ?? 'MOHO_SHOW_BIBLE_FINGERPRINT_FAILED',
          message: err?.message ?? String(err)
        };
      }
    }
  },
  {
    name: 'moho.show_bible.get_cross_refs',
    description:
      'Получить cross-references Moho ShowBible: список characterIds, allowedRigTypes, разрешённые ' +
      'shot sizes / camera moves / emotions / gestures. Используется нижестоящими компиляторами ' +
      '(ShotPlan, CommandPlan) для гейтинга словаря.',
    inputSchema: z.object({
      showBiblePath: z.string().describe('Путь к moho_show_bible.json.')
    }),
    handler: async (args: { showBiblePath: string }): Promise<
      { status: 'success'; crossRefs: MohoShowBibleCrossRefs } | { status: 'error'; code: string; message: string }
    > => {
      try {
        const loaded = loader.load(args.showBiblePath);
        return { status: 'success', crossRefs: loaded.crossRefs };
      } catch (err: any) {
        return {
          status: 'error',
          code: err?.code ?? 'MOHO_SHOW_BIBLE_CROSS_REFS_FAILED',
          message: err?.message ?? String(err)
        };
      }
    }
  },
  {
    name: 'moho.show_bible.list_allowed_rig_types',
    description:
      'Вернуть список разрешённых типов ригов (allowedRigTypes) из moho_show_bible. ' +
      'Любой character_bible вне этого списка будет отклонён loader-ом на этапе assertRigTypeRefs.',
    inputSchema: z.object({
      showBiblePath: z.string().describe('Путь к moho_show_bible.json.')
    }),
    handler: async (args: { showBiblePath: string }): Promise<
      { status: 'success'; allowedRigTypes: string[] } | { status: 'error'; code: string; message: string }
    > => {
      try {
        const loaded = loader.load(args.showBiblePath);
        return { status: 'success', allowedRigTypes: loaded.crossRefs.allowedRigTypes };
      } catch (err: any) {
        return {
          status: 'error',
          code: err?.code ?? 'MOHO_SHOW_BIBLE_ALLOWED_RIG_TYPES_FAILED',
          message: err?.message ?? String(err)
        };
      }
    }
  }
];
