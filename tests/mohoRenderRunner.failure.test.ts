// Companion test file dedicated to the MohoRenderRunner failure-handling path.
//
// `MohoRenderRunner` imports `child_process.execFile` and wraps it with
// `util.promisify` at module-load time. That binding is captured before any
// test code runs, so the only reliable way to force the runner into its catch
// branch is a hoisted `jest.mock('child_process', ...)` that runs *before* the
// runner module is imported. Jest hoists `jest.mock` calls to the top of the
// file, so this file is intentionally kept separate from
// `tests/mohoRenderRunner.test.ts` (which imports the runner at top level).

jest.mock('child_process', () => {
  const actual = jest.requireActual('child_process') as Record<string, unknown>;
  return {
    ...actual,
    execFile: jest.fn((_cmd: unknown, _args: unknown, _opts: unknown, _cb?: unknown) => {
      // Match child_process.execFile's callback-style signature so the runner's
      // promisify wrapper receives a callback and invokes the rejection path
      // exactly the way a real failed exec would.
      const cb = _cb as ((err: Error | null) => void) | undefined;
      if (typeof cb === 'function') {
        cb(new Error('simulated moho render failure'));
        return undefined;
      }
      return Promise.reject(new Error('simulated moho render failure'));
    })
  };
});

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { MohoRenderRunner } from '../src/services/mohoRenderRunner/index.js';
import { MohoRenderManager } from '../src/services/mohoRenderManager/index.js';
import { MohoCommandBuilder } from '../src/services/mohoCommandBuilder/index.js';
import type { MohoCommandPlan } from '../src/schemas/mohoCommandPlan.js';

import { validMohoCharacterBible } from './fixtures/mohoShowBible.valid.js';

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
}

function buildHumanoidPlan(): MohoCommandPlan {
  const bible = validMohoCharacterBible('humanoid_2leg');
  const builder = new MohoCommandBuilder();
  return builder.buildPlan({
    pir: {
      schemaVersion: '1.0',
      performanceId: 'perf_render_runner_failure',
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

describe('MohoRenderRunner failure handling', () => {
  let outputDir: string;

  beforeEach(() => {
    outputDir = makeTempDir('moho-render-runner-failure');
  });

  afterEach(() => {
    try {
      fs.rmSync(outputDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
    jest.restoreAllMocks();
  });

  it('returns status failed with an errorMessage when Moho build execution fails', async () => {
    const fakeExe = '/tmp/fake-moho-for-render-runner-test';
    const detectSpy = jest
      .spyOn(MohoRenderManager, 'detectMohoExecutable')
      .mockReturnValue(fakeExe);

    const plan = buildHumanoidPlan();
    const result = await new MohoRenderRunner().run({
      commandPlan: plan,
      outputDir,
      format: 'png_sequence',
      startFrame: 1,
      endFrame: 4,
      timeoutMs: 5_000
    });

    expect(detectSpy).toHaveBeenCalled();
    expect(result.status).toBe('failed');
    expect(result.exitCode).toBe(1);
    expect(result.errorMessage).toMatch(/Moho document build failed/i);
    expect(result.errorMessage).toMatch(/simulated moho render failure/);
    expect(result.detectedMohoPath).toBe(fakeExe);
  });
});
