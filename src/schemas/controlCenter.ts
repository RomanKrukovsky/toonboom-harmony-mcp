import { z } from 'zod';

export const listUsersSchema = z.object({});

export const createUserSchema = z.object({
  name: z.string().describe('Имя пользователя.'),
  role: z.enum(['Operator', 'Artist', 'Supervising Artist', 'Director', 'Administrator']).describe('Роль/Права пользователя.'),
  password: z.string().optional().describe('Пароль учетной записи.'),
  confirm: z.boolean().optional(),
  confirmationText: z.string().optional()
});

export const modifyUserSchema = z.object({
  name: z.string().describe('Имя пользователя.'),
  role: z.enum(['Operator', 'Artist', 'Supervising Artist', 'Director', 'Administrator']).optional().describe('Новая роль.'),
  password: z.string().optional().describe('Новый пароль.'),
  confirm: z.boolean().optional(),
  confirmationText: z.string().optional()
});

export const deleteUserSchema = z.object({
  name: z.string().describe('Имя удаляемого пользователя.'),
  confirm: z.boolean().optional(),
  confirmationText: z.string().optional()
});

export const listEnvironmentsSchema = z.object({});

export const createEnvironmentSchema = z.object({
  name: z.string().describe('Название окружения.'),
  path: z.string().describe('Общий сетевой путь к файловой системе (NFS/Samba).'),
  server: z.string().describe('Имя хоста сервера баз данных.'),
  user: z.string().optional().default('usabatch').describe('Пользователь-владелец создаваемого окружения.'),
  dryRun: z.boolean().optional()
});

export const listJobsSchema = z.object({
  environmentName: z.string().describe('Имя окружения для поиска проектов.')
});

export const createJobSchema = z.object({
  environmentName: z.string().describe('Имя родительского окружения.'),
  jobName: z.string().describe('Имя создаваемого проекта.'),
  dryRun: z.boolean().optional()
});

export const listScenesSchema = z.object({
  environmentName: z.string().describe('Имя окружения.'),
  jobName: z.string().describe('Имя проекта.')
});

export const createSceneSchema = z.object({
  environmentName: z.string().describe('Имя окружения.'),
  jobName: z.string().describe('Имя проекта.'),
  sceneName: z.string().describe('Имя сцены.'),
  dryRun: z.boolean().optional()
});

export const renameSceneSchema = z.object({
  environmentName: z.string().describe('Имя окружения.'),
  jobName: z.string().describe('Имя проекта.'),
  oldName: z.string().describe('Текущее имя сцены.'),
  newName: z.string().describe('Новое имя сцены.'),
  confirm: z.boolean().optional(),
  confirmationText: z.string().optional(),
  dryRun: z.boolean().optional()
});

export const deleteSceneSchema = z.object({
  environmentName: z.string().describe('Имя окружения.'),
  jobName: z.string().describe('Имя проекта.'),
  sceneName: z.string().describe('Имя сцены.'),
  confirm: z.boolean().optional(),
  confirmationText: z.string().optional(),
  dryRun: z.boolean().optional()
});

export const listVersionsSchema = z.object({
  environmentName: z.string().describe('Имя окружения.'),
  jobName: z.string().describe('Имя проекта.'),
  sceneName: z.string().describe('Имя сцены.')
});

export const listLockedScenesSchema = z.object({});

export const importScenePackageSchema = z.object({
  environmentName: z.string().describe('Имя окружения.'),
  jobName: z.string().describe('Имя проекта.'),
  packagePath: z.string().describe('Абсолютный путь к пакету сцены на диске.'),
  dryRun: z.boolean().optional()
});

export const exportScenePackageSchema = z.object({
  environmentName: z.string().describe('Имя окружения.'),
  jobName: z.string().describe('Имя проекта.'),
  sceneName: z.string().describe('Имя сцены.'),
  versionNumber: z.number().describe('Номер версии для экспорта.'),
  packagePath: z.string().describe('Абсолютный путь к файлу назначения для сохранения пакета.'),
  dryRun: z.boolean().optional()
});
