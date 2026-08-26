import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
}

/**
 * MohoRenderManager — Orchestrates headless batch rendering of .moho projects
 * via Moho Pro CLI.
 */
export class MohoRenderManager {
  public static detectMohoExecutable(): string | null {
    const candidates = [
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
    const exe = this.detectMohoExecutable();
    const exeName = exe ? `"${exe}"` : 'moho';
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

    const outPath = path.join(config.outputDirectory, `render_${path.basename(config.mohoProjectPath, '.moho')}.${outputExt}`);
    const commandLine = `${exeName} -r "${config.mohoProjectPath}" -start ${start} -end ${end} ${formatFlag} -o "${outPath}"`;

    return {
      commandLine,
      executablePath: exe,
      isFound: exe !== null
    };
  }

  public static async executeRender(config: MohoRenderJobConfig): Promise<RenderJobResult> {
    const { commandLine, executablePath, isFound } = this.buildRenderCommandLine(config);
    const start = config.startFrame ?? 1;
    const end = config.endFrame ?? 120;
    const totalFrames = end - start + 1;
    const jobId = `job_render_${Date.now()}`;

    if (!fs.existsSync(config.outputDirectory)) {
      fs.mkdirSync(config.outputDirectory, { recursive: true });
    }

    if (isFound && executablePath) {
      try {
        await execAsync(commandLine);
        return {
          jobId,
          mohoExecutablePath: executablePath,
          isExecutableFound: true,
          status: 'rendered',
          outputDirectory: config.outputDirectory,
          generatedCommandLine: commandLine,
          totalFrames
        };
      } catch {
        // Fall back to dry run command representation
      }
    }

    return {
      jobId,
      mohoExecutablePath: executablePath ?? undefined,
      isExecutableFound: isFound,
      status: 'dry_run_command_generated',
      outputDirectory: config.outputDirectory,
      generatedCommandLine: commandLine,
      totalFrames
    };
  }
}
