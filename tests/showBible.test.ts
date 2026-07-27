import {
  showBibleSchema,
  characterBibleSchema,
  cameraRulesSchema,
  motionGrammarSchema,
  paletteManifestSchema,
  qaThresholdsSchema,
  assertShowBibleVersion,
  SHOW_BIBLE_SCHEMA_VERSION,
  type ShowBible,
  type CharacterBible,
  type PaletteManifest,
  type CameraRules,
  type MotionGrammar,
  type QaThresholds
} from '../src/schemas/showBible.js';

describe('ShowBible schema family', () => {
  const approver = { approver: 'td_lead', approvedAt: '2026-07-27T12:00:00Z' };

  const palette: PaletteManifest = {
    schemaVersion: '1.0',
    paletteId: 'palette_main_v1',
    name: 'Polygon Show Palette',
    colours: [
      { colourId: 'line_main', name: 'Outline', rgba: '#1A1A1AFF', usage: 'line', locked: true },
      { colourId: 'fill_skin', name: 'Skin', rgba: '#FF8C6BFF', usage: 'skin', locked: true },
      { colourId: 'shadow_soft', name: 'Soft Shadow', rgba: '#3A2A20FF', usage: 'shadow', locked: true }
    ],
    provenance: approver
  };

  const character: CharacterBible = {
    schemaVersion: '1.0',
    characterId: 'char_main_v1',
    name: 'Mira',
    role: 'protagonist',
    rigPath: 'rigs/mira/mira.xstage',
    templatePath: 'rigs/mira/mira.tpl',
    turnaroundViews: ['front', 'front_3q_left', 'side_left'],
    controllers: [
      { controllerId: 'HEAD_ROT', nodePath: 'Top/Mira/Head_Peg', purpose: 'head rotation', range: { min: -45, max: 45, units: 'degrees' } },
      { controllerId: 'MOUTH_OPEN', nodePath: 'Top/Mira/Head/Mouth_D', purpose: 'mouth open', range: { min: 0, max: 1, units: 'normalized' } }
    ],
    mouthShapes: [
      { shapeId: 'A', drawingName: 'mouth_A', phonemes: ['a', 'aI'] },
      { shapeId: 'X', drawingName: 'mouth_X', phonemes: [] }
    ],
    expressions: [
      { expressionId: 'neutral', controllerOverrides: [] },
      { expressionId: 'surprise', controllerOverrides: [{ controllerId: 'MOUTH_OPEN', value: 0.9 }] }
    ],
    gestureLibrary: [],
    paletteRef: 'palette_main_v1',
    provenance: { ...approver, rigAuthor: 'rigger_a', licensePath: 'legal/contracts/mira.pdf' }
  };

  const cameraRules: CameraRules = {
    schemaVersion: '1.0',
    allowedShotSizes: ['close_up', 'medium_shot', 'full_shot'],
    allowedCameraMoves: ['static', 'pan_left', 'dolly_in'],
    defaultShotSize: 'medium_shot',
    safeMargins: { top: 0.05, bottom: 0.05, left: 0.05, right: 0.05 },
    forbiddenMoves: ['crane_up'],
    provenance: approver
  };

  const motionGrammar: MotionGrammar = {
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
        timing: { minHoldFrames: 2, maxHoldFrames: 48, anticipationFrames: 4, followThroughFrames: 6 }
      }
    ],
    defaultTiming: { fps: 24, minBeatFrames: 2, maxBeatFrames: 96 },
    provenance: approver
  };

  const qaThresholds: QaThresholds = {
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
    provenance: approver
  };

  const showBible: ShowBible = {
    schemaVersion: SHOW_BIBLE_SCHEMA_VERSION,
    showId: 'polygon_show_v1',
    title: 'Polygon Show',
    logLine: 'One character, one room, one gesture at a time.',
    fps: 24,
    resolution: { width: 1920, height: 1080 },
    visualStyle: 'flat editorial, warm monochrome',
    lineRules: { defaultThicknessPt: 2.0, lineColourId: 'line_main', fillColourId: 'fill_skin' },
    lighting: { type: 'soft_top_left', shadowColourId: 'shadow_soft' },
    allowedDeformations: ['peg_transform', 'drawing_substitution'],
    characterBibles: [{ characterId: 'char_main_v1', ref: 'show/character_bible_mira.json' }],
    paletteManifestRef: 'show/palette_manifest.json',
    cameraRulesRef: 'show/camera_rules.json',
    motionGrammarRef: 'show/motion_grammar.json',
    qaThresholdsRef: 'show/qa_thresholds.json',
    forbiddenSources: ['NC', 'third_party_series'],
    provenance: approver
  };

  it('validates a complete ShowBible family', () => {
    expect(showBibleSchema.safeParse(showBible).success).toBe(true);
    expect(characterBibleSchema.safeParse(character).success).toBe(true);
    expect(paletteManifestSchema.safeParse(palette).success).toBe(true);
    expect(cameraRulesSchema.safeParse(cameraRules).success).toBe(true);
    expect(motionGrammarSchema.safeParse(motionGrammar).success).toBe(true);
    expect(qaThresholdsSchema.safeParse(qaThresholds).success).toBe(true);
  });

  it('rejects a ShowBible with an invalid deformation type', () => {
    const bad = { ...showBible, allowedDeformations: ['teleport'] as any };
    expect(showBibleSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a CharacterBible with no controllers', () => {
    const bad = { ...character, controllers: [] };
    expect(characterBibleSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a palette colour with bad RGBA', () => {
    const bad = { ...palette, colours: [{ ...palette.colours[0], rgba: 'red' }] };
    expect(paletteManifestSchema.safeParse(bad).success).toBe(false);
  });

  it('assertShowBibleVersion passes for v1 and throws for v2', () => {
    expect(assertShowBibleVersion(showBible)).toEqual({ major: 1, minor: 0 });
    expect(() => assertShowBibleVersion({ schemaVersion: '2.0' })).toThrow();
  });
});