Ты — senior AI automation engineer, Toon Boom Harmony pipeline TD, MCP architect, RPA engineer, animation production technologist и разработчик коммерческих B2B-инструментов для анимационных студий.

У меня уже есть базовый Toon Boom Harmony MCP Server. Твоя задача — не переписать его с нуля бездумно, а превратить его в коммерческий production-grade продукт уровня:

# Harmony Autopilot MCP

Это должен быть не просто MCP-сервер для вызова скриптов. Это должен быть полноценный AI-оператор Toon Boom Harmony, который может управлять программой как человек, собирать сцены по готовому плану, проверять результат, исправлять ошибки, рендерить preview и постепенно превращаться в коммерческий инструмент для студий.

Главная концепция:

Сценарий, идея и раскадровка могут создаваться отдельно. Этот агент не обязан быть сценаристом и режиссёром. Его главная роль — production executor.

Он получает:

```text
storyboard
shot list
scene JSON
assets
backgrounds
character rigs
audio
timing notes
style notes
```

И должен делать:

```text
открыть Toon Boom Harmony
создать/открыть сцену
импортировать ассеты
расставить персонажей
подключить аудио
создать базовое движение
сделать липсинк/черновой липсинк
добавить камеру
добавить эффекты
сохранить
сделать preview render
проверить результат
вернуть отчёт
```

Главная цель продукта:

Не “ИИ делает мультфильм из ничего”, а:

```text
ИИ выполняет production-задачи в Toon Boom Harmony по готовому плану
```

Это должно быть коммерчески продаваемо как:

```text
AI Harmony Operator
AI Toon Boom Autopilot
Harmony Scene Assembly Automation
AI-assisted 2D Animation Production Pipeline
```

---

# 1. Главная задача

Доработай существующий MCP-сервер так, чтобы он стал гибридной системой:

```text
MCP Server
+ Harmony official scripts/API
+ UI automation как человек
+ computer vision/screenshot understanding
+ hotkeys
+ шаблоны сцен
+ JSON scene plans
+ asset pipeline
+ render pipeline
+ audit/checker
+ safety layer
+ коммерческая документация
```

Важно:

Не надо пытаться всё делать только через официальный API. Если API не даёт полного контроля, добавь слой UI automation.

Но UI automation должна быть не тупым автокликером, а умным оператором:

```text
видит экран
понимает состояние программы
выбирает действие
кликает/нажимает хоткей
проверяет результат
логирует шаг
делает fallback
останавливается при риске
```

---

# 2. Режимы работы

Сделай 4 режима:

## Mode A — API/Script Mode

Использовать:

```text
Control Center Scripting
Control Center Telnet Script Server
Harmony Python API
Harmony Qt Script
Harmony CLI utilities
```

Это основной стабильный слой.

## Mode B — UI Operator Mode

Агент управляет Harmony через интерфейс:

```text
screenshot
vision analysis
mouse click
keyboard hotkeys
menu navigation
dialog detection
state verification
```

Нужно создать adapter для UI automation.

Он должен уметь:

```text
делать screenshot
анализировать окно
находить UI элементы
кликать
нажимать hotkeys
вводить текст
выбирать файлы в диалогах
ждать появления окна
проверять результат
делать recovery
```

## Mode C — Template Assembly Mode

Агент использует подготовленные шаблоны:

```text
scene_template.xstage
camera_template
render_template
character_rig_template
mouth_chart_template
fx_template
layout_template
```

Он не строит всё с нуля каждый раз, а собирает сцену из готовых блоков.

Это самый практичный коммерческий режим.

## Mode D — Hybrid Production Mode

Лучший режим:

```text
API/scripts делают то, что стабильно
UI automation делает то, чего нет в API
templates ускоряют сборку
audit проверяет результат
render manager выдаёт preview
```

---

# 3. Что нужно добавить в существующий MCP-сервер

Сначала изучи текущий репозиторий.

Не удаляй существующую архитектуру, если она нормальная.

Добавь новые модули:

```text
src/adapters/uiAutomation/
src/adapters/screenshot/
src/adapters/hotkeys/
src/adapters/templateAssembly/
src/adapters/scenePlan/
src/adapters/visualState/
src/adapters/recovery/
src/tools/uiOperatorTools.ts
src/tools/autopilotTools.ts
src/tools/templateTools.ts
src/tools/sceneAssemblyTools.ts
src/tools/commercialWorkflowTools.ts
src/prompts/autopilotPrompts.ts
docs/AUTOPILOT.md
docs/UI_AUTOMATION.md
docs/COMMERCIAL_WORKFLOW.md
docs/MONETIZATION.md
examples/scene_plans/
examples/templates/
```

---

# 4. UI automation layer

Создай слой `UIAutomationAdapter`.

Он должен быть абстрактным, чтобы можно было подключить разные backend-ы:

```text
nut.js
robotjs
playwright для внешних панелей
macOS accessibility
Windows UI Automation
xdotool/ydotool на Linux
любая доступная computer-control библиотека
```

Если конкретная библиотека недоступна, adapter должен возвращать `UI_BACKEND_UNAVAILABLE`.

Интерфейс:

```typescript
interface UIAutomationAdapter {
  getScreenshot(): Promise<ScreenshotResult>;
  getActiveWindow(): Promise<WindowInfo>;
  click(x: number, y: number): Promise<ActionResult>;
  doubleClick(x: number, y: number): Promise<ActionResult>;
  rightClick(x: number, y: number): Promise<ActionResult>;
  hotkey(keys: string[]): Promise<ActionResult>;
  typeText(text: string): Promise<ActionResult>;
  wait(ms: number): Promise<ActionResult>;
  waitForImageOrText(query: string, timeoutMs: number): Promise<WaitResult>;
  locateElement(query: string): Promise<ElementLocationResult>;
  verifyState(expectation: string): Promise<VerificationResult>;
}
```

Важно:

* Не полагаться только на абсолютные координаты.
* Использовать семантические цели:

  * “File menu”
  * “Import”
  * “Timeline”
  * “Node View”
  * “Camera View”
  * “Save dialog”
* Координаты можно использовать только после обнаружения элемента.
* Все действия должны логироваться.

---

# 5. Visual State Engine

Создай `VisualStateEngine`.

Он должен анализировать screenshot и возвращать состояние Harmony:

```json
{
  "application": "Toon Boom Harmony",
  "activeWindow": "Harmony Premium",
  "detectedPanels": [
    "Camera View",
    "Timeline",
    "Node View",
    "Tool Properties",
    "Library"
  ],
  "dialogs": [],
  "sceneOpen": true,
  "timelineVisible": true,
  "nodeViewVisible": true,
  "warnings": []
}
```

Если состояние непонятно:

```json
{
  "status": "uncertain",
  "reason": "Cannot confidently detect Harmony workspace",
  "suggestedAction": "Ask user to reset workspace layout or provide screenshot"
}
```

---

# 6. Action Planner

Создай `AutopilotActionPlanner`.

Он должен превращать задачу в пошаговый план:

Пример задачи:

```text
Собери сцену SC_001 по файлу scene_plan.json
```

План:

```json
{
  "goal": "Assemble Harmony scene SC_001",
  "steps": [
    {
      "id": "open_harmony",
      "type": "ui",
      "description": "Open Toon Boom Harmony"
    },
    {
      "id": "create_scene",
      "type": "api_or_ui",
      "description": "Create scene with 1920x1080, 24 fps, 192 frames"
    },
    {
      "id": "import_background",
      "type": "ui_or_script",
      "description": "Import background lab.png"
    },
    {
      "id": "import_character",
      "type": "template",
      "description": "Import character rig scientist.tpl"
    },
    {
      "id": "place_character",
      "type": "ui_or_python",
      "description": "Place character left"
    },
    {
      "id": "import_audio",
      "type": "ui_or_script",
      "description": "Import audio sc_001.wav"
    },
    {
      "id": "camera_move",
      "type": "script_or_ui",
      "description": "Create slow push-in"
    },
    {
      "id": "save_scene",
      "type": "api_or_ui",
      "description": "Save scene"
    },
    {
      "id": "render_preview",
      "type": "render",
      "description": "Render low-res preview"
    },
    {
      "id": "audit_result",
      "type": "audit",
      "description": "Check scene for missing assets and basic errors"
    }
  ]
}
```

Каждый шаг должен иметь:

```text
precondition
action
verification
fallback
risk level
rollback note
```

---

# 7. Scene Plan JSON

Создай строгий формат `scene_plan.schema.json`.

Пример:

```json
{
  "production": "DemoSeries",
  "episode": "EP_001",
  "sceneName": "SC_001",
  "resolution": {
    "width": 1920,
    "height": 1080
  },
  "fps": 24,
  "durationFrames": 192,
  "workspaceTemplate": "default_scene_template",
  "background": {
    "file": "assets/backgrounds/lab.png",
    "layerName": "BG_Lab",
    "position": {
      "x": 0,
      "y": 0,
      "z": 0
    },
    "scale": 1
  },
  "characters": [
    {
      "name": "Scientist",
      "rig": "assets/rigs/scientist.tpl",
      "positionPreset": "left",
      "startFrame": 1,
      "endFrame": 192,
      "actions": [
        {
          "type": "idle",
          "frames": [1, 48]
        },
        {
          "type": "talk",
          "frames": [49, 150],
          "audio": "audio/sc_001.wav",
          "mouthChart": "standard_mouth_chart"
        },
        {
          "type": "gesture",
          "name": "hand_raise",
          "frames": [120, 150]
        }
      ]
    }
  ],
  "camera": {
    "preset": "slow_push_in",
    "startFrame": 1,
    "endFrame": 192
  },
  "effects": [
    {
      "type": "glow",
      "target": "Portal_FX",
      "frames": [150, 192]
    }
  ],
  "render": {
    "preview": true,
    "format": "mp4",
    "quality": "low"
  }
}
```

---

# 8. MCP tools для Autopilot

Добавь tools:

```text
harmony.autopilot.run_scene_plan
harmony.autopilot.plan_scene
harmony.autopilot.execute_step
harmony.autopilot.verify_step
harmony.autopilot.recover_step
harmony.autopilot.pause
harmony.autopilot.resume
harmony.autopilot.stop
harmony.autopilot.get_current_state
harmony.autopilot.get_execution_log
harmony.autopilot.render_preview
harmony.autopilot.audit_scene_result
```

Tool `harmony.autopilot.run_scene_plan` должен:

1. принять JSON scene plan;
2. проверить assets;
3. проверить наличие Harmony;
4. проверить UI/backend capabilities;
5. построить план;
6. выполнить dry-run, если включён;
7. выполнить шаги;
8. после каждого шага проверить результат;
9. при ошибке сделать fallback;
10. вернуть отчёт.

---

# 9. UI Operator tools

Добавь tools:

```text
harmony.ui.screenshot
harmony.ui.detect_state
harmony.ui.locate_element
harmony.ui.click
harmony.ui.hotkey
harmony.ui.type_text
harmony.ui.open_menu
harmony.ui.select_file_in_dialog
harmony.ui.wait_for_dialog
harmony.ui.verify_workspace
harmony.ui.reset_workspace_instruction
```

Важно:

* Raw click по координатам должен быть выключен по умолчанию.
* Координаты разрешены только в debug mode.
* Основной режим — semantic target.

Пример:

```json
{
  "target": "File > Import > Images",
  "method": "menu",
  "verifyAfter": "Import dialog is open"
}
```

---

# 10. Template Assembly tools

Добавь tools:

```text
harmony.templates.list
harmony.templates.validate
harmony.templates.create_scene_from_template
harmony.templates.import_character_rig
harmony.templates.import_camera_preset
harmony.templates.import_fx_preset
harmony.templates.apply_mouth_chart
harmony.templates.apply_render_preset
harmony.templates.create_template_pack
```

Смысл:

Агент должен собирать сцену не с нуля, а из production templates.

Это важно для коммерческого продукта.

---

# 11. Production workflow tools

Добавь tools:

```text
harmony.production.import_shot_list
harmony.production.generate_scene_plans
harmony.production.run_batch_scene_assembly
harmony.production.render_all_previews
harmony.production.audit_all_scenes
harmony.production.export_client_review_package
harmony.production.generate_time_savings_report
```

Особенно важен `generate_time_savings_report`.

Он должен считать:

```text
сколько сцен собрано
сколько времени заняло
сколько было бы вручную
какие ошибки найдены
какие задачи сэкономлены
```

Это нужно для продажи студиям.

---

# 12. Commercial Mode

Добавь режим `COMMERCIAL_DEMO_MODE`.

Он должен уметь запускать красивое демо:

```text
1. открыть Harmony
2. собрать одну сцену из scene_plan.json
3. импортировать фон
4. импортировать персонажа
5. подключить аудио
6. сделать простую анимацию
7. сделать preview render
8. показать отчёт
```

Добавь sample demo:

```text
examples/commercial-demo/
├── scene_plan.json
├── assets/
├── audio/
├── templates/
└── README.md
```

README должен объяснять:

```text
как запустить демо
что агент делает
что считается успехом
как записать demo video
как использовать это для продажи
```

---

# 13. Проверка результата

Каждое действие должно проверяться.

Примеры:

После импорта фона:

```json
{
  "step": "import_background",
  "expected": "BG_Lab layer exists",
  "verification": "passed"
}
```

После импорта аудио:

```json
{
  "step": "import_audio",
  "expected": "audio track visible in timeline",
  "verification": "passed"
}
```

После рендера:

```json
{
  "step": "render_preview",
  "expected": "preview file exists and size > 0",
  "verification": "passed"
}
```

Если проверка не прошла, не писать success.

---

# 14. Recovery logic

Добавь recovery logic.

Пример:

Если меню не найдено:

```text
1. попробовать hotkey
2. попробовать reset workspace
3. попросить пользователя вручную открыть нужную панель
4. продолжить после подтверждения
```

Если файл не импортировался:

```text
1. проверить путь
2. проверить allowlist
3. открыть file dialog снова
4. попробовать alternative import method
5. вернуть ошибку
```

Если Harmony зависла:

```text
1. остановить autopilot
2. сохранить лог
3. не кликать дальше
4. предложить пользователю проверить окно
```

---

# 15. Safety

Это коммерческий продукт, значит безопасность обязательна.

Добавь:

```text
dry-run
human approval checkpoints
project backup
path allowlist
no destructive action without confirmation
no random raw shell
no uncontrolled clicks
no deleting production database
no deleting usabatch
no overwriting assets without backup
session logs
screenshot logs optional
```

Для UI automation:

```text
не кликать, если состояние не распознано
не продолжать, если появилась неизвестная ошибка
не нажимать destructive buttons без подтверждения
```

---

# 16. Human-in-the-loop

Добавь поддержку человеческих остановок.

Tools:

```text
harmony.autopilot.request_human_confirmation
harmony.autopilot.wait_for_user_ready
harmony.autopilot.mark_manual_step_done
```

Пример:

Если агент не может распознать диалог, он должен сказать:

```text
Откройте, пожалуйста, панель Node View и нажмите продолжить.
```

После этого продолжить.

Это важно: продукт не обязан быть 100% автономным с первого дня. Он должен быть production-useful.

---

# 17. Логи

Создай подробные execution logs:

```json
{
  "sessionId": "demo-001",
  "scene": "SC_001",
  "step": "import_background",
  "method": "ui",
  "startedAt": "...",
  "finishedAt": "...",
  "status": "passed",
  "durationMs": 4200,
  "verification": {
    "passed": true,
    "details": "BG_Lab detected"
  }
}
```

Логи нужны для:

```text
debug
client report
commercial proof
time savings report
```

---

# 18. Документация для коммерческой версии

Добавь документы:

```text
docs/AUTOPILOT.md
docs/UI_AUTOMATION.md
docs/SCENE_PLAN_FORMAT.md
docs/TEMPLATE_WORKFLOW.md
docs/COMMERCIAL_DEMO.md
docs/SALES_OFFER.md
docs/MONETIZATION.md
docs/CLIENT_ONBOARDING.md
```

В `SALES_OFFER.md` напиши оффер:

```text
We automate Toon Boom Harmony production routines:
- scene setup
- asset import
- character rig placement
- audio import
- rough lipsync
- preview render
- scene audit
- production reports
```

Смысл продажи:

```text
меньше ручной рутины
быстрее сборка сцен
меньше ошибок
быстрее preview
дешевле производство
```

---

# 19. Монетизация

Добавь в docs/MONETIZATION.md стратегии:

## Strategy A — Service

Продавать настройку пайплайна студиям:

```text
AI automation for Toon Boom Harmony
scene assembly automation
render automation
scene QA
pipeline setup
```

## Strategy B — Productized Service

Пакеты:

```text
Starter: 1 scene automation demo
Studio: 10-scene workflow automation
Pro: full production template pack + autopilot
```

## Strategy C — Template Pack

Продавать:

```text
Harmony scene templates
character rig templates
mouth chart templates
camera presets
FX presets
JSON scene plan system
```

## Strategy D — SaaS/Desktop Product

В будущем:

```text
Harmony Autopilot Desktop
monthly subscription
studio license
enterprise setup
```

## Strategy E — Mini-studio

Использовать инструмент самому:

```text
короткие мульт-ролики
YouTube Shorts
TikTok cartoons
рекламные 2D ролики
обучающие ролики
корпоративная анимация
```

---

# 20. MVP roadmap

Сделай roadmap.

## MVP 1 — One Scene Autopilot

Цель:

```text
агент собирает одну простую сцену в Harmony почти без рук
```

Функции:

```text
открыть Harmony
создать сцену
импортировать фон
импортировать персонажа
сделать 2 keyframes
сохранить
preview render
отчёт
```

## MVP 2 — Scene Plan Runner

Цель:

```text
агент выполняет scene_plan.json
```

## MVP 3 — Template Production

Цель:

```text
собирать сцены из templates
```

## MVP 4 — Batch Episode Assembly

Цель:

```text
собрать 5–10 сцен по shot list
```

## MVP 5 — Commercial Studio Demo

Цель:

```text
записать видео, где агент экономит 70–90% ручной рутины
```

---

# 21. Acceptance criteria

Работа считается успешной, если:

1. Существующий MCP-сервер не сломан.
2. Добавлен Autopilot mode.
3. Добавлен scene_plan schema.
4. Добавлен UI automation adapter.
5. Добавлен visual state engine.
6. Добавлен action planner.
7. Добавлены autopilot tools.
8. Добавлены template tools.
9. Добавлен commercial demo.
10. Добавлены execution logs.
11. Добавлен dry-run.
12. Добавлены human approval checkpoints.
13. Добавлена документация для не-программиста.
14. Есть roadmap коммерческой версии.
15. Есть MONETIZATION.md.
16. Сервер честно сообщает unsupported, если backend недоступен.
17. Агент не делает uncontrolled random clicks.
18. После каждого шага есть verification.
19. Есть recovery logic.
20. Можно запустить демо одной сцены.

---

# 22. Стиль реализации

Пиши реальный код.

Не пиши пустые заглушки.

Если конкретный UI backend нельзя реализовать в текущей среде, сделай adapter interface, mock backend, safe error handling и документацию, как подключить реальный backend.

Не выдумывай, что Harmony успешно сделала действие, если проверки нет.

Не пытайся обходить лицензии.

Не ломай бинарники Harmony.

Не редактируй production database напрямую без официального механизма или backup.

Не делай dangerous automation.

---

# 23. Главная формула продукта

Этот проект должен стать:

```text
AI Harmony Operator
```

Не режиссёр, не сценарист, не генератор идей.

А именно:

```text
оператор Toon Boom Harmony, который получает готовую производственную задачу и выполняет её быстрее человека
```

Коммерческий результат:

```text
студия экономит время на рутине
аниматоры меньше кликают
сцены быстрее собираются
preview быстрее выдаётся режиссёру
ошибки находятся раньше
производство дешевеет
```

---

# 24. Финальный вывод после работы

Когда закончишь доработку, выведи:

1. Что было добавлено.
2. Как запустить Autopilot mode.
3. Как выглядит scene_plan.json.
4. Как запустить commercial demo.
5. Какие MCP tools появились.
6. Какие backend-и нужны для UI automation.
7. Что уже реально работает.
8. Что требует установленной Harmony.
9. Какие ограничения есть.
10. Как это продавать студиям.
11. Что делать дальше.
