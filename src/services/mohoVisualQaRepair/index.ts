import { execFile } from 'child_process';
import util from 'util';
import { z } from 'zod';

const execFilePromise = util.promisify(execFile);

export const MohoQaRepairSpecSchema = z.object({
  projectId: z.string().describe('ID of the project to audit and repair'),
  maxPasses: z.number().optional().default(5).describe('Maximum number of repair passes'),
  autoRepair: z.boolean().optional().default(true).describe('Whether to automatically apply fixes')
});

export type MohoQaRepairSpec = z.infer<typeof MohoQaRepairSpecSchema>;

export const MohoQaRepairResultSchema = z.object({
  status: z.enum(['success', 'failed']),
  projectId: z.string(),
  is_certified: z.boolean(),
  passes_executed: z.number().optional(),
  log: z.array(z.record(z.any()))
});

export type MohoQaRepairResult = z.infer<typeof MohoQaRepairResultSchema>;

export class MohoVisualQaRepairEngine {
  constructor(private options: { projectPath: string }) {}

  async runRepairLoop(spec: MohoQaRepairSpec): Promise<MohoQaRepairResult> {
    const validated = MohoQaRepairSpecSchema.parse(spec);
    const args: string[] = [
      '-m',
      'pipeline.tools.qa_repair_cli',
      '--project-id',
      validated.projectId,
      '--max-passes',
      String(validated.maxPasses ?? 5)
    ];

    if (validated.autoRepair) {
      args.push('--auto-repair');
    }

    try {
      const { stdout } = await execFilePromise('python3', args, {
        cwd: process.cwd(),
        env: { ...process.env, PYTHONPATH: process.cwd() }
      });

      const parsed = JSON.parse(stdout.trim());
      return MohoQaRepairResultSchema.parse(parsed);
    } catch (e: any) {
      return {
        status: 'failed',
        projectId: validated.projectId,
        is_certified: false,
        passes_executed: 0,
        log: [{ error: `Failed to run QA repair engine: ${e.message}` }]
      };
    }
  }
}
