import { ShotManifestCompiler } from '../src/services/shotManifestCompiler/index.js';
import { performancePirSchema } from '../src/schemas/performancePir.js';
import type { ShotManifest, ShowBibleCrossRefs } from '../src/schemas/shotManifest.js';

describe('ShotManifestCompiler', () => {
  const compiler = new ShotManifestCompiler();

  const manifest: ShotManifest = {
    schemaVersion: '1.0',
    shotId: 'shot_001',
    showBibleRef: 'show/show_bible.json',
    production: 'polygon_show',
    episode: 'E01',
    sceneName: 'S01',
    description: 'Mira looks up, surprised.',
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
      { beatId: 'b1', startFrame: 1, endFrame: 24, characterId: 'char_main_v1', intent: 'look_up', emotion: 'neutral' },
      { beatId: 'b2', startFrame: 25, endFrame: 48, characterId: 'char_main_v1', intent: 'react', emotion: 'surprise', gestureId: 'point' }
    ],
    fx: [],
    render: { preview: true, format: 'mp4', quality: 'standard' },
    provenance: { director: 'llm_director_v1', createdAt: '2026-07-27T12:00:00Z', sourceScriptRef: 'scripts/E01/S01.txt' }
  };

  const goodRefs: ShowBibleCrossRefs = {
    cameraRules: { allowedShotSizes: ['close_up'], allowedCameraMoves: ['static'] },
    motionGrammar: { allowedEmotions: ['neutral', 'surprise'], allowedGestures: ['point'] },
    characterIds: ['char_main_v1']
  };

  const controllerMaps = {
    char_main_v1: [
      { controllerId: 'HEAD_ROT', nodePath: 'Top/Mira/Head_Peg' },
      { controllerId: 'MOUTH_OPEN', nodePath: 'Top/Mira/Head/Mouth_D' }
    ]
  };

  it('produces a schema-valid PerformancePIR when ShowBible refs match', () => {
    const { performance, violations } = compiler.compile(manifest, goodRefs, { controllerMaps });
    expect(violations).toEqual([]);
    expect(performancePirSchema.safeParse(performance).success).toBe(true);
    expect(performance.staging?.shotSize).toBe('close_up');
    expect(performance.beatFrameMap).toHaveLength(2);
  });

  it('places keys only on declared beat boundaries', () => {
    const { performance } = compiler.compile(manifest, goodRefs, { controllerMaps });
    const head = performance.tracks.find(t => t.nodeId === 'Top/Mira/Head_Peg');
    expect(head).toBeDefined();
    const frames = head!.keys.map(k => k.frame).sort((a, b) => a - b);
    expect(frames).toEqual([1, 24, 25, 48]);
  });

  it('is deterministic: same manifest produces same performanceId', () => {
    const a = compiler.compile(manifest, goodRefs, { controllerMaps });
    const b = compiler.compile(manifest, goodRefs, { controllerMaps });
    expect(a.performance.performanceId).toBe(b.performance.performanceId);
  });

  it('rejects unknown shot size and returns an empty PerformancePIR with violations', () => {
    const badRefs: ShowBibleCrossRefs = {
      cameraRules: { allowedShotSizes: ['medium_shot'], allowedCameraMoves: ['static'] },
      motionGrammar: { allowedEmotions: ['neutral', 'surprise'], allowedGestures: ['point'] },
      characterIds: ['char_main_v1']
    };
    const { performance, violations } = compiler.compile(manifest, badRefs, { controllerMaps });
    expect(violations.some(v => v.kind === 'unknown_shot_size')).toBe(true);
    expect(performance.tracks).toEqual([]);
  });

  it('rejects unknown emotion on a beat', () => {
    const strictRefs: ShowBibleCrossRefs = {
      cameraRules: { allowedShotSizes: ['close_up'], allowedCameraMoves: ['static'] },
      motionGrammar: { allowedEmotions: ['neutral'], allowedGestures: ['point'] },
      characterIds: ['char_main_v1']
    };
    const { violations } = compiler.compile(manifest, strictRefs, { controllerMaps });
    expect(violations.some(v => v.kind === 'unknown_emotion' && v.ref === 'surprise')).toBe(true);
  });

  it('emits a HOLD warning when no controller map is provided', () => {
    const { warnings } = compiler.compile(manifest, goodRefs, {});
    expect(warnings.some(w => w.includes('HOLD'))).toBe(true);
  });
});