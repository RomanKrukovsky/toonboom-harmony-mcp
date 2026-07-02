import { z } from 'zod';
import { QtScriptBuilder } from '../adapters/qtScriptBuilder.js';
import { ControlCenterTelnet } from '../adapters/controlCenterTelnet.js';
import { ControlCenterBatch } from '../adapters/controlCenterBatch.js';
import { enforceDestructiveSafety, executeWithDryRun, HarmonyError } from '../security.js';
import { config } from '../config.js';

// Вспомогательная функция-диспетчер: пробует Telnet, при сбое переключается на пакетный режим
async function executeCcScript(script: string, dryRun?: boolean, operationName?: string): Promise<any> {
  const op = operationName || 'cc_script';
  return executeWithDryRun(op, {}, dryRun, async () => {
    try {
      // Пытаемся выполнить через Telnet-интерфейс
      return await ControlCenterTelnet.runScript(script);
    } catch (err: any) {
      if (err.code === 'CONTROL_CENTER_UNREACHABLE') {
        // Резервный запуск через Control Center Batch
        return await ControlCenterBatch.runScript(script);
      }
      throw err;
    }
  });
}

// Схема подтверждения опасных действий
const confirmationSchema = z.object({
  confirm: z.boolean().optional(),
  confirmationText: z.string().optional()
}).optional();

export const controlCenterTools = [
  {
    name: 'harmony.cc.start_script_server_command',
    description: 'Получить инструкции и CLI-команды для запуска сервера удаленных скриптов Control Center.',
    inputSchema: z.object({}),
    handler: async () => {
      const port = config.harmonyCcPort;
      return {
        instructions: 'Запустите эту команду на машине с Harmony Server для обработки внешних скриптов.',
        commands: {
          darwin: `export TOONBOOM_REMOTE_SCRIPT=${port} && Controlcenter -script -tcpPort ${port}`,
          linux: `export TOONBOOM_REMOTE_SCRIPT=${port} && controlcenter -script -tcpPort ${port}`,
          win32: `SET TOONBOOM_REMOTE_SCRIPT=${port}\nControlcenter.exe -script -tcpPort ${port}`
        }
      };
    }
  },
  {
    name: 'harmony.cc.ping',
    description: 'Проверка сетевой связи с базой данных и сервером Control Center.',
    inputSchema: z.object({}),
    handler: async () => {
      const script = QtScriptBuilder.buildListEnvironments();
      try {
        const result = await executeCcScript(script, false, 'ping');
        return {
          connected: result.status === 'success',
          mode: 'ready',
          environmentsCount: result.data ? result.data.length : 0
        };
      } catch (err: any) {
        return {
          connected: false,
          error: err.message,
          code: err.code
        };
      }
    }
  },
  {
    name: 'harmony.cc.run_qtscript',
    description: 'Запуск произвольного сценария Qt Script. Требует включения опции HARMONY_ALLOW_RAW_SCRIPTS.',
    inputSchema: z.object({
      script: z.string().describe('Строка исполняемого Qt Script.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: { script: string; dryRun?: boolean }) => {
      if (!config.allowRawScripts) {
        throw new HarmonyError(
          'PATH_NOT_ALLOWED',
          'Прямой запуск Qt-скриптов отключен в настройках конфигурации (HARMONY_ALLOW_RAW_SCRIPTS=false).'
        );
      }
      return executeCcScript(args.script, args.dryRun, 'raw_qt_script');
    }
  },
  {
    name: 'harmony.cc.list_users',
    description: 'Получение списка зарегистрированных пользователей в базе данных Harmony Server.',
    inputSchema: z.object({}),
    handler: async () => {
      const script = QtScriptBuilder.buildListUsers();
      return executeCcScript(script, false, 'list_users');
    }
  },
  {
    name: 'harmony.cc.create_user',
    description: 'Создание нового пользователя базы данных в Harmony Server. (Требует подтверждения безопасности).',
    inputSchema: z.object({
      name: z.string().describe('Имя пользователя.'),
      role: z.enum(['Operator', 'Artist', 'Supervising Artist', 'Director', 'Administrator']).describe('Роль/Права пользователя.'),
      password: z.string().optional().describe('Пароль учетной записи.'),
      confirm: z.boolean().optional(),
      confirmationText: z.string().optional()
    }),
    handler: async (args: any) => {
      enforceDestructiveSafety('create_user', args);
      const script = QtScriptBuilder.buildCreateUser(args.name, args.role, args.password);
      return executeCcScript(script, false, 'create_user');
    }
  },
  {
    name: 'harmony.cc.list_environments',
    description: 'Получение списка окружений (environments) в базе данных Harmony Server.',
    inputSchema: z.object({}),
    handler: async () => {
      const script = QtScriptBuilder.buildListEnvironments();
      return executeCcScript(script, false, 'list_environments');
    }
  },
  {
    name: 'harmony.cc.create_environment',
    description: 'Создание нового окружения в базе данных Harmony.',
    inputSchema: z.object({
      name: z.string().describe('Название окружения.'),
      path: z.string().describe('Общий сетевой путь к файловой системе (NFS/Samba).'),
      server: z.string().describe('Имя хоста сервера баз данных.'),
      user: z.string().optional().default('usabatch').describe('Пользователь-владелец создаваемого окружения.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const script = QtScriptBuilder.buildCreateEnvironment(args.name, args.path, args.server, args.user);
      return executeCcScript(script, args.dryRun, 'create_environment');
    }
  },
  {
    name: 'harmony.cc.list_jobs',
    description: 'Получение списка проектов (jobs) внутри указанного окружения.',
    inputSchema: z.object({
      environmentName: z.string().describe('Имя окружения для поиска проектов.')
    }),
    handler: async (args: { environmentName: string }) => {
      const script = QtScriptBuilder.buildListJobs(args.environmentName);
      return executeCcScript(script, false, 'list_jobs');
    }
  },
  {
    name: 'harmony.cc.create_job',
    description: 'Создание нового проекта (job) в указанном окружении.',
    inputSchema: z.object({
      environmentName: z.string().describe('Имя родительского окружения.'),
      jobName: z.string().describe('Имя создаваемого проекта.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const script = QtScriptBuilder.buildCreateJob(args.environmentName, args.jobName);
      return executeCcScript(script, args.dryRun, 'create_job');
    }
  },
  {
    name: 'harmony.cc.list_scenes',
    description: 'Получение списка сцен в указанном окружении и проекте.',
    inputSchema: z.object({
      environmentName: z.string().describe('Имя окружения.'),
      jobName: z.string().describe('Имя проекта.')
    }),
    handler: async (args: { environmentName: string; jobName: string }) => {
      const script = QtScriptBuilder.buildListScenes(args.environmentName, args.jobName);
      return executeCcScript(script, false, 'list_scenes');
    }
  },
  {
    name: 'harmony.cc.create_scene',
    description: 'Создание новой сцены в указанном окружении и проекте.',
    inputSchema: z.object({
      environmentName: z.string().describe('Имя окружения.'),
      jobName: z.string().describe('Имя проекта.'),
      sceneName: z.string().describe('Имя сцены.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const script = QtScriptBuilder.buildCreateScene(args.environmentName, args.jobName, args.sceneName);
      return executeCcScript(script, args.dryRun, 'create_scene');
    }
  },
  {
    name: 'harmony.cc.rename_scene',
    description: 'Переименование сцены в базе данных. (Требует подтверждения безопасности).',
    inputSchema: z.object({
      environmentName: z.string().describe('Имя окружения.'),
      jobName: z.string().describe('Имя проекта.'),
      oldName: z.string().describe('Текущее имя сцены.'),
      newName: z.string().describe('Новое имя сцены.'),
      confirm: z.boolean().optional(),
      confirmationText: z.string().optional(),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      enforceDestructiveSafety('rename_scene', args);
      const script = QtScriptBuilder.buildRenameScene(args.environmentName, args.jobName, args.oldName, args.newName);
      return executeCcScript(script, args.dryRun, 'rename_scene');
    }
  },
  {
    name: 'harmony.cc.list_versions',
    description: 'Получение версий для сцены.',
    inputSchema: z.object({
      environmentName: z.string().describe('Имя окружения.'),
      jobName: z.string().describe('Имя проекта.'),
      sceneName: z.string().describe('Имя сцены.')
    }),
    handler: async (args: any) => {
      const script = QtScriptBuilder.buildListVersions(args.environmentName, args.jobName, args.sceneName);
      return executeCcScript(script, false, 'list_versions');
    }
  },
  {
    name: 'harmony.cc.list_locked_scenes',
    description: 'Получение списка заблокированных сцен в базе данных.',
    inputSchema: z.object({}),
    handler: async () => {
      const script = QtScriptBuilder.buildListLockedScenes();
      return executeCcScript(script, false, 'list_locked_scenes');
    }
  },
  {
    name: 'harmony.cc.import_scene_package',
    description: 'Импорт архивного пакета сцены (.zip/pkg) в базу данных Harmony.',
    inputSchema: z.object({
      environmentName: z.string().describe('Имя окружения.'),
      jobName: z.string().describe('Имя проекта.'),
      packagePath: z.string().describe('Абсолютный путь к пакету сцены на диске.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const script = QtScriptBuilder.buildImportScenePackage(args.environmentName, args.jobName, args.packagePath);
      return executeCcScript(script, args.dryRun, 'import_scene_package');
    }
  },
  {
    name: 'harmony.cc.export_scene_package',
    description: 'Экспорт указанной версии сцены во внешний файл-пакет.',
    inputSchema: z.object({
      environmentName: z.string().describe('Имя окружения.'),
      jobName: z.string().describe('Имя проекта.'),
      sceneName: z.string().describe('Имя сцены.'),
      versionNumber: z.number().describe('Номер версии для экспорта.'),
      packagePath: z.string().describe('Абсолютный путь к файлу назначения для сохранения пакета.'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const script = QtScriptBuilder.buildExportScenePackage(
        args.environmentName,
        args.jobName,
        args.sceneName,
        args.versionNumber,
        args.packagePath
      );
      return executeCcScript(script, args.dryRun, 'export_scene_package');
    }
  }
];
