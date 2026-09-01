import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

export const MOHO_RENDER_METRICS_VERSION = 'moho-render-metrics-v1';

export type MohoRenderMetricsErrorCode = 'FFPROBE_MISSING' | 'VIDEO_UNDECODABLE';

export class RenderMetricsError extends Error {
  readonly code: MohoRenderMetricsErrorCode;

  constructor(code: MohoRenderMetricsErrorCode, message: string) {
    super(message);
    this.name = 'RenderMetricsError';
    this.code = code;
  }
}

export const MOHO_FPS_TOLERANCE = 0.5;
export const MOHO_DURATION_TOLERANCE_SEC = 0.25;

interface FfprobeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  duration?: string;
  avg_frame_rate?: string;
  r_frame_rate?: string;
}

interface FfprobeOutput {
  streams?: FfprobeStream[];
  format?: { duration?: string };
}

const execFileAsync = promisify(execFile) as (
  file: string,
  args: string[],
  options?: { timeout?: number; maxBuffer?: number }
) => Promise<{ stdout: string; stderr: string }>;

function parseFrameRate(rate: string | undefined): number | null {
  if (!rate) return null;
  const parts = rate.split('/');
  const num = Number(parts[0]);
  const den = parts.length > 1 ? Number(parts[1]) : 1;
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
  const fps = num / den;
  return Number.isFinite(fps) && fps > 0 ? fps : null;
}

export interface MohoProbeRenderResult {
  fps: number;
  durationSec: number;
  resolution: { width: number; height: number };
  codec: string;
  matches: { fps: boolean; duration: boolean };
  issues: string[];
}

export class MohoRenderMetrics {
  static async probeRender(
    outputPath: string,
    expectedFps: number,
    expectedDurationSec: number
  ): Promise<MohoProbeRenderResult> {
    if (!fs.existsSync(outputPath)) {
      throw new RenderMetricsError('VIDEO_UNDECODABLE', `Rendered output not found: ${outputPath}`);
    }

    let stdout = '';
    try {
      ({ stdout } = await execFileAsync(
        'ffprobe',
        [
          '-v', 'error',
          '-print_format', 'json',
          '-show_format',
          '-show_streams',
          outputPath
        ],
        { timeout: 30_000, maxBuffer: 16 * 1024 * 1024 }
      ));
    } catch (err) {
      const e = err as NodeJS.ErrnoException & { stderr?: string };
      if (e.code === 'ENOENT') {
        throw new RenderMetricsError(
          'FFPROBE_MISSING',
          'ffprobe executable not found. Install ffmpeg/ffprobe to collect Moho render metrics.'
        );
      }
      const stderr = typeof e.stderr === 'string' ? e.stderr.trim() : '';
      throw new RenderMetricsError(
        'VIDEO_UNDECODABLE',
        `ffprobe failed to decode "${outputPath}": ${stderr || e.message}`
      );
    }

    let data: FfprobeOutput;
    try {
      data = JSON.parse(stdout) as FfprobeOutput;
    } catch {
      throw new RenderMetricsError(
        'VIDEO_UNDECODABLE',
        `ffprobe produced non-JSON output for "${outputPath}" — render is likely undecodable.`
      );
    }

    const streams = Array.isArray(data.streams) ? data.streams : [];
    const video = streams.find(s => s.codec_type === 'video');
    if (!video) {
      throw new RenderMetricsError(
        'VIDEO_UNDECODABLE',
        `No decodable video stream found in "${outputPath}".`
      );
    }

    const durationRaw = data.format?.duration ?? video.duration;
    const durationSec = Number(durationRaw);
    if (!Number.isFinite(durationSec) || durationSec <= 0) {
      throw new RenderMetricsError(
        'VIDEO_UNDECODABLE',
        `Could not determine a usable duration for "${outputPath}" (got: ${durationRaw ?? 'none'}).`
      );
    }

    const fps = parseFrameRate(video.avg_frame_rate) ?? parseFrameRate(video.r_frame_rate);
    if (fps === null) {
      throw new RenderMetricsError(
        'VIDEO_UNDECODABLE',
        `Could not determine a usable frame rate for "${outputPath}".`
      );
    }

    const width = typeof video.width === 'number' ? video.width : 0;
    const height = typeof video.height === 'number' ? video.height : 0;
    const codec = video.codec_name ?? 'unknown';

    const fpsMatch = Math.abs(fps - expectedFps) <= MOHO_FPS_TOLERANCE;
    const durationMatch = Math.abs(durationSec - expectedDurationSec) <= MOHO_DURATION_TOLERANCE_SEC;

    const issues: string[] = [];
    if (!fpsMatch) {
      issues.push(
        `fps mismatch: measured ${fps.toFixed(3)}, expected ${expectedFps} (tolerance ${MOHO_FPS_TOLERANCE})`
      );
    }
    if (!durationMatch) {
      issues.push(
        `duration mismatch: measured ${durationSec.toFixed(3)}s, expected ${expectedDurationSec.toFixed(3)}s (tolerance ${MOHO_DURATION_TOLERANCE_SEC}s)`
      );
    }
    if (width === 0 || height === 0) {
      issues.push(`resolution unavailable: measured ${width}x${height}`);
    }

    return {
      fps,
      durationSec,
      resolution: { width, height },
      codec,
      matches: { fps: fpsMatch, duration: durationMatch },
      issues
    };
  }

  static async probeFrameSequence(framesDir: string): Promise<{
    frameCount: number;
    firstFrame: string;
    lastFrame: string;
    avgSizeBytes: number;
  }> {
    if (!fs.existsSync(framesDir)) {
      throw new RenderMetricsError(
        'VIDEO_UNDECODABLE',
        `Frame sequence directory not found: ${framesDir}`
      );
    }

    const stat = fs.statSync(framesDir);
    if (!stat.isDirectory()) {
      throw new RenderMetricsError(
        'VIDEO_UNDECODABLE',
        `Frame sequence path is not a directory: ${framesDir}`
      );
    }

    const entries = fs.readdirSync(framesDir);
    const pngs = entries
      .filter(name => name.toLowerCase().endsWith('.png'))
      .sort();

    if (pngs.length === 0) {
      throw new RenderMetricsError(
        'VIDEO_UNDECODABLE',
        `No PNG frames found in directory: ${framesDir}`
      );
    }

    let totalBytes = 0;
    for (const name of pngs) {
      const filePath = path.join(framesDir, name);
      const st = fs.statSync(filePath);
      if (st.isFile()) totalBytes += st.size;
    }

    return {
      frameCount: pngs.length,
      firstFrame: pngs[0],
      lastFrame: pngs[pngs.length - 1],
      avgSizeBytes: Math.round(totalBytes / pngs.length)
    };
  }
}