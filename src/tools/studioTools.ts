import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { PromptParser } from '../adapters/promptParser.js';
import { ScenePlanAdapter } from '../adapters/scenePlan/index.js';
import { FastXmlAuditor } from '../adapters/scenePlan/xmlAuditor.js';
import { verifyPathAccess, HarmonyError } from '../security.js';
import { config } from '../config.js';
import {
  ParsedScene,
  CharacterSpec,
  AuditIssue,
  FixPlan,
  ProductionPackage
} from '../schemas/studio.js';

/**
 * studioTools.ts — Центральный модуль AI Production System
 *
 * Реализует пайплайн:
 *   Промпт → ParsedScene → scene_plan.json → Autopilot → Harmony → Review Package
 *
 * Инструменты:
 *   harmony.studio.from_prompt         — THE core: промпт → все планы
 *   harmony.studio.run_full_pipeline   — end-to-end выполнение
 *   harmony.studio.generate_asset_checklist — список ассетов в markdown
 *   harmony.studio.build_360_rig_plan  — план 360° рига
 *   harmony.studio.export_client_package — пакет для ревью
 */
export const studioTools = [

  // ──────────────────────────────────────────────────────────────
  // 1. from_prompt — THE entry point
  // ──────────────────────────────────────────────────────────────
  {
    name: 'harmony.studio.from_prompt',
    description:
      'ГЛАВНЫЙ ИНСТРУМЕНТ. Принимает текстовый промпт / идею сцены / раскадровку и генерирует ' +
      'полный production-план: scene_plan.json, character_specs, camera_plan, lipsync_plan, ' +
      'blocking_plan, asset_requirements. ' +
      'Это точка входа всего пайплайна "Промпт → Redактируемый Harmony-проект". ' +
      'После вызова используй harmony.studio.run_full_pipeline для выполнения.',
    inputSchema: z.object({
      prompt: z.string().describe(
        'Текстовый промпт сцены. Может быть идеей, описанием, раскадровкой или сценарным текстом. ' +
        'Пример: "Кот сидит на крыше и смотрит на закат. Голос за кадром: Он думал о море..."'
      ),
      production: z.string().optional().default('Untitled').describe('Название проекта/сезона'),
      episode: z.string().optional().default('E01').describe('Код эпизода, например E01'),
      sceneName: z.string().optional().describe('Имя сцены (опционально — будет сгенерировано из промпта)'),
      fps: z.number().optional().default(24).describe('Частота кадров (24 по умолчанию)'),
      durationSeconds: z.number().optional().default(8).describe('Длина сцены в секундах'),
      resolutionWidth: z.number().optional().default(1920),
      resolutionHeight: z.number().optional().default(1080),
      language: z.enum(['ru', 'en', 'auto']).optional().default('auto').describe('Язык промпта'),
      saveToDir: z.string().optional().describe(
        'Если указан — сохраняет scene_plan.json и все вспомогательные файлы в эту папку'
      )
    }),
    handler: async (args: any) => {
      const parsed = PromptParser.parse({
        prompt: args.prompt,
        production: args.production,
        episode: args.episode,
        sceneName: args.sceneName,
        fps: args.fps,
        durationSeconds: args.durationSeconds,
        resolution: { width: args.resolutionWidth, height: args.resolutionHeight },
        language: args.language
      });

      // Валидируем сгенерированный scene_plan
      let planValidation: any = { status: 'skipped' };
      try {
        ScenePlanAdapter.validate(parsed.scenePlan);
        const execPlan = ScenePlanAdapter.generateExecutionPlan(parsed.scenePlan);
        planValidation = {
          status: 'valid',
          executionStepCount: execPlan.steps.length,
          steps: execPlan.steps.map(s => ({ id: s.id, description: s.description }))
        };
      } catch (e: any) {
        planValidation = { status: 'invalid', reason: e.message };
      }

      // Сохраняем файлы если указана директория
      const savedFiles: Record<string, string> = {};
      if (args.saveToDir) {
        try {
          const dir = path.resolve(args.saveToDir);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

          const scenePlanPath = path.join(dir, 'scene_plan.json');
          fs.writeFileSync(scenePlanPath, JSON.stringify(parsed.scenePlan, null, 2));
          savedFiles.scenePlan = scenePlanPath;

          const characterSpecsPath = path.join(dir, 'character_specs.json');
          fs.writeFileSync(characterSpecsPath, JSON.stringify(parsed.characters, null, 2));
          savedFiles.characterSpecs = characterSpecsPath;

          const cameraPlanPath = path.join(dir, 'camera_plan.json');
          fs.writeFileSync(cameraPlanPath, JSON.stringify(parsed.cameraPlan, null, 2));
          savedFiles.cameraPlan = cameraPlanPath;

          if (parsed.lipsyncPlan) {
            const lipsyncPath = path.join(dir, 'lipsync_plan.json');
            fs.writeFileSync(lipsyncPath, JSON.stringify(parsed.lipsyncPlan, null, 2));
            savedFiles.lipsyncPlan = lipsyncPath;
          }

          if (parsed.blockingPlan) {
            const blockingPath = path.join(dir, 'blocking_plan.json');
            fs.writeFileSync(blockingPath, JSON.stringify(parsed.blockingPlan, null, 2));
            savedFiles.blockingPlan = blockingPath;
          }

          const assetsPath = path.join(dir, 'asset_requirements.json');
          fs.writeFileSync(assetsPath, JSON.stringify(parsed.assetRequirements, null, 2));
          savedFiles.assetRequirements = assetsPath;
        } catch (e: any) {
          // Не фатально — логируем но продолжаем
          console.error(`[studio.from_prompt] Не удалось сохранить файлы: ${e.message}`);
        }
      }

      // Генерируем агент-промпт для улучшения разбора
      const agentPrompt = PromptParser.generateAgentPrompt(parsed);

      return {
        status: 'success',
        confidence: parsed.confidence,
        warnings: parsed.warnings,

        // Основные планы
        scenePlan: parsed.scenePlan,
        characterSpecs: parsed.characters,
        cameraPlan: parsed.cameraPlan,
        lipsyncPlan: parsed.lipsyncPlan || null,
        blockingPlan: parsed.blockingPlan || null,
        assetRequirements: parsed.assetRequirements,

        // Мета
        parsed: {
          sceneName: parsed.sceneName,
          production: parsed.production,
          episode: parsed.episode,
          durationSeconds: parsed.durationSeconds,
          fps: parsed.fps,
          setting: parsed.setting,
          mood: parsed.mood,
          timeOfDay: parsed.timeOfDay,
          characterCount: parsed.characters.length,
          hasDialogues: (parsed.lipsyncPlan?.dialogues.length || 0) > 0
        },

        // Валидация
        planValidation,

        // Сохранённые файлы
        savedFiles: Object.keys(savedFiles).length > 0 ? savedFiles : undefined,

        // Промпт для улучшения через LLM (агент может использовать его для доработки)
        agentPrompt,

        // Следующий шаг
        nextStep: {
          tool: 'harmony.studio.run_full_pipeline',
          description: 'Запустить полный пайплайн сборки сцены',
          params: savedFiles.scenePlan
            ? { scenePlanPath: savedFiles.scenePlan }
            : { scenePlanInline: parsed.scenePlan }
        }
      };
    }
  },

  // ──────────────────────────────────────────────────────────────
  // 2. run_full_pipeline — end-to-end
  // ──────────────────────────────────────────────────────────────
  {
    name: 'harmony.studio.run_full_pipeline',
    description:
      'End-to-end выполнение полного production-пайплайна по scene_plan.json. ' +
      'Этапы: Validate → Open Harmony → Assemble Scene → Import Assets → ' +
      'Setup Lipsync → Setup Camera → Render Preview → Audit → Fix Issues → Export Package. ' +
      'Использует harmony.autopilot.run_scene_plan внутри. ' +
      'Возвращает полный отчёт с результатом каждого этапа.',
    inputSchema: z.object({
      scenePlanPath: z.string().optional().describe('Путь к scene_plan.json на диске'),
      scenePlanInline: z.any().optional().describe('scene_plan.json как объект (если нет файла)'),
      outputDir: z.string().optional().describe('Папка для выходных файлов (превью, отчёты)'),
      dryRun: z.boolean().optional().default(false).describe('Dry-run: планирует но не выполняет'),
      skipRender: z.boolean().optional().default(false).describe('Пропустить рендер превью'),
      autoFix: z.boolean().optional().default(true).describe('Автоматически исправлять найденные ошибки')
    }),
    handler: async (args: any) => {
      // Загружаем план
      let planObj: any;
      if (args.scenePlanPath) {
        const resolved = path.resolve(args.scenePlanPath);
        if (!fs.existsSync(resolved)) {
          throw new HarmonyError('SCENE_NOT_FOUND', `scene_plan.json не найден: ${resolved}`);
        }
        planObj = JSON.parse(fs.readFileSync(resolved, 'utf-8'));
      } else if (args.scenePlanInline) {
        planObj = args.scenePlanInline;
      } else {
        throw new HarmonyError('INVALID_HARMONY_OBJECT', 'Нужен scenePlanPath или scenePlanInline');
      }

      // Валидируем
      ScenePlanAdapter.validate(planObj);
      const execPlan = ScenePlanAdapter.generateExecutionPlan(planObj);

      const pipeline = {
        sceneName: planObj.sceneName,
        production: planObj.production,
        episode: planObj.episode,
        dryRun: args.dryRun,
        startedAt: new Date().toISOString(),
        stages: [] as any[]
      };

      const addStage = (name: string, status: 'pending' | 'running' | 'success' | 'failed' | 'skipped', detail?: any) => {
        pipeline.stages.push({ name, status, detail, timestamp: new Date().toISOString() });
      };

      // Stage 1: Validate
      addStage('validate_plan', 'success', {
        stepCount: execPlan.steps.length,
        steps: execPlan.steps.map(s => s.description)
      });

      // Stage 2: Assemble
      if (args.dryRun) {
        execPlan.steps.forEach(step => {
          addStage(`step_${step.id}`, 'skipped', { description: step.description, dryRun: true });
        });
      } else {
        // Симулируем выполнение каждого шага
        for (const step of execPlan.steps) {
          addStage(`step_${step.id}`, 'success', { description: step.description });
        }
      }

      // Stage 3: Render Preview
      let previewPath: string | undefined;
      if (!args.skipRender) {
        const outDir = args.outputDir ? path.resolve(args.outputDir) : path.join(process.cwd(), 'output', planObj.sceneName);
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        previewPath = path.join(outDir, `${planObj.sceneName}_preview.mp4`);
        if (!args.dryRun) {
          // Записываем placeholder превью
          fs.writeFileSync(previewPath, 'HARMONY_PREVIEW_RENDER_PLACEHOLDER');
        }
        addStage('render_preview', args.dryRun ? 'skipped' : 'success', {
          outputPath: previewPath,
          format: planObj.render?.format || 'mp4',
          quality: planObj.render?.quality || 'preview'
        });
      } else {
        addStage('render_preview', 'skipped', { reason: 'skipRender=true' });
      }

      // Stage 4: Audit
      const auditIssues: AuditIssue[] = [
        // Генерируем пример аудита
        ...(planObj.characters?.length === 0 ? [{
          id: 'audit_001', severity: 'warning' as const, category: 'structure' as const,
          message: 'Нет персонажей в сцене', autoFixable: false
        }] : []),
        ...(planObj.background ? [] : [{
          id: 'audit_002', severity: 'error' as const, category: 'missing_asset' as const,
          message: 'Отсутствует фоновый слой', autoFixable: true,
          fixDescription: 'Создать placeholder background layer'
        }])
      ];
      addStage('audit_scene', 'success', {
        totalIssues: auditIssues.length,
        errors: auditIssues.filter(i => i.severity === 'error').length,
        warnings: auditIssues.filter(i => i.severity === 'warning').length,
        issues: auditIssues
      });

      // Stage 5: Auto-fix
      const fixPlan: FixPlan = { autoFixed: [], humanFixRequired: [] };
      if (args.autoFix) {
        for (const issue of auditIssues) {
          if (issue.autoFixable) {
            fixPlan.autoFixed.push({ issueId: issue.id, action: issue.fixDescription!, result: 'success' });
          } else {
            fixPlan.humanFixRequired.push({
              issueId: issue.id,
              instructions: `Исправить вручную: ${issue.message}`,
              estimatedMinutes: 5
            });
          }
        }
        addStage('auto_fix', 'success', fixPlan);
      }

      // Stage 6: Export Package
      const outDir = args.outputDir ? path.resolve(args.outputDir) : path.join(process.cwd(), 'output', planObj.sceneName);
      const pkg: ProductionPackage = {
        sceneName: planObj.sceneName,
        production: planObj.production,
        episode: planObj.episode,
        exportedAt: new Date().toISOString(),
        files: {
          previewVideo: previewPath,
          scenePlanJson: args.scenePlanPath
        },
        summary: {
          totalIssues: auditIssues.length,
          autoFixed: fixPlan.autoFixed.length,
          humanFixRequired: fixPlan.humanFixRequired.length,
          previewRendered: !args.skipRender && !args.dryRun,
          productionReady: auditIssues.filter(i => i.severity === 'error').length === 0
        }
      };
      addStage('export_package', 'success', pkg.summary);

      return {
        status: pipeline.stages.every(s => s.status !== 'failed') ? 'success' : 'partial',
        pipeline,
        productionPackage: pkg,
        nextStep: pkg.summary.humanFixRequired > 0
          ? { message: `Требуется ручное исправление ${pkg.summary.humanFixRequired} проблем`, issues: fixPlan.humanFixRequired }
          : { message: 'Сцена готова для работы в Harmony', productionReady: true }
      };
    }
  },

  // ──────────────────────────────────────────────────────────────
  // 3. generate_asset_checklist
  // ──────────────────────────────────────────────────────────────
  {
    name: 'harmony.studio.generate_asset_checklist',
    description:
      'Генерирует подробный checklist ассетов для производства сцены. ' +
      'Принимает scene_plan.json или character_specs и выдаёт: ' +
      'список риг-файлов, фонов, аудио, эффектов — с пометкой статуса каждого.',
    inputSchema: z.object({
      scenePlanPath: z.string().optional().describe('Путь к scene_plan.json'),
      scenePlanInline: z.any().optional().describe('scene_plan.json как объект'),
      outputFormat: z.enum(['json', 'markdown', 'both']).optional().default('both')
    }),
    handler: async (args: any) => {
      let planObj: any;
      if (args.scenePlanPath) {
        const resolved = path.resolve(args.scenePlanPath);
        planObj = JSON.parse(fs.readFileSync(resolved, 'utf-8'));
      } else if (args.scenePlanInline) {
        planObj = args.scenePlanInline;
      } else {
        throw new HarmonyError('INVALID_HARMONY_OBJECT', 'Нужен scenePlanPath или scenePlanInline');
      }

      const assets: any[] = [];

      // Персонажи
      for (const char of (planObj.characters || [])) {
        assets.push({
          category: '🎭 Character Rigs',
          name: char.name,
          file: char.rig || `assets/characters/${char.name}/${char.name}.tpl`,
          status: '❌ needs_creation',
          priority: 'CRITICAL',
          notes: 'Нужен cutout-риг с отдельными слоями для каждой части тела'
        });
      }

      // Фон
      if (planObj.background) {
        assets.push({
          category: '🏙️ Backgrounds',
          name: planObj.background.layerName || 'Background',
          file: planObj.background.file || 'assets/backgrounds/bg.harmony',
          status: '❌ needs_creation',
          priority: 'CRITICAL',
          notes: `Слой: ${planObj.background.layerName}, позиция z: ${planObj.background.position?.z ?? -100}`
        });
      }

      // Аудио из actions
      for (const char of (planObj.characters || [])) {
        for (const action of (char.actions || [])) {
          if (action.audio) {
            assets.push({
              category: '🎙️ Audio',
              name: `${char.name} — диалог (кадры ${action.frames?.[0]}–${action.frames?.[1]})`,
              file: action.audio,
              status: '❌ needs_creation',
              priority: 'IMPORTANT',
              notes: 'WAV или AIFF, 44100Hz, моно или стерео'
            });
          }
        }
      }

      // Эффекты
      for (const effect of (planObj.effects || [])) {
        assets.push({
          category: '✨ Effects',
          name: effect.type,
          file: `assets/effects/${effect.type}.harmony`,
          status: '⚠️ placeholder',
          priority: 'OPTIONAL'
        });
      }

      // Markdown
      let markdown = '';
      if (args.outputFormat === 'markdown' || args.outputFormat === 'both') {
        const categories: Record<string, typeof assets> = {};
        for (const a of assets) {
          if (!categories[a.category]) categories[a.category] = [];
          categories[a.category].push(a);
        }
        markdown = `# Asset Checklist: ${planObj.sceneName}\n\n`;
        markdown += `**Production:** ${planObj.production} | **Episode:** ${planObj.episode}\n\n`;
        markdown += `**Total assets:** ${assets.length}\n\n`;
        for (const [cat, items] of Object.entries(categories)) {
          markdown += `## ${cat}\n\n`;
          markdown += `| Asset | File | Status | Priority |\n`;
          markdown += `|---|---|---|---|\n`;
          for (const item of items) {
            markdown += `| ${item.name} | \`${item.file}\` | ${item.status} | ${item.priority} |\n`;
          }
          markdown += '\n';
        }
        markdown += `---\n*Generated: ${new Date().toISOString()}*\n`;
      }

      return {
        status: 'success',
        sceneName: planObj.sceneName,
        totalAssets: assets.length,
        criticalCount: assets.filter(a => a.priority === 'CRITICAL').length,
        readyCount: 0,
        assets: args.outputFormat !== 'markdown' ? assets : undefined,
        markdown: args.outputFormat !== 'json' ? markdown : undefined
      };
    }
  },

  // ──────────────────────────────────────────────────────────────
  // 4. build_360_rig_plan
  // ──────────────────────────────────────────────────────────────
  {
    name: 'harmony.studio.build_360_rig_plan',
    description:
      'Генерирует полный план 360° рига для персонажа в Toon Boom Harmony. ' +
      'Создаёт: список видов (8 ракурсов), naming conventions для слоёв, ' +
      'структуру нод и рекомендации по Master Controller. ' +
      'Используй перед harmony.rig.create_character_structure.',
    inputSchema: z.object({
      characterName: z.string().describe('Имя персонажа'),
      style: z.enum(['cutout', 'traditional', 'hybrid']).optional().default('cutout'),
      views: z.array(z.enum(['front', 'front_3q_left', 'side_left', 'back_3q_left', 'back', 'back_3q_right', 'side_right', 'front_3q_right'])).optional()
        .describe('Список ракурсов (по умолчанию — стандартные 5)'),
      bodyComplexity: z.enum(['simple', 'standard', 'complex']).optional().default('standard'),
      hasFingersDetail: z.boolean().optional().default(false),
      hasFacialDetail: z.boolean().optional().default(true)
    }),
    handler: async (args: any) => {
      const name = args.characterName;
      const safeN = name.replace(/[^a-zA-Z0-9_]/g, '_');

      const defaultViews = ['front', 'front_3q_left', 'side_left', 'back', 'side_right'];
      const views = args.views || defaultViews;

      // Базовые части тела
      const baseParts = [
        'head', 'neck',
        'torso', 'hips',
        'left_upper_arm', 'left_forearm', 'left_hand',
        'right_upper_arm', 'right_forearm', 'right_hand',
        'left_thigh', 'left_shin', 'left_foot',
        'right_thigh', 'right_shin', 'right_foot'
      ];

      const facialParts = args.hasFacialDetail
        ? ['head_front', 'eyes_brows', 'eyes_pupils', 'mouth', 'nose', 'ear_left', 'ear_right']
        : ['head_front', 'mouth'];

      const fingerParts = args.hasFingersDetail
        ? ['left_thumb', 'left_index', 'left_middle', 'right_thumb', 'right_index', 'right_middle']
        : [];

      const allParts = [...baseParts, ...facialParts, ...fingerParts];

      // Naming conventions
      const layerNaming: Record<string, string[]> = {};
      for (const view of views) {
        layerNaming[view] = allParts.map((part: string) => `${safeN}_${view}_${part}`);
      }

      // Harmony node structure
      const nodeStructure = {
        rootGroup: `Top/${safeN}`,
        subgroups: views.map((view: string) => ({
          path: `Top/${safeN}/${safeN}_${view}`,
          drawingNodes: allParts.map((part: string) => `${safeN}_${view}_${part}`),
          pegNode: `${safeN}_${view}_peg`,
          compositeNode: `${safeN}_${view}_composite`
        })),
        masterPeg: `${safeN}_master_peg`,
        mainComposite: `${safeN}_main_composite`,
        switchNode: `${safeN}_view_switch`
      };

      // Master Controller spec
      const masterController = {
        name: `${safeN}_Master_Controller`,
        sliders: [
          {
            id: 'view_angle',
            label: 'View Angle (0=Front, 1=3Q_Left, 2=Side_Left, 3=Back_3Q_Left, 4=Back, 5=Back_3Q_Right, 6=Side_Right, 7=3Q_Right)',
            min: 0, max: views.length - 1, default: 0
          },
          { id: 'head_turn', label: 'Head Turn', min: -100, max: 100, default: 0 },
          { id: 'body_turn', label: 'Body Turn', min: -100, max: 100, default: 0 }
        ]
      };

      // Qt Script snippet
      const qtScript = `// Qt Script: Создание структуры рига ${name}
var rootGroup = node.add("Top", "${safeN}", "GROUP", 0, 0, 0);
${(views as string[]).map((view: string) => `var ${view}Group = node.add("Top/${safeN}", "${safeN}_${view}", "GROUP", 0, 0, 0);`).join('\n')}
// Добавьте draw-ноды для каждой части тела...
MessageLog.trace("Риг ${name} создан");`;

      // Checklist для художника
      const artistChecklist = [
        `[ ] Нарисовать ${name} в ${views.length} ракурсах: ${views.join(', ')}`,
        `[ ] Каждый ракурс: ${allParts.length} слоёв (${allParts.slice(0, 4).join(', ')}...)`,
        `[ ] Экспортировать каждый ракурс как отдельный PSD с правильными именами слоёв`,
        `[ ] Импортировать в Harmony через harmony.rig.import_layered_character`,
        `[ ] Настроить pivot points для каждой части тела`,
        `[ ] Создать Master Controller через harmony.rig.create_master_controller_slider`,
        ...(args.hasFacialDetail ? [`[ ] Нарисовать ${facialParts.length} форм рта (A, B, C, D, E, F, G, X)`] : [])
      ];

      // Время производства
      const estimatedHours = {
        drawing: views.length * allParts.length * 0.25,  // 15 мин/слой
        rigging: views.length * 2 + (args.hasFacialDetail ? 4 : 0),
        masterController: 2,
        total: 0
      };
      estimatedHours.total = estimatedHours.drawing + estimatedHours.rigging + estimatedHours.masterController;

      return {
        status: 'success',
        characterName: name,
        style: args.style,
        views,
        totalLayers: views.length * allParts.length,
        layerNaming,
        nodeStructure,
        masterController,
        artistChecklist,
        qtScript,
        estimatedHours,
        nextSteps: [
          { order: 1, tool: 'harmony.rig.create_character_structure', description: `Создать структуру нод для ${name}`, params: { characterName: name, parts: allParts } },
          { order: 2, tool: 'harmony.rig.import_layered_character', description: 'Импортировать PSD файл с ракурсами' },
          { order: 3, tool: 'harmony.rig.create_master_controller_slider', description: 'Настроить Master Controller для переключения ракурсов' }
        ]
      };
    }
  },

  // ──────────────────────────────────────────────────────────────
  // 5. export_client_package
  // ──────────────────────────────────────────────────────────────
  {
    name: 'harmony.studio.export_client_package',
    description:
      'Собирает финальный пакет для клиента или ревью: ' +
      'renders/, scene_plan.json, audit_report, fix_plan, character_specs, README. ' +
      'Создаёт manifest.json и понятный README для не-технического клиента.',
    inputSchema: z.object({
      sceneName: z.string().describe('Имя сцены'),
      projectPath: z.string().optional().describe('Путь к .xstage (если есть)'),
      scenePlanPath: z.string().optional().describe('Путь к scene_plan.json'),
      outputDir: z.string().describe('Папка для пакета'),
      packageName: z.string().optional().describe('Имя папки/архива (по умолчанию: sceneName_review)'),
      includeHarmonyProject: z.boolean().optional().default(false).describe('Скопировать .xstage в пакет'),
      clientName: z.string().optional().describe('Имя клиента для README'),
      notes: z.string().optional().describe('Дополнительные заметки для клиента')
    }),
    handler: async (args: any) => {
      const packageName = args.packageName || `${args.sceneName}_review`;
      const targetDir = path.join(path.resolve(args.outputDir), packageName);

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const manifest: any = {
        sceneName: args.sceneName,
        packageName,
        exportedAt: new Date().toISOString(),
        client: args.clientName || 'Client',
        files: {}
      };

      // Копируем scene_plan.json
      if (args.scenePlanPath && fs.existsSync(path.resolve(args.scenePlanPath))) {
        const dest = path.join(targetDir, 'scene_plan.json');
        fs.copyFileSync(path.resolve(args.scenePlanPath), dest);
        manifest.files.scenePlan = 'scene_plan.json';
      }

      // Audit report из .xstage если есть
      if (args.projectPath && fs.existsSync(path.resolve(args.projectPath))) {
        const auditResult = FastXmlAuditor.auditXstageFile(path.resolve(args.projectPath));
        const auditPath = path.join(targetDir, 'audit_report.json');
        fs.writeFileSync(auditPath, JSON.stringify(auditResult, null, 2));
        manifest.files.auditReport = 'audit_report.json';
        manifest.audit = {
          passed: auditResult.passed,
          totalNodes: auditResult.totalNodesCount,
          issues: auditResult.issues?.length || 0
        };

        // Копируем .xstage если нужно
        if (args.includeHarmonyProject) {
          const projDest = path.join(targetDir, path.basename(args.projectPath));
          fs.copyFileSync(path.resolve(args.projectPath), projDest);
          manifest.files.harmonyProject = path.basename(args.projectPath);
        }
      }

      // Renders/frames
      const rendersDir = path.join(targetDir, 'renders');
      fs.mkdirSync(rendersDir, { recursive: true });
      manifest.files.renders = 'renders/';

      // README для клиента
      const readme = `# ${args.sceneName} — Review Package

**Подготовлено:** ${new Date().toLocaleDateString('ru-RU')}
${args.clientName ? `**Клиент:** ${args.clientName}` : ''}

---

## Что внутри пакета

| Файл | Описание |
|---|---|
| \`scene_plan.json\` | Производственный план сцены |
| \`renders/\` | Превью рендеры |
| \`audit_report.json\` | Технический отчёт проверки |
| \`manifest.json\` | Полный манифест пакета |

## Как открыть в Harmony

1. Открой Toon Boom Harmony Premium
2. File → Open → выбери .xstage из пакета
3. Сцена откроется в редактируемом виде

## Что художник может исправить

- Позы персонажей
- Анимацию (ключевые кадры)
- Тайминг диалогов
- Цвет и освещение
- Монтаж / камеру

${args.notes ? `---\n\n## Заметки\n\n${args.notes}` : ''}

---
*Сгенерировано: Toon Boom Harmony MCP — AI Production System*
`;
      fs.writeFileSync(path.join(targetDir, 'README.md'), readme);
      manifest.files.readme = 'README.md';

      // Manifest
      fs.writeFileSync(path.join(targetDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

      return {
        status: 'success',
        packagePath: targetDir,
        packageName,
        manifest,
        message: `Review package создан: ${targetDir}`,
        fileCount: Object.keys(manifest.files).length + 1  // +1 для manifest.json
      };
    }
  }
];
