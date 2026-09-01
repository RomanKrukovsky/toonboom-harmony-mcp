import { z } from 'zod';
import { MohoQaGate, type MohoQaGateResult, type MohoQaCheckDescriptor } from '../services/mohoQaGate/index.js';
import { MohoRetakeEngine, type MohoRetakeEngineResult } from '../services/mohoRetakeEngine/index.js';

const gate = new MohoQaGate();
const retakeEngine = new MohoRetakeEngine();

export const mohoQaGateTools = [
  {
    name: 'moho.qa.evaluate',
    description:
      'Запустить Moho QA Gate: оценить результат рендера шота по набору проверок (silhouette, ' +
      'lipsync, continuity, line thickness, palette, pose library, rig integrity, intersection, ' +
      'style compliance) против порогов thresholds. На вход подаются shotId, renderResult, ' +
      'опциональный visualDiff, PerformancePIR и QaThresholds. Возвращает MohoQaGateResult со ' +
      'списком findings, общим verdict (pass/warn/fail) и списком проверок.',
    inputSchema: z.object({
      shotId: z.string().describe('Идентификатор шота для QA-оценки.'),
      renderResult: z.any().describe('Результат рендера шота (метрики и тайминги, проверенные gate-ом).'),
      visualDiff: z.any().optional().describe('Опциональный визуальный diff против референса/предыдущего шота.'),
      pir: z.any().describe('Moho PerformancePIR — источник bone/frame/scene контекста для проверок.'),
      thresholds: z.any().describe('QaThresholds — пороги проверок QA gate.')
    }).strict(),
    handler: async (args: {
      shotId: string;
      renderResult: unknown;
      visualDiff?: unknown;
      pir: unknown;
      thresholds: unknown;
    }): Promise<{ status: 'success'; result: MohoQaGateResult } | { status: 'error'; code: string; message: string }> => {
      try {
        const result = gate.evaluate({
          shotId: args.shotId,
          renderResult: args.renderResult as any,
          visualDiff: args.visualDiff as any,
          pir: args.pir as any,
          thresholds: args.thresholds as any
        });
        return { status: 'success', result };
      } catch (err: any) {
        return {
          status: 'error',
          code: err?.code ?? 'MOHO_QA_GATE_EVALUATE_FAILED',
          message: err?.message ?? String(err)
        };
      }
    }
  },
  {
    name: 'moho.qa.list_checks',
    description:
      'Перечислить все проверки, которые знает Moho QA Gate. Возвращает массив объектов с ' +
      'полями name, description и defaultSeverity. Полезно для отладки, документирования и ' +
      'построения дашбордов качества — не требует никаких входных данных.',
    inputSchema: z.object({}).strict(),
    handler: async (): Promise<
      | { status: 'success'; checks: Array<{ name: string; description: string; defaultSeverity: string }> }
      | { status: 'error'; code: string; message: string }
    > => {
      try {
        const checks: MohoQaCheckDescriptor[] = gate.listChecks();
        return {
          status: 'success',
          checks: checks.map(c => ({
            name: c.name,
            description: c.description,
            defaultSeverity: c.defaultSeverity
          }))
        };
      } catch (err: any) {
        return {
          status: 'error',
          code: err?.code ?? 'MOHO_QA_GATE_LIST_CHECKS_FAILED',
          message: err?.message ?? String(err)
        };
      }
    }
  },
  {
    name: 'moho.retake.generate',
    description:
      'Сгенерировать Moho RetakeEngineResult (набор исправлений) на основе PerformancePIR, ' +
      'MohoCharacterBible, результата QA-оценки и порогов thresholds. Возвращает план retake ' +
      'с описанием auto-fixable проверок, требуемых изменений и маркеров, которые нужно ' +
      'применить к ригу/анимации. Используется retake loop-ом после неуспешного QA.',
    inputSchema: z.object({
      pir: z.any().describe('Moho PerformancePIR — источник костей, switch keys и motion grammar.'),
      characterBible: z.any().describe('MohoCharacterBible — источник контроллеров, switch layers и joint ranges.'),
      qaResult: z.any().describe('MohoQaGateResult, на основе которого строится retake.'),
      thresholds: z.any().describe('QaThresholds, использованные QA gate-ом.')
    }).strict(),
    handler: async (args: {
      pir: unknown;
      characterBible: unknown;
      qaResult: unknown;
      thresholds: unknown;
    }): Promise<{ status: 'success'; retake: MohoRetakeEngineResult } | { status: 'error'; code: string; message: string }> => {
      try {
        const retake = retakeEngine.generatePatches({
          pir: args.pir as any,
          characterBible: args.characterBible as any,
          qaResult: args.qaResult as any,
          thresholds: args.thresholds as any
        });
        return { status: 'success', retake };
      } catch (err: any) {
        return {
          status: 'error',
          code: err?.code ?? 'MOHO_RETAKE_ENGINE_GENERATE_FAILED',
          message: err?.message ?? String(err)
        };
      }
    }
  },
  {
    name: 'moho.retake.can_auto_apply',
    description:
      'Определить, может ли Moho RetakeEngineResult быть применён автоматически (без ручного ' +
      'вмешательства аниматора). На вход подаётся retake и пороги thresholds. Возвращает ' +
      'canAutoApply (boolean) и список reasons — объяснение, почему retake требует ручной ' +
      'проверки (например, изменения вне auto-fixable диапазона, изменения joint ranges и т.п.).',
    inputSchema: z.object({
      retake: z.any().describe('MohoRetakeEngineResult, сгенерированный moho.retake.generate.'),
      thresholds: z.any().describe('QaThresholds, задающие границы auto-fixable исправлений.')
    }).strict(),
    handler: async (args: { retake: unknown; thresholds: unknown }): Promise<
      | { status: 'success'; canAutoApply: boolean; reasons: string[] }
      | { status: 'error'; code: string; message: string }
    > => {
      try {
        const decision = MohoRetakeEngine.canAutoApply(
          args.retake as any,
          args.thresholds as any
        );
        return {
          status: 'success',
          canAutoApply: decision.canAutoApply,
          reasons: decision.reasons
        };
      } catch (err: any) {
        return {
          status: 'error',
          code: err?.code ?? 'MOHO_RETAKE_ENGINE_CAN_AUTO_APPLY_FAILED',
          message: err?.message ?? String(err)
        };
      }
    }
  }
];