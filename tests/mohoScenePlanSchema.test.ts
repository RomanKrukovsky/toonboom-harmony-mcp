import { describe, it, expect } from '@jest/globals';

import {
  mohoScenePlanSchema,
  MOHO_SCENE_PLAN_SCHEMA_VERSION,
  type MohoScenePlan
} from '../src/schemas/mohoScenePlan.js';

function validMohoScenePlanFixture(): MohoScenePlan {
  return {
    schemaVersion: MOHO_SCENE_PLAN_SCHEMA_VERSION,
    planId: 'plan_ep01_sc01_v1',
    production: 'Polygon Show',
    episode: 'ep01',
    sceneName: 'sc01_intro',
    resolution: { width: 1920, height: 1080 },
    fps: 24,
    durationFrames: 240,
    assets: [
      {
        assetId: 'asset_bg_v1',
        kind: 'image',
        path: 'assets/backgrounds/room_v1.png',
        mohoImportMethod: 'file_menu'
      }
    ],
    characters: [
      {
        characterId: 'char_mira_v1',
        positionPreset: 'center',
        startFrame: 1,
        endFrame: 240,
        actions: [
          { type: 'idle', frames: [1, 60] },
          { type: 'talk', frames: [61, 180], audio: 'audio/dialogue_01.wav', mouthChart: 'mouth/preston_blair' },
          { type: 'gesture', frames: [181, 240], gestureName: 'wave_right' }
        ]
      }
    ],
    camera: {
      preset: 'medium_shot',
      startFrame: 1,
      endFrame: 240,
      mohoCameraRigType: 'perspective'
    },
    effects: [],
    render: { preview: true, format: 'mp4', quality: 'standard' }
  };
}

describe('mohoScenePlanSchema', () => {
  it('accepts a valid humanoid scene plan', () => {
    expect(mohoScenePlanSchema.safeParse(validMohoScenePlanFixture()).success).toBe(true);
  });

  it('rejects an invalid resolution (width = 0)', () => {
    const bad = {
      ...validMohoScenePlanFixture(),
      resolution: { width: 0, height: 1080 }
    };
    expect(mohoScenePlanSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a negative durationFrames', () => {
    const bad = {
      ...validMohoScenePlanFixture(),
      durationFrames: -10
    };
    expect(mohoScenePlanSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects an unknown asset kind', () => {
    const bad = {
      ...validMohoScenePlanFixture(),
      assets: [
        {
          assetId: 'asset_bad_v1',
          kind: 'hologram' as any,
          path: 'assets/x.holo',
          mohoImportMethod: 'file_menu'
        }
      ]
    };
    expect(mohoScenePlanSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects an unknown character action type', () => {
    const bad = {
      ...validMohoScenePlanFixture(),
      characters: [
        {
          characterId: 'char_mira_v1',
          positionPreset: 'center' as const,
          startFrame: 1,
          endFrame: 240,
          actions: [
            { type: 'teleport' as any, frames: [1, 60] }
          ]
        }
      ]
    };
    expect(mohoScenePlanSchema.safeParse(bad).success).toBe(false);
  });

  it('accepts a valid camera preset', () => {
    const fixture = {
      ...validMohoScenePlanFixture(),
      camera: {
        preset: 'close_up',
        startFrame: 1,
        endFrame: 120,
        mohoCameraRigType: 'orthographic' as const
      }
    };
    expect(mohoScenePlanSchema.safeParse(fixture).success).toBe(true);
  });

  it('accepts a valid quadruped scene plan', () => {
    const fixture: MohoScenePlan = {
      ...validMohoScenePlanFixture(),
      characters: [
        {
          characterId: 'char_dexter_v1',
          positionPreset: 'left',
          startFrame: 1,
          endFrame: 240,
          actions: [
            { type: 'walk', frames: [1, 120] },
            { type: 'react', frames: [121, 240] }
          ]
        }
      ]
    };
    expect(mohoScenePlanSchema.safeParse(fixture).success).toBe(true);
  });

  it('.strict() rejects extra fields on root', () => {
    const bad = {
      ...validMohoScenePlanFixture(),
      teleportEnabled: true
    } as any;
    expect(mohoScenePlanSchema.safeParse(bad).success).toBe(false);
  });
});
