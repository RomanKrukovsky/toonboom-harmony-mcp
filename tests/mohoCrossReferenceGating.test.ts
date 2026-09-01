import { describe, it, expect } from '@jest/globals';
import {
  crossReferenceShotManifest,
  shotManifestSchema,
  type ShotManifest,
  type ShowBibleCrossRefs,
  type CrossReferenceViolation
} from '../src/schemas/shotManifest.js';

describe('MohO cross-reference rigType gating (SPRINT 1.6)', () => {
  function validShotManifest(rigType?: ShotManifest['rigType']): ShotManifest {
    const base: ShotManifest = {
      schemaVersion: '1.0',
      shotId: 'shot_moho_001',
      showBibleRef: 'show/show_bible.json',
      production: 'polygon_show',
      episode: 'E01',
      sceneName: 'S01',
      description: 'MohO rig cross-reference gating test shot.',
      staging: {
        positions: [{ characterId: 'char_main_v1', preset: 'center' }],
        shotSize: 'close_up',
        cameraMove: 'static',
        backgroundRef: 'bg/room_v1.png'
      },
      timing: {
        totalFrames: 48,
        fps: 24,
        minBeatFrames: 2,
        maxBeatFrames: 96,
        anticipationFrames: 4,
        followThroughFrames: 6,
        pauseBeforeBeats: {}
      },
      beats: [
        {
          beatId: 'b1',
          startFrame: 1,
          endFrame: 24,
          characterId: 'char_main_v1',
          intent: 'look_up',
          emotion: 'neutral'
        }
      ],
      fx: [],
      render: { preview: true, format: 'mp4', quality: 'standard' },
      provenance: {
        director: 'llm_director_v1',
        createdAt: '2026-07-27T12:00:00Z',
        sourceScriptRef: 'scripts/E01/S01.txt'
      }
    };
    return rigType === undefined ? base : { ...base, rigType };
  }

  it('accepts a manifest with rigType set to a value in allowedRigTypes', () => {
    const manifest = validShotManifest('humanoid_2leg');
    expect(shotManifestSchema.safeParse(manifest).success).toBe(true);

    const refs: ShowBibleCrossRefs = {
      allowedRigTypes: ['humanoid_2leg', 'quadruped']
    };
    const violations = crossReferenceShotManifest(manifest, refs);
    expect(violations.some(v => v.kind === 'unknown_rig_type')).toBe(false);
  });

  it('rejects a manifest whose rigType is not in allowedRigTypes', () => {
    const manifest = validShotManifest('mechanical');
    expect(shotManifestSchema.safeParse(manifest).success).toBe(true);

    const refs: ShowBibleCrossRefs = {
      allowedRigTypes: ['humanoid_2leg', 'quadruped']
    };
    const violations = crossReferenceShotManifest(manifest, refs);
    const rigViolations = violations.filter(v => v.kind === 'unknown_rig_type');
    expect(rigViolations).toHaveLength(1);
    expect(rigViolations[0]).toEqual({ kind: 'unknown_rig_type', ref: 'mechanical' });
  });

  it('does not enforce rigType gating when refs.allowedRigTypes is undefined', () => {
    const manifest = validShotManifest('mechanical');
    const refs: ShowBibleCrossRefs = {
      cameraRules: { allowedShotSizes: ['close_up'], allowedCameraMoves: ['static'] },
      motionGrammar: { allowedEmotions: ['neutral'] },
      characterIds: ['char_main_v1']
    };
    const violations = crossReferenceShotManifest(manifest, refs);
    expect(violations.some(v => v.kind === 'unknown_rig_type')).toBe(false);
  });

  it('does not produce a rigType violation when manifest has no rigType but allowedRigTypes is set', () => {
    const manifest = validShotManifest(undefined);
    expect(manifest.rigType).toBeUndefined();

    const refs: ShowBibleCrossRefs = {
      allowedRigTypes: ['humanoid_2leg', 'quadruped']
    };
    const violations = crossReferenceShotManifest(manifest, refs);
    expect(violations.some(v => v.kind === 'unknown_rig_type')).toBe(false);
  });

  it('preserves backward compatibility with the harmony manifest path (no rigType, no allowedRigTypes)', () => {
    const manifest = validShotManifest(undefined);
    const refs: ShowBibleCrossRefs = {
      cameraRules: { allowedShotSizes: ['close_up'], allowedCameraMoves: ['static'] },
      motionGrammar: { allowedEmotions: ['neutral'], allowedGestures: [] },
      characterIds: ['char_main_v1']
    };
    const violations: CrossReferenceViolation[] = crossReferenceShotManifest(manifest, refs);
    expect(violations).toEqual([]);
  });

  it('rigType gating is independent of other cross-reference violations', () => {
    const manifest = validShotManifest('creature');
    const refs: ShowBibleCrossRefs = {
      cameraRules: { allowedShotSizes: ['medium_shot'] },
      motionGrammar: { allowedEmotions: ['surprise'] },
      characterIds: ['char_other_v1'],
      allowedRigTypes: ['humanoid_2leg', 'quadruped']
    };
    const violations = crossReferenceShotManifest(manifest, refs);
    expect(violations.some(v => v.kind === 'unknown_shot_size' && v.ref === 'close_up')).toBe(true);
    expect(violations.some(v => v.kind === 'unknown_emotion' && v.ref === 'neutral')).toBe(true);
    expect(violations.some(v => v.kind === 'unknown_character' && v.ref === 'char_main_v1')).toBe(true);
    expect(violations.some(v => v.kind === 'unknown_rig_type' && v.ref === 'creature')).toBe(true);
  });

  it('accepts each enum value (humanoid_2leg, quadruped, creature, mechanical) when whitelisted', () => {
    const allowed: Array<NonNullable<ShotManifest['rigType']>> = [
      'humanoid_2leg', 'quadruped', 'creature', 'mechanical'
    ];
    for (const rt of allowed) {
      const manifest = validShotManifest(rt);
      const refs: ShowBibleCrossRefs = { allowedRigTypes: allowed };
      const violations = crossReferenceShotManifest(manifest, refs);
      expect(violations.some(v => v.kind === 'unknown_rig_type')).toBe(false);
    }
  });
});