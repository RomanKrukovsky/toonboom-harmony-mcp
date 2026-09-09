import 'dotenv/config';
import fs from 'fs';
import os from 'os';
import path from 'path';
import process from 'process';
import { spawnSync } from 'child_process';
import { pathToFileURL } from 'url';

const manifestArgument = process.argv.slice(2).find(value => !value.startsWith('--'));
const pilotMode = process.argv.includes('--pilot');
if (!manifestArgument) {
  process.stderr.write('Usage: npm run harmony:v4:preflight95 -- /absolute/path/to/benchmark-manifest.json [--pilot]\n');
  process.exit(2);
}

const manifestPath = path.resolve(manifestArgument);
const manifestDirectory = path.dirname(manifestPath);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const inputModulePath = path.resolve('dist/services/mohoProductionV3BenchmarkInputs/index.js');
const validatorModulePath = path.resolve('dist/services/mohoCharacterAssetPackValidator/index.js');
const approvalModulePath = path.resolve('dist/services/mohoProductionV3BenchmarkApprovals/index.js');
const { requiredMohoV3BenchmarkAssetPaths } = await import(pathToFileURL(inputModulePath).href);
const { validateMohoCharacterAssetPack } = await import(pathToFileURL(validatorModulePath).href);
const {
  mohoProductionV3DirectorApprovalFileSchema,
  resolveMohoV3BenchmarkDirector
} = await import(pathToFileURL(approvalModulePath).href);

const checks = [];
const missingAssets = [];

function addCheck(id, status, message, details = undefined) {
  checks.push({ id, status, message, ...(details === undefined ? {} : { details }) });
}

function nonemptyFile(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile() && fs.statSync(filePath).size > 0;
}

function commandWorks(command, args) {
  if (!command?.trim()) return false;
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: 15_000 });
  return !result.error && result.status === 0;
}

function validateManifest() {
  if (!Array.isArray(manifest.shots) || manifest.shots.length !== 40) {
    addCheck('manifest', 'fail', `Expected exactly 40 shots; found ${manifest.shots?.length ?? 0}.`);
    return false;
  }
  const ids = new Set(manifest.shots.map(shot => shot.shotId));
  if (ids.size !== 40) {
    addCheck('manifest', 'fail', 'shotId values must be unique.');
    return false;
  }
  if (pilotMode && (
    !Array.isArray(manifest.pilotShotIds)
    || manifest.pilotShotIds.length !== 5
    || new Set(manifest.pilotShotIds).size !== 5
    || manifest.pilotShotIds.some(shotId => !ids.has(shotId))
  )) {
    addCheck('manifest', 'fail', 'pilotShotIds must contain five unique IDs from shots.');
    return false;
  }
  addCheck('manifest', 'pass', 'Manifest contains 40 unique shots.');
  return true;
}

function checkProviders() {
  const planner = process.env.MOHO_PLANNER_PROVIDER?.trim();
  const artwork = process.env.MOHO_ARTWORK_PROVIDER?.trim();
  const budget = Number(process.env.MOHO_MAX_IMAGE_CALLS_PER_SHOT);
  const failures = [];
  if (planner !== 'openrouter' && planner !== 'anthropic') failures.push('MOHO_PLANNER_PROVIDER');
  if (artwork !== 'openrouter' && artwork !== 'openai') failures.push('MOHO_ARTWORK_PROVIDER');
  if (!Number.isInteger(budget) || budget < 1) failures.push('MOHO_MAX_IMAGE_CALLS_PER_SHOT');
  if (planner === 'openrouter' && !process.env.OPENROUTER_API_KEY?.trim()) failures.push('OPENROUTER_API_KEY');
  if (planner === 'anthropic' && !process.env.ANTHROPIC_API_KEY?.trim()) failures.push('ANTHROPIC_API_KEY');
  if (artwork === 'openai' && !process.env.OPENAI_API_KEY?.trim()) failures.push('OPENAI_API_KEY');
  if (artwork === 'openrouter') {
    if (!process.env.OPENROUTER_API_KEY?.trim()) failures.push('OPENROUTER_API_KEY');
    const imageModel = process.env.MOHO_OPENROUTER_IMAGE_MODEL?.trim();
    if (!imageModel) failures.push('MOHO_OPENROUTER_IMAGE_MODEL');
  }
  addCheck(
    'providers',
    failures.length === 0 ? 'pass' : 'fail',
    failures.length === 0 ? 'Provider configuration is present.' : `Missing or invalid: ${[...new Set(failures)].join(', ')}.`
  );
}

function checkDirectorApprovalFile() {
  const approvalPath = path.resolve(
    manifestDirectory,
    manifest.directorApprovalPath ?? 'director-approvals.json'
  );
  if (!nonemptyFile(approvalPath)) {
    addCheck('director_approval_file', 'fail', `Director approval file is missing or empty: ${approvalPath}`);
    return;
  }
  try {
    const parsed = mohoProductionV3DirectorApprovalFileSchema.safeParse(
      JSON.parse(fs.readFileSync(approvalPath, 'utf8'))
    );
    if (!parsed.success) {
      addCheck('director_approval_file', 'fail', 'Director approval file has an invalid structure.');
      return;
    }
    addCheck('director_approval_file', 'pass', `Director approval file is valid: ${approvalPath}`);
  } catch {
    addCheck('director_approval_file', 'fail', 'Director approval file is not valid JSON.');
  }
}

function checkHarmony() {
  const stageBin = '/Applications/Harmony 25 Premium.app/Contents/tba/macosx/bin/Stage';
  const pythonPackages = '/Applications/Harmony 25 Premium.app/Contents/tba/macosx/lib/python-packages';
  if (!nonemptyFile(stageBin)) {
    addCheck('harmony_premium', 'fail', `Harmony Stage executable not found: ${stageBin}`);
    return;
  }
  if (!fs.existsSync(pythonPackages)) {
    addCheck('harmony_premium', 'fail', `Harmony Python packages not found: ${pythonPackages}`);
    return;
  }
  addCheck('harmony_premium', 'pass', `Harmony 25 Premium batch Stage and Python packages verified: ${stageBin}`);
}

function checkCharacterPacks() {
  const root = path.resolve(
    manifestDirectory,
    manifest.characterPackRoot ?? 'characters'
  );
  const directories = fs.existsSync(root)
    ? fs.readdirSync(root, { withFileTypes: true }).filter(entry => entry.isDirectory())
    : [];
  const failures = [];
  if (directories.length !== 20) failures.push(`expected 20 directories, found ${directories.length}`);
  for (const entry of directories) {
    const directory = path.join(root, entry.name);
    const required = [
      'fixture.json',
      'character-pack.json',
      'artwork-pack-v3.json',
      'rig-blueprint-v3.json',
      'expected-native-structure.json'
    ];
    for (const name of required) {
      if (!nonemptyFile(path.join(directory, name))) failures.push(`${entry.name}/${name}`);
    }
    const packPath = path.join(directory, 'character-pack.json');
    if (nonemptyFile(packPath)) {
      const report = validateMohoCharacterAssetPack(packPath);
      if (!report.valid) failures.push(`${entry.name}/character-pack.json: ${report.errors.map(error => error.code).join(', ')}`);
    }
  }
  addCheck(
    'character_packs',
    failures.length === 0 ? 'pass' : 'fail',
    failures.length === 0 ? 'All 20 licensed character fixtures are valid.' : 'Licensed character fixtures are incomplete.',
    failures.slice(0, 50)
  );
}

function checkShotAssets() {
  if (!Array.isArray(manifest.shots)) {
    addCheck('shot_assets', 'fail', 'Cannot inspect shot assets because shots is not an array.');
    return;
  }
  const shots = pilotMode
    ? manifest.pilotShotIds.map(shotId => manifest.shots.find(shot => shot.shotId === shotId))
    : manifest.shots;
  for (const shot of shots) {
    let required;
    try {
      required = requiredMohoV3BenchmarkAssetPaths(manifestPath, manifest, shot);
    } catch (error) {
      missingAssets.push(`${shot.shotId}: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    for (const filePath of required) {
      if (!nonemptyFile(filePath)) missingAssets.push(filePath);
    }
  }
  addCheck(
    'shot_assets',
    missingAssets.length === 0 ? 'pass' : 'fail',
    missingAssets.length === 0 ? 'All required shot assets are non-empty.' : `${missingAssets.length} required shot assets are missing or empty.`
  );
}

const manifestValid = validateManifest();
checkProviders();
try {
  const director = resolveMohoV3BenchmarkDirector({
    benchmarkToken: process.env.MOHO_BENCHMARK_AUTH_TOKEN,
    tokenRegistryJson: process.env.HARMONY_FACTORY_TOKENS
  });
  addCheck('director_token', 'pass', `Authenticated benchmark director: ${director.id}.`);
} catch (error) {
  addCheck('director_token', 'fail', error instanceof Error ? error.message : String(error));
}
checkDirectorApprovalFile();
const ffmpeg = process.env.FFMPEG_PATH?.trim() || 'ffmpeg';
const ffprobe = process.env.FFPROBE_PATH?.trim() || 'ffprobe';
addCheck('ffmpeg', commandWorks(ffmpeg, ['-version']) ? 'pass' : 'fail', `ffmpeg command: ${ffmpeg}`);
addCheck('ffprobe', commandWorks(ffprobe, ['-version']) ? 'pass' : 'fail', `ffprobe command: ${ffprobe}`);
const configuredRhubarb = process.env.RHUBARB_BIN?.trim();
const rhubarb = configuredRhubarb
  ? (nonemptyFile(configuredRhubarb) ? configuredRhubarb : null)
  : [
    path.join(os.homedir(), '.local', 'bin', 'rhubarb'),
    '/opt/homebrew/bin/rhubarb',
    '/usr/local/bin/rhubarb',
    '/usr/bin/rhubarb'
  ].find(candidate => candidate && nonemptyFile(candidate));
addCheck('rhubarb', rhubarb ? 'pass' : 'fail', rhubarb ? `Rhubarb found: ${rhubarb}` : 'Rhubarb Lip Sync was not found.');
checkHarmony();
checkCharacterPacks();
if (manifestValid) checkShotAssets();

const ready = checks.every(check => check.status === 'pass');
process.stdout.write(`${JSON.stringify({
  schemaVersion: '1.0',
  ready,
  mode: pilotMode ? 'pilot' : 'production95',
  manifestPath,
  checks,
  missingAssets
}, null, 2)}\n`);
process.exit(ready ? 0 : 1);
