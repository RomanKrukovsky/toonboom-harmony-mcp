import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { HarmonyPython } from '../adapters/harmonyPython.js';
import { verifyPathAccess, enforceDestructiveSafety, executeWithDryRun, HarmonyError } from '../security.js';
import { config } from '../config.js';

async function runDiagnosticsInternal(tempDir?: string) {
  const { execFile } = await import('child_process');
  const binPath = config.harmonyBin || '';
  const configured = !!binPath;
  
  let exists = false;
  let executable = false;
  if (configured) {
    exists = fs.existsSync(binPath);
    if (exists) {
      try {
        fs.accessSync(binPath, fs.constants.X_OK);
        executable = true;
      } catch {}
    }
  }

  const packagesPathExists = !!config.harmonyPythonPackages && fs.existsSync(config.harmonyPythonPackages);

  let canImportToonBoomHarmony = false;
  try {
    const detectRes = await HarmonyPython.runCommand('detect');
    if (detectRes && detectRes.status === 'success') {
      canImportToonBoomHarmony = true;
    }
  } catch {}

  let cliAvailable = false;
  let canRender = false;
  let renderOutput = '';

  if (exists && executable) {
    cliAvailable = true;
    try {
      const runCli = () => new Promise<string>((resolve) => {
        execFile(binPath, ['-batch', '-script', 'var x = 1;'], { timeout: 4000 }, (error, stdout, stderr) => {
          resolve((stdout || '') + (stderr || ''));
        });
      });
      renderOutput = await runCli();
      if (renderOutput.includes('Licensing Error') || renderOutput.includes('Cannot find license file') || renderOutput.includes('No certificate created')) {
        canRender = false;
      } else {
        canRender = true;
      }
    } catch (e: any) {
      renderOutput = `CLI Execution failed: ${e.message}`;
    }
  }

  const blockingIssues: string[] = [];
  const warnings: string[] = [];

  if (!configured) blockingIssues.push('Toon Boom Harmony binary (HARMONY_BIN) is not configured.');
  else if (!exists) blockingIssues.push(`Toon Boom Harmony binary file does not exist at path: "${binPath}".`);
  else if (!executable) blockingIssues.push(`Toon Boom Harmony binary file is not executable at path: "${binPath}".`);

  if (!packagesPathExists) warnings.push('Toon Boom Harmony Python packages path (HARMONY_PYTHON_PACKAGES) is not configured or does not exist.');
  if (!canImportToonBoomHarmony) blockingIssues.push('Failed to import ToonBoom.harmony Python package.');
  if (exists && executable && !canRender) {
    blockingIssues.push('Harmony licensing error: FlexNet license file is missing or invalid (Cannot find license file).');
  }

  const overall = blockingIssues.length === 0 ? 'ready' : (executable ? 'partially_ready' : 'not_ready');

  return {
    harmonyBin: {
      configured,
      exists,
      executable,
      path: binPath
    },
    pythonApi: {
      packagesPathExists,
      canImportToonBoomHarmony
    },
    render: {
      cliAvailable,
      canRender,
      output: renderOutput.substring(0, 500)
    },
    overall,
    blockingIssues,
    warnings
  };
}

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
  },
  {
    name: 'harmony.scene.execute_plan',
    description: 'Выполнить scene_plan.json в Toon Boom Harmony (создать сцену, настроить метаданные, импортировать ассеты и т.д.).',
    inputSchema: z.object({
      scenePlanPath: z.string().optional().describe('Путь к файлу scene_plan.json.'),
      scenePlan: z.any().optional().describe('JSON объект scene_plan.'),
      projectPath: z.string().optional().describe('Путь к проекту Harmony .xstage.'),
      outputDir: z.string().optional().describe('Корневая папка outputDir.'),
      mode: z.enum(['real', 'hybrid', 'simulation']).optional()
    }),
    handler: async (args: any) => {
      let plan: any;
      if (args.scenePlan) {
        plan = args.scenePlan;
      } else if (args.scenePlanPath) {
        const fullPath = path.resolve(args.scenePlanPath);
        if (!fs.existsSync(fullPath)) {
          throw new HarmonyError('INVALID_HARMONY_OBJECT', `Файл плана сцены отсутствует: "${args.scenePlanPath}"`);
        }
        plan = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      } else {
        throw new HarmonyError('INVALID_HARMONY_OBJECT', 'Необходимо указать scenePlanPath или scenePlan.');
      }

      const { RealSceneExecutor } = await import('../adapters/realSceneExecutor/index.js');
      const executor = new RealSceneExecutor();
      
      const res = await executor.executeScenePlan(plan, {
        mode: args.mode,
        projectPath: args.projectPath,
        outputDir: args.outputDir
      });

      if (!res.ok && res.error?.code === 'HARMONY_NOT_AVAILABLE') {
        return {
          status: 'error',
          error: res.error,
          isRealHarmonyExecution: false,
          requiresRealHarmony: true
        };
      }

      if (!res.ok && res.error?.code === 'ASSET_MISSING') {
        return {
          status: 'error',
          error: res.error,
          isRealHarmonyExecution: false,
          fallbackPath: 'episode_package/assets/placeholders/background_placeholder.png'
        };
      }

      return {
        status: res.ok ? 'success' : 'failed',
        mode: res.mode,
        isRealHarmonyExecution: res.isRealHarmonyExecution,
        sceneName: res.sceneName,
        performedSteps: res.performedSteps,
        skippedSteps: res.skippedSteps,
        warnings: res.warnings,
        createdFiles: res.createdFiles,
        assetsImported: res.assetsImported,
        nodesCreated: res.nodesCreated,
        connectionsCreated: res.connectionsCreated,
        keyframesCreated: res.keyframesCreated,
        preview: res.preview,
        error: res.error
      };
    }
  },
  {
    name: 'harmony.scene.real_smoke_test',
    description: 'Запуск сквозного дымового теста рендеринга видимой сцены в Toon Boom Harmony (создание проекта, импорт ассетов, рендеринг, валидация файла).',
    inputSchema: z.object({
      outputDir: z.string().optional().describe('Корневая папка для теста.')
    }),
    handler: async (args: any) => {
      const outDir = args.outputDir || path.join(process.cwd(), 'output', `smoke_test_${Date.now()}`);
      const pkgDir = path.join(outDir, 'episode_package');
      if (!fs.existsSync(pkgDir)) fs.mkdirSync(pkgDir, { recursive: true });

      // Run diagnostics first
      const diagnostics = await runDiagnosticsInternal(outDir);

      const isHarmonyReady = diagnostics.overall === 'ready';

      if (!isHarmonyReady) {
        const failedReport = {
          testName: 'real_harmony_smoke_test',
          mode: 'real',
          isRealHarmonyExecution: false,
          harmonyAvailable: false,
          status: 'failed',
          error: {
            code: 'HARMONY_NOT_READY',
            message: 'Real Harmony execution requires diagnostics overall status to be "ready"'
          },
          environmentDiagnostics: diagnostics,
          realProjectCreated: false,
          realNodesCreated: false,
          realAssetsImported: false,
          realRenderAttempted: false,
          realRenderValidated: false
        };

        const reportsDir = path.join(pkgDir, 'review_reports');
        if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
        fs.writeFileSync(
          path.join(reportsDir, 'real_smoke_test_report.json'),
          JSON.stringify(failedReport, null, 2),
          'utf8'
        );

        return failedReport;
      }

      const scenePlan = {
        sceneName: 'SC_001',
        durationFrames: 60,
        fps: 24,
        background: {
          file: 'episode_package/assets/placeholders/background_placeholder.png',
          position: { x: 0, y: 0, z: 0 },
          scale: 1
        },
        characters: [
          {
            name: 'Professor',
            positionPreset: 'left',
            scale: 1
          }
        ],
        camera: {
          preset: 'slow_push_in'
        }
      };

      const { RealSceneExecutor } = await import('../adapters/realSceneExecutor/index.js');
      const executor = new RealSceneExecutor();
      
      const projectPath = path.join(outDir, 'harmony_project', 'SC_001.xstage');
      const res = await executor.executeScenePlan(scenePlan, {
        mode: 'real',
        projectPath,
        outputDir: outDir
      });

      const { RenderOutputValidator } = await import('../adapters/renderValidator/index.js');
      const validator = new RenderOutputValidator();
      const previewPath = path.join(pkgDir, 'previews', 'SC_001_preview.mp4');
      const validation = validator.validate(previewPath, 'harmony_cli');

      const projectCreated = fs.existsSync(projectPath);

      const realProjectCreated = projectCreated && res.isRealHarmonyExecution;
      const realNodesCreated = realProjectCreated && res.nodesCreated.length > 0;
      const realAssetsImported = realProjectCreated && res.assetsImported.length > 0;
      const realRenderAttempted = realProjectCreated && res.performedSteps.includes('render_preview');
      const realRenderValidated = realRenderAttempted && validation.isLikelyValidVideo === true && validation.fileSizeBytes > 0;

      const success = realProjectCreated && realNodesCreated && realAssetsImported && realRenderAttempted && realRenderValidated;

      const report = {
        testName: 'real_harmony_smoke_test',
        mode: 'real',
        isRealHarmonyExecution: res.isRealHarmonyExecution,
        harmonyAvailable: true,
        projectCreated,
        projectPath: `episode_package/harmony_project/SC_001.xstage`,
        assetsImported: res.assetsImported.length > 0,
        nodesCreated: res.nodesCreated.length > 0,
        cameraCreated: res.nodesCreated.includes('Camera'),
        keyframesCreated: res.keyframesCreated.length > 0,
        preview: {
          rendered: realRenderValidated,
          path: `episode_package/previews/SC_001_preview.mp4`,
          fileExists: validation.fileExists,
          fileSizeBytes: validation.fileSizeBytes,
          isLikelyValidVideo: validation.isLikelyValidVideo === true
        },
        environmentDiagnostics: diagnostics,
        realProjectCreated,
        realNodesCreated,
        realAssetsImported,
        realRenderAttempted,
        realRenderValidated,
        status: success ? 'success' : 'failed',
        errors: res.error ? [res.error] : [],
        warnings: res.warnings
      };

      const reportsDir = path.join(pkgDir, 'review_reports');
      if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
      fs.writeFileSync(
        path.join(reportsDir, 'real_smoke_test_report.json'),
        JSON.stringify(report, null, 2),
        'utf8'
      );

      return report;
    }
  },
  {
    name: 'harmony.diagnostics.real_harmony_environment',
    description: 'Диагностика окружения Toon Boom Harmony (проверка путей, бинарников, Python API, возможности создания и рендеринга проектов).',
    inputSchema: z.object({
      tempDir: z.string().optional().describe('Временная директория для проверки создания/рендеринга.')
    }),
    handler: async (args: any) => {
      return runDiagnosticsInternal(args.tempDir);
    }
  }
];
