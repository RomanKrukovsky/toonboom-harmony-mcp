import { z } from 'zod';
import { templateAssembly } from '../adapters/templateAssembly/index.js';
import { executeWithDryRun } from '../security.js';

export const templateTools = [
  {
    name: 'harmony.templates.list',
    description: 'Получить список всех шаблонов в директории шаблонов производства.',
    inputSchema: z.object({}),
    handler: async () => {
      const templates = await templateAssembly.listTemplates();
      return { status: 'success', templates };
    }
  },
  {
    name: 'harmony.templates.validate',
    description: 'Проверить корректность структуры и существование указанного шаблона.',
    inputSchema: z.object({
      templatePath: z.string().describe('Путь к файлу или директории шаблона.')
    }),
    handler: async (args: { templatePath: string }) => {
      const res = await templateAssembly.validateTemplate(args.templatePath);
      return { status: res.valid ? 'success' : 'error', ...res };
    }
  },
  {
    name: 'harmony.templates.create_scene_from_template',
    description: 'Создать новый проект сцены (.xstage) на основе шаблона.',
    inputSchema: z.object({
      templatePath: z.string().describe('Путь к шаблону сцены.'),
      targetPath: z.string().describe('Куда сохранить созданную сцену.'),
      width: z.number().optional().default(1920),
      height: z.number().optional().default(1080),
      fps: z.number().optional().default(24),
      frames: z.number().optional().default(192),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      return executeWithDryRun('templates.create_scene_from_template', args, args.dryRun, async () => {
        return templateAssembly.createSceneFromTemplate(args.templatePath, args.targetPath, args);
      });
    }
  },
  {
    name: 'harmony.templates.import_character_rig',
    description: 'Импортировать шаблон рига персонажа (.tpl) в открытую сцену.',
    inputSchema: z.object({
      projectPath: z.string().describe('Путь к проекту .xstage.'),
      rigPath: z.string().describe('Путь к шаблону рига персонажа.'),
      characterName: z.string().describe('Имя персонажа для ноды.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      return executeWithDryRun('templates.import_character_rig', args, args.dryRun, async () => {
        return templateAssembly.importCharacterRig(args.projectPath, args.rigPath, args.characterName);
      });
    }
  },
  {
    name: 'harmony.templates.import_camera_preset',
    description: 'Применить пресет движения камеры из шаблона к сцене.',
    inputSchema: z.object({
      projectPath: z.string().describe('Путь к проекту .xstage.'),
      presetName: z.string().describe('Имя пресета камеры.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      return executeWithDryRun('templates.import_camera_preset', args, args.dryRun, async () => {
        return templateAssembly.importCameraPreset(args.projectPath, args.presetName);
      });
    }
  },
  {
    name: 'harmony.templates.import_fx_preset',
    description: 'Добавить и подключить эффект из шаблона к указанной ноде.',
    inputSchema: z.object({
      projectPath: z.string().describe('Путь к проекту .xstage.'),
      presetType: z.string().describe('Имя/тип эффекта (например: Glow, Shadow).'),
      targetNode: z.string().describe('Путь к узлу-цели в графе.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      return executeWithDryRun('templates.import_fx_preset', args, args.dryRun, async () => {
        return templateAssembly.importFXPreset(args.projectPath, args.presetType, args.targetNode);
      });
    }
  },
  {
    name: 'harmony.templates.apply_mouth_chart',
    description: 'Применить таблицу ртов липсинга к аудиодорожке персонажа.',
    inputSchema: z.object({
      projectPath: z.string().describe('Путь к проекту .xstage.'),
      mouthChartName: z.string().describe('Имя таблицы ртов.'),
      lipsyncData: z.any().optional().describe('Объект с данными липсинга (кадры и рты).'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      return executeWithDryRun('templates.apply_mouth_chart', args, args.dryRun, async () => {
        return templateAssembly.applyMouthChart(args.projectPath, args.mouthChartName, args.lipsyncData);
      });
    }
  },
  {
    name: 'harmony.templates.apply_render_preset',
    description: 'Применить шаблонные настройки рендера к Write-ноде проекта.',
    inputSchema: z.object({
      projectPath: z.string().describe('Путь к проекту .xstage.'),
      presetName: z.string().describe('Имя пресета настроек рендеринга.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      return executeWithDryRun('templates.apply_render_preset', args, args.dryRun, async () => {
        return templateAssembly.applyRenderPreset(args.projectPath, args.presetName);
      });
    }
  },
  {
    name: 'harmony.templates.create_template_pack',
    description: 'Инициализировать новую пустую папку для пакета шаблонов производства.',
    inputSchema: z.object({
      packName: z.string().describe('Имя нового пакета шаблонов.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      return executeWithDryRun('templates.create_template_pack', args, args.dryRun, async () => {
        return templateAssembly.createTemplatePack(args.packName);
      });
    }
  }
];
