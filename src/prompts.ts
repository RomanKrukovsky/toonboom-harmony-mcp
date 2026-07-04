import { autopilotPrompts } from './prompts/autopilotPrompts.js';

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
    description: 'Формирует детальный план сборки иерархии и перекладки персонажа по концепт-арту или описанию с учетом всех стандартов индустрии.',
    arguments: [
      { name: 'characterName', description: 'Имя персонажа.', required: true },
      { name: 'designDescription', description: 'Описание дизайна персонажа или ссылка на референс.', required: true }
    ],
    messages: (args: any) => [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Нам необходимо разработать профессиональный перекладочный риг (cut-out rig) для персонажа "${args.characterName}" со следующим описанием дизайна:\n"${args.designDescription}"\n\nРазработайте подробный план сборки в Harmony с применением стандартов из базы визуальных знаний риггинга:\n1. 10-этапный пайплайн сборки (от Asset Prep до Rest Pose & .tpl).\n2. Настройка Peg-нод в режим Separate (Separate Position X/Y/Z).\n3. Запрет анимации на Drawing-нодах (Can Never Enter Drawing Mode).\n4. Бесшовные суставы с окружностями одинакового радиуса и ` + "`harmony.rig.create_autopatch_joint`" + `.\n5. Использование Micro Z-Offset (0.0001B) для локального перекрытия деталей.\n6. Обязательное внедрение ` + "`harmony.rig.attach_kinematic_accessory`" + ` (Kinematic Output) для аксессуаров на деформируемых конечностях.\n7. Цветовая кодировка Backdrops (Зеленый - Голова, Синий - Торс, Желтый/Оранжевый - Руки, Фиолетовый - Ноги, Красный - Master Controllers).\n\nУкажите точную последовательность вызова инструментов (harmony.rig.create_character_structure, harmony.rig.create_pegs, harmony.rig.create_deformers, harmony.rig.create_autopatch_joint, harmony.rig.attach_kinematic_accessory).`
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
  },

  // ── NEW: AI Production System prompts ────────────────────────

  {
    name: 'prompt_to_harmony_scene',
    description:
      'МАСТЕР-ПРОМПТ: Полный пайплайн от идеи/промпта до редактируемого проекта Harmony. ' +
      'Активирует все этапы: разбор → планирование → сборка → аудит → ревью.',
    arguments: [
      { name: 'scenePrompt', description: 'Описание сцены, идея или раскадровка.', required: true },
      { name: 'production', description: 'Название проекта.', required: false },
      { name: 'episode', description: 'Код эпизода (например E01).', required: false },
      { name: 'outputDir', description: 'Папка для сохранения результатов.', required: false }
    ],
    messages: (args: any) => [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `# Задача: Prompt → Editable Harmony Production

## Промпт сцены:
"${args.scenePrompt}"

## Параметры:
- Production: ${args.production || 'Untitled'}
- Episode: ${args.episode || 'E01'}  
- Output: ${args.outputDir || './output'}

## Выполни следующий пайплайн:

### Шаг 1: Разбор промпта
Вызови \`harmony.studio.from_prompt\` с параметрами:
- prompt: "${args.scenePrompt}"
- production: "${args.production || 'Untitled'}"
- episode: "${args.episode || 'E01'}"
- saveToDir: "${args.outputDir || './output'}"

Сохрани результат. Из него ты получишь: scene_plan.json, character_specs, camera_plan, lipsync_plan.

### Шаг 2: Анализ ассетов
Вызови \`harmony.studio.generate_asset_checklist\` с полученным scenePlanInline.
Сообщи список критических ассетов которые нужно создать.

### Шаг 3: 360° Rig Plan (для каждого персонажа)
Вызови \`harmony.studio.build_360_rig_plan\` для каждого персонажа из character_specs.

### Шаг 4: Animation Blocking
Вызови \`harmony.blocking.generate_keyframe_plan\` с scenePlanInline.
Затем \`harmony.blocking.generate_camera_moves\` с cinematicStyle=subtle.

### Шаг 5: Lipsync Plan (если есть диалоги)
Если в разборе обнаружены диалоги — вызови \`harmony.lipsync.generate_plan\`.

### Шаг 6: Запуск пайплайна
Вызови \`harmony.studio.run_full_pipeline\` с полученным scenePlanInline, dryRun=true сначала.
Если dry-run прошёл — запусти с dryRun=false.

### Шаг 7: Аудит
Вызови \`harmony.autopilot.self_check\` с scenePlanInline и checkLevel=deep.

### Шаг 8: Автофикс
Вызови \`harmony.autopilot.auto_fix\` с полученными issues.

### Шаг 9: Review Package
Вызови \`harmony.studio.export_client_package\` для создания финального пакета.

## Ожидаемый результат:
- ✅ scene_plan.json
- ✅ character_specs.json  
- ✅ camera_plan.json
- ✅ blocking_plan.json
- ✅ lipsync_plan.json (если есть диалоги)
- ✅ asset_requirements.json
- ✅ review_package/

Начинай с Шага 1. После каждого шага сообщай о результате.`
        }
      }
    ]
  },

  {
    name: 'parse_and_plan_scene',
    description: 'Разбирает описание сцены и генерирует scene_plan.json + вспомогательные планы.',
    arguments: [
      { name: 'description', description: 'Текстовое описание сцены.', required: true },
      { name: 'style', description: 'Стиль анимации: cutout, traditional, hybrid.', required: false }
    ],
    messages: (args: any) => [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Разбери следующее описание сцены и создай production-план для Toon Boom Harmony.

## Описание:
"${args.description}"

## Задача:
1. Вызови \`harmony.studio.from_prompt\` → получи ParsedScene
2. Проанализируй результат: персонажи, локация, диалоги, настроение
3. Вызови \`harmony.studio.generate_asset_checklist\` → получи список ассетов
4. Если в сцене больше 1 персонажа или они должны двигаться в разных ракурсах — вызови \`harmony.studio.build_360_rig_plan\`
5. Объясни что нужно сделать художнику (20% ручной работы)

Стиль анимации: ${args.style || 'cutout'}`
        }
      }
    ]
  },

  {
    name: 'audit_and_fix_scene',
    description: 'Запускает полный аудит собранной сцены и предлагает исправления.',
    arguments: [
      { name: 'projectPath', description: 'Путь к .xstage файлу.', required: false },
      { name: 'scenePlan', description: 'JSON строка scene_plan.json.', required: false }
    ],
    messages: (args: any) => [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Проведи полный аудит сцены Harmony и предложи исправления.

${args.projectPath ? `Проект: "${args.projectPath}"` : ''}
${args.scenePlan ? `Scene Plan: ${args.scenePlan}` : ''}

## Порядок действий:
1. Вызови \`harmony.autopilot.self_check\` с checkLevel=deep
2. Проанализируй все найденные issues
3. Вызови \`harmony.autopilot.auto_fix\` для autoFixable проблем
4. Для каждой проблемы требующей ручного исправления — объясни художнику ЧТО именно нужно сделать в Harmony
5. Вызови \`harmony.planner.export_review_package\` если projectPath указан

Верни:
- Количество ошибок/предупреждений
- Что исправлено автоматически  
- Список задач для художника с примерной оценкой времени`
        }
      }
    ]
  },
  {
    name: 'playlist_rigging_workflow',
    description: 'Инструктирует агента по созданию рига персонажа в Toon Boom Harmony на основе Базы Знаний учебного плейлиста.',
    arguments: [
      { name: 'characterName', description: 'Имя персонажа (например: Morty).', required: true },
      { name: 'taskType', description: 'Тип задачи (base_hierarchy | arm | leg | eye | mouth | rig_audit).', required: true }
    ],
    messages: (args: any) => [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Сформируй пошаговый план выполнения задачи "${args.taskType}" для персонажа "${args.characterName}" с использованием рецептов из ресурса \`harmony://workflow/playlist-recipes\`.

Используй пресеты из плейлиста:
- Pivot Matching (привязка пивотов к центрам суставов)
- Seamless Joint / AutoPatch (для бесшовных рук и ног)
- Eye Cutter Mask (инвертированная маска зрачка)
- Kinematic Isolation (вставка KinematicOutput для деформеров)
- Multi-Angle Deformation (поворот 360)

Укажи точные последовательности MCP-вызовов и отметь этапы, требующие ручного контроля в интерфейсе Harmony.`
        }
      }
    ]
  },

  ...autopilotPrompts
];

