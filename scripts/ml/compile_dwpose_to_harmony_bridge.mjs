#!/usr/bin/env node
// Bridge that drives the real TypeScript poseRetargetCompiler harness via
// a tiny CommonJS bootstrap that uses the project's own tsconfig and lets
// ts-node resolve `.js -> .ts` the way the build does.
//
// Argument list: <pir-json-path> <plan-json-path>
// Stdout: a single JSON object summarising the outcome.

import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');

const [, , pirArg, planArg] = process.argv;
if (!pirArg || !planArg) {
  console.error('usage: compile_dwpose_to_harmony_bridge.mjs <pir-json> <plan-json>');
  process.exit(2);
}
const rigJson = process.env.HARMONY_SLICE_RIG;
if (!rigJson) {
  console.error('HARMONY_SLICE_RIG env var must carry a JSON rig definition');
  process.exit(2);
}

const tsconfig = resolve(REPO_ROOT, 'tsconfig.json');
const bootstrap = resolve(REPO_ROOT, 'scripts', 'ml', 'compile_dwpose_to_harmony_bootstrap.cjs');
const result = spawnSync(process.execPath, [bootstrap, pirArg, planArg], {
  cwd: REPO_ROOT,
  encoding: 'utf-8',
  env: { ...process.env, HARMONY_SLICE_RIG: rigJson, TS_NODE_PROJECT: tsconfig },
});

if (result.status !== 0) {
  console.error(result.stderr || result.stdout || 'bridge failed');
  process.exit(result.status ?? 1);
}
process.stdout.write(result.stdout);
process.exit(0);
