import { z } from 'zod';
import { MLClient } from '../clients/mlClient.js';
import { verifyPathAccess } from '../security.js';

const client = new MLClient();

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
];
