import { z } from 'zod';
import { MLClient } from '../clients/mlClient.js';
import { verifyPathAccess } from '../security.js';
import { MlOrchestrator } from '../services/mlOrchestrator/index.js';
import { getModelCatalog } from '../services/modelCatalog/index.js';
import { LicensePolicyEngine } from '../services/licensePolicyEngine/index.js';
import { listMlErrorDefinitions } from '../errors/mlErrorRegistry.js';
import { mlTaskTypeSchema, artifactReferenceSchema } from '../schemas/ml.js';

const client = new MLClient();

/**
 * The orchestrator owns a SQLite handle and reads the catalog, so it is created on first use
 * rather than at import time — importing a tool module must not open a database.
 */
let orchestrator: MlOrchestrator | null = null;
async function getOrchestrator(): Promise<MlOrchestrator> {
  if (!orchestrator) {
    orchestrator = new MlOrchestrator();
    await orchestrator.initialize();
  }
  return orchestrator;
}

/**
 * V2 tools, added alongside the existing `harmony.ml.*` names. Every original tool name is
 * preserved with its original behaviour; nothing that already calls them changes.
 */
export const mlOrchestratorTools = [
  {
    name: 'harmony.ml.v2.submit_job',
    description: 'Отправляет типизированную ML-задачу через оркестратор: валидация, выбор провайдера, лицензионный гейт, проверка весов, идемпотентность, provenance.',
    inputSchema: z.object({
      taskType: mlTaskTypeSchema,
      providerId: z.string().optional(),
      inputArtifacts: z.array(artifactReferenceSchema),
      parameters: z.record(z.unknown()).optional(),
      executionMode: z.enum(['simulation', 'offline_deterministic', 'real_ml', 'hybrid', 'real_harmony']).optional(),
      idempotencyKey: z.string().optional(),
      correlationId: z.string().optional(),
      timeoutMs: z.number().int().positive().optional(),
      seed: z.number().int().nullable().optional()
    }),
    handler: async (args: {
      taskType: z.infer<typeof mlTaskTypeSchema>;
      providerId?: string;
      inputArtifacts: z.infer<typeof artifactReferenceSchema>[];
      parameters?: Record<string, unknown>;
      executionMode?: 'simulation' | 'offline_deterministic' | 'real_ml' | 'hybrid' | 'real_harmony';
      idempotencyKey?: string;
      correlationId?: string;
      timeoutMs?: number;
      seed?: number | null;
    }) => (await getOrchestrator()).submitJob(args)
  },
  {
    name: 'harmony.ml.v2.get_job',
    description: 'Возвращает состояние ML-задачи из SQLite. Работает после перезапуска сервера.',
    inputSchema: z.object({ jobId: z.string() }),
    handler: async (args: { jobId: string }) => (await getOrchestrator()).getJob(args.jobId)
  },
  {
    name: 'harmony.ml.v2.wait_for_job',
    description: 'Ожидает завершения ML-задачи с собственным дедлайном.',
    inputSchema: z.object({ jobId: z.string(), timeoutMs: z.number().int().positive().optional() }),
    handler: async (args: { jobId: string; timeoutMs?: number }) =>
      (await getOrchestrator()).waitForJob(args.jobId, { timeoutMs: args.timeoutMs })
  },
  {
    name: 'harmony.ml.v2.cancel_job',
    description: 'Отменяет ML-задачу. Флаг отмены durable, поэтому переживает перезапуск.',
    inputSchema: z.object({ jobId: z.string() }),
    handler: async (args: { jobId: string }) => (await getOrchestrator()).cancelJob(args.jobId)
  },
  {
    name: 'harmony.ml.v2.retry_job',
    description: 'Повторяет задачу. Разрешено только для транспорта, OOM после освобождения памяти и падения worker; ошибки схемы, лицензии и хешей терминальны.',
    inputSchema: z.object({ jobId: z.string() }),
    handler: async (args: { jobId: string }) => (await getOrchestrator()).retryJob(args.jobId)
  },
  {
    name: 'harmony.ml.v2.select_provider',
    description: 'Показывает, какой провайдер будет выбран для задачи и почему остальные отклонены.',
    inputSchema: z.object({ taskType: mlTaskTypeSchema, preferredProviderId: z.string().optional() }),
    handler: async (args: { taskType: z.infer<typeof mlTaskTypeSchema>; preferredProviderId?: string }) =>
      (await getOrchestrator()).selectProvider(args.taskType, { preferredProviderId: args.preferredProviderId })
  },
  {
    name: 'harmony.ml.v2.get_model_readiness',
    description: 'Измеряет фактическое состояние весов на диске: наличие файлов и совпадение SHA-256 с каталогом.',
    inputSchema: z.object({ modelId: z.string().optional() }),
    handler: async (args: { modelId?: string }) => {
      const instance = await getOrchestrator();
      if (args.modelId) return instance.getModelReadiness(args.modelId, true);
      return getModelCatalog().list().map(entry => instance.getModelReadiness(entry.modelId, true));
    }
  },
  {
    name: 'harmony.ml.v2.get_provider_readiness',
    description: 'Проверяет готовность провайдера: обнаружение, конфликты, совместимость с оборудованием.',
    inputSchema: z.object({ providerId: z.string() }),
    handler: async (args: { providerId: string }) => (await getOrchestrator()).getProviderReadiness(args.providerId)
  },
  {
    name: 'harmony.ml.v2.evaluate_license',
    description: 'Оценивает лицензионную политику для конкретного шлюза и способа использования. Право на inference не даёт права на fine-tuning или распространение весов.',
    inputSchema: z.object({
      modelId: z.string(),
      gate: z.enum(['before_download', 'before_inference', 'before_packaging']),
      use: z.enum(['inference', 'fine_tuning', 'derivative_weight_distribution', 'training_data_use', 'commercial_delivery', 'preview_only_delivery'])
    }),
    handler: async (args: {
      modelId: string;
      gate: 'before_download' | 'before_inference' | 'before_packaging';
      use: 'inference' | 'fine_tuning' | 'derivative_weight_distribution' | 'training_data_use' | 'commercial_delivery' | 'preview_only_delivery';
    }) => new LicensePolicyEngine().evaluate(args.modelId, args.gate, args.use)
  },
  {
    name: 'harmony.ml.v2.evaluate_package_license',
    description: 'Шлюз для финального пакета: один отказ блокирует всю поставку.',
    inputSchema: z.object({ modelIds: z.array(z.string()) }),
    handler: async (args: { modelIds: string[] }) => new LicensePolicyEngine().evaluatePackage(args.modelIds)
  },
  {
    name: 'harmony.ml.v2.list_catalog',
    description: 'Каталог моделей: upstream-метаданные, лицензионный статус, зрелость интеграции.',
    inputSchema: z.object({ taskType: mlTaskTypeSchema.optional() }),
    handler: async (args: { taskType?: z.infer<typeof mlTaskTypeSchema> }) => {
      const catalog = getModelCatalog();
      const models = args.taskType ? catalog.forTask(args.taskType) : catalog.list();
      return { models, issues: catalog.getIssues() };
    }
  },
  {
    name: 'harmony.ml.v2.unload_model',
    description: 'Выгружает модель из памяти локального и Python-рантайма.',
    inputSchema: z.object({ modelId: z.string() }),
    handler: async (args: { modelId: string }) => (await getOrchestrator()).unloadModel(args.modelId)
  },
  {
    name: 'harmony.ml.v2.get_metrics',
    description: 'Метрики очереди: глубина, статусы, попадания в кэш, блокировки лицензий, OOM, отмены.',
    inputSchema: z.object({}),
    handler: async () => (await getOrchestrator()).getMetrics()
  },
  {
    name: 'harmony.ml.v2.list_error_codes',
    description: 'Централизованный реестр кодов ошибок ML-платформы с классификацией retryability.',
    inputSchema: z.object({}),
    handler: async () => ({ errors: listMlErrorDefinitions() })
  }
];

export const mlTools = [
  {
    name: 'harmony.ml.get_system_profile',
    description: 'Определяет характеристики оборудования (CPU, RAM, GPU, MPS, CUDA).',
    inputSchema: z.object({}),
    handler: async () => client.getSystemProfile()
  },
  {
    name: 'harmony.ml.list_models',
    description: 'Список доступных моделей восприятия в реестре (SAM2, RTMPose, Whisper и др.).',
    inputSchema: z.object({}),
    handler: async () => client.listModels()
  },
  {
    name: 'harmony.ml.install_models',
    description: 'Запускает загрузку и установку весов для выбранной модели.',
    inputSchema: z.object({
      modelId: z.string()
    }),
    handler: async (args: any) => client.installModel(args.modelId)
  },
  {
    name: 'harmony.ml.verify_models',
    description: 'Верифицирует работоспособность инференса модели (smoke-test).',
    inputSchema: z.object({
      modelId: z.string()
    }),
    handler: async (args: any) => client.verifyModel(args.modelId)
  },
  {
    name: 'harmony.ml.list_datasets',
    description: 'Показывает зарегистрированные датасеты (Davis, CartoonSet и др.) и их состояние.',
    inputSchema: z.object({}),
    handler: async () => client.listDatasets()
  },
  {
    name: 'harmony.ml.segment_video',
    description: 'Запускает сегментацию видео для выделения персонажей/объектов на слои.',
    inputSchema: z.object({
      videoPath: z.string(),
      modelId: z.string().optional()
    }),
    handler: async (args: any) => client.segmentVideo(verifyPathAccess(args.videoPath), args.modelId)
  },
  {
    name: 'harmony.ml.estimate_pose',
    description: 'Оценивает 2D/3D позу скелета персонажа на видео (MediaPipe/RTMPose).',
    inputSchema: z.object({
      videoPath: z.string(),
      modelId: z.string().optional()
    }),
    handler: async (args: any) => client.estimatePose(verifyPathAccess(args.videoPath), args.modelId)
  },
  {
    name: 'harmony.ml.track_points',
    description: 'Запускает KLT/TAPIR трекинг указанных точек на протяжении видео.',
    inputSchema: z.object({
      videoPath: z.string(),
      queryPoints: z.array(z.object({
        pointId: z.string(),
        x: z.number(),
        y: z.number(),
        frame: z.number().int().positive()
      })),
      modelId: z.string().optional()
    }),
    handler: async (args: any) => client.trackPoints(verifyPathAccess(args.videoPath), args.queryPoints, args.modelId)
  },
  {
    name: 'harmony.ml.transcribe_audio',
    description: 'Транскрибирует речь из аудиофайла (Wav/Mp3) с временными метками слов.',
    inputSchema: z.object({
      audioPath: z.string(),
      modelId: z.string().optional()
    }),
    handler: async (args: any) => client.transcribeAudio(verifyPathAccess(args.audioPath), args.modelId)
  },
  {
    name: 'harmony.ml.perceive_video',
    description: 'Главный конвейер: запускает параллельный анализ видеопотока (скелет, маски, трекинг точек, речь).',
    inputSchema: z.object({
      videoPath: z.string(),
      tasks: z.array(z.string()),
      audioPath: z.string().optional(),
      profile: z.string().optional(),
      quality: z.string().optional()
    }),
    handler: async (args: any) => client.perceiveVideo({
      ...args,
      videoPath: verifyPathAccess(args.videoPath),
      audioPath: args.audioPath ? verifyPathAccess(args.audioPath) : undefined
    })
  },
  {
    name: 'harmony.ml.get_job',
    description: 'Получить текущий статус выполнения асинхронной ML-задачи.',
    inputSchema: z.object({
      jobId: z.string()
    }),
    handler: async (args: any) => client.getJob(args.jobId)
  },
  {
    name: 'harmony.ml.cancel_job',
    description: 'Отменить выполняющуюся ML-задачу.',
    inputSchema: z.object({
      jobId: z.string()
    }),
    handler: async (args: any) => client.cancelJob(args.jobId)
  }
].concat(mlOrchestratorTools as never[]);
