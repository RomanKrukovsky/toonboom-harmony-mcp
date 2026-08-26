import { z } from 'zod';
import path from 'path';
import { MohoProductionQualityAuditor } from '../services/mohoProductionQualityAuditor/index.js';
import { MohoRenderManager, type RenderOutputFormat } from '../services/mohoRenderManager/index.js';
import { MohoAssetRegistry, type TemplateCategory } from '../services/mohoAssetRegistry/index.js';
import { verifyPathAccess } from '../security.js';

export const mohoProductionTools = [
  {
    name: 'moho.audit.inspect_and_autofix',
    description:
      'АВТОМАТИЧЕСКИЙ QC АУДИТОР И AUTO-FIXER ДЛЯ MOHO. Инспектирует .moho проект по 10 студийным критериям ' +
      '(Strength Pollution на контроллерах, Frame 0 Dirt, пустые Switch слои, shy-гигиена, цветовая маркировка костей) ' +
      'и при необходимости автоматически исправляет и пересобирает чистый .moho файл.',
    inputSchema: z.object({
      mohoFilePath: z.string().describe('Путь к .moho файлу для аудита.'),
      autoFix: z.boolean().default(true).describe('Автоматически исправить найденные дефекты и сохранить чистый файл.')
    }),
    handler: async (args: { mohoFilePath: string; autoFix?: boolean }) => {
      const absPath = verifyPathAccess(path.resolve(args.mohoFilePath));
      const report = MohoProductionQualityAuditor.auditAndFixMohoFile(absPath, args.autoFix ?? true);
      return { status: 'success', report };
    }
  },
  {
    name: 'moho.render.export_video_or_sequence',
    description:
      'ПАКЕТНЫЙ HEADLESS РЕНДЕРИНГ MOHO. Запускает Moho Pro CLI для экспорта .moho проектов в PNG-последовательность, MP4 (H.264), Apple ProRes или GIF с поддержкой альфа-канала.',
    inputSchema: z.object({
      mohoProjectPath: z.string().describe('Путь к файлу .moho.'),
      outputDirectory: z.string().describe('Папка для сохранения отрендеренных кадров/видео.'),
      format: z.enum(['png_sequence', 'mp4', 'prores', 'gif']).default('png_sequence'),
      startFrame: z.number().default(1),
      endFrame: z.number().default(120),
      fps: z.number().default(24)
    }),
    handler: async (args: {
      mohoProjectPath: string;
      outputDirectory: string;
      format?: RenderOutputFormat;
      startFrame?: number;
      endFrame?: number;
      fps?: number;
    }) => {
      const mohoAbs = verifyPathAccess(path.resolve(args.mohoProjectPath));
      const outAbs = verifyPathAccess(path.resolve(args.outputDirectory));
      const result = await MohoRenderManager.executeRender({
        mohoProjectPath: mohoAbs,
        outputDirectory: outAbs,
        format: args.format ?? 'png_sequence',
        startFrame: args.startFrame ?? 1,
        endFrame: args.endFrame ?? 120,
        fps: args.fps ?? 24
      });
      return { status: 'success', result };
    }
  },
  {
    name: 'moho.assets.list_library_templates',
    description:
      'КАТАЛОГ СТУДИЙНЫХ ШАБЛОНОВ MOHO. Возвращает список готовых к производству эталонных ригов персонажей (Rick Sanchez, Cartoon Girl), четвероногих (Pioneer Dog), гидравлических поршней, щупалец и динамических пропсов.',
    inputSchema: z.object({
      category: z.enum(['character', 'quadruped', 'robotics', 'prop', 'motion', 'environment']).optional()
    }),
    handler: async (args: { category?: TemplateCategory }) => {
      const templates = MohoAssetRegistry.listTemplates(args.category);
      return { status: 'success', totalTemplates: templates.length, templates };
    }
  },
  {
    name: 'moho.assets.instantiate_template',
    description:
      'ИНСТАНЦИРОВАНИЕ ШАБЛОНА В MOHO. Создает и компилирует готовый к анимации проект из каталога шаблонов с полной структурой костей, Smart Actions и материалами.',
    inputSchema: z.object({
      templateId: z.string().describe('ID шаблона (например, "char_rick_sanchez", "quad_pioneer_dog", "mech_hydraulic_robot").'),
      outputPath: z.string().optional().describe('Путь для сохранения скомпилированного .moho файла.')
    }),
    handler: async (args: { templateId: string; outputPath?: string }) => {
      const outAbs = args.outputPath ? verifyPathAccess(path.resolve(args.outputPath)) : undefined;
      const instantiated = MohoAssetRegistry.instantiateTemplate(args.templateId, outAbs);
      return { status: 'success', instantiated };
    }
  }
];
