import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { HarmonySceneCompiler } from '../adapters/harmonySceneCompiler.js';
import { ReconstructionClient } from '../adapters/reconstructionClient.js';
import { reconstructionManifestSchema, reconstructionRequestSchema } from '../schemas/reconstruction.js';
import { enforceDestructiveSafety, HarmonyError, verifyPathAccess } from '../security.js';

const client = new ReconstructionClient();
const compiler = new HarmonySceneCompiler();

function checkedVideo(videoPath: string) {
  const checked = verifyPathAccess(videoPath);
  if (!fs.existsSync(checked) || !fs.statSync(checked).isFile()) {
    throw new HarmonyError('RECONSTRUCTION_FAILED', `Видеофайл не найден: ${checked}`);
  }
  return checked;
}

const analysisSchema = reconstructionRequestSchema.pick({
  videoPath: true,
  startFrame: true,
  endFrame: true,
  targetFps: true,
  maxColors: true,
  dedupThreshold: true,
  cleanupProfile: true,
  backgroundMode: true
});

export const reconstructionTools = [
  {
    name: 'harmony.reconstruct.health',
    description: 'Проверка Python core, FFmpeg и доступных режимов реконструкции.',
    inputSchema: z.object({}),
    handler: async () => client.health()
  },
  {
    name: 'harmony.reconstruct.analyze_video',
    description: 'Проверяет видео, извлекает метаданные и оценивает дубликаты без изменения Harmony.',
    inputSchema: analysisSchema,
    handler: async (args: any) => client.analyze({
      ...args,
      videoPath: checkedVideo(args.videoPath)
    })
  },
  {
    name: 'harmony.reconstruct.video_to_editable_scene',
    description: 'MP4 → уникальные векторные drawings → палитра → exposures → нативная сцена Harmony. По умолчанию dry-run.',
    inputSchema: reconstructionRequestSchema,
    handler: async (args: any) => {
      const videoPath = checkedVideo(args.videoPath);
      if (args.mode !== 'frame_by_frame_vector') {
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', `Режим ${args.mode} пока не готов. Рабочий вертикальный путь: frame_by_frame_vector.`);
      }
      const job = await client.reconstruct({
        ...args,
        videoPath
      });
      if (job.status !== 'completed' || !job.manifestPath) return job;
      const manifestPath = verifyPathAccess(job.manifestPath);
      const manifest = client.loadManifest(manifestPath);
      if (args.dryRun !== false) {
        return {
          ...job,
          execution: 'dry_run',
          manifestValidated: true,
          realSceneCreated: false,
          editableNativeDrawings: false,
          note: 'Видео обработано и манифест валиден; Harmony не изменялась.'
        };
      }
      if (!args.targetProjectPath || !args.outputProjectPath) {
        throw new HarmonyError('INVALID_HARMONY_OBJECT', 'Для real execution нужны targetProjectPath и отдельный outputProjectPath.');
      }
      enforceDestructiveSafety('video_to_editable_scene', args);

      try {
        const compileResult = await compiler.compile(manifest, {
          targetProjectPath: verifyPathAccess(args.targetProjectPath),
          outputProjectPath: verifyPathAccess(args.outputProjectPath),
          dryRun: false
        });
        return { ...job, ...compileResult, manifestPath };
      } catch (err: any) {
        if (err instanceof HarmonyError && (err.code === 'PYTHON_API_UNAVAILABLE' || err.code === 'HARMONY_SCENE_VERIFICATION_FAILED')) {
          const plan = compiler.generateCommandPlan(manifest);
          const outDir = path.dirname(verifyPathAccess(args.outputProjectPath));
          fs.mkdirSync(outDir, { recursive: true });
          fs.writeFileSync(path.join(outDir, 'command_plan.json'), JSON.stringify(plan, null, 2));

          return {
            ...job,
            manifestPath,
            pipelineBuilt: true,
            manifestGenerated: true,
            commandPlanGenerated: true,
            harmonyAvailable: false,
            harmonyApplied: false,
            nativeDrawingVerified: false,
            paletteVerifiedInHarmony: false,
            exposuresVerifiedInHarmony: false,
            previewRenderedByHarmony: false,
            status: 'ready_for_external_harmony_integration',
            note: `Локальная установка Harmony недоступна или не лицензирована (${err.message}). Промежуточный манифест и план команд успешно созданы и упакованы.`
          };
        }
        throw err;
      }
    }
  },
  {
    name: 'harmony.reconstruct.get_job',
    description: 'Структурированный статус задания реконструкции.',
    inputSchema: z.object({ jobId: z.string().min(8) }).strict(),
    handler: async ({ jobId }: { jobId: string }) => client.getJob(jobId)
  },
  {
    name: 'harmony.reconstruct.cancel_job',
    description: 'Корректная отмена задания реконструкции.',
    inputSchema: z.object({ jobId: z.string().min(8) }).strict(),
    handler: async ({ jobId }: { jobId: string }) => client.cancelJob(jobId)
  },
  {
    name: 'harmony.reconstruct.apply_manifest',
    description: 'Применяет заранее рассчитанный и строго валидированный манифест к копии сцены Harmony.',
    inputSchema: z.object({
      manifestPath: z.string().min(1),
      targetProjectPath: z.string().min(1),
      outputProjectPath: z.string().min(1),
      dryRun: z.boolean().default(true),
      confirm: z.boolean().optional(),
      confirmationText: z.string().optional()
    }).strict(),
    handler: async (args: any) => {
      const manifestPath = verifyPathAccess(args.manifestPath);
      const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const manifest = reconstructionManifestSchema.parse(raw);
      if (args.dryRun === false) enforceDestructiveSafety('apply_reconstruction_manifest', args);
      
      try {
        return await compiler.compile(manifest, {
          targetProjectPath: verifyPathAccess(args.targetProjectPath),
          outputProjectPath: verifyPathAccess(args.outputProjectPath),
          dryRun: args.dryRun !== false
        });
      } catch (err: any) {
        if (args.dryRun === false && err instanceof HarmonyError && (err.code === 'PYTHON_API_UNAVAILABLE' || err.code === 'HARMONY_SCENE_VERIFICATION_FAILED')) {
          const plan = compiler.generateCommandPlan(manifest);
          const outDir = path.dirname(verifyPathAccess(args.outputProjectPath));
          fs.mkdirSync(outDir, { recursive: true });
          fs.writeFileSync(path.join(outDir, 'command_plan.json'), JSON.stringify(plan, null, 2));

          return {
            pipelineBuilt: true,
            manifestGenerated: true,
            commandPlanGenerated: true,
            harmonyAvailable: false,
            harmonyApplied: false,
            nativeDrawingVerified: false,
            paletteVerifiedInHarmony: false,
            exposuresVerifiedInHarmony: false,
            previewRenderedByHarmony: false,
            status: 'ready_for_external_harmony_integration',
            note: `Локальная установка Harmony недоступна или не лицензирована (${err.message}). План команд сгенерирован и упакован.`
          };
        }
        throw err;
      }
    }
  },
  
  // V2 ADDENDUM MCP TOOLS (Task 4, 8, 9)
  {
    name: 'harmony.reconstruct.get_problem_frames',
    description: 'Возвращает список проблемных кадров с низкой уверенностью векторизации, скачками контуров и т.д.',
    inputSchema: z.object({ jobId: z.string().min(8) }).strict(),
    handler: async ({ jobId }: { jobId: string }) => {
      const job = await client.getJob(jobId);
      if (!job.manifestPath) {
        throw new HarmonyError('INVALID_RECONSTRUCTION_MANIFEST', 'Манифест еще не готов.');
      }
      const manifest = client.loadManifest(verifyPathAccess(job.manifestPath));
      return {
        jobId,
        problemFrames: manifest.diagnostics.problemFrames || []
      };
    }
  },
  {
    name: 'harmony.reconstruct.get_problem_frame',
    description: 'Возвращает подробную информацию по конкретному проблемному кадру, включая метрики и пути превью.',
    inputSchema: z.object({
      jobId: z.string().min(8),
      frame: z.number().int().positive()
    }).strict(),
    handler: async ({ jobId, frame }: { jobId: string; frame: number }) => {
      const job = await client.getJob(jobId);
      if (!job.manifestPath) {
        throw new HarmonyError('INVALID_RECONSTRUCTION_MANIFEST', 'Манифест еще не готов.');
      }
      const manifest = client.loadManifest(verifyPathAccess(job.manifestPath));
      const pf = (manifest.diagnostics.problemFrames || []).find(p => p.frame === frame);
      if (!pf) {
        throw new HarmonyError('INVALID_HARMONY_OBJECT', `Кадр ${frame} не зарегистрирован как проблемный.`);
      }
      return { jobId, problemFrame: pf };
    }
  },
  {
    name: 'harmony.reconstruct.refine_range',
    description: 'Локальный пересчет векторизации для выбранного интервала кадров с защитой locked элементов.',
    inputSchema: z.object({
      jobId: z.string().min(8),
      startFrame: z.number().int().positive(),
      endFrame: z.number().int().positive(),
      maxPointsPerShape: z.number().int().min(4).max(1000).optional()
    }).strict(),
    handler: async (args: any) => {
      return client.refineRange(args.jobId, {
        startFrame: args.startFrame,
        endFrame: args.endFrame,
        maxPointsPerShape: args.maxPointsPerShape
      });
    }
  },
  {
    name: 'harmony.reconstruct.lock_elements',
    description: 'Блокирует элемент и его рисунки (locks), защищая их от перезаписи при автоматическом refine.',
    inputSchema: z.object({
      jobId: z.string().min(8),
      elementId: z.string().min(1)
    }).strict(),
    handler: async ({ jobId, elementId }: { jobId: string; elementId: string }) => {
      return client.lockElements(jobId, elementId, true);
    }
  },
  {
    name: 'harmony.reconstruct.unlock_elements',
    description: 'Разблокирует элемент, разрешая его автоматический пересчет.',
    inputSchema: z.object({
      jobId: z.string().min(8),
      elementId: z.string().min(1)
    }).strict(),
    handler: async ({ jobId, elementId }: { jobId: string; elementId: string }) => {
      return client.lockElements(jobId, elementId, false);
    }
  },
  {
    name: 'harmony.reconstruct.list_versions',
    description: 'Возвращает историю версий манифеста и планов команд для данной джобы.',
    inputSchema: z.object({ jobId: z.string().min(8) }).strict(),
    handler: async ({ jobId }: { jobId: string }) => {
      return client.listVersions(jobId);
    }
  },
  {
    name: 'harmony.reconstruct.rollback_version',
    description: 'Откатывает манифест и план команд к выбранной версии из истории.',
    inputSchema: z.object({
      jobId: z.string().min(8),
      version: z.number().int().positive()
    }).strict(),
    handler: async ({ jobId, version }: { jobId: string; version: number }) => {
      return client.rollbackVersion(jobId, version);
    }
  }
];
