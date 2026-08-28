import { z } from 'zod';
import { MohoJoystickBuilder } from '../services/mohoJoystickBuilder/index.js';
import { MohoLayerOrderSynthesizer } from '../services/mohoLayerOrderSynthesizer/index.js';
import { MohoPhysicsEngine } from '../services/mohoPhysicsEngine/index.js';
import { MohoPropAnchorSystem } from '../services/mohoPropAnchorSystem/index.js';
import { MohoPointMorphEngine } from '../services/mohoPointMorphEngine/index.js';

export const mohoAdvancedRigTools = [
  {
    name: 'moho.rig.build_2d_joystick_hud',
    description:
      'Создает 2D экранный джойстик (XY HUD Box) для лица, одновременно интерполирующий 9 поз головы, взгляда и бровей.',
    inputSchema: z.object({
      controllerName: z.string().default('Face_2D_Joystick'),
      hudPosition: z.tuple([z.number(), z.number()]).default([260, 320]),
      boxSize: z.number().default(80)
    }),
    handler: async (args: {
      controllerName?: string;
      hudPosition?: [number, number];
      boxSize?: number;
    }) => {
      const joystick = MohoJoystickBuilder.buildFaceJoystick({
        controllerName: args.controllerName,
        hudPosition: args.hudPosition,
        boxSize: args.boxSize
      });
      return { status: 'success', joystick };
    }
  },
  {
    name: 'moho.rig.synthesize_layer_sorting',
    description:
      'Генерирует Smart Bone диалы динамической пересортировки слоев (Arm Order / Leg Order) для скрещивания рук и захода за тело.',
    inputSchema: z.object({}),
    handler: async () => {
      const sorting = MohoLayerOrderSynthesizer.synthesizeSortingSystem();
      return { status: 'success', sorting };
    }
  },
  {
    name: 'moho.rig.configure_bone_physics',
    description:
      'Настраивает нативную пружинную физику костей (spring, damping, mass) для вторичного движения одежды, халатов и волос.',
    inputSchema: z.object({
      includeCoatPhysics: z.boolean().default(true),
      includeHairPhysics: z.boolean().default(true)
    }),
    handler: async (args: { includeCoatPhysics?: boolean; includeHairPhysics?: boolean }) => {
      const physics = MohoPhysicsEngine.configureCharacterPhysics({
        includeCoatPhysics: args.includeCoatPhysics,
        includeHairPhysics: args.includeHairPhysics
      });
      return { status: 'success', physics };
    }
  },
  {
    name: 'moho.rig.create_prop_anchor',
    description:
      'Создает кость динамического крепления предметов (Prop Anchor) с возможностью переключения удержания между правой рукой, левой рукой и миром.',
    inputSchema: z.object({
      propName: z.string().default('Prop_Gun'),
      defaultHand: z.enum(['Hand_R', 'Hand_L', 'World']).default('Hand_R')
    }),
    handler: async (args: { propName?: string; defaultHand?: 'Hand_R' | 'Hand_L' | 'World' }) => {
      const propAnchor = MohoPropAnchorSystem.createPropAnchor({
        propName: args.propName,
        defaultHand: args.defaultHand
      });
      return { status: 'success', propAnchor };
    }
  },
  {
    name: 'moho.rig.generate_point_morph',
    description:
      'Генерирует согласованную топологию точек (Vector Point Morphing) для непрерывного плавного поворота головы.',
    inputSchema: z.object({
      basePointsCount: z.number().default(12)
    }),
    handler: async (args: { basePointsCount?: number }) => {
      const morph = MohoPointMorphEngine.generateHeadMorph(args.basePointsCount);
      return { status: 'success', morph };
    }
  },
  {
    name: 'moho.rig.build_studio_master_character',
    description:
      'ГЕНЕРАТОР ЭТАЛОННОГО БРОАДКАСТ-РИГА MOHO. Создает полноценный production-grade риг персонажа (360° повороты, 2D XY джойстик лица, 2-Bone IK с таргет-пинами, 10 фонем рта, 6 поз рук, физика волос, смары и 4 готовых анимационных клипа) и компилирует готовый бинарный .moho файл.',
    inputSchema: z.object({
      characterName: z.string().default('HeroCharacter'),
      gender: z.enum(['male', 'female', 'neutral']).default('neutral'),
      skinColorRgba: z.array(z.number()).length(4).default([242, 210, 189, 255]),
      hairColorRgba: z.array(z.number()).length(4).default([55, 45, 40, 255]),
      shirtColorRgba: z.array(z.number()).length(4).default([65, 125, 220, 255]),
      pantsColorRgba: z.array(z.number()).length(4).default([45, 55, 75, 255]),
      shoesColorRgba: z.array(z.number()).length(4).default([30, 30, 30, 255]),
      outputPath: z.string().optional().describe('Путь для сохранения скомпилированного .moho файла')
    }),
    handler: async (args: any) => {
      const { MohoStudioMasterRigGenerator } = await import('../services/mohoStudioMasterRigGenerator/index.js');
      const result = MohoStudioMasterRigGenerator.generateMasterRig(args);
      return { status: 'success', masterRig: result };
    }
  },
  {
    name: 'moho.animation.synthesize_dialogue_acting',
    description:
      'АВТОМАТИЧЕСКАЯ АКТЕРСКАЯ ИГРА И ЛИПСИНГ. Синхронизирует реплику диалога с фонемной дорожкой рта (Preston Blair), эмоциональными микро-выражениями бровей и глаз, кивками головы в ритм речи и акцентной жестикуляцией рук.',
    inputSchema: z.object({
      speaker: z.string().default('HeroCharacter'),
      text: z.string().describe('Текст реплики для синтеза актерской игры.'),
      startFrame: z.number().default(1),
      endFrame: z.number().default(96),
      emotion: z.enum(['neutral', 'happy', 'angry', 'sad', 'surprised', 'scheming', 'sarcastic']).default('neutral'),
      fps: z.number().default(24)
    }),
    handler: async (args: any) => {
      const { MohoDialogueActingSynthesizer } = await import('../services/mohoDialogueActingSynthesizer/index.js');
      const performance = MohoDialogueActingSynthesizer.synthesizeActing({
        speaker: args.speaker,
        text: args.text,
        startFrame: args.startFrame,
        endFrame: args.endFrame,
        emotion: args.emotion
      }, args.fps ?? 24);
      return { status: 'success', performance };
    }
  },
  {
    name: 'moho.scene.choreograph_camera',
    description:
      'КИНЕМАТОГРАФИЧЕСКАЯ 2.5D КАМЕРА И МУЛЬТИПЛАН. Генерирует траектории камеры (Dramatic Push-In, Whip Pan, Tracking, Handheld Drift) с плавными кривыми Безье и расчетом слоев параллакса фона.',
    inputSchema: z.object({
      shotType: z.enum(['close_up', 'medium_shot', 'wide_shot', 'extreme_wide']).default('medium_shot'),
      moveStyle: z.enum(['static', 'dramatic_push_in', 'whip_pan', 'tracking_follow', 'handheld_drift']).default('dramatic_push_in'),
      startFrame: z.number().default(1),
      endFrame: z.number().default(72),
      targetCharacterPos: z.tuple([z.number(), z.number()]).default([0, 0]),
      zoomFactor: z.number().default(1.45),
      panDirection: z.enum(['left', 'right']).default('right')
    }),
    handler: async (args: any) => {
      const { MohoCameraChoreographer } = await import('../services/mohoCameraChoreographer/index.js');
      const cameraResult = MohoCameraChoreographer.choreographCamera({
        shotType: args.shotType,
        moveStyle: args.moveStyle,
        startFrame: args.startFrame,
        endFrame: args.endFrame,
        targetCharacterPos: args.targetCharacterPos,
        zoomFactor: args.zoomFactor,
        panDirection: args.panDirection
      });
      return { status: 'success', cameraResult };
    }
  },
  {
    name: 'moho.creature.build_bespoke_creature',
    description:
      'ГЕНЕРАТОР НЕСТАНДАРТНЫХ СУЩЕСТВ И МОНСТРОВ. Создает риги с произвольной анатомией: многоглазые гидры, многоножки, щупальца, аморфные слизни с радиальной Pin-сеткой сохранения объема и многослойные доспехи.',
    inputSchema: z.object({
      creatureName: z.string().default('TentacleHydra'),
      bodyType: z.enum(['soft_body_slime', 'chitin_armor', 'multi_limb_hydra', 'hybrid']).default('multi_limb_hydra'),
      limbs: z.array(
        z.object({
          name: z.string(),
          type: z.enum(['tentacle', 'spider_leg', 'wing', 'tail', 'fin']),
          segmentsCount: z.number().default(4),
          rootX: z.number(),
          rootY: z.number(),
          lengthPerSegment: z.number().default(25),
          angleDeg: z.number().default(90),
          hasPhysics: z.boolean().default(true),
          ikTarget: z.boolean().default(true)
        })
      ).default([]),
      heads: z.array(
        z.object({
          name: z.string(),
          rootBone: z.string().default('Body_Center'),
          offsetX: z.number().default(0),
          offsetY: z.number().default(120),
          radius: z.number().default(30),
          eyesCount: z.number().default(3),
          hasMouth: z.boolean().default(true)
        })
      ).default([]),
      softBodyPinsCount: z.number().default(8),
      outputPath: z.string().optional()
    }),
    handler: async (args: any) => {
      const { MohoBespokeCreatureBuilder } = await import('../services/mohoBespokeCreatureBuilder/index.js');
      const result = MohoBespokeCreatureBuilder.buildCreature(args);
      return { status: 'success', bespokeCreature: result };
    }
  },
  {
    name: 'moho.acting.parse_director_directives',
    description:
      'ПАРСЕР РЕЖИССЁРСКИХ РЕМАРОК И КОМЕДИЙНЫХ ГЭГОВ. Считывает указания из текста сценария в скобках (паузы, нервные подергивания, испуганные тейки, прищуры) и генерирует покадровые ключи комедийного тайминга.',
    inputSchema: z.object({
      scriptLine: z.string().describe('Строка сценария с ремарками, например: "МОРТИ: (пауза 3 сек, нервно дергает глазом) Ты уверен, Рик?"'),
      speaker: z.string().default('Character'),
      baseStartFrame: z.number().default(1)
    }),
    handler: async (args: any) => {
      const { MohoDirectorDirectivesParser } = await import('../services/mohoDirectorDirectivesParser/index.js');
      const result = MohoDirectorDirectivesParser.parseScriptLine(args.scriptLine, args.speaker, args.baseStartFrame);
      return { status: 'success', directiveActing: result };
    }
  },
  {
    name: 'moho.rig.ingest_smart_psd',
    description:
      'УМНЫЙ PSD-ИНЖЕСТ И СЕМАНТИЧЕСКИЙ КЛАССИФИКАТОР СЛОЁВ. Распознает части тела из многослойных PSD художников (даже с грязными/неименованными слоями Layer 1/Layer 2), добавляет круглое перекрытие суставов (+15%), настраивает иерархию костей с IK и компилирует готовый к анимации .moho проект.',
    inputSchema: z.object({
      psdPath: z.string().describe('Абсолютный или относительный путь к исходному PSD файлу художника'),
      characterName: z.string().optional().describe('Имя персонажа'),
      outputMohoPath: z.string().optional().describe('Куда сохранить готовый .moho файл')
    }),
    handler: async (args: { psdPath: string; characterName?: string; outputMohoPath?: string }) => {
      const { MohoSmartPsdSemanticParser } = await import('../services/mohoSmartPsdSemanticParser/index.js');
      const result = MohoSmartPsdSemanticParser.ingestPsdToRig(args);
      return { status: 'success', psdRigResult: result };
    }
  },
  {
    name: 'moho.qc.visual_feedback_loop',
    description:
      'ЗРИТЕЛЬНЫЙ КОНТУР САМОКОНТРОЛЯ И СТУДИЙНЫЙ QC ГЕЙТ. Headless-рендерит проект .moho, проверяет кадр на разрывы в суставах, соответствие границ холста, симметрию лица, корректность Z-глубины и выдает визуальный сертификат качества со скорингом от 0 до 100%.',
    inputSchema: z.object({
      mohoPath: z.string().describe('Путь к файлу .moho для визуального аудита'),
      outPreviewPng: z.string().optional().describe('Куда сохранить отрендеренное изображение превью')
    }),
    handler: async (args: { mohoPath: string; outPreviewPng?: string }) => {
      const { MohoVisualFeedbackLoop } = await import('../services/mohoVisualFeedbackLoop/index.js');
      const result = MohoVisualFeedbackLoop.runVisualAudit(args.mohoPath, args.outPreviewPng);
      return { status: 'success', visualAuditResult: result };
    }
  },
  {
    name: 'moho.speech.bake_phonemes',
    description:
      'АВТОМАТИЧЕСКИЙ БЕЙКЕР РЕЧЕВЫХ ФОНЕМ И ЛИПСИНГА. Принимает аудиодорожку или текст сценария, рассчитывает 10 фонем Престона Блэра, динамическую высоту открытия рта по громкости и питч бровей для Moho 14.',
    inputSchema: z.object({
      audioPath: z.string().optional().describe('Путь к аудиофайлу WAV или MP3'),
      transcriptText: z.string().optional().describe('Текст произносимой реплики'),
      durationSeconds: z.number().optional().describe('Длительность в секундах'),
      characterName: z.string().default('Character'),
      fps: z.number().default(24)
    }),
    handler: async (args: any) => {
      const { MohoSpeechPhonemeBaker } = await import('../services/mohoSpeechPhonemeBaker/index.js');
      const result = MohoSpeechPhonemeBaker.bakeSpeechTrack(args);
      return { status: 'success', speechTimeline: result };
    }
  },
  {
    name: 'moho.timeline.compose_broadcast_edit',
    description:
      'МОНТАЖНЫЙ ЭКСПОРТ ТАЙМЛАЙНА (OpenTimelineIO / FCPXML). Объединяет отрендеренные шоты Moho в единый монтажный таймлайн для DaVinci Resolve, Premiere Pro и Final Cut Pro с аудио-дорожками, титрами и переходами камеры.',
    inputSchema: z.object({
      timelineName: z.string().describe('Название таймлайна/эпизода'),
      shots: z.array(
        z.object({
          shotName: z.string(),
          durationFrames: z.number(),
          videoFilePath: z.string().optional(),
          audioDialoguePath: z.string().optional(),
          cameraMotionType: z.enum(['DramaticPushIn', 'WhipPan', 'TrackingShot', 'Static']).default('Static'),
          dialogueSubtitle: z.string().optional()
        })
      ),
      fps: z.number().default(24),
      outputOtioPath: z.string().optional(),
      outputXmlPath: z.string().optional()
    }),
    handler: async (args: any) => {
      const { MohoBroadcastTimelineComposer } = await import('../services/mohoBroadcastTimelineComposer/index.js');
      const result = MohoBroadcastTimelineComposer.composeTimeline(args);
      return { status: 'success', broadcastTimeline: result };
    }
  }
];
