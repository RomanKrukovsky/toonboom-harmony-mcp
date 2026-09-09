import fs from 'fs';
import path from 'path';
import { describe, expect, it } from '@jest/globals';
import { validateMohoCharacterAssetPack } from '../../src/services/mohoCharacterAssetPackValidator/index.js';
import { HarmonyRigCompiler } from '../../src/services/harmonyProductionV4RigCompiler/index.js';
import type { MohoCharacterAssetPackV1 } from '../../src/schemas/mohoCharacterAssetPackV1.js';

const fixtureRoot = path.resolve('fixtures/harmony95/characters');
const evidenceDir = path.resolve('docs/evidence/harmony-production-v4/real-rig-suite');

describe('Harmony Production v4 20-character rig suite', () => {
  it('builds and structurally verifies at least 19 of 20 rigs with real Harmony 25', async () => {
    const fixtureDirectories = fs.readdirSync(fixtureRoot, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => path.join(fixtureRoot, entry.name))
      .sort();

    expect(fixtureDirectories).toHaveLength(20);
    fs.mkdirSync(evidenceDir, { recursive: true });

    const results: Array<{
      characterId: string;
      passed: boolean;
      totalNodes: number;
      totalLinks: number;
      renderedFramesCount: number;
      mp4Path: string;
      failures: string[];
    }> = [];

    for (const directory of fixtureDirectories) {
      const charPackPath = path.join(directory, 'character-pack.json');
      const failures: string[] = [];
      let totalNodes = 0;
      let totalLinks = 0;
      let renderedFramesCount = 0;
      let mp4Path = '';

      const report = validateMohoCharacterAssetPack(charPackPath);
      if (!report.valid) {
        failures.push(`Character pack validation failed: ${report.errors.map(e => e.code).join(', ')}`);
      }

      const characterPack = JSON.parse(fs.readFileSync(charPackPath, 'utf8')) as MohoCharacterAssetPackV1;
      const caseOutput = path.join(evidenceDir, characterPack.characterId);
      fs.mkdirSync(caseOutput, { recursive: true });

      try {
        const compileResult = HarmonyRigCompiler.compileRig({
          characterPack,
          outputDir: caseOutput
        });
        totalNodes = compileResult.totalNodes;
        totalLinks = compileResult.totalLinks;

        const verifyResult = await HarmonyRigCompiler.verifyRig(compileResult.xstagePath, caseOutput);
        renderedFramesCount = verifyResult.renderResult.renderedFramesCount;
        mp4Path = path.relative(process.cwd(), verifyResult.renderResult.mp4Path);

        if (!verifyResult.passed) {
          failures.push('Verification check failed (pegs, drawings or render output)');
        }
      } catch (error: any) {
        failures.push(error instanceof Error ? error.message : String(error));
      }

      results.push({
        characterId: characterPack.characterId,
        passed: failures.length === 0,
        totalNodes,
        totalLinks,
        renderedFramesCount,
        mp4Path,
        failures
      });
    }

    const reportData = {
      timestamp: new Date().toISOString(),
      total: results.length,
      passed: results.filter(r => r.passed).length,
      successRate: results.filter(r => r.passed).length / results.length,
      results
    };

    fs.writeFileSync(
      path.join(evidenceDir, 'real-rig-suite-report.json'),
      JSON.stringify(reportData, null, 2)
    );

    const passedCount = reportData.passed;
    expect(passedCount).toBeGreaterThanOrEqual(19);
  }, 300_000);
});
