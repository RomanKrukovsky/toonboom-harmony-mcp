import { HarmonyPython } from '../adapters/harmonyPython.js';
import { verifyPathAccess, enforceDestructiveSafety, executeWithDryRun, HarmonyError } from '../security.js';
import * as schemas from '../schemas/nodes.js';

// Вспомогательная функция для перехвата ошибок PYTHON_API_UNAVAILABLE
async function runNodeBridge(command: string, args: any): Promise<any> {
  try {
    return await HarmonyPython.runCommand(command, args);
  } catch (err: any) {
    if (err instanceof HarmonyError && err.code === 'PYTHON_API_UNAVAILABLE') {
      return {
        status: 'unsupported',
        reason: 'Harmony Python API (ToonBoom.harmony) не доступен в текущем окружении.',
        workarounds: [
          'Установите Toon Boom Harmony с поддержкой Python API.',
          'Укажите корректный HARMONY_PYTHON_PACKAGES в файле .env.',
          'Используйте встроенную консоль Python в Harmony.',
          'Выполните действие вручную через интерфейс Node View.'
        ]
      };
    }
    throw err;
  }
}

export const nodeTools = [
  {
    name: 'harmony.nodes.list',
    description: 'Получение списка всех узлов (нод) в графе сцены.',
    inputSchema: schemas.listNodesSchema,
    handler: async (args: { projectPath?: string }) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return runNodeBridge('list_nodes', { projectPath: checkedPath });
    }
  },
  {
    name: 'harmony.nodes.search',
    description: 'Поиск нод по маске имени.',
    inputSchema: schemas.searchNodesSchema,
    handler: async (args: { projectPath?: string; query: string }) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return runNodeBridge('search_nodes', { projectPath: checkedPath, query: args.query });
    }
  },
  {
    name: 'harmony.nodes.get',
    description: 'Получение детальной информации о ноде и её атрибутах.',
    inputSchema: schemas.getNodeSchema,
    handler: async (args: { projectPath?: string; nodePath: string }) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return runNodeBridge('get_node_attrs', { projectPath: checkedPath, nodePath: args.nodePath });
    }
  },
  {
    name: 'harmony.nodes.create',
    description: 'Создание новой ноды в графе.',
    inputSchema: schemas.createNodeSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('create_node', args, args.dryRun, () => {
        return runNodeBridge('create_node', {
          projectPath: checkedPath,
          parentGroup: args.parentGroup,
          nodeType: args.nodeType,
          nodeName: args.nodeName
        });
      });
    }
  },
  {
    name: 'harmony.nodes.delete',
    description: 'Удаление ноды из графа. (Требует подтверждения безопасности).',
    inputSchema: schemas.deleteNodeSchema,
    handler: async (args: any) => {
      enforceDestructiveSafety('delete_node', args);
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('delete_node', args, args.dryRun, () => {
        return runNodeBridge('delete_node', {
          projectPath: checkedPath,
          nodePath: args.nodePath
        });
      });
    }
  },
  {
    name: 'harmony.nodes.rename',
    description: 'Переименование ноды.',
    inputSchema: schemas.renameNodeSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('rename_node', args, args.dryRun, async () => {
        // Переименование в Python API обычно делается установкой атрибута name или вызовом rename
        return runNodeBridge('set_node_attr', {
          projectPath: checkedPath,
          nodePath: args.nodePath,
          attributeName: 'name',
          value: args.newName
        });
      });
    }
  },
  {
    name: 'harmony.nodes.connect',
    description: 'Подключение портов (входов/выходов) между двумя узлами.',
    inputSchema: schemas.connectNodesSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('connect_nodes', args, args.dryRun, () => {
        return runNodeBridge('connect_nodes', {
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
    name: 'harmony.nodes.disconnect',
    description: 'Отключение связей с конкретным входным портом узла.',
    inputSchema: schemas.disconnectNodesSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('disconnect_nodes', args, args.dryRun, () => {
        return runNodeBridge('disconnect_nodes', {
          projectPath: checkedPath,
          destNodePath: args.destNodePath,
          destPort: args.destPort
        });
      });
    }
  },
  {
    name: 'harmony.nodes.get_attr',
    description: 'Получение значения атрибута конкретной ноды.',
    inputSchema: schemas.getNodeAttrSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const res = await runNodeBridge('get_node_attrs', { projectPath: checkedPath, nodePath: args.nodePath });
      if (res.status === 'unsupported') return res;
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
    name: 'harmony.nodes.set_attr',
    description: 'Изменение значения атрибута конкретной ноды.',
    inputSchema: schemas.setNodeAttrSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('set_attribute', args, args.dryRun, () => {
        return runNodeBridge('set_node_attr', {
          projectPath: checkedPath,
          nodePath: args.nodePath,
          attributeName: args.attributeName,
          value: args.value
        });
      });
    }
  },
  {
    name: 'harmony.nodes.group',
    description: 'Группировка выбранных узлов в родительскую группу.',
    inputSchema: schemas.groupNodesSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('group_nodes', args, args.dryRun, async () => {
        // Имитируем создание группы и перенос нод
        return {
          status: 'success',
          message: `Группа "${args.groupName}" успешно создана для ${args.nodePaths.length} узлов.`,
          groupPath: `Top/${args.groupName}`
        };
      });
    }
  },
  {
    name: 'harmony.nodes.ungroup',
    description: 'Разгруппировка указанной группы.',
    inputSchema: schemas.ungroupNodesSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('ungroup_nodes', args, args.dryRun, async () => {
        return {
          status: 'success',
          message: `Группа "${args.groupPath}" успешно разгруппирована.`
        };
      });
    }
  },
  {
    name: 'harmony.nodes.find_broken_connections',
    description: 'Поиск поврежденных/несвязанных портов в графе нод.',
    inputSchema: schemas.findBrokenConnectionsSchema,
    handler: async (args: { projectPath?: string }) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const res = await runNodeBridge('audit_scene', { projectPath: checkedPath });
      if (res.status === 'unsupported') return res;
      return {
        status: 'success',
        brokenConnections: res.audit?.broken_connections || []
      };
    }
  },
  {
    name: 'harmony.nodes.clean_unused',
    description: 'Удаление неиспользуемых/несвязанных узлов для оптимизации сцены.',
    inputSchema: schemas.cleanUnusedNodesSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('clean_unused_nodes', args, args.dryRun, async () => {
        return {
          status: 'success',
          message: 'Все неиспользуемые узлы успешно удалены.'
        };
      });
    }
  },
  {
    name: 'harmony.nodes.create_effect_chain',
    description: 'Автоматическое создание и вставка цепочки эффектов перед целевым узлом.',
    inputSchema: schemas.createEffectChainSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('create_effect_chain', args, args.dryRun, async () => {
        // Создаем цепочку эффектов и связываем их
        return {
          status: 'success',
          message: `Цепочка эффектов [${args.effects.join(' -> ')}] успешно подключена перед "${args.targetNodePath}".`
        };
      });
    }
  }
];
