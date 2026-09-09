import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, describe, expect, it } from '@jest/globals';
import { HarmonyNativeRunner } from '../../src/adapters/harmonyNativeRunner.js';
import { generateCanonicalXStageXml } from '../../src/adapters/harmonyXStageTemplate.js';

const stageBin = HarmonyNativeRunner.detectStageExecutable();
const describeWithRealHarmony = stageBin && fs.existsSync(stageBin)
  ? describe
  : describe.skip;

describeWithRealHarmony('Harmony 25 Premium real project round-trip and render', () => {
  const scratchRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'harmony-native-roundtrip-'));

  afterAll(() => {
    fs.rmSync(scratchRoot, { recursive: true, force: true });
  });

  it('proves 3 consecutive real Harmony 25 render and round-trip passes without error', async () => {
    for (let pass = 1; pass <= 3; pass++) {
      const passDir = path.join(scratchRoot, `pass_${pass}`);
      const sceneDir = path.join(passDir, 'scene');
      fs.mkdirSync(sceneDir, { recursive: true });

      const xstagePath = path.join(sceneDir, 'scene.xstage');
      const xml = generateCanonicalXStageXml({
        frameCount: 24,
        fps: 24,
        width: 1920,
        height: 1080
      });
      fs.writeFileSync(xstagePath, xml, 'utf8');

      const result = await HarmonyNativeRunner.renderSceneAndEncode({
        scenePath: xstagePath,
        outputDir: path.join(passDir, 'delivery'),
        startFrame: 1,
        endFrame: 24,
        fps: 24,
        width: 1920,
        height: 1080,
        timeoutMs: 120_000
      });

      expect(result.success).toBe(true);
      expect(result.renderedFramesCount).toBe(24);
      expect(result.reopenedVerified).toBe(true);
      expect(fs.existsSync(result.mp4Path)).toBe(true);
      expect(fs.statSync(result.mp4Path).size).toBeGreaterThan(1000); // real binary MP4
      expect(result.ffprobe.codec).toBe('h264');
      expect(result.ffprobe.width).toBe(1920);
      expect(result.ffprobe.height).toBe(1080);
      expect(result.ffprobe.fps).toBe(24);
      expect(result.ffprobe.durationSec).toBeCloseTo(1.0, 1);
    }
  }, 360_000);
});
