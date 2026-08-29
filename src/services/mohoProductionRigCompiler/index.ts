import { execFile } from 'child_process';
import path from 'path';
import util from 'util';
import { z } from 'zod';
import { verifyPathAccess } from '../../security.js';

const execFilePromise = util.promisify(execFile);

export const ProductionRigInputSchema = z.object({
  characterName: z.string().default('Stage1Hero'),
  gender: z.enum(['male', 'female', 'neutral']).optional().default('neutral'),
  skinRgb: z.tuple([z.number(), z.number(), z.number()]).optional(),
  hairRgb: z.tuple([z.number(), z.number(), z.number()]).optional(),
  shirtRgb: z.tuple([z.number(), z.number(), z.number()]).optional(),
  pantsRgb: z.tuple([z.number(), z.number(), z.number()]).optional(),
  shoesRgb: z.tuple([z.number(), z.number(), z.number()]).optional(),
  outputPath: z.string().describe('Target output path for .moho file'),
  evidenceDirectory: z.string().optional().describe('Directory to store evidence'),
  canvasWidth: z.number().optional().default(1920),
  canvasHeight: z.number().optional().default(1080),
  minimumScore: z.number().optional().default(95)
});

export type ProductionRigInput = z.input<typeof ProductionRigInputSchema>;

export const ProductionRigResultSchema = z.object({
  status: z.enum(['certified', 'failed']),
  outputPath: z.string(),
  score: z.number(),
  certified: z.boolean(),
  mandatoryPassed: z.boolean(),
  gates: z.array(
    z.object({
      name: z.string(),
      weight: z.number(),
      earned: z.number(),
      mandatory: z.boolean(),
      passed: z.boolean(),
      detail: z.string().optional()
    })
  ),
  evidenceDirectory: z.string(),
  errors: z.array(z.string())
});

export type ProductionRigResult = z.infer<typeof ProductionRigResultSchema>;

export class MohoProductionRigCompiler {
  public static async compile(input: ProductionRigInput): Promise<ProductionRigResult> {
    const validated = ProductionRigInputSchema.parse(input);
    const outAbs = verifyPathAccess(path.resolve(validated.outputPath));
    const evAbs = validated.evidenceDirectory
      ? verifyPathAccess(path.resolve(validated.evidenceDirectory))
      : path.join(path.dirname(outAbs), 'evidence');

    const args: string[] = [
      '-m',
      'pipeline.tools.compile_humanoid_cli',
      '--name',
      validated.characterName,
      '--gender',
      validated.gender,
      '--canvas-width',
      String(validated.canvasWidth),
      '--canvas-height',
      String(validated.canvasHeight),
      '--output',
      outAbs,
      '--evidence',
      evAbs,
      '--min-score',
      String(validated.minimumScore)
    ];

    if (validated.skinRgb) {
      args.push('--skin-rgb', ...validated.skinRgb.map(String));
    }
    if (validated.hairRgb) {
      args.push('--hair-rgb', ...validated.hairRgb.map(String));
    }
    if (validated.shirtRgb) {
      args.push('--shirt-rgb', ...validated.shirtRgb.map(String));
    }
    if (validated.pantsRgb) {
      args.push('--pants-rgb', ...validated.pantsRgb.map(String));
    }
    if (validated.shoesRgb) {
      args.push('--shoes-rgb', ...validated.shoesRgb.map(String));
    }

    try {
      const { stdout } = await execFilePromise('python3', args, {
        cwd: process.cwd(),
        env: { ...process.env, PYTHONPATH: process.cwd() }
      });

      const parsedJson = JSON.parse(stdout.trim());
      const result = ProductionRigResultSchema.parse(parsedJson);
      return result;
    } catch (err: any) {
      return {
        status: 'failed',
        outputPath: outAbs,
        score: 0,
        certified: false,
        mandatoryPassed: false,
        gates: [],
        evidenceDirectory: evAbs,
        errors: [`Compiler execution failure: ${err.message}`]
      };
    }
  }
}
