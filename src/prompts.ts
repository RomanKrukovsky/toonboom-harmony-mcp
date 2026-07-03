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
    name: 'create_character_rig_from_design',
    description: 'Формирует детальный план сборки иерархии и перекладки персонажа по концепт-арту или описанию.',
    arguments: [
      { name: 'characterName', description: 'Имя персонажа.', required: true },
      { name: 'designDescription', description: 'Описание дизайна персонажа или ссылка на референс.', required: true }
    ],
    messages: (args: any) => [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Нам необходимо разработать перекладочный риг (cut-out rig) для персонажа "${args.characterName}" со следующим описанием дизайна:\n"${args.designDescription}"\n\nРазработайте подробный план сборки в Harmony. Опишите иерархию Peg-узлов, композитов и деформаторов. Укажите, какие инструменты (harmony.rig.create_character_structure, harmony.rig.create_pegs, harmony.rig.create_deformers) следует использовать.`
        }
      }
    ]
  },
  {
    name: 'create_360_rig_plan',
    description: 'Помогает составить план фаз и контроллеров для сборки полного 360 разворота персонажа.',
    arguments: [
      { name: 'characterName', description: 'Имя персонажа.', required: true }
    ],
    messages: (args: any) => [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Создайте план сборки и проверки 360-градусного рига для персонажа "${args.characterName}". План должен включать настройку 8 ракурсов (front, front_3q_left, side_left, back_3q_left, back, back_3q_right, side_right, front_3q_right) и создание слайдеров Master Controller с помощью инструментов harmony.rig360.*.`
        }
      }
    ]
  },
  {
    name: 'inspect_scene_and_fix_errors',
    description: 'Инструктирует агента по анализу файлов проекта, поиску ошибок и предложению автоматических исправлений.',
    arguments: [
      { name: 'projectPath', description: 'Абсолютный путь к файлу .xstage.', required: true }
    ],
    messages: (args: any) => [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Проведите детальный аудит проекта Harmony по пути: "${args.projectPath}". Вызовите инструмент harmony.audit.scene и предложите исправления найденных битых связей, неиспользуемых палитр или пустых слоев с помощью harmony.audit.suggest_fixes.`
        }
      }
    ]
  },
  {
    name: 'prepare_episode_production',
    description: 'Помогает развернуть полную структуру эпизода (сиквенсы, кадры) в локальном трекере задач.',
    arguments: [
      { name: 'productionName', description: 'Название проекта/сезона.', required: true },
      { name: 'episodeCode', description: 'Код эпизода (например: EP101).', required: true }
    ],
    messages: (args: any) => [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Нам нужно запустить в производство эпизод "${args.episodeCode}" для проекта "${args.productionName}".\n\nНапишите план вызова инструментов harmony.production.* для инициализации структуры, добавления сиквенсов, кадров и назначения стартовых задач аниматорам.`
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
          text: `Нам необходимо векторизовать рисунки [${args.drawings || ''}] и запустить рендеринг проекта: "${args.projectPath}".\n\nНапишите план действий с использованием фоновой векторизации (harmony.vectorize.queue_drawings) и рендеринга (harmony.render.queue_scene или harmony.render.local).`
        }
      }
    ]
  },
  {
    name: 'troubleshoot_harmony_server',
    description: 'Руководство по диагностике ошибок соединения с сервером базы данных Control Center.',
    arguments: [],
    messages: () => [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `У меня возникают ошибки соединения с Harmony Server или базой данных Control Center.\n\nПроведите диагностику: вызовите harmony.health_check и harmony.cc.ping, проверьте открытые порты (1234, 5678, 5680) и просмотрите логи через harmony.read_logs.`
        }
      }
    ]
  },
  {
    name: 'convert_script_to_harmony_shots',
    description: 'Разбор литературного сценария/раскадровки на сцены и кадры в трекере Harmony.',
    arguments: [
      { name: 'scriptText', description: 'Текст сценария для анализа.', required: true }
    ],
    messages: (args: any) => [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Проанализируйте следующий сценарий:\n"${args.scriptText}"\n\nВыделите из него локации, сцены и кадры (shots). Предложите структуру для импорта в локальный трекер (harmony.production.create_sequence, harmony.production.create_shot).`
        }
      }
    ]
  },
  {
    name: 'build_mini_cartoon_pipeline',
    description: 'Помогает выстроить полный пайплайн производства мини-сериала: от сценария до рендеринга.',
    arguments: [
      { name: 'seriesTitle', description: 'Название анимационного мини-сериала.', required: true }
    ],
    messages: (args: any) => [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Нам предстоит создать анимационный мини-сериал "${args.seriesTitle}".\n\nВыстройте пошаговый пайплайн производства:\nСценарий → Список кадров → Риги персонажей → Фоны → Сцены → Липсинк → Блокинг → Рендер → Ревью.\n\nОпишите, какие инструменты MCP Toon Boom Harmony следует вызывать на каждом этапе производства.`
        }
      }
    ]
  }
];
