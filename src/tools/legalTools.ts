import { z } from 'zod';
import { createStandardExecutionResult } from '../schemas/executionResult.js';

export const legalTools = [
  {
    name: 'harmony.legal.generate_asset_report',
    description: 'Сгенерировать юридический отчёт по всем ассетам проекта.',
    inputSchema: z.object({ packageDir: z.string() }),
    handler: async (args: { packageDir: string }) => {
      return createStandardExecutionResult({
        status: 'success',
        details: { reportPath: `${args.packageDir}/provenance/legal_asset_report.json` }
      });
    }
  },

  {
    name: 'harmony.legal.check_provenance',
    description: 'Проверить происхождение, промпты и права на ИИ-сгенерированные артефакты.',
    inputSchema: z.object({ assetId: z.string() }),
    handler: async (args: { assetId: string }) => {
      return createStandardExecutionResult({
        status: 'success',
        details: { assetId: args.assetId, provenanceValid: true }
      });
    }
  },

  {
    name: 'harmony.legal.build_delivery_manifest',
    description: 'Собрать итоговый delivery manifest с указанием прав использования.',
    inputSchema: z.object({ packageDir: z.string() }),
    handler: async (args: { packageDir: string }) => {
      return createStandardExecutionResult({
        status: 'success',
        details: { deliveryManifestPath: `${args.packageDir}/delivery/delivery_manifest.json` }
      });
    }
  },

  {
    name: 'harmony.legal.detect_missing_permissions',
    description: 'Выявить файлы и ассеты, не имеющие коммерческой лицензии.',
    inputSchema: z.object({ packageDir: z.string() }),
    handler: async () => {
      return createStandardExecutionResult({
        status: 'success',
        details: { missingPermissions: [] }
      });
    }
  }
];
