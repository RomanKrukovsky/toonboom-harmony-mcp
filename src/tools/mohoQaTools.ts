import { z } from 'zod';
import { MohoQaRepairSpecSchema, MohoVisualQaRepairEngine } from '../services/mohoVisualQaRepair/index.js';

export const mohoQaTools = [
  {
    name: 'moho.qa.certify_and_repair',
    description:
      'Automatically audits rendered Moho frames, diagnoses visual and structural defects, ' +
      'applies targeted automatic fixes, and re-certifies projects in an iterative repair loop (max 5 passes).',
    inputSchema: MohoQaRepairSpecSchema,
    handler: async (args: z.infer<typeof MohoQaRepairSpecSchema>) => {
      const engine = new MohoVisualQaRepairEngine({ projectPath: args.projectId });
      const result = await engine.runRepairLoop(args);
      return result;
    }
  }
];
