import { z } from 'zod';
import {
  MohoActingBridge,
  type MohoActingBridgeInput,
  type MohoActingBridgeOutput
} from '../services/mohoActingBridge/index.js';
import {
  MohoDialogueActingSynthesizer,
  type DialogueEmotion,
  type SynthesizedActingPerformance
} from '../services/mohoDialogueActingSynthesizer/index.js';
import {
  type MohoPerformancePir
} from '../schemas/mohoPerformancePir.js';

const ACTION_TYPES = ['idle', 'talk', 'gesture', 'look_at', 'walk', 'react'] as const;
const EMOTIONS = [
  'neutral',
  'happy',
  'angry',
  'sad',
  'surprised',
  'scheming',
  'sarcastic'
] as const;
const RIG_TYPES = ['humanoid_2leg', 'quadruped', 'creature', 'mechanical'] as const;

const ACTION_TYPES_VALUES = ACTION_TYPES as unknown as [string, ...string[]];
const EMOTIONS_VALUES = EMOTIONS as unknown as [string, ...string[]];
const RIG_TYPES_VALUES = RIG_TYPES as unknown as [string, ...string[]];

const actionInputSchema = z
  .object({
    type: z.enum(ACTION_TYPES_VALUES).describe('Тип экшена: idle | talk | gesture | look_at | walk | react.'),
    frames: z.tuple([z.number().int().min(1), z.number().int().min(1)]).describe('[startFrame, endFrame]'),
    text: z.string().optional().describe('Текст реплики (только для talk).'),
    emotion: z.enum(EMOTIONS_VALUES).optional().describe('Эмоция (talk / react).'),
    stressedWords: z.array(z.string()).optional().describe('Список ударных слов для асимметричного head-nod.'),
    gestureName: z.string().optional().describe('Имя жеста (только для gesture): wave, shrug, point, nod, head_shake, lean_in.')
  })
  .strict();

const characterInputSchema = z
  .object({
    characterId: z.string().min(1).describe('Стабильный ID персонажа (например "speaker").'),
    rigType: z.enum(RIG_TYPES_VALUES).describe('Тип рига: humanoid_2leg | quadruped | creature | mechanical.'),
    fps: z.number().int().positive().optional().describe('Кадры в секунду (по умолчанию 24).'),
    actions: z.array(actionInputSchema).default([]).describe('Список экшенов персонажа в шоте.')
  })
  .strict();

const generateInputSchema = z
  .object({
    characters: z.array(characterInputSchema).min(1).describe('Список персонажей и их экшенов для генерации bone/switch/smart-bone/fx ключей.')
  })
  .strict();

const synthesizeDialogueInputSchema = z
  .object({
    speaker: z.string().describe('ID спикера.'),
    text: z.string().min(1).describe('Текст реплики.'),
    startFrame: z.number().int().min(1).describe('Стартовый кадр.'),
    endFrame: z.number().int().min(1).describe('Конечный кадр.'),
    emotion: z.enum(EMOTIONS_VALUES).optional().describe('Эмоциональная окраска.'),
    stressedWords: z.array(z.string()).optional().describe('Ударные слова.'),
    fps: z.number().int().positive().default(24).describe('Кадры в секунду (по умолчанию 24).')
  })
  .strict();

const mergeIntoPirInputSchema = z
  .object({
    pir: z.any().describe('Существующий MohoPerformancePIR (из moho.performance_pir.compile).'),
    bridge: z.any().describe('MohoActingBridgeOutput (из moho.acting.generate).')
  })
  .strict();

export const mohoActingBridgeTools = [
  {
    name: 'moho.acting.generate',
    description:
      'Сгенерировать bone/switch/smart-bone/fx ключи для актёрской игры по списку персонажей и их экшенов ' +
      '(talk / gesture / idle / walk / look_at / react). Использует MohoDialogueActingSynthesizer для липсинка ' +
      'и facial tracks, MohoSmartActionSynthesizer для squash/stretch. Возвращает MohoActingBridgeOutput с ' +
      'boneKeys, switchKeys, smartBoneActions, fxKeys, diagnostics и SHA-256 fingerprint.',
    inputSchema: generateInputSchema,
    handler: async (
      args: MohoActingBridgeInput
    ): Promise<
      | { status: 'success'; output: MohoActingBridgeOutput }
      | { status: 'error'; code: string; message: string }
    > => {
      const validated = generateInputSchema.parse(args) as unknown as MohoActingBridgeInput;
      try {
        const output = MohoActingBridge.generate(validated);
        return { status: 'success', output };
      } catch (err: any) {
        return {
          status: 'error',
          code: err?.code ?? 'MOHO_ACTING_GENERATE_FAILED',
          message: err?.message ?? String(err)
        };
      }
    }
  },
  {
    name: 'moho.acting.synthesize_dialogue',
    description:
      'Прямой вызов MohoDialogueActingSynthesizer для одной реплики. Возвращает phonemeKeyframes, ' +
      'actingTracks (eyes / head / gaze / breathing / gesture) и summary. Удобно для превью и отладки ' +
      'липсинка без генерации всего bridge-output.',
    inputSchema: synthesizeDialogueInputSchema,
    handler: async (args: {
      speaker: string;
      text: string;
      startFrame: number;
      endFrame: number;
      emotion?: DialogueEmotion;
      stressedWords?: string[];
      fps?: number;
    }): Promise<
      | { status: 'success'; performance: SynthesizedActingPerformance }
      | { status: 'error'; code: string; message: string }
    > => {
      try {
        const performance = MohoDialogueActingSynthesizer.synthesizeActing(
          {
            speaker: args.speaker,
            text: args.text,
            startFrame: args.startFrame,
            endFrame: args.endFrame,
            emotion: args.emotion,
            stressedWords: args.stressedWords
          },
          args.fps ?? 24
        );
        return { status: 'success', performance };
      } catch (err: any) {
        return {
          status: 'error',
          code: err?.code ?? 'MOHO_ACTING_SYNTHESIZE_DIALOGUE_FAILED',
          message: err?.message ?? String(err)
        };
      }
    }
  },
  {
    name: 'moho.acting.merge_into_pir',
    description:
      'Слить MohoActingBridgeOutput в существующий MohoPerformancePIR. Bone / switch / smart-bone / fx ' +
      'массивы объединяются и сортируются по (frame, name) для детерминированной сборки. ' +
      'Используется в pipeline moho.factory.run_one_shot для добавления актёрских ключей поверх ' +
      'предкомпилированного PIR.',
    inputSchema: mergeIntoPirInputSchema,
    handler: async (args: {
      pir: MohoPerformancePir;
      bridge: MohoActingBridgeOutput;
    }): Promise<
      | {
          status: 'success';
          mergedPir: Pick<
            MohoPerformancePir,
            'boneKeys' | 'switchKeys' | 'smartBoneActions' | 'fxKeys'
          >;
          bridgeFingerprint: string;
        }
      | { status: 'error'; code: string; message: string }
    > => {
      try {
        const mergedPir = MohoActingBridge.mergeIntoPir(args.pir, args.bridge);
        return {
          status: 'success',
          mergedPir,
          bridgeFingerprint: args.bridge.fingerprint
        };
      } catch (err: any) {
        return {
          status: 'error',
          code: err?.code ?? 'MOHO_ACTING_MERGE_FAILED',
          message: err?.message ?? String(err)
        };
      }
    }
  },
  {
    name: 'moho.acting.list_capabilities',
    description:
      'Вернуть реестр возможностей acting-bridge: поддерживаемые action types, emotion enum, rig types ' +
      'и имена жестов из gesture library. Используется UI-клиентом для построения динамических форм ' +
      'без хардкода.',
    inputSchema: z.object({}).strict(),
    handler: async (): Promise<{
      status: 'success';
      capabilities: {
        actionTypes: string[];
        emotions: string[];
        rigTypes: string[];
        gestures: string[];
        phonemeSet: string[];
        supportedRigTypesForDialogue: string[];
      };
    }> => ({
      status: 'success',
      capabilities: {
        actionTypes: [...ACTION_TYPES],
        emotions: [...EMOTIONS],
        rigTypes: [...RIG_TYPES],
        gestures: ['wave', 'shrug', 'point', 'nod', 'head_shake', 'lean_in'],
        phonemeSet: [
          'Rest',
          'A_I',
          'E',
          'O',
          'U',
          'F_V',
          'L',
          'W_Q',
          'M_B_P',
          'Smile'
        ],
        supportedRigTypesForDialogue: ['humanoid_2leg']
      }
    })
  }
];
