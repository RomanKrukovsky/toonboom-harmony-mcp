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
  }
];
