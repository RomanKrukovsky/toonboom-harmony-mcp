import { describe, it, expect } from '@jest/globals';
import { MohoAnimationLibrary } from '../src/services/mohoAnimationLibrary/index.js';
import { MohoScenePlanCompiler } from '../src/services/mohoScenePlanCompiler/index.js';
import { TURNAROUND_ANGLES, type MohoProductionRigSpec } from '../src/schemas/mohoProductionRig.js';

describe('MohoAnimationLibrary & MohoScenePlanCompiler', () => {
  it('returns valid walk cycle, idle, and jump motion clips with keyframes', () => {
    const walk = MohoAnimationLibrary.getWalkCycle();
    expect(walk.clipId).toBe('walk_cycle_24f');
    expect(walk.durationFrames).toBe(24);
    expect(walk.looping).toBe(true);
    expect(walk.tracks.length).toBeGreaterThanOrEqual(4);

    const pelvisTrack = walk.tracks.find(t => t.boneName === 'Pelvis');
    expect(pelvisTrack?.keyframes.length).toBeGreaterThanOrEqual(5);

    const idle = MohoAnimationLibrary.getIdleBreathing();
    expect(idle.durationFrames).toBe(48);

    const jump = MohoAnimationLibrary.getJumpSquat();
    expect(jump.durationFrames).toBe(36);
  });

  it('compiles a complete multiplane animated scene with characters, lipsync, and motion', () => {
    const sampleSpec: MohoProductionRigSpec = {
      characterId: 'char_shot_hero',
      characterName: 'HeroActor',
      turnaroundAngles: [...TURNAROUND_ANGLES],
      smartDials: [],
      vitruvianGroups: [],
      jointCorrections: [],
      squashStretch: [],
      shadow: {
        enabled: true,
        layerName: 'shadow',
        rootBoneName: 'Master',
        scaleY: -0.25,
        skewX: 0.1,
        opacity: 0.35
      },
      animatorContract: {
        hideHelperBonesShy: true,
        colorCodeBones: true,
        lockNonControllerChannels: true,
        frameZeroCleanAudit: true
      }
    };

    const shot = MohoScenePlanCompiler.compileShot({
      shotId: 'shot_seq01_0010',
      title: 'Hero enters dialogue scene',
      startFrame: 1,
      endFrame: 72,
      fps: 24,
      characters: [
        {
          characterName: 'HeroActor',
          rigSpec: sampleSpec,
          position: [0, 0],
          scale: [1, 1],
          motionClipId: 'walk_cycle',
          lipsyncCues: [
            { frame: 1, phoneme: 'Rest' },
            { frame: 12, phoneme: 'A' },
            { frame: 24, phoneme: 'O' }
          ]
        }
      ],
      backgroundLayers: [
        { name: 'BG_Sky', depthZ: -150 },
        { name: 'BG_Forest', depthZ: -50 },
        { name: 'FG_Foliage', depthZ: 30 }
      ]
    });

    expect(shot.shotId).toBe('shot_seq01_0010');
    expect(shot.totalFrames).toBe(72);
    expect(shot.charactersCount).toBe(1);
    expect(shot.layersCount).toBeGreaterThanOrEqual(4); // 3 BG/FG + 1 character
    expect(shot.documentJson.version).toBe(1045);
  });
});
