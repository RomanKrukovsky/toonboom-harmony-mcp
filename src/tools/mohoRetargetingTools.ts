import { z } from 'zod';
import {
  MohoRetargetingResolver,
  HUMANOID_LANDMARK_MAP,
  QUADRUPED_LANDMARK_MAP,
  CREATURE_LANDMARK_MAP,
  MECHANICAL_LANDMARK_MAP,
  type MohoRigType
} from '../services/retargetingResolver/mohoBranch.js';

const resolver = new MohoRetargetingResolver();

const RIG_TYPE_LANDMARK_MAPS: Record<MohoRigType, Record<string, unknown>> = {
  humanoid_2leg: HUMANOID_LANDMARK_MAP,
  quadruped: QUADRUPED_LANDMARK_MAP,
  creature: CREATURE_LANDMARK_MAP,
  mechanical: MECHANICAL_LANDMARK_MAP
};

const RIG_TYPES: [string, ...string[]] = [
  'humanoid_2leg',
  'quadruped',
  'creature',
  'mechanical'
];

const CONFIDENCE_THRESHOLD = 0.3;

export const mohoRetargetingTools = [
  {
    name: 'moho.retargeting.resolve',
    description:
      'Разрешить набор поза-ориентиров (landmarks) в boneKeys Moho для указанного типа рига. ' +
      'Принимает landmarks (имя, x, y, confidence), character bible и rigType. Нормализует координаты ' +
      'в character space (опционально), вычисляет углы/длины по reference-ориентирам, клампит значения ' +
      'по controller.range и возвращает performance PIR с boneKeys, списком boneBindings, предупреждениями ' +
      'и неотображёнными ориентирами.',
    inputSchema: z.object({
      landmarks: z
        .array(
          z.object({
            name: z.string().describe('Имя ориентира (например, left_shoulder, nose, tail_tip).'),
            x: z.number().describe('X-координата ориентира.'),
            y: z.number().describe('Y-координата ориентира.'),
            confidence: z.number().describe('Уверенность детектора в диапазоне [0..1].')
          })
        )
        .describe('Массив поза-ориентиров.'),
      characterBible: z
        .object({})
        .passthrough()
        .describe('Character bible рига (MohoCharacterBible): boneId/boneName, controllers, ranges.'),
      rigType: z
        .enum(RIG_TYPES)
        .describe('Тип рига Moho: humanoid_2leg | quadruped | creature | mechanical.'),
      normalizeToCharacterSpace: z
        .boolean()
        .optional()
        .describe('Нормализовать координаты в [-0.5..0.5] относительно bbox ориентиров. По умолчанию true.')
    }),
    handler: async (args: {
      landmarks: Array<{ name: string; x: number; y: number; confidence: number }>;
      characterBible: any;
      rigType: MohoRigType;
      normalizeToCharacterSpace?: boolean;
    }): Promise<
      | {
          status: 'success';
          pir: any;
          boneBindings: any[];
          warnings: string[];
          unmappedLandmarks: string[];
        }
      | { status: 'error'; code: string; message: string }
    > => {
      try {
        const result = resolver.resolve({
          landmarks: args.landmarks,
          characterBible: args.characterBible,
          rigType: args.rigType,
          normalizeToCharacterSpace: args.normalizeToCharacterSpace
        });
        return {
          status: 'success',
          pir: result.pir,
          boneBindings: result.boneBindings,
          warnings: result.warnings,
          unmappedLandmarks: result.unmappedLandmarks
        };
      } catch (err: any) {
        return {
          status: 'error',
          code: err?.code ?? 'MOHO_RETARGETING_RESOLVE_FAILED',
          message: err?.message ?? String(err)
        };
      }
    }
  },
  {
    name: 'moho.retargeting.list_supported_landmarks',
    description:
      'Вернуть список имён ориентиров (ключей LANDMARK_MAP), которые поддерживает указанный тип рига. ' +
      'Используется для предварительной проверки полноты детектора перед вызовом resolve.',
    inputSchema: z.object({
      rigType: z
        .enum(RIG_TYPES)
        .describe('Тип рига Moho: humanoid_2leg | quadruped | creature | mechanical.')
    }),
    handler: async (args: { rigType: MohoRigType }): Promise<
      | { status: 'success'; supportedLandmarks: string[] }
      | { status: 'error'; code: string; message: string }
    > => {
      try {
        const map = RIG_TYPE_LANDMARK_MAPS[args.rigType];
        if (!map) {
          return {
            status: 'error',
            code: 'MOHO_RETARGETING_UNSUPPORTED_RIG_TYPE',
            message: `Unsupported rig type: ${args.rigType}`
          };
        }
        return { status: 'success', supportedLandmarks: Object.keys(map) };
      } catch (err: any) {
        return {
          status: 'error',
          code: err?.code ?? 'MOHO_RETARGETING_LIST_LANDMARKS_FAILED',
          message: err?.message ?? String(err)
        };
      }
    }
  },
  {
    name: 'moho.retargeting.validate_landmarks',
    description:
      'Провалидировать входной набор ориентиров для указанного rigType без вычисления boneKeys. ' +
      'Возвращает три массива: valid (есть в LANDMARK_MAP), invalid (нет в карте) и belowConfidence ' +
      '(есть в карте, но confidence ниже порога 0.3 — будет помечено warning в resolve).',
    inputSchema: z.object({
      rigType: z
        .enum(RIG_TYPES)
        .describe('Тип рига Moho: humanoid_2leg | quadruped | creature | mechanical.'),
      landmarks: z
        .array(
          z.object({
            name: z.string().describe('Имя ориентира.'),
            confidence: z.number().describe('Уверенность детектора в диапазоне [0..1].')
          })
        )
        .describe('Массив ориентиров для проверки (имя + confidence).')
    }),
    handler: async (args: {
      rigType: MohoRigType;
      landmarks: Array<{ name: string; confidence: number }>;
    }): Promise<
      | {
          status: 'success';
          valid: string[];
          invalid: string[];
          belowConfidence: string[];
        }
      | { status: 'error'; code: string; message: string }
    > => {
      try {
        const map = RIG_TYPE_LANDMARK_MAPS[args.rigType];
        if (!map) {
          return {
            status: 'error',
            code: 'MOHO_RETARGETING_UNSUPPORTED_RIG_TYPE',
            message: `Unsupported rig type: ${args.rigType}`
          };
        }
        const valid: string[] = [];
        const invalid: string[] = [];
        const belowConfidence: string[] = [];
        for (const lm of args.landmarks) {
          if (map[lm.name]) {
            valid.push(lm.name);
            if (lm.confidence < CONFIDENCE_THRESHOLD) {
              belowConfidence.push(lm.name);
            }
          } else {
            invalid.push(lm.name);
          }
        }
        return { status: 'success', valid, invalid, belowConfidence };
      } catch (err: any) {
        return {
          status: 'error',
          code: err?.code ?? 'MOHO_RETARGETING_VALIDATE_LANDMARKS_FAILED',
          message: err?.message ?? String(err)
        };
      }
    }
  }
];