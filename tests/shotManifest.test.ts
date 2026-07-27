import {
  shotManifestSchema,
  assertShotManifestVersion,
  crossReferenceShotManifest,
  type ShotManifest,
  type ShowBibleCrossRefs
} from '../src/schemas/shotManifest.js';

describe('ShotManifest contract', () => {
  const base: ShotManifest = {
    schemaVersion: '1.0',
    shotId: 'shot_001',
    showBibleRef: 'show/show_bible.json',
    production: 'polygon_show',
    episode: 'E01',
    sceneName: 'S01',
    description: 'Mira looks up from her desk, surprised.',
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
      },
      {
        beatId: 'b2',
        startFrame: 25,
        endFrame: 48,
        characterId: 'char_main_v1',
        intent: 'react',
        emotion: 'surprise',
        gestureId: 'point'
      }
    ],
    fx: [],
    render: { preview: true, format: 'mp4', quality: 'standard' },
    provenance: { director: 'llm_director_v1', createdAt: '2026-07-27T12:00:00Z', sourceScriptRef: 'scripts/E01/S01.txt' }
  };

  it('validates a minimal shot manifest', () => {
    expect(shotManifestSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a manifest with no beats', () => {
    const bad = { ...base, beats: [] };
    expect(shotManifestSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a manifest with overlapping frame ranges inside a beat', () => {
    const bad = {
      ...base,
      beats: [{ ...base.beats[0], startFrame: 30, endFrame: 10 }]
    };
    expect(shotManifestSchema.safeParse(bad).success).toBe(false);
  });

  it('assertShotManifestVersion accepts v1 and rejects v2', () => {
    expect(assertShotManifestVersion(base)).toEqual({ major: 1, minor: 0 });
    expect(() => assertShotManifestVersion({ schemaVersion: '2.0' })).toThrow();
  });

  it('crossReference flags unknown shot size, camera move, emotion, and character', () => {
    const refs: ShowBibleCrossRefs = {
      cameraRules: { allowedShotSizes: ['medium_shot'], allowedCameraMoves: ['static'] },
      motionGrammar: { allowedEmotions: ['neutral'], allowedGestures: ['point'] },
      characterIds: ['char_main_v1']
    };
    const violations = crossReferenceShotManifest(base, refs);
    // close_up not in allowedShotSizes -> violation
    expect(violations.some(v => v.kind === 'unknown_shot_size' && v.ref === 'close_up')).toBe(true);
    // 'surprise' not in allowedEmotions -> violation on b2
    expect(violations.some(v => v.kind === 'unknown_emotion' && v.ref === 'surprise' && v.beatId === 'b2')).toBe(true);
  });

  it('crossReference passes when everything is declared', () => {
    const refs: ShowBibleCrossRefs = {
      cameraRules: { allowedShotSizes: ['close_up'], allowedCameraMoves: ['static'] },
      motionGrammar: { allowedEmotions: ['neutral', 'surprise'], allowedGestures: ['point'] },
      characterIds: ['char_main_v1']
    };
    expect(crossReferenceShotManifest(base, refs)).toEqual([]);
  });
});