import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { MohoRenderRunner, type MohoRenderRunnerOptions } from '../src/services/mohoRenderRunner/index.js';
import { MohoRenderManager } from '../src/services/mohoRenderManager/index.js';
import { MohoCommandBuilder } from '../src/services/mohoCommandBuilder/index.js';
import { buildRigFromTemplate, HUMANOID_TEMPLATE, QUADRUPED_TEMPLATE } from '../src/services/mohoReferenceRigTemplates/index.js';
import type { MohoCommandPlan } from '../src/schemas/mohoCommandPlan.js';

import { validMohoCharacterBible } from './fixtures/mohoShowBible.valid.js';

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
}

function countAddBoneOps(plan: MohoCommandPlan): number {
  return plan.operations.filter(op => op.type === 'add_bone').length;
}

function buildHumanoidPlan(): MohoCommandPlan {
  const bible = validMohoCharacterBible('humanoid_2leg');
  const builder = new MohoCommandBuilder();
  return builder.buildPlan({
    pir: {
      schemaVersion: '1.0',
      performanceId: 'perf_render_runner_humanoid',
      rigType: 'humanoid_2leg',
      shotManifestRef: 'show/shot_manifest.json',
      mohoShowBibleRef: 'show/moho_show_bible.json',
      boneKeys: [],
      switchKeys: [],
      smartBoneActions: [],
      cameraKeys: [],
      fxKeys: [],
      deterministicFingerprint: 'a'.repeat(64),
      provenance: { compiledAt: '2026-07-27T12:00:00Z', compilerVersion: 'moho-pir-compiler/1.0.0' }
    },
    characterBible: bible,
    documentPath: null
  });
}

function buildQuadrupedPlan(): MohoCommandPlan {
  const bible = validMohoCharacterBible('quadruped');
  return buildRigFromTemplate(QUADRUPED_TEMPLATE, bible);
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('MohoRenderRunner', () => {
  let outputDir: string;
  const cleanupDirs: string[] = [];

  beforeEach(() => {
    outputDir = makeTempDir('moho-render-runner');
    cleanupDirs.push(outputDir);
  });

  afterEach(() => {
    for (const dir of cleanupDirs.splice(0)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
    }
    jest.restoreAllMocks();
  });

  it('returns requires_real_moho with a populated commandLine when Moho Pro is not installed', async () => {
    const mohoPresent = MohoRenderManager.detectMohoExecutable() !== null;
    if (mohoPresent) {
      // Real Moho is on this machine — skip the negative path so we don't accidentally render.
      return;
    }

    const plan = buildHumanoidPlan();
    const result = await new MohoRenderRunner().run({
      commandPlan: plan,
      outputDir,
      format: 'png_sequence',
      startFrame: 1,
      endFrame: 24
    });

    expect(result.status).toBe('requires_real_moho');
    expect(result.detectedMohoPath).toBeNull();
    expect(typeof result.commandLine).toBe('string');
    expect(result.commandLine.length).toBeGreaterThan(0);
    expect(result.outputDir).toBe(outputDir);
    expect(result.exitCode).toBe(1);
    expect(result.errorMessage).toMatch(/Moho executable not detected/i);
  });

  it('returns dry_run without executing when dryRun is true', async () => {
    const plan = buildHumanoidPlan();
    const result = await new MohoRenderRunner().run({
      commandPlan: plan,
      outputDir,
      format: 'png_sequence',
      startFrame: 1,
      endFrame: 12,
      dryRun: true
    });

    expect(result.status).toBe('dry_run');
    expect(result.detectedMohoPath).toBe(MohoRenderManager.detectMohoExecutable());
    expect(result.exitCode).toBe(0);
    expect(result.renderedFiles).toEqual([]);
    expect(result.errorMessage).toMatch(/Dry run/i);
  });

  it('creates the output directory when it does not exist', async () => {
    const nestedDir = path.join(outputDir, 'nested', 'deeper');
    expect(fs.existsSync(nestedDir)).toBe(false);

    const plan = buildHumanoidPlan();
    const result = await new MohoRenderRunner().run({
      commandPlan: plan,
      outputDir: nestedDir,
      format: 'png_sequence',
      startFrame: 1,
      endFrame: 4,
      dryRun: true
    });

    expect(result.status).toBe('dry_run');
    expect(fs.existsSync(nestedDir)).toBe(true);
    expect(fs.statSync(nestedDir).isDirectory()).toBe(true);
  });

  it('saves the Lua script to outputDir/build_rig.lua', async () => {
    const plan = buildHumanoidPlan();
    await new MohoRenderRunner().run({
      commandPlan: plan,
      outputDir,
      format: 'png_sequence',
      startFrame: 1,
      endFrame: 4,
      dryRun: true
    });

    const luaPath = path.join(outputDir, 'build_rig.lua');
    expect(fs.existsSync(luaPath)).toBe(true);
    const luaContent = fs.readFileSync(luaPath, 'utf8');
    expect(luaContent.length).toBeGreaterThan(0);
  });

  it('emits a jobId that matches the UUID format', async () => {
    const plan = buildHumanoidPlan();
    const result = await new MohoRenderRunner().run({
      commandPlan: plan,
      outputDir,
      format: 'png_sequence',
      startFrame: 1,
      endFrame: 4,
      dryRun: true
    });

    expect(result.jobId).toMatch(/^render_/);
    const uuid = result.jobId.replace(/^render_/, '');
    expect(uuid).toMatch(UUID_REGEX);
  });

  it('returns a non-negative durationMs', async () => {
    const plan = buildHumanoidPlan();
    const result = await new MohoRenderRunner().run({
      commandPlan: plan,
      outputDir,
      format: 'png_sequence',
      startFrame: 1,
      endFrame: 4,
      dryRun: true
    });

    expect(typeof result.durationMs).toBe('number');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('accepts a valid MohoCommandPlan from the CommandBuilder', async () => {
    const plan = buildHumanoidPlan();
    expect(plan.operations.length).toBeGreaterThan(0);
    expect(countAddBoneOps(plan)).toBeGreaterThan(0);

    const result = await new MohoRenderRunner().run({
      commandPlan: plan,
      outputDir,
      format: 'png_sequence',
      startFrame: 1,
      endFrame: 8,
      dryRun: true
    });

    expect(result.status).toBe('dry_run');
    expect(result.totalFrames).toBe(8);
  });

  it('accepts the humanoid reference template plan (19 add_bone ops)', async () => {
    const bible = validMohoCharacterBible('humanoid_2leg');
    const plan = buildRigFromTemplate(HUMANOID_TEMPLATE, bible);
    const addBoneCount = countAddBoneOps(plan);
    expect(addBoneCount).toBe(19);

    const result = await new MohoRenderRunner().run({
      commandPlan: plan,
      outputDir,
      format: 'png_sequence',
      startFrame: 1,
      endFrame: 12,
      dryRun: true
    });

    expect(result.status).toBe('dry_run');
    expect(result.totalFrames).toBe(12);
    expect(fs.existsSync(path.join(outputDir, 'build_rig.lua'))).toBe(true);
  });

  it('accepts the quadruped reference template plan', async () => {
    const plan = buildQuadrupedPlan();
    const addBoneCount = countAddBoneOps(plan);
    expect(addBoneCount).toBeGreaterThan(0);

    const result = await new MohoRenderRunner().run({
      commandPlan: plan,
      outputDir,
      format: 'png_sequence',
      startFrame: 1,
      endFrame: 24,
      dryRun: true
    });

    expect(result.status).toBe('dry_run');
    expect(result.totalFrames).toBe(24);
  });

  it('respects startFrame and endFrame parameters', async () => {
    const plan = buildHumanoidPlan();
    const result = await new MohoRenderRunner().run({
      commandPlan: plan,
      outputDir,
      format: 'png_sequence',
      startFrame: 10,
      endFrame: 25,
      dryRun: true
    });

    expect(result.totalFrames).toBe(25 - 10 + 1);

    const commandLine = MohoRenderRunner.buildCommandLine(
      {
        commandPlan: plan,
        outputDir,
        format: 'png_sequence',
        startFrame: 10,
        endFrame: 25
      },
      '/Applications/Moho.app/Contents/MacOS/Moho'
    );
    expect(commandLine).toMatch(/-start 10/);
    expect(commandLine).toMatch(/-end 25/);
  });

  it('respects format parameter (mp4 vs png_sequence) in the command line', () => {
    const plan = buildHumanoidPlan();
    const fakeExe = '/Applications/Moho.app/Contents/MacOS/Moho';

    const mp4Line = MohoRenderRunner.buildCommandLine(
      {
        commandPlan: plan,
        outputDir,
        format: 'mp4',
        startFrame: 1,
        endFrame: 24
      },
      fakeExe
    );
    expect(mp4Line).toMatch(/-f MP4/);
    expect(mp4Line).toMatch(/\.mp4/);

    const pngLine = MohoRenderRunner.buildCommandLine(
      {
        commandPlan: plan,
        outputDir,
        format: 'png_sequence',
        startFrame: 1,
        endFrame: 24
      },
      fakeExe
    );
    expect(pngLine).toMatch(/-f PNG/);
    expect(pngLine).toMatch(/\.png/);
  });

  it('returns status failed with an errorMessage when Moho render execution fails', async () => {
    const plan = buildHumanoidPlan();
    const runner = new MohoRenderRunner({
      detectMohoExecutable: () => '/fake/Moho',
      executeFile: async (_executable, args) => {
        if (args.length === 1) {
          fs.writeFileSync(path.join(outputDir, `${plan.planId}.moho`), 'document bytes');
          return { stdout: '', stderr: '' };
        }
        throw new Error('simulated render failure');
      }
    });
    const result = await runner.run({
      commandPlan: plan,
      outputDir,
      format: 'png_sequence',
      startFrame: 1,
      endFrame: 4
    });

    expect(result.status).toBe('failed');
    expect(result.exitCode).toBe(1);
    expect(result.errorMessage).toMatch(/Moho render failed/i);
    expect(result.errorMessage).toMatch(/simulated render failure/i);
  });
});
