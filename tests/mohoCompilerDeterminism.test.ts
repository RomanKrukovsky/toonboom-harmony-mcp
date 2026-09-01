import { describe, it, expect } from '@jest/globals';
import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';

import { type ShotManifest } from '../src/schemas/shotManifest.js';
import { type MohoCharacterBible } from '../src/schemas/mohoCharacterBible.js';

import { MohoPerformancePirCompiler } from '../src/services/mohoPerformancePirCompiler/index.js';
import { MohoCommandBuilder } from '../src/services/mohoCommandBuilder/index.js';

import { validMohoCharacterBible } from './fixtures/mohoShowBible.valid.js';

/**
 * mohoCompilerDeterminism.test.ts — SPRINT 2.7 acceptance tests.
 *
 * Verifies SHA-256 fingerprint stability of the Moho compile + command-build
 * pipeline. Every assertion is byte-for-byte reproducible: any drift in
 * fingerprint output means the pipeline has lost determinism, which would
 * invalidate evidence integrity downstream.
 *
 * Determinism sources:
 *   - MohoPerformancePirCompiler.computeFingerprint uses fast-json-stable-stringify
 *     (object-key sorted) + crypto.sha256.
 *   - MohoCommandBuilder.buildWithFingerprint fingerprints stringify(plan.operations)
 *     which preserves array order; identical inputs produce identical operation
 *     arrays and therefore identical fingerprints.
 *   - All compilerVersion, createdAt, and compiledAt timestamps are anchored
 *     to deterministic values inside the compiler (epoch / fixed literals),
 *     so wall-clock time never leaks into the hash.
 */

const RIG_TYPE = 'humanoid_2leg' as const;

function buildShotManifest(characterId: string): ShotManifest {
  return {
    schemaVersion: '1.0',
    shotId: 'shot_det_v1',
    showBibleRef: 'show/show_bible.json',
    production: 'det_production',
    episode: 'ep_det_01',
    sceneName: 'scene_determinism',
    rigType: RIG_TYPE,
    description: 'Determinism test shot: identical inputs must produce identical fingerprints.',
    staging: {
      positions: [{ characterId, preset: 'center', facing: 0 }],
      shotSize: 'medium_shot',
      cameraMove: 'static',
      backgroundRef: 'bgs/det_bg.svg'
    },
    timing: {
      totalFrames: 48,
      fps: 24,
      minBeatFrames: 2,
      maxBeatFrames: 24,
      anticipationFrames: 4,
      followThroughFrames: 6,
      pauseBeforeBeats: {}
    },
    beats: [
      {
        beatId: 'beat_intro',
        startFrame: 1,
        endFrame: 16,
        characterId,
        intent: 'speak',
        emotion: 'happy',
        audioCue: { audioPath: 'audio/intro.wav', transcript: 'hello there', language: 'en' }
      },
      {
        beatId: 'beat_react',
        startFrame: 17,
        endFrame: 32,
        characterId,
        intent: 'react',
        emotion: 'surprise',
        audioCue: { audioPath: 'audio/react.wav', transcript: 'oh wow', language: 'en' }
      },
      {
        beatId: 'beat_close',
        startFrame: 33,
        endFrame: 48,
        characterId,
        intent: 'close',
        emotion: 'neutral',
        audioCue: { audioPath: 'audio/close.wav', transcript: 'goodbye', language: 'en' }
      }
    ],
    fx: [],
    render: { preview: true, format: 'mp4', quality: 'standard' },
    provenance: {
      director: 'det-director',
      createdAt: '2026-01-01T00:00:00.000Z',
      sourceScriptRef: 'scripts/det_test.json'
    }
  };
}

function fingerprintShape(value: string): void {
  expect(typeof value).toBe('string');
  expect(value).toHaveLength(64);
  expect(value).toMatch(/^[0-9a-f]{64}$/);
}

describe('SPRINT 2.7 — moho compiler SHA-256 determinism', () => {
  const compiler = new MohoPerformancePirCompiler();
  const builder = new MohoCommandBuilder();

  it('1. PIR same-input same-output: compile the same ShotManifest 5x → identical fingerprint and performanceId', () => {
    const characterBible = validMohoCharacterBible();
    const shotManifest = buildShotManifest(characterBible.characterId);

    const fingerprints: string[] = [];
    const performanceIds: string[] = [];

    for (let i = 0; i < 5; i++) {
      const { pir } = compiler.compile({ shotManifest, characterBible });
      fingerprints.push(pir.deterministicFingerprint);
      performanceIds.push(pir.performanceId);
      fingerprintShape(pir.deterministicFingerprint);
      expect(pir.performanceId).toMatch(/^MOHO-[0-9a-f]{16}$/);
    }

    const unique = new Set(fingerprints);
    const uniquePerfIds = new Set(performanceIds);
    expect(unique.size).toBe(1);
    expect(uniquePerfIds.size).toBe(1);
  });

  it('2. Plan same-input same-output: build the same plan 5x → identical plan fingerprint', () => {
    const characterBible = validMohoCharacterBible();
    const shotManifest = buildShotManifest(characterBible.characterId);
    const { pir } = compiler.compile({ shotManifest, characterBible });

    const planFingerprints: string[] = [];

    for (let i = 0; i < 5; i++) {
      const { fingerprint } = builder.buildWithFingerprint({ pir, characterBible });
      planFingerprints.push(fingerprint);
      fingerprintShape(fingerprint);
    }

    expect(new Set(planFingerprints).size).toBe(1);
  });

  it('3. PIR top-level object-key order independent: character bible with reversed top-level keys → same fingerprint', () => {
    const characterBible = validMohoCharacterBible();
    const shotManifest = buildShotManifest(characterBible.characterId);

    const canonical = JSON.parse(JSON.stringify(characterBible));
    const reversedKeys: Record<string, unknown> = {};
    for (const k of [...Object.keys(canonical)].reverse()) {
      reversedKeys[k] = canonical[k];
    }
    const reorderedBible = reversedKeys as MohoCharacterBible;

    const canonicalFp = compiler.compile({ shotManifest, characterBible: canonical }).pir.deterministicFingerprint;
    const reorderedFp = compiler.compile({ shotManifest, characterBible: reorderedBible }).pir.deterministicFingerprint;

    fingerprintShape(canonicalFp);
    fingerprintShape(reorderedFp);
    expect(reorderedFp).toBe(canonicalFp);
  });

  it('4. Switch-key object-key order independent: same switchKey shape with shuffled keys → same fingerprint', () => {
    const characterBible = validMohoCharacterBible();
    const shotManifest = buildShotManifest(characterBible.characterId);
    const { pir: canonical } = compiler.compile({ shotManifest, characterBible });

    expect(canonical.switchKeys.length).toBeGreaterThan(0);

    const { deterministicFingerprint: _dropFp, ...pirWithId } = canonical;
    const skeleton = { ...pirWithId, performanceId: '' };
    const reorderedSwitchKeys = canonical.switchKeys.map(sk => {
      const obj: Record<string, unknown> = {};
      for (const k of [...Object.keys(sk)].reverse()) obj[k] = (sk as any)[k];
      return obj as typeof sk;
    });
    const reorderedSkeleton = { ...skeleton, switchKeys: reorderedSwitchKeys };

    const stableReordered = stringify(reorderedSkeleton) || '';
    const stableCanonical = stringify(skeleton) || '';
    const hashReordered = crypto.createHash('sha256').update(stableReordered).digest('hex');
    const hashCanonical = crypto.createHash('sha256').update(stableCanonical).digest('hex');

    fingerprintShape(hashCanonical);
    fingerprintShape(hashReordered);
    expect(hashReordered).toBe(hashCanonical);
    expect(hashReordered).toBe(canonical.deterministicFingerprint);
  });

  it('5. Plan fingerprint stable for identical inputs: re-building from the same PIR+bible yields identical fingerprint', () => {
    const characterBible = validMohoCharacterBible();
    const shotManifest = buildShotManifest(characterBible.characterId);
    const { pir } = compiler.compile({ shotManifest, characterBible });

    const runs: string[] = [];
    for (let i = 0; i < 5; i++) {
      const { fingerprint } = builder.buildWithFingerprint({ pir, characterBible });
      runs.push(fingerprint);
    }

    expect(new Set(runs).size).toBe(1);
  });

  it('6. Whitespace-independent: character bible parsed from differently-indented JSON → same fingerprint', () => {
    const characterBible = validMohoCharacterBible();

    const jsonTwo = JSON.stringify(characterBible, null, 2);
    const jsonFour = JSON.stringify(characterBible, null, 4);
    const jsonCompact = JSON.stringify(characterBible);

    const parsedTwo = JSON.parse(jsonTwo) as MohoCharacterBible;
    const parsedFour = JSON.parse(jsonFour) as MohoCharacterBible;
    const parsedCompact = JSON.parse(jsonCompact) as MohoCharacterBible;

    const shotManifest = buildShotManifest(characterBible.characterId);

    const fpTwo = compiler.compile({ shotManifest, characterBible: parsedTwo }).pir.deterministicFingerprint;
    const fpFour = compiler.compile({ shotManifest, characterBible: parsedFour }).pir.deterministicFingerprint;
    const fpCompact = compiler.compile({ shotManifest, characterBible: parsedCompact }).pir.deterministicFingerprint;

    fingerprintShape(fpTwo);
    expect(fpTwo).toBe(fpFour);
    expect(fpFour).toBe(fpCompact);
    expect(fpTwo).toBe(fpCompact);
  });

  it('7. Cross-call determinism: compile → build plan → compile again → fingerprints match', () => {
    const characterBible = validMohoCharacterBible();
    const shotManifest = buildShotManifest(characterBible.characterId);

    const firstRun = compiler.compile({ shotManifest, characterBible });
    const firstPirFp = firstRun.pir.deterministicFingerprint;
    const firstPlan = builder.buildWithFingerprint({
      pir: firstRun.pir,
      characterBible
    });

    const secondRun = compiler.compile({ shotManifest, characterBible });
    const secondPirFp = secondRun.pir.deterministicFingerprint;
    const secondPlan = builder.buildWithFingerprint({
      pir: secondRun.pir,
      characterBible
    });

    fingerprintShape(firstPirFp);
    fingerprintShape(secondPirFp);

    expect(secondPirFp).toBe(firstPirFp);
    expect(secondRun.pir.performanceId).toBe(firstRun.pir.performanceId);
    expect(secondPlan.fingerprint).toBe(firstPlan.fingerprint);

    const thirdPirFp = compiler.compile({ shotManifest, characterBible }).pir.deterministicFingerprint;
    expect(thirdPirFp).toBe(firstPirFp);
  });
});