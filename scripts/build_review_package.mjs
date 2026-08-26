#!/usr/bin/env node
/**
 * Review package builder — turns a directory of rendered episode previews
 * into a single self-contained HTML review page plus a verifiable manifest.
 *
 * Usage:
 *   node scripts/build_review_package.mjs --episode-dir <dir> --title <name> --episode-id <id>
 *
 * Produces inside <dir>/review/:
 *   index.html    — dark, dependency-free player: one <video controls> per
 *                   mp4 (relative src), title header, episode id, generated
 *                   timestamp, file list with sizes.
 *   manifest.json — { episodeId, title, files: [{name, bytes, sha256}], builtAt }
 *
 * Copies nothing outside review/: videos stay in place and are referenced
 * relatively. Hashes are computed with node crypto (sha256).
 *
 * Honesty contract: exit 0 only when the episode dir exists, contains at
 * least one .mp4, and both artifacts were written; otherwise non-zero.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

function fail(report, msg) {
  report.ok = false;
  report.error = msg;
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--episode-dir') out.episodeDir = argv[++i];
    else if (argv[i] === '--title') out.title = argv[++i];
    else if (argv[i] === '--episode-id') out.episodeId = argv[++i];
  }
  return out;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = n;
  let u = -1;
  do { v /= 1024; u++; } while (v >= 1024 && u < units.length - 1);
  return `${v.toFixed(1)} ${units[u]}`;
}

// ---------------------------------------------------------------------------

const args = parseArgs(process.argv.slice(2));
if (!args.episodeDir || !args.title || !args.episodeId) {
  console.error('usage: node scripts/build_review_package.mjs --episode-dir <dir> --title <name> --episode-id <id>');
  process.exit(2);
}

const report = {};

const episodeDir = path.resolve(args.episodeDir);
if (!fs.existsSync(episodeDir) || !fs.statSync(episodeDir).isDirectory()) {
  fail(report, `episode dir not found: ${episodeDir}`);
}

const mp4Names = fs.readdirSync(episodeDir)
  .filter(name => name.toLowerCase().endsWith('.mp4'))
  .filter(name => fs.statSync(path.join(episodeDir, name)).isFile())
  .sort();
if (mp4Names.length === 0) {
  fail(report, `no .mp4 files found inside ${episodeDir}`);
}

const reviewDir = path.join(episodeDir, 'review');
fs.mkdirSync(reviewDir, { recursive: true });

const builtAt = new Date().toISOString();
const files = mp4Names.map(name => {
  const abs = path.join(episodeDir, name);
  const bytes = fs.statSync(abs).size;
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
  return { name, bytes, sha256 };
});
const totalBytes = files.reduce((sum, f) => sum + f.bytes, 0);

const videoSections = files.map(f => `
  <section class="clip">
    <h2>${esc(f.name)}</h2>
    <video controls preload="metadata" src="../${encodeURIComponent(f.name)}"></video>
    <p class="size">${formatBytes(f.bytes)} · sha256 <code>${esc(f.sha256)}</code></p>
  </section>`).join('\n');

const fileList = files.map(f =>
  `      <li><code>${esc(f.name)}</code> — ${formatBytes(f.bytes)}</li>`).join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(args.title)} — ${esc(args.episodeId)} review</title>
<style>
  :root { color-scheme: dark; }
  body { background: #101014; color: #e8e8ec; font-family: system-ui, -apple-system, sans-serif;
         margin: 0 auto; padding: 2.5rem 1.5rem 4rem; max-width: 900px; line-height: 1.5; }
  header { border-bottom: 1px solid #2a2a32; padding-bottom: 1rem; margin-bottom: 2rem; }
  h1 { margin: 0 0 .25rem; font-size: 1.6rem; letter-spacing: -.01em; }
  .meta { color: #9a9aa6; font-size: .9rem; margin: 0; }
  .clip { margin-bottom: 2.5rem; }
  .clip h2 { font-size: 1rem; font-weight: 600; color: #c9c9d4; margin: 0 0 .5rem; }
  video { width: 100%; aspect-ratio: 16 / 9; background: #000; border-radius: 8px;
          border: 1px solid #2a2a32; }
  .size { color: #9a9aa6; font-size: .82rem; margin: .4rem 0 0; overflow-wrap: anywhere; }
  code { font-family: ui-monospace, Menlo, monospace; font-size: .85em; color: #c9c9d4; }
  footer { border-top: 1px solid #2a2a32; padding-top: 1rem; }
  footer ul { padding-left: 1.2rem; margin: .5rem 0 0; }
  footer li { font-size: .88rem; color: #b9b9c4; margin-bottom: .25rem; }
</style>
</head>
<body>
<header>
  <h1>${esc(args.title)}</h1>
  <p class="meta">Episode ID: ${esc(args.episodeId)} · Generated: ${esc(builtAt)} · ${files.length} clip${files.length === 1 ? '' : 's'}</p>
</header>
<main>
${videoSections}
</main>
<footer>
  <h2>Files</h2>
  <ul>
${fileList}
  </ul>
</footer>
</body>
</html>
`;

const manifest = { episodeId: args.episodeId, title: args.title, files, builtAt };

try {
  fs.writeFileSync(path.join(reviewDir, 'index.html'), html);
  fs.writeFileSync(path.join(reviewDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
} catch (e) {
  fail(report, `failed writing review package: ${e.message}`);
}

report.ok = true;
report.reviewDir = reviewDir;
report.files = files.length;
report.totalBytes = totalBytes;
console.log(JSON.stringify(report, null, 2));
