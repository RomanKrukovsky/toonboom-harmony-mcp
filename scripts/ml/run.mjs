#!/usr/bin/env node
// Single front-door for every `npm run ml:*` command.
// Routes through scripts/run-python.mjs so Windows users hit the same venv that
// macOS/Linux do, instead of receiving a "no such file" error from `.venv-ml/bin/python`.

import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
// HERE is scripts/ml; the shared launcher lives two levels up at <repo>/scripts/run-python.mjs.
const ROOT = dirname(dirname(HERE));

// Map a logical subcommand to (venv name, python script, default args).
const COMMANDS = {
  doctor:           { env: 'ml',       script: 'scripts/ml/doctor.py' },
  catalog:          { env: 'ml',       script: 'scripts/ml/catalog.py' },
  verify_models:    { env: 'ml',       script: 'scripts/ml/verify_models.py' },
  download_model:   { env: 'ml',       script: 'scripts/ml/download_model.py' },
  smoke_test:       { env: 'ml',       script: 'scripts/ml/smoke_test.py' },
  bootstrap:        { env: 'ml',       script: 'scripts/ml/bootstrap.py' },
};

const [, , sub, ...rest] = process.argv;
if (!sub || !COMMANDS[sub]) {
  console.error('usage: scripts/ml/run.mjs <' + Object.keys(COMMANDS).join('|') + '> [args...]');
  process.exit(2);
}

// `catalog validate` and `catalog list` are sub-subcommands of catalog.py.
let args = rest;
if (sub === 'catalog') {
  if (!args.length || (args[0] !== 'validate' && args[0] !== 'list')) {
    console.error('usage: scripts/ml/run.mjs catalog <validate|list> [args...]');
    process.exit(2);
  }
}

const { env, script } = COMMANDS[sub];
const launcher = process.execPath;
const launcherArgs = [ROOT + '/scripts/run-python.mjs', env, script, ...args];

const result = spawnSync(launcher, launcherArgs, { stdio: 'inherit' });
process.exit(result.status ?? 1);
