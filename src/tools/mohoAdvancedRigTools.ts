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
  }
];
