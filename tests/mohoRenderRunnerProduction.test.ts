import { afterEach, describe, expect, it } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { MohoRenderRunner } from '../src/services/mohoRenderRunner/index.js';
import { MohoCommandBuilder } from '../src/services/mohoCommandBuilder/index.js';
import type { MohoCommandPlan } from '../src/schemas/mohoCommandPlan.js';

import { validMohoCharacterBible } from './fixtures/mohoShowBible.valid.js';

function buildPlan(): MohoCommandPlan {
  const bible = validMohoCharacterBible('humanoid_2leg');
  return new MohoCommandBuilder().buildPlan({
    pir: {
      schemaVersion: '1.0',
      performanceId: 'perf_render_runner_production',
      rigType: 'humanoid_2leg',
      shotManifestRef: 'show/shot_manifest.json',
      mohoShowBibleRef: 'show/moho_show_bible.json',
      boneKeys: [],
      switchKeys: [],
      smartBoneActions: [],
      cameraKeys: [],
      fxKeys: [],
      deterministicFingerprint: 'b'.repeat(64),
      provenance: {
        compiledAt: '2026-07-27T12:00:00Z',
        compilerVersion: 'moho-pir-compiler/1.0.0'
      }
    },
    characterBible: bible,
    documentPath: null
  });
}

describe('MohoRenderRunner production pipeline', () => {
  const cleanupDirs: string[] = [];

  afterEach(() => {
    for (const dir of cleanupDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('builds and verifies the .moho document before starting the renderer', async () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-runner-production-'));
    cleanupDirs.push(outputDir);
    const plan = buildPlan();
    const calls: Array<{ executable: string; args: string[] }> = [];

    const runner = new MohoRenderRunner({
      detectMohoExecutable: () => '/Applications/Moho.app/Contents/MacOS/Moho',
      executeFile: async (executable, args) => {
        calls.push({ executable, args });
        if (args.length === 1 && args[0].endsWith('build_rig.lua')) {
          fs.writeFileSync(path.join(outputDir, `${plan.planId}.moho`), 'real document bytes');
          return { stdout: '[SUMMARY] done=1 failed=0', stderr: '' };
        }
        const outputIndex = args.indexOf('-o');
        fs.writeFileSync(args[outputIndex + 1], 'rendered frame bytes');
        return { stdout: '', stderr: '' };
      }
    });

    const result = await runner.run({
      commandPlan: plan,
      outputDir,
      startFrame: 1,
      endFrame: 1
    });

    expect(calls).toHaveLength(2);
    expect(calls[0].args).toEqual([path.join(outputDir, 'build_rig.lua')]);
    expect(calls[1].args[0]).toBe('-r');
    expect(calls[1].args[1]).toBe(path.join(outputDir, `${plan.planId}.moho`));
    expect(result.status).toBe('rendered');
    expect(result.builtDocumentPath).toBe(path.join(outputDir, `${plan.planId}.moho`));
    expect(result.renderedFiles).toHaveLength(1);
  });

  it('does not render when the build process produces no document', async () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-runner-no-document-'));
    cleanupDirs.push(outputDir);
    const calls: string[][] = [];
    const runner = new MohoRenderRunner({
      detectMohoExecutable: () => '/fake/Moho',
      executeFile: async (_executable, args) => {
        calls.push(args);
        return { stdout: '[SUMMARY] done=1 failed=0', stderr: '' };
      }
    });

    const result = await runner.run({ commandPlan: buildPlan(), outputDir, startFrame: 1, endFrame: 1 });

    expect(calls).toHaveLength(1);
    expect(result.status).toBe('failed');
    expect(result.errorMessage).toMatch(/did not create a non-empty \.moho document/i);
    expect(result.renderedFiles).toEqual([]);
  });

  it('does not render when the Lua build reports a failed native operation', async () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-runner-lua-fail-'));
    cleanupDirs.push(outputDir);
    const plan = buildPlan();
    const calls: string[][] = [];
    const runner = new MohoRenderRunner({
      detectMohoExecutable: () => '/fake/Moho',
      executeFile: async (_executable, args) => {
        calls.push(args);
        fs.writeFileSync(path.join(outputDir, `${plan.planId}.moho`), 'invalid partial document');
        return { stdout: '[FAIL] bind_smart_warp mesh missing\n[SUMMARY] done=4 failed=1', stderr: '' };
      }
    });

    const result = await runner.run({ commandPlan: plan, outputDir, startFrame: 1, endFrame: 1 });

    expect(calls).toHaveLength(1);
    expect(result.status).toBe('failed');
    expect(result.errorMessage).toMatch(/Lua build reported failure/i);
    expect(result.errorMessage).toMatch(/bind_smart_warp mesh missing/i);
  });

  it('reports a Moho Pro license requirement without hiding the successful document build', async () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-runner-license-'));
    cleanupDirs.push(outputDir);
    const plan = buildPlan();
    const runner = new MohoRenderRunner({
      detectMohoExecutable: () => '/fake/Moho',
      executeFile: async (_executable, args) => {
        if (args.length === 1) {
          fs.writeFileSync(path.join(outputDir, `${plan.planId}.moho`), 'real document bytes');
          return { stdout: '', stderr: '' };
        }
        const error = new Error('Unable to launch the command-line renderer as it is a Pro level feature only. You must upgrade.');
        throw error;
      }
    });

    const result = await runner.run({ commandPlan: plan, outputDir, startFrame: 1, endFrame: 1 });

    expect(result.status).toBe('requires_moho_pro');
    expect(result.builtDocumentPath).toBe(path.join(outputDir, `${plan.planId}.moho`));
    expect(fs.statSync(result.builtDocumentPath as string).size).toBeGreaterThan(0);
    expect(result.errorMessage).toMatch(/Moho Pro/i);
  });

  it('fails instead of claiming rendered when Moho creates no render output', async () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-runner-empty-render-'));
    cleanupDirs.push(outputDir);
    const plan = buildPlan();
    const runner = new MohoRenderRunner({
      detectMohoExecutable: () => '/fake/Moho',
      executeFile: async (_executable, args) => {
        if (args.length === 1) {
          fs.writeFileSync(path.join(outputDir, `${plan.planId}.moho`), 'real document bytes');
        }
        return { stdout: '', stderr: '' };
      }
    });

    const result = await runner.run({ commandPlan: plan, outputDir, startFrame: 1, endFrame: 1 });

    expect(result.status).toBe('failed');
    expect(result.errorMessage).toMatch(/did not create render output/i);
  });

  it('emits the real character skeleton name and an automatic quit for batch build', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-runner-lua-'));
    cleanupDirs.push(outputDir);
    const plan = buildPlan();

    const { luaContent } = MohoRenderRunner.emitAndSaveLua(plan, outputDir);

    expect(plan.provenance.characterName).toBe(validMohoCharacterBible('humanoid_2leg').name);
    expect(luaContent).toContain(`${plan.provenance.characterName}_Skeleton`);
    expect(luaContent).toContain('os.exit(0)');
  });
});
