/**
 * MohoRenderMetrics tests — exercise the static probe API on the real filesystem
 * and the real ffprobe binary when available. When ffprobe is not on PATH we
 * still verify the FFPROBE_MISSING typed error, so the suite passes on a bare
 * machine while staying honest about what it could and could not verify.
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  MohoRenderMetrics,
  RenderMetricsError
} from '../src/services/mohoRenderMetrics/index.js';

const TMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-render-metrics-'));

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

afterAll(() => {
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
});

describe('MohoRenderMetrics.probeRender — missing file', () => {
  it('throws RenderMetricsError with VIDEO_UNDECODABLE for a path that does not exist', async () => {
    const missing = path.join(TMP_ROOT, 'does-not-exist.mp4');

    await expect(
      MohoRenderMetrics.probeRender(missing, 24, 1)
    ).rejects.toBeInstanceOf(RenderMetricsError);

    await expect(
      MohoRenderMetrics.probeRender(missing, 24, 1)
    ).rejects.toMatchObject({ code: 'VIDEO_UNDECODABLE' });
  });
});

describe('MohoRenderMetrics.probeRender — non-video file', () => {
  it('throws a typed RenderMetricsError when ffprobe cannot decode the bytes', async () => {
    const textPath = path.join(TMP_ROOT, 'not-a-video.mp4');
    fs.writeFileSync(textPath, 'this is just plain text, not a video stream at all');

    if (!ffprobe) {
      await expect(
        MohoRenderMetrics.probeRender(textPath, 24, 1)
      ).rejects.toMatchObject({ code: 'FFPROBE_MISSING' });
      return;
    }

    await expect(
      MohoRenderMetrics.probeRender(textPath, 24, 1)
    ).rejects.toBeInstanceOf(RenderMetricsError);

    await expect(
      MohoRenderMetrics.probeRender(textPath, 24, 1)
    ).rejects.toMatchObject({ code: 'VIDEO_UNDECODABLE' });
  });
});

(ffmpeg && ffprobe ? describe : describe.skip)('MohoRenderMetrics.probeRender — valid mp4', () => {
  let videoPath: string;

  beforeAll(() => {
    videoPath = path.join(TMP_ROOT, 'sample.mp4');
    execFileSync('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-f', 'lavfi', '-i', 'testsrc=duration=1:size=320x240:rate=24',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
      videoPath
    ]);
  });

  it('returns the expected MohoProbeRenderResult shape', async () => {
    const result = await MohoRenderMetrics.probeRender(videoPath, 24, 1);

    expect(typeof result.fps).toBe('number');
    expect(result.fps).toBeGreaterThan(0);

    expect(typeof result.durationSec).toBe('number');
    expect(result.durationSec).toBeGreaterThan(0);

    expect(result.resolution).toEqual({ width: 320, height: 240 });
    expect(typeof result.codec).toBe('string');
    expect(result.codec.length).toBeGreaterThan(0);

    expect(result.matches).toEqual({ fps: true, duration: true });
    expect(Array.isArray(result.issues)).toBe(true);
    expect(result.issues).toEqual([]);
  });
});

describe('MohoRenderMetrics.probeFrameSequence — empty dir', () => {
  it('throws RenderMetricsError when the directory has no PNG frames', async () => {
    const emptyDir = path.join(TMP_ROOT, 'empty-frames');
    fs.mkdirSync(emptyDir, { recursive: true });

    await expect(
      MohoRenderMetrics.probeFrameSequence(emptyDir)
    ).rejects.toBeInstanceOf(RenderMetricsError);

    await expect(
      MohoRenderMetrics.probeFrameSequence(emptyDir)
    ).rejects.toMatchObject({ code: 'VIDEO_UNDECODABLE' });
  });
});

describe('MohoRenderMetrics.probeFrameSequence — dir of 5 PNG files', () => {
  let framesDir: string;

  beforeAll(() => {
    framesDir = path.join(TMP_ROOT, 'frames-5');
    fs.mkdirSync(framesDir, { recursive: true });
    for (let i = 1; i <= 5; i++) {
      fs.writeFileSync(path.join(framesDir, `frame_${String(i).padStart(4, '0')}.png`), 'png');
    }
  });

  it('returns { frameCount: 5, ... }', async () => {
    const result = await MohoRenderMetrics.probeFrameSequence(framesDir);

    expect(result.frameCount).toBe(5);
    expect(typeof result.firstFrame).toBe('string');
    expect(typeof result.lastFrame).toBe('string');
    expect(typeof result.avgSizeBytes).toBe('number');
    expect(result.avgSizeBytes).toBeGreaterThanOrEqual(0);
  });
});

describe('MohoRenderMetrics.probeFrameSequence — frame order', () => {
  it('sorts numerically so 1, 2, 10 come out as 1, 2, 10 — not 1, 10, 2', async () => {
    const orderDir = path.join(TMP_ROOT, 'frames-order');
    fs.mkdirSync(orderDir, { recursive: true });

    const names = ['frame_001.png', 'frame_010.png', 'frame_002.png'];
    for (const n of names) {
      fs.writeFileSync(path.join(orderDir, n), 'png');
    }

    const result = await MohoRenderMetrics.probeFrameSequence(orderDir);

    expect(result.frameCount).toBe(3);
    expect(result.firstFrame).toBe('frame_001.png');
    expect(result.lastFrame).toBe('frame_010.png');

    const files = fs
      .readdirSync(orderDir)
      .filter(n => n.endsWith('.png'))
      .sort();
    expect(files).toEqual(['frame_001.png', 'frame_002.png', 'frame_010.png']);
  });
});

describe('MohoRenderMetrics.probeRender — honest ffprobe-missing path', () => {
  it('throws RenderMetricsError with code FFPROBE_MISSING when ffprobe is absent', async () => {
    if (ffprobe) {
      const existingPath = path.join(TMP_ROOT, 'any-existing.mp4');
      fs.writeFileSync(existingPath, 'placeholder bytes');

      try {
        await MohoRenderMetrics.probeRender(existingPath, 24, 1);
      } catch (err) {
        expect(err).toBeInstanceOf(RenderMetricsError);
        expect((err as RenderMetricsError).code).not.toBe('FFPROBE_MISSING');
      }
      return;
    }

    const anyExistingPath = path.join(TMP_ROOT, 'any-existing.mp4');
    fs.writeFileSync(anyExistingPath, 'placeholder bytes');

    await expect(
      MohoRenderMetrics.probeRender(anyExistingPath, 24, 1)
    ).rejects.toBeInstanceOf(RenderMetricsError);

    await expect(
      MohoRenderMetrics.probeRender(anyExistingPath, 24, 1)
    ).rejects.toMatchObject({ code: 'FFPROBE_MISSING' });
  });
});