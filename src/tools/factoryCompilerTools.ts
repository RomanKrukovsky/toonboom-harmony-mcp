import { z } from 'zod';
import { ShowBibleLoader } from '../services/showBibleLoader/index.js';
import { ShotManifestCompiler } from '../services/shotManifestCompiler/index.js';
import { RetakeEngine } from '../services/retakeEngine/index.js';
import {
  FactoryShotSessionStore,
  type RetakeNote
} from '../services/factoryShotSessionStore/index.js';
import { performancePirSchema } from '../schemas/performancePir.js';
import { qaReportSchema } from '../schemas/qaReport.js';
import type { ShotManifest } from '../schemas/shotManifest.js';
import type { PerformancePIR } from '../schemas/performancePir.js';
import type { QaReport } from '../schemas/qaReport.js';
import type { QaThresholds } from '../schemas/showBible.js';
import type { ShotMetrics } from '../services/retakeEngine/index.js';

/**
 * harmony.factory.compile_shot
 *
 * Compiles a ShotManifest into a PerformancePIR, gated by the ShowBible
 * family. The LLM director is only allowed to make decisions that are
 * declared in the ShowBible; any unknown shot size / camera move / emotion /
 * character is a hard rejection.
 *
 * Roadmap contract (see ROADMAP.md):
 *   script -> ShotManifest -> PerformancePIR -> HarmonyCommandPlan
 */

const loader = new ShowBibleLoader();
const compiler = new ShotManifestCompiler();
const retakeEngine = new RetakeEngine();
const sessionStore = new FactoryShotSessionStore();

type CompileShotArgs = {
  showBiblePath: string;
  shotManifest: ShotManifest;
};
type CompileShotResult =
  | {
      status: 'success';
      executed: true;
      verified: true;
      violations: ReturnType<ShotManifestCompiler['compile']>['violations'];
      warnings: ReturnType<ShotManifestCompiler['compile']>['warnings'];
      performancePIR: PerformancePIR;
      showBible: { showId: string; title?: string };
      message: string;
    }
  | {
      status: 'rejected';
      executed: false;
      verified: true;
      violations: ReturnType<ShotManifestCompiler['compile']>['violations'];
      warnings: ReturnType<ShotManifestCompiler['compile']>['warnings'];
      showBible: {
        showId: string;
        allowedShotSizes?: readonly string[];
        allowedCameraMoves?: readonly string[];
        allowedEmotions?: readonly string[];
        characterIds?: readonly string[];
      };
      message: string;
    }
  | {
      status: 'error';
      executed: false;
      verified: false;
      violations: ReturnType<ShotManifestCompiler['compile']>['violations'];
      warnings: ReturnType<ShotManifestCompiler['compile']>['warnings'];
      message: string;
      errors: ReturnType<typeof performancePirSchema.safeParse> extends infer R
        ? R extends { success: false; error: infer E }
          ? E extends { issues: infer I }
            ? I
            : never
          : never
        : never;
    };

type QaCheckArgs = {
  showBiblePath: string;
  shotId: string;
  performancePIR: PerformancePIR;
  metrics: ShotMetrics;
};
type QaCheckResult =
  | {
      status: 'success';
      executed: true;
      verified: true;
      qaReport: QaReport;
      showBible: { showId: string; thresholdsId: string };
      message: string;
    }
  | {
      status: 'error';
      executed: false;
      verified: false;
      message: string;
      errors: ReadonlyArray<{ path: ReadonlyArray<string | number>; message: string }>;
    };

type SessionStartArgs = {
  shotManifest: ShotManifest;
  performancePIR: PerformancePIR;
  qaReport: QaReport;
};
type SessionStartResult = {
  status: 'success' | 'error';
  executed: boolean;
  verified: boolean;
  session?: ReturnType<FactoryShotSessionStore['start']>;
  message: string;
};

type SessionDecideArgs = {
  sessionId: string;
  decision: 'approve' | 'reject';
  decidedBy: string;
  retakeNote?: Omit<RetakeNote, 'at'>;
};
type SessionDecideResult = {
  status: 'success' | 'error';
  executed: boolean;
  verified: boolean;
  session?: ReturnType<FactoryShotSessionStore['approve']> | ReturnType<FactoryShotSessionStore['reject']>;
  message: string;
};

interface CompileShotTool {
  name: 'harmony.factory.compile_shot';
  description: string;
  inputSchema: z.ZodObject<{
    showBiblePath: z.ZodString;
    shotManifest: z.ZodRecord<z.ZodString, z.ZodAny>;
  }>;
  handler: (args: CompileShotArgs) => Promise<CompileShotResult>;
}

interface QaCheckTool {
  name: 'harmony.factory.qa_check';
  description: string;
  inputSchema: z.ZodObject<{
    showBiblePath: z.ZodString;
    shotId: z.ZodString;
    performancePIR: z.ZodRecord<z.ZodString, z.ZodAny>;
    metrics: z.ZodObject<{
      silhouetteQuality: z.ZodOptional<z.ZodNumber>;
      lipsyncDriftMs: z.ZodOptional<z.ZodNumber>;
      continuityDeltaFrames: z.ZodOptional<z.ZodNumber>;
      lineThicknessDeltaPt: z.ZodOptional<z.ZodNumber>;
      paletteDelta: z.ZodOptional<z.ZodNumber>;
      poseLibraryMatch: z.ZodOptional<z.ZodNumber>;
    }>;
  }>;
  handler: (args: QaCheckArgs) => Promise<QaCheckResult>;
}

interface SessionStartTool {
  name: 'harmony.factory.session.start';
  description: string;
  inputSchema: z.ZodObject<{
    shotManifest: z.ZodRecord<z.ZodString, z.ZodAny>;
    performancePIR: z.ZodRecord<z.ZodString, z.ZodAny>;
    qaReport: z.ZodRecord<z.ZodString, z.ZodAny>;
  }>;
  handler: (args: SessionStartArgs) => Promise<SessionStartResult>;
}

interface SessionDecideTool {
  name: 'harmony.factory.session.decide';
  description: string;
  inputSchema: z.ZodObject<{
    sessionId: z.ZodString;
    decision: z.ZodEnum<['approve', 'reject']>;
    decidedBy: z.ZodString;
    retakeNote: z.ZodOptional<
      z.ZodObject<{
        author: z.ZodString;
        body: z.ZodString;
        severity: z.ZodEnum<['low', 'medium', 'high', 'critical']>;
      }>
    >;
  }>;
  handler: (args: SessionDecideArgs) => Promise<SessionDecideResult>;
}

export const factoryCompilerTools: [
  CompileShotTool,
  QaCheckTool,
  SessionStartTool,
  SessionDecideTool
] = [
  {
    name: 'harmony.factory.compile_shot',
    description:
      'Компилировать ShotManifest в PerformancePIR с проверкой против ShowBible. ' +
      'Любой неизвестный shot size / camera move / emotion / character — жёсткий отказ. ' +
      'LLM-режиссёр может принимать решения только внутри ShowBible.',
    inputSchema: z.object({
      showBiblePath: z.string().describe('Путь к show_bible.json (остальные 5 документов грузятся по ссылкам).'),
      shotManifest: z.record(z.any()).describe('Объект shot_manifest.json.')
    }),
    handler: async (args: CompileShotArgs): Promise<CompileShotResult> => {
      const loaded = loader.load(args.showBiblePath);
      const controllerMaps = loader.buildControllerMaps(loaded);
      const { performance, violations, warnings } = compiler.compile(
        args.shotManifest,
        loaded.crossRefs,
        { controllerMaps }
      );

      const pirParse = performancePirSchema.safeParse(performance);
      if (!pirParse.success) {
        return {
          status: 'error',
          executed: false,
          verified: false,
          violations,
          warnings,
          message: 'PerformancePIR failed schema validation after compile',
          errors: pirParse.error.issues
        };
      }

      if (violations.length > 0) {
        return {
          status: 'rejected',
          executed: false,
          verified: true,
          violations,
          warnings,
          showBible: {
            showId: loaded.showBible.showId,
            allowedShotSizes: loaded.crossRefs.cameraRules?.allowedShotSizes,
            allowedCameraMoves: loaded.crossRefs.cameraRules?.allowedCameraMoves,
            allowedEmotions: loaded.crossRefs.motionGrammar?.allowedEmotions,
            characterIds: loaded.crossRefs.characterIds
          },
          message: 'ShotManifest rejected: it references moves/emotions/characters not declared in the ShowBible.'
        };
      }

      return {
        status: 'success',
        executed: true,
        verified: true,
        violations,
        warnings,
        performancePIR: pirParse.data,
        showBible: {
          showId: loaded.showBible.showId,
          title: loaded.showBible.title
        },
        message: `Shot "${args.shotManifest.shotId}" compiled to PerformancePIR "${pirParse.data.performanceId}".`
      };
    }
  },
  {
    name: 'harmony.factory.qa_check',
    description:
      'Проверить отрендеренный шот против QaThresholds из ShowBible. ' +
      'Возвращает QaReport с overallStatus (approved / needs_retake / blocked), ' +
      'списком findings и флагом requiresHumanApproval. ' +
      'Метрики (silhouette quality, lipsync drift, ...) передаются на вход; ' +
      'движок только применяет пороги детерминированно.',
    inputSchema: z.object({
      showBiblePath: z.string().describe('Путь к show_bible.json (qa_thresholds грузится по ссылке).'),
      shotId: z.string().min(1).describe('Shot identifier for QA scope.'),
      performancePIR: z.record(z.any()).describe('Объект PerformancePIR из harmony.factory.compile_shot.'),
      metrics: z.object({
        silhouetteQuality: z.number().min(0).max(1).optional(),
        lipsyncDriftMs: z.number().min(0).optional(),
        continuityDeltaFrames: z.number().min(0).optional(),
        lineThicknessDeltaPt: z.number().min(0).optional(),
        paletteDelta: z.number().min(0).max(1).optional(),
        poseLibraryMatch: z.number().min(0).max(1).optional()
      }).describe('Измеренные метрики рендера (от ML-сервисов).')
    }),
    handler: async (args: QaCheckArgs): Promise<QaCheckResult> => {
      const loaded = loader.load(args.showBiblePath);
      const thresholds: QaThresholds = loaded.qaThresholds;

      const pirParse = performancePirSchema.safeParse(args.performancePIR);
      if (!pirParse.success) {
        return {
          status: 'error',
          executed: false,
          verified: false,
          message: 'performancePIR failed schema validation',
          errors: pirParse.error.issues
        };
      }

      const report = retakeEngine.evaluate(args.shotId, pirParse.data, args.metrics, thresholds);
      const reportParse = qaReportSchema.safeParse(report);
      if (!reportParse.success) {
        return {
          status: 'error',
          executed: false,
          verified: false,
          message: 'QaReport failed schema validation',
          errors: reportParse.error.issues
        };
      }

      return {
        status: 'success',
        executed: true,
        verified: true,
        qaReport: report,
        showBible: {
          showId: loaded.showBible.showId,
          thresholdsId: thresholds.thresholdsId
        },
        message: `Shot "${args.shotId}" QA: ${report.overallStatus} (${report.findings.length} finding(s), requiresHumanApproval=${report.requiresHumanApproval}).`
      };
    }
  },
  {
    name: 'harmony.factory.session.start',
    description:
      'Создать immutable FactoryShotSession, связывающую ShotManifest + PerformancePIR + QaReport ' +
      'в одну запись датасета. Сессия остаётся pending до вызова session.decide. ' +
      'Content-addressed по SHA-256 от стабильной сериализации артефактов.',
    inputSchema: z.object({
      shotManifest: z.record(z.any()).describe('Объект shot_manifest.json.'),
      performancePIR: z.record(z.any()).describe('Объект PerformancePIR.'),
      qaReport: z.record(z.any()).describe('Объект QaReport из harmony.factory.qa_check.')
    }),
    handler: async (args: SessionStartArgs): Promise<SessionStartResult> => {
      const session = sessionStore.start({
        shotManifest: args.shotManifest,
        performancePIR: args.performancePIR,
        qaReport: args.qaReport
      });
      return {
        status: 'success',
        executed: true,
        verified: true,
        session,
        message: `FactoryShotSession "${session.sessionId}" created for shot "${session.shotId}" (status=pending).`
      };
    }
  },
  {
    name: 'harmony.factory.session.decide',
    description:
      'Записать решение человека (approve / reject) по FactoryShotSession и опционально добавить retake note. ' +
      'После decide сессия замораживается — дальнейшие мутации бросают ошибку.',
    inputSchema: z.object({
      sessionId: z.string().min(1),
      decision: z.enum(['approve', 'reject']),
      decidedBy: z.string().min(1),
      retakeNote: z.object({
        author: z.string().min(1),
        body: z.string().min(1),
        severity: z.enum(['low', 'medium', 'high', 'critical'])
      }).optional()
    }),
    handler: async (args: SessionDecideArgs): Promise<SessionDecideResult> => {
      const existing = sessionStore.get(args.sessionId);
      if (!existing) {
        return {
          status: 'error',
          executed: false,
          verified: false,
          message: `FactoryShotSession not found: ${args.sessionId}`
        };
      }
      if (existing.status !== 'pending') {
        return {
          status: 'error',
          executed: false,
          verified: false,
          message: `Session "${args.sessionId}" is already frozen (status=${existing.status}).`
        };
      }
      if (args.retakeNote) {
        const note: RetakeNote = { ...args.retakeNote, at: new Date().toISOString() };
        sessionStore.addRetakeNote(args.sessionId, note);
      }
      const decided = args.decision === 'approve'
        ? sessionStore.approve(args.sessionId, args.decidedBy)
        : sessionStore.reject(args.sessionId, args.decidedBy);
      return {
        status: 'success',
        executed: true,
        verified: true,
        session: decided,
        message: `Session "${args.sessionId}" ${args.decision}d by ${args.decidedBy}.`
      };
    }
  }
];