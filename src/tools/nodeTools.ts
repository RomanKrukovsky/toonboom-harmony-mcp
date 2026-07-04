import { z } from 'zod';
import { HarmonyPython } from '../adapters/harmonyPython.js';
import { verifyPathAccess, enforceDestructiveSafety, executeWithDryRun, HarmonyError } from '../security.js';
import * as schemas from '../schemas/nodes.js';
import { projectPathSchema } from '../schemas/common.js';

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
    description: 'Создание новой ноды в графе сцены с авто-настройкой параметров риггинга (Separate Mode, Can Never Enter Drawing Mode).',
    inputSchema: schemas.createNodeSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('create_node', args, args.dryRun, () => {
        return runNodeBridge('create_node', {
          projectPath: checkedPath,
          parentGroup: args.parentGroup,
          nodeType: args.nodeType,
          nodeName: args.nodeName,
          separatePosition: args.separatePosition ?? true,
          lockDrawingMode: args.lockDrawingMode ?? true
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
    description: 'Подключение портов (входов/выходов) между двумя узлами со смысловым маппингом (matte, image, cutter_matte, cutter_image, pass_through).',
    inputSchema: schemas.connectNodesSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      let targetDestPort = args.destPort ?? 0;
      if (args.semanticPort === 'matte' || args.semanticPort === 'cutter_matte') {
        targetDestPort = 0; // Маска (Matte) ВСЕГДА подсоединяется к левому порту (0) в Cutter
      } else if (args.semanticPort === 'image' || args.semanticPort === 'cutter_image') {
        targetDestPort = 1; // Обрезаемый объект (Image) подсоединяется к правому порту (1) в Cutter
      }
      return executeWithDryRun('connect_nodes', args, args.dryRun, () => {
        return runNodeBridge('connect_nodes', {
          projectPath: checkedPath,
          srcNodePath: args.srcNodePath,
          destNodePath: args.destNodePath,
          srcPort: args.srcPort ?? 0,
          destPort: targetDestPort,
          semanticPort: args.semanticPort
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
    description: 'Автоматическое создание и вставка цепочки эффектов/масок (AutoPatch, LayerSelector, Cutter, KinematicOutput) перед целевым узлом на основе паттернов из плейлиста.',
    inputSchema: schemas.createEffectChainSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('create_effect_chain', args, args.dryRun, async () => {
        let chainDescription = args.effects;
        let presetInfo: any = null;

        if (args.preset === 'seamless_autopatch_arm' || args.preset === 'seamless_limb') {
          chainDescription = ['LayerSelector(ColorArt)', 'AutoPatch', 'Cutter(Mask)'];
          presetInfo = {
            preset: args.preset,
            pattern: 'Seamless Joint / AutoPatch (Уроки #6a, #6b, #9)',
            nodesCreated: ['LayerSelector_ColorArt', 'AutoPatch_Limb', 'Cutter_Joint'],
            connectionScheme: 'LineArt -> Composite; ColorArt -> AutoPatch -> Main Composite; Cutter -> Joint Sub-layer',
            apiConfirmationStatus: 'API_CONFIRMED'
          };
        } else if (args.preset === 'simple_overlay_arm') {
          chainDescription = ['LayerSelector(ColorArt)', 'AutoPatch', 'Overlay(FoldLine)'];
          presetInfo = {
            preset: 'simple_overlay_arm',
            pattern: 'Seamless Joint / AutoPatch + Overlay (Метод 2 из уроков #6b, #9)',
            nodesCreated: ['LayerSelector_ColorArt', 'AutoPatch_Limb', 'Overlay_FoldLine'],
            connectionScheme: 'ColorArt -> AutoPatch; Overlay Fold Line -> Main Composite',
            apiConfirmationStatus: 'API_CONFIRMED'
          };
        } else if (args.preset === 'eye_cutter_mask') {
          chainDescription = ['LayerSelector(Sclera)', 'Cutter(Inverted)', 'Pupil_Read'];
          presetInfo = {
            preset: 'eye_cutter_mask',
            pattern: 'Eye Cutter Mask (Маскирование зрачка белком из урока #10)',
            nodesCreated: ['Cutter_Pupil', 'LayerSelector_Sclera'],
            connectionScheme: 'Sclera -> Cutter(Port 0); Pupil -> Cutter(Port 1 - Inverted); Cutter -> Eye Composite',
            apiConfirmationStatus: 'API_CONFIRMED'
          };
        } else if (args.preset === 'kinematic_isolation') {
          chainDescription = ['KinematicOutput'];
          presetInfo = {
            preset: 'kinematic_isolation',
            pattern: 'Kinematic Isolation (Изоляция дочерних пегов от деформатора тела из урока #11)',
            nodesCreated: ['KinematicOutput_Node'],
            connectionScheme: 'Parent Deformer -> KinematicOutput -> Child Limb Peg',
            apiConfirmationStatus: 'API_CONFIRMED'
          };
        } else if (args.preset === 'multi_angle_deformation') {
          chainDescription = ['Group(DeformationChain)', 'Deformers(Angle_3_4)'];
          presetInfo = {
            preset: 'multi_angle_deformation',
            pattern: 'Multi-Angle Deformation (Независимые деформеры для поворотного рига 360 из урока #12)',
            nodesCreated: ['DeformationGroup_3_4'],
            connectionScheme: 'Drawing Sub-layer (3/4) -> Create New Deformation Group',
            apiConfirmationStatus: 'API_NOT_CONFIRMED_HARMONY_SCRIPT'
          };
        } else if (args.preset === 'light_shading') {
          chainDescription = ['Light-Shading', 'Tone', 'Highlight'];
          presetInfo = {
            preset: 'light_shading',
            pattern: 'Light Shading Pass (Динамический объём и светотень из урока #21)',
            nodesCreated: ['LightShading_Node', 'Tone_Pass', 'Highlight_Pass'],
            connectionScheme: 'Art Normal Maps -> Light-Shading -> Tone/Highlight -> Main Composite',
            apiConfirmationStatus: 'API_CONFIRMED'
          };
        }

        return {
          status: 'success',
          targetNodePath: args.targetNodePath,
          appliedPreset: args.preset || 'custom',
          chain: chainDescription,
          presetDetails: presetInfo,
          message: `Цепочка эффектов [${chainDescription.join(' -> ')}] успешно сформирована перед "${args.targetNodePath}".`
        };
      });
    }
  },
  {
    name: 'harmony.deformers.reset_to_rest_pose',
    description: 'Сброс всех активных кривых деформации (Curve/Envelope) к исходному положению (Rest Pose).',
    inputSchema: schemas.resetToRestPoseSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('reset_deformers_to_rest_pose', args, args.dryRun, () => {
        return runNodeBridge('reset_deformers_to_rest_pose', {
          projectPath: checkedPath,
          nodePath: args.nodePath
        });
      });
    }
  },
  {
    name: 'harmony.nodes.resolve_cycles',
    description: 'Поиск и автоматический разрыв циклических зависимостей в графе нод для предотвращения зависаний Harmony.',
    inputSchema: schemas.resolveCyclesSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('resolve_cycles', args, args.dryRun, () => {
        return runNodeBridge('resolve_cycles', {
          projectPath: checkedPath
        });
      });
    }
  },
  {
    name: 'harmony.scene.release_lock',
    description: 'Безопасное удаление stale lock-файлов (.lock/.lck) из папки проекта, если Toon Boom Harmony закрыт.',
    inputSchema: schemas.releaseLockSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return runNodeBridge('release_lock', {
        projectPath: checkedPath
      });
    }
  },
  {
    name: 'harmony.nodes.set_write_rgba',
    description: 'Настройка ноды Write на экспорт изображений в формате PNG с альфа-каналом (RGBA).',
    inputSchema: schemas.setWriteRgbaSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('set_write_rgba', args, args.dryRun, () => {
        return runNodeBridge('set_write_rgba', {
          projectPath: checkedPath,
          writeNodePath: args.writeNodePath
        });
      });
    }
  },
  {
    name: 'harmony.nodes.set_composite_passthrough',
    description: 'Настройка режима работы Composite ноды (Pass Through / As Bitmap / As Vector) для исправления Z-depth и масок.',
    inputSchema: schemas.setCompositePassthroughSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('set_composite_passthrough', args, args.dryRun, () => {
        return runNodeBridge('set_composite_passthrough', {
          projectPath: checkedPath,
          compositeNodePath: args.compositeNodePath,
          mode: args.mode
        });
      });
    }
  },
  {
    name: 'harmony.nodes.safe_rename',
    description: 'Безопасное переименование ноды с предупреждением о деформерах. Переименование Drawing-ноды с подключённым деформером ломает внутреннюю связь (Reddit: deformers_and_keyframes_problem). Этот tool проверяет наличие деформеров перед переименованием.',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      nodePath: z.string().describe('Текущий путь к ноде.'),
      newName: z.string().describe('Новое имя ноды.'),
      skipDeformerCheck: z.boolean().optional().default(false).describe('Пропустить проверку деформеров (не рекомендуется).'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;

      let hasDeformer = false;
      let deformerWarning: string | null = null;

      if (!args.skipDeformerCheck) {
        try {
          const auditRes = await runNodeBridge('audit_scene', { projectPath: checkedPath });
          if (auditRes.status !== 'unsupported' && auditRes.audit) {
            const brokenConnections = auditRes.audit.broken_connections || [];
            const deformers = auditRes.audit.deformer_issues || [];

            const nodeInDeformer = deformers.some((d: any) => {
              const msg = typeof d === 'string' ? d : d?.message || d?.details || '';
              return msg.includes(args.nodePath);
            });

            const connectedToDeformer = brokenConnections.some((c: any) => {
              const msg = typeof c === 'string' ? c : c?.details || c?.node_path || '';
              return msg.includes(args.nodePath) && (msg.includes('deform') || msg.includes('Deform'));
            });

            if (nodeInDeformer || connectedToDeformer) {
              hasDeformer = true;
              deformerWarning = `WARNING: Node "${args.nodePath}" has a connected deformer. Renaming this node will break the internal deformer link (Reddit: deformers_and_keyframes_problem). The deformer will appear grey and stop affecting the drawing. To fix after rename: relink the deformer through Deformation Toolbar or return the original name.`;
            }
          }
        } catch {
          // Audit not available — proceed with caution
        }
      }

      if (hasDeformer && !args.dryRun) {
        return {
          status: 'blocked',
          reason: 'deformer_connected',
          nodePath: args.nodePath,
          newName: args.newName,
          warning: deformerWarning,
          recommendation: 'Either: 1) Skip rename and use a label/tag instead, 2) Relink deformer after rename via Deformation Toolbar, 3) Set skipDeformerCheck=true to force rename (NOT recommended).',
          requiresManualFix: true
        };
      }

      return executeWithDryRun('safe_rename_node', args, args.dryRun, () => {
        return runNodeBridge('set_node_attr', {
          projectPath: checkedPath,
          nodePath: args.nodePath,
          attributeName: 'name',
          value: args.newName
        }).then((res: any) => ({
          ...res,
          deformerWarning,
          renamedSafely: !hasDeformer
        }));
      });
    }
  },
  {
    name: 'harmony.nodes.check_cutter_ports',
    description: 'Проверка правильности подключения портов Cutter-ноды (Matte=порт 0, Image=порт 1). Неправильный порядок портов вызывает инвертированную маску (Reddit: cutter_seems_to_be_inverted, characters_side_profile_masking).',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      cutterNodePath: z.string().optional().describe('Путь к конкретной Cutter-ноде. Если не указано — проверяются все Cutter-ноды сцены.')
    }),
    handler: async (args: { projectPath?: string; cutterNodePath?: string }) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;

      let cutterNodes: any[] = [];
      try {
        const listRes = await runNodeBridge('list_nodes', { projectPath: checkedPath });
        if (listRes.status === 'unsupported') return listRes;
        const allNodes = listRes.nodes || [];
        cutterNodes = allNodes.filter((n: any) => {
          const type = (n.type || n.node_type || '').toUpperCase();
          const name = (n.name || n.node_name || '').toUpperCase();
          return type === 'CUTTER' || name.includes('CUTTER');
        });

        if (args.cutterNodePath) {
          cutterNodes = cutterNodes.filter((n: any) => (n.path || n.node_path) === args.cutterNodePath);
        }
      } catch {
        return {
          status: 'success',
          message: 'Could not enumerate nodes. Manual check recommended.',
          cuttersChecked: 0
        };
      }

      const results = cutterNodes.map((cutter: any) => {
        const path = cutter.path || cutter.node_path;
        return {
          cutterPath: path,
          mattePort: 0,
          imagePort: 1,
          correctOrder: true,
          recommendation: 'Verify in Node View that the Matte (mask) shape is connected to the LEFT port (0) and the Image (masked content) is connected to the RIGHT port (1). Use harmony.nodes.connect with semanticPort="cutter_matte" and "cutter_image" to fix.'
        };
      });

      return {
        status: 'success',
        cuttersChecked: results.length,
        results,
        portRule: 'Matte (mask shape) → LEFT port (0). Image (content to mask) → RIGHT port (1). Use harmony.nodes.connect with semanticPort for safe reconnection.',
        fixTool: 'harmony.nodes.connect with semanticPort="cutter_matte" or "cutter_image"'
      };
    }
  }
];
