import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createStandardExecutionResult } from '../schemas/executionResult.js';
import { QualityDirector } from '../adapters/qualityDirector/index.js';
import { verifyPathAccess } from '../security.js';
import { defineTool } from './defineTool.js';

/**
 * qualityEngineTools — scene/episode review and fix planning.
 *
 * These were placeholders returning a fixed `score: 92`, `similarityScore: 0.94`
 * and `Auto-fix: ${issue}` strings. `QualityDirector.scoreScene()` already
 * implemented real structural scoring (with genuine deductions for a missing
 * location, no characters, too-short duration) and was never called.
 *
 * Honest split:
 *   * structural scoring, fix planning and approval records run for real;
 *   * pixel comparison delegates to reconstruction-core (OpenCV SSIM) and
 *     reports plainly when that service is unreachable — no invented similarity;
 *   * applying fixes to a live scene produces a validated plan, not a claim.
 */

const director = new QualityDirector();

/** Scene shape the scorer understands. Kept loose: callers pass scene_plan.json. */
const sceneSchema = z.object({
  sceneId: z.string(),
  location: z.string().optional(),
  characters: z.array(z.string()).optional(),
  durationFrames: z.number().optional(),
  mood: z.string().optional(),
  cameraNotes: z.string().optional()
});

const issueSchema = z.object({
  id: z.string().optional(),
  category: z.enum([
    'missing_asset', 'broken_node', 'timing', 'composition',
    'continuity', 'lip_sync', 'palette', 'other'
  ]).optional().default('other'),
  severity: z.enum(['critical', 'major', 'minor']).optional().default('minor'),
  target: z.string().optional().describe('Нода, слой или кадр.'),
  detail: z.string()
});

type Issue = z.infer<typeof issueSchema>;

/**
 * Which issue categories can be repaired mechanically without judgement.
 *
 * Composition and continuity are deliberately excluded: they need a human or a
 * director pass, and auto-"fixing" them would silently change intent.
 */
const SAFE_CATEGORIES = new Set(['missing_asset', 'timing', 'palette', 'lip_sync']);

const SEVERITY_PENALTY: Record<string, number> = { critical: 25, major: 10, minor: 3 };

function fixForIssue(issue: Issue): { issue: Issue; action: string; safe: boolean; rationale: string } {
  const target = issue.target ?? 'сцена';
  switch (issue.category) {
    case 'missing_asset':
      return {
        issue, safe: true,
        action: `Подставить placeholder-ассет для "${target}" и внести в реестр как требующий замены.`,
        rationale: 'Отсутствующий ассет ломает рендер; placeholder восстанавливает работоспособность без изменения замысла.'
      };
    case 'timing':
      return {
        issue, safe: true,
        action: `Пересчитать экспозиции на "${target}" под длительность сцены.`,
        rationale: 'Тайминг вычисляется арифметически из длительности и fps.'
      };
    case 'palette':
      return {
        issue, safe: true,
        action: `Привязать "${target}" к палитре ShowBible.`,
        rationale: 'Цвета берутся из утверждённой палитры — однозначная замена.'
      };
    case 'lip_sync':
      return {
        issue, safe: true,
        action: `Перегенерировать виземы для "${target}" из аудио.`,
        rationale: 'Виземы выводятся из измеренной акустики, решение не творческое.'
      };
    case 'broken_node':
      return {
        issue, safe: false,
        action: `Восстановить связи ноды "${target}" в Harmony.`,
        rationale: 'Требует живой сцены: связи нод недоступны офлайн.'
      };
    case 'composition':
      return {
        issue, safe: false,
        action: `Пересмотреть кадрирование "${target}" (нужно решение режиссёра).`,
        rationale: 'Композиция — творческое решение, автоправка изменила бы замысел.'
      };
    case 'continuity':
      return {
        issue, safe: false,
        action: `Сверить "${target}" с предыдущей сценой вручную.`,
        rationale: 'Непрерывность требует контекста соседних сцен и человеческой оценки.'
      };
    default:
      return {
        issue, safe: false,
        action: `Разобрать вручную: ${issue.detail}`,
        rationale: 'Категория не распознана — автоматическое исправление небезопасно.'
      };
  }
}

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export const qualityEngineTools = [
  defineTool({
    name: 'harmony.quality.review_scene',
    description: 'Оценить сцену по структуре: композиция, актёрская игра, тайминг, техника, непрерывность (реальный скоринг).',
    inputSchema: z.object({
      scene: sceneSchema.describe('Объект сцены (scene_plan.json).'),
      knownIssues: z.array(issueSchema).optional().default([])
    }),
    handler: async (args) => {
      const scene = args.scene;
      const knownIssues = args.knownIssues ?? [];

      // Real structural scoring — see QualityDirector.scoreScene().
      const scores = director.scoreScene(scene, {});

      // Reported issues lower the score by severity; a critical defect must not
      // leave a scene looking 92/100.
      const issuePenalty = knownIssues.reduce(
        (sum, issue) => sum + (SEVERITY_PENALTY[issue.severity ?? 'minor'] ?? 3), 0
      );
      const finalScore = Math.max(0, scores.total - issuePenalty);

      // Derive structural findings from the scene itself.
      const findings: string[] = [];
      if (!scene.location) findings.push('Не задана локация — фон не может быть собран.');
      if (!scene.characters || scene.characters.length === 0) findings.push('В сцене нет персонажей.');
      if (!scene.durationFrames || scene.durationFrames <= 0) findings.push('Длительность не задана.');
      else if (scene.durationFrames < 12) findings.push(`Длительность ${scene.durationFrames} кадров — меньше 0.5с при 24fps.`);
      if (!scene.cameraNotes) findings.push('Нет заметок по камере — кадрирование не определено.');
      if (!scene.mood || scene.mood === 'generic') findings.push('Настроение не задано — актёрская игра будет нейтральной.');

      const criticalIssues = knownIssues.filter(i => i.severity === 'critical');
      const technicalPass = criticalIssues.length === 0 && scores.technical >= 70;

      return {
        ...createStandardExecutionResult({
          status: technicalPass ? 'success' : 'partial_success',
          simulated: false,
          isRealHarmonyExecution: false,
          warnings: findings,
          errors: criticalIssues.map(i => `[critical] ${i.detail}`),
          details: {
            sceneId: scene.sceneId,
            score: finalScore,
            breakdown: scores,
            issuePenalty,
            technicalCheck: {
              pass: technicalPass,
              technicalScore: scores.technical,
              criticalIssueCount: criticalIssues.length,
              structuralFindings: findings
            },
            // Pixel-level verification requires a render; not claimed here.
            visualCheck: {
              evaluated: false,
              reason: 'Визуальная проверка требует рендера — используйте harmony.quality.compare_to_references.'
            },
            issues: knownIssues
          }
        }),
        verification: 'verified_real',
        note: 'Структурный скоринг выполнен реально. Пиксельная проверка — отдельным инструментом.'
      };
    }
  }),

  defineTool({
    name: 'harmony.quality.review_episode',
    description: 'Свести оценки сцен в оценку эпизода (реальная агрегация, не фиксированные 90).',
    inputSchema: z.object({
      scenes: z.array(sceneSchema).min(1).describe('Сцены эпизода.'),
      passThreshold: z.number().min(0).max(100).optional().default(70)
    }),
    handler: async (args) => {
      const threshold = args.passThreshold ?? 70;

      const sceneReports = args.scenes.map(scene => {
        const scores = director.scoreScene(scene, {});
        return {
          type: 'scene' as const,
          target: scene.sceneId,
          sceneId: scene.sceneId,
          sceneScore: scores.total,
          breakdown: scores,
          passed: scores.total >= threshold
        };
      });

      const overall = director.scoreEpisode(sceneReports);
      const failing = sceneReports.filter(r => !r.passed);
      const weakest = [...sceneReports].sort((a, b) => a.sceneScore - b.sceneScore)[0];

      return {
        ...createStandardExecutionResult({
          status: failing.length === 0 ? 'success' : 'partial_success',
          simulated: false,
          isRealHarmonyExecution: false,
          warnings: failing.map(r => `Сцена ${r.sceneId}: ${r.sceneScore} < порога ${threshold}.`),
          details: {
            overallEpisodeScore: overall,
            sceneCount: sceneReports.length,
            passThreshold: threshold,
            passedCount: sceneReports.length - failing.length,
            failedCount: failing.length,
            weakestScene: weakest ? { sceneId: weakest.sceneId, score: weakest.sceneScore } : null,
            sceneReports
          }
        }),
        verification: 'verified_real'
      };
    }
  }),

  defineTool({
    name: 'harmony.quality.compare_to_references',
    description: 'Сравнить рендер с референсом через reconstruction-core (OpenCV SSIM). Без сервиса — честный отказ.',
    inputSchema: z.object({
      renderPath: z.string(),
      referencePath: z.string(),
      frame: z.number().int().nonnegative().optional().default(0)
    }),
    handler: async (args) => {
      const renderPath = verifyPathAccess(args.renderPath);
      const referencePath = verifyPathAccess(args.referencePath);

      const missing = [renderPath, referencePath].filter(p => !fs.existsSync(p));
      if (missing.length > 0) {
        return createStandardExecutionResult({
          status: 'blocked',
          simulated: false,
          isRealHarmonyExecution: false,
          errors: missing.map(p => `[FILE_NOT_FOUND] Файл не найден: ${p}`),
          details: { renderPath, referencePath, similarityScore: null }
        });
      }

      // Pixel comparison needs OpenCV, which lives in the Python service.
      const { ReconstructionClient } = await import('../adapters/reconstructionClient.js');
      try {
        const client = new ReconstructionClient();
        const response: any = await client.compareRender([
          { frame: args.frame ?? 0, sourcePath: referencePath, renderPath }
        ]);

        const pair = response?.pairs?.[0] ?? response?.results?.[0] ?? response;
        const similarity = pair?.ssim ?? pair?.similarity ?? pair?.similarityScore ?? null;

        return {
          ...createStandardExecutionResult({
            status: similarity === null ? 'partial_success' : 'success',
            simulated: false,
            isRealHarmonyExecution: false,
            warnings: similarity === null
              ? ['Сервис ответил, но метрика похожести не найдена в ответе.']
              : [],
            details: {
              renderPath, referencePath, frame: args.frame ?? 0,
              similarityScore: similarity,
              metric: 'ssim',
              raw: pair
            }
          }),
          verification: similarity === null ? 'implemented_unverified' : 'verified_real'
        };
      } catch (err: any) {
        // The placeholder answered 0.94 regardless. Reporting nothing is correct.
        return {
          ...createStandardExecutionResult({
            status: 'blocked',
            simulated: false,
            isRealHarmonyExecution: false,
            errors: [
              `[SERVICE_UNAVAILABLE] Сравнение требует reconstruction-core ` +
              `(запустите \`npm run reconstruction:core\`). Причина: ${err?.message ?? err}`
            ],
            details: { renderPath, referencePath, similarityScore: null }
          }),
          verification: 'not_implemented'
        };
      }
    }
  }),

  defineTool({
    name: 'harmony.quality.generate_fix_plan',
    description: 'Построить план исправлений с разделением на безопасные и требующие человека.',
    inputSchema: z.object({
      issues: z.array(issueSchema).min(1),
      sceneId: z.string().optional()
    }),
    handler: async (args) => {
      const fixes = args.issues.map(fixForIssue);
      const safe = fixes.filter(f => f.safe);
      const manual = fixes.filter(f => !f.safe);

      // Critical defects go first: a broken render blocks everything downstream.
      const order = { critical: 0, major: 1, minor: 2 } as Record<string, number>;
      const ordered = [...fixes].sort(
        (a, b) => (order[a.issue.severity ?? 'minor'] ?? 2) - (order[b.issue.severity ?? 'minor'] ?? 2)
      );

      return {
        ...createStandardExecutionResult({
          status: 'success',
          simulated: false,
          isRealHarmonyExecution: false,
          details: {
            sceneId: args.sceneId ?? null,
            issueCount: args.issues.length,
            safeFixCount: safe.length,
            manualFixCount: manual.length,
            // Ordered execution plan, each step carrying why it is safe or not.
            fixPlan: ordered.map((fix, index) => ({
              step: index + 1,
              category: fix.issue.category,
              severity: fix.issue.severity,
              target: fix.issue.target ?? null,
              action: fix.action,
              safe: fix.safe,
              rationale: fix.rationale
            })),
            requiresHumanReview: manual.length > 0
          }
        }),
        verification: 'verified_real'
      };
    }
  }),

  defineTool({
    name: 'harmony.quality.apply_safe_fixes',
    description: 'Применить безопасные исправления: строит и валидирует план команд (выполнение требует Harmony).',
    inputSchema: z.object({
      sceneId: z.string(),
      issues: z.array(issueSchema).min(1)
    }),
    handler: async (args) => {
      const fixes = args.issues.map(fixForIssue);
      const safe = fixes.filter(f => f.safe);
      const skipped = fixes.filter(f => !f.safe);

      if (safe.length === 0) {
        return {
          ...createStandardExecutionResult({
            status: 'requires_human',
            simulated: false,
            isRealHarmonyExecution: false,
            requiresHumanReview: true,
            warnings: skipped.map(f => `Пропущено (небезопасно): ${f.action}`),
            details: {
              sceneId: args.sceneId,
              safeFixesAppliedCount: 0,
              skippedCount: skipped.length,
              reason: 'Ни одно исправление не является безопасным для автоматического применения.'
            }
          }),
          verification: 'verified_real'
        };
      }

      const commands = safe.map(fix => ({
        command: 'apply_quality_fix',
        sceneId: args.sceneId,
        category: fix.issue.category,
        target: fix.issue.target ?? args.sceneId,
        action: fix.action
      }));

      return {
        ...createStandardExecutionResult({
          status: 'success',
          simulated: false,
          isRealHarmonyExecution: false,
          // The plan is real; mutating a scene is not possible without Harmony.
          requiresRealHarmony: true,
          warnings: skipped.map(f => `Требует человека: ${f.action}`),
          details: {
            sceneId: args.sceneId,
            safeFixesPlannedCount: safe.length,
            skippedCount: skipped.length,
            commandCount: commands.length,
            commands,
            planId: `qfix_${sha256(JSON.stringify(commands)).slice(0, 12)}`
          }
        }),
        verification: 'implemented_unverified',
        note: 'План безопасных правок построен и провалидирован. Применение требует лицензированной Harmony.'
      };
    }
  }),

  defineTool({
    name: 'harmony.quality.request_human_review',
    description: 'Отправить сцену на ручное ревью супервайзеру.',
    inputSchema: z.object({
      sceneId: z.string(),
      reason: z.string(),
      priority: z.enum(['low', 'normal', 'high', 'blocking']).optional().default('normal'),
      reviewQueueDir: z.string().optional()
    }),
    handler: async (args) => {
      // Persist the request so it is an actual queue entry, not just a response.
      const queueDir = verifyPathAccess(
        args.reviewQueueDir ?? path.join(process.cwd(), 'output', 'review_queue')
      );
      fs.mkdirSync(queueDir, { recursive: true });

      const requestedAt = new Date().toISOString();
      const entry = {
        schemaVersion: '1.0',
        sceneId: args.sceneId,
        reason: args.reason,
        priority: args.priority ?? 'normal',
        requestedAt,
        status: 'pending_human_review'
      };
      const entryPath = path.join(
        queueDir,
        `${args.sceneId}_${sha256(args.sceneId + requestedAt).slice(0, 8)}.json`
      );
      fs.writeFileSync(entryPath, JSON.stringify(entry, null, 2), 'utf-8');

      return {
        ...createStandardExecutionResult({
          status: 'requires_human',
          simulated: false,
          isRealHarmonyExecution: false,
          requiresHumanReview: true,
          artifacts: [entryPath],
          details: { ...entry, queueEntryPath: entryPath }
        }),
        verification: 'verified_real'
      };
    }
  }),

  defineTool({
    name: 'harmony.quality.approve',
    description: 'Утвердить сцену: реальная запись утверждения с оценкой и хешем.',
    inputSchema: z.object({
      sceneId: z.string(),
      approver: z.string().optional().default('QualityDirector'),
      score: z.number().min(0).max(100).optional(),
      approvalsDir: z.string().optional()
    }),
    handler: async (args) => {
      const approvalsDir = verifyPathAccess(
        args.approvalsDir ?? path.join(process.cwd(), 'output', 'approvals')
      );
      fs.mkdirSync(approvalsDir, { recursive: true });

      const approvedAt = new Date().toISOString();
      const record = {
        schemaVersion: '1.0',
        sceneId: args.sceneId,
        approver: args.approver ?? 'QualityDirector',
        score: args.score ?? null,
        approvedAt,
        // Content-addressed so an approval cannot be silently edited later.
        approvalDigest: sha256(`${args.sceneId}|${args.approver ?? ''}|${args.score ?? ''}|${approvedAt}`)
      };
      const recordPath = path.join(approvalsDir, `${args.sceneId}.approval.json`);
      fs.writeFileSync(recordPath, JSON.stringify(record, null, 2), 'utf-8');

      return {
        ...createStandardExecutionResult({
          status: 'success',
          simulated: false,
          isRealHarmonyExecution: false,
          artifacts: [recordPath],
          details: { ...record, approved: true, recordPath }
        }),
        verification: 'verified_real'
      };
    }
  })
];
