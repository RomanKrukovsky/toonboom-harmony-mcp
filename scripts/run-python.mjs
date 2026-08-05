#!/usr/bin/env node
// Cross-platform launcher for the Python tooling.
//
// Why this exists: the original `npm` scripts hardcoded `.venv-ml/bin/python`
// (and the .venv-ml-core / .venv-reconstruction variants). Those paths are POSIX
// only and silently break on Windows. Every npm script that previously ended in
// `.venv-*/bin/python ...` now ends in `node scripts/run-python.mjs <env> <args>...`,
// which locates the right interpreter on the current machine, sets sys.path so
// `from runtime import ...` works regardless of the caller's cwd, and forwards exit codes.
//
// Usage examples:
//   node scripts/run-python.mjs ml scripts/ml/doctor.py --json
//   node scripts/run-python.mjs reconstruction -m pytest services/reconstruction-core/tests
//   node scripts/run-python.mjs ml-core -m uvicorn ml_core.api:app --host 127.0.0.1 --port 8766
//
// Recognised envs: ml, ml-core, reconstruction.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { delimiter, join, resolve, dirname } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const isWindows = process.platform === 'win32';

// Activation scripts differ on Windows (Scripts\\activate vs bin/activate) and the executable
// is `python.exe` instead of `python`. The directory layout is otherwise identical.
function venvPython(envName) {
  const dir = join(REPO_ROOT, '.venv-' + envName);
  if (!existsSync(dir)) return null;
  const exe = isWindows ? join(dir, 'Scripts', 'python.exe') : join(dir, 'bin', 'python');
  if (!existsSync(exe)) return null;
  return exe;
}

function systemPython() {
  // Fall back to whatever is on PATH. We never fail a build because the developer is on a
  // platform we did not pre-create a venv for; the contract is "if a venv exists, prefer it".
  return isWindows ? 'python.exe' : 'python3';
}

const [, , envName, ...args] = process.argv;
if (!envName || args.length === 0) {
  console.error('usage: run-python.mjs <env> <args...>  (env: ml | ml-core | reconstruction)');
  process.exit(2);
}

if (!['ml', 'ml-core', 'reconstruction'].includes(envName)) {
  console.error('unknown env: ' + envName + ' (expected ml | ml-core | reconstruction)');
  process.exit(2);
}

const python = venvPython(envName) ?? systemPython();

const env = {
  ...process.env,
  PYTHONPATH: [
    join(REPO_ROOT, 'services', 'ml-runtime'),
    join(REPO_ROOT, 'services', 'ml-core'),
    REPO_ROOT,
    process.env.PYTHONPATH ?? '',
  ].filter(Boolean).join(delimiter),
  // Provide a default for the licence gate so npm scripts that are NOT explicitly
  // commercial get the safe default. Callers can still set COMMERCIAL_BUILD=false.
  COMMERCIAL_BUILD: process.env.COMMERCIAL_BUILD ?? 'true',
};

const result = spawnSync(python, args, { stdio: 'inherit', env, cwd: REPO_ROOT });
process.exit(result.status ?? 1);
