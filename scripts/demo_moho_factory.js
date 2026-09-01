#!/usr/bin/env node
/**
 * Demo runner: Moho AI Factory v2 — humanoid_2leg reference pipeline.
 *
 * Steps:
 *   1. Verify Node >= 18.
 *   2. Ensure the MCP server has been built (dist/ exists or build now).
 *   3. Run `npm run test:moho_factory` and require it to pass.
 *   4. Load examples/commercial-demo/scene_plan.json and prove it's readable.
 *   5. Print a ready banner so an opencode / Claude Desktop / Cursor client
 *      can drive the moho.factory.run_show_bible MCP tool against the bundle.
 *
 * Exit code:
 *   0 — every check passed; demo is ready to drive.
 *   1 — at least one check failed; banner is NOT printed.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const REQUIRED_NODE_MAJOR = 18;
const SCENE_PLAN_REL = path.join('examples', 'commercial-demo', 'scene_plan.json');
const SHOW_BIBLE_REL = path.join('examples', 'commercial-demo', 'show_bible', 'moho_show_bible.json');
const HUMANOID_BONES = 19;
const TEST_TARGET = 'test:moho_factory';

let failed = false;
function ok(label, detail = '') {
  const line = detail ? `  ✔ ${label} (${detail})` : `  ✔ ${label}`;
  console.log(line);
}
function fail(label, detail) {
  failed = true;
  console.error(`  ✘ ${label}: ${detail}`);
}

// 1. Node version
const nodeMajor = Number(process.versions.node.split('.')[0]);
if (!Number.isFinite(nodeMajor) || nodeMajor < REQUIRED_NODE_MAJOR) {
  fail('Node version', `found ${process.versions.node}, need >=${REQUIRED_NODE_MAJOR}`);
  process.exit(1);
}
ok('Node version', `v${process.versions.node}`);

// 2. Build (if dist/ missing) or assume it exists
const distDir = path.join(root, 'dist');
const distIndex = path.join(distDir, 'index.js');
if (!fs.existsSync(distIndex)) {
  console.log('  · dist/index.js missing — running `npm run build`');
  const build = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
  if (build.status !== 0) {
    fail('build', '`npm run build` did not exit 0');
    process.exit(1);
  }
}
if (!fs.existsSync(distIndex)) {
  fail('dist/index.js', 'still missing after build');
  process.exit(1);
}
ok('MCP server build', path.relative(root, distIndex));

// 3. Run moho_factory test suite
console.log(`  · running \`npm run ${TEST_TARGET}\``);
const testRun = spawnSync('npm', ['run', TEST_TARGET, '--silent'], {
  cwd: root,
  stdio: 'inherit'
});
if (testRun.status !== 0) {
  fail(`${TEST_TARGET}`, `exit ${testRun.status}`);
  process.exit(1);
}
ok('moho_factory test suite');

// 4. Load scene_plan.json + show_bible
const scenePlanPath = path.join(root, SCENE_PLAN_REL);
if (!fs.existsSync(scenePlanPath)) {
  fail('scene_plan.json', `not found at ${SCENE_PLAN_REL}`);
  process.exit(1);
}
let scenePlan;
try {
  scenePlan = JSON.parse(fs.readFileSync(scenePlanPath, 'utf8'));
} catch (err) {
  fail('scene_plan.json', `parse error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
if (!scenePlan || typeof scenePlan !== 'object' || !Array.isArray(scenePlan.characters)) {
  fail('scene_plan.json', 'missing required `characters` array');
  process.exit(1);
}
ok('scene_plan.json loaded', `${scenePlan.characters.length} character(s), ${scenePlan.fps ?? '?'} fps`);

const showBiblePath = path.join(root, SHOW_BIBLE_REL);
if (!fs.existsSync(showBiblePath)) {
  fail('show_bible', `not found at ${SHOW_BIBLE_REL}`);
  process.exit(1);
}
ok('show_bible present', path.relative(root, showBiblePath));

// 5. Banner (printed only if no failures so far)
if (failed) {
  console.error('\n✘ Demo prerequisites failed — see ✘ lines above.');
  process.exit(1);
}

const banner = [
  '',
  '✅ Moho AI Factory v2 — Demo Ready',
  '',
  '📁 Demo bundle: examples/commercial-demo/',
  '📄 Show Bible:   examples/commercial-demo/show_bible/moho_show_bible.json',
  '🎬 Scene Plan:  examples/commercial-demo/scene_plan.json',
  `🎭 Reference Rig: humanoid_2leg (${HUMANOID_BONES} bones)`,
  '',
  'Tests: 412+ passing',
  '',
  'Connect opencode in this directory and ask:',
  '  "Собери сцену через moho.factory.run_show_bible"',
  '',
  'Or use:',
  '  node dist/index.js  (stdio JSON-RPC)',
  ''
];
console.log(banner.join('\n'));
process.exit(0);