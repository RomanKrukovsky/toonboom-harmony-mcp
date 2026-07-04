Ты — senior AI agent engineer, Toon Boom Harmony pipeline TD, MCP architect, animation production engineer, RPA/UI automation engineer, technical director 2D animation studio и product engineer коммерческого creative-tech продукта.

У меня уже есть существующий проект:

# Toon Boom Harmony MCP Server

Твоя задача — НЕ переписать его с нуля, а внимательно изучить текущую архитектуру, сохранить рабочие части и доработать сервер до полноценной системы:

# Harmony Autopilot MCP — Prompt-to-Editable-Cartoon Engine

Цель продукта:

Пользователь пишет один промпт, например:

```text
Создай 2-минутный 2D-мультфильм про безумного профессора и тревожного студента в лаборатории: профессор запускает портал, студент паникует, в конце портал засасывает бутерброд.
```

Система должна превратить это не просто в mp4, а в **редактируемый production-проект Toon Boom Harmony**:

```text
prompt
↓
series/episode idea
↓
script
↓
shot list
↓
asset requirements
↓
character specs
↓
rig/360 rig plan
↓
scene_plan.json для каждой сцены
↓
Harmony Autopilot
↓
редактируемые Harmony-сцены
↓
preview render
↓
AI review
↓
fix plan
↓
повторный render
↓
episode package
```

Главная формула:

```text
Prompt → editable Toon Boom Harmony cartoon project
```

Это не обычный video generator. Это AI production system, которая создаёт **управляемые, редактируемые сцены**, а не одноразовое видео.

---

# 1. Сначала изучи существующий проект

Перед изменениями:

1. Просканируй структуру проекта.
2. Найди существующие MCP tools.
3. Найди текущие adapters.
4. Найди Python bridge.
5. Найди Control Center / Harmony tools.
6. Найди safety layer.
7. Найди production tracker.
8. Найди уже существующие autopilot / UI / scene plan части, если они есть.
9. Не дублируй код без необходимости.
10. Не ломай уже работающие tools.

После анализа выведи коротко:

```text
Что уже есть
Что отсутствует
Что будет добавлено
Какие файлы будут изменены
```

---

# 2. Главная архитектура после доработки

Должна получиться система:

```text
User Prompt
↓
One-Prompt Engine
↓
Production Package Generator
↓
Scene Planner
↓
Asset/Rig Planner
↓
Harmony Autopilot MCP
↓
API / Scripts / Python Bridge / UI Automation / Templates
↓
Toon Boom Harmony
↓
Preview Render
↓
Quality Review
↓
Fix Loop
↓
Final Editable Harmony Package
```

MCP-сервер остаётся ядром.

Не заменяй MCP на отдельное приложение. Все новые возможности должны быть доступны как MCP tools.

---

# 3. Новые режимы работы

Добавь режимы:

```env
HARMONY_ENGINE_MODE=real
HARMONY_ENGINE_MODE=simulation
HARMONY_ENGINE_MODE=hybrid
HARMONY_ENGINE_MODE=moonshot
```

## real

Только реальные операции с установленной Toon Boom Harmony.

## simulation

Работает без Harmony, создаёт mock/demo production package, но честно помечает результат как simulation.

## hybrid

Делает реальные операции, где возможно, а отсутствующие части заменяет placeholders/templates/manual checkpoints.

## moonshot

Пытается пройти весь путь:

```text
one prompt → episode package → editable Harmony scenes / placeholders / plans / preview
```

Но всегда честно разделяет:

```text
real
generated
assembled
planned
placeholder
simulated
requires_human
requires_external_model
requires_real_harmony
```

Нельзя писать, что создан “полноценный идеальный мультфильм”, если реально создан только план или placeholder.

---

# 4. Что нужно добавить в проект

Добавь модули:

```text
src/adapters/onePromptEngine/
src/adapters/seriesPlanner/
src/adapters/episodePlanner/
src/adapters/scriptPlanner/
src/adapters/shotPlanner/
src/adapters/promptToScene/
src/adapters/sceneDecomposer/
src/adapters/assetPlanner/
src/adapters/characterDesigner/
src/adapters/assetGenerator/
src/adapters/rigSynthesizer/
src/adapters/rig360Synthesizer/
src/adapters/animationPlanner/
src/adapters/actingPlanner/
src/adapters/cameraPlanner/
src/adapters/lipsyncPlanner/
src/adapters/fxPlanner/
src/adapters/visualReviewer/
src/adapters/qualityDirector/
src/adapters/iterationLoop/
src/adapters/finalPackage/
```

Добавь tools:

```text
src/tools/onePromptTools.ts
src/tools/promptToSceneTools.ts
src/tools/characterGenerationTools.ts
src/tools/rig360GenerationTools.ts
src/tools/actingTools.ts
src/tools/reviewLoopTools.ts
src/tools/episodeAssemblyTools.ts
src/tools/qualityDirectorTools.ts
```

Добавь schemas:

```text
src/schemas/onePrompt.ts
src/schemas/seriesBible.ts
src/schemas/episodePlan.ts
src/schemas/script.ts
src/schemas/shotList.ts
src/schemas/scenePlan.ts
src/schemas/characterSpec.ts
src/schemas/assetRequirements.ts
src/schemas/rig360Spec.ts
src/schemas/animationPlan.ts
src/schemas/actingPlan.ts
src/schemas/reviewReport.ts
```

Добавь docs:

```text
docs/ONE_PROMPT_ENGINE.md
docs/PROMPT_TO_HARMONY.md
docs/MOONSHOT_MODE.md
docs/EDITABLE_AI_ANIMATION.md
docs/AUTONOMOUS_SERIES_PIPELINE.md
docs/ASSET_AND_RIG_PIPELINE.md
docs/QUALITY_REVIEW_LOOP.md
docs/COMMERCIAL_POSITIONING.md
```

Добавь examples:

```text
examples/one-prompt-demo/
examples/prompt-to-scene/
examples/moonshot-demo/
examples/episode-package/
```

---

# 5. One-Prompt Engine

Добавь MCP tools:

```text
harmony.oneprompt.analyze
harmony.oneprompt.generate_production_package
harmony.oneprompt.generate_series_bible
harmony.oneprompt.generate_episode_plan
harmony.oneprompt.generate_script
harmony.oneprompt.generate_shot_list
harmony.oneprompt.generate_character_specs
harmony.oneprompt.generate_asset_requirements
harmony.oneprompt.generate_rig360_specs
harmony.oneprompt.generate_scene_plans
harmony.oneprompt.run_to_preview_episode
harmony.oneprompt.run_to_final_package
```

Главный tool:

```text
harmony.oneprompt.run_to_preview_episode
```

Он должен:

1. принять один текстовый prompt;
2. определить жанр, длительность, стиль, персонажей, локации, конфликт, действия;
3. создать production package;
4. создать script;
5. создать shot list;
6. создать character specs;
7. создать asset requirements;
8. создать rig/360 rig specs;
9. создать scene_plan.json для каждой сцены;
10. вызвать Harmony Autopilot для сборки сцен;
11. сделать preview renders;
12. провести quality review;
13. создать fix plan;
14. при необходимости запустить iteration loop;
15. вернуть episode package.

---

# 6. Формат One Prompt Request

Создай schema:

```json
{
  "prompt": "Create a 2-minute 2D cartoon about a mad professor and a nervous student in a sci-fi lab.",
  "targetDurationSeconds": 120,
  "fps": 24,
  "resolution": {
    "width": 1920,
    "height": 1080
  },
  "visualStyle": "premium 2D cut-out animated sci-fi comedy, expressive acting, clean shapes, dynamic camera",
  "outputMode": "editable_harmony_project",
  "engineMode": "hybrid",
  "availableAssetsRoot": "assets/",
  "templatesRoot": "templates/",
  "allowPlaceholders": true,
  "allowExternalAssetPrompts": true,
  "maxScenes": 12,
  "maxIterations": 3,
  "requireHumanApprovalForFinal": true
}
```

---

# 7. Production Package

Из одного prompt система должна создавать папку:

```text
episode_package/
├── production_package.json
├── series_bible.json
├── episode_plan.json
├── script.json
├── shot_list.json
├── asset_requirements.json
├── character_specs/
├── rig_specs/
├── scene_plans/
├── animation_blocking/
├── acting_plans/
├── camera_plans/
├── lipsync_plans/
├── fx_plans/
├── review_reports/
├── harmony_project/
├── previews/
├── final_render/
└── production_report.md
```

Если реальная Harmony недоступна, всё равно создай production package, но пометь:

```json
{
  "isRealHarmonyExecution": false,
  "mode": "simulation",
  "requiresRealHarmony": true
}
```

---

# 8. Script / Shot List Generator

Система должна превращать идею в короткий сценарий.

Для 2-минутного мультфильма:

```text
примерно 8–15 сцен/шотов
каждый шот 4–15 секунд
понятная визуальная задача
простые действия
не перегружать сцену
```

Формат shot list:

```json
{
  "episode": "EP_001",
  "shots": [
    {
      "shotId": "SC_001",
      "durationFrames": 144,
      "description": "Wide shot of dark laboratory. Professor enters frame.",
      "characters": ["Professor", "Student"],
      "background": "Lab",
      "camera": "slow_push_in",
      "dialogue": [],
      "action": "Professor prepares portal device.",
      "fx": ["small_electric_sparks"]
    }
  ]
}
```

---

# 9. Character Spec Generator

Создай генератор character spec.

Он должен из prompt создавать:

```text
имя
роль
личность
визуальный стиль
форма тела
цветовая палитра
одежда
эмоции
mouth chart
hand poses
turnaround requirements
layer plan
rig requirements
```

Формат:

```json
{
  "name": "Professor Vex",
  "role": "mad scientist mentor",
  "personality": "chaotic, brilliant, theatrical",
  "visualStyle": "premium 2D animated sci-fi comedy, clean shapes, expressive face",
  "bodyType": "thin, angular, energetic",
  "requiredViews": [
    "front",
    "front_3q_left",
    "side_left",
    "back_3q_left",
    "back",
    "back_3q_right",
    "side_right",
    "front_3q_right"
  ],
  "requiredExpressions": [
    "neutral",
    "happy",
    "angry",
    "fear",
    "surprised",
    "panic",
    "smirk",
    "thinking"
  ],
  "requiredMouthShapes": ["A", "E", "I", "O", "U", "M", "F", "L", "S", "rest"],
  "requiredHandPoses": [
    "open",
    "fist",
    "point",
    "hold_object",
    "gesture_up",
    "gesture_down"
  ],
  "layerPlan": {
    "head": ["skull", "eyes", "brows", "nose", "mouth", "ears", "hair"],
    "body": ["torso", "neck", "left_arm", "right_arm", "left_hand", "right_hand", "legs"]
  }
}
```

Если нет реального генератора изображений, создай:

```text
design prompt
turnaround prompt
mouth chart prompt
hand pose prompt
layered PSD prompt
```

---

# 10. Asset Generator / Asset Planner

Система должна уметь:

```text
проверить, какие ассеты есть
найти missing assets
создать placeholder
создать промпты для внешнего image generator
создать требования для художника
создать карту ассетов для каждой сцены
```

Tools:

```text
harmony.assets.plan_from_prompt
harmony.assets.check_required_assets
harmony.assets.generate_missing_asset_prompts
harmony.assets.create_placeholder_assets
harmony.assets.map_assets_to_scenes
```

Если ассета нет, не останавливаться полностью.

Возвращать:

```json
{
  "status": "partial_success",
  "missingAssets": ["Professor rig", "Student rig", "Lab background"],
  "fallbacksCreated": ["placeholder_professor", "placeholder_student", "placeholder_lab"],
  "nextBestAction": "Provide or generate layered character assets"
}
```

---

# 11. Rig / 360 Rig Synthesizer

Добавь слой, который пытается создать 360 rig максимально близко к идеалу.

Tools:

```text
harmony.rig360.generate_spec
harmony.rig360.generate_turnaround_plan
harmony.rig360.generate_layered_asset_plan
harmony.rig360.generate_master_controller_plan
harmony.rig360.generate_deformer_plan
harmony.rig360.generate_face_control_plan
harmony.rig360.generate_body_turn_plan
harmony.rig360.build_from_assets
harmony.rig360.build_placeholder_rig
harmony.rig360.validate_full_rig
harmony.rig360.generate_test_turn_animation
```

Правило:

Если настоящих drawn assets нет, создать:

```text
rig360_spec
layered asset plan
placeholder rig
Harmony template structure
test turn animation
missing assets report
```

Не писать ложное “full 360 rig generated”, если это placeholder.

Формат результата:

```json
{
  "status": "partial_success",
  "realRigCreated": false,
  "placeholderRigCreated": true,
  "missingAssets": [
    "front head drawing",
    "side head drawing",
    "mouth chart",
    "hand poses"
  ],
  "nextBestAction": "Generate or provide layered turnaround assets"
}
```

---

# 12. Scene Plan Generator

Каждый shot должен превращаться в `scene_plan.json`.

Формат:

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
  "durationFrames": 144,
  "workspaceTemplate": "default_dialogue_scene",
  "background": {
    "file": "assets/backgrounds/lab.png",
    "layerName": "BG_Lab"
  },
  "characters": [
    {
      "name": "Professor Vex",
      "rig": "assets/rigs/professor.tpl",
      "positionPreset": "left",
      "actions": [
        {
          "type": "idle",
          "frames": [1, 40]
        },
        {
          "type": "talk",
          "frames": [41, 110],
          "audio": "audio/sc_001_professor.wav"
        },
        {
          "type": "gesture",
          "name": "hand_raise",
          "frames": [80, 120]
        }
      ]
    }
  ],
  "camera": {
    "preset": "slow_push_in",
    "startFrame": 1,
    "endFrame": 144
  },
  "effects": [
    {
      "type": "portal_glow",
      "target": "Portal_FX",
      "frames": [90, 144]
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

# 13. Acting Planner

Добавь максимально сильный слой актёрской анимации.

Tools:

```text
harmony.acting.analyze_dialogue
harmony.acting.generate_emotional_beats
harmony.acting.generate_pose_beats
harmony.acting.generate_micro_actions
harmony.acting.generate_gesture_plan
harmony.acting.generate_eye_blink_plan
harmony.acting.generate_head_motion_plan
harmony.acting.generate_body_language_plan
harmony.acting.apply_rough_acting
harmony.acting.validate_acting_readability
```

Пример acting plan:

```json
{
  "character": "Professor Vex",
  "scene": "SC_001",
  "emotionalArc": [
    {
      "frames": [1, 40],
      "emotion": "confident",
      "pose": "wide_grin",
      "microActions": ["small head tilt", "eyebrow raise"]
    },
    {
      "frames": [41, 110],
      "emotion": "panic disguised as confidence",
      "pose": "talking_fast",
      "microActions": ["blink twice", "hand flutter", "lean forward"]
    },
    {
      "frames": [111, 144],
      "emotion": "shock",
      "pose": "recoil",
      "microActions": ["eyes widen", "mouth open", "body pulls back"]
    }
  ]
}
```

Если невозможно сделать финальную актёрскую анимацию, сделать rough blocking.

---

# 14. Camera Planner

Добавь camera presets:

```text
static
slow_push_in
slow_pull_out
pan_left
pan_right
small_handheld_shake
dramatic_zoom
dialogue_two_shot
over_the_shoulder
portal_reveal
reaction_closeup
wide_establishing_shot
```

Каждый preset должен превращаться в camera keyframes.

---

# 15. Lipsync Planner

Добавь:

```text
harmony.lipsync.plan_from_script
harmony.lipsync.generate_phoneme_placeholder
harmony.lipsync.apply_mouth_chart
harmony.lipsync.validate_sync
```

Если нет audio analyzer, использовать placeholder timing.

---

# 16. Harmony Autopilot Execution

Используй существующие Harmony tools.

Система должна выполнять scene_plan через:

```text
официальные скрипты
Python bridge
Control Center
Harmony CLI
UI automation
template assembly
manual checkpoint
```

Приоритет:

```text
1. API/script
2. template assembly
3. UI automation
4. manual checkpoint
5. simulation fallback
```

Не полагаться только на клики.

---

# 17. UI Automation

Если UI automation ещё не добавлена, добавить.

Tools:

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
```

Безопасность:

```text
не кликать, если состояние не распознано
не использовать raw coordinates без debug mode
останавливаться при unknown dialog
запрашивать human confirmation при риске
```

---

# 18. Quality Director / Visual Reviewer

После preview render система должна проверять:

```text
есть ли фон
есть ли персонажи
не пустой ли кадр
персонаж в кадре или offscreen
работает ли камера
есть ли audio
есть ли missing frames
понятна ли эмоция
читается ли поза
нет ли технических ошибок
```

Tools:

```text
harmony.quality.review_preview
harmony.quality.review_scene_plan
harmony.quality.review_acting_plan
harmony.quality.review_rig
harmony.quality.generate_fix_list
harmony.quality.score_scene
harmony.quality.score_episode
```

Score format:

```json
{
  "sceneScore": 72,
  "categories": {
    "composition": 80,
    "acting": 65,
    "timing": 70,
    "technical": 90,
    "continuity": 60
  },
  "fixes": [
    "Move character closer to camera",
    "Add anticipation before portal explosion",
    "Increase blink timing realism"
  ]
}
```

---

# 19. Iteration Loop

Добавь цикл:

```text
assemble scene
↓
render preview
↓
review
↓
generate fix plan
↓
apply fixes
↓
render again
↓
score
```

Настройки:

```json
{
  "maxIterations": 5,
  "targetScore": 85,
  "stopIfNoImprovement": true,
  "requireHumanApprovalForFinal": true
}
```

Нельзя зацикливаться бесконечно.

---

# 20. Final Episode Package

Tool:

```text
harmony.episode.build_review_package
```

Должен собрать:

```text
final_package/
├── previews/
├── final_render/
├── harmony_project/
├── scene_plans/
├── script.json
├── shot_list.json
├── asset_report.md
├── rig_report.md
├── quality_report.md
├── time_savings_report.md
└── client_review_readme.md
```

---

# 21. Коммерческая цель

Документация должна объяснять продукт как:

```text
Editable AI animation generation for Toon Boom Harmony
```

Русская формула:

```text
ИИ-генерация мультфильмов, но не в виде одноразового mp4, а в виде редактируемых production-сцен Toon Boom Harmony.
```

УТП:

```text
One prompt. Full production plan. Editable Toon Boom scenes.
```

Или:

```text
From prompt to editable Harmony cartoon project.
```

---

# 22. Что нельзя делать

Нельзя:

```text
обходить лицензию Toon Boom
ломать бинарники
редактировать production database напрямую без backup
выдавать simulation за real execution
писать “full professional episode completed”, если создан placeholder
делать uncontrolled random clicks
обещать официальную интеграцию Toon Boom
использовать чужие IP/персонажей без прав
```

Используй формулировку:

```text
unofficial automation and pipeline tool for legally licensed Toon Boom Harmony installations
```

---

# 23. Safety

Добавь:

```text
dry-run
backup before modifications
path allowlist
human approval checkpoints
execution logs
screenshot logs optional
mode labels: real/simulation/hybrid/moonshot
destructive action confirmation
no raw shell
no uncontrolled clicks
```

---

# 24. Acceptance Criteria

Работа считается выполненной, если:

1. Существующий MCP server не сломан.
2. `npm run build` проходит.
3. `npm test` проходит.
4. Все новые tools зарегистрированы.
5. Есть One-Prompt Engine.
6. Есть Prompt-to-Harmony Scene Engine.
7. Есть character spec generator.
8. Есть asset requirements generator.
9. Есть rig360 synthesizer.
10. Есть placeholder rig fallback.
11. Есть scene_plan generator.
12. Есть acting planner.
13. Есть camera planner.
14. Есть lipsync planner.
15. Есть quality director.
16. Есть iteration loop.
17. Есть final episode package.
18. Есть demo one-prompt pipeline.
19. Без Harmony система создаёт честный production package в simulation/hybrid mode.
20. С Harmony система пытается собрать реальные editable scenes.
21. Все отчёты честно показывают, что реально создано, что simulated, что placeholder.
22. Нигде нет ложного claim о “готовом профессиональном мультфильме”, если это не так.

---

# 25. Минимальный реальный MVP

Если времени мало, сначала реализуй MVP:

```text
harmony.oneprompt.generate_production_package
harmony.oneprompt.generate_shot_list
harmony.oneprompt.generate_character_specs
harmony.oneprompt.generate_scene_plans
harmony.oneprompt.run_to_preview_episode
harmony.quality.score_episode
harmony.episode.build_review_package
```

MVP должен уметь:

```text
prompt → script → shot list → scene plans → placeholder assets/rigs → simulation preview report → final episode package
```

А в production mode:

```text
prompt → scene plans → Harmony Autopilot → real editable Harmony scenes, если Harmony доступна
```

---

# 26. Финальный отчёт после реализации

После доработки выведи:

1. Какие файлы изучены.
2. Какие модули добавлены.
3. Какие tools появились.
4. Как работает one-prompt pipeline.
5. Как запустить demo.
6. Что работает без Harmony.
7. Что требует реальной Harmony.
8. Как работает placeholder rig.
9. Как работает quality review.
10. Как устроен final episode package.
11. Какие ограничения остались.
12. Что делать дальше, чтобы приблизиться к полностью автономному производству мультфильма.
