import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export type RenderOutputFormat = 'png_sequence' | 'mp4' | 'prores' | 'gif';

export interface MohoRenderJobConfig {
  mohoProjectPath: string;
  outputDirectory: string;
  format?: RenderOutputFormat;
  startFrame?: number;
  endFrame?: number;
  width?: number;
  height?: number;
  fps?: number;
  antialiasing?: boolean;
  halfSize?: boolean;
}

export interface RenderJobResult {
  jobId: string;
  mohoExecutablePath?: string;
  isExecutableFound: boolean;
  status: 'rendered' | 'dry_run_command_generated' | 'failed';
  outputDirectory: string;
  generatedCommandLine: string;
  totalFrames: number;
  renderedFiles: string[];
  errorMessage?: string;
}

interface RenderInvocation {
  outputPath: string;
  args: string[];
  commandLine: string;
  executablePath: string | null;
  isFound: boolean;
}

/**
 * MohoRenderManager — Orchestrates headless batch rendering of .moho projects
 * via Moho Pro CLI.
 */
export class MohoRenderManager {
  public static detectMohoExecutable(): string | null {
    const candidates = [
      '/Applications/Moho.app/Contents/MacOS/Moho',
      '/Applications/Moho Pro 14.app/Contents/MacOS/Moho',
      '/Applications/Moho Pro 13.5.app/Contents/MacOS/Moho',
      '/Applications/Moho Pro 12.app/Contents/MacOS/Moho',
      'C:\\Program Files\\Moho Pro 14\\Moho.exe',
      'C:\\Program Files\\Moho Pro 13.5\\Moho.exe',
      '/usr/bin/moho'
    ];

    for (const c of candidates) {
      if (fs.existsSync(c)) {
        return c;
      }
    }
    return null;
  }

  public static buildRenderCommandLine(config: MohoRenderJobConfig): {
    commandLine: string;
    executablePath: string | null;
    isFound: boolean;
  } {
    const invocation = this.buildRenderInvocation(config);
    return {
      commandLine: invocation.commandLine,
      executablePath: invocation.executablePath,
      isFound: invocation.isFound
    };
  }

  private static buildRenderInvocation(config: MohoRenderJobConfig): RenderInvocation {
    const executablePath = this.detectMohoExecutable();
    const executableName = executablePath ? `"${executablePath}"` : 'moho';
    const start = config.startFrame ?? 1;
    const end = config.endFrame ?? 120;
    const format = config.format ?? 'png_sequence';

    let formatFlag = '-f PNG';
    let outputExt = 'png';
    if (format === 'mp4') {
      formatFlag = '-f MP4';
      outputExt = 'mp4';
    } else if (format === 'prores') {
      formatFlag = '-f MOV';
      outputExt = 'mov';
    }

    const outputPath = path.join(config.outputDirectory, `render_${path.basename(config.mohoProjectPath, '.moho')}.${outputExt}`);
    const formatName = formatFlag.split(' ')[1];
    const args = [
      '-r', config.mohoProjectPath,
      '-start', String(start),
      '-end', String(end),
      '-f', formatName,
      '-o', outputPath
    ];
    const commandLine = `${executableName} -r "${config.mohoProjectPath}" -start ${start} -end ${end} ${formatFlag} -o "${outputPath}"`;

    return {
      outputPath,
      args,
      commandLine,
      executablePath,
      isFound: executablePath !== null
    };
  }

  private static findRenderedFiles(outputPath: string, format: RenderOutputFormat): string[] {
    const directory = path.dirname(outputPath);
    if (!fs.existsSync(directory)) {
      return [];
    }

    if (format !== 'png_sequence') {
      return fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0 ? [outputPath] : [];
    }

    const extension = path.extname(outputPath);
    const baseName = path.basename(outputPath, extension);
    return fs.readdirSync(directory)
      .filter(name => (name === `${baseName}${extension}` || name.startsWith(`${baseName}_`)) && name.endsWith(extension))
      .map(name => path.join(directory, name))
      .filter(filePath => fs.statSync(filePath).size > 0)
      .sort();
  }

  public static async executeRender(config: MohoRenderJobConfig): Promise<RenderJobResult> {
    const { commandLine, executablePath, isFound, outputPath, args } = this.buildRenderInvocation(config);
    const start = config.startFrame ?? 1;
    const end = config.endFrame ?? 120;
    const totalFrames = end - start + 1;
    const jobId = `job_render_${Date.now()}`;

    if (!fs.existsSync(config.outputDirectory)) {
      fs.mkdirSync(config.outputDirectory, { recursive: true });
    }

    if (isFound && executablePath) {
      const format = config.format ?? 'png_sequence';
      const existingFiles = new Map(
        this.findRenderedFiles(outputPath, format).map(filePath => {
          const stat = fs.statSync(filePath);
          return [filePath, `${stat.size}:${stat.mtimeMs}`] as const;
        })
      );

      try {
        const { stdout, stderr } = await execFileAsync(executablePath, args, { maxBuffer: 10 * 1024 * 1024 });
        const renderedFiles = this.findRenderedFiles(outputPath, format).filter(filePath => {
          const stat = fs.statSync(filePath);
          return existingFiles.get(filePath) !== `${stat.size}:${stat.mtimeMs}`;
        });
        if (renderedFiles.length === 0) {
          const mohoOutput = `${stdout}\n${stderr}`.trim();
          return {
            jobId,
            mohoExecutablePath: executablePath,
            isExecutableFound: true,
            status: 'failed',
            outputDirectory: config.outputDirectory,
            generatedCommandLine: commandLine,
            totalFrames,
            renderedFiles: [],
            errorMessage: `Moho did not create any render output${mohoOutput ? `: ${mohoOutput}` : ''}`
          };
        }
        return {
          jobId,
          mohoExecutablePath: executablePath,
          isExecutableFound: true,
          status: 'rendered',
          outputDirectory: config.outputDirectory,
          generatedCommandLine: commandLine,
          totalFrames,
          renderedFiles
        };
      } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        return {
          jobId,
          mohoExecutablePath: executablePath,
          isExecutableFound: true,
          status: 'failed',
          outputDirectory: config.outputDirectory,
          generatedCommandLine: commandLine,
          totalFrames,
          renderedFiles: [],
          errorMessage: `Moho render failed: ${details}`
        };
      }
    }

    return {
      jobId,
      mohoExecutablePath: executablePath ?? undefined,
      isExecutableFound: isFound,
      status: 'dry_run_command_generated',
      outputDirectory: config.outputDirectory,
      generatedCommandLine: commandLine,
      totalFrames,
      renderedFiles: []
    };
  }
}
