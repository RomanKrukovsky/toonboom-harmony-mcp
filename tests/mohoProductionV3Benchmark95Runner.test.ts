import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

describe('Moho Production v3 95 percent benchmark runner', () => {
  const manifestPath = path.join(process.cwd(), 'fixtures', 'moho95', 'benchmark-manifest.json');

  beforeAll(() => {
    const build = spawnSync('npm', ['run', 'build'], { cwd: process.cwd(), encoding: 'utf8' });
    expect(build.status).toBe(0);
  });

  it('contains the balanced 40-shot production matrix', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const counts = (field: string) => manifest.shots.reduce(
      (result: Record<string, number>, shot: Record<string, unknown>) => {
        const value = String(shot[field]);
        result[value] = (result[value] ?? 0) + 1;
        return result;
      },
      {}
    );

    expect(manifest.shots).toHaveLength(40);
    expect(new Set(manifest.shots.map((shot: { shotId: string }) => shot.shotId)).size).toBe(40);
    expect(counts('category')).toEqual({
      dialogue: 20,
      silent_acting: 8,
      locomotion_action: 6,
      interaction: 4,
      prop_camera: 2
    });
    expect(counts('artworkMode')).toEqual({
      layered_manifest: 14,
      flat_characters: 13,
      flat_scene: 13
    });
  });

  it('validates the manifest without starting production jobs', () => {
    const result = spawnSync(process.execPath, [
      path.join(process.cwd(), 'scripts', 'run_moho_v3_95_benchmark.mjs'),
      manifestPath,
      '--validate-only'
    ], { encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ valid: true, totalShots: 40 });
  });

  it('selects a separate balanced five-shot pilot without starting jobs', () => {
    const result = spawnSync(process.execPath, [
      path.join(process.cwd(), 'scripts', 'run_moho_v3_95_benchmark.mjs'),
      manifestPath,
      '--pilot',
      '--validate-only'
    ], { encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      valid: true,
      totalShots: 40,
      selectedShots: 5,
      mode: 'pilot',
      shotIds: ['p95-01', 'p95-23', 'p95-30', 'p95-36', 'p95-39']
    });
  });

  it('preflight reports every missing external prerequisite before starting jobs', () => {
    const result = spawnSync(process.execPath, [
      path.join(process.cwd(), 'scripts', 'preflight_moho_v3_95_benchmark.mjs'),
      manifestPath
    ], {
      encoding: 'utf8',
      env: {
        ...process.env,
        MOHO_EXECUTABLE: path.join(process.cwd(), 'missing-moho'),
        RHUBARB_BIN: path.join(process.cwd(), 'missing-rhubarb'),
        MOHO_PLANNER_PROVIDER: 'openrouter',
        MOHO_ARTWORK_PROVIDER: 'openai',
        MOHO_MAX_IMAGE_CALLS_PER_SHOT: '24',
        OPENROUTER_API_KEY: '',
        OPENAI_API_KEY: '',
        MOHO_BENCHMARK_AUTH_TOKEN: ''
      }
    });

    expect(result.stdout).not.toBe('');
    if (!result.stdout) return;
    const report = JSON.parse(result.stdout);
    expect(result.status).toBe(1);
    expect(report.ready).toBe(false);
    expect(report.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'moho_pro', status: 'fail' }),
      expect.objectContaining({ id: 'rhubarb', status: 'fail' }),
      expect.objectContaining({ id: 'providers', status: 'fail' }),
      expect.objectContaining({ id: 'director_token', status: 'fail' }),
      expect.objectContaining({ id: 'character_packs', status: 'fail' }),
      expect.objectContaining({ id: 'shot_assets', status: 'fail' })
    ]));
    expect(report.missingAssets).toEqual(expect.arrayContaining([
      expect.stringMatching(/p95-01\/layered-manifest-v3\.json$/),
      expect.stringMatching(/p95-02\/character-02\.png$/),
      expect.stringMatching(/p95-01\/dialogue\.wav$/)
    ]));
  });

  it('pilot preflight limits shot-asset checks to the selected five shots', () => {
    const result = spawnSync(process.execPath, [
      path.join(process.cwd(), 'scripts', 'preflight_moho_v3_95_benchmark.mjs'),
      manifestPath,
      '--pilot'
    ], {
      encoding: 'utf8',
      env: {
        ...process.env,
        MOHO_EXECUTABLE: path.join(process.cwd(), 'missing-moho'),
        RHUBARB_BIN: path.join(process.cwd(), 'missing-rhubarb'),
        MOHO_PLANNER_PROVIDER: 'openrouter',
        MOHO_ARTWORK_PROVIDER: 'openai',
        MOHO_MAX_IMAGE_CALLS_PER_SHOT: '24',
        OPENROUTER_API_KEY: '',
        OPENAI_API_KEY: '',
        MOHO_BENCHMARK_AUTH_TOKEN: ''
      }
    });

    expect(result.stdout).not.toBe('');
    if (!result.stdout) return;
    const report = JSON.parse(result.stdout);
    expect(report.mode).toBe('pilot');
    expect(report.missingAssets).toHaveLength(8);
    expect(report.missingAssets.some((asset: string) => asset.includes('p95-02'))).toBe(false);
  });

  it('preflight loads provider and director settings from the configured dotenv file', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-v3-preflight-env-'));
    const envPath = path.join(directory, '.env');
    fs.writeFileSync(envPath, [
      'MOHO_PLANNER_PROVIDER=openrouter',
      'MOHO_ARTWORK_PROVIDER=openai',
      'MOHO_MAX_IMAGE_CALLS_PER_SHOT=24',
      'OPENROUTER_API_KEY=test-openrouter',
      'OPENAI_API_KEY=test-openai',
      'MOHO_BENCHMARK_AUTH_TOKEN=test-director',
      'HARMONY_FACTORY_TOKENS={"test-director":{"id":"director-1","role":"director"}}'
    ].join('\n'));
    const environment = { ...process.env };
    for (const key of [
      'MOHO_PLANNER_PROVIDER',
      'MOHO_ARTWORK_PROVIDER',
      'MOHO_MAX_IMAGE_CALLS_PER_SHOT',
      'OPENROUTER_API_KEY',
      'OPENAI_API_KEY',
      'MOHO_BENCHMARK_AUTH_TOKEN',
      'HARMONY_FACTORY_TOKENS'
    ]) delete environment[key];
    const result = spawnSync(process.execPath, [
      path.join(process.cwd(), 'scripts', 'preflight_moho_v3_95_benchmark.mjs'),
      manifestPath
    ], {
      encoding: 'utf8',
      env: {
        ...environment,
        DOTENV_CONFIG_PATH: envPath,
        MOHO_EXECUTABLE: path.join(process.cwd(), 'missing-moho'),
        RHUBARB_BIN: path.join(process.cwd(), 'missing-rhubarb')
      }
    });
    fs.rmSync(directory, { recursive: true, force: true });

    expect(result.stdout).not.toBe('');
    if (!result.stdout) return;
    const report = JSON.parse(result.stdout);
    expect(report.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'providers', status: 'pass' }),
      expect.objectContaining({ id: 'director_token', status: 'pass' })
    ]));
  });

  it('preflight rejects a malformed director approval file before starting jobs', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-v3-preflight-approvals-'));
    const copiedManifestPath = path.join(directory, 'benchmark-manifest.json');
    const malformedApprovalPath = path.join(directory, 'director-approvals.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.assetRoot = path.join(process.cwd(), 'fixtures', 'moho95', 'assets');
    manifest.characterPackRoot = path.join(process.cwd(), 'fixtures', 'moho95', 'characters');
    manifest.directorApprovalPath = 'director-approvals.json';
    fs.writeFileSync(copiedManifestPath, JSON.stringify(manifest));
    fs.writeFileSync(malformedApprovalPath, JSON.stringify({ schemaVersion: '1.0', approvals: [{ bad: true }] }));

    const result = spawnSync(process.execPath, [
      path.join(process.cwd(), 'scripts', 'preflight_moho_v3_95_benchmark.mjs'),
      copiedManifestPath
    ], {
      encoding: 'utf8',
      env: {
        ...process.env,
        MOHO_EXECUTABLE: path.join(process.cwd(), 'missing-moho'),
        RHUBARB_BIN: path.join(process.cwd(), 'missing-rhubarb'),
        MOHO_PLANNER_PROVIDER: 'openrouter',
        MOHO_ARTWORK_PROVIDER: 'openai',
        MOHO_MAX_IMAGE_CALLS_PER_SHOT: '24',
        OPENROUTER_API_KEY: 'test-openrouter',
        OPENAI_API_KEY: 'test-openai',
        MOHO_BENCHMARK_AUTH_TOKEN: 'test-director',
        HARMONY_FACTORY_TOKENS: JSON.stringify({
          'test-director': { id: 'director-1', role: 'director' }
        })
      }
    });
    fs.rmSync(directory, { recursive: true, force: true });

    expect(result.stdout).not.toBe('');
    if (!result.stdout) return;
    const report = JSON.parse(result.stdout);
    expect(result.status).toBe(1);
    expect(report.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'director_approval_file', status: 'fail' })
    ]));
  });
});
