import { type ShotManifest } from '../src/schemas/shotManifest.js';
import { MohoPerformancePirCompiler } from '../src/services/mohoPerformancePirCompiler/index.js';
import { validMohoCharacterBible } from './fixtures/mohoShowBible.valid.js';

function gestureShot(): ShotManifest {
  return {
    schemaVersion: '1.0',
    shotId: 'shot_gesture',
    showBibleRef: 'show_bible.json',
    production: 'production',
    episode: 'episode_01',
    sceneName: 'gesture_scene',
    rigType: 'humanoid_2leg',
    description: 'Character performs a mapped gesture.',
    staging: {
      positions: [{ characterId: 'char_test_humanoid', preset: 'center' }],
      shotSize: 'medium_shot',
      cameraMove: 'static',
      backgroundRef: 'backgrounds/room.png'
    },
    timing: {
      totalFrames: 24,
      fps: 24,
      minBeatFrames: 2,
      maxBeatFrames: 24,
      anticipationFrames: 2,
      followThroughFrames: 4,
      pauseBeforeBeats: {}
    },
    beats: [{
      beatId: 'beat_nod',
      startFrame: 1,
      endFrame: 24,
      characterId: 'char_test_humanoid',
      intent: 'agree',
      emotion: 'neutral',
      gestureId: 'nod'
    }],
    fx: [],
    render: { preview: true, format: 'mp4', quality: 'standard' },
    provenance: {
      director: 'production-test',
      createdAt: '2026-01-01T00:00:00.000Z',
      sourceScriptRef: 'scripts/episode_01.json'
    }
  };
}

describe('MohoPerformancePIR production contracts', () => {
  it('maps a gesture track file to its explicit target controller', () => {
    const bible = validMohoCharacterBible();
    bible.gestureLibrary = [{
      gestureId: 'nod',
      durationFrames: 24,
      controllerTrackRef: 'tracks/nod.moho_track',
      targetControllerId: 'HEAD_ROT'
    } as any];

    const result = new MohoPerformancePirCompiler().compile({
      shotManifest: gestureShot(),
      characterBible: bible
    });

    expect(result.pir.smartBoneActions).toHaveLength(2);
    expect(result.pir.smartBoneActions.map(action => action.targetBone)).toEqual([
      'head_root',
      'head_root'
    ]);
  });

  it('does not emit an action against an unresolved file path', () => {
    const bible = validMohoCharacterBible();
    bible.gestureLibrary = [{
      gestureId: 'nod',
      durationFrames: 24,
      controllerTrackRef: 'tracks/nod.moho_track'
    }];

    const result = new MohoPerformancePirCompiler().compile({
      shotManifest: gestureShot(),
      characterBible: bible
    });

    expect(result.pir.smartBoneActions).toEqual([]);
    expect(result.warnings).toContain(
      'beat "beat_nod": gesture "nod" has no controller mapping — smart bone action skipped'
    );
  });

  it('does not emit a mouth key for artwork missing from the switch layer', () => {
    const bible = validMohoCharacterBible();
    const mouthLayer = bible.switchLayers.find(layer => layer.layerName === 'Mouth')!;
    mouthLayer.choices = mouthLayer.choices.filter(choice => choice.drawingName !== 'mouth_O');
    const shot = gestureShot();
    shot.beats[0].gestureId = undefined;
    shot.beats[0].audioCue = { transcript: 'hello' };

    const result = new MohoPerformancePirCompiler().compile({
      shotManifest: shot,
      characterBible: bible
    });

    expect(result.pir.switchKeys).toEqual([]);
    expect(result.warnings).toContain(
      'beat "beat_nod": mouth shape "mouth_O" is absent from switch layer "Mouth" — switch key skipped'
    );
  });
});
