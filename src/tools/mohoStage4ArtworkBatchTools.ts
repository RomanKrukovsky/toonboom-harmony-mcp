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
    description: 'Parse multi-layer PSD files (groups, layer hierarchy, visibility, opacity, bounds, center/origin)',
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
    description: 'Import PSD with automated joint inpainting (+15% circular padding) and atomic promotion',
    inputSchema: z.object({
      file_path: z.string().describe('Path to the PSD file'),
      options: z.record(z.any()).optional().describe('Import options'),
    }),
    handler: async (args: { file_path: string; options?: Record<string, any> }) => {
      const absPath = verifyPathAccess(path.resolve(args.file_path));
      const optsJson = JSON.stringify(args.options || {});
      const res = await runStage4Cli('import_psd', ['--file', absPath, '--options', optsJson]);
      return res;
    }
  },
  {
    name: 'moho.assets.relink',
    description: 'Relink assets to portable project-relative paths',
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
    description: 'Compile rig from PSD data using extensible body plans and multi-language semantic classification',
    inputSchema: z.object({
      psd_data: z.record(z.any()).describe('Parsed PSD data'),
      body_plan: z.string().describe('Body plan (e.g., adult_neutral, slim, stocky, child, tall, short, masculine, feminine)'),
      body_params: z.record(z.any()).describe('Parameters like skin_rgb, hair_rgb'),
    }),
    handler: async (args: { psd_data: Record<string, any>; body_plan: string; body_params: Record<string, any> }) => {
      const psdJson = JSON.stringify(args.psd_data);
      const paramsJson = JSON.stringify(args.body_params);
      const res = await runStage4Cli('compile_from_artwork', [
        '--psd-data',
        psdJson,
        '--body-plan',
        args.body_plan,
        '--body-params',
        paramsJson
      ]);
      return res;
    }
  },
  {
    name: 'moho.scene.batch_produce',
    description: 'Batch produce scenes with partial-failure tolerance and multi-shot OpenTimelineIO/FCPXML timeline export',
    inputSchema: z.object({
      specs: z.array(z.record(z.any())).describe('List of character specs and scene briefs'),
      concurrency: z.number().optional().default(4).describe('Concurrency limit for Moho CLI'),
    }),
    handler: async (args: { specs: Array<Record<string, any>>; concurrency?: number }) => {
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
