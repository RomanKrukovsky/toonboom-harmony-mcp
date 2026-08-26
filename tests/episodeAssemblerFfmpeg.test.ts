/**
 * Episode assembler smoke — real ffmpeg round trip.
 *
 * Generates two tiny H.264 clips with lavfi, assembles them through
 * scripts/assemble_episode.mjs, then verifies the artifact decodes and its
 * duration matches the inputs within tolerance. Also covers per-scene audio,
 * platform presets, and crossfade timing. Skips when ffmpeg/ffprobe are
 * absent (CI containers) — absence is reported, never faked.
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const TMP = path.join(ROOT, 'output', '__episode_assemble_test');

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

(ffmpeg && ffprobe ? describe : describe.skip)('episode assembler (real ffmpeg)', () => {
  let manifestPath: string;

  function writeManifest(fileName: string, manifest: unknown): string {
    const p = path.join(TMP, fileName);
    fs.writeFileSync(p, JSON.stringify(manifest));
    return p;
  }

  function runAssembler(manifestFile: string): any {
    return JSON.parse(
      execFileSync('node', [path.join(ROOT, 'scripts', 'assemble_episode.mjs'), manifestFile])
        .toString()
    );
  }

  interface ProbeStream {
    codec_name?: string;
    codec_type?: string;
    width?: number;
    height?: number;
  }

  function probeStreams(file: string): ProbeStream[] {
    const out = execFileSync('ffprobe', [
      '-v', 'error', '-print_format', 'json',
      '-show_entries', 'stream=codec_name,codec_type,width,height',
      file
    ]).toString();
    return JSON.parse(out).streams ?? [];
  }

  function clip(name: string): string {
    return path.join(TMP, name);
  }

  beforeAll(() => {
    fs.rmSync(TMP, { recursive: true, force: true });
    fs.mkdirSync(TMP, { recursive: true });
    for (const name of ['S01.mp4', 'S02.mp4']) {
      execFileSync('ffmpeg', [
        '-y', '-hide_banner', '-loglevel', 'error',
        '-f', 'lavfi', '-i', `testsrc=duration=1:size=320x240:rate=12`,
        '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
        clip(name)
      ]);
    }
    manifestPath = writeManifest('manifest.json', {
      outputPath: path.join(TMP, 'E01_preview.mp4'),
      scenes: [
        { sceneId: 'S01', videoPath: clip('S01.mp4') },
        { sceneId: 'S02', videoPath: clip('S02.mp4') }
      ]
    });
  });

  afterAll(() => {
    fs.rmSync(TMP, { recursive: true, force: true });
  });

  it('assembles scenes into one decodable episode with matching duration', () => {
    const out = execFileSync('node', [path.join(ROOT, 'scripts', 'assemble_episode.mjs'), manifestPath])
      .toString();
    const report = JSON.parse(out);
    expect(report.ok).toBe(true);
    expect(report.output.durationSec).toBeGreaterThan(1.8);
    expect(report.output.durationSec).toBeLessThan(3.2);
    expect(fs.existsSync(path.join(ROOT, report.output.path))).toBe(true);
  });

  it('fails honestly on a missing scene input', () => {
    const bad = path.join(TMP, 'bad.json');
    fs.writeFileSync(bad, JSON.stringify({
      outputPath: path.join(TMP, 'x.mp4'),
      scenes: [{ sceneId: 'S99', videoPath: path.join(TMP, 'nope.mp4') }]
    }));
    let failed = false;
    try {
      execFileSync('node', [path.join(ROOT, 'scripts', 'assemble_episode.mjs'), bad], { stdio: 'pipe' });
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });

  it('maps per-scene audioPath into an aac stream in the output', () => {
    execFileSync('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1',
      '-ar', '48000', '-ac', '2',
      clip('S01_voice.wav')
    ]);
    const mf = writeManifest('audio_manifest.json', {
      outputPath: path.join(TMP, 'E01_audio.mp4'),
      scenes: [
        { sceneId: 'S01', videoPath: clip('S01.mp4'), audioPath: clip('S01_voice.wav') },
        { sceneId: 'S02', videoPath: clip('S02.mp4') }
      ]
    });
    const report = runAssembler(mf);
    expect(report.ok).toBe(true);
    const codecs = probeStreams(path.join(TMP, 'E01_audio.mp4')).map(s => s.codec_name);
    expect(codecs).toContain('aac');
  });

  it('renders platform preset 9:16 at width 1080 height 1920', () => {
    const mf = writeManifest('platform_manifest.json', {
      outputPath: path.join(TMP, 'E01_vertical.mp4'),
      platform: '9:16',
      scenes: [
        { sceneId: 'S01', videoPath: clip('S01.mp4') },
        { sceneId: 'S02', videoPath: clip('S02.mp4') }
      ]
    });
    const report = runAssembler(mf);
    expect(report.ok).toBe(true);
    const video = probeStreams(path.join(TMP, 'E01_vertical.mp4')).find(s => s.codec_type === 'video');
    expect(video?.width).toBe(1080);
    expect(video?.height).toBe(1920);
    expect(report.output.width).toBe(1080);
    expect(report.output.height).toBe(1920);
  });

  it('shrinks total duration by transitionSec across a 2-scene crossfade', () => {
    const mf = writeManifest('transition_manifest.json', {
      outputPath: path.join(TMP, 'E01_xfade.mp4'),
      transitionSec: 0.5,
      scenes: [
        { sceneId: 'S01', videoPath: clip('S01.mp4') },
        { sceneId: 'S02', videoPath: clip('S02.mp4') }
      ]
    });
    const report = runAssembler(mf);
    expect(report.ok).toBe(true);
    expect(report.output.durationSec).toBeGreaterThan(1.1);
    expect(report.output.durationSec).toBeLessThan(1.9);
  });
});
