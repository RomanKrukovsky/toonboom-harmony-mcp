export interface McpPrompt {
  name: string;
  description: string;
  arguments?: {
    name: string;
    description: string;
    required?: boolean;
  }[];
  messages: (args: any) => {
    role: 'user' | 'assistant';
    content: {
      type: 'text';
      text: string;
    };
  }[];
}

export const prompts: McpPrompt[] = [
  {
    name: 'create_harmony_scene_from_brief',
    description: 'Создает план создания окружений, проектов и сцен в Control Center на основе студийного брифа.',
    arguments: [
      { name: 'brief', description: 'Краткое описание требований к сценам.', required: true },
      { name: 'env', description: 'Название окружения (по умолчанию DefaultEnv).', required: false }
    ],
    messages: (args: any) => [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Вот текстовый бриф производства:\n"${args.brief}"\n\nСоздайте детальный пошаговый план по добавлению окружений, проектов и сцен в Harmony. Укажите, какие именно инструменты MCP следует вызвать (например: harmony.cc.create_environment, harmony.cc.create_job, harmony.cc.create_scene) для развертывания структуры в окружении "${args.env || 'DefaultEnv'}".`
        }
      }
    ]
  },
  {
    name: 'inspect_scene_and_suggest_cleanup',
    description: 'Инструктирует агента по анализу файлов проекта и поиску путей для очистки/оптимизации сцены.',
    arguments: [
      { name: 'projectPath', description: 'Абсолютный путь к файлу .xstage.', required: true }
    ],
    messages: (args: any) => [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Пожалуйста, проанализируйте проект Harmony по пути: "${args.projectPath}" с помощью инструментов harmony.scene.inspect, harmony.scene.list_nodes и harmony.assets.collect_scene_assets. Сформируйте рекомендации по оптимизации сцены: укажите неиспользуемые рисунки, пустые элементы привязок (peg-ноды) или несвязанные узлы графа.`
        }
      }
    ]
  },
  {
    name: 'build_cutout_rig_plan',
    description: 'Формирует план сборки и подключения перекладочного персонажа (cutout rig) в графе нод.',
    arguments: [
      { name: 'characterName', description: 'Имя персонажа.', required: true },
      { name: 'partsList', description: 'Список частей тела через запятую (например: Голова, Рука, Нога, Торс).', required: false }
    ],
    messages: (args: any) => [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Давайте разработаем схему перекладочного персонажа для: "${args.characterName}" (части тела: ${args.partsList || 'Голова, Торс, Руки, Ноги'}).\n\nНапишите пошаговую схему создания и соединения узлов. Укажите, какие пеги должны управлять какими рисунками, как подключить ноды композита и какие инструменты вызывать (harmony.scene.create_node, harmony.scene.connect_nodes) для завершения сборки.`
        }
      }
    ]
  },
  {
    name: 'prepare_batch_render_plan',
    description: 'Подготавливает схему рендеринга и пакетной векторизации рисунков.',
    arguments: [
      { name: 'projectPath', description: 'Путь к локальному проекту.', required: true },
      { name: 'drawings', description: 'Список путей к растровым рисункам через запятую.', required: false }
    ],
    messages: (args: any) => [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Нам необходимо векторизовать рисунки [${args.drawings || ''}] и запустить локальный рендеринг проекта: "${args.projectPath}".\n\nНапишите план действий с использованием инструментов harmony.vectorize.queue_drawings и harmony.render.render_local или harmony.render.queue_scene, чтобы оптимизировать нагрузку на рабочую станцию.`
        }
      }
    ]
  },
  {
    name: 'create_episode_structure',
    description: 'Создает структуру локального SQLite трекера для отслеживания эпизода или сезона.',
    arguments: [
      { name: 'productionName', description: 'Название производства.', required: true },
      { name: 'episodeCode', description: 'Код эпизода (например: EP101).', required: true }
    ],
    messages: (args: any) => [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Нам нужно развернуть структуру для производства "${args.productionName}" и эпизода "${args.episodeCode}".\n\nСформируйте план вызова инструментов трекера (harmony.workflow.create_production, harmony.workflow.create_episode, harmony.workflow.create_sequence, harmony.workflow.create_shot) для инициализации структуры.`
        }
      }
    ]
  },
  {
    name: 'troubleshoot_harmony_server',
    description: 'Руководство по диагностике ошибок соединения с сервером базы данных.',
    arguments: [],
    messages: () => [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `У меня возникают ошибки при подключении к Harmony Server или базе данных Control Center.\n\nПожалуйста, помогите провести диагностику: проверьте статус с помощью harmony.health_check и harmony.cc.ping, убедитесь, что порты 1234, 5678 и 5680 открыты, и объясните, как изучить логи с помощью harmony.read_logs.`
        }
      }
    ]
  }
];
