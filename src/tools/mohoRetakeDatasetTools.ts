import { z } from 'zod';
import { MohoRetakeTranslator } from '../services/mohoRetakeTranslator/index.js';
import { MohoRetakeDatasetStore } from '../services/mohoRetakeDataset/index.js';
import { MohoContinuityLedger } from '../services/seriesMemory/mohoExtension.js';

const retakeTranslateInputSchema = z.object({
  shotId: z.string().min(1).describe('Идентификатор шота, для которого выполняется ретейк-перевод.'),
  beforePerformanceId: z.string().min(1).describe('ID предыдущего перфоманса (before).'),
  afterPerformanceId: z.string().min(1).describe('ID нового перфоманса (after).'),
  beforePir: z.record(z.any()).describe('MohoPerformancePir до ретейка (before).'),
  afterPir: z.record(z.any()).describe('MohoPerformancePir после ретейка (after).'),
  rigType: z.enum(['humanoid_2leg', 'quadruped', 'creature', 'mechanical'])
    .describe('Тип рига, для которого собирается манифест ретейка.'),
  recordedBy: z.string().min(1).describe('Идентификатор актора, записавшего ретейк.'),
  notes: z.string().optional().describe('Свободная ремарка супервайзера/аниматора к ретейку.')
});

const datasetPathSchema = z.string().min(1)
  .describe('Абсолютный путь к JSON-файлу датасета MohoRetakeDataset.');

const retakeDatasetLoadInputSchema = z.object({
  datasetPath: datasetPathSchema
});

const retakeDatasetAddEntryInputSchema = z.object({
  datasetPath: datasetPathSchema,
  entry: z.record(z.any())
    .describe('Объект MohoDatasetEntry, который нужно добавить или заменить по entryId.')
});

const retakeDatasetQueryByRigTypeInputSchema = z.object({
  datasetPath: datasetPathSchema,
  rigType: z.enum(['humanoid_2leg', 'quadruped', 'creature', 'mechanical'])
    .describe('Тип рига для фильтрации записей датасета.')
});

const retakeDatasetQueryByShotInputSchema = z.object({
  datasetPath: datasetPathSchema,
  shotId: z.string().min(1).describe('Идентификатор шота для фильтрации записей датасета.')
});

const continuityLedgerPathSchema = z.string().min(1)
  .describe('Абсолютный путь к JSON-файлу журнала MohoContinuityLedger.');

const continuityAppendEntryInputSchema = z.object({
  ledgerPath: continuityLedgerPathSchema,
  entry: z.record(z.any())
    .describe('Объект MohoContinuityEntry для добавления/замены в журнале непрерывности.')
});

const continuityQueryByCharacterInputSchema = z.object({
  ledgerPath: continuityLedgerPathSchema,
  characterId: z.string().min(1)
    .describe('Идентификатор персонажа для фильтрации записей журнала непрерывности.')
});

export const mohoRetakeDatasetTools = [
  {
    name: 'moho.retake.translate',
    description:
      'Транслировать пару MohoPerformancePir (before/after) в детерминированный MohoRetakeManifest: ' +
      'диффить bone/switch/smart-bone ключи, формировать патчи, классифицировать severity (low/medium/high), ' +
      'помечать autoApplicable и requiresHumanApproval. Возвращает { status: "success", retake, warnings }.',
    inputSchema: retakeTranslateInputSchema,
    handler: async (args: z.infer<typeof retakeTranslateInputSchema>) => {
      try {
        const result = new MohoRetakeTranslator().translate({
          ...args,
          beforePir: args.beforePir as any,
          afterPir: args.afterPir as any
        });
        return {
          status: 'success' as const,
          retake: result.retake,
          warnings: result.warnings
        };
      } catch (err: any) {
        return {
          status: 'error' as const,
          code: 'MOHO_RETAKE_TRANSLATE_FAILED',
          message: err?.message ?? String(err),
          warnings: [] as string[]
        };
      }
    }
  },

  {
    name: 'moho.retake_dataset.load',
    description:
      'Загрузить MohoRetakeDataset с диска и провалидировать схему + SHA-256 fingerprint. ' +
      'При отсутствии файла возвращается пустой датасет. При рассогласовании fingerprint — ошибка.',
    inputSchema: retakeDatasetLoadInputSchema,
    handler: async (args: { datasetPath: string }) => {
      try {
        const dataset = new MohoRetakeDatasetStore(args.datasetPath).load();
        return { status: 'success' as const, dataset };
      } catch (err: any) {
        return {
          status: 'error' as const,
          code: 'MOHO_RETAKE_DATASET_LOAD_FAILED',
          message: err?.message ?? String(err)
        };
      }
    }
  },

  {
    name: 'moho.retake_dataset.add_entry',
    description:
      'Добавить или заменить MohoDatasetEntry в MohoRetakeDataset по entryId, пересчитать SHA-256 fingerprint ' +
      'и сохранить датасет на диск. Возвращает обновлённый датасет целиком.',
    inputSchema: retakeDatasetAddEntryInputSchema,
    handler: async (args: { datasetPath: string; entry: Record<string, any> }) => {
      try {
        const dataset = new MohoRetakeDatasetStore(args.datasetPath).addEntry(args.entry as any);
        return { status: 'success' as const, dataset };
      } catch (err: any) {
        return {
          status: 'error' as const,
          code: 'MOHO_RETAKE_DATASET_ADD_ENTRY_FAILED',
          message: err?.message ?? String(err)
        };
      }
    }
  },

  {
    name: 'moho.retake_dataset.query_by_rig_type',
    description:
      'Отфильтровать записи MohoRetakeDataset по типу рига (humanoid_2leg/quadruped/creature/mechanical). ' +
      'Возвращает массив MohoDatasetEntry с совпадающим rigType.',
    inputSchema: retakeDatasetQueryByRigTypeInputSchema,
    handler: async (args: { datasetPath: string; rigType: 'humanoid_2leg' | 'quadruped' | 'creature' | 'mechanical' }) => {
      try {
        const entries = new MohoRetakeDatasetStore(args.datasetPath).queryByRigType(args.rigType);
        return { status: 'success' as const, entries };
      } catch (err: any) {
        return {
          status: 'error' as const,
          code: 'MOHO_RETAKE_DATASET_QUERY_BY_RIG_TYPE_FAILED',
          message: err?.message ?? String(err),
          entries: [] as Record<string, any>[]
        };
      }
    }
  },

  {
    name: 'moho.retake_dataset.query_by_shot',
    description:
      'Отфильтровать записи MohoRetakeDataset по shotId. Возвращает массив MohoDatasetEntry для запрошенного шота.',
    inputSchema: retakeDatasetQueryByShotInputSchema,
    handler: async (args: { datasetPath: string; shotId: string }) => {
      try {
        const entries = new MohoRetakeDatasetStore(args.datasetPath).queryByShot(args.shotId);
        return { status: 'success' as const, entries };
      } catch (err: any) {
        return {
          status: 'error' as const,
          code: 'MOHO_RETAKE_DATASET_QUERY_BY_SHOT_FAILED',
          message: err?.message ?? String(err),
          entries: [] as Record<string, any>[]
        };
      }
    }
  },

  {
    name: 'moho.continuity.append_entry',
    description:
      'Добавить или заменить MohoContinuityEntry в журнале непрерывности по shotId, ' +
      'пересчитать SHA-256 fingerprint и сохранить на диск. Возвращает обновлённый ledger.',
    inputSchema: continuityAppendEntryInputSchema,
    handler: async (args: { ledgerPath: string; entry: Record<string, any> }) => {
      try {
        const ledger = new MohoContinuityLedger(args.ledgerPath).appendEntry(args.entry as any);
        return { status: 'success' as const, ledger };
      } catch (err: any) {
        return {
          status: 'error' as const,
          code: 'MOHO_CONTINUITY_APPEND_ENTRY_FAILED',
          message: err?.message ?? String(err)
        };
      }
    }
  },

  {
    name: 'moho.continuity.query_by_character',
    description:
      'Отфильтровать записи MohoContinuityLedger по characterId. ' +
      'Возвращает массив MohoContinuityEntry, относящихся к указанному персонажу.',
    inputSchema: continuityQueryByCharacterInputSchema,
    handler: async (args: { ledgerPath: string; characterId: string }) => {
      try {
        const entries = new MohoContinuityLedger(args.ledgerPath).queryByCharacter(args.characterId);
        return { status: 'success' as const, entries };
      } catch (err: any) {
        return {
          status: 'error' as const,
          code: 'MOHO_CONTINUITY_QUERY_BY_CHARACTER_FAILED',
          message: err?.message ?? String(err),
          entries: [] as Record<string, any>[]
        };
      }
    }
  }
];