import { z } from 'zod';
import { MohoTimeSavings, type MohoTimeSavingsReport } from '../services/mohoTimeSavings/index.js';

const generateInputSchema = z.object({
  runState: z.any().describe('Финальный MohoFactoryRunState — результат прогона фабрики (стадии, shotResults, fingerprint, approval-журнал).'),
  manualMinutesPerShot: z.number().optional().describe('Трудоёмкость ручной анимации одного шота в минутах (по умолчанию 240 = 4 часа).'),
  hourlyRateEur: z.number().optional().describe('Часовая ставка аниматора в EUR для расчёта экономии в деньгах (по умолчанию 35).')
}).strict();

const formatForSalesInputSchema = z.object({
  report: z.any().describe('MohoTimeSavingsReport, ранее полученный из moho.time_savings.generate.')
}).strict();

export const mohoTimeSavingsTools = [
  {
    name: 'moho.time_savings.generate',
    description:
      'Сгенерировать отчёт экономии времени по финальному MohoFactoryRunState: считает manual ' +
      'time, AI time, saved hours и money saved (EUR) для каждого characterType и всего прогона ' +
      'целиком. Возвращает MohoTimeSavingsReport — структурированный JSON для дашборда, ' +
      'аналитики или последующего форматирования в sales-pitch.',
    inputSchema: generateInputSchema,
    handler: async (args: {
      runState: unknown;
      manualMinutesPerShot?: number;
      hourlyRateEur?: number;
    }): Promise<
      | { status: 'success'; report: MohoTimeSavingsReport }
      | { status: 'error'; code: string; message: string }
    > => {
      try {
        const report = MohoTimeSavings.generate({
          runState: args.runState as any,
          manualMinutesPerShot: args.manualMinutesPerShot,
          hourlyRateEur: args.hourlyRateEur
        });
        return { status: 'success', report };
      } catch (err: any) {
        return {
          status: 'error',
          code: err?.code ?? 'MOHO_TIME_SAVINGS_GENERATE_FAILED',
          message: err?.message ?? String(err)
        };
      }
    }
  },
  {
    name: 'moho.time_savings.format_for_sales',
    description:
      'Преобразовать MohoTimeSavingsReport в короткий человекочитаемый pitch-текст для отдела ' +
      'продаж: заголовок, имя проекта, число обработанных шотов, manual/AI hours, экономия в ' +
      'часах и EUR, а также построчная разбивка по типам персонажей. Возвращает строку, готовую ' +
      'к вставке в email/презентацию.',
    inputSchema: formatForSalesInputSchema,
    handler: async (args: {
      report: unknown;
    }): Promise<
      | { status: 'success'; pitch: string }
      | { status: 'error'; code: string; message: string }
    > => {
      try {
        const pitch = MohoTimeSavings.formatForSales(args.report as any);
        return { status: 'success', pitch };
      } catch (err: any) {
        return {
          status: 'error',
          code: err?.code ?? 'MOHO_TIME_SAVINGS_FORMAT_FAILED',
          message: err?.message ?? String(err)
        };
      }
    }
  }
];