import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { z } from 'zod';

const APPROVED_AT = '2026-01-01T00:00:00.000Z';

function buildShowBible(showId: string, title: string, rigTypes: Array<'humanoid_2leg' | 'quadruped' | 'creature' | 'mechanical'>) {
  const charIds = rigTypes.map((rt, i) => `${showId}_char_${rt}_${i + 1}`);
  return {
    schemaVersion: '1.0',
    showId,
    title,
    logLine: `${title} — сгенерированный scaffold, заполните logLine одним предложением.`,
    fps: 24,
    resolution: { width: 1920, height: 1080 },
    visualStyle: 'flat_vector_moho_pro — заполните описание стиля.',
    lineRules: {
      defaultThicknessPt: 1.5,
      lineColourId: 'line_main',
      fillColourId: 'fill_main'
    },
    lighting: {
      type: 'soft_top_left',
      shadowColourId: 'shadow_main'
    },
    allowedDeformations: [
      'peg_transform',
      'curve_deformer',
      'envelope_deformer',
      'bone_deformer',
      'drawing_substitution',
      'smart_bone_dial'
    ],
    allowedRigTypes: rigTypes,
    characterBibles: charIds.map((cid, idx) => ({
      characterId: cid,
      ref: `characters/${cid}/character_bible.json`
    })),
    paletteManifestRef: 'palette.json',
    cameraRulesRef: 'camera_rules.json',
    motionGrammarRef: 'motion_grammar.json',
    qaThresholdsRef: 'qa_thresholds.json',
    forbiddenSources: ['NC', 'NONCOMMERCIAL', 'third_party_series'],
    provenance: {
      approver: 'show_bible_scaffold',
      approvedAt: APPROVED_AT,
      notes: 'Сгенерировано moho.show_bible.scaffold. Заполните approver/approvedAt перед production.'
    },
    _charIds: charIds
  };
}

function buildPalette() {
  return {
    schemaVersion: '1.0',
    paletteId: 'main_palette_v1',
    name: 'Main Palette v1',
    paletteType: 'rgb',
    maxColours: 256,
    colours: [
      {
        colourId: 'line_main',
        name: 'Line Main',
        rgba: '#1A1A1AFF',
        usage: 'line',
        locked: true,
        mohoColourIndex: 0
      },
      {
        colourId: 'fill_main',
        name: 'Fill Main',
        rgba: '#FF8C6BFF',
        usage: 'skin',
        locked: true,
        mohoColourIndex: 1
      },
      {
        colourId: 'shadow_main',
        name: 'Shadow Main',
        rgba: '#3D2A4DFF',
        usage: 'shadow',
        locked: true,
        mohoColourIndex: 2
      },
      {
        colourId: 'bg_main',
        name: 'Background Main',
        rgba: '#F4E9D8FF',
        usage: 'background',
        locked: true,
        mohoColourIndex: 3
      },
      {
        colourId: 'accent_secondary',
        name: 'Accent Secondary',
        rgba: '#5BA8B5FF',
        usage: 'accent',
        locked: false,
        mohoColourIndex: 4
      }
    ],
    provenance: {
      approver: 'show_bible_scaffold',
      approvedAt: APPROVED_AT,
      notes: 'Сгенерировано автоматически. paletteId должен совпадать с character_bible.paletteRef.'
    }
  };
}

function buildCameraRules() {
  return {
    schemaVersion: '1.0',
    rulesId: 'main_camera_rules_v1',
    allowedShotSizes: [
      'extreme_close_up',
      'close_up',
      'medium_close_up',
      'medium_shot',
      'medium_full_shot',
      'full_shot',
      'long_shot'
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
      'arc_right'
    ],
    defaultShotSize: 'medium_shot',
    safeMargins: { top: 0.1, bottom: 0.1, left: 0.1, right: 0.1 },
    forbiddenMoves: ['handheld_shake_heavy', 'vertigo_dolly_zoom'],
    mohoCameraRigType: 'perspective',
    maxFieldOfViewDeg: 45,
    allowCameraShake: false,
    provenance: {
      approver: 'show_bible_scaffold',
      approvedAt: APPROVED_AT
    }
  };
}

function buildMotionGrammar() {
  return {
    schemaVersion: '1.0',
    grammarId: 'main_motion_grammar_v1',
    rules: [
      {
        ruleId: 'idle_breathing',
        description: 'Idle поза с дыханием и микро-движением для статичных кадров.',
        allowedGestures: ['idle', 'breathe', 'subtle_sway'],
        forbiddenGestures: ['run', 'jump'],
        allowedEmotions: ['neutral', 'calm'],
        poseLibraryRefs: ['poses/idle_neutral.moho_pose'],
        timing: {
          minHoldFrames: 8,
          maxHoldFrames: 48,
          anticipationFrames: 2,
          followThroughFrames: 4
        },
        boneConstraints: [],
        physicsChannels: ['spring', 'damping']
      },
      {
        ruleId: 'dialogue_medium',
        description: 'Диалоговая подача в medium_shot / medium_close_up.',
        allowedGestures: ['head_turn', 'subtle_hand', 'weight_shift'],
        forbiddenGestures: ['full_body_action'],
        allowedEmotions: ['neutral', 'happy', 'sad', 'angry', 'surprised'],
        poseLibraryRefs: ['poses/dialogue_neutral.moho_pose'],
        timing: {
          minHoldFrames: 2,
          maxHoldFrames: 24,
          anticipationFrames: 3,
          followThroughFrames: 6
        },
        boneConstraints: [
          { boneName: 'head', minAngleDeg: -30, maxAngleDeg: 30 },
          { boneName: 'spine_lower', minAngleDeg: -15, maxAngleDeg: 15 }
        ],
        physicsChannels: ['damping']
      }
    ],
    defaultTiming: {
      fps: 24,
      minBeatFrames: 2,
      maxBeatFrames: 96
    },
    defaultEasing: 'ease_in_out',
    provenance: {
      approver: 'show_bible_scaffold',
      approvedAt: APPROVED_AT
    }
  };
}

function buildQaThresholds() {
  return {
    schemaVersion: '1.0',
    thresholdsId: 'main_qa_thresholds_v1',
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
      approver: 'show_bible_scaffold',
      approvedAt: APPROVED_AT
    }
  };
}

function buildAssetLicense(assetId: string) {
  return {
    schemaVersion: '1.0',
    assetId,
    creator: 'TBD — укажите автора/исполнителя',
    source: 'commission',
    license: 'exclusive commercial assignment',
    commercialUse: true,
    modificationAllowed: true,
    datasetUseAllowed: true,
    redistributionAllowed: false,
    contractPath: `licenses/${assetId}/contract.pdf`,
    forbiddenTags: ['NC', 'SA'],
    notes: 'Сгенерировано moho.show_bible.scaffold. Замените creator/contractPath на реальные перед продакшеном.'
  };
}

function buildCharacterTemplate(charId: string, rigType: 'humanoid_2leg' | 'quadruped' | 'creature' | 'mechanical') {
  return {
    schemaVersion: '1.0',
    characterId: charId,
    name: charId.replace(/_/g, ' '),
    role: 'supporting',
    rigType,
    rigPath: `characters/${charId}/rig.moho`,
    turnaroundViews: ['front', 'front_3q_left', 'side_left', 'back_3q_left', 'back', 'back_3q_right', 'side_right', 'front_3q_right'],
    proportions: { headHeightRatio: 7, armSpanRatio: 1 },
    lineRules: {
      lineThicknessPt: 1.5,
      lineColourId: 'line_main'
    },
    controllers: [
      {
        controllerId: 'ctrl_head',
        boneId: 1,
        boneName: 'head',
        parentBoneName: 'spine_lower',
        restPose: { xPixels: 0, yPixels: 70, lengthPixels: 45, angleDeg: 0 },
        purpose: 'Контроллер головы (rotation XY).',
        range: { min: -45, max: 45, units: 'degrees' },
        channel: 'rotation'
      },
      {
        controllerId: 'ctrl_spine_lower',
        boneId: 2,
        boneName: 'spine_lower',
        restPose: { xPixels: 0, yPixels: 0, lengthPixels: 70, angleDeg: 90 },
        purpose: 'Наклон таза/корня.',
        range: { min: -20, max: 20, units: 'degrees' },
        channel: 'rotation'
      }
    ],
    switchLayers: [
      {
        switchId: 'mouth_set',
        layerName: 'mouth',
        choices: [
          { choiceId: 'rest', drawingName: 'mouth_rest' },
          { choiceId: 'a', drawingName: 'mouth_a' },
          { choiceId: 'o', drawingName: 'mouth_o' },
          { choiceId: 'smile', drawingName: 'mouth_smile' },
          { choiceId: 'open', drawingName: 'mouth_open' }
        ]
      }
    ],
    mouthShapes: [
      { shapeId: 'Rest', drawingName: 'mouth_rest', phonemes: [] },
      { shapeId: 'A', drawingName: 'mouth_a', phonemes: ['AA'] },
      { shapeId: 'O', drawingName: 'mouth_o', phonemes: ['OW'] },
      { shapeId: 'Smile', drawingName: 'mouth_smile', phonemes: [] }
    ],
    expressions: [
      { expressionId: 'neutral', drawingName: 'face_neutral', controllerOverrides: [] },
      { expressionId: 'happy', drawingName: 'face_happy', controllerOverrides: [] }
    ],
    gestureLibrary: [
      {
        gestureId: 'gesture_idle_breathe',
        durationFrames: 48,
        targetControllerId: 'ctrl_spine_lower',
        controllerTrackRef: 'tracks/idle_breathe.moho_track'
      }
    ],
    paletteRef: 'main_palette_v1',
    provenance: {
      approver: 'show_bible_scaffold',
      approvedAt: APPROVED_AT,
      rigAuthor: 'TBD',
      licensePath: `characters/${charId}/asset_license.json`
    }
  };
}

function computeFingerprint(bundle: {
  mohoShowBible: any;
  characterBibles: any[];
  cameraRules: any;
  motionGrammar: any;
  paletteManifest: any;
  qaThresholds: any;
}): string {
  const canonical = JSON.stringify(bundle, (_key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(value).sort()) sorted[k] = (value as Record<string, unknown>)[k];
      return sorted;
    }
    return value;
  });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

export const mohoShowBibleScaffoldTools = [
  {
    name: 'moho.show_bible.scaffold',
    description:
      'Сгенерировать на диске стартовый Moho ShowBible бандл (7 валидных JSON-документов: ' +
      'moho_show_bible.json, palette.json, camera_rules.json, motion_grammar.json, qa_thresholds.json, ' +
      'asset_license.json, опционально character_template.json). Каждый файл — валидная начальная точка ' +
      'схемы, которую пользователь дополняет. Возвращает fingerprint SHA-256 канонизированного бандла ' +
      'или список файлов в режиме dryRun. Удобно для инициализации нового шоу перед заполнением.',
    inputSchema: z.object({
      outputDir: z.string().describe('Директория, куда будут записаны JSON-файлы (создаётся рекурсивно).'),
      showId: z.string().min(1).describe('Stable show identifier, например "polygon_show_v1".'),
      title: z.string().min(1).describe('Человекочитаемое название шоу.'),
      rigTypes: z
        .array(z.enum(['humanoid_2leg', 'quadruped', 'creature', 'mechanical']))
        .min(1)
        .describe('Список допустимых типов ригов для шоу. Под каждый тип создаётся character_bible.'),
      includeCharacterTemplate: z
        .boolean()
        .default(false)
        .describe('Если true — дополнительно пишется character_template.json со скелетной character_bible.'),
      includeExamples: z
        .boolean()
        .default(false)
        .describe('Зарезервировано на будущее: добавлять ли примеры/демо-данные. Сейчас игнорируется.'),
      dryRun: z
        .boolean()
        .optional()
        .describe('Если true — файлы не пишутся, возвращается список filesToWrite.')
    }).strict(),
    handler: async (args: {
      outputDir: string;
      showId: string;
      title: string;
      rigTypes: Array<'humanoid_2leg' | 'quadruped' | 'creature' | 'mechanical'>;
      includeCharacterTemplate: boolean;
      includeExamples: boolean;
      dryRun?: boolean;
    }): Promise<
      | { status: 'success'; filesWritten: string[]; fingerprint: string }
      | { status: 'dry_run'; filesToWrite: string[] }
      | { status: 'error'; code: string; message: string }
    > => {
      try {
        const showBible = buildShowBible(args.showId, args.title, args.rigTypes);
        const palette = buildPalette();
        const cameraRules = buildCameraRules();
        const motionGrammar = buildMotionGrammar();
        const qaThresholds = buildQaThresholds();
        const assetLicense = buildAssetLicense(`${args.showId}_main`);

        const charIds: string[] = (showBible as any)._charIds;
        delete (showBible as any)._charIds;

        const files: Array<{ name: string; data: unknown }> = [
          { name: 'moho_show_bible.json', data: showBible },
          { name: 'palette.json', data: palette },
          { name: 'camera_rules.json', data: cameraRules },
          { name: 'motion_grammar.json', data: motionGrammar },
          { name: 'qa_thresholds.json', data: qaThresholds },
          { name: 'asset_license.json', data: assetLicense }
        ];

        let characterBibles: any[] = [];
        if (args.includeCharacterTemplate && charIds.length > 0) {
          const firstChar = charIds[0];
          const firstRigType = args.rigTypes[0];
          characterBibles = [buildCharacterTemplate(firstChar, firstRigType)];
          files.push({ name: 'character_template.json', data: characterBibles[0] });
        }

        const fileNames = files.map(f => f.name);

        if (args.dryRun) {
          return { status: 'dry_run', filesToWrite: fileNames.map(n => path.join(args.outputDir, n)) };
        }

        fs.mkdirSync(args.outputDir, { recursive: true });

        for (const f of files) {
          const target = path.join(args.outputDir, f.name);
          fs.writeFileSync(target, JSON.stringify(f.data, null, 2), 'utf8');
        }

        const fingerprint = computeFingerprint({
          mohoShowBible: showBible,
          characterBibles,
          cameraRules,
          motionGrammar,
          paletteManifest: palette,
          qaThresholds
        });

        return {
          status: 'success',
          filesWritten: fileNames.map(n => path.join(args.outputDir, n)),
          fingerprint
        };
      } catch (err: any) {
        return {
          status: 'error',
          code: err?.code ?? 'MOHO_SHOW_BIBLE_SCAFFOLD_FAILED',
          message: err?.message ?? String(err)
        };
      }
    }
  }
];
