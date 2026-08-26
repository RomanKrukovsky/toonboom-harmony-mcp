/**
 * Review package builder smoke — real ffmpeg round trip.
 *
 * Generates a tiny H.264 clip with lavfi into a fake episode dir, runs
 * scripts/build_review_package.mjs, then verifies the review page renders a
 * <video> player, the manifest parses with correct identity fields, and every
 * recorded sha256 matches the recomputed shasum of the mp4. Also covers the
 * honesty contract: missing episode dir and mp4-less dir both fail. Skips
 * when ffmpeg is absent (CI containers) — absence is reported, never faked.
 */

import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const TMP = path.join(ROOT, 'output', '__review_package_test');
const SCRIPT = path.join(ROOT, 'scripts', 'build_review_package.mjs');

function have(bin: string): boolean {
  try {
    execFileSync('which', [bin], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const ffmpeg = have('ffmpeg');

(ffmpeg ? describe : describe.skip)('review package builder (real ffmpeg)', () => {
  let episodeDir: string;

  function runReview(episodeDir: string): any {
    return JSON.parse(
      execFileSync('node', [
        SCRIPT,
        '--episode-dir', episodeDir,
        '--title', 'Test Episode',
        '--episode-id', 'E01'
      ]).toString()
    );
  }

  function readManifest(): any {
    return JSON.parse(
      fs.readFileSync(path.join(episodeDir, 'review', 'manifest.json'), 'utf8')
    );
  }

  beforeAll(() => {
    fs.rmSync(TMP, { recursive: true, force: true });
    fs.mkdirSync(TMP, { recursive: true });
    episodeDir = path.join(TMP, 'E01');
    fs.mkdirSync(episodeDir);
    execFileSync('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-f', 'lavfi', '-i', 'testsrc=duration=1:size=320x240:rate=12',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
      path.join(episodeDir, 'E01_preview.mp4')
    ]);
  });

  afterAll(() => {
    fs.rmSync(TMP, { recursive: true, force: true });
  });

  it('builds a review page and manifest for the rendered episode', () => {
    const report = runReview(episodeDir);
    expect(report.ok).toBe(true);
    expect(report.reviewDir).toBe(path.join(episodeDir, 'review'));
    expect(report.files).toBe(1);
    expect(typeof report.totalBytes).toBe('number');

    const htmlPath = path.join(episodeDir, 'review', 'index.html');
    expect(fs.existsSync(htmlPath)).toBe(true);
    const html = fs.readFileSync(htmlPath, 'utf8');
    expect(html).toContain('<video');
    expect(html).toContain('../E01_preview.mp4');
    expect(html).toContain('Test Episode');
    expect(html).toContain('E01');

    const manifest = readManifest();
    expect(manifest.episodeId).toBe('E01');
    expect(manifest.title).toBe('Test Episode');
    expect(Array.isArray(manifest.files)).toBe(true);
    expect(manifest.builtAt).toBeTruthy();
  });

  it('manifest sha256 matches the recomputed shasum of the mp4', () => {
    runReview(episodeDir);
    const manifest = readManifest();
    for (const entry of manifest.files) {
      const actual = crypto
        .createHash('sha256')
        .update(fs.readFileSync(path.join(episodeDir, entry.name)))
        .digest('hex');
      expect(entry.sha256).toBe(actual);
      expect(entry.bytes).toBe(fs.statSync(path.join(episodeDir, entry.name)).size);
    }
  });

  it('fails honestly when the episode dir is missing', () => {
    let failed = false;
    try {
      execFileSync('node', [
        SCRIPT,
        '--episode-dir', path.join(TMP, 'does_not_exist'),
        '--title', 'X',
        '--episode-id', 'E99'
      ], { stdio: 'pipe' });
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });

  it('fails honestly when no mp4 is inside the episode dir', () => {
    const empty = path.join(TMP, 'empty_dir');
    fs.mkdirSync(empty, { recursive: true });
    let failed = false;
    try {
      execFileSync('node', [
        SCRIPT,
        '--episode-dir', empty,
        '--title', 'X',
        '--episode-id', 'E98'
      ], { stdio: 'pipe' });
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });
});
