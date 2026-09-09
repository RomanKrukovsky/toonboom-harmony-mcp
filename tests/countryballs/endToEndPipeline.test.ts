import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { CountryballsStudioOrchestrator } from '../../src/countryballs/orchestrator/studioOrchestrator.js';

describe('Countryballs Full Studio End-to-End Pipeline', () => {
  it('produces complete, editable episode package from a single user prompt', () => {
    const tempRoot = path.join(os.tmpdir(), `cb_studio_test_${Date.now()}`);
    const orchestrator = new CountryballsStudioOrchestrator();

    const result = orchestrator.produceEpisode({
      topic: 'Poland joins the lunar space race',
      projectName: 'ep_test_moon_race',
      outputRoot: tempRoot,
      backend: 'animate',
      mainCharacters: ['Poland', 'Russia', 'USA', 'Germany'],
      tone: 'absurd_comedy',
      autoFixEnabled: true
    });

    expect(result.success).toBe(true);
    expect(result.metrics.scenesCount).toBe(3);
    expect(result.metrics.shotsCount).toBe(6);
    expect(result.metrics.totalDurationFrames).toBeGreaterThan(200);

    // Verify all 8 production artifacts were written to disk
    expect(fs.existsSync(result.artifacts.screenplayPath)).toBe(true);
    expect(fs.existsSync(result.artifacts.storyboardPath)).toBe(true);
    expect(fs.existsSync(result.artifacts.episodeIrPath)).toBe(true);
    expect(fs.existsSync(result.artifacts.audioManifestPath)).toBe(true);
    expect(fs.existsSync(result.artifacts.dccScriptPath)).toBe(true);
    expect(fs.existsSync(result.artifacts.qaReportPath)).toBe(true);
    expect(fs.existsSync(result.artifacts.summaryPath)).toBe(true);

    // Verify content of screenplay
    const screenplayContent = fs.readFileSync(result.artifacts.screenplayPath, 'utf8');
    expect(screenplayContent).toContain('The Great Poland joins the lunar space race Debacle');
    expect(screenplayContent).toContain('Act 1');
    expect(screenplayContent).toContain('Act 2');
    expect(screenplayContent).toContain('Act 3');

    // Verify content of Episode IR
    const irContent = JSON.parse(fs.readFileSync(result.artifacts.episodeIrPath, 'utf8'));
    expect(irContent.scenes.length).toBe(3);
    expect(irContent.characters).toContain('Poland');

    // Verify generated JSFL script for Adobe Animate
    const jsflContent = fs.readFileSync(result.artifacts.dccScriptPath, 'utf8');
    expect(jsflContent).toContain('fl.createDocument');
    expect(jsflContent).toContain('Char_Poland_Body');
    expect(jsflContent).toContain('Actor_Poland');

    // Clean up
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });
});
