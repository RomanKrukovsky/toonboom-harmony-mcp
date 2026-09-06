import { execFile } from 'child_process';
import path from 'path';
import util from 'util';
import { z } from 'zod';
import { verifyPathAccess } from '../../security.js';

const execFilePromise = util.promisify(execFile);

export const MohoQaRepairSpecSchema = z.object({
  projectPath: z.string().optional().describe('Path to the Moho project (.moho) to audit and repair'),
  projectId: z.string().optional().describe('Legacy alias for projectPath'),
  manifestPath: z.string().optional().describe('Optional shot manifest or scene plan path for timing/dialogue alignment'),
  maxRepairPasses: z.number().int().min(1).max(5).optional().describe('Maximum number of repair passes (up to 5)'),
  maxPasses: z.number().int().min(1).max(5).optional().describe('Legacy alias for maxRepairPasses'),
  evidenceDir: z.string().optional().describe('Optional directory to store frame renders and inspection reports'),
  outputPath: z.string().optional().describe('Optional target path for certified repaired project file'),
  autoRepair: z.boolean().optional().describe('Whether to automatically apply safe deterministic fixes')
}).refine(data => Boolean(data.projectPath || data.projectId), {
  message: 'Either projectPath or projectId must be provided'
});

export type MohoQaRepairSpec = z.input<typeof MohoQaRepairSpecSchema>;

export const MohoQaRepairResultSchema = z.object({
  status: z.enum(['success', 'failed']),
  certified: z.boolean(),
  is_certified: z.boolean().optional(),
  initialScore: z.number(),
  finalScore: z.number(),
  repairPasses: z.number(),
  passes_executed: z.number().optional(),
  detectedDefects: z.array(z.record(z.any())).default([]),
  appliedRepairs: z.array(z.record(z.any())).default([]),
  evidenceDirectory: z.string(),
  evidence_directory: z.string().optional(),
  projectId: z.string().optional(),
  projectPath: z.string().optional(),
  outputPath: z.string().optional(),
  repairs_promoted: z.boolean().optional(),
  fixes_applied: z.number().optional(),
  final_acceptance: z.object({
    opened: z.boolean(),
    saved: z.boolean(),
    reopened: z.boolean(),
    errors: z.array(z.string())
  }).optional(),
  log: z.array(z.record(z.any())).default([])
});

export type MohoQaRepairResult = z.infer<typeof MohoQaRepairResultSchema>;

export class MohoVisualQaRepairEngine {
  constructor(private options: { projectPath: string }) {}

  async runRepairLoop(spec: MohoQaRepairSpec): Promise<MohoQaRepairResult> {
    const validated = MohoQaRepairSpecSchema.parse(spec);
    const targetProjectRaw = validated.projectPath ?? validated.projectId ?? this.options.projectPath;
    const requestedProject = verifyPathAccess(path.resolve(targetProjectRaw));
    const configuredProject = verifyPathAccess(path.resolve(this.options.projectPath));
    if (requestedProject !== configuredProject) {
      throw new Error('projectPath must match the projectPath used to create the QA engine');
    }

    const passes = validated.maxRepairPasses ?? validated.maxPasses ?? 5;
    const evidenceDirectory = validated.evidenceDir
      ? verifyPathAccess(path.resolve(validated.evidenceDir))
      : path.join(path.dirname(configuredProject), 'qa-evidence');

    const args: string[] = [
      '-m',
      'pipeline.tools.qa_repair_cli',
      '--project-path',
      configuredProject,
      '--max-repair-passes',
      String(passes),
      '--evidence-dir',
      evidenceDirectory
    ];

    if (validated.manifestPath) {
      const resolvedManifest = verifyPathAccess(path.resolve(validated.manifestPath));
      args.push('--manifest-path', resolvedManifest);
    }

    if (validated.outputPath) {
      const resolvedOutput = verifyPathAccess(path.resolve(validated.outputPath));
      args.push('--output-path', resolvedOutput);
    }

    if (validated.autoRepair) {
      args.push('--auto-repair');
    } else {
      args.push('--no-auto-repair');
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
        certified: false,
        is_certified: false,
        initialScore: 0,
        finalScore: 0,
        repairPasses: 0,
        passes_executed: 0,
        detectedDefects: [{ issue_type: 'engine_error', severity: 'critical', description: e.message }],
        appliedRepairs: [],
        evidenceDirectory,
        evidence_directory: evidenceDirectory,
        projectId: configuredProject,
        projectPath: configuredProject,
        log: [{ error: `Failed to run QA repair engine: ${e.message}` }]
      };
    }
  }
}
