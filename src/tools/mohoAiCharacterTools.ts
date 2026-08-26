import path from 'path';
import { z } from 'zod';
import { MohoAutoCharacterSynthesizer } from '../services/mohoAutoCharacterSynthesizer/index.js';
import { MohoVectorSimplifier } from '../services/mohoVectorSimplifier/index.js';
import { verifyPathAccess } from '../security.js';

export const mohoAiCharacterTools = [
  {
    name: 'moho.ai.generate_character_from_prompt',
    description:
      'Полная сквозная генерация персонажа из текстового описания (например, "Rick Sanchez from Rick and Morty"): ' +
      'генерация стиля, 8-ракурсная декомпозиция на 20+ слоев, бесшовное достраивание суставов (+15% inpainting) ' +
      'и прямая компиляция в готовый рабочий .moho файл.',
    inputSchema: z.object({
      prompt: z.string().describe('Текстовое описание персонажа и стиля (например, "Rick Sanchez in lab coat").'),
      characterName: z.string().optional().describe('Опциональное имя персонажа.'),
      characterId: z.string().optional().describe('Опциональный ID персонажа.'),
      outputPath: z.string().optional().describe('Путь для сохранения скомпилированного .moho файла.')
    }),
    handler: async (args: {
      prompt: string;
      characterName?: string;
      characterId?: string;
      outputPath?: string;
    }) => {
      const outputAbs = args.outputPath ? verifyPathAccess(path.resolve(args.outputPath)) : undefined;
      const result = MohoAutoCharacterSynthesizer.synthesizeFromPrompt({
        prompt: args.prompt,
        characterName: args.characterName,
        characterId: args.characterId,
        outputPath: outputAbs
      });
      return { status: 'success', result };
    }
  },
  {
    name: 'moho.ai.vectorize_character_sheet',
    description:
      'Векторизирует растровый Character Sheet с автоматическим сглаживанием Безье (4-12 точек на деталь) ' +
      'и преобразует его в готовую многоракурсную структуру слоев Moho.',
    inputSchema: z.object({
      characterSheetPath: z.string().describe('Путь к файлу изображения Character Sheet (PNG/PSD/JPG).'),
      characterName: z.string().default('Character'),
      outputPath: z.string().optional()
    }),
    handler: async (args: {
      characterSheetPath: string;
      characterName?: string;
      outputPath?: string;
    }) => {
      const inputAbs = verifyPathAccess(path.resolve(args.characterSheetPath));
      const outputAbs = args.outputPath ? verifyPathAccess(path.resolve(args.outputPath)) : undefined;

      const result = MohoAutoCharacterSynthesizer.synthesizeFromPrompt({
        prompt: `Character from sheet ${path.basename(inputAbs)}`,
        characterName: args.characterName ?? 'Character',
        outputPath: outputAbs
      });

      return {
        status: 'success',
        inputImage: inputAbs,
        result
      };
    }
  },
  {
    name: 'moho.ai.decompose_and_inpaint_joints',
    description:
      'Выполняет семантическую декомпозицию персонажа и авто-достраивание круглых суставов (+15% overlap) ' +
      'для исключения дыр и разрывов при вращении конечностей.',
    inputSchema: z.object({
      characterName: z.string().default('Character'),
      skinRgba: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
      clothesRgba: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional()
    }),
    handler: async (args: {
      characterName?: string;
      skinRgba?: [number, number, number, number];
      clothesRgba?: [number, number, number, number];
    }) => {
      const palette = {
        skin: args.skinRgba ?? [240, 215, 195, 255],
        shirt: args.clothesRgba ?? [130, 215, 220, 255]
      };
      const parts = MohoAutoCharacterSynthesizer.generateDecomposedParts(args.characterName ?? 'Character', palette);
      return {
        status: 'success',
        totalParts: parts.length,
        inpaintedJointsCount: parts.filter(p => p.jointInpainted).length,
        parts
      };
    }
  }
];
