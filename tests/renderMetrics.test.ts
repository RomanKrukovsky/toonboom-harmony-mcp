/**
 * RenderMetrics smoke — real ffmpeg/ffprobe round trip.
 *
 * Generates a 1s testsrc mp4 with lavfi, probes it through
 * RenderMetricsCollector.probeVideo, verifies the measured fields and
 * checks, then verifies toQaFindings mapping (including drift → severity).
 * A text-bytes .mp4 must throw a typed RenderMetricsError. Skips when
 * ffmpeg/ffprobe are absent — absence is reported, never faked.
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import {
  RenderMetricsCollector,
  RenderMetricsError,
  FPS_MATCH_TOLERANCE,
  type VideoProbeResult
} from '../src/services/renderMetrics/index.js';

const ROOT = process.cwd();
const TMP = path.join(ROOT, 'output', '__render_metrics_test');

function have(bin: string): boolean {
  try {
    execFileSync('which', [bin], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const ffmpeg = have('ffmpeg');
const ffprobe = have('ffprobe');

(ffmpeg && ffprobe ? describe : describe.skip)('render metrics collector (real ffmpeg)', () => {
  let videoPath: string;
  const collector = new RenderMetricsCollector();

  beforeAll(() => {
    fs.rmSync(TMP, { recursive: true, force: true });
    fs.mkdirSync(TMP, { recursive: true });
    videoPath = path.join(TMP, 'shot_render.mp4');
    execFileSync('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-f', 'lavfi', '-i', 'testsrc=duration=1:size=320x240:rate=12',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
      videoPath
    ]);
  });

  afterAll(() => {
    fs.rmSync(TMP, { recursive: true, force: true });
  });

  it('probes a real mp4: fields, repo-relative path, checks pass', async () => {
    const probe = await collector.probeVideo(videoPath, {
      expectedDurationSec: 1,
      expectedFps: 12
    });

    expect(probe.schemaVersion).toBe('1.0');
    expect(path.isAbsolute(probe.videoPath)).toBe(false);
    expect(probe.videoPath).toBe(path.join('output', '__render_metrics_test', 'shot_render.mp4'));
    expect(fs.existsSync(path.join(ROOT, probe.videoPath))).toBe(true);

    expect(probe.durationSec).toBeGreaterThan(0.9);
    expect(probe.durationSec).toBeLessThan(1.3);
    expect(probe.fps).not.toBeNull();
    expect(probe.fps as number).toBeGreaterThan(12 - FPS_MATCH_TOLERANCE);
    expect(probe.fps as number).toBeLessThan(12 + FPS_MATCH_TOLERANCE);
    expect(probe.width).toBe(320);
    expect(probe.height).toBe(240);
    expect(probe.codec).toBe('h264');

    const byCheck = new Map(probe.checks.map(c => [c.check, c]));
    const decodable = byCheck.get('decodable');
    const duration = byCheck.get('duration_match');
    const fps = byCheck.get('fps_match');
    expect(decodable?.passed).toBe(true);
    expect(duration).toBeDefined();
    expect(duration?.passed).toBe(true);
    expect(duration?.threshold).toBe(1);
    expect(fps?.passed).toBe(true);
    expect(fps?.threshold).toBe(12);
  });

  it('throws a typed RenderMetricsError on undecodable bytes', async () => {
    const corruptPath = path.join(TMP, 'corrupt.mp4');
    fs.writeFileSync(corruptPath, 'this is not a video file, just plain text bytes');

    await expect(collector.probeVideo(corruptPath)).rejects.toBeInstanceOf(RenderMetricsError);
    await expect(collector.probeVideo(corruptPath)).rejects.toMatchObject({
      code: 'VIDEO_UNDECODABLE'
    });
  });

  it('toQaFindings maps drifting duration/fps to non-auto-fixable findings', () => {
    // Hand-built probe: 0.9s of duration drift (1.8× max) and 1fps off target (2× tolerance).
    const probe: VideoProbeResult = {
      schemaVersion: '1.0',
      videoPath: path.join('output', '__render_metrics_test', 'shot_render.mp4'),
      durationSec: 1.9,
      fps: 11,
      width: 320,
      height: 240,
      codec: 'h264',
      checks: [
        { check: 'decodable', passed: true, measured: 1, threshold: 1 },
        { check: 'duration_match', passed: false, measured: 1.9, threshold: 1 },
        { check: 'fps_match', passed: false, measured: 11, threshold: 12 }
      ]
    };

    const findings = collector.toQaFindings(probe, { maxDurationDriftSec: 0.5, expectedFps: 12 });
    expect(findings).toHaveLength(2);

    const [durationFinding, fpsFinding] = findings;
    expect(durationFinding.check).toBe('render_duration');
    expect(durationFinding.severity).toBe('medium'); // ratio 1.8 < 2
    expect(durationFinding.measured).toBeCloseTo(0.9, 5);
    expect(durationFinding.threshold).toBe(0.5);
    expect(durationFinding.autoFixable).toBe(false);

    expect(fpsFinding.check).toBe('render_fps');
    expect(fpsFinding.severity).toBe('high'); // ratio exactly 2
    expect(fpsFinding.measured).toBe(11);
    expect(fpsFinding.threshold).toBe(12);
    expect(fpsFinding.autoFixable).toBe(false);
  });

  it('toQaFindings returns no findings for an in-tolerance probe', async () => {
    const probe = await collector.probeVideo(videoPath, {
      expectedDurationSec: 1,
      expectedFps: 12
    });
    const findings = collector.toQaFindings(probe, { maxDurationDriftSec: 0.5, expectedFps: 12 });
    expect(findings).toEqual([]);
  });
});
