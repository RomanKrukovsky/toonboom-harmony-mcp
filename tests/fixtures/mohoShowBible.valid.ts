import type { MohoPaletteManifest } from '../../src/schemas/mohoPaletteManifest';
import type { MohoCharacterBible } from '../../src/schemas/mohoCharacterBible';
import type { MohoCameraRules } from '../../src/schemas/mohoCameraRules';
import type { MohoMotionGrammar } from '../../src/schemas/mohoMotionGrammar';
import type { MohoQaThresholds } from '../../src/schemas/mohoQaThresholds';
import type { MohoShowBible } from '../../src/schemas/mohoShowBible';
import type { AssetLicense } from '../../src/schemas/assetLicense';

export const VALID_DATE = '2026-01-01T00:00:00.000Z';

export function validMohoProvenance(): { approver: string; approvedAt: string } {
  return { approver: 'test-artist', approvedAt: VALID_DATE };
}

export function validMohoPaletteManifest(): MohoPaletteManifest {
  return {
    schemaVersion: '1.0',
    paletteId: 'palette_test_v1',
    name: 'Test Palette',
    paletteType: 'rgb',
    maxColours: 256,
    colours: [
      {
        colourId: 'char_skin_base',
        name: 'Skin Base',
        rgba: '#F5C9A6FF',
        usage: 'skin',
        locked: true,
        mohoColourIndex: 0
      },
      {
        colourId: 'char_hair_base',
        name: 'Hair Base',
        rgba: '#3B2A1FFF',
        usage: 'hair',
        locked: true,
        mohoColourIndex: 1
      },
      {
        colourId: 'char_line',
        name: 'Line',
        rgba: '#111111FF',
        usage: 'line',
        locked: true,
        mohoColourIndex: 2
      },
      {
        colourId: 'char_shadow',
        name: 'Shadow',
        rgba: '#7A4A2BFF',
        usage: 'shadow',
        locked: true,
        mohoColourIndex: 3
      },
      {
        colourId: 'char_fill',
        name: 'Fill',
        rgba: '#E07A5FFF',
        usage: 'fill',
        locked: true,
        mohoColourIndex: 4
      }
    ],
    provenance: {
      approver: 'test-artist',
      approvedAt: VALID_DATE
    }
  } as const;
}

export function validMohoCharacterBible(rigType: 'humanoid_2leg' | 'quadruped' | 'creature' | 'mechanical' = 'humanoid_2leg'): MohoCharacterBible {
  if (rigType === 'quadruped') return validMohoCharacterBibleQuadruped();
  if (rigType === 'creature') return validMohoCharacterBibleCreature();
  if (rigType === 'mechanical') return validMohoCharacterBibleMechanical();
  return {
    schemaVersion: '1.0',
    characterId: 'char_test_humanoid',
    name: 'Test Humanoid',
    role: 'protagonist',
    rigType: 'humanoid_2leg',
    rigPath: 'rigs/char_test_humanoid.moho',
    turnaroundViews: ['front', 'front_3q_left', 'side_left', 'back_3q_left', 'back', 'back_3q_right', 'side_right', 'front_3q_right'],
    proportions: {
      headHeightRatio: 0.25,
      armSpanRatio: 1.0
    },
    lineRules: {
      lineThicknessPt: 2.0,
      lineColourId: 'char_line'
    },
    controllers: [
      {
        controllerId: 'HEAD_ROT',
        boneId: 0,
        boneName: 'head_root',
        purpose: 'Head rotation',
        range: { min: -45, max: 45, units: 'degrees' },
        channel: 'rotation'
      },
      {
        controllerId: 'BODY_TRANSLATE',
        boneId: 1,
        boneName: 'body_root',
        purpose: 'Body translation',
        range: { min: -200, max: 200, units: 'pixels' },
        channel: 'translation'
      },
      {
        controllerId: 'LEFT_ARM_ROT',
        boneId: 2,
        boneName: 'arm_left',
        purpose: 'Left arm rotation',
        range: { min: -90, max: 180, units: 'degrees' },
        channel: 'rotation'
      },
      {
        controllerId: 'RIGHT_ARM_ROT',
        boneId: 3,
        boneName: 'arm_right',
        purpose: 'Right arm rotation',
        range: { min: -180, max: 90, units: 'degrees' },
        channel: 'rotation'
      },
      {
        controllerId: 'MOUTH_DIAL',
        boneId: 4,
        boneName: 'mouth_dial',
        purpose: 'Mouth smart-bone dial',
        range: { min: 0, max: 1, units: 'normalized' },
        channel: 'scale',
        libraryRef: 'mouth_phonemes'
      },
      {
        controllerId: 'EYE_BLINK',
        boneId: 5,
        boneName: 'eye_blink',
        layerName: 'Eye',
        purpose: 'Eye blink switch',
        range: { min: 0, max: 1, units: 'normalized' },
        channel: 'opacity'
      }
    ],
    switchLayers: [
      {
        switchId: 'mouth_switch',
        layerName: 'Mouth',
        choices: [
          { choiceId: 'rest', drawingName: 'mouth_rest' },
          { choiceId: 'a', drawingName: 'mouth_A' },
          { choiceId: 'b', drawingName: 'mouth_B' },
          { choiceId: 'c', drawingName: 'mouth_C' },
          { choiceId: 'd', drawingName: 'mouth_D' },
          { choiceId: 'e', drawingName: 'mouth_E' },
          { choiceId: 'f', drawingName: 'mouth_F' },
          { choiceId: 'g', drawingName: 'mouth_G' },
          { choiceId: 'l', drawingName: 'mouth_L' },
          { choiceId: 'o', drawingName: 'mouth_O' },
          { choiceId: 'smile', drawingName: 'mouth_Smile' },
          { choiceId: 'frown', drawingName: 'mouth_Frown' },
          { choiceId: 'open', drawingName: 'mouth_open' },
          { choiceId: 'wide', drawingName: 'mouth_wide' }
        ]
      },
      {
        switchId: 'eye_switch',
        layerName: 'Eye',
        choices: [
          { choiceId: 'open', drawingName: 'eye_open' },
          { choiceId: 'closed', drawingName: 'eye_closed' },
          { choiceId: 'wide', drawingName: 'eye_wide' }
        ]
      }
    ],
    mouthShapes: [
      { shapeId: 'Rest', drawingName: 'mouth_rest', phonemes: [] },
      { shapeId: 'A', drawingName: 'mouth_A', phonemes: ['a', 'æ'] },
      { shapeId: 'B', drawingName: 'mouth_B', phonemes: ['b', 'm', 'p'] },
      { shapeId: 'C', drawingName: 'mouth_C', phonemes: ['k', 'g', 's'] },
      { shapeId: 'D', drawingName: 'mouth_D', phonemes: ['d', 't', 'n'] },
      { shapeId: 'E', drawingName: 'mouth_E', phonemes: ['e'] },
      { shapeId: 'F', drawingName: 'mouth_F', phonemes: ['f', 'v'] },
      { shapeId: 'G', drawingName: 'mouth_G', phonemes: ['g', 'h'] },
      { shapeId: 'L', drawingName: 'mouth_L', phonemes: ['l'] },
      { shapeId: 'O', drawingName: 'mouth_O', phonemes: ['o', 'ɔ'] },
      { shapeId: 'Smile', drawingName: 'mouth_Smile', phonemes: [] },
      { shapeId: 'Frown', drawingName: 'mouth_Frown', phonemes: [] }
    ],
    expressions: [
      {
        expressionId: 'neutral',
        drawingName: 'expr_neutral',
        controllerOverrides: []
      },
      {
        expressionId: 'happy',
        drawingName: 'expr_happy',
        controllerOverrides: [
          { controllerId: 'MOUTH_DIAL', value: 0.7 },
          { controllerId: 'EYE_BLINK', value: 0.5 }
        ]
      }
    ],
    gestureLibrary: [
      {
        gestureId: 'wave',
        durationFrames: 24,
        controllerTrackRef: 'RIGHT_ARM_ROT'
      },
      {
        gestureId: 'nod',
        durationFrames: 18,
        controllerTrackRef: 'HEAD_ROT'
      }
    ],
    paletteRef: 'palette_test_v1',
    provenance: {
      approver: 'test-artist',
      approvedAt: VALID_DATE,
      rigAuthor: 'test-rigger',
      licensePath: 'licenses/char_test_humanoid.license.json'
    }
  };
}

export function validMohoCharacterBibleQuadruped(): MohoCharacterBible {
  return {
    schemaVersion: '1.0',
    characterId: 'char_test_quadruped',
    name: 'Test Quadruped',
    role: 'supporting',
    rigType: 'quadruped',
    rigPath: 'rigs/char_test_quadruped.moho',
    turnaroundViews: ['front', 'side_left', 'back', 'side_right'],
    proportions: {
      headHeightRatio: 0.4,
      armSpanRatio: 0.9
    },
    lineRules: {
      lineThicknessPt: 2.5,
      lineColourId: 'char_line'
    },
    controllers: [
      { controllerId: 'HEAD_ROT', boneId: 0, boneName: 'head_root', purpose: 'Head rotation', range: { min: -30, max: 30, units: 'degrees' }, channel: 'rotation' },
      { controllerId: 'EAR_L_ROT', boneId: 1, boneName: 'ear_left', purpose: 'Left ear rotation', range: { min: -45, max: 45, units: 'degrees' }, channel: 'rotation' },
      { controllerId: 'EAR_R_ROT', boneId: 2, boneName: 'ear_right', purpose: 'Right ear rotation', range: { min: -45, max: 45, units: 'degrees' }, channel: 'rotation' },
      { controllerId: 'TAIL_ROT', boneId: 3, boneName: 'tail_root', purpose: 'Tail rotation', range: { min: -90, max: 90, units: 'degrees' }, channel: 'rotation' },
      { controllerId: 'LEG_FL_ROT', boneId: 4, boneName: 'leg_front_left', purpose: 'Front-left leg rotation', range: { min: -60, max: 60, units: 'degrees' }, channel: 'rotation' },
      { controllerId: 'LEG_FR_ROT', boneId: 5, boneName: 'leg_front_right', purpose: 'Front-right leg rotation', range: { min: -60, max: 60, units: 'degrees' }, channel: 'rotation' },
      { controllerId: 'LEG_BL_ROT', boneId: 6, boneName: 'leg_back_left', purpose: 'Back-left leg rotation', range: { min: -60, max: 60, units: 'degrees' }, channel: 'rotation' },
      { controllerId: 'LEG_BR_ROT', boneId: 7, boneName: 'leg_back_right', purpose: 'Back-right leg rotation', range: { min: -60, max: 60, units: 'degrees' }, channel: 'rotation' }
    ],
    switchLayers: [
      {
        switchId: 'tail_switch',
        layerName: 'TailPose',
        choices: [
          { choiceId: 'straight', drawingName: 'tail_straight' },
          { choiceId: 'curled', drawingName: 'tail_curled' }
        ]
      }
    ],
    mouthShapes: [],
    expressions: [
      { expressionId: 'neutral', drawingName: 'expr_neutral', controllerOverrides: [] },
      { expressionId: 'alert', drawingName: 'expr_alert', controllerOverrides: [{ controllerId: 'EAR_L_ROT', value: 0.8 }, { controllerId: 'EAR_R_ROT', value: 0.8 }] }
    ],
    gestureLibrary: [
      { gestureId: 'sit', durationFrames: 30, controllerTrackRef: 'LEG_BL_ROT' },
      { gestureId: 'bark', durationFrames: 12, controllerTrackRef: 'HEAD_ROT' }
    ],
    paletteRef: 'palette_test_v1',
    provenance: {
      approver: 'test-artist',
      approvedAt: VALID_DATE,
      rigAuthor: 'test-rigger',
      licensePath: 'licenses/char_test_quadruped.license.json'
    }
  };
}

export function validMohoCharacterBibleCreature(): MohoCharacterBible {
  return {
    schemaVersion: '1.0',
    characterId: 'char_test_creature',
    name: 'Test Creature',
    role: 'antagonist',
    rigType: 'creature',
    rigPath: 'rigs/char_test_creature.moho',
    turnaroundViews: ['front', 'front_3q_left', 'side_left', 'back_3q_right', 'side_right', 'front_3q_right'],
    proportions: {
      headHeightRatio: 0.3,
      armSpanRatio: 1.2
    },
    lineRules: {
      lineThicknessPt: 3.0,
      lineColourId: 'char_line'
    },
    controllers: [
      { controllerId: 'TENTACLE_1', boneId: 0, boneName: 'tentacle_01', purpose: 'Tentacle 1', range: { min: -180, max: 180, units: 'degrees' }, channel: 'rotation' },
      { controllerId: 'TENTACLE_2', boneId: 1, boneName: 'tentacle_02', purpose: 'Tentacle 2', range: { min: -180, max: 180, units: 'degrees' }, channel: 'rotation' },
      { controllerId: 'TENTACLE_3', boneId: 2, boneName: 'tentacle_03', purpose: 'Tentacle 3', range: { min: -180, max: 180, units: 'degrees' }, channel: 'rotation' },
      { controllerId: 'TENTACLE_4', boneId: 3, boneName: 'tentacle_04', purpose: 'Tentacle 4', range: { min: -180, max: 180, units: 'degrees' }, channel: 'rotation' },
      { controllerId: 'HEAD_ROT', boneId: 4, boneName: 'head_root', purpose: 'Head rotation', range: { min: -60, max: 60, units: 'degrees' }, channel: 'rotation' }
    ],
    switchLayers: [
      {
        switchId: 'tentacle_count',
        layerName: 'TentacleLayer',
        choices: [
          { choiceId: 'six', drawingName: 'tentacles_6' },
          { choiceId: 'eight', drawingName: 'tentacles_8' }
        ]
      }
    ],
    mouthShapes: [],
    expressions: [
      { expressionId: 'neutral', drawingName: 'expr_neutral', controllerOverrides: [] },
      { expressionId: 'menace', drawingName: 'expr_menace', controllerOverrides: [{ controllerId: 'TENTACLE_1', value: 45 }, { controllerId: 'TENTACLE_2', value: -45 }] }
    ],
    gestureLibrary: [
      { gestureId: 'grab', durationFrames: 36, controllerTrackRef: 'TENTACLE_1' },
      { gestureId: 'retreat', durationFrames: 48, controllerTrackRef: 'TENTACLE_4' }
    ],
    paletteRef: 'palette_test_v1',
    provenance: {
      approver: 'test-artist',
      approvedAt: VALID_DATE,
      rigAuthor: 'test-rigger',
      licensePath: 'licenses/char_test_creature.license.json'
    }
  };
}

export function validMohoCharacterBibleMechanical(): MohoCharacterBible {
  return {
    schemaVersion: '1.0',
    characterId: 'char_test_mechanical',
    name: 'Test Mechanical',
    role: 'supporting',
    rigType: 'mechanical',
    rigPath: 'rigs/char_test_mechanical.moho',
    turnaroundViews: ['front', 'side_left', 'back', 'side_right'],
    proportions: {
      headHeightRatio: 0.35,
      armSpanRatio: 1.1
    },
    lineRules: {
      lineThicknessPt: 2.0,
      lineColourId: 'char_line'
    },
    controllers: [
      { controllerId: 'PISTON_L', boneId: 0, boneName: 'piston_left', purpose: 'Left piston extension', range: { min: 0, max: 100, units: 'pixels' }, channel: 'translation' },
      { controllerId: 'PISTON_R', boneId: 1, boneName: 'piston_right', purpose: 'Right piston extension', range: { min: 0, max: 100, units: 'pixels' }, channel: 'translation' },
      { controllerId: 'SPLINE_BODY', boneId: 2, boneName: 'spline_body', purpose: 'Body spline curve', range: { min: -1, max: 1, units: 'normalized' }, channel: 'scale' },
      { controllerId: 'HEAD_ROT', boneId: 3, boneName: 'head_root', purpose: 'Head rotation', range: { min: -90, max: 90, units: 'degrees' }, channel: 'rotation' }
    ],
    switchLayers: [],
    mouthShapes: [],
    expressions: [
      { expressionId: 'idle', drawingName: 'expr_idle', controllerOverrides: [] },
      { expressionId: 'action', drawingName: 'expr_action', controllerOverrides: [{ controllerId: 'PISTON_L', value: 100 }, { controllerId: 'PISTON_R', value: 100 }] }
    ],
    gestureLibrary: [
      { gestureId: 'extend', durationFrames: 20, controllerTrackRef: 'PISTON_L' },
      { gestureId: 'bend', durationFrames: 24, controllerTrackRef: 'SPLINE_BODY' }
    ],
    paletteRef: 'palette_test_v1',
    provenance: {
      approver: 'test-artist',
      approvedAt: VALID_DATE,
      rigAuthor: 'test-rigger',
      licensePath: 'licenses/char_test_mechanical.license.json'
    }
  };
}

export function validMohoCameraRules(): MohoCameraRules {
  return {
    schemaVersion: '1.0',
    rulesId: 'camera_rules_test_v1',
    allowedShotSizes: [
      'extreme_close_up',
      'close_up',
      'medium_close_up',
      'medium_shot',
      'medium_full_shot',
      'full_shot',
      'long_shot',
      'extreme_long_shot'
    ],
    allowedCameraMoves: [
      'static',
      'pan_left',
      'pan_right',
      'tilt_up',
      'tilt_down',
      'dolly_in',
      'dolly_out',
      'truck_left',
      'truck_right',
      'pedestal_up',
      'pedestal_down',
      'zoom_in',
      'zoom_out',
      'arc_left',
      'arc_right',
      'crane_up'
    ],
    defaultShotSize: 'medium_shot',
    safeMargins: {
      top: 0.1,
      bottom: 0.1,
      left: 0.1,
      right: 0.1
    },
    forbiddenMoves: ['vertigo_dolly', 'whip_pan', 'handheld_jitter'],
    mohoCameraRigType: 'perspective',
    maxFieldOfViewDeg: 45,
    allowCameraShake: false,
    provenance: {
      approver: 'test-artist',
      approvedAt: VALID_DATE
    }
  };
}

export function validMohoMotionGrammar(): MohoMotionGrammar {
  return {
    schemaVersion: '1.0',
    grammarId: 'motion_grammar_test_v1',
    rules: [
      {
        ruleId: 'idle_sway',
        description: 'Subtle weight shift when a character stands still.',
        allowedGestures: ['breathe', 'micro_sway'],
        forbiddenGestures: ['fidget', 'full_turn'],
        allowedEmotions: ['neutral', 'calm'],
        poseLibraryRefs: ['pose_relaxed_standing', 'pose_weight_left'],
        timing: {
          minHoldFrames: 4,
          maxHoldFrames: 24,
          anticipationFrames: 0,
          followThroughFrames: 6
        },
        boneConstraints: [
          { boneName: 'spine', minAngleDeg: -10, maxAngleDeg: 10 },
          { boneName: 'head_root', minAngleDeg: -5, maxAngleDeg: 5 }
        ],
        physicsChannels: ['spring', 'damping']
      },
      {
        ruleId: 'walk_cycle',
        description: 'Standard alternating walk cycle for biped locomotion.',
        allowedGestures: ['walk_step', 'arm_swing'],
        forbiddenGestures: ['run', 'jump'],
        allowedEmotions: ['neutral', 'happy', 'determined'],
        poseLibraryRefs: ['pose_contact_left', 'pose_contact_right', 'pose_pass_left', 'pose_pass_right'],
        timing: {
          minHoldFrames: 2,
          maxHoldFrames: 12,
          anticipationFrames: 2,
          followThroughFrames: 4
        },
        boneConstraints: [
          { boneName: 'leg_left', minAngleDeg: -45, maxAngleDeg: 45 },
          { boneName: 'leg_right', minAngleDeg: -45, maxAngleDeg: 45 }
        ],
        physicsChannels: ['spring', 'damping', 'mass', 'gravity']
      },
      {
        ruleId: 'dialogue_emphasis',
        description: 'Head and hand accents on stressed syllables.',
        allowedGestures: ['head_tilt', 'hand_gesture_small'],
        forbiddenGestures: ['head_shake', 'full_body_turn'],
        allowedEmotions: ['happy', 'angry', 'sad', 'surprised'],
        poseLibraryRefs: ['pose_emphasis_a', 'pose_emphasis_b'],
        timing: {
          minHoldFrames: 2,
          maxHoldFrames: 8,
          anticipationFrames: 1,
          followThroughFrames: 3
        },
        boneConstraints: [
          { boneName: 'head_root', minAngleDeg: -20, maxAngleDeg: 20 }
        ],
        physicsChannels: ['spring']
      }
    ],
    defaultTiming: {
      fps: 24,
      minBeatFrames: 2,
      maxBeatFrames: 48
    },
    defaultEasing: 'ease_in_out',
    provenance: {
      approver: 'test-artist',
      approvedAt: VALID_DATE
    }
  };
}

export function validMohoQaThresholds(): MohoQaThresholds {
  return {
    schemaVersion: '1.0',
    thresholdsId: 'qa_thresholds_test_v1',
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
    provenance: {
      approver: 'test-artist',
      approvedAt: VALID_DATE
    }
  };
}

export function validMohoShowBible(opts?: {
  allowedRigTypes?: ('humanoid_2leg' | 'quadruped' | 'creature' | 'mechanical')[];
  characterId?: string;
  rigType?: 'humanoid_2leg' | 'quadruped' | 'creature' | 'mechanical';
}): MohoShowBible {
  const allowedRigTypes = opts?.allowedRigTypes ?? ['humanoid_2leg', 'quadruped', 'creature', 'mechanical'];
  const characterId = opts?.characterId ?? 'char_test_humanoid';
  const rigType = opts?.rigType ?? 'humanoid_2leg';
  return {
    schemaVersion: '1.0',
    showId: 'show_test_v1',
    title: 'Test Show',
    logLine: 'A test production validating Moho bible schemas.',
    fps: 24,
    resolution: { width: 1920, height: 1080 },
    visualStyle: '2D vector, limited animation, ink-and-fill hybrid.',
    lineRules: {
      defaultThicknessPt: 2.0,
      lineColourId: 'char_line',
      fillColourId: 'char_fill'
    },
    lighting: {
      type: 'soft_top_left',
      shadowColourId: 'char_shadow'
    },
    allowedDeformations: [
      'peg_transform',
      'curve_deformer',
      'envelope_deformer',
      'bone_deformer',
      'drawing_substitution',
      'frame_by_frame_vector',
      'smart_bone_dial',
      'mesh_warp',
      'vitruvian_group'
    ],
    allowedRigTypes,
    characterBibles: [
      {
        characterId,
        ref: `bibles/${characterId}.json`
      }
    ],
    paletteManifestRef: 'bibles/palette_manifest.json',
    cameraRulesRef: 'bibles/camera_rules.json',
    motionGrammarRef: 'bibles/motion_grammar.json',
    qaThresholdsRef: 'bibles/qa_thresholds.json',
    forbiddenSources: ['NC', 'third_party_series'],
    provenance: {
      approver: 'test-artist',
      approvedAt: VALID_DATE
    }
  };
}

export function validAssetLicense(): AssetLicense {
  return {
    schemaVersion: '1.0',
    assetId: 'char_test_humanoid',
    creator: 'test-rigger',
    source: 'commission',
    license: 'exclusive commercial assignment',
    commercialUse: true,
    modificationAllowed: true,
    datasetUseAllowed: true,
    redistributionAllowed: false,
    contractPath: 'contracts/char_test_humanoid.pdf',
    forbiddenTags: [],
    sha256: '0000000000000000000000000000000000000000000000000000000000000000',
    notes: 'Test fixture licence.'
  };
}
