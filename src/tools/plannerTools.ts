import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { ScenePlanAdapter } from '../adapters/scenePlan/index.js';
import { scenePlanSchema, assertScenePlanVersion, SCENE_PLAN_VERSION } from '../schemas/scenePlan.js';
import { KitsuIngest } from '../adapters/kitsuIngest.js';
import { tracker } from '../adapters/sqliteTracker.js';
import { executeWithDryRun, HarmonyError, verifyPathAccess } from '../security.js';
import { FastXmlAuditor } from '../adapters/scenePlan/xmlAuditor.js';
import { config } from '../config.js';
import { PromptParser } from '../adapters/promptParser.js';

/**
 * Planner tools — bridge between production-plan sources (Kitsu, shot list,
 * file on disk) and Harmony Autopilot's execution layer.
 *
 * Marketing must-have items implemented here:
 *  - scene_plan.json schema (locked, versioned)
 *  - Kitsu ingest (highest-value integration)
 *  - shot list file import (CSV/JSON)
 *  - time-savings report
 */
export const plannerTools = [
  {
    name: 'harmony.planner.validate_plan',
    description:
      'Validate a scene_plan.json object against the locked, versioned schema. ' +
      'Use before handing a plan to the executor. Never modifies anything.',
    inputSchema: z.object({
      plan: z.any().describe('The scene_plan.json object (parsed).')
    }),
    handler: async (args: any) => {
      try {
        assertScenePlanVersion(args.plan);
      } catch (e: any) {
        return {
          status: 'unsupported',
          reason: e.message,
          supportedVersion: SCENE_PLAN_VERSION,
          workarounds: ['migrate plan to schemaVersion 1.0 (see docs/SCENE_PLAN.md)']
        };
      }
      const res = scenePlanSchema.safeParse(args.plan);
      if (!res.success) {
        return {
          status: 'unsupported',
          reason: 'Scene plan failed structural validation',
          supportedVersion: SCENE_PLAN_VERSION,
          errors: res.error.format(),
          workarounds: ['fix the listed fields', 'use harmony.planner.load_from_file for a saved template']
        };
      }
      const steps = ScenePlanAdapter.generateExecutionPlan(res.data);
      return {
        status: 'success',
        schemaVersion: SCENE_PLAN_VERSION,
        plan: res.data,
        executionStepCount: steps.steps.length,
        preview: {
          goal: steps.goal,
          firstStep: steps.steps[0]?.description
        }
      };
    }
  },

  {
    name: 'harmony.planner.load_plan_from_file',
    description:
      'Load and validate a scene_plan.json file from disk. Resolves against HARMONY_ALLOWED_ROOTS.',
    inputSchema: z.object({
      filePath: z.string().describe('Absolute path to scene_plan.json.')
    }),
    handler: async (args: { filePath: string }) => {
      const resolved = path.resolve(args.filePath);
      if (!resolved.startsWith(process.cwd()) && !config.allowedRoots.some(r => resolved.startsWith(r))) {
        throw new HarmonyError('PATH_NOT_ALLOWED', `filePath outside allowed roots: ${resolved}`);
      }
      const raw = fs.readFileSync(resolved, 'utf8');
      let plan: any;
      try {
        plan = JSON.parse(raw);
      } catch (e: any) {
        throw new HarmonyError('INVALID_HARMONY_OBJECT', `Not valid JSON: ${e.message}`);
      }
      ScenePlanAdapter.validate(plan);
      const execPlan = ScenePlanAdapter.generateExecutionPlan(plan);
      return {
        status: 'success',
        schemaVersion: SCENE_PLAN_VERSION,
        source: resolved,
        sceneName: plan.sceneName,
        stepCount: execPlan.steps.length
      };
    }
  },

  {
    name: 'harmony.planner.kitsu_ingest',
    description:
      'Ingest shots for an episode from a Kitsu REST API and emit scene_plan.json objects. ' +
      'Read-only — never writes back to Kitsu. Use harmony.planner.kitsu_writeback to update statuses AFTER execution.',
    inputSchema: z.object({
      baseUrl: z.string().describe('Kitsu base URL, e.g. https://kitsu.studio.example'),
      token: z.string().optional().describe('Bearer token (preferred)'),
      email: z.string().optional(),
      password: z.string().optional(),
      production: z.string().describe('Kitsu project name.'),
      episode: z.string().describe('Kitsu episode name.')
    }),
    handler: async (args: any) => {
      const kitsu = new KitsuIngest({
        baseUrl: args.baseUrl,
        token: args.token,
        email: args.email,
        password: args.password
      });
      try {
        const result = await kitsu.ingestEpisode(args.production, args.episode);
        return {
          status: result.unsupported.length ? 'partial_success' : 'success',
          ...result,
          note: result.unsupported.length
            ? 'Some shots lack frame metadata — executor will prompt for durations.'
            : undefined
        };
      } catch (e: any) {
        // Defensive: never exfiltrate credentials in the error.
        const safe = new HarmonyError('INVALID_HARMONY_OBJECT', 'Kitsu ingest failed: ' +
          (e.message || 'unknown error').replace(/Bearer [^ ]+/g, 'Bearer ***'));
        throw safe;
      }
    }
  },

  {
    name: 'harmony.planner.kitsu_writeback',
    description:
      'After Autopilot executes a scene plan, write the resulting status back to Kitsu tasks. ' +
      'Destructive: requires confirm + confirmationText.',
    inputSchema: z.object({
      baseUrl: z.string(),
      token: z.string().optional(),
      shotTaskId: z.string().describe('Kitsu task ID to update.'),
      status: z.enum(['todo', 'in_progress', 'ready_for', 'done', 'failed']).describe('New status.'),
      comment: z.string().optional().describe('Optional comment.'),
      confirm: z.boolean(),
      confirmationText: z.string()
    }),
    handler: async (args: any) => {
      if (!args.confirm || args.confirmationText !== 'I understand this will modify the Kitsu production tracker') {
        return {
          status: 'unsupported',
          reason: 'DESTRUCTIVE_ACTION_REQUIRES_CONFIRMATION',
          requiredConfirmationText: 'I understand this will modify the Kitsu production tracker'
        };
      }
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (args.token) headers['Authorization'] = `Bearer ${args.token}`;
      const res = await fetch(`${args.baseUrl}/api/tasks/${args.shotTaskId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ task_status_short_name: mapKitsuStatus(args.status), comment: args.comment })
      });
      if (!res.ok) {
        return {
          status: 'unsupported',
          reason: 'KITSU_WRITEBACK_FAILED',
          httpStatus: res.status,
          httpStatusText: res.statusText
        };
      }
      return { status: 'success', shotTaskId: args.shotTaskId, newStatus: args.status };
    }
  },

  {
    name: 'harmony.planner.import_shot_list',
    description:
      'Import a CSV or JSON shot list and produce scene_plan.json stubs for each shot. ' +
      'Each row becomes a plan with only production/episode/sceneName + durationFrames filled in; ' +
      'characters/background/camera/effects left for the user or a later step.',
    inputSchema: z.object({
      filePath: z.string().describe('Path to .csv or .json shot list.'),
      production: z.string(),
      episode: z.string(),
      fps: z.number().default(24),
      defaultResolution: z.object({ width: z.number(), height: z.number() }).optional()
    }),
    handler: async (args: any) => {
      const resolved = path.resolve(args.filePath);
      const raw = fs.readFileSync(resolved, 'utf8');
      let rows: any[];
      if (resolved.toLowerCase().endsWith('.json')) {
        const parsed = JSON.parse(raw);
        rows = Array.isArray(parsed) ? parsed : (parsed.shots || []);
      } else {
        rows = parseCsv(raw);
      }

      const plans = rows.map((r: any) => ({
        schemaVersion: SCENE_PLAN_VERSION,
        production: args.production,
        episode: args.episode,
        sceneName: r.name || r.shot || r.sceneName,
        fps: args.fps,
        durationFrames: r.frames || r.nb_frames || Math.round((r.duration || 8) * args.fps),
        resolution: args.defaultResolution || { width: 1920, height: 1080 },
        characters: [],
        background: undefined,
        camera: undefined,
        effects: [],
        render: { preview: true, format: 'png', quality: 'preview' }
      }));

      // Validate each.
      const validated = [];
      const errors = [];
      for (const p of plans) {
        try {
          ScenePlanAdapter.validate(p);
          validated.push(p);
        } catch (e) {
          errors.push({ sceneName: p.sceneName, error: (e as Error).message });
        }
      }

      return {
        status: errors.length ? 'partial_success' : 'success',
        schemaVersion: SCENE_PLAN_VERSION,
        shotCount: rows.length,
        validCount: validated.length,
        plans: validated,
        errors
      };
    }
  },

  {
    name: 'harmony.planner.time_savings_report',
    description:
      'Generate a marketing-ready time-savings report: how long the assembled scene would take ' +
      'manually vs. how long Autopilot took, with a hypothetical financial figure. Gold output for sales.',
    inputSchema: z.object({
      sceneName: z.string(),
      manualMinutes: z.number().describe('Estimated manual scene-setup time, minutes.'),
      autopilotMinutes: z.number().describe('Actual Autopilot execution time, minutes.'),
      artistHourlyRateUSD: z.number().optional().default(45)
    }),
    handler: async (args: any) => {
      const minutesSaved = Math.max(0, args.manualMinutes - args.autopilotMinutes);
      const hoursSaved = minutesSaved / 60;
      const financialSavingsUSD = Math.round(hoursSaved * args.artistHourlyRateUSD);
      await tracker.initialize();
      // Record into audit_reports so we can aggregate later.
      await tracker.addAuditReport?.({
        type: 'time_savings',
        sceneName: args.sceneName,
        manualMinutes: args.manualMinutes,
        autopilotMinutes: args.autopilotMinutes,
        minutesSaved,
        financialSavingsUSD
      }).catch(() => {});
      return {
        status: 'success',
        sceneName: args.sceneName,
        minutesSaved,
        hoursSaved: Math.round(hoursSaved * 100) / 100,
        financialSavingsUSD,
        multiplier: args.autopilotMinutes > 0
          ? Math.round((args.manualMinutes / args.autopilotMinutes) * 10) / 10
          : null,
        marketingLine: `Autopilot assembled "${args.sceneName}" in ${args.autopilotMinutes} min vs ~${args.manualMinutes} min manual — saving ${minutesSaved} min (∼$${financialSavingsUSD}).`
      };
    }
  },
  {
    name: 'harmony.planner.export_review_package',
    description:
      'Создает единый пакет ревью для клиента: упаковывает рендеры, статический отчет аудита и метаданные в архив или папку.',
    inputSchema: z.object({
      projectPath: z.string().describe('Путь к файлу проекта .xstage.'),
      outputDir: z.string().describe('Папка назначения для сохранения пакета ревью.'),
      packageName: z.string().describe('Имя архива/папки ревью.')
    }),
    handler: async (args: { projectPath: string; outputDir: string; packageName: string }) => {
      const checkedPath = verifyPathAccess(args.projectPath);
      const projectDir = path.dirname(checkedPath);
      
      const xmlRes = FastXmlAuditor.auditXstageFile(checkedPath);
      
      const framesDir = path.join(projectDir, 'frames');
      const previewFiles: string[] = [];
      if (fs.existsSync(framesDir)) {
        const files = fs.readdirSync(framesDir);
        previewFiles.push(...files.map(f => path.join(framesDir, f)));
      }

      const manifest = {
        sceneName: path.basename(projectDir),
        exportedAt: new Date().toISOString(),
        auditReport: {
          passed: xmlRes.passed,
          totalNodes: xmlRes.totalNodesCount,
          totalLinks: xmlRes.totalLinksCount,
          issues: xmlRes.issues
        },
        previewsCount: previewFiles.length
      };

      const targetDir = path.join(args.outputDir, args.packageName);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.writeFileSync(path.join(targetDir, 'review_manifest.json'), JSON.stringify(manifest, null, 2));

      return {
        status: 'success',
        targetDirectory: targetDir,
        manifest
      };
    }
  },

  // ──────────────────────────────────────────────────────────────
  // NEW: generate_from_prompt
  // ──────────────────────────────────────────────────────────────
  {
    name: 'harmony.planner.generate_from_prompt',
    description:
      'Генерирует валидный scene_plan.json из свободного текстового описания сцены. ' +
      'Аналог harmony.studio.from_prompt, но фокусируется только на scene_plan + мета-данных плана. ' +
      'Используй этот инструмент когда нужен только plan (без полного пайплайна). ' +
      'Для полного пайплайна используй harmony.studio.from_prompt.',
    inputSchema: z.object({
      prompt: z.string().describe(
        'Текстовое описание сцены. Примеры: ' +
        '"Кот сидит на крыше и смотрит на закат" или ' +
        '"Character A and B argue in a kitchen, dialogue: A: Stop it! B: Never!"'
      ),
      production: z.string().optional().default('Untitled'),
      episode: z.string().optional().default('E01'),
      sceneName: z.string().optional(),
      fps: z.number().optional().default(24),
      durationSeconds: z.number().optional().default(8),
      validatePlan: z.boolean().optional().default(true).describe('Автоматически валидировать сгенерированный план'),
      saveToPath: z.string().optional().describe('Если указан — сохранить scene_plan.json по этому пути')
    }),
    handler: async (args: any) => {
      // Разбираем промпт → ParsedScene
      const parsed = PromptParser.parse({
        prompt: args.prompt,
        production: args.production,
        episode: args.episode,
        sceneName: args.sceneName,
        fps: args.fps,
        durationSeconds: args.durationSeconds
      });

      const plan = parsed.scenePlan;

      // Валидация
      let validation: any = { status: 'skipped' };
      if (args.validatePlan) {
        const res = scenePlanSchema.safeParse(plan);
        if (res.success) {
          const execPlan = ScenePlanAdapter.generateExecutionPlan(plan);
          validation = {
            status: 'valid',
            executionStepCount: execPlan.steps.length,
            firstStep: execPlan.steps[0]?.description
          };
        } else {
          validation = {
            status: 'invalid',
            errors: res.error.format()
          };
        }
      }

      // Сохранение на диск
      let savedPath: string | undefined;
      if (args.saveToPath) {
        const resolved = path.resolve(args.saveToPath);
        const dir = path.dirname(resolved);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(resolved, JSON.stringify(plan, null, 2));
        savedPath = resolved;
      }

      return {
        status: validation.status === 'invalid' ? 'partial_success' : 'success',
        scenePlan: plan,
        sceneName: parsed.sceneName,
        production: parsed.production,
        episode: parsed.episode,
        durationSeconds: parsed.durationSeconds,
        fps: parsed.fps,
        characterCount: parsed.characters.length,
        characters: parsed.characters.map(c => c.name),
        setting: parsed.setting,
        hasDialogues: (parsed.lipsyncPlan?.dialogues.length || 0) > 0,
        confidence: parsed.confidence,
        warnings: parsed.warnings,
        validation,
        savedPath,
        agentPrompt: PromptParser.generateAgentPrompt(parsed),
        nextSteps: [
          savedPath
            ? { tool: 'harmony.autopilot.run_scene_plan', params: { scenePlanPath: savedPath }, description: 'Запустить автопилот с этим планом' }
            : { tool: 'harmony.studio.run_full_pipeline', params: { scenePlanInline: plan }, description: 'Запустить полный пайплайн' }
        ]
      };
    }
  }
];


function mapKitsuStatus(s: string): string {
  switch (s) {
    case 'todo': return 'todo';
    case 'in_progress': return 'wip';
    case 'ready_for': return 'toReview';
    case 'done': return 'done';
    case 'failed': return 'failed';
    default: return s;
  }
}

function parseCsv(raw: string): any[] {
  const lines = raw.split(/\r?\n/).filter(l => l.trim().length);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = line.split(',');
    const obj: any = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim(); });
    if (obj.frames) obj.frames = parseInt(obj.frames, 10) || 0;
    if (obj.duration) obj.duration = parseFloat(obj.duration) || 0;
    return obj;
  });
}