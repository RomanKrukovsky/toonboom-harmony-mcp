import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import type { MohoCommandPlan } from '../../schemas/mohoCommandPlan.js';
import { emitMohoLua } from '../mohoLuaEmitter/index.js';
import { MohoRenderManager, type RenderOutputFormat } from '../mohoRenderManager/index.js';
import { RenderMetricsCollector } from '../renderMetrics/index.js';

const execFileAsync = promisify(execFile);

export interface MohoProcessResult {
  stdout: string;
  stderr: string;
}

export type MohoExecuteFile = (
  executable: string,
  args: string[],
  options: { maxBuffer: number; timeout: number }
) => Promise<MohoProcessResult>;

export interface MohoRenderRunnerDependencies {
  detectMohoExecutable?: () => string | null;
  executeFile?: MohoExecuteFile;
}

export interface MohoRenderRunnerOptions {
  commandPlan: MohoCommandPlan;
  outputDir: string;
  format?: RenderOutputFormat;
  startFrame?: number;
  endFrame?: number;
  width?: number;
  height?: number;
  fps?: number;
  antialiasing?: boolean;
  halfSize?: boolean;
  timeoutMs?: number;
  dryRun?: boolean;
}

export interface MohoRenderRunnerResult {
  jobId: string;
  status: 'rendered' | 'requires_real_moho' | 'requires_moho_pro' | 'dry_run' | 'failed';
  detectedMohoPath: string | null;
  commandLine: string;
  outputDir: string;
  builtDocumentPath: string | null;
  renderedFiles: string[];
  totalFrames: number;
  durationMs: number;
  fps: number;
  resolution: { width: number; height: number };
  codec: string | null;
  qaFindings: any[];
  exitCode: number;
  errorMessage?: string;
}

export class MohoRenderRunner {
  private readonly detectMohoExecutable: () => string | null;
  private readonly executeFile: MohoExecuteFile;

  public constructor(dependencies: MohoRenderRunnerDependencies = {}) {
    this.detectMohoExecutable = dependencies.detectMohoExecutable ?? MohoRenderManager.detectMohoExecutable;
    this.executeFile = dependencies.executeFile ?? (async (executable, args, options) => {
      const result = await execFileAsync(executable, args, options);
      return {
        stdout: String(result.stdout ?? ''),
        stderr: String(result.stderr ?? '')
      };
    });
  }

  private static resolveDocumentPath(plan: MohoCommandPlan, outputDir: string): string {
    if (plan.documentPath) {
      return path.resolve(plan.documentPath);
    }
    return path.resolve(outputDir, `${plan.planId}.moho`);
  }

  private static prepareBuildPlan(plan: MohoCommandPlan, documentPath: string): MohoCommandPlan {
    return {
      ...plan,
      documentPath,
      operations: plan.operations.map(operation => {
        if (operation.type !== 'save_document') {
          return operation;
        }
        return {
          ...operation,
          params: { ...operation.params, documentPath },
          expectedArtifact: { ...operation.expectedArtifact, path: documentPath }
        };
      })
    };
  }

  private static errorDetails(error: unknown): string {
    if (!(error instanceof Error)) {
      return String(error);
    }
    const processError = error as Error & { stdout?: string | Buffer; stderr?: string | Buffer };
    return [processError.message, processError.stdout, processError.stderr]
      .filter(value => value !== undefined && String(value).trim().length > 0)
      .map(String)
      .join('\n');
  }

  private static isMohoProLicenseError(details: string): boolean {
    return /Pro level feature|command-line renderer.*Pro|must upgrade/i.test(details);
  }

  public static emitAndSaveLua(plan: MohoCommandPlan, outputDir: string): { luaPath: string; luaContent: string } {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const documentPath = MohoRenderRunner.resolveDocumentPath(plan, outputDir);
    const buildPlan = MohoRenderRunner.prepareBuildPlan(plan, documentPath);
    const characterName = plan.provenance.characterName ?? path.basename(plan.planId);
    const luaContent = emitMohoLua(buildPlan, characterName, { exitAfterRun: true });
    const luaPath = path.join(outputDir, 'build_rig.lua');
    fs.writeFileSync(luaPath, luaContent, 'utf8');
    return { luaPath, luaContent };
  }

  public static buildCommandLine(opts: MohoRenderRunnerOptions, mohoExePath: string): string {
    const start = opts.startFrame ?? 1;
    const end = opts.endFrame ?? 120;
    const format: RenderOutputFormat = opts.format ?? 'png_sequence';
    let formatFlag = '-f PNG';
    let outputExt = 'png';
    if (format === 'mp4') {
      formatFlag = '-f MP4';
      outputExt = 'mp4';
    } else if (format === 'prores') {
      formatFlag = '-f MOV';
      outputExt = 'mov';
    } else if (format === 'gif') {
      formatFlag = '-f GIF';
      outputExt = 'gif';
    }
    const outputPath = path.join(opts.outputDir, `render_${opts.commandPlan.planId}.${outputExt}`);
    const width = opts.width ?? 1920;
    const height = opts.height ?? 1080;
    const antialias = opts.antialiasing === false ? '-noaa' : '-aa';
    const halfSize = opts.halfSize ? '-halfsize' : '';
    return `"${mohoExePath}" -r "${opts.commandPlan.documentPath ?? path.join(opts.outputDir, `${opts.commandPlan.planId}.moho`)}" -start ${start} -end ${end} ${formatFlag} -o "${outputPath}" -w ${width} -h ${height} ${antialias} ${halfSize}`.trim();
  }

  public async run(opts: MohoRenderRunnerOptions): Promise<MohoRenderRunnerResult> {
    const startedAt = Date.now();
    const jobId = `render_${randomUUID()}`;
    const format: RenderOutputFormat = opts.format ?? 'png_sequence';
    const startFrame = opts.startFrame ?? 1;
    const endFrame = opts.endFrame ?? 120;
    const totalFrames = endFrame - startFrame + 1;
    const width = opts.width ?? 1920;
    const height = opts.height ?? 1080;
    const fps = opts.fps ?? 24;
    const resolution = { width, height };

    if (!fs.existsSync(opts.outputDir)) {
      fs.mkdirSync(opts.outputDir, { recursive: true });
    }

    const documentPath = MohoRenderRunner.resolveDocumentPath(opts.commandPlan, opts.outputDir);
    fs.mkdirSync(path.dirname(documentPath), { recursive: true });
    const buildPlan = MohoRenderRunner.prepareBuildPlan(opts.commandPlan, documentPath);
    const { luaPath, luaContent } = MohoRenderRunner.emitAndSaveLua(buildPlan, opts.outputDir);

    const detectedMohoPath = this.detectMohoExecutable();
    const resolvedOpts: MohoRenderRunnerOptions = { ...opts, commandPlan: buildPlan };
    const commandLine = detectedMohoPath
      ? MohoRenderRunner.buildCommandLine(resolvedOpts, detectedMohoPath)
      : MohoRenderManager.buildRenderCommandLine({
          mohoProjectPath: documentPath,
          outputDirectory: opts.outputDir,
          format,
          startFrame,
          endFrame,
          width,
          height,
          fps,
          antialiasing: opts.antialiasing,
          halfSize: opts.halfSize
        }).commandLine;

    const baseResult = {
      jobId,
      detectedMohoPath,
      commandLine,
      outputDir: opts.outputDir,
      builtDocumentPath: null as string | null,
      totalFrames,
      durationMs: 0,
      fps,
      resolution,
      codec: null as string | null,
      qaFindings: [] as any[],
      renderedFiles: [] as string[]
    };

    if (opts.dryRun) {
      return {
        ...baseResult,
        status: 'dry_run',
        durationMs: Date.now() - startedAt,
        exitCode: 0,
        errorMessage: `Dry run — Lua script written to ${luaPath} (${luaContent.length} bytes); command line not executed.`
      };
    }

    if (!detectedMohoPath) {
      return {
        ...baseResult,
        status: 'requires_real_moho',
        durationMs: Date.now() - startedAt,
        exitCode: 1,
        errorMessage: `Moho executable not detected. Lua script emitted to ${luaPath}; install Moho Pro to render.`
      };
    }

    const outputExt = format === 'mp4' ? 'mp4' : format === 'prores' ? 'mov' : format === 'gif' ? 'gif' : 'png';
    const outputPath = path.join(opts.outputDir, `render_${opts.commandPlan.planId}.${outputExt}`);
    const timeout = opts.timeoutMs ?? 600_000;

    try {
      const buildProcess = await this.executeFile(detectedMohoPath, [luaPath], {
        maxBuffer: 32 * 1024 * 1024,
        timeout
      });
      const buildEvidence = `${buildProcess.stdout}\n${buildProcess.stderr}`;
      const failedLines = buildEvidence
        .split(/\r?\n/)
        .filter(line => line.includes('[FAIL]') || /\[SUMMARY\].*failed=[1-9]\d*/i.test(line));
      if (failedLines.length > 0) {
        return {
          ...baseResult,
          status: 'failed',
          durationMs: Date.now() - startedAt,
          exitCode: 1,
          errorMessage: `Moho Lua build reported failure: ${failedLines.join(' | ')}`
        };
      }
    } catch (error) {
      const details = MohoRenderRunner.errorDetails(error);
      return {
        ...baseResult,
        status: 'failed',
        durationMs: Date.now() - startedAt,
        exitCode: 1,
        errorMessage: `Moho document build failed: ${details}`
      };
    }

    if (!fs.existsSync(documentPath) || !fs.statSync(documentPath).isFile() || fs.statSync(documentPath).size === 0) {
      return {
        ...baseResult,
        status: 'failed',
        durationMs: Date.now() - startedAt,
        exitCode: 1,
        errorMessage: `Moho build process did not create a non-empty .moho document: ${documentPath}`
      };
    }

    const builtBaseResult = { ...baseResult, builtDocumentPath: documentPath };

    try {
      const args = [
        '-r', documentPath,
        '-start', String(startFrame),
        '-end', String(endFrame),
        '-f', outputExt.toUpperCase(),
        '-o', outputPath,
        '-w', String(width),
        '-h', String(height)
      ];
      if (opts.halfSize) args.push('-halfsize');
      if (opts.antialiasing === false) args.push('-noaa');

      await this.executeFile(detectedMohoPath, args, {
        maxBuffer: 32 * 1024 * 1024,
        timeout
      });

      let renderedFiles: string[] = [];
      if (fs.existsSync(opts.outputDir)) {
        renderedFiles = fs.readdirSync(opts.outputDir)
          .filter(name => name.startsWith(`render_${opts.commandPlan.planId}`))
          .map(name => path.join(opts.outputDir, name))
          .filter(filePath => fs.statSync(filePath).isFile() && fs.statSync(filePath).size > 0)
          .sort();
      }

      if (renderedFiles.length === 0) {
        return {
          ...builtBaseResult,
          status: 'failed',
          durationMs: Date.now() - startedAt,
          exitCode: 1,
          errorMessage: `Moho renderer did not create render output in ${opts.outputDir}`
        };
      }

      let codec: string | null = null;
      const qaFindings: any[] = [];
      if (format !== 'png_sequence' && renderedFiles.length > 0 && fs.existsSync(outputPath)) {
        try {
          const probe = await new RenderMetricsCollector().probeVideo(outputPath, {
            expectedFps: fps,
            expectedDurationSec: totalFrames / fps
          });
          codec = probe.codec;
          qaFindings.push(...new RenderMetricsCollector().toQaFindings(probe, {
            maxDurationDriftSec: 0.25,
            expectedFps: fps
          }));
        } catch {
          codec = null;
        }
      }

      return {
        ...builtBaseResult,
        status: 'rendered',
        renderedFiles,
        durationMs: Date.now() - startedAt,
        fps,
        resolution,
        codec,
        qaFindings,
        exitCode: 0
      };
    } catch (error) {
      const details = MohoRenderRunner.errorDetails(error);
      if (MohoRenderRunner.isMohoProLicenseError(details)) {
        return {
          ...builtBaseResult,
          status: 'requires_moho_pro',
          durationMs: Date.now() - startedAt,
          exitCode: 1,
          errorMessage: `Document was built successfully, but command-line rendering requires Moho Pro: ${details}`
        };
      }
      return {
        ...builtBaseResult,
        status: 'failed',
        durationMs: Date.now() - startedAt,
        exitCode: 1,
        errorMessage: `Moho render failed: ${details}`
      };
    }
  }
}
