#!/usr/bin/env node
/**
 * Episode assembler — deterministic offline assembly of rendered scene
 * previews into one episode video (the "montazhyor" stage of the factory).
 *
 * Input manifest (JSON):
 * {
 *   "outputPath": "output/episode/E01_preview.mp4",
 *   "audioPath": "output/episode/E01_music.wav",   // optional global music bed
 *   "platform": "9:16",                            // optional: 16:9 | 9:16 | 1:1 (default 16:9)
 *   "outputs": ["16:9", "9:16"],                   // optional multi-platform render list
 *   "transitionSec": 0.5,                          // optional crossfade between consecutive scenes
 *   "scenes": [
 *     { "sceneId": "S01", "videoPath": "renders/S01.mp4", "audioPath": "renders/S01_voice.wav" },
 *     ...
 *   ]
 * }
 *
 * Pipeline: verify inputs -> probe durations -> assemble timeline (plain concat
 * re-encode; or normalized h264+aac segments when any scene carries audio;
 * or xfade/acrossfade chain when transitionSec > 0) -> optional music bed mixed
 * under scene dialogue (amix weights '1 0.4') -> platform scale+crop preset
 * -> ffprobe-verify each artifact (duration within tolerance) -> print report.
 *
 * Honesty contract: exit 0 only when every output file exists, decodes, and its
 * measured duration matches the expected timeline duration; otherwise non-zero.
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

function fail(report, msg) {
  report.ok = false;
  report.error = msg;
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

function run(bin, args) {
  return execFileSync(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
}

function ffprobeJson(file) {
  const out = run('ffprobe', [
    '-v', 'error', '-print_format', 'json',
    '-show_entries', 'format=duration,size', '-show_entries', 'stream=codec_name,width,height',
    file
  ]);
  return JSON.parse(out);
}

// ---------------------------------------------------------------------------

const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error('usage: node scripts/assemble_episode.mjs <manifest.json>');
  process.exit(2);
}

const report = { ok: true, manifest: path.relative(root, manifestPath), steps: [] };

function ffmpeg(args, what) {
  try {
    execFileSync('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    fail(report, `${what} failed: ${String(e.stderr || e.message).slice(0, 400)}`);
  }
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (e) {
  fail(report, `manifest unreadable: ${e.message}`);
}
if (!Array.isArray(manifest.scenes) || manifest.scenes.length === 0) {
  fail(report, 'manifest.scenes must be a non-empty array');
}
for (const s of manifest.scenes) {
  if (!s.sceneId || !s.videoPath) fail(report, 'every scene needs sceneId and videoPath');
  if (!fs.existsSync(path.resolve(root, s.videoPath))) {
    fail(report, `scene "${s.sceneId}" input missing: ${s.videoPath}`);
  }
  if (s.audioPath && !fs.existsSync(path.resolve(root, s.audioPath))) {
    fail(report, `scene "${s.sceneId}" audioPath missing: ${s.audioPath}`);
  }
}
if (manifest.audioPath && !fs.existsSync(path.resolve(root, manifest.audioPath))) {
  fail(report, `audioPath missing: ${manifest.audioPath}`);
}

const transitionSec = Number(manifest.transitionSec ?? 0);
if (!Number.isFinite(transitionSec) || transitionSec < 0) {
  fail(report, `transitionSec must be a non-negative number, got: ${manifest.transitionSec}`);
}
const useTransitions = transitionSec > 0 && manifest.scenes.length > 1;
const anySceneAudio = manifest.scenes.some(s => !!s.audioPath);
const needsSegments = anySceneAudio || useTransitions;

// Platform presets: scale to cover the target frame, then center-crop.
const PLATFORMS = {
  '16:9': { name: '16:9', key: '16x9', width: 1920, height: 1080 },
  '9:16': { name: '9:16', key: '9x16', width: 1080, height: 1920 },
  '1:1': { name: '1:1', key: '1x1', width: 1080, height: 1080 }
};
const requestedPlatforms = Array.isArray(manifest.outputs) && manifest.outputs.length > 0
  ? manifest.outputs
  : [manifest.platform ?? '16:9'];
const platforms = requestedPlatforms.map(name => {
  const preset = PLATFORMS[name];
  if (!preset) {
    fail(report, `unknown platform "${name}" (expected one of: ${Object.keys(PLATFORMS).join(', ')})`);
  }
  return preset;
});

// Probe every input; record real durations.
let totalInputSec = 0;
const durations = [];
report.steps.push({ step: 'probe-inputs', scenes: [] });
for (const s of manifest.scenes) {
  const abs = path.resolve(root, s.videoPath);
  let info;
  try {
    info = ffprobeJson(abs);
  } catch (e) {
    fail(report, `ffprobe failed on ${s.videoPath}: ${String(e.stderr || e.message).slice(0, 300)}`);
  }
  const dur = parseFloat(info.format?.duration ?? 'NaN');
  if (!Number.isFinite(dur) || dur <= 0) fail(report, `no decodable duration in ${s.videoPath}`);
  const stream = info.streams?.[0] ?? {};
  if (stream.codec_name !== 'h264') fail(report, `${s.videoPath} is not h264; expected pre-rendered previews`);
  totalInputSec += dur;
  durations.push(dur);
  report.steps[0].scenes.push({ sceneId: s.sceneId, durationSec: +dur.toFixed(3), codec: stream.codec_name });
}

// Expected timeline length after crossfade shrinkage.
const expectedSec = Math.max(
  totalInputSec - (useTransitions ? transitionSec * (manifest.scenes.length - 1) : 0),
  0.1
);

const tmpDir = fs.mkdtempSync(path.join(root, 'output', 'assemble_'));
const outputPathAbs = path.resolve(root, manifest.outputPath);
fs.mkdirSync(path.dirname(outputPathAbs), { recursive: true });

// Source-level concat list for the plain path (no per-scene audio, no fades).
const sourceListFile = path.join(tmpDir, 'concat_sources.txt');
fs.writeFileSync(
  sourceListFile,
  manifest.scenes.map(s => `file '${path.resolve(root, s.videoPath).replace(/'/g, "'\\''")}'`).join('\n')
);

function place(from, to) {
  try {
    fs.renameSync(from, to);
  } catch {
    fs.copyFileSync(from, to);
    fs.rmSync(from, { force: true });
  }
}

function withSuffix(abs, key) {
  const ext = path.extname(abs);
  return abs.slice(0, abs.length - ext.length) + `_${key}${ext}`;
}

function renderSegment(scene, preset, dir, idx) {
  const outSeg = path.join(dir, `seg_${String(idx).padStart(2, '0')}.mp4`);
  const args = ['-y', '-hide_banner', '-loglevel', 'error',
    '-i', path.resolve(root, scene.videoPath)];
  if (scene.audioPath) {
    args.push('-i', path.resolve(root, scene.audioPath));
  } else {
    args.push('-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo');
  }
  args.push(
    '-vf',
    `scale=${preset.width}:${preset.height}:force_original_aspect_ratio=increase,crop=${preset.width}:${preset.height},setsar=1,fps=30`,
    '-map', '0:v:0', '-map', '1:a:0',
    '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-ac', '2',
    '-af', 'apad', '-shortest', '-t', durations[idx].toFixed(3),
    outSeg
  );
  ffmpeg(args, `segment render "${scene.sceneId}" (${preset.name})`);
  return outSeg;
}

function xfadeArgs(segs, out) {
  const args = ['-y', '-hide_banner', '-loglevel', 'error'];
  for (const f of segs) args.push('-i', f);
  const fc = [];
  let vLabel = '0:v';
  let aLabel = '0:a';
  let offset = durations[0] - transitionSec;
  for (let i = 1; i < segs.length; i++) {
    const nextV = `vx${i}`;
    const nextA = `ax${i}`;
    fc.push(`[${vLabel}][${i}:v]xfade=transition=fade:duration=${transitionSec}:offset=${Math.max(offset, 0).toFixed(3)}[${nextV}]`);
    fc.push(`[${aLabel}][${i}:a]acrossfade=d=${transitionSec}[${nextA}]`);
    vLabel = nextV;
    aLabel = nextA;
    offset += durations[i] - transitionSec;
  }
  args.push('-filter_complex', fc.join(';'),
    '-map', `[${vLabel}]`, '-map', `[${aLabel}]`,
    '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k',
    out);
  return args;
}

function concatSegmentsArgs(segs, dir, out) {
  const listFile = path.join(dir, 'concat_segments.txt');
  fs.writeFileSync(listFile, segs.map(f => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));
  return ['-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'concat', '-safe', '0', '-i', listFile,
    '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k',
    out];
}

function musicMixArgs(timeline, out) {
  return ['-y', '-hide_banner', '-loglevel', 'error',
    '-i', timeline, '-i', path.resolve(root, manifest.audioPath),
    '-filter_complex', "[0:a][1:a]amix=inputs=2:weights='1 0.4':duration=first[aout]",
    '-map', '0:v', '-map', '[aout]',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
    out];
}

function fastConcatArgs(preset, out) {
  const args = ['-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'concat', '-safe', '0', '-i', sourceListFile,
    '-vf', `scale=${preset.width}:${preset.height}:force_original_aspect_ratio=increase,crop=${preset.width}:${preset.height},setsar=1`,
    '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p'];
  if (manifest.audioPath) {
    args.push('-i', path.resolve(root, manifest.audioPath),
      '-map', '0:v:0', '-map', '1:a:0?', '-c:a', 'aac', '-shortest');
  }
  args.push(out);
  return args;
}

function verifyOutput(abs, preset) {
  let probed;
  try {
    probed = ffprobeJson(abs);
  } catch {
    probed = null;
  }
  const outDur = parseFloat(probed?.format?.duration ?? 'NaN');
  if (!Number.isFinite(outDur) || outDur <= 0) fail(report, 'output does not decode');
  const toleranceSec = 1.5;
  const delta = Math.abs(outDur - expectedSec);
  if (delta > toleranceSec) {
    fail(report, `duration drift ${delta.toFixed(3)}s exceeds tolerance (expected ~${expectedSec.toFixed(3)}s vs ${outDur.toFixed(3)}s)`);
  }
  const vStream = probed.streams?.find(st => st.codec_type === 'video' || st.codec_name === 'h264') ?? {};
  return {
    platform: preset.name,
    path: path.relative(root, abs),
    bytes: fs.statSync(abs).size,
    durationSec: +outDur.toFixed(3),
    expectedDurationSec: +expectedSec.toFixed(3),
    inputDurationSec: +totalInputSec.toFixed(3),
    driftSec: +delta.toFixed(3),
    width: vStream.width ?? null,
    height: vStream.height ?? null,
    streams: probed.streams
  };
}

function assembleOne(preset, suffixed) {
  const targetAbs = suffixed ? withSuffix(outputPathAbs, preset.key) : outputPathAbs;
  const workDir = path.join(tmpDir, preset.key);
  fs.mkdirSync(workDir, { recursive: true });

  if (needsSegments) {
    const segs = manifest.scenes.map((s, i) => renderSegment(s, preset, workDir, i));
    let assembled = path.join(workDir, 'timeline.mp4');
    if (useTransitions) {
      ffmpeg(xfadeArgs(segs, assembled), `xfade assemble (${preset.name})`);
      report.steps.push({ step: 'xfade+acrossfade', platform: preset.name, transitionSec });
    } else {
      ffmpeg(concatSegmentsArgs(segs, workDir, assembled), `segment concat (${preset.name})`);
      report.steps.push({ step: 'segment-concat', platform: preset.name });
    }
    if (anySceneAudio && manifest.audioPath) {
      const mixed = path.join(workDir, 'mixed.mp4');
      ffmpeg(musicMixArgs(assembled, mixed), `music bed mix (${preset.name})`);
      report.steps.push({ step: 'music-mix', platform: preset.name, weights: '1 0.4' });
      assembled = mixed;
    }
    place(assembled, targetAbs);
  } else {
    ffmpeg(fastConcatArgs(preset, targetAbs), `concat+encode (${preset.name})`);
    report.steps.push({ step: 'concat+encode', platform: preset.name, output: path.relative(root, targetAbs) });
  }

  return verifyOutput(targetAbs, preset);
}

const results = platforms.map(p => assembleOne(p, platforms.length > 1));

report.ok = true;
report.output = results[0];
if (results.length > 1) {
  report.outputs = results.map(({ streams, ...rest }) => rest);
}
fs.rmSync(tmpDir, { recursive: true, force: true });
console.log(JSON.stringify(report, null, 2));
