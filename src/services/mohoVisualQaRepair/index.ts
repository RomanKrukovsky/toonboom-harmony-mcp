import { execFile } from 'child_process';
import path from 'path';
import util from 'util';
import { z } from 'zod';
import { verifyPathAccess } from '../../security.js';

const execFilePromise = util.promisify(execFile);

export const MohoQaRepairSpecSchema = z.object({
  projectId: z.string().describe('ID of the project to audit and repair'),
  maxPasses: z.number().int().min(1).max(5).optional().default(5).describe('Maximum number of repair passes'),
  autoRepair: z.boolean().optional().default(true).describe('Whether to automatically apply fixes')
});

export type MohoQaRepairSpec = z.infer<typeof MohoQaRepairSpecSchema>;

export const MohoQaRepairResultSchema = z.object({
  status: z.enum(['success', 'failed']),
  projectId: z.string(),
  is_certified: z.boolean(),
  passes_executed: z.number().optional(),
  repairs_promoted: z.boolean().optional(),
  fixes_applied: z.number().optional(),
  evidence_directory: z.string().optional(),
  final_acceptance: z.object({
    opened: z.boolean(),
    saved: z.boolean(),
    reopened: z.boolean(),
    errors: z.array(z.string())
  }).optional(),
  log: z.array(z.record(z.any()))
});

export type MohoQaRepairResult = z.infer<typeof MohoQaRepairResultSchema>;

export class MohoVisualQaRepairEngine {
  constructor(private options: { projectPath: string }) {}

  async runRepairLoop(spec: MohoQaRepairSpec): Promise<MohoQaRepairResult> {
    const validated = MohoQaRepairSpecSchema.parse(spec);
    const requestedProject = verifyPathAccess(path.resolve(validated.projectId));
    const configuredProject = verifyPathAccess(path.resolve(this.options.projectPath));
    if (requestedProject !== configuredProject) {
      throw new Error('projectId must match the projectPath used to create the QA engine');
    }
    const evidenceDirectory = path.join(path.dirname(configuredProject), 'qa-evidence');
    const args: string[] = [
      '-m',
      'pipeline.tools.qa_repair_cli',
      '--project-id',
      configuredProject,
      '--max-passes',
      String(validated.maxPasses ?? 5),
      '--evidence-dir',
      evidenceDirectory
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
        projectId: configuredProject,
        is_certified: false,
        passes_executed: 0,
        log: [{ error: `Failed to run QA repair engine: ${e.message}` }]
      };
    }
  }
}
