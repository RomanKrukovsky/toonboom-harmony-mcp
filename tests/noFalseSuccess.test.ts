/**
 * Regression guards against false-success paths.
 *
 * Four places used to report success for work that never happened. Each was
 * indistinguishable from a real result at the call site, so these tests lock the
 * fixed behaviour in.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

import { vectorizeImageToSVG } from '../src/adapters/backends/imageBackend.js';
import { OpenRouterClient } from '../src/services/openRouterClient/index.js';
import { ActingPlanner } from '../src/adapters/actingPlanner/index.js';

describe('no fabricated vectorization', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vec-'));

  it('fails loudly instead of inventing SVG geometry when the service is down', async () => {
    // The old fallback hashed the FILE NAME's char codes into an ellipse and
    // wrote it out labelled "Vectorized contour dynamically derived from ...",
    // never reading a pixel.
    const image = path.join(tmpDir, 'character.png');
    fs.writeFileSync(image, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    const target = path.join(tmpDir, 'character.svg');

    // Point at a port with nothing listening.
    const previous = process.env.RECONSTRUCTION_PORT;
    process.env.RECONSTRUCTION_PORT = '59999';
    try {
      await expect(vectorizeImageToSVG(image, target)).rejects.toThrow(
        /SERVICE_UNAVAILABLE|SERVICE_ERROR/
      );
      // Critically: no bogus artefact left behind.
      expect(fs.existsSync(target)).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.RECONSTRUCTION_PORT;
      else process.env.RECONSTRUCTION_PORT = previous;
    }
  });

  it('does not derive geometry from the file name', async () => {
    // Two files with different names but identical bytes must never produce
    // different "contours" — that was the signature of the hash-based fake.
    const a = path.join(tmpDir, 'aaa.png');
    const b = path.join(tmpDir, 'zzzzzzzz.png');
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    fs.writeFileSync(a, bytes);
    fs.writeFileSync(b, bytes);

    const previous = process.env.RECONSTRUCTION_PORT;
    process.env.RECONSTRUCTION_PORT = '59999';
    try {
      await expect(vectorizeImageToSVG(a, path.join(tmpDir, 'a.svg'))).rejects.toThrow();
      await expect(vectorizeImageToSVG(b, path.join(tmpDir, 'b.svg'))).rejects.toThrow();
    } finally {
      if (previous === undefined) delete process.env.RECONSTRUCTION_PORT;
      else process.env.RECONSTRUCTION_PORT = previous;
    }
  });
});

describe('openRouter degradation is machine-readable', () => {
  it('flags a missing API key instead of only hinting in prose', async () => {
    const client = new OpenRouterClient('', 'test/model');
    const response = await client.complete({ prompt: 'write a scene' });

    // The structured flags are the contract; the marker string is legacy.
    expect(response.llmCallSucceeded).toBe(false);
    expect(response.degradedReason).toBe('missing_api_key');
    expect(response.content).toContain('[OFFLINE FALLBACK MODE]');
  });

  it('does not claim the prompt was processed', async () => {
    const client = new OpenRouterClient('', 'test/model');
    const response = await client.complete({ prompt: 'write a scene' });
    // Old copy said "Processed deterministically", implying work was done.
    expect(response.content).not.toMatch(/processed deterministically/i);
  });

  it('reports zero token usage when no call was made', async () => {
    const client = new OpenRouterClient('', 'test/model');
    const response = await client.complete({ prompt: 'x' });
    expect(response.usage?.totalTokens).toBe(0);
  });
});

describe('acting plans are reproducible', () => {
  it('produces identical blink plans for identical input', () => {
    // Raw Math.random() made two runs on the same scene disagree, so a saved
    // plan could never be reproduced or diffed.
    const scene = { sceneId: 'SC_014', durationFrames: 240 };
    const planner = new ActingPlanner();

    const first = planner.generateBlinkPlan(scene);
    const second = planner.generateBlinkPlan(scene);

    expect(first.length).toBeGreaterThan(0);
    expect(second).toEqual(first);
  });

  it('varies cadence between different scenes', () => {
    const planner = new ActingPlanner();
    const a = planner.generateBlinkPlan({ sceneId: 'SC_001', durationFrames: 240 });
    const b = planner.generateBlinkPlan({ sceneId: 'SC_002', durationFrames: 240 });
    // Deterministic must not mean constant.
    expect(a.map((x: any) => x.frame)).not.toEqual(b.map((x: any) => x.frame));
  });

  it('keeps blinks inside the shot duration', () => {
    const planner = new ActingPlanner();
    const plan = planner.generateBlinkPlan({ sceneId: 'SC_003', durationFrames: 120 });
    for (const blink of plan) {
      expect(blink.frame).toBeGreaterThanOrEqual(1);
      expect(blink.frame).toBeLessThan(120);
    }
  });
});

describe('dead code stays deleted', () => {
  it('has no mlOrchestrator module', () => {
    // 11 lines, zero methods, never imported anywhere.
    expect(fs.existsSync(path.resolve('src/services/mlOrchestrator'))).toBe(false);
  });
});
