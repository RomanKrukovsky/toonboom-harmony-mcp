import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import type { QaFinding, QaSeverity } from '../../schemas/qaReport.js';

/**
 * renderMetrics.ts — honest measurement of rendered shot video files.
 *
 * The RetakeEngine consumes a bag of measured metrics (ShotMetrics); this
 * collector produces the measurable part of a render: duration, fps,
 * resolution and codec, probed with ffprobe. It never guesses: if ffprobe
 * is missing or the file cannot be decoded it throws a typed
 * RenderMetricsError instead of fabricating numbers.
 *
 * probeVideo() returns raw measurements plus pass/fail checks;
 * toQaFindings() turns violations into QaFinding[] compatible with the
 * RetakeEngine output ('render_duration', 'render_fps'). Render problems
 * are never auto-fixable.
 */

export const RENDER_METRICS_SCHEMA_VERSION = '1.0' as const;

/** Allowed absolute drift between measured and expected duration. */
export const DEFAULT_DURATION_TOLERANCE_SEC = 0.25;
/** Allowed absolute drift between measured and expected fps. */
export const FPS_MATCH_TOLERANCE = 0.5;

export type RenderMetricsErrorCode =
  | 'FFPROBE_MISSING'
  | 'VIDEO_NOT_FOUND'
  | 'VIDEO_UNDECODABLE';

export class RenderMetricsError extends Error {
  readonly code: RenderMetricsErrorCode;

  constructor(code: RenderMetricsErrorCode, message: string) {
    super(message);
    this.name = 'RenderMetricsError';
    this.code = code;
  }
}

export type VideoProbeCheckKind = 'duration_match' | 'fps_match' | 'decodable';

export interface VideoProbeCheck {
  check: VideoProbeCheckKind;
  passed: boolean;
  measured: number;
  threshold: number;
}

export interface VideoProbeResult {
  schemaVersion: typeof RENDER_METRICS_SCHEMA_VERSION;
  /** Repo-relative path (cwd stripped). */
  videoPath: string;
  durationSec: number;
  /** null when ffprobe could not report a usable frame rate. */
  fps: number | null;
  width: number;
  height: number;
  codec: string;
  checks: VideoProbeCheck[];
}

export interface ProbeVideoOptions {
  expectedFps?: number;
  expectedDurationSec?: number;
  /** Tolerance for duration_match, seconds. Default DEFAULT_DURATION_TOLERANCE_SEC. */
  tolerance?: number;
}

export interface RenderQaThresholds {
  maxDurationDriftSec: number;
  expectedFps: number;
}

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

/** "num/den" → frames per second; null when missing/zero/NaN. */
function parseFrameRate(rate: string | undefined): number | null {
  if (!rate) return null;
  const parts = rate.split('/');
  const num = Number(parts[0]);
  const den = parts.length > 1 ? Number(parts[1]) : 1;
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
  const fps = num / den;
  return Number.isFinite(fps) && fps > 0 ? fps : null;
}

function severityFromDriftRatio(ratio: number): QaSeverity {
  if (ratio >= 4) return 'critical';
  if (ratio >= 2) return 'high';
  return 'medium';
}

export class RenderMetricsCollector {
  /**
   * Probes a rendered video with ffprobe (JSON output) and measures
   * duration, fps, dimensions and codec. Throws RenderMetricsError when
   * ffprobe is not installed, the file does not exist or cannot be decoded.
   */
  async probeVideo(videoPath: string, opts: ProbeVideoOptions = {}): Promise<VideoProbeResult> {
    if (!fs.existsSync(videoPath)) {
      throw new RenderMetricsError('VIDEO_NOT_FOUND', `Video file not found: ${videoPath}`);
    }

    let stdout = '';
    try {
      ({ stdout } = await execFileAsync('ffprobe', [
        '-v', 'error',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        videoPath
      ], { timeout: 30_000, maxBuffer: 16 * 1024 * 1024 }));
    } catch (err) {
      const e = err as NodeJS.ErrnoException & { stderr?: string };
      if (e.code === 'ENOENT') {
        throw new RenderMetricsError(
          'FFPROBE_MISSING',
          'ffprobe executable not found. Install ffmpeg/ffprobe to collect render metrics.'
        );
      }
      const stderr = typeof e.stderr === 'string' ? e.stderr.trim() : '';
      if (/no such file/i.test(stderr)) {
        throw new RenderMetricsError('VIDEO_NOT_FOUND', `Video file not found: ${videoPath}`);
      }
      throw new RenderMetricsError(
        'VIDEO_UNDECODABLE',
        `ffprobe failed to decode "${videoPath}": ${stderr || e.message}`
      );
    }

    let data: FfprobeOutput;
    try {
      data = JSON.parse(stdout) as FfprobeOutput;
    } catch {
      throw new RenderMetricsError(
        'VIDEO_UNDECODABLE',
        `ffprobe produced non-JSON output for "${videoPath}" — file is likely undecodable.`
      );
    }

    const streams = Array.isArray(data.streams) ? data.streams : [];
    const video = streams.find(s => s.codec_type === 'video');
    if (!video) {
      throw new RenderMetricsError(
        'VIDEO_UNDECODABLE',
        `No decodable video stream found in "${videoPath}".`
      );
    }

    const durationRaw = data.format?.duration ?? video.duration;
    const durationSec = Number(durationRaw);
    if (!Number.isFinite(durationSec) || durationSec <= 0) {
      throw new RenderMetricsError(
        'VIDEO_UNDECODABLE',
        `Could not determine a usable duration for "${videoPath}" (got: ${durationRaw ?? 'none'}).`
      );
    }

    const fps = parseFrameRate(video.avg_frame_rate) ?? parseFrameRate(video.r_frame_rate);
    const checks: VideoProbeCheck[] = [
      { check: 'decodable', passed: true, measured: 1, threshold: 1 }
    ];

    if (opts.expectedDurationSec !== undefined) {
      const tolerance = opts.tolerance ?? DEFAULT_DURATION_TOLERANCE_SEC;
      checks.push({
        check: 'duration_match',
        passed: Math.abs(durationSec - opts.expectedDurationSec) <= tolerance,
        measured: durationSec,
        threshold: opts.expectedDurationSec
      });
    }

    if (opts.expectedFps !== undefined && fps !== null) {
      checks.push({
        check: 'fps_match',
        passed: Math.abs(fps - opts.expectedFps) <= FPS_MATCH_TOLERANCE,
        measured: fps,
        threshold: opts.expectedFps
      });
    }

    return {
      schemaVersion: RENDER_METRICS_SCHEMA_VERSION,
      videoPath: RenderMetricsCollector.repoRelative(videoPath),
      durationSec,
      fps,
      width: typeof video.width === 'number' ? video.width : 0,
      height: typeof video.height === 'number' ? video.height : 0,
      codec: video.codec_name ?? 'unknown',
      checks
    };
  }

  /**
   * Maps a probe result into QaFinding[] using the RetakeEngine vocabulary:
   * 'render_duration' (measured drift vs maxDurationDriftSec) and
   * 'render_fps' (measured fps vs expectedFps). Only violated checks become
   * findings; render problems are never auto-fixable.
   *
   * The expected duration is recovered from the probe's duration_match check
   * threshold (set by probeVideo when expectedDurationSec was given).
   */
  toQaFindings(probe: VideoProbeResult, thresholds: RenderQaThresholds): QaFinding[] {
    const findings: QaFinding[] = [];
    let counter = 1;
    const addFinding = (
      check: string,
      severity: QaSeverity,
      measured: number,
      threshold: number,
      message: string
    ) => {
      findings.push({
        findingId: `f_${counter.toString().padStart(3, '0')}`,
        check,
        severity,
        measured,
        threshold,
        message,
        autoFixable: false
      });
      counter += 1;
    };

    // Duration drift (lower is better).
    const durationCheck = probe.checks.find(c => c.check === 'duration_match');
    if (durationCheck) {
      const drift = Math.abs(durationCheck.measured - durationCheck.threshold);
      if (drift > thresholds.maxDurationDriftSec) {
        addFinding(
          'render_duration',
          severityFromDriftRatio(drift / thresholds.maxDurationDriftSec),
          drift,
          thresholds.maxDurationDriftSec,
          `Render duration drift ${drift.toFixed(3)}s exceeds max ${thresholds.maxDurationDriftSec}s ` +
            `(measured ${durationCheck.measured.toFixed(3)}s, expected ${durationCheck.threshold.toFixed(3)}s)`
        );
      }
    }

    // Frame rate mismatch (lower drift is better).
    if (probe.fps !== null) {
      const fpsDrift = Math.abs(probe.fps - thresholds.expectedFps);
      if (fpsDrift > FPS_MATCH_TOLERANCE) {
        addFinding(
          'render_fps',
          severityFromDriftRatio(fpsDrift / FPS_MATCH_TOLERANCE),
          probe.fps,
          thresholds.expectedFps,
          `Render fps ${probe.fps.toFixed(3)} deviates from expected ${thresholds.expectedFps} by ${fpsDrift.toFixed(3)} ` +
            `(max tolerated ${FPS_MATCH_TOLERANCE})`
        );
      }
    }

    return findings;
  }

  private static repoRelative(p: string): string {
    const abs = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
    const rel = path.relative(process.cwd(), abs);
    return rel.startsWith('..') ? abs : rel;
  }
}
