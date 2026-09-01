import { describe, it, expect } from '@jest/globals';

import {
  mohoShowBibleSchema,
  MOHO_SHOW_BIBLE_SCHEMA_VERSION,
  assertMohoShowBibleVersion,
  type MohoShowBible
} from '../src/schemas/mohoShowBible.js';

import {
  mohoCharacterBibleSchema,
  type MohoCharacterBible
} from '../src/schemas/mohoCharacterBible.js';

import {
  mohoCameraRulesSchema,
  assertMohoCameraRulesVersion,
  type MohoCameraRules
} from '../src/schemas/mohoCameraRules.js';

import {
  mohoMotionGrammarSchema,
  assertMohoMotionGrammarVersion,
  type MohoMotionGrammar
} from '../src/schemas/mohoMotionGrammar.js';

import {
  mohoPaletteManifestSchema,
  assertMohoPaletteManifestVersion,
  type MohoPaletteManifest
} from '../src/schemas/mohoPaletteManifest.js';

import {
  mohoQaThresholdsSchema,
  assertMohoQaThresholdsVersion,
  type MohoQaThresholds
} from '../src/schemas/mohoQaThresholds.js';

const approver = { approver: 'td_lead', approvedAt: '2026-07-27T12:00:00Z' };

function validMohoPalette(): MohoPaletteManifest {
  return {
    schemaVersion: '1.0',
    paletteId: 'palette_main_v1',
    name: 'Polygon Show Palette',
    paletteType: 'rgb',
    maxColours: 256,
    colours: [
      { colourId: 'line_main', name: 'Outline', rgba: '#1A1A1AFF', usage: 'line', locked: true, mohoColourIndex: 0 },
      { colourId: 'fill_skin', name: 'Skin', rgba: '#FF8C6BFF', usage: 'skin', locked: true, mohoColourIndex: 1 },
      { colourId: 'shadow_soft', name: 'Soft Shadow', rgba: '#3A2A20FF', usage: 'shadow', locked: true, mohoColourIndex: 2 }
    ],
    provenance: approver
  };
}

function validMohoCharacter(rigType: 'humanoid_2leg' | 'quadruped' | 'creature' | 'mechanical'): MohoCharacterBible {
  const base = {
    schemaVersion: '1.0' as const,
    characterId: 'char_main_v1',
    name: 'Mira',
    role: 'protagonist' as const,
    rigType,
    rigPath: 'rigs/mira/mira.moho',
    turnaroundViews: ['front', 'side_left'],
    controllers: [
      {
        controllerId: 'HEAD_ROT',
        boneId: 1,
        boneName: 'Head_Peg',
        purpose: 'head rotation',
        range: { min: -45, max: 45, units: 'degrees' as const },
        channel: 'rotation' as const
      }
    ],
    switchLayers: [] as MohoCharacterBible['switchLayers'],
    mouthShapes: [] as MohoCharacterBible['mouthShapes'],
    expressions: [] as MohoCharacterBible['expressions'],
    gestureLibrary: [] as MohoCharacterBible['gestureLibrary'],
    paletteRef: 'palette_main_v1',
    provenance: { ...approver, rigAuthor: 'rigger_a', licensePath: 'legal/contracts/mira.pdf' }
  };
  return base as MohoCharacterBible;
}

function validMohoShowBibleFixture(): MohoShowBible {
  return {
    schemaVersion: MOHO_SHOW_BIBLE_SCHEMA_VERSION,
    showId: 'polygon_show_v1',
    title: 'Polygon Show',
    logLine: 'One character, one room, one gesture at a time.',
    fps: 24,
    resolution: { width: 1920, height: 1080 },
    visualStyle: 'flat editorial, warm monochrome',
    lineRules: { defaultThicknessPt: 2.0, lineColourId: 'line_main', fillColourId: 'fill_skin' },
    lighting: { type: 'soft_top_left', shadowColourId: 'shadow_soft' },
    allowedDeformations: ['peg_transform', 'bone_deformer'],
    allowedRigTypes: ['humanoid_2leg'],
    characterBibles: [{ characterId: 'char_main_v1', ref: 'show/character_bible_mira.json' }],
    paletteManifestRef: 'show/palette_manifest.json',
    cameraRulesRef: 'show/camera_rules.json',
    motionGrammarRef: 'show/motion_grammar.json',
    qaThresholdsRef: 'show/qa_thresholds.json',
    forbiddenSources: ['NC', 'third_party_series'],
    provenance: approver
  };
}

function validMohoCameraRules(): MohoCameraRules {
  return {
    schemaVersion: '1.0',
    rulesId: 'polygon_show_v1_camera_rules',
    allowedShotSizes: ['close_up', 'medium_shot', 'full_shot'],
    allowedCameraMoves: ['static', 'pan_left', 'dolly_in'],
    defaultShotSize: 'medium_shot',
    safeMargins: { top: 0.05, bottom: 0.05, left: 0.05, right: 0.05 },
    forbiddenMoves: ['crane_up'],
    mohoCameraRigType: 'perspective',
    maxFieldOfViewDeg: 45,
    allowCameraShake: false,
    provenance: approver
  };
}

function validMohoMotionGrammar(): MohoMotionGrammar {
  return {
    schemaVersion: '1.0',
    grammarId: 'grammar_main_v1',
    rules: [
      {
        ruleId: 'rule_dialogue',
        description: 'Default dialogue beat',
        allowedGestures: ['point', 'nod'],
        forbiddenGestures: ['spin'],
        allowedEmotions: ['neutral', 'surprise', 'angry'],
        poseLibraryRefs: ['pose/neutral_front'],
        timing: { minHoldFrames: 2, maxHoldFrames: 48, anticipationFrames: 4, followThroughFrames: 6 },
        boneConstraints: [{ boneName: 'Head_Peg', minAngleDeg: -45, maxAngleDeg: 45 }],
        physicsChannels: ['spring', 'damping']
      }
    ],
    defaultTiming: { fps: 24, minBeatFrames: 2, maxBeatFrames: 96 },
    defaultEasing: 'ease_in_out',
    provenance: approver
  };
}

function validMohoQaThresholds(): MohoQaThresholds {
  return {
    schemaVersion: '1.0',
    thresholdsId: 'qa_main_v1',
    silhouetteQualityMin: 0.7,
    lipsyncDriftMaxMs: 80,
    continuityMaxDeltaFrames: 2,
    lineThicknessTolerancePt: 0.5,
    paletteDeltaMax: 0.02,
    poseLibraryMatchMin: 0.85,
    autoFixableSeverityMax: 'medium',
    requireHumanApprovalFor: ['key_pose', 'camera_move', 'dialogue_timing'],
    boneAngleToleranceDeg: 2,
    meshWarpMaxPointsMoved: 8,
    switchLayerMaxChangesPerSecond: 6,
    forbidOrphanBones: true,
    provenance: approver
  };
}

describe('mohoShowBibleSchema', () => {
  it('accepts a complete valid bundle', () => {
    expect(mohoShowBibleSchema.safeParse(validMohoShowBibleFixture()).success).toBe(true);
  });

  it('rejects a bundle missing allowedRigTypes', () => {
    const bad = { ...validMohoShowBibleFixture() } as Record<string, unknown>;
    delete bad.allowedRigTypes;
    expect(mohoShowBibleSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects an unknown rigType', () => {
    const bad = { ...validMohoShowBibleFixture(), allowedRigTypes: ['sentient_plant'] as any };
    expect(mohoShowBibleSchema.safeParse(bad).success).toBe(false);
  });
});

describe('mohoCharacterBibleSchema', () => {
  it('accepts a valid humanoid_2leg character', () => {
    expect(mohoCharacterBibleSchema.safeParse(validMohoCharacter('humanoid_2leg')).success).toBe(true);
  });

  it('rejects a character missing rigType', () => {
    const bad = { ...validMohoCharacter('humanoid_2leg') } as Record<string, unknown>;
    delete bad.rigType;
    expect(mohoCharacterBibleSchema.safeParse(bad).success).toBe(false);
  });

  it('accepts a valid quadruped character', () => {
    expect(mohoCharacterBibleSchema.safeParse(validMohoCharacter('quadruped')).success).toBe(true);
  });

  it('accepts a valid creature character', () => {
    expect(mohoCharacterBibleSchema.safeParse(validMohoCharacter('creature')).success).toBe(true);
  });

  it('accepts a valid mechanical character', () => {
    expect(mohoCharacterBibleSchema.safeParse(validMohoCharacter('mechanical')).success).toBe(true);
  });

  it('rejects an invalid Preston Blair mouth shape', () => {
    const bad = {
      ...validMohoCharacter('humanoid_2leg'),
      mouthShapes: [{ shapeId: 'X' as any, drawingName: 'mouth_X', phonemes: [] }]
    };
    expect(mohoCharacterBibleSchema.safeParse(bad).success).toBe(false);
  });

  const allShapes = ['Rest', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'L', 'O', 'Smile', 'Frown'] as const;
  for (const shape of allShapes) {
    it(`accepts Preston Blair shape "${shape}"`, () => {
      const fixture = {
        ...validMohoCharacter('humanoid_2leg'),
        mouthShapes: [{ shapeId: shape, drawingName: `mouth_${shape}`, phonemes: [] }]
      };
      expect(mohoCharacterBibleSchema.safeParse(fixture).success).toBe(true);
    });
  }
});

describe('mohoCameraRulesSchema', () => {
  it('accepts a valid rules bundle', () => {
    expect(mohoCameraRulesSchema.safeParse(validMohoCameraRules()).success).toBe(true);
  });

  it('rejects an invalid shot size', () => {
    const bad = { ...validMohoCameraRules(), defaultShotSize: 'tiny_peep' as any };
    expect(mohoCameraRulesSchema.safeParse(bad).success).toBe(false);
  });

  it('accepts the Moho-specific field mohoCameraRigType', () => {
    const fixture = { ...validMohoCameraRules(), mohoCameraRigType: 'orthographic' as const };
    expect(mohoCameraRulesSchema.safeParse(fixture).success).toBe(true);
  });

  it('accepts the Moho-specific field maxFieldOfViewDeg', () => {
    const fixture = { ...validMohoCameraRules(), maxFieldOfViewDeg: 60 };
    expect(mohoCameraRulesSchema.safeParse(fixture).success).toBe(true);
  });

  it('accepts the Moho-specific field allowCameraShake', () => {
    const fixture = { ...validMohoCameraRules(), allowCameraShake: true };
    expect(mohoCameraRulesSchema.safeParse(fixture).success).toBe(true);
  });
});

describe('mohoMotionGrammarSchema', () => {
  it('accepts a valid grammar bundle', () => {
    expect(mohoMotionGrammarSchema.safeParse(validMohoMotionGrammar()).success).toBe(true);
  });

  it('accepts the Moho-specific boneConstraints field on rules', () => {
    const fixture = {
      ...validMohoMotionGrammar(),
      rules: [
        {
          ...validMohoMotionGrammar().rules[0],
          boneConstraints: [
            { boneName: 'Head_Peg', minAngleDeg: -30, maxAngleDeg: 30 },
            { boneName: 'Spine_Peg', minAngleDeg: -10, maxAngleDeg: 10 }
          ]
        }
      ]
    };
    expect(mohoMotionGrammarSchema.safeParse(fixture).success).toBe(true);
  });

  it('accepts the Moho-specific physicsChannels field on rules', () => {
    const fixture = {
      ...validMohoMotionGrammar(),
      rules: [
        {
          ...validMohoMotionGrammar().rules[0],
          physicsChannels: ['spring', 'damping', 'mass', 'gravity']
        }
      ]
    };
    expect(mohoMotionGrammarSchema.safeParse(fixture).success).toBe(true);
  });

  it('rejects an invalid defaultEasing', () => {
    const bad = { ...validMohoMotionGrammar(), defaultEasing: 'wobbly_bounce' as any };
    expect(mohoMotionGrammarSchema.safeParse(bad).success).toBe(false);
  });
});

describe('mohoPaletteManifestSchema', () => {
  it('accepts a valid palette manifest', () => {
    expect(mohoPaletteManifestSchema.safeParse(validMohoPalette()).success).toBe(true);
  });

  it('accepts the Moho-specific mohoColourIndex field', () => {
    const palette = validMohoPalette();
    const fixture = {
      ...palette,
      colours: palette.colours.map((c) => ({ ...c, mohoColourIndex: 42 }))
    };
    expect(mohoPaletteManifestSchema.safeParse(fixture).success).toBe(true);
  });

  it('rejects a negative mohoColourIndex', () => {
    const palette = validMohoPalette();
    const bad = {
      ...palette,
      colours: palette.colours.map((c) => ({ ...c, mohoColourIndex: -1 }))
    };
    expect(mohoPaletteManifestSchema.safeParse(bad).success).toBe(false);
  });

  it('enforces 8-digit RGBA regex (rejects shorthand)', () => {
    const bad = {
      ...validMohoPalette(),
      colours: [
        { colourId: 'line_main', name: 'Outline', rgba: '#FFF', usage: 'line', locked: true, mohoColourIndex: 0 }
      ]
    };
    expect(mohoPaletteManifestSchema.safeParse(bad).success).toBe(false);
  });

  it('enforces 8-digit RGBA regex (rejects non-hex)', () => {
    const bad = {
      ...validMohoPalette(),
      colours: [
        { colourId: 'line_main', name: 'Outline', rgba: 'red', usage: 'line', locked: true, mohoColourIndex: 0 }
      ]
    };
    expect(mohoPaletteManifestSchema.safeParse(bad).success).toBe(false);
  });
});

describe('mohoQaThresholdsSchema', () => {
  it('accepts a valid QA thresholds bundle', () => {
    expect(mohoQaThresholdsSchema.safeParse(validMohoQaThresholds()).success).toBe(true);
  });

  it('accepts the Moho-specific boneAngleToleranceDeg field', () => {
    const fixture = { ...validMohoQaThresholds(), boneAngleToleranceDeg: 5 };
    expect(mohoQaThresholdsSchema.safeParse(fixture).success).toBe(true);
  });

  it('accepts the Moho-specific forbidOrphanBones field', () => {
    const fixture = { ...validMohoQaThresholds(), forbidOrphanBones: false };
    expect(mohoQaThresholdsSchema.safeParse(fixture).success).toBe(true);
  });
});

describe('assertMoho*Version', () => {
  it('assertMohoShowBibleVersion accepts 1.0', () => {
    expect(assertMohoShowBibleVersion({ schemaVersion: '1.0' })).toEqual({ major: 1, minor: 0 });
  });

  it('assertMohoShowBibleVersion accepts 1.x.x patch variants', () => {
    expect(assertMohoShowBibleVersion({ schemaVersion: '1.2.3' })).toEqual({ major: 1, minor: 2 });
    expect(assertMohoShowBibleVersion({ schemaVersion: '1.10.4' })).toEqual({ major: 1, minor: 10 });
  });

  it('assertMohoShowBibleVersion rejects major != 1', () => {
    expect(() => assertMohoShowBibleVersion({ schemaVersion: '2.0' })).toThrow();
    expect(() => assertMohoShowBibleVersion({ schemaVersion: '0.9' })).toThrow();
  });

  it('assertMohoCameraRulesVersion accepts 1.0 and rejects major != 1', () => {
    expect(assertMohoCameraRulesVersion({ schemaVersion: '1.0' })).toEqual({ major: 1, minor: 0 });
    expect(assertMohoCameraRulesVersion({ schemaVersion: '1.5.0' })).toEqual({ major: 1, minor: 5 });
    expect(() => assertMohoCameraRulesVersion({ schemaVersion: '2.0' })).toThrow();
  });

  it('assertMohoMotionGrammarVersion accepts 1.0 and rejects major != 1', () => {
    expect(() => assertMohoMotionGrammarVersion({ schemaVersion: '2.0' })).toThrow();
    expect(() => assertMohoMotionGrammarVersion(validMohoMotionGrammar())).not.toThrow();
  });

  it('assertMohoPaletteManifestVersion accepts 1.0 and rejects major != 1', () => {
    expect(() => assertMohoPaletteManifestVersion({ schemaVersion: '2.0' })).toThrow();
    expect(() => assertMohoPaletteManifestVersion({ schemaVersion: '0.5' })).toThrow();
    expect(() => assertMohoPaletteManifestVersion(validMohoPalette())).not.toThrow();
  });

  it('assertMohoQaThresholdsVersion accepts 1.0 and rejects major != 1', () => {
    expect(() => assertMohoQaThresholdsVersion({ schemaVersion: '2.0' })).toThrow();
    expect(() => assertMohoQaThresholdsVersion(validMohoQaThresholds())).not.toThrow();
  });
});

describe('strict() — extra fields rejected on all 6 root schemas', () => {
  it('mohoShowBibleSchema rejects extra root fields', () => {
    const bad = { ...validMohoShowBibleFixture(), teleportEnabled: true } as any;
    expect(mohoShowBibleSchema.safeParse(bad).success).toBe(false);
  });

  it('mohoCharacterBibleSchema rejects extra root fields', () => {
    const bad = { ...validMohoCharacter('humanoid_2leg'), wingCount: 2 } as any;
    expect(mohoCharacterBibleSchema.safeParse(bad).success).toBe(false);
  });

  it('mohoCameraRulesSchema rejects extra root fields', () => {
    const bad = { ...validMohoCameraRules(), filmGrain: 0.1 } as any;
    expect(mohoCameraRulesSchema.safeParse(bad).success).toBe(false);
  });

  it('mohoMotionGrammarSchema rejects extra root fields', () => {
    const bad = { ...validMohoMotionGrammar(), secretSauce: 'on' } as any;
    expect(mohoMotionGrammarSchema.safeParse(bad).success).toBe(false);
  });

  it('mohoPaletteManifestSchema rejects extra root fields', () => {
    const bad = { ...validMohoPalette(), colourCountOverride: 1024 } as any;
    expect(mohoPaletteManifestSchema.safeParse(bad).success).toBe(false);
  });

  it('mohoQaThresholdsSchema rejects extra root fields', () => {
    const bad = { ...validMohoQaThresholds(), magicNumber: 42 } as any;
    expect(mohoQaThresholdsSchema.safeParse(bad).success).toBe(false);
  });
});