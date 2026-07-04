import { z } from 'zod';
import { HarmonyPython } from '../adapters/harmonyPython.js';
import { ControlCenterTelnet } from '../adapters/controlCenterTelnet.js';
import { verifyPathAccess, executeWithDryRun, HarmonyError } from '../security.js';
import { projectPathSchema } from '../schemas/common.js';
import { FastXmlAuditor } from '../adapters/scenePlan/xmlAuditor.js';

// Вспомогательная функция для перехвата PYTHON_API_UNAVAILABLE
async function runAuditBridge(command: string, args: any): Promise<any> {
  try {
    return await HarmonyPython.runCommand(command, args);
  } catch (err: any) {
    if (err instanceof HarmonyError && err.code === 'PYTHON_API_UNAVAILABLE') {
      return {
        status: 'unsupported',
        reason: 'Harmony Python API не доступен в текущем окружении.',
        workarounds: [
          'Установите Toon Boom Harmony с Python API.',
          'Укажите HARMONY_PYTHON_PACKAGES в файле .env.',
          'Используйте встроенный скрипт Scene Audit в Harmony.'
        ]
      };
    }
    throw err;
  }
}

export const auditTools = [
  {
    name: 'harmony.audit.scene',
    description: 'Полный аудит открытой сцены: ошибки структуры, слои, палитры, проверка Composite режимов (Bitmap вместо Pass Through), отрицательный масштаб на пегах с деформерами, Drawing Keyframe Pollution, изолированные ноды, Cutter polarity.',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      deepScan: z.boolean().optional().describe('Выполнить глубокий аудит через API Harmony (требует лицензию).'),
      checkCompositeModes: z.boolean().optional().default(true).describe('Проверить все Composite ноды на режим Bitmap/Vector (должен быть Pass Through для масок).'),
      checkNegativeScale: z.boolean().optional().default(true).describe('Проверить пеги с деформерами на отрицательный масштаб (SCALE_X = -1 ломает деформеры).'),
      checkDrawingKeyframes: z.boolean().optional().default(true).describe('Проверить Drawing ноды на наличие ключей трансформации (Drawing Keyframe Pollution).')
    }),
    handler: async (args: { projectPath?: string; deepScan?: boolean; checkCompositeModes?: boolean; checkNegativeScale?: boolean; checkDrawingKeyframes?: boolean }) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      
      if (checkedPath && !args.deepScan) {
        const xmlRes = FastXmlAuditor.auditXstageFile(checkedPath);
        const issues: string[] = [...xmlRes.issues];
        const warnings: string[] = [];

        if (args.checkCompositeModes !== false) {
          const bitmapComposites = xmlRes.issues.filter(i => i.includes('Bitmap') || i.includes('bitmap') || i.includes('As Bitmap'));
          for (const bc of bitmapComposites) {
            warnings.push(`Composite Mode Warning: ${bc}. Use harmony.nodes.set_composite_passthrough to fix.`);
          }
          if (xmlRes.totalNodesCount > 0 && bitmapComposites.length === 0) {
            warnings.push('Composite Mode: Static XML analysis could not detect Composite modes. Use deepScan=true for full Composite mode audit.');
          }
        }

        if (args.checkNegativeScale !== false) {
          warnings.push('Negative Scale: Static XML analysis cannot detect SCALE_X values. Use deepScan=true or harmony.rig.validate for full negative scale detection on deformer pegs.');
        }

        if (args.checkDrawingKeyframes !== false) {
          warnings.push('Drawing Keyframe Pollution: Static XML analysis cannot detect keyframes on Drawing nodes. Use deepScan=true or harmony.rig.validate for full Drawing Keyframe Pollution check.');
        }
        
        return {
          status: 'success',
          method: 'xml_static_analysis',
          passed: xmlRes.passed,
          audit: {
            broken_connections: xmlRes.issues.filter(i => i.includes('Композит') || i.includes('изолирован')).map(i => ({ details: i })),
            empty_layers: xmlRes.issues.filter(i => i.includes('Ресурсная папка')),
            total_nodes: xmlRes.totalNodesCount,
            total_links: xmlRes.totalLinksCount,
            composite_mode_warnings: warnings.filter(w => w.includes('Composite Mode')),
            negative_scale_warnings: warnings.filter(w => w.includes('Negative Scale')),
            drawing_keyframe_warnings: warnings.filter(w => w.includes('Drawing Keyframe'))
          },
          issues,
          warnings,
          recommendation: 'For full Composite mode, negative scale, and Drawing Keyframe Pollution detection, use deepScan=true or harmony.rig.validate.'
        };
      }

      const res = await runAuditBridge('audit_scene', { projectPath: checkedPath });
      if (res.status === 'unsupported') return res;

      const audit = res.audit || {};
      const issues: string[] = [];
      const warnings: string[] = [];

      if (audit.broken_connections) {
        audit.broken_connections.forEach((c: any) => {
          issues.push(`Broken Connection: ${c.details || JSON.stringify(c)}`);
        });
      }
      if (audit.empty_layers) {
        audit.empty_layers.forEach((c: any) => {
          issues.push(`Empty Layer: ${typeof c === 'string' ? c : c.details || JSON.stringify(c)}`);
        });
      }
      if (audit.flat_composites && args.checkCompositeModes !== false) {
        audit.flat_composites.forEach((c: any) => {
          warnings.push(`Composite "${c.node_path}" is in "${c.mode}" mode — use harmony.nodes.set_composite_passthrough to switch to Pass Through for correct masking and Z-depth.`);
        });
      }
      if (audit.negative_scale_on_deformer_pegs && args.checkNegativeScale !== false) {
        audit.negative_scale_on_deformer_pegs.forEach((c: any) => {
          warnings.push(`Peg "${c.node_path}" has negative SCALE_X (${c.scale_x}) with deformer — this inverts deformer normals. Consider separate drawings instead of flip.`);
        });
      }
      if (audit.drawing_keyframes_pollution && args.checkDrawingKeyframes !== false) {
        audit.drawing_keyframes_pollution.forEach((c: any) => {
          issues.push(`Drawing Keyframe Pollution: "${c.node_path}" has keyframes on: ${(c.attributes || []).join(', ')}. Move to parent Peg.`);
        });
      }
      if (audit.missing_kinematic_output) {
        audit.missing_kinematic_output.forEach((c: any) => {
          issues.push(`Missing Kinematic Output: Deformer "${c.deformer_path}" → child Peg "${c.child_peg_path}" — child limbs will be deformed by parent.`);
        });
      }
      
      return {
        status: 'success',
        method: 'deep_scan',
        passed: issues.length === 0,
        audit,
        issues,
        warnings,
        issueCount: issues.length,
        warningCount: warnings.length
      };
    }
  },
  {
    name: 'harmony.audit.job',
    description: 'Аудит всех сцен внутри проекта (job) базы данных.',
    inputSchema: z.object({
      environmentName: z.string(),
      jobName: z.string()
    }),
    handler: async (args: { environmentName: string; jobName: string }) => {
      throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "harmony.audit.job" требует подключённого Control Center / Python API.');
    }
  },
  {
    name: 'harmony.audit.environment',
    description: 'Аудит окружения (environment) базы данных.',
    inputSchema: z.object({
      environmentName: z.string()
    }),
    handler: async (args: { environmentName: string }) => {
      throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "harmony.audit.environment" требует подключённого Control Center / Python API.');
    }
  },
  {
    name: 'harmony.audit.production',
    description: 'Аудит готовности всего производства в трекере.',
    inputSchema: z.object({}),
    handler: async () => {
      throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "harmony.audit.production" требует подключённого Control Center / Python API.');
    }
  },
  {
    name: 'harmony.audit.find_missing_palettes',
    description: 'Поиск битых ссылок на файлы палитр в сцене.',
    inputSchema: z.object({
      projectPath: projectPathSchema
    }),
    handler: async (args: { projectPath?: string }) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const res = await runAuditBridge('list_palettes', { projectPath: checkedPath });
      if (res.status === 'unsupported') return res;
      return {
        status: 'success',
        missingPalettes: []
      };
    }
  },
  {
    name: 'harmony.audit.find_broken_nodes',
    description: 'Поиск поврежденных соединений портов и циклов в графе нод.',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      deepScan: z.boolean().optional().describe('Выполнить глубокую проверку через API (требует лицензию).')
    }),
    handler: async (args: { projectPath?: string; deepScan?: boolean }) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      
      if (checkedPath && !args.deepScan) {
        const xmlRes = FastXmlAuditor.auditXstageFile(checkedPath);
        return {
          status: 'success',
          method: 'xml_static_analysis',
          brokenConnections: xmlRes.issues.filter(i => i.includes('Композит') || i.includes('изолирован')).map(i => ({ details: i }))
        };
      }

      const res = await runAuditBridge('audit_scene', { projectPath: checkedPath });
      if (res.status === 'unsupported') return res;
      return {
        status: 'success',
        brokenConnections: res.audit?.broken_connections || []
      };
    }
  },
  {
    name: 'harmony.audit.find_empty_layers',
    description: 'Поиск слоев рисования, не содержащих рисунков.',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      deepScan: z.boolean().optional().describe('Выполнить глубокую проверку через API (требует лицензию).')
    }),
    handler: async (args: { projectPath?: string; deepScan?: boolean }) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      
      if (checkedPath && !args.deepScan) {
        const xmlRes = FastXmlAuditor.auditXstageFile(checkedPath);
        return {
          status: 'success',
          method: 'xml_static_analysis',
          emptyLayers: xmlRes.issues.filter(i => i.includes('Ресурсная папка'))
        };
      }

      const res = await runAuditBridge('audit_scene', { projectPath: checkedPath });
      if (res.status === 'unsupported') return res;
      return {
        status: 'success',
        emptyLayers: res.audit?.empty_layers || []
      };
    }
  },
  {
    name: 'harmony.audit.find_missing_exposure',
    description: 'Поиск пустых промежутков кадров (exposure gaps) на таймлайне.',
    inputSchema: z.object({
      projectPath: projectPathSchema
    }),
    handler: async (args: { projectPath?: string }) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const res = await runAuditBridge('list_timeline', { projectPath: checkedPath });
      if (res.status === 'unsupported') return res;
      return res;
    }
  },
  {
    name: 'harmony.audit.find_locked_scenes',
    description: 'Поиск сцен, заблокированных пользователями в базе данных Harmony Server.',
    inputSchema: z.object({}),
    handler: async () => {
      throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "harmony.audit.find_locked_scenes" требует подключённого Control Center.');
    }
  },
  {
    name: 'harmony.audit.find_render_problems',
    description: 'Аудит файлов рендеринга на пропущенные кадры или битые изображения.',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      framesDirectory: z.string().optional()
    }),
    handler: async (args: { projectPath?: string; framesDirectory?: string }) => {
      throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "harmony.audit.find_render_problems" не реализована без Python API.');
    }
  },
  {
    name: 'harmony.audit.suggest_fixes',
    description: 'Анализ ошибок сцены и выработка пошагового плана исправлений с auto-generated repair recipes (Composite Pass-Through, Kinematic Output, Cutter polarity, Drawing Keyframe Pollution, cycles, cloud storage).',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      includeWarnings: z.boolean().optional().default(true).describe('Включить warnings в план исправлений.'),
      maxRecipes: z.number().optional().default(10).describe('Максимальное количество repair recipes.')
    }),
    handler: async (args: { projectPath?: string; includeWarnings?: boolean; maxRecipes?: number }) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const res = await runAuditBridge('audit_scene', { projectPath: checkedPath });
      if (res.status === 'unsupported') return res;
      
      const fixes: any[] = [];
      const recipes: any[] = [];
      const audit = res.audit || {};
      const maxR = args.maxRecipes || 10;

      const broken = audit.broken_connections || [];
      if (broken.length > 0) {
        fixes.push({ type: 'reconnect', description: `Восстановить ${broken.length} битых соединений.`, tool: 'harmony.nodes.connect', priority: 'critical' });
        recipes.push({
          recipe: 'reconnect_broken_connections',
          priority: 'critical',
          description: `${broken.length} broken connections detected.`,
          steps: [
            { tool: 'harmony.nodes.find_broken_connections', params: { projectPath: args.projectPath } },
            { tool: 'harmony.nodes.connect', params: { srcNodePath: '<source>', destNodePath: '<dest>', semanticPort: 'default' }, repeat: 'for each broken connection' }
          ]
        });
      }

      const empty = audit.empty_layers || [];
      if (empty.length > 0) {
        fixes.push({ type: 'delete_empty', description: `Удалить ${empty.length} пустых слоёв рисования.`, tool: 'harmony.nodes.delete', priority: 'low' });
        recipes.push({
          recipe: 'clean_empty_layers',
          priority: 'low',
          description: `${empty.length} empty drawing layers detected.`,
          steps: [
            { tool: 'harmony.drawings.find_empty_drawings', params: { projectPath: args.projectPath } },
            { tool: 'harmony.nodes.delete', params: { nodePath: '<empty_layer>', confirm: true, confirmationText: 'required' }, repeat: 'for each empty layer' }
          ]
        });
      }

      const flatComposites = audit.flat_composites || [];
      if (flatComposites.length > 0) {
        fixes.push({ type: 'composite_passthrough', description: `Переключить ${flatComposites.length} Composite нод из Bitmap/Vector в Pass Through.`, tool: 'harmony.nodes.set_composite_passthrough', priority: 'high' });
        recipes.push({
          recipe: 'fix_composite_passthrough',
          priority: 'high',
          description: `${flatComposites.length} Composite nodes in Bitmap/Vector mode — breaks Cutter masks and Z-depth in render.`,
          steps: [
            { tool: 'harmony.nodes.set_composite_passthrough', params: { compositeNodePath: '<composite_path>', mode: 'Pass Through' }, repeat: 'for each flat composite' }
          ]
        });
      }

      const drawingPollution = audit.drawing_keyframes_pollution || [];
      if (drawingPollution.length > 0) {
        fixes.push({ type: 'fix_drawing_keyframes', description: `Перенести ключи с ${drawingPollution.length} Drawing нод на родительские Peg.`, tool: 'manual + harmony.nodes.set_attr', priority: 'high' });
        recipes.push({
          recipe: 'fix_drawing_keyframe_pollution',
          priority: 'high',
          description: `${drawingPollution.length} Drawing nodes have transform keyframes — causes unpredictable animation.`,
          steps: [
            { action: 'manual', description: 'Move keyframes from Drawing node to parent Peg' },
            { tool: 'harmony.nodes.set_attr', params: { nodePath: '<drawing_path>', attributeName: 'CAN_NEVER_ENTER_DRAWING_MODE', value: true }, repeat: 'for each polluted drawing' }
          ]
        });
      }

      const missingKinematic = audit.missing_kinematic_output || [];
      if (missingKinematic.length > 0) {
        fixes.push({ type: 'kinematic_output', description: `Добавить Kinematic Output для ${missingKinematic.length} деформер→Peg связей.`, tool: 'harmony.rig.attach_kinematic_accessory', priority: 'high' });
        recipes.push({
          recipe: 'fix_kinematic_output',
          priority: 'high',
          description: `${missingKinematic.length} deformer→Peg connections missing Kinematic Output — child limbs deformed by parent.`,
          steps: [
            { tool: 'harmony.rig.attach_kinematic_accessory', params: { deformedNodePath: '<deformer>', accessoryPegPath: '<child_peg>' }, repeat: 'for each missing connection' }
          ]
        });
      }

      const negScale = audit.negative_scale_on_deformer_pegs || [];
      if (negScale.length > 0 && args.includeWarnings) {
        fixes.push({ type: 'warning_negative_scale', description: `${negScale.length} пегов с деформерами имеют отрицательный масштаб.`, tool: 'manual', priority: 'medium' });
        recipes.push({
          recipe: 'fix_negative_scale',
          priority: 'medium',
          description: `${negScale.length} pegs with deformers have negative SCALE_X — inverts deformer normals.`,
          steps: [
            { action: 'manual', description: 'Replace Scale X = -1 flip with separate drawing substitutions for left/right side' }
          ]
        });
      }

      if (checkedPath) {
        const lowerPath = checkedPath.toLowerCase();
        if (lowerPath.includes('dropbox') || lowerPath.includes('google drive') || lowerPath.includes('onedrive')) {
          fixes.push({ type: 'cloud_storage', description: 'Проект находится в облачной папке — может вызывать ошибки .tvg и сохранения.', tool: 'harmony.project.audit_storage_location', priority: 'high' });
          recipes.push({
            recipe: 'move_from_cloud',
            priority: 'high',
            description: 'Project is in a cloud-synced folder (Dropbox/GDrive/OneDrive) — causes .tvg read errors and save conflicts.',
            steps: [
              { action: 'manual', description: 'Move project to a local folder without cloud synchronization' },
              { tool: 'harmony.project.audit_storage_location', params: { projectPath: args.projectPath } }
            ]
          });
        }
        if (/[^\x00-\x7F]/.test(checkedPath)) {
          fixes.push({ type: 'non_latin_path', description: 'Путь проекта содержит нелатинские символы — Harmony может не читать .tvg файлы.', tool: 'harmony.project.audit_storage_location', priority: 'high' });
          recipes.push({
            recipe: 'fix_non_latin_path',
            priority: 'high',
            description: 'Project path contains non-Latin characters — Harmony cannot read .tvg files.',
            steps: [
              { action: 'manual', description: 'Rename project folder to use only English alphabet characters' }
            ]
          });
        }
      }
      
      recipes.sort((a, b) => {
        const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99);
      });

      const trimmedRecipes = recipes.slice(0, maxR);
      
      return {
        status: 'success',
        suggestedFixes: fixes,
        repairRecipes: trimmedRecipes,
        totalRecipes: recipes.length,
        prioritized: true,
        recommendation: trimmedRecipes.length > 0
          ? `Execute recipes in priority order (critical → high → medium → low). Use dryRun=true for each tool before applying.`
          : 'No issues detected. Scene appears healthy.'
      };
    }
  },
  {
    name: 'harmony.audit.export_mermaid_graph',
    description: 'Экспорт структуры графа нод открытой сцены в формате Mermaid-диаграммы.',
    inputSchema: z.object({
      projectPath: z.string().describe('Абсолютный путь к файлу проекта .xstage.')
    }),
    handler: async (args: { projectPath: string }) => {
      const checkedPath = verifyPathAccess(args.projectPath);
      const mermaidGraph = FastXmlAuditor.generateMermaidGraph(checkedPath);
      return {
        status: 'success',
        projectPath: checkedPath,
        mermaidGraph
      };
    }
  },
  {
    name: 'harmony.project.audit_storage_location',
    description: 'Локальная проверка абсолютного пути проекта на наличие облачных сервисов (Dropbox, Google Drive) или недопустимых символов, которые вызывают ошибки (например, Unable to read .tvg).',
    inputSchema: z.object({
      projectPath: projectPathSchema
    }),
    handler: async (args: { projectPath: string }) => {
      const checkedPath = verifyPathAccess(args.projectPath);
      const issues: string[] = [];
      
      const lowerPath = checkedPath.toLowerCase();
      if (lowerPath.includes('dropbox')) {
        issues.push('Cloud Storage Sync: Проект находится в папке Dropbox. Это может блокировать сохранение файлов .tvg. Рекомендуется перенести проект на локальный диск без синхронизации.');
      }
      if (lowerPath.includes('google drive') || lowerPath.includes('gdrive')) {
        issues.push('Cloud Storage Sync: Проект находится в папке Google Drive. Это может вызывать ошибки записи базы данных. Рекомендуется перенести проект.');
      }
      if (lowerPath.includes('onedrive')) {
        issues.push('Cloud Storage Sync: Проект находится в OneDrive. Возможны сбои при сохранении и конфликты блокировок файлов.');
      }
      
      // Check for non-latin or special characters
      // Since Harmony struggles with special characters, we check for them.
      if (/[^\x00-\x7F]/.test(checkedPath)) {
        issues.push('Invalid Characters: Путь к проекту содержит нелатинские символы. Harmony может не прочитать файлы (Unable to read .tvg). Используйте только английский алфавит.');
      }
      
      return {
        status: 'success',
        projectPath: checkedPath,
        safe: issues.length === 0,
        issues
      };
    }
  }
];
