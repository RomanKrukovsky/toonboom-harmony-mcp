import { McpPrompt } from '../prompts.js';

export const autopilotPrompts: McpPrompt[] = [
  {
    name: 'run_autopilot_demo',
    description: 'Инструкция по запуску демонстрационного коммерческого режима сборки сцены.',
    arguments: [],
    messages: () => [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Нам необходимо запустить Commercial Demo для Harmony Autopilot. Пожалуйста, сделайте следующее:\n1. Запустите инструмент harmony.autopilot.run_scene_plan с указанием пути к examples/commercial-demo/scene_plan.json.\n2. Сгенерируйте и посмотрите лог выполнения с помощью harmony.autopilot.get_execution_log.\n3. Сгенерируйте отчет о сэкономленном времени с помощью harmony.production.generate_time_savings_report.`
        }
      }
    ]
  },
  {
    name: 'resolve_lipsync_brief',
    description: 'Разбор звуковой дорожки и текстового брифа для построения чернового липсинга на таймлайне.',
    arguments: [
      { name: 'audioFile', description: 'Путь к импортированному звуковому файлу.', required: true },
      { name: 'characterName', description: 'Имя персонажа для липсинга.', required: true }
    ],
    messages: (args: any) => [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `У нас есть звуковой файл "${args.audioFile}" для персонажа "${args.characterName}". Напишите план вызова инструментов (harmony.templates.apply_mouth_chart) для интеграции чернового липсинга по фазам (A, B, C, D, E, F, G, X) на таймлайн.`
        }
      }
    ]
  }
];
