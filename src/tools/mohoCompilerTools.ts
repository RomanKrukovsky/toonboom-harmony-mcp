import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';
import { z } from 'zod';
import {
  MohoPerformancePirCompiler,
  type MohoPerformancePirCompilerOptions,
  type MohoPerformancePirCompilerResult
} from '../services/mohoPerformancePirCompiler/index.js';
import {
  MohoCommandBuilder,
  type MohoCommandBuilderOptions,
  type MohoCommandBuilderResult
} from '../services/mohoCommandBuilder/index.js';
import { mohoPerformancePirSchema } from '../schemas/mohoPerformancePir.js';
import { mohoCommandPlanSchema } from '../schemas/mohoCommandPlan.js';

function computePirFingerprint(pir: unknown): string {
  const stable = stringify(pir as any) ?? '';
  return crypto.createHash('sha256').update(stable).digest('hex');
}

function computePlanFingerprint(plan: unknown): string {
  const stable = stringify(plan as any) ?? '';
  return crypto.createHash('sha256').update(stable).digest('hex');
}

const compiler = new MohoPerformancePirCompiler();
const builder = new MohoCommandBuilder();

export const mohoCompilerTools = [
  {
    name: 'moho.performance_pir.compile',
    description:
      'Скомпилировать Moho PerformancePIR из ShotManifest + MohoCharacterBible (+ опциональные ' +
      'MohoCameraRules, MohoMotionGrammar). Возвращает PIR, его SHA-256 fingerprint, список ' +
      'cross-reference violations и warnings. Fail-closed при unknown_rig_type.',
    inputSchema: z.object({
      shotManifest: z.any().describe('ShotManifest (любой объект, тип проверяется на этапе компиляции).'),
      characterBible: z.any().describe('MohoCharacterBible для целевого рига.'),
      cameraRules: z.any().optional().describe('Опциональные MohoCameraRules.'),
      motionGrammar: z.any().optional().describe('Опциональные MohoMotionGrammar.'),
      crossRefs: z.any().optional().describe('Опциональные ShowBibleCrossRefs для гейтинга словаря.'),
      compilerVersion: z.string().optional().describe('Опциональная версия компилятора (default: moho-pir-compiler-v1).')
    }).strict(),
    handler: async (args: MohoPerformancePirCompilerOptions): Promise<
      | {
          status: 'success';
          pir: MohoPerformancePirCompilerResult['pir'];
          fingerprint: string;
          violations: MohoPerformancePirCompilerResult['violations'];
          warnings: MohoPerformancePirCompilerResult['warnings'];
        }
      | { status: 'error'; code: string; message: string }
    > => {
      try {
        const result = compiler.compile(args);
        return {
          status: 'success',
          pir: result.pir,
          fingerprint: result.pir.deterministicFingerprint,
          violations: result.violations,
          warnings: result.warnings
        };
      } catch (err: any) {
        return {
          status: 'error',
          code: err?.code ?? 'MOHO_PERFORMANCE_PIR_COMPILE_FAILED',
          message: err?.message ?? String(err)
        };
      }
    }
  },
  {
    name: 'moho.performance_pir.fingerprint',
    description:
      'Посчитать детерминированный SHA-256 fingerprint (64 hex символа) канонизированного ' +
      'Moho PerformancePIR. Использует fast-json-stable-stringify, поэтому порядок ключей ' +
      'не влияет на результат.',
    inputSchema: z.object({
      pir: z.any().describe('Moho PerformancePIR для вычисления fingerprint.')
    }).strict(),
    handler: async (args: { pir: unknown }): Promise<
      { status: 'success'; fingerprint: string } | { status: 'error'; code: string; message: string }
    > => {
      try {
        const fingerprint = computePirFingerprint(args.pir);
        return { status: 'success', fingerprint };
      } catch (err: any) {
        return {
          status: 'error',
          code: err?.code ?? 'MOHO_PERFORMANCE_PIR_FINGERPRINT_FAILED',
          message: err?.message ?? String(err)
        };
      }
    }
  },
  {
    name: 'moho.performance_pir.validate',
    description:
      'Провалидировать Moho PerformancePIR против mohoPerformancePirSchema (schemaVersion 1.0) ' +
      'через safeParse. Возвращает status valid/invalid и список ошибок zod при отказе. ' +
      'Не возвращает fingerprint — для этого есть отдельный инструмент.',
    inputSchema: z.object({
      pir: z.any().describe('Сырой JSON-объект Moho PerformancePIR для валидации.')
    }).strict(),
    handler: async (args: { pir: unknown }): Promise<
      { status: 'valid' } | { status: 'invalid'; errors: string[] }
    > => {
      const parsed = mohoPerformancePirSchema.safeParse(args.pir);
      if (parsed.success) {
        return { status: 'valid' };
      }
      const issues: any[] = parsed.error.issues ?? [];
      const messages = issues.length
        ? issues.map((i: any) => `${i.path?.join('.') ?? '?'}: ${i.message}`)
        : ['unknown validation error'];
      return { status: 'invalid', errors: messages };
    }
  },
  {
    name: 'moho.command_plan.build',
    description:
      'Скомпилировать Moho CommandPlan из PerformancePIR + MohoCharacterBible (+ опциональный ' +
      'documentPath). Возвращает план и его SHA-256 fingerprint поверх операций. Все команды ' +
      'проходят через mohoCommandPlanSchema, поэтому невалидные операции отклоняются на этапе сборки.',
    inputSchema: z.object({
      pir: z.any().describe('Moho PerformancePIR — источник костей, switch keys, smart bone actions.'),
      characterBible: z.any().describe('MohoCharacterBible — источник контроллеров, switch layers.'),
      documentPath: z.string().nullable().optional().describe('Опциональный путь к .moho документу для save_document.'),
      compilerName: z.string().optional().describe('Опциональное имя компилятора (default: MohoCommandBuilder v1).')
    }).strict(),
    handler: async (args: MohoCommandBuilderOptions): Promise<
      | { status: 'success'; plan: MohoCommandBuilderResult['plan']; fingerprint: string }
      | { status: 'error'; code: string; message: string }
    > => {
      try {
        const { plan, fingerprint } = builder.buildWithFingerprint(args);
        return { status: 'success', plan, fingerprint };
      } catch (err: any) {
        const issues: any[] = err?.issues ?? [];
        const message = issues.length
          ? issues.map((i: any) => `${i.path?.join('.') ?? '?'}: ${i.message}`).join('; ')
          : err?.message ?? String(err);
        return {
          status: 'error',
          code: err?.code ?? 'MOHO_COMMAND_PLAN_BUILD_FAILED',
          message
        };
      }
    }
  },
  {
    name: 'moho.command_plan.fingerprint',
    description:
      'Посчитать детерминированный SHA-256 fingerprint (64 hex символа) канонизированного ' +
      'Moho CommandPlan. Использует fast-json-stable-stringify поверх всего объекта плана.',
    inputSchema: z.object({
      plan: z.any().describe('Moho CommandPlan для вычисления fingerprint.')
    }).strict(),
    handler: async (args: { plan: unknown }): Promise<
      { status: 'success'; fingerprint: string } | { status: 'error'; code: string; message: string }
    > => {
      try {
        const fingerprint = computePlanFingerprint(args.plan);
        return { status: 'success', fingerprint };
      } catch (err: any) {
        return {
          status: 'error',
          code: err?.code ?? 'MOHO_COMMAND_PLAN_FINGERPRINT_FAILED',
          message: err?.message ?? String(err)
        };
      }
    }
  },
  {
    name: 'moho.command_plan.validate',
    description:
      'Провалидировать Moho CommandPlan против mohoCommandPlanSchema через safeParse. ' +
      'Возвращает status valid/invalid и список ошибок zod при отказе. Не возвращает fingerprint.',
    inputSchema: z.object({
      plan: z.any().describe('Сырой JSON-объект Moho CommandPlan для валидации.')
    }).strict(),
    handler: async (args: { plan: unknown }): Promise<
      { status: 'valid' } | { status: 'invalid'; errors: string[] }
    > => {
      const parsed = mohoCommandPlanSchema.safeParse(args.plan);
      if (parsed.success) {
        return { status: 'valid' };
      }
      const issues: any[] = parsed.error.issues ?? [];
      const messages = issues.length
        ? issues.map((i: any) => `${i.path?.join('.') ?? '?'}: ${i.message}`)
        : ['unknown validation error'];
      return { status: 'invalid', errors: messages };
    }
  }
];