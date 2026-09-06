import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, describe, expect, it } from '@jest/globals';
import type { ArtworkPackV3, RigBlueprintV3 } from '../../src/schemas/mohoProductionV3.js';
import { validateMohoCharacterAssetPack } from '../../src/services/mohoCharacterAssetPackValidator/index.js';
import { compileMohoProductionPlanV3 } from '../../src/services/mohoProductionV3Compiler/index.js';
import { MohoNativeProductionBackend } from '../../src/services/mohoProductionV3NativeBackend/index.js';
import {
  MohoProductionQualityAuditor,
  type MohoNativeRigStructure
} from '../../src/services/mohoProductionQualityAuditor/index.js';

const fixtureRoot = path.resolve('fixtures/moho95/characters');
const installedMoho = process.env.MOHO_EXECUTABLE ?? '/Applications/Moho.app/Contents/MacOS/Moho';
const runRealSuite = process.env.RUN_REAL_MOHO_TESTS === '1' && fs.existsSync(installedMoho);
const describeWithRealMoho = runRealSuite ? describe : describe.skip;
const configuredEvidenceRoot = process.env.MOHO_REAL_RIG_EVIDENCE_DIR;
const evidenceRoot = configuredEvidenceRoot
  ? path.resolve(configuredEvidenceRoot)
  : path.join(os.tmpdir(), `moho-v3-real-rigs-${process.pid}-${Date.now()}`);

interface FixtureMetadata {
  characterId: string;
  manualMohoEdits: number;
  startFrame: number;
  endFrame: number;
  fps: number;
  width: number;
  height: number;
}

interface RigCaseResult {
  characterId: string;
  passed: boolean;
  failures: string[];
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function resolveArtworkPaths(artwork: ArtworkPackV3, directory: string): ArtworkPackV3 {
  return {
    ...artwork,
    parts: artwork.parts.map(part => ({
      ...part,
      sourcePath: path.resolve(directory, part.sourcePath),
      maskPath: part.maskPath === null ? null : path.resolve(directory, part.maskPath)
    })),
    drawingAssets: artwork.drawingAssets.map(drawing => ({
      ...drawing,
      sourcePath: path.resolve(directory, drawing.sourcePath)
    }))
  };
}

describeWithRealMoho('Moho Production v3 licensed 20-character rig suite', () => {
  afterAll(() => {
    if (!configuredEvidenceRoot) fs.rmSync(evidenceRoot, { recursive: true, force: true });
  });

  it('builds and structurally verifies at least 19 of 20 rigs with zero manual Moho edits', async () => {
    const fixtureDirectories = fs.readdirSync(fixtureRoot, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => path.join(fixtureRoot, entry.name))
      .sort();
    expect(fixtureDirectories).toHaveLength(20);
    fs.mkdirSync(evidenceRoot, { recursive: true });
    const results: RigCaseResult[] = [];

    for (const directory of fixtureDirectories) {
      const metadata = readJson<FixtureMetadata>(path.join(directory, 'fixture.json'));
      const failures: string[] = [];
      try {
        expect(metadata.manualMohoEdits).toBe(0);
        const packReport = validateMohoCharacterAssetPack(path.join(directory, 'character-pack.json'));
        expect(packReport.valid).toBe(true);
        expect(packReport.characterId).toBe(metadata.characterId);

        const artwork = resolveArtworkPaths(
          readJson<ArtworkPackV3>(path.join(directory, 'artwork-pack-v3.json')),
          directory
        );
        const blueprint = readJson<RigBlueprintV3>(path.join(directory, 'rig-blueprint-v3.json'));
        const expectedStructure = readJson<MohoNativeRigStructure>(
          path.join(directory, 'expected-native-structure.json')
        );
        const caseOutput = path.join(evidenceRoot, metadata.characterId);
        fs.mkdirSync(caseOutput, { recursive: true });
        const plan = compileMohoProductionPlanV3({
          artwork,
          blueprint,
          characterName: metadata.characterId,
          documentPath: path.join(caseOutput, `${metadata.characterId}.moho`)
        });
        const native = await new MohoNativeProductionBackend().buildAndRoundTrip({
          plan,
          outputDir: caseOutput,
          startFrame: metadata.startFrame,
          endFrame: metadata.endFrame,
          fps: metadata.fps,
          width: metadata.width,
          height: metadata.height,
          timeoutMs: 600_000
        });
        const structural = MohoProductionQualityAuditor.compareNativeStructure(
          expectedStructure,
          native.acceptance
        );
        expect(native.acceptance.opened).toBe(true);
        expect(native.acceptance.saved).toBe(true);
        expect(native.acceptance.reopened).toBe(true);
        expect(native.acceptance.render_status).toBe('rendered');
        expect(native.acceptance.rendered_frames).toHaveLength(6);
        expect(structural.passed).toBe(true);
        fs.writeFileSync(
          path.join(caseOutput, 'structural-comparison.json'),
          `${JSON.stringify(structural, null, 2)}\n`
        );
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
      }
      results.push({ characterId: metadata.characterId, passed: failures.length === 0, failures });
    }

    fs.writeFileSync(
      path.join(evidenceRoot, 'real-rig-suite-report.json'),
      `${JSON.stringify({ total: results.length, passed: results.filter(result => result.passed).length, results }, null, 2)}\n`
    );
    const passed = results.filter(result => result.passed).length;
    const failedDetails = results
      .filter(result => !result.passed)
      .map(result => `${result.characterId}: ${result.failures.join('; ')}`)
      .join('\n');
    if (passed < 19) {
      throw new Error(`Only ${passed}/20 licensed rigs passed.\n${failedDetails}`);
    }
    expect(passed).toBeGreaterThanOrEqual(19);
  }, 7_200_000);
});
