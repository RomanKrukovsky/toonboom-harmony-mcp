import path from 'path';
import { z } from 'zod';
import {
  TURNAROUND_ANGLES,
  MohoProductionRigSpecSchema,
  type MohoProductionRigSpec
} from '../schemas/mohoProductionRig.js';
import { MohoTurnaroundBuilder } from '../services/mohoTurnaroundBuilder/index.js';
import { MohoSmartActionSynthesizer } from '../services/mohoSmartActionSynthesizer/index.js';
import { MohoVitruvianEngine } from '../services/mohoVitruvianEngine/index.js';
import { MohoMeshWarper } from '../services/mohoMeshWarper/index.js';
import { MohoShadowBuilder } from '../services/mohoShadowBuilder/index.js';
import { MohoAnimatorContractGate } from '../services/mohoAnimatorContractGate/index.js';
import { MohoProjectCompiler } from '../services/mohoProjectCompiler/index.js';
import { MohoLimbMirrorService } from '../services/mohoLimbMirrorService/index.js';
import { MohoLipsyncSynthesizer } from '../services/mohoLipsyncSynthesizer/index.js';
import { MohoTurnaroundIngestion } from '../services/mohoTurnaroundIngestion/index.js';
import { MohoAnimationLibrary } from '../services/mohoAnimationLibrary/index.js';
import { MohoScenePlanCompiler, type MohoShotPlanSpec } from '../services/mohoScenePlanCompiler/index.js';
import { verifyPathAccess } from '../security.js';

export const mohoRigTools = [
  {
    name: 'moho.rig.build_full_turnaround_rig',
    description:
      'Генерирует полную спецификацию 360° Turnaround Production Rig для Moho Pro (8 ракурсов, ' +
      'Smart Bone Dials, Vitruvian-группы, коррекции суставов, умная тень, контракт аниматора) ' +
      'и при необходимости компилирует готовый бинарный .moho проект.',
    inputSchema: z.object({
      characterId: z.string().default('char_moho_production_v1'),
      characterName: z.string().default('Character'),
      outputPath: z.string().optional().describe('Путь для сохранения готового .moho файла.'),
      includeHeadTurn: z.boolean().default(true),
      includeBodyTurn: z.boolean().default(true),
      includeVitruvianBones: z.boolean().default(true),
      includeSmartShadow: z.boolean().default(true)
    }),
    handler: async (args: {
      characterId?: string;
      characterName?: string;
      outputPath?: string;
      includeHeadTurn?: boolean;
      includeBodyTurn?: boolean;
      includeVitruvianBones?: boolean;
      includeSmartShadow?: boolean;
    }) => {
      const charName = args.characterName ?? 'Character';
      const charId = args.characterId ?? 'char_moho_production_v1';

      const turnaround = MohoTurnaroundBuilder.buildTurnaroundMatrix({
        characterName: charName,
        includeHead: args.includeHeadTurn,
        includeBody: args.includeBodyTurn
      });

      const vitruvian = args.includeVitruvianBones
        ? MohoVitruvianEngine.createStandardVitruvianGroups()
        : [];

      const jointCorrections = [
        {
          jointName: 'Elbow_L',
          boneName: 'Forearm_L',
          flexionAnglesDeg: [90, 135],
          bulgeBicepScale: 1.18,
          cuffDeformers: [{ name: 'Forearm_L_UP', angleOffsetDeg: 15, lengthPx: 20 }]
        },
        {
          jointName: 'Elbow_R',
          boneName: 'Forearm_R',
          flexionAnglesDeg: [90, 135],
          bulgeBicepScale: 1.18,
          cuffDeformers: [{ name: 'Forearm_R_UP', angleOffsetDeg: 15, lengthPx: 20 }]
        },
        {
          jointName: 'Knee_L',
          boneName: 'Shin_L',
          flexionAnglesDeg: [90, 135],
          bulgeBicepScale: 1.15,
          cuffDeformers: [{ name: 'Shin_L_UP', angleOffsetDeg: 12, lengthPx: 25 }]
        },
        {
          jointName: 'Knee_R',
          boneName: 'Shin_R',
          flexionAnglesDeg: [90, 135],
          bulgeBicepScale: 1.15,
          cuffDeformers: [{ name: 'Shin_R_UP', angleOffsetDeg: 12, lengthPx: 25 }]
        }
      ];

      const squashStretch = [
        {
          targetPart: 'Head' as const,
          controlBoneName: 'Head',
          horizontalSpreaderBones: ['Ear_L', 'Ear_R'],
          scaleRatioYtoX: -0.95,
          eyelidCompensationEnabled: true
        },
        {
          targetPart: 'Body' as const,
          controlBoneName: 'Torso',
          horizontalSpreaderBones: ['Chest_L', 'Chest_R'],
          scaleRatioYtoX: -0.90,
          eyelidCompensationEnabled: false
        }
      ];

      const shadow = MohoShadowBuilder.buildShadow({
        enabled: args.includeSmartShadow ?? true,
        layerName: 'shadow',
        rootBoneName: 'Master',
        scaleY: -0.25,
        skewX: 0.1,
        opacity: 0.35
      });

      const rigSpec: MohoProductionRigSpec = {
        characterId: charId,
        characterName: charName,
        turnaroundAngles: [...TURNAROUND_ANGLES],
        smartDials: turnaround.smartDials,
        vitruvianGroups: vitruvian,
        jointCorrections,
        squashStretch,
        shadow: {
          enabled: args.includeSmartShadow ?? true,
          layerName: shadow.layerName,
          rootBoneName: shadow.parentBone,
          scaleY: shadow.transform.scaleY,
          skewX: shadow.transform.skewX,
          opacity: shadow.transform.opacity
        },
        animatorContract: {
          hideHelperBonesShy: true,
          colorCodeBones: true,
          lockNonControllerChannels: true,
          frameZeroCleanAudit: true
        }
      };

      let compiledFile: { outputPath: string; fileSizeBytes: number; bonesCount: number } | null = null;
      if (args.outputPath) {
        const absPath = verifyPathAccess(path.resolve(args.outputPath));
        compiledFile = MohoProjectCompiler.compileToFile({
          outputPath: absPath,
          spec: rigSpec
        });
      }

      return {
        status: 'success',
        characterId: charId,
        characterName: charName,
        turnaroundAnglesCount: TURNAROUND_ANGLES.length,
        smartDialsCount: rigSpec.smartDials.length,
        vitruvianGroupsCount: rigSpec.vitruvianGroups.length,
        jointCorrectionsCount: rigSpec.jointCorrections.length,
        compiledFile
      };
    }
  },
  {
    name: 'moho.rig.synthesize_smart_actions',
    description: 'Генерирует смарт-экшены коррекции сгибов суставов и сквоша/стрейча.',
    inputSchema: z.object({
      joints: z.array(
        z.object({
          jointName: z.string(),
          boneName: z.string(),
          flexionAnglesDeg: z.array(z.number()).default([90, 135]),
          bulgeBicepScale: z.number().default(1.18)
        })
      )
    }),
    handler: async (args: {
      joints: Array<{
        jointName: string;
        boneName: string;
        flexionAnglesDeg?: number[];
        bulgeBicepScale?: number;
      }>;
    }) => {
      const formatted = args.joints.map(j => ({
        jointName: j.jointName,
        boneName: j.boneName,
        flexionAnglesDeg: j.flexionAnglesDeg ?? [90, 135],
        bulgeBicepScale: j.bulgeBicepScale ?? 1.18,
        cuffDeformers: []
      }));
      const actions = MohoSmartActionSynthesizer.synthesizeJointCorrections(formatted);
      return { status: 'success', actionsCount: actions.length, actions };
    }
  },
  {
    name: 'moho.rig.build_mesh_warp',
    description: 'Генерирует 2D Delaunay триангуляцию для Smart Mesh деформации.',
    inputSchema: z.object({
      meshLayerName: z.string().default('Torso_Mesh'),
      targetLayerName: z.string().default('Torso'),
      bounds: z.object({
        minX: z.number(),
        minY: z.number(),
        maxX: z.number(),
        maxY: z.number()
      }),
      subdivisionsX: z.number().default(4),
      subdivisionsY: z.number().default(4)
    }),
    handler: async (args: {
      meshLayerName: string;
      targetLayerName: string;
      bounds: { minX: number; minY: number; maxX: number; maxY: number };
      subdivisionsX?: number;
      subdivisionsY?: number;
    }) => {
      const mesh = MohoMeshWarper.generateMesh(
        args.meshLayerName,
        args.targetLayerName,
        args.bounds,
        args.subdivisionsX ?? 4,
        args.subdivisionsY ?? 4
      );
      return { status: 'success', mesh };
    }
  },
  {
    name: 'moho.rig.audit_animator_contract',
    description: 'Выполняет аудит и применяет Animator Contract (Shy-кости, цвета, Frame 0).',
    inputSchema: z.object({
      bones: z.array(
        z.object({
          name: z.string(),
          parent: z.string().nullable(),
          isSmartDial: z.boolean().optional(),
          isHelperOrDeformer: z.boolean().optional()
        })
      )
    }),
    handler: async (args: {
      bones: Array<{
        name: string;
        parent: string | null;
        isSmartDial?: boolean;
        isHelperOrDeformer?: boolean;
      }>;
    }) => {
      const result = MohoAnimatorContractGate.auditAndApplyContract(args.bones);
      return { status: 'success', result };
    }
  },
  {
    name: 'moho.project.compile_to_file',
    description: 'Компилирует спецификацию рига напрямую в бинарный .moho ZIP архив.',
    inputSchema: z.object({
      outputPath: z.string().describe('Путь к файлу .moho на диске.'),
      spec: MohoProductionRigSpecSchema
    }),
    handler: async (args: { outputPath: string; spec: MohoProductionRigSpec }) => {
      const absPath = verifyPathAccess(path.resolve(args.outputPath));
      const res = MohoProjectCompiler.compileToFile({
        outputPath: absPath,
        spec: args.spec
      });
      return { status: 'success', compiled: res };
    }
  },
  {
    name: 'moho.rig.mirror_limb',
    description: 'Автоматически зеркалирует цепочку костей и смарт-экшены (L -> R) по стандарту Borsch Lesson 10.',
    inputSchema: z.object({
      sourceBones: z.array(
        z.object({
          name: z.string(),
          parent: z.string().nullable(),
          x: z.number(),
          y: z.number(),
          length: z.number(),
          angle: z.number(),
          angleLimitMin: z.number().optional(),
          angleLimitMax: z.number().optional()
        })
      ),
      fromSuffix: z.string().default('_L'),
      toSuffix: z.string().default('_R')
    }),
    handler: async (args: {
      sourceBones: Array<{
        name: string;
        parent: string | null;
        x: number;
        y: number;
        length: number;
        angle: number;
        angleLimitMin?: number;
        angleLimitMax?: number;
      }>;
      fromSuffix?: string;
      toSuffix?: string;
    }) => {
      const mirrored = MohoLimbMirrorService.mirrorLimbChain({
        sourceBones: args.sourceBones,
        fromSuffix: args.fromSuffix,
        toSuffix: args.toSuffix
      });
      return { status: 'success', mirrored };
    }
  },
  {
    name: 'moho.rig.synthesize_lipsync',
    description: 'Синтезирует таймлайн переключения фонем и Smart Bone диалы рта с пошаговой (Step) интерполяцией.',
    inputSchema: z.object({
      cues: z.array(
        z.object({
          frame: z.number(),
          phoneme: z.string()
        })
      ),
      switchLayerName: z.string().default('Mouth switch'),
      dialName: z.string().default('Mouth Dial')
    }),
    handler: async (args: {
      cues: Array<{ frame: number; phoneme: string }>;
      switchLayerName?: string;
      dialName?: string;
    }) => {
      const lipsync = MohoLipsyncSynthesizer.synthesizeLipsync({
        cues: args.cues,
        switchLayerName: args.switchLayerName,
        dialName: args.dialName
      });
      return { status: 'success', lipsync };
    }
  },
  {
    name: 'moho.rig.ingest_turnaround_assets',
    description: 'Формирует полную многоракурсную иерархию Switch-слоев Moho из ассетов персонажа.',
    inputSchema: z.object({
      characterName: z.string().default('Character'),
      includeEyelids: z.boolean().default(true),
      handPoses: z.array(z.string()).optional()
    }),
    handler: async (args: {
      characterName?: string;
      includeEyelids?: boolean;
      handPoses?: string[];
    }) => {
      const hierarchy = MohoTurnaroundIngestion.buildHierarchy({
        characterName: args.characterName ?? 'Character',
        includeEyelids: args.includeEyelids ?? true,
        handPoses: args.handPoses
      });
      return { status: 'success', hierarchy };
    }
  },
  {
    name: 'moho.animation.apply_motion_preset',
    description: 'Получает готовый пресет анимации для Moho (walk_cycle, idle_breathing, jump_squat).',
    inputSchema: z.object({
      clipId: z.enum(['walk_cycle', 'idle_breathing', 'jump_squat'])
    }),
    handler: async (args: { clipId: 'walk_cycle' | 'idle_breathing' | 'jump_squat' }) => {
      const clip = MohoAnimationLibrary.getClip(args.clipId);
      return { status: 'success', clip };
    }
  },
  {
    name: 'moho.scene.compile_animated_shot',
    description: 'Компилирует полноценную анимированную сцену для Moho (мультиплан, актинг, липсинг, камера).',
    inputSchema: z.object({
      shotId: z.string(),
      title: z.string(),
      startFrame: z.number().default(1),
      endFrame: z.number().default(120),
      fps: z.number().default(24),
      characters: z.array(
        z.object({
          characterName: z.string(),
          rigSpec: MohoProductionRigSpecSchema,
          position: z.tuple([z.number(), z.number()]).default([0, 0]),
          scale: z.tuple([z.number(), z.number()]).default([1, 1]),
          motionClipId: z.string().optional(),
          lipsyncCues: z.array(z.object({ frame: z.number(), phoneme: z.string() })).optional()
        })
      ),
      outputPath: z.string().optional()
    }),
    handler: async (args: any) => {
      const compiled = MohoScenePlanCompiler.compileShot(
        {
          shotId: args.shotId,
          title: args.title,
          startFrame: args.startFrame ?? 1,
          endFrame: args.endFrame ?? 120,
          fps: args.fps ?? 24,
          characters: args.characters
        },
        args.outputPath ? verifyPathAccess(path.resolve(args.outputPath)) : undefined
      );
      return { status: 'success', shot: compiled };
    }
  }
];
