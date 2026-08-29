import { execFile } from 'child_process';
import path from 'path';
import util from 'util';
import { z } from 'zod';
import { verifyPathAccess } from '../security.js';

const execFilePromise = util.promisify(execFile);

async function runStage4Cli(subcommand: string, args: string[]): Promise<any> {
  const fullArgs = ['-m', 'pipeline.tools.stage4_artwork_cli', subcommand, ...args];
  const { stdout } = await execFilePromise('python3', fullArgs, {
    cwd: process.cwd(),
    env: { ...process.env, PYTHONPATH: process.cwd() }
  });
  return JSON.parse(stdout.trim());
}

export const mohoStage4ArtworkBatchTools = [
  {
    name: 'moho.assets.inspect_psd',
    description: 'Parse real multi-layer PSD files and report measured hierarchy, visibility, opacity and bounds.',
    inputSchema: z.object({
      file_path: z.string().describe('Path to the PSD file'),
    }),
    handler: async (args: { file_path: string }) => {
      const absPath = verifyPathAccess(path.resolve(args.file_path));
      const res = await runStage4Cli('inspect_psd', ['--file', absPath]);
      return res;
    }
  },
  {
    name: 'moho.assets.import_psd_character',
    description: 'Extract real PSD layers to PNG and split limbs with measured 15% overlap at joints.',
    inputSchema: z.object({
      file_path: z.string().describe('Path to the PSD file'),
      options: z.record(z.any()).optional().describe('Import options'),
    }),
    handler: async (args: { file_path: string; options?: Record<string, any> }) => {
      const absPath = verifyPathAccess(path.resolve(args.file_path));
      const safeOptions = { ...(args.options || {}) };
      if (typeof safeOptions.output_dir === 'string') {
        safeOptions.output_dir = verifyPathAccess(path.resolve(safeOptions.output_dir));
      }
      const optsJson = JSON.stringify(safeOptions);
      const res = await runStage4Cli('import_psd', ['--file', absPath, '--options', optsJson]);
      return res;
    }
  },
  {
    name: 'moho.assets.relink',
    description: 'Copy matching image assets into the project, rewrite relative references, and recertify in native Moho.',
    inputSchema: z.object({
      project_path: z.string().describe('Path to the Moho project'),
      asset_paths: z.array(z.string()).describe('List of absolute asset paths to relink'),
    }),
    handler: async (args: { project_path: string; asset_paths: string[] }) => {
      const projAbs = verifyPathAccess(path.resolve(args.project_path));
      const assetAbsList = args.asset_paths.map(p => verifyPathAccess(path.resolve(p)));
      const res = await runStage4Cli('relink', ['--project', projAbs, '--assets', ...assetAbsList]);
      return res;
    }
  },
  {
    name: 'moho.rig.compile_from_artwork',
    description: 'Compile and natively certify an artwork-backed rig from extracted PSD layers and a real body plan.',
    inputSchema: z.object({
      psd_data: z.record(z.any()).describe('Parsed PSD data'),
      body_plan: z.enum(['adult_neutral', 'slim', 'stocky', 'child', 'tall', 'short', 'masculine', 'feminine']),
      body_params: z.record(z.any()).default({}).describe('Parameters like skin_rgb, hair_rgb'),
      output_path: z.string().describe('Path for the certified .moho file'),
    }),
    handler: async (args: { psd_data: Record<string, any>; body_plan: string; body_params: Record<string, any>; output_path: string }) => {
      for (const layer of args.psd_data.processed_layers || []) {
        if (typeof layer.file_path === 'string') {
          layer.file_path = verifyPathAccess(path.resolve(layer.file_path));
        }
      }
      const outputPath = verifyPathAccess(path.resolve(args.output_path));
      const psdJson = JSON.stringify(args.psd_data);
      const paramsJson = JSON.stringify(args.body_params);
      const res = await runStage4Cli('compile_from_artwork', [
        '--psd-data',
        psdJson,
        '--body-plan',
        args.body_plan,
        '--body-params',
        paramsJson,
        '--output',
        outputPath
      ]);
      return res;
    }
  },
  {
    name: 'moho.scene.batch_produce',
    description: 'Compile and natively certify each batch scene with isolated failures and an FCPXML timeline.',
    inputSchema: z.object({
      specs: z.array(z.record(z.any())).describe('List of character specs and scene briefs'),
      concurrency: z.number().int().min(1).optional().default(4).describe('Requested concurrency; native Moho runs are serialized safely.'),
    }),
    handler: async (args: { specs: Array<Record<string, any>>; concurrency?: number }) => {
      for (const spec of args.specs) {
        for (const layer of spec.psd_data?.processed_layers || []) {
          if (typeof layer.file_path === 'string') {
            layer.file_path = verifyPathAccess(path.resolve(layer.file_path));
          }
        }
      }
      const specsJson = JSON.stringify(args.specs);
      const res = await runStage4Cli('batch_produce', [
        '--specs',
        specsJson,
        '--concurrency',
        String(args.concurrency ?? 4)
      ]);
      return res;
    }
  },
];
