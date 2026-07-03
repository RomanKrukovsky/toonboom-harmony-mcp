Ты дорабатываешь существующий проект:

# Harmony Autopilot MCP

Теперь нужно перевести его в режим:

# Moonshot Prompt-to-Series Engine

Цель — максимально приблизить Toon Boom Harmony к ощущению video AI / Seedance / Sora:

```text
один промпт
↓
полноценный production-план
↓
персонажи
↓
360 rigs
↓
фоны
↓
сцены
↓
актёрская анимация
↓
липсинк
↓
камера
↓
эффекты
↓
preview render
↓
автоисправления
↓
готовая серия / episode package
```

Важно: не обещай магию, но реализуй максимально близкую архитектуру.

Не пиши “невозможно” и не останавливайся. Если прямое выполнение невозможно — сделай ближайший рабочий production fallback:

```text
real execution → generated asset → template → placeholder → manual checkpoint
```

Главный принцип:

```text
Prompt → Structured Production Intelligence → Editable Toon Boom Harmony Production
```

Это не просто генератор scene_plan.json. Это попытка создать AI production system, где Harmony становится финальным управляемым движком сборки мультфильма.

---

# 1. Главная цель

Добавь в Harmony Autopilot MCP новый слой:

# One-Prompt Animation Production Engine

Он должен принимать один большой prompt, например:

```text
Сделай 2-минутную пилотную серию про нервного студента и безумного профессора в научной лаборатории. Стиль — высококачественная 2D/3D-hybrid телевизионная анимация, выразительная актёрка, динамичная камера, комедийный sci-fi тон.
```

И превращать его в полный production package:

```text
series_bible.json
episode_plan.json
script.json
shot_list.json
asset_requirements.json
character_design_specs.json
rig_requirements.json
rig360_plan.json
scene_plans/
animation_blocking/
camera_plans/
lipsync_plans/
fx_plans/
render_plan.json
review_reports/
final_package/
```

---

# 2. Что система должна пытаться делать из одного промпта

Система должна максимально автоматически делать:

```text
1. Придумать структуру серии
2. Разбить на сцены
3. Создать shot list
4. Определить персонажей
5. Сгенерировать требования к дизайну персонажей
6. Создать/запросить/подобрать ассеты
7. Создать layered character package
8. Спроектировать 360 rig
9. Собрать rig в Harmony настолько, насколько возможно
10. Создать фоновые сцены
11. Собрать каждую сцену в Harmony
12. Сгенерировать rough acting blocking
13. Сгенерировать camera movement
14. Применить lipsync
15. Добавить FX
16. Сделать preview render
17. Проверить результат
18. Сгенерировать fix plan
19. Применить исправления
20. Собрать episode review package
```

---

# 3. Новые режимы

Добавь режимы:

```text
HARMONY_ENGINE_MODE=real
HARMONY_ENGINE_MODE=simulation
HARMONY_ENGINE_MODE=hybrid
HARMONY_ENGINE_MODE=moonshot
```

## real

Только реальные операции с Harmony.

## simulation

Для тестов и демо без Harmony.

## hybrid

Использует реальные операции, а недостающие части заменяет placeholders/templates.

## moonshot

Пытается выполнить полный путь из одного промпта:

```text
prompt → series/episode/scene/rig/render package
```

Но в отчёте честно указывает, что реально выполнено, что сымитировано, что требует ассетов, что требует человека.

---

# 4. Новые модули

Добавь:

```text
src/adapters/onePromptEngine/
src/adapters/seriesPlanner/
src/adapters/episodePlanner/
src/adapters/scriptPlanner/
src/adapters/shotPlanner/
src/adapters/characterDesigner/
src/adapters/assetGenerator/
src/adapters/rigSynthesizer/
src/adapters/rig360Synthesizer/
src/adapters/actingPlanner/
src/adapters/animationDirector/
src/adapters/qualityDirector/
src/adapters/episodeAssembler/
src/adapters/finalPackage/
src/tools/onePromptTools.ts
src/tools/seriesTools.ts
src/tools/characterGenerationTools.ts
src/tools/rig360GenerationTools.ts
src/tools/actingTools.ts
src/tools/episodeAssemblyTools.ts
src/tools/qualityDirectorTools.ts
src/schemas/onePrompt.ts
src/schemas/seriesBible.ts
src/schemas/characterSpec.ts
src/schemas/rig360Spec.ts
src/schemas/actingPlan.ts
src/schemas/episodePlan.ts
docs/ONE_PROMPT_ENGINE.md
docs/MOONSHOT_MODE.md
docs/AUTONOMOUS_SERIES_PIPELINE.md
examples/moonshot-demo/
```

---

# 5. One-Prompt tools

Добавь MCP tools:

```text
harmony.oneprompt.analyze
harmony.oneprompt.generate_production_package
harmony.oneprompt.generate_episode_plan
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

1. принять один prompt;
2. создать production package;
3. создать персонажей или placeholder specs;
4. создать rig plans;
5. создать scene_plan для каждой сцены;
6. вызвать Harmony Autopilot;
7. собрать preview scenes;
8. сделать preview renders;
9. провести quality review;
10. вернуть episode package.

---

# 6. Character Generation Layer

Добавь слой генерации персонажей.

Он должен уметь:

```text
prompt → character design spec
prompt → turnaround requirements
prompt → expression sheet requirements
prompt → mouth chart requirements
prompt → hand pose requirements
prompt → layered asset plan
```

Формат `character_spec.json`:

```json
{
  "name": "Professor Vex",
  "role": "mad scientist mentor",
  "personality": "brilliant, chaotic, theatrical",
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
    "smirk",
    "panic",
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

Если нет image generation backend, вернуть не отказ, а:

```text
CHARACTER_ASSET_GENERATION_BACKEND_MISSING
```

И создать полный asset brief для внешней генерации.

---

# 7. Full 360 Rig Synthesizer

Добавь слой:

# Rig360 Synthesizer

Он должен пытаться создать полный 360 rig из character spec.

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

Важно:

Если полноценный rig невозможно собрать без реальных drawn assets, система должна:

1. создать rig360_spec;
2. создать список нужных слоёв;
3. создать placeholder rig;
4. создать Harmony template structure;
5. создать test turn;
6. пометить недостающие элементы.

Не писать ложное “full rig generated”, если ассетов нет.

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

# 8. Acting Planner

Добавь слой актёрской анимации.

Цель — максимально приблизиться к “идеальной актёрке”, но через production-блокинг.

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

Пример `acting_plan.json`:

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
      "frames": [111, 160],
      "emotion": "shock",
      "pose": "recoil",
      "microActions": ["eyes widen", "mouth open", "body pulls back"]
    }
  ]
}
```

---

# 9. Autonomous Series Mode

Добавь режим, который может планировать серию/сезон.

Tools:

```text
harmony.series.create_bible
harmony.series.create_episode_ideas
harmony.series.create_episode_plan
harmony.series.create_shot_list
harmony.series.generate_recurring_asset_library
harmony.series.run_episode_pipeline
harmony.series.generate_review_package
```

Но в документации честно укажи:

```text
Autonomous Series Mode is a production accelerator, not a replacement for human creative direction.
```

---

# 10. Quality Director

Добавь AI Quality Director.

Он должен проверять:

```text
качество сцены
читаемость поз
есть ли персонажи в кадре
эмоции понятны или нет
работает ли камера
есть ли continuity errors
есть ли missing assets
есть ли пустые frames
есть ли неправильная длительность
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

Score:

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

# 11. Iteration Loop Max

Добавь улучшенный iteration loop:

```text
create
↓
render
↓
review
↓
fix
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

---

# 12. Важная честность

Везде разделяй:

```text
generated
assembled
simulated
planned
placeholder
requires_human
requires_external_model
requires_real_harmony
```

Нельзя писать:

```text
full Pixar-quality episode completed
```

Если реально создан только план или placeholder.

Правильно писать:

```text
Moonshot production package generated.
Preview scene assembled in simulation mode.
Real Harmony execution requires assets and installed Toon Boom Harmony.
```

---

# 13. Commercial Positioning

Добавь позиционирование:

```text
Editable AI animation generation for Toon Boom Harmony
```

Русская формула:

```text
ИИ-генерация мультфильмов, но не в виде одноразового mp4, а в виде редактируемых production-сцен Toon Boom Harmony.
```

Сильное УТП:

```text
From one prompt to editable Harmony production package.
```

Или:

```text
One prompt. Full production plan. Editable Toon Boom scenes.
```

---

# 14. Что система должна пытаться сделать даже без ассетов

Если нет ассетов, она должна создать:

```text
character spec
design prompts
turnaround prompts
mouth chart prompts
hand pose prompts
layering plan
rig plan
scene plan
placeholder scene
placeholder rig
preview simulation
```

То есть вместо отказа:

```text
нет ассетов — не могу
```

Должно быть:

```text
нет ассетов — создаю полный пакет требований и placeholder pipeline
```

---

# 15. Acceptance Criteria

Задача выполнена, если:

1. Есть One-Prompt Engine.
2. Есть Moonshot Mode.
3. Есть character spec generator.
4. Есть asset requirement generator.
5. Есть rig360 synthesizer.
6. Есть placeholder rig fallback.
7. Есть acting planner.
8. Есть autonomous episode planner.
9. Есть quality director.
10. Есть iteration loop.
11. Есть distinction между real/simulation/placeholder.
12. Есть docs/MOONSHOT_MODE.md.
13. Есть examples/moonshot-demo.
14. Можно вызвать один tool `harmony.oneprompt.run_to_preview_episode`.
15. Без реальной Harmony система создаёт production package.
16. С реальной Harmony система пытается собрать editable scenes.
17. Все логи честно показывают, что реально создано.
18. Нигде нет ложного claim, что создана идеальная профессиональная серия, если это не так.

---

# 16. Финальный вывод после реализации

Implementation completed. All acceptance criteria are satisfied and the project now builds and passes tests.

## 1. Modules added

New adapters:
- `src/adapters/onePromptEngine/` — orchestrator
- `src/adapters/seriesPlanner/`
- `src/adapters/episodePlanner/`
- `src/adapters/scriptPlanner/`
- `src/adapters/shotPlanner/`
- `src/adapters/characterDesigner/`
- `src/adapters/assetGenerator/`
- `src/adapters/rig360Synthesizer/`
- `src/adapters/actingPlanner/`
- `src/adapters/animationDirector/`
- `src/adapters/qualityDirector/`
- `src/adapters/episodeAssembler/`
- `src/adapters/finalPackage/`

New schemas:
- `src/schemas/onePrompt.ts`
- `src/schemas/seriesBible.ts`
- `src/schemas/characterSpec.ts`
- `src/schemas/rig360Spec.ts`
- `src/schemas/actingPlan.ts`
- `src/schemas/episodePlan.ts`

New tool files:
- `src/tools/onePromptTools.ts`
- `src/tools/seriesTools.ts`
- `src/tools/characterGenerationTools.ts`
- `src/tools/rig360GenerationTools.ts`
- `src/tools/actingTools.ts`
- `src/tools/episodeAssemblyTools.ts`
- `src/tools/qualityDirectorTools.ts`

Docs and demo:
- `docs/ONE_PROMPT_ENGINE.md`
- `docs/MOONSHOT_MODE.md`
- `docs/AUTONOMOUS_SERIES_PIPELINE.md`
- `examples/moonshot-demo/` (README + run script)

## 2. How the one-prompt pipeline works

```
prompt
→ harmony.oneprompt.analyze
→ series_bible.json
→ episode_plan.json
→ shot_list.json
→ character_design_specs.json
→ rig360_specs.json (placeholder)
→ asset_requirements.json
→ acting_plans.json
→ camera_plans.json + fx_plans.json
→ scene_plans/*.scene_plan.json
→ render_plan.json
→ review_reports.json
→ episode_package.json
```

The main tool is `harmony.oneprompt.run_to_preview_episode`, which runs the whole chain, applies a lightweight review/fix loop, and returns an episode package.

## 3. New MCP tools

One-Prompt:
- `harmony.oneprompt.analyze`
- `harmony.oneprompt.generate_production_package`
- `harmony.oneprompt.generate_episode_plan`
- `harmony.oneprompt.generate_shot_list`
- `harmony.oneprompt.generate_character_specs`
- `harmony.oneprompt.generate_asset_requirements`
- `harmony.oneprompt.generate_rig360_specs`
- `harmony.oneprompt.generate_scene_plans`
- `harmony.oneprompt.run_to_preview_episode`
- `harmony.oneprompt.run_to_final_package`

Series:
- `harmony.series.create_bible`
- `harmony.series.create_episode_ideas`
- `harmony.series.create_episode_plan`
- `harmony.series.create_shot_list`
- `harmony.series.generate_recurring_asset_library`
- `harmony.series.run_episode_pipeline`
- `harmony.series.generate_review_package`

Character:
- `harmony.character.generate_spec`
- `harmony.character.generate_turnaround_requirements`
- `harmony.character.generate_expression_sheet_requirements`
- `harmony.character.generate_mouth_chart_requirements`
- `harmony.character.generate_hand_pose_requirements`
- `harmony.character.generate_layered_asset_plan`

Rig360:
- `harmony.rig360.generate_spec`
- `harmony.rig360.generate_turnaround_plan`
- `harmony.rig360.generate_layered_asset_plan`
- `harmony.rig360.generate_master_controller_plan`
- `harmony.rig360.generate_deformer_plan`
- `harmony.rig360.generate_face_control_plan`
- `harmony.rig360.generate_body_turn_plan`
- `harmony.rig360.build_placeholder_rig`
- `harmony.rig360.validate_full_rig`
- `harmony.rig360.generate_test_turn_animation`

Acting:
- `harmony.acting.analyze_dialogue`
- `harmony.acting.generate_emotional_beats`
- `harmony.acting.generate_pose_beats`
- `harmony.acting.generate_micro_actions`
- `harmony.acting.generate_gesture_plan`
- `harmony.acting.generate_eye_blink_plan`
- `harmony.acting.generate_head_motion_plan`
- `harmony.acting.generate_body_language_plan`
- `harmony.acting.apply_rough_acting`
- `harmony.acting.validate_acting_readability`

Assembly & Quality:
- `harmony.assembly.build_scene_plans`
- `harmony.assembly.generate_render_plan`
- `harmony.quality.review_preview`
- `harmony.quality.review_scene_plan`
- `harmony.quality.review_acting_plan`
- `harmony.quality.review_rig`
- `harmony.quality.generate_fix_list`
- `harmony.quality.score_scene`
- `harmony.quality.score_episode`

## 4. How to run the moonshot demo

```bash
cd examples/moonshot-demo
./run_demo.sh
```

The script calls `harmony.oneprompt.run_to_preview_episode` with the demo prompt and writes the full production package to `examples/moonshot-demo/output/`.

## 5. What is created without assets

- Full series/episode/scene plans
- Character specs with design prompts (turnaround, expression sheet, mouth chart, hand poses)
- Placeholder rig360 specs with master controller, deformer, face control, and body turn plans
- Asset requirements list
- Acting plans
- Camera and FX plans
- Editable `scene_plan.json` files for each scene
- Render plan and review reports
- `episode_package.json` + `MANIFEST.json`

## 6. What is created with assets

When character/background assets are supplied (or an external image generation backend is wired in):
- Real `rig360` specs become buildable
- `scene_plan.json` files can reference actual background files and rig paths
- In `hybrid`/`real` mode, the system attempts to invoke Harmony Autopilot to assemble editable scenes
- Preview renders can be produced through Harmony

## 7. What requires real Harmony

- Opening/creating `.xstage` scenes
- Importing rigs, backgrounds, audio
- Applying deformers and master controllers inside Harmony
- Lipsync with real audio/mouth chart
- Final preview/final renders
- Any destructive UI automation

## 8. How the 360 rig fallback works

The `Rig360Synthesizer` always produces a full spec, but:
- `realRigCreated: false`
- `placeholderRigCreated: true`
- `missingAssets` lists every required view/layer/mouth/expression/hand asset
- `nextBestAction` tells the user exactly what to provide

It never claims a full rig was built without assets.

## 9. How the acting planner works

`ActingPlanner` generates per-character, per-scene `acting_plan.json` with:
- `emotionalArc` (frames, emotion, pose, microActions)
- `gesturePlan`
- `blinkPlan`
- `headMotionPlan`
- `bodyLanguagePlan`
- `readabilityScore`

This is rough blocking, not final keyframes, ready for a human animator or Harmony rough-acting tool.

## 10. How the quality director works

`QualityDirector` reviews:
- Scene composition, acting, timing, technical, continuity
- Episode plan frame totals
- Rig status (placeholder vs real)
- Acting readability

It returns per-scene scores, an episode score, issues, and a fix list. `run_to_preview_episode` uses this in an iteration loop.

## 11. Remaining limitations

- No built-in image/audio generation backend (returns `CHARACTER_ASSET_GENERATION_BACKEND_MISSING` and asset briefs)
- Real Harmony scene assembly requires installed Toon Boom Harmony + Control Center
- Lipsync requires recorded audio + mouth chart assets
- Acting plans are blocking, not final animation curves
- Quality scoring is heuristic, not pixel-level analysis
- The system is a production accelerator, not a replacement for creative direction

## 12. How to sell this

Pitch:

> **One prompt. Full production plan. Editable Toon Boom scenes.**

Or in Russian:

> **ИИ-генерация мультфильмов, но не в виде одноразового mp4, а в виде редактируемых production-сцен Toon Boom Harmony.**

Key differentiation vs Sora/Seedance/Kling:
- Output is editable, not a disposable video
- Native Harmony handoff for professional animation teams
- Asset ownership and version control
- Iteration by editing plans, not re-rolling prompts
- Honest reporting of what is real vs simulated vs planned
