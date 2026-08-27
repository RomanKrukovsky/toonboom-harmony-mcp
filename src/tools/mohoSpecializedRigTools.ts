import { z } from 'zod';
import { MohoQuadrupedRigEngine } from '../services/mohoQuadrupedRigEngine/index.js';
import { MohoMechanicalPistonBuilder } from '../services/mohoMechanicalPistonBuilder/index.js';
import { MohoSplineTentacleEngine } from '../services/mohoSplineTentacleEngine/index.js';
import { MohoPsdImageLayerIngest } from '../services/mohoPsdImageLayerIngest/index.js';
import { MohoTrajectorySquashEngine } from '../services/mohoTrajectorySquashEngine/index.js';
import { MohoSmearSynthesizer } from '../services/mohoSmearSynthesizer/index.js';
import { MohoNativeBridge } from '../services/mohoNativeBridge/index.js';

export const mohoSpecializedRigTools = [
  {
    name: 'moho.rig.build_quadruped_rig',
    description:
      'Создает полноценный продакшн-риг для четвероногих животных (собаки, кошки, лошади) со скакательными суставами лап, физикой хвоста и мордой (по эталону Pioneer Pesel.moho).',
    inputSchema: z.object({
      animalName: z.string().default('Dog'),
      bodyLengthPx: z.number().default(180),
      tailSegments: z.number().default(5),
      includeEarDials: z.boolean().default(true)
    }),
    handler: async (args: {
      animalName?: string;
      bodyLengthPx?: number;
      tailSegments?: number;
      includeEarDials?: boolean;
    }) => {
      const rig = MohoQuadrupedRigEngine.buildQuadrupedRig({
        animalName: args.animalName,
        bodyLengthPx: args.bodyLengthPx,
        tailSegments: args.tailSegments,
        includeEarDials: args.includeEarDials
      });
      return { status: 'success', quadrupedRig: rig };
    }
  },
  {
    name: 'moho.rig.build_mechanical_pistons',
    description:
      'Строит жесткие гидравлические поршни и приводы роботов с взаимным Look-At таргетом без растяжения геометрии (по эталону Robo.moho).',
    inputSchema: z.object({
      pistonName: z.string().default('Arm_Piston'),
      baseJointPos: z.tuple([z.number(), z.number()]).default([0, 100]),
      rodJointPos: z.tuple([z.number(), z.number()]).default([50, 40]),
      cylinderLengthPx: z.number().default(40),
      rodLengthPx: z.number().default(40)
    }),
    handler: async (args: {
      pistonName?: string;
      baseJointPos?: [number, number];
      rodJointPos?: [number, number];
      cylinderLengthPx?: number;
      rodLengthPx?: number;
    }) => {
      const piston = MohoMechanicalPistonBuilder.buildPistonPair({
        pistonName: args.pistonName ?? 'Arm_Piston',
        baseJointPos: args.baseJointPos ?? [0, 100],
        rodJointPos: args.rodJointPos ?? [50, 40],
        cylinderLengthPx: args.cylinderLengthPx ?? 40,
        rodLengthPx: args.rodLengthPx ?? 40
      });
      return { status: 'success', piston };
    }
  },
  {
    name: 'moho.rig.build_spline_tentacle',
    description:
      'Создает гибкие многосуставные сплайновые цепочки для щупалец, шлангов скафандров и хвостов с волновыми экшенами (по эталону alien.moho и astronaft.moho).',
    inputSchema: z.object({
      tentacleName: z.string().default('Tentacle_01'),
      startPos: z.tuple([z.number(), z.number()]).default([0, 0]),
      segmentCount: z.number().default(10),
      segmentLengthPx: z.number().default(20),
      baseAngleDeg: z.number().default(0)
    }),
    handler: async (args: {
      tentacleName?: string;
      startPos?: [number, number];
      segmentCount?: number;
      segmentLengthPx?: number;
      baseAngleDeg?: number;
    }) => {
      const tentacle = MohoSplineTentacleEngine.buildTentacleChain({
        tentacleName: args.tentacleName ?? 'Tentacle_01',
        startPos: args.startPos ?? [0, 0],
        segmentCount: args.segmentCount,
        segmentLengthPx: args.segmentLengthPx,
        baseAngleDeg: args.baseAngleDeg
      });
      return { status: 'success', tentacle };
    }
  },
  {
    name: 'moho.rig.ingest_raster_puppet',
    description:
      'Выполняет импорт растровых марионеток (PSD/PNG слоев) с автоматической генерацией Smart Mesh деформаторов (по эталону referee.moho и flet_devoka.moho).',
    inputSchema: z.object({
      puppetName: z.string().default('RefereePuppet'),
      layers: z.array(
        z.object({
          name: z.string(),
          imageFilePath: z.string(),
          originX: z.number().default(0),
          originY: z.number().default(0),
          widthPx: z.number().default(200),
          heightPx: z.number().default(300),
          parentBoneName: z.string().optional(),
          generateSmartMesh: z.boolean().default(true)
        })
      )
    }),
    handler: async (args: {
      puppetName?: string;
      layers: Array<{
        name: string;
        imageFilePath: string;
        originX: number;
        originY: number;
        widthPx: number;
        heightPx: number;
        parentBoneName?: string;
        generateSmartMesh?: boolean;
      }>;
    }) => {
      const puppet = MohoPsdImageLayerIngest.ingestPuppet(
        args.puppetName ?? 'RefereePuppet',
        args.layers
      );
      return { status: 'success', puppet };
    }
  },
  {
    name: 'moho.rig.build_trajectory_squash',
    description:
      'Рассчитывает динамический траекторный Squash & Stretch со сжатием строго по оси скорости движения и сохранением объема (по эталону Ball.moho).',
    inputSchema: z.object({
      objectName: z.string().default('BouncingBall'),
      trajectory: z.array(
        z.object({
          frame: z.number(),
          posX: z.number(),
          posY: z.number()
        })
      ),
      squashIntensity: z.number().default(0.5)
    }),
    handler: async (args: {
      objectName?: string;
      trajectory: Array<{ frame: number; posX: number; posY: number }>;
      squashIntensity?: number;
    }) => {
      const squash = MohoTrajectorySquashEngine.calculateTrajectorySquash(
        args.objectName ?? 'BouncingBall',
        args.trajectory,
        args.squashIntensity
      );
      return { status: 'success', squash };
    }
  },
  {
    name: 'moho.rig.synthesize_smear_frames',
    description:
      'Генерирует высокоскоростные смары (Motion Arc, Velocity Stretch, Multi-Ghosting, Whiplash S-Curves) и упаковывает их в Moho SwitchLayer с автоматической детекцией по траектории (Rust/Python/TS).',
    inputSchema: z.object({
      limbName: z.string().default('Arm_L'),
      trajectory: z.array(
        z.object({
          frame: z.number(),
          posX: z.number(),
          posY: z.number()
        })
      ).optional().describe('Траектория движения для автоматической детекции смаров.'),
      velocityThreshold: z.number().default(30.0),
      fillRgba: z.array(z.number()).length(4).default([240, 215, 195, 255])
    }),
    handler: async (args: {
      limbName?: string;
      trajectory?: Array<{ frame: number; posX: number; posY: number }>;
      velocityThreshold?: number;
      fillRgba?: number[];
    }) => {
      const name = args.limbName ?? 'Arm_L';
      const fill = args.fillRgba ?? [240, 215, 195, 255];
      const baseNormal = MohoNativeBridge.generateCapsuleShape({
        name: `${name}_Normal`,
        centerX: 0,
        centerY: 0,
        radiusX: 20,
        radiusY: 60,
        fillRgba: [fill[0], fill[1], fill[2], fill[3]],
        strokeWidth: 2.0,
        jointCapPadding: false
      });

      const pack = MohoSmearSynthesizer.buildSmearSwitchPack(name, baseNormal, fill);
      const detections = args.trajectory
        ? MohoSmearSynthesizer.detectSmears(args.trajectory, args.velocityThreshold ?? 30.0)
        : [];

      return {
        status: 'success',
        smearSwitchPack: pack,
        detectedSmearFrames: detections
      };
    }
  }
];
