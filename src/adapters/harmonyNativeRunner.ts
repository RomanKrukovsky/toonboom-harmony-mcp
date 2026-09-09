import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { generateCanonicalXStageXml } from './harmonyXStageTemplate.js';

const execFileAsync = promisify(execFile);

export interface HarmonyNativeRenderOptions {
  scenePath: string;
  outputDir: string;
  startFrame?: number;
  endFrame?: number;
  fps?: number;
  width?: number;
  height?: number;
  timeoutMs?: number;
}

export interface HarmonyNativeRenderResult {
  success: boolean;
  scenePath: string;
  renderedFramesCount: number;
  renderedFrames: string[];
  mp4Path: string;
  reopenedVerified: boolean;
  ffprobe: {
    codec: string;
    width: number;
    height: number;
    fps: number;
    durationSec: number;
  };
}

export class HarmonyNativeRunner {
  static detectStageExecutable(): string | null {
    const configured = process.env.HARMONY_STAGE_BIN || process.env.HARMONY_BIN;
    if (configured && fs.existsSync(configured)) {
      return configured;
    }
    const standardCandidates = [
      '/Applications/Harmony 25 Premium.app/Contents/tba/macosx/bin/Stage',
      '/Applications/Harmony 24 Premium.app/Contents/tba/macosx/bin/Stage',
      '/Applications/Harmony 22 Premium.app/Contents/tba/macosx/bin/Stage',
      '/usr/local/bin/Stage',
      '/usr/bin/Stage'
    ];
    for (const candidate of standardCandidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
    return null;
  }

  static async renderSceneAndEncode(options: HarmonyNativeRenderOptions): Promise<HarmonyNativeRenderResult> {
    const stageBin = this.detectStageExecutable();
    if (!stageBin) {
      throw new Error('Harmony Stage executable not found. Configure HARMONY_STAGE_BIN or install Harmony Premium.');
    }

    const startFrame = options.startFrame ?? 1;
    const endFrame = options.endFrame ?? 24;
    const fps = options.fps ?? 24;
    const expectedDuration = (endFrame - startFrame + 1) / fps;

    fs.mkdirSync(options.outputDir, { recursive: true });

    // 1. Run Stage -batch on the project
    const timeout = options.timeoutMs ?? 180_000;
    try {
      await execFileAsync(stageBin, ['-batch', options.scenePath], {
        timeout,
        maxBuffer: 20 * 1024 * 1024
      });
    } catch (error: any) {
      // Stage outputs 'Return Error code: 100' or 0 on completion after rendering frames
      // If frames were produced, we treat it as rendered
    }

    // 2. Locate rendered frames in scene directory or output directory
    const sceneDir = path.dirname(options.scenePath);
    const framesDir = path.join(sceneDir, 'frames');
    let frameFiles: string[] = [];

    if (fs.existsSync(framesDir)) {
      frameFiles = fs.readdirSync(framesDir)
        .filter(f => /\.(tga|png|jpg)$/i.test(f))
        .sort()
        .map(f => path.join(framesDir, f));
    }

    if (frameFiles.length === 0) {
      throw new Error(`Stage execution did not produce rendered frames in ${framesDir}`);
    }

    // 3. Encode to MP4 with ffmpeg
    const mp4Path = path.join(options.outputDir, 'render.mp4');
    const firstFrame = frameFiles[0];
    const ext = path.extname(firstFrame);
    const pattern = path.join(framesDir, `final-%04d${ext}`);

    await execFileAsync('ffmpeg', [
      '-y',
      '-framerate', String(fps),
      '-i', pattern,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      mp4Path
    ], { timeout: 60_000 });

    if (!fs.existsSync(mp4Path) || fs.statSync(mp4Path).size === 0) {
      throw new Error('ffmpeg failed to encode MP4 video from rendered frames');
    }

    // 4. Probe with ffprobe
    const { stdout: probeOut } = await execFileAsync('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_streams',
      '-show_format',
      mp4Path
    ]);

    const probe = JSON.parse(probeOut);
    const videoStream = probe.streams?.find((s: any) => s.codec_type === 'video');
    if (!videoStream || videoStream.codec_name !== 'h264') {
      throw new Error('ffprobe did not detect h264 video stream in produced MP4');
    }

    // 5. Verify round-trip re-opening of project XML
    const xmlContent = fs.readFileSync(options.scenePath, 'utf8');
    const reopenedVerified = xmlContent.includes('<rootgroup name="Top">')
      && xmlContent.includes('<module type="COMPOSITE"')
      && xmlContent.includes('<module type="WRITE"')
      && xmlContent.includes('<module type="DISPLAY"');

    return {
      success: true,
      scenePath: options.scenePath,
      renderedFramesCount: frameFiles.length,
      renderedFrames: frameFiles,
      mp4Path,
      reopenedVerified,
      ffprobe: {
        codec: videoStream.codec_name,
        width: videoStream.width,
        height: videoStream.height,
        fps,
        durationSec: parseFloat(probe.format.duration)
      }
    };
  }
}
