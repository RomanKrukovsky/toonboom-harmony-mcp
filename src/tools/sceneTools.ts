import { z } from 'zod';
import { HarmonyPython } from '../adapters/harmonyPython.js';
import { verifyPathAccess, enforceDestructiveSafety, executeWithDryRun } from '../security.js';

export const sceneTools = [
  {
    name: 'harmony.scene.open_project',
    description: 'Открытие локального файла проекта сцены Harmony (.xstage).',
    inputSchema: z.object({
      projectPath: z.string().describe('Абсолютный путь к файлу .xstage на диске.')
    }),
    handler: async (args: { projectPath: string }) => {
      const checkedPath = verifyPathAccess(args.projectPath);
      return HarmonyPython.runCommand('open_project', { projectPath: checkedPath });
    }
  },
  {
    name: 'harmony.scene.inspect',
    description: 'Получение детальной информации по открытому проекту (разрешение, частота кадров, длина сцены).',
    inputSchema: z.object({
      projectPath: z.string().optional().describe('Путь к файлу .xstage.')
    }),
    handler: async (args: { projectPath?: string }) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return HarmonyPython.runCommand('inspect_project', { projectPath: checkedPath });
    }
  },
  {
    name: 'harmony.scene.list_nodes',
    description: 'Получение списка всех узлов (нод) в графе сцены.',
    inputSchema: z.object({
      projectPath: z.string().optional().describe('Путь к файлу .xstage.')
    }),
    handler: async (args: { projectPath?: string }) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return HarmonyPython.runCommand('list_nodes', { projectPath: checkedPath });
    }
  },
  {
    name: 'harmony.scene.search_nodes',
    description: 'Поиск нод в графе сцены по маске имени.',
    inputSchema: z.object({
      projectPath: z.string().optional().describe('Путь к файлу .xstage.'),
      query: z.string().describe('Поисковый запрос для фильтрации имен нод.')
    }),
    handler: async (args: { projectPath?: string; query: string }) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const res = await HarmonyPython.runCommand('list_nodes', { projectPath: checkedPath });
      const nodes = res.nodes || [];
      const matches = nodes.filter((n: string) => n.toLowerCase().includes(args.query.toLowerCase()));
      return { status: 'success', matches };
    }
  },
  {
    name: 'harmony.scene.get_node',
    description: 'Запрос подробной информации об узле и его атрибутах по пути к нему.',
    inputSchema: z.object({
      projectPath: z.string().optional().describe('Путь к файлу .xstage.'),
      nodePath: z.string().describe('Полный путь к ноде (например: Top/Write)')
    }),
    handler: async (args: { projectPath?: string; nodePath: string }) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return HarmonyPython.runCommand('get_node_attrs', { projectPath: checkedPath, nodePath: args.nodePath });
    }
  },
  {
    name: 'harmony.scene.create_node',
    description: 'Создание нового узла (ноды) в графе.',
    inputSchema: z.object({
      projectPath: z.string().optional().describe('Путь к файлу .xstage.'),
      parentGroup: z.string().optional().default('Top').describe('Путь к родительской группе.'),
      nodeType: z.string().describe('Тип создаваемого узла (например: Peg, Write, Composite, Read).'),
      nodeName: z.string().describe('Имя нового узла.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('create_node', args, args.dryRun, () => {
        return HarmonyPython.runCommand('create_node', {
          projectPath: checkedPath,
          parentGroup: args.parentGroup,
          nodeType: args.nodeType,
          nodeName: args.nodeName
        });
      });
    }
  },
  {
    name: 'harmony.scene.delete_node',
    description: 'Удаление узла из графа сцены. (Требует подтверждения безопасности).',
    inputSchema: z.object({
      projectPath: z.string().optional().describe('Путь к файлу .xstage.'),
      nodePath: z.string().describe('Абсолютный путь к удаляемой ноде.'),
      confirm: z.boolean().optional(),
      confirmationText: z.string().optional(),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      enforceDestructiveSafety('delete_node', args);
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('delete_node', args, args.dryRun, () => {
        return HarmonyPython.runCommand('delete_node', {
          projectPath: checkedPath,
          nodePath: args.nodePath
        });
      });
    }
  },
  {
    name: 'harmony.scene.connect_nodes',
    description: 'Подключение портов (входов/выходов) между двумя узлами.',
    inputSchema: z.object({
      projectPath: z.string().optional().describe('Путь к файлу .xstage.'),
      srcNodePath: z.string().describe('Абсолютный путь к узлу-источнику.'),
      destNodePath: z.string().describe('Абсолютный путь к узлу-приемнику.'),
      srcPort: z.number().optional().default(0).describe('Индекс выходного порта источника (по умолчанию 0).'),
      destPort: z.number().optional().default(0).describe('Индекс входного порта приемника (по умолчанию 0).'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('connect_nodes', args, args.dryRun, () => {
        return HarmonyPython.runCommand('connect_nodes', {
          projectPath: checkedPath,
          srcNodePath: args.srcNodePath,
          destNodePath: args.destNodePath,
          srcPort: args.srcPort,
          destPort: args.destPort
        });
      });
    }
  },
  {
    name: 'harmony.scene.disconnect_nodes',
    description: 'Отключение связей с конкретным входным портом узла.',
    inputSchema: z.object({
      projectPath: z.string().optional().describe('Путь к файлу .xstage.'),
      destNodePath: z.string().describe('Абсолютный путь к узлу.'),
      destPort: z.number().optional().default(0).describe('Индекс входного порта для отключения (по умолчанию 0).'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('disconnect_nodes', args, args.dryRun, () => {
        return HarmonyPython.runCommand('disconnect_nodes', {
          projectPath: checkedPath,
          destNodePath: args.destNodePath,
          destPort: args.destPort
        });
      });
    }
  },
  {
    name: 'harmony.scene.get_attribute',
    description: 'Получение значения атрибута конкретной ноды.',
    inputSchema: z.object({
      projectPath: z.string().optional().describe('Путь к файлу .xstage.'),
      nodePath: z.string().describe('Путь к ноде.'),
      attributeName: z.string().describe('Имя атрибута.')
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const res = await HarmonyPython.runCommand('get_node_attrs', { projectPath: checkedPath, nodePath: args.nodePath });
      const val = (res.attributes || {})[args.attributeName];
      return {
        status: 'success',
        nodePath: args.nodePath,
        attributeName: args.attributeName,
        value: val
      };
    }
  },
  {
    name: 'harmony.scene.set_attribute',
    description: 'Изменение значения атрибута конкретной ноды.',
    inputSchema: z.object({
      projectPath: z.string().optional().describe('Путь к файлу .xstage.'),
      nodePath: z.string().describe('Путь к ноде.'),
      attributeName: z.string().describe('Имя атрибута.'),
      value: z.any().describe('Значение для установки.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('set_attribute', args, args.dryRun, () => {
        return HarmonyPython.runCommand('set_node_attr', {
          projectPath: checkedPath,
          nodePath: args.nodePath,
          attributeName: args.attributeName,
          value: args.value
        });
      });
    }
  },
  {
    name: 'harmony.scene.set_keyframe',
    description: 'Установка ключевого кадра (keyframe) со значением для атрибута на таймлайне.',
    inputSchema: z.object({
      projectPath: z.string().optional().describe('Путь к файлу .xstage.'),
      nodePath: z.string().describe('Путь к ноде.'),
      attributeName: z.string().describe('Имя атрибута.'),
      frame: z.number().describe('Индекс кадра.'),
      value: z.any().describe('Значение ключа.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('set_keyframe', args, args.dryRun, () => {
        return HarmonyPython.runCommand('set_node_attr', {
          projectPath: checkedPath,
          nodePath: args.nodePath,
          attributeName: args.attributeName,
          value: args.value,
          frame: args.frame
        });
      });
    }
  },
  {
    name: 'harmony.scene.list_palettes',
    description: 'Получение списка палитр цвета, привязанных к сцене.',
    inputSchema: z.object({
      projectPath: z.string().optional().describe('Путь к файлу .xstage.')
    }),
    handler: async (args: { projectPath?: string }) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return HarmonyPython.runCommand('list_palettes', { projectPath: checkedPath });
    }
  },
  {
    name: 'harmony.scene.import_asset',
    description: 'Импорт файла ресурса (аудио/изображение) непосредственно в сцену.',
    inputSchema: z.object({
      projectPath: z.string().optional().describe('Путь к файлу .xstage.'),
      assetPath: z.string().describe('Абсолютный путь к файлу импортируемого ресурса.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const checkedAssetPath = verifyPathAccess(args.assetPath);
      return executeWithDryRun('import_asset', args, args.dryRun, () => {
        return HarmonyPython.runCommand('import_asset', {
          projectPath: checkedPath,
          assetPath: checkedAssetPath
        });
      });
    }
  },
  {
    name: 'harmony.scene.save',
    description: 'Сохранение изменений в открытой сцене.',
    inputSchema: z.object({
      projectPath: z.string().optional().describe('Путь к файлу .xstage.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('save_scene', args, args.dryRun, () => {
        return HarmonyPython.runCommand('save_project', { projectPath: checkedPath });
      });
    }
  },
  {
    name: 'harmony.scene.export_preview',
    description: 'Рендеринг и экспорт кадра предпросмотра (layout frame) из сцены.',
    inputSchema: z.object({
      projectPath: z.string().optional().describe('Путь к файлу .xstage.'),
      frame: z.number().optional().default(1).describe('Номер кадра для экспорта.'),
      outputPath: z.string().describe('Абсолютный путь назначения для рендереного кадра.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const checkedOut = verifyPathAccess(args.outputPath);
      return executeWithDryRun('export_preview', args, args.dryRun, () => {
        return HarmonyPython.runCommand('render_preview', {
          projectPath: checkedPath,
          frame: args.frame,
          outputPath: checkedOut
        });
      });
    }
  }
];
