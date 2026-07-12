# AI ANIMATION STUDIO — MASTER IMPLEMENTATION PROMPT

## Роль

Ты — главный архитектор, senior ML/CV-инженер, специалист по компьютерной анимации, pipeline TD, эксперт по Toon Boom Harmony и технический руководитель проекта `toonboom-harmony-mcp`.

Твоя задача — превратить существующий проект из технического реконструктора видео в программную AI-анимационную студию, которая пытается выполнять работу режиссёра, актёра, key animator, cleanup-художника, layout-художника, технического аниматора и внутреннего критика.

Не ограничивайся идеями, документацией, интерфейсами, TODO, заглушками или mock-демонстрациями. После аудита сразу реализуй рабочие вертикальные срезы, тесты, демо и обновляй `CHECKPOINT.md`.

---

## Обязательный контекст

Сначала полностью прочитай:

1. `HARMONY_VIDEO_RECONSTRUCTION_TASK.md`
2. `HARMONY_NEURAL_RECONSTRUCTION_V2_ADDENDUM.md`
3. `CHECKPOINT.md`
4. `docs/VIDEO_RECONSTRUCTION.md`
5. `README.md`
6. текущие Zod/Pydantic-схемы
7. MCP-инструменты
8. Python reconstruction core
9. HarmonySceneCompiler
10. `harmony_bridge.py`
11. тесты
12. portable integration bundle

Не доверяй предыдущим отчётам автоматически. Проверь код, тесты, `git status`, `git diff`, реальные реализации и отсутствие фиктивных success-ответов.

Не ломай уже работающий `frame_by_frame_vector`, Problem Frames, temporal fidelity, hypothesis manager, artist locks, versions, rollback и portable integration package.

---

# Главная цель

Конечный пользовательский сценарий:

```text
Сценарий
+ озвучка
+ персонажи
+ локация
+ стиль
+ несколько режиссёрских ограничений
→ AI Director
→ AI Actor
→ Key Pose Generator
→ Motion Synthesizer
→ Camera & Layout
→ Animation Critic
→ Variant Tournament
→ нативная редактируемая сцена Toon Boom Harmony
```

Система должна:

- понимать драматическую задачу;
- разбивать сцену на beats;
- придумывать актёрскую игру;
- создавать несколько режиссёрских и performance-вариантов;
- генерировать ключевые позы;
- строить timing, spacing, arcs, holds, anticipation, overshoot и settle;
- выполнять lip-sync и voice-to-performance;
- использовать Digital Actors;
- разделять персонажа на устойчивые части;
- выбирать Pegs, deformers, substitutions или frame-by-frame;
- строить камеру и layout;
- критиковать собственный результат;
- автоматически переделывать слабые варианты;
- собирать Harmony Manifest;
- генерировать безопасный Harmony Command Plan;
- применять его в настоящей Harmony только через whitelist bridge;
- сохранять scene versions, provenance и artist locks;
- учиться на исправлениях художника.

---

# Честные ограничения

Не утверждай, что система гарантированно заменяет великого аниматора в любой сцене.

В коде, UI и документации зафиксируй:

- авторский замысел нельзя однозначно вывести из пикселей;
- не показанный ракурс является генерацией;
- модель вкуса может ошибаться;
- художественные оценки субъективны;
- сложные эффекты и уникальная покадровая пластика требуют fallback;
- без настоящей Harmony нельзя доказать нативную TVG-запись;
- без данных исправлений мастеров нельзя обучить их производственное мышление.

Правильная реакция на неизвестность:

1. несколько вариантов;
2. объяснение различий;
3. confidence;
4. запрос референса;
5. human review;
6. artist lock;
7. reversible version;
8. fallback.

---

# Окружение без Harmony

На текущем Mac Toon Boom Harmony может отсутствовать.

В этом случае:

- не пытайся бесконечно искать несуществующий executable;
- не объявляй Harmony integration завершённой;
- не называй skipped integration test успешным;
- не возвращай `realSceneCreated: true`;
- не выдавай manifest, SVG, PNG, JSON или mock за нативную сцену.

Правильный статус:

```json
{
  "pipelineBuilt": true,
  "manifestGenerated": true,
  "commandPlanGenerated": true,
  "localPreviewGenerated": true,
  "harmonyAvailable": false,
  "harmonyApplied": false,
  "nativeDrawingVerified": false,
  "previewRenderedByHarmony": false,
  "status": "ready_for_external_harmony_integration"
}
```

Вся логика, не требующая Harmony, должна быть реально реализована и алгоритмически протестирована.

---

# 1. Scene Understanding Engine

Реализуй `SceneUnderstandingEngine`.

Вход:

- script;
- dialogue;
- audio;
- characters;
- relationships;
- location;
- props;
- style profile;
- director constraints.

Выход в строгой схеме:

- `SceneIntent`
- `CharacterIntent`
- `DramaticBeat`
- `ActionBeat`
- `ReactionBeat`
- `EmotionCurve`
- `AttentionTarget`
- `ContinuityConstraint`
- `Uncertainty`
- `Assumption`

Минимальный пример:

```json
{
  "beatId": "beat_04",
  "startTime": 4.2,
  "endTime": 6.8,
  "primaryCharacter": "masha",
  "intent": "accuse",
  "emotion": "controlled_anger",
  "action": "points_to_door",
  "reactionTarget": "ivan",
  "importance": 0.91,
  "suggestedPauseBefore": 0.35
}
```

Добавь rule-based baseline, который работает без LLM.

LLM backend может улучшать анализ, но не должен быть единственным рабочим путём.

---

# 2. AI Director

Реализуй `ScriptDirector`.

Он должен создавать:

- shot decomposition;
- shot sizes;
- staging;
- blocking;
- eyelines;
- camera decisions;
- pauses;
- dramatic emphasis;
- reaction shots;
- continuity;
- edit points.

Типы:

- `DirectorPlan`
- `ShotPlan`
- `CameraPlan`
- `BlockingPlan`
- `AttentionPlan`
- `EditDecision`

Минимальные стратегии:

- `restrained_dialogue`
- `commercial_dynamic`
- `dramatic_closeup`
- `comedic_timing`
- `anime_limited`
- `theatrical_staging`
- `single_take`
- `custom`

Генерируй минимум 3 варианта постановки, отличающиеся понятной режиссёрской стратегией, а не случайным шумом.

---

# 3. AI Actor / Performance Generator

Реализуй `PerformanceGenerator`.

Он должен придумывать:

- позы;
- взгляд;
- моргание;
- дыхание;
- перенос веса;
- движение плеч;
- микрореакции;
- gestures;
- head lead;
- eye lead;
- anticipation;
- holds;
- overshoot;
- settle;
- follow-through;
- взаимодействие с props.

Типы:

- `PerformancePlan`
- `PoseIntent`
- `GestureEvent`
- `GazeEvent`
- `BlinkEvent`
- `BreathEvent`
- `WeightShiftEvent`
- `FacialExpressionEvent`
- `ReactionEvent`

Каждое событие:

- start;
- end;
- intensity;
- target;
- body part;
- related beat;
- confidence;
- provenance;
- alternatives.

Генерируй варианты:

- restrained;
- energetic;
- sarcastic;
- anxious;
- aggressive;
- comedic;
- custom.

Поддержи смешивание:

```text
acting from A
gesture timing from B
final pose from C
```

---

# 4. Voice-to-Performance

Реализуй `VoicePerformanceAnalyzer`.

Вход:

- audioPath;
- transcript;
- speaker mapping;
- language;
- optional emotion hints.

Выход:

- words;
- phonemes;
- stresses;
- pauses;
- loudness;
- pitch contour;
- speech rate;
- breath points;
- emotional peaks;
- turn-taking;
- interruption;
- reaction windows.

На основе этого создавай:

- lip-sync;
- jaw motion;
- head accents;
- brow accents;
- blinks;
- gaze shifts;
- gestures;
- body accents;
- post-line holds.

Минимальный CPU baseline:

- forced alignment;
- phoneme timing;
- energy envelope;
- pitch estimation;
- pause detection;
- rule-based gesture mapping.

Не выдавай распознанную эмоцию за достоверный факт. Возвращай confidence и alternatives.

---

# 5. Digital Actor

Реализуй `DigitalActorRegistry`.

Digital Actor должен быть постоянным структурированным персонажем:

```text
DigitalActor
├── identity
├── model sheets
├── palettes
├── master drawings
├── head views
├── body views
├── eyes
├── brows
├── mouths
├── hands
├── props
├── pivots
├── hierarchy
├── deform rules
├── substitutions
├── pose families
├── gesture library
├── acting profile
└── provenance
```

Поддержи импорт:

- Harmony template;
- Harmony scene;
- PSD;
- SVG;
- PNG layers;
- model sheet;
- reference video;
- reconstruction manifest.

Добавь validation:

- missing views;
- conflicting palette IDs;
- invalid hierarchy;
- missing pivots;
- unsupported parts;
- incomplete substitutions;
- inferred geometry.

Всё сгенерированное помечай как `inferred`.

---

# 6. Character Part Decomposition

Реализуй `CharacterPartDecomposer`.

Для humanoid:

- head;
- hair;
- face;
- eyes;
- brows;
- mouth;
- torso;
- upper arms;
- forearms;
- hands;
- upper legs;
- lower legs;
- feet;
- clothing;
- accessories;
- props.

Для non-humanoid используй motion-based parts.

Выход:

- persistent part IDs;
- visible masks;
- amodal masks;
- layer order;
- occlusion graph;
- confidence;
- identity continuity;
- problem ranges.

Сначала CPU/heuristic baseline:

- motion clustering;
- color regions;
- contour persistence;
- optical flow;
- articulation hints;
- overlap tracking.

ML segmenter подключай через adapter. Не коммить веса.

---

# 7. Key Pose Generator

Реализуй `KeyPoseGenerator`.

Он должен создавать:

- storytelling pose;
- silhouette;
- line of action;
- balance;
- weight;
- facial expression;
- hand shape;
- gaze direction;
- relation to camera;
- relation to previous and next pose.

Типы:

- `KeyPose`
- `BreakdownPose`
- `ExtremePose`
- `AnticipationPose`
- `OvershootPose`
- `SettlePose`
- `SmearPose`
- `HoldPose`

Режимы:

1. `library_adaptation`
2. `generated_pose`

Для `generated_pose` сначала используй 2D skeleton/control graph, затем подгоняй drawings.

Не генерируй независимые растровые кадры как итог.

---

# 8. Motion Synthesizer

Реализуй `MotionSynthesizer`.

Он должен создавать:

- timing;
- spacing;
- arcs;
- ease;
- holds;
- anticipation;
- overshoot;
- settle;
- overlap;
- follow-through;
- secondary action.

Выход:

- transform tracks;
- deformer tracks;
- drawing substitutions;
- exposure blocks;
- frame-by-frame exceptions.

Поддержи:

- step;
- linear;
- ease-in;
- ease-out;
- ease-in-out;
- custom bezier;
- hold;
- overshoot;
- bounce;
- settle.

Добавь key reduction с контролем ошибки.

---

# 9. Motion Factorization

Реализуй `MotionFactorization`.

Если движение выражается общей геометрией и трансформациями:

```text
1 master drawing
+ Peg transform keys
```

Поддержи:

- translation;
- rotation;
- uniform scale;
- non-uniform scale;
- affine transform.

Hard constraints:

- silhouette fidelity;
- foreground error;
- trajectory error;
- temporal fidelity;
- internal detail preservation;
- no lost motion events.

Один drawing без transform track для движущейся последовательности запрещён.

---

# 10. Representation Router V3

Реализуй `RepresentationRouterV3`.

Для каждого объекта, части и диапазона выбирай:

- Peg;
- Curve Deformer;
- Envelope Deformer;
- Bone Deformer;
- Drawing Substitution;
- frame-by-frame vector;
- raster texture layer;
- reference-only.

Учитывай:

- rigid motion;
- silhouette change;
- articulation;
- occlusion;
- topology change;
- line stability;
- residual error;
- key count;
- Node View complexity;
- editability;
- studio profile;
- artist locks.

Пример:

```text
frames 1–30:
  arm_left = curve_deformer

frames 31–33:
  arm_left = smear drawings

frames 34–70:
  arm_left = curve_deformer
```

Каждое решение должно иметь explanation и confidence.

---

# 11. Camera & Layout Director

Реализуй `CameraLayoutDirector`.

Он должен создавать:

- staging;
- framing;
- camera position;
- camera scale;
- pan;
- tilt;
- truck;
- push-in;
- pull-out;
- focus of attention;
- safe margins;
- continuity;
- shot transitions.

Ограничения:

- keep character visible;
- no accidental crop;
- preserve screen direction;
- avoid jump cuts;
- respect dialogue eyelines;
- respect user camera locks.

Выход должен компилироваться в Harmony camera keys и Pegs.

---

# 12. Animation Critic

Реализуй `AnimationCritic`.

## Технические проверки

- missing drawings;
- broken exposures;
- holes;
- layer order;
- palette inconsistency;
- collisions;
- detached parts;
- broken pivots;
- invalid deformers;
- excessive keys;
- unstable contours;
- frozen motion;
- lost motion events;
- timing mismatch.

## Художественные proxy-проверки

- pose readability;
- silhouette clarity;
- staging;
- emotional clarity;
- gesture motivation;
- timing;
- spacing;
- anticipation;
- follow-through;
- overacting;
- underacting;
- dead motion;
- mechanical motion;
- repetitive gestures;
- gaze direction;
- reaction timing;
- camera motivation.

Возвращай:

- score dimensions;
- evidence;
- affected frames;
- severity;
- recommendation;
- alternative;
- confidence;
- human review required.

Сначала реализуй rule-based critic baseline.

ML critic подключай через adapter.

Не выдавай artistic proxy score за абсолютную истину.

---

# 13. Variant Tournament

Реализуй `VariantTournament`.

Алгоритм:

1. создать director variants;
2. создать performance variants;
3. собрать low-resolution previews;
4. отсеять технически невалидные;
5. прогнать Animation Critic;
6. выбрать top-K;
7. доработать top-K;
8. повторно оценить;
9. выбрать победителя или показать финалистов.

Поддержи budget:

- max variants;
- max compute time;
- max GPU memory;
- max refinement rounds;
- max preview resolution.

Храни lineage каждого варианта.

---

# 14. Taste Model

Добавь `TasteModelAdapter`.

На первом этапе:

- rule-based ranking;
- pairwise ranking;
- studio profile;
- accepted/rejected history.

Интерфейс:

```text
Given variant A and B:
which better satisfies this style profile and why?
```

Выход:

- preferred variant;
- score;
- reasons;
- uncertainty;
- conflict with technical metrics.

Taste Model не должен выполнять код или напрямую менять сцену.

---

# 15. Learning from Artist Corrections

Расширь `ArtistCorrectionEngine`.

Сохраняй:

- automatic version;
- corrected version;
- delta;
- artist comment;
- scope;
- accepted/rejected;
- reason;
- time spent;
- affected parts;
- affected frames;
- chosen representation;
- previous critic output.

Поддержи:

- detect changes;
- preview propagation;
- propagate;
- revert;
- lock;
- unlock;
- export training sample.

По умолчанию никакие данные не отправляются наружу.

---

# 16. Dataset Capture

Подготовь инфраструктуру:

```text
version 1
→ artist correction
→ version 2
→ director comment
→ version 3
→ final accepted version
```

Сохраняй:

- Harmony scene deltas;
- key pose changes;
- timing changes;
- camera changes;
- layer changes;
- palette changes;
- representation choices;
- critique;
- acceptance.

Добавь локальный exporter.

Не включай proprietary data в репозиторий.

---

# 17. Training Roadmap

Не начинай с обучения огромных моделей.

## Phase 0

Rule-based и готовые backends.

## Phase 1

Temporal Layer & Part Reconstruction.

## Phase 2

Persistent Vector Topology.

## Phase 3

Voice-to-Performance policy.

## Phase 4

Key Pose ranking.

## Phase 5

Representation policy.

## Phase 6

Animation Critic.

## Phase 7

Taste model from pairwise preferences.

## Phase 8

Studio-specific fine-tuning.

Для каждой модели опиши:

- input schema;
- output schema;
- dataset;
- loss;
- evaluation;
- fallback;
- license;
- model size;
- inference budget.

---

# 18. Harmony Manifest V3

Создай schema version `3.0`.

Добавь:

```text
sceneUnderstanding
directorPlans
performancePlans
voiceAnalysis
digitalActors
keyPoses
motionTracks
cameraTracks
gestureEvents
gazeEvents
facialEvents
partGraphs
occlusionGraphs
representationSegments
criticReports
variantTournament
tasteScores
selectionHistory
artistCorrections
trainingSignals
```

Сохрани:

- Zod;
- Pydantic;
- schema migrations;
- provenance;
- strict validation;
- no raw code.

---

# 19. Harmony Command Plan V3

Добавь whitelist-операции:

```text
create_group
create_drawing_element
create_drawing
write_path
create_palette
add_palette_swatch
create_peg
attach_drawing_to_peg
set_pivot
set_transform_keyframe
set_transform_interpolation
create_deformer
configure_deformer
set_deformer_key
set_exposure
set_substitution
create_camera
set_camera_key
create_composite
connect_nodes
set_node_attribute
lock_element
save_version
render_preview
```

Запрещён raw Python, JavaScript и QtScript от пользователя или модели.

На Mac:

- генерируй;
- валидируй;
- тестируй.

На Harmony-машине:

- выполняй через whitelist bridge;
- проверяй scene;
- reopen;
- render;
- editability.

---

# 20. Главный MCP-инструмент

Добавь:

```text
harmony.ai_studio.generate_editable_scene
```

Параметры:

- script;
- dialogue;
- audioPath;
- characterIds;
- locationId;
- styleProfileId;
- studioProfileId;
- targetDuration;
- targetFps;
- shotConstraints;
- cameraConstraints;
- performanceStyle;
- variantCount;
- quality;
- creativity;
- editabilityPriority;
- dryRun;
- targetProjectPath.

Результат:

- jobId;
- scene plan;
- director variants;
- performance variants;
- selected variant;
- key poses;
- transform tracks;
- drawings;
- substitutions;
- camera plan;
- critic reports;
- problem frames;
- Harmony Manifest;
- Harmony Command Plan;
- local previews;
- portable integration package;
- real Harmony project только при фактическом успешном применении.

---

# 21. Дополнительные MCP-инструменты

Добавь:

```text
harmony.ai_studio.analyze_scene
harmony.ai_studio.generate_director_variants
harmony.ai_studio.generate_performance_variants
harmony.ai_studio.analyze_voice
harmony.ai_studio.build_digital_actor
harmony.ai_studio.generate_key_poses
harmony.ai_studio.synthesize_motion
harmony.ai_studio.route_representations
harmony.ai_studio.generate_camera_plan
harmony.ai_studio.critique_variant
harmony.ai_studio.run_variant_tournament
harmony.ai_studio.select_variant
harmony.ai_studio.refine_scene
harmony.ai_studio.export_training_sample
```

Обычный пользователь не должен вручную вызывать всё по отдельности.

---

# 22. AI Studio Panel

Создай панель с flow:

1. Select Script.
2. Attach Voice.
3. Select Characters.
4. Select Location.
5. Choose Style.
6. Generate Director Variants.
7. Generate Performances.
8. Compare Variants.
9. Build Editable Scene.
10. Review Problem Frames.
11. Apply Artist Corrections.
12. Propagate.
13. Lock.
14. Render.
15. Critique.
16. Refine.
17. Accept.

Показывай:

- scene intent;
- beats;
- characters;
- audio;
- variants;
- previews;
- critic scores;
- problem frames;
- selected plan;
- compute budget;
- progress;
- confidence;
- fallback;
- Harmony availability;
- export integration bundle.

Не показывай «готово», если создан только manifest.

---

# 23. Anti-Cheating

Запрещено улучшать score путём:

- заморозки движения;
- удаления деталей;
- удаления второго персонажа;
- удаления фона;
- уменьшения drawings ценой потери poses;
- игнорирования problem frames;
- усреднения ошибки по статичному фону;
- одного drawing без transform track;
- отключения critic;
- пропуска failed variants.

Recommendation возможна только после hard constraints.

---

# 24. Метрики

## Технические

- frame coverage;
- exposure coverage;
- drawing count;
- vector point count;
- transform key count;
- deformer count;
- substitution count;
- scene size;
- render time;
- residual error;
- silhouette IoU;
- foreground error;
- temporal fidelity;
- lost motion events;
- broken links;
- locked element violations.

## Художественные proxy

- silhouette readability;
- pose contrast;
- gesture clarity;
- hold duration;
- action-reaction timing;
- gaze target consistency;
- staging clarity;
- motion density;
- repetitive gesture ratio;
- emotional beat alignment;
- camera motivation score.

Не выдавай artistic proxy за абсолютное качество.

---

# 25. Тестовые сценарии

Создай fixtures:

1. Один персонаж произносит реплику и делает жест.
2. Два персонажа: действие и реакция.
3. Пауза перед эмоциональным всплеском.
4. Lip-sync с ударениями.
5. Head turn.
6. Pointing gesture.
7. Walk-in and stop.
8. Hold + blink.
9. Camera push-in.
10. Smear frame.
11. Occluded hand.
12. Changing silhouette.
13. Static background + small moving actor.
14. Multiple performance variants.
15. Critic rejecting mechanical motion.

Не хранить тяжёлый copyrighted material.

---

# 26. Обязательные тесты

## Unit

- schemas;
- scene beats;
- voice events;
- key poses;
- transform tracks;
- routing;
- critic;
- variant ranking;
- artist locks;
- rollback;
- provenance.

## Integration без Harmony

```text
script + audio
→ scene plan
→ director variants
→ performance variants
→ key poses
→ motion tracks
→ manifest
→ command plan
→ local preview
→ critic
→ tournament
→ selection
→ portable bundle
```

## Harmony integration

Skip только когда Harmony отсутствует.

На Harmony-машине проверить:

- native drawings;
- palettes;
- exposures;
- Pegs;
- transform keys;
- substitutions;
- deformers;
- camera;
- save;
- reopen;
- render;
- editability.

---

# 27. Порядок реализации

## Iteration 1 — Scene Intelligence

- SceneUnderstanding;
- Director Plan;
- schemas;
- tests;
- HTML report.

## Iteration 2 — Voice & Performance

- forced alignment;
- speech features;
- gesture events;
- performance variants;
- tests.

## Iteration 3 — Digital Actor

- registry;
- import;
- validation;
- master drawings;
- pose families.

## Iteration 4 — Key Poses & Motion

- key pose generator;
- transform tracks;
- timing;
- holds;
- motion preview.

## Iteration 5 — Part Decomposition & Hybrid Routing

- persistent parts;
- motion clusters;
- representation router;
- fallback.

## Iteration 6 — Camera & Layout

- shot plan;
- blocking;
- camera keys;
- continuity checks.

## Iteration 7 — Critic & Tournament

- rule-based critic;
- technical gates;
- artistic proxy scores;
- multi-round ranking.

## Iteration 8 — Harmony Native Build

- Manifest V3;
- Command Plan V3;
- portable bundle;
- integration harness.

## Iteration 9 — Learning from Corrections

- delta capture;
- pairwise preferences;
- training export;
- privacy.

## Iteration 10 — Studio Intelligence

- studio profiles;
- acting profiles;
- taste model;
- reusable episode compiler.

Каждая итерация должна завершаться:

- кодом;
- тестами;
- demo;
- checkpoint;
- честным статусом.

---

# 28. Первый обязательный end-to-end demo

Без Harmony реализуй:

```text
Script:
«Ты действительно думал, что я ничего не узнаю?»

Audio:
короткая реплика с паузой и ударением.

Characters:
Masha, Ivan.
```

Результат:

- scene understanding;
- 3 director variants;
- 3 performance variants per director plan;
- voice timing;
- key poses;
- gaze events;
- gesture events;
- transform tracks;
- camera plan;
- local previews;
- critic report;
- tournament winner;
- Harmony Manifest V3;
- Harmony Command Plan V3;
- portable integration package.

Выбранный вариант обязан содержать:

- паузу;
- поворот взгляда;
- подготовку жеста;
- pointing gesture;
- реакцию второго персонажа;
- camera decision;
- объяснение выбора.

---

# 29. Критерий экономии человеко-часов

Добавь измерение:

- estimated manual keys avoided;
- estimated drawings avoided;
- estimated lip-sync operations avoided;
- estimated cleanup operations avoided;
- estimated camera operations avoided;
- accepted automatic decisions;
- required human corrections;
- time to first editable scene;
- time to accepted scene.

Не заявляй «тысячи часов сэкономлены» без этих метрик.

---

# 30. Запрещённые ложные завершения

Нельзя объявлять:

- AI Director готовым, если он только пересказывает сценарий;
- AI Actor готовым, если он только делает lip-sync;
- Digital Actor готовым, если это одна PNG;
- Key Pose Generator готовым, если он выдаёт картинки;
- Critic готовым, если считает только pixel difference;
- Taste Model готовой, если выбирает самый маленький файл;
- Harmony integration готовой без реальной сцены;
- экономию доказанной без измерения ручной работы;
- mock-only tests доказательством продукта.

---

# 31. Финальный отчёт после каждой сессии

Укажи:

- что реально реализовано;
- что работает end-to-end;
- что проверено алгоритмически;
- что mock-only;
- что требует Harmony;
- какие модели используются;
- какие веса нужны;
- лицензии;
- работающие MCP-инструменты;
- сколько вариантов создано;
- что выбрал critic;
- почему;
- сколько key poses;
- сколько drawings;
- сколько transform keys;
- сколько problem frames;
- сколько corrections;
- результаты тестов;
- путь к demo;
- путь к portable bundle;
- точную команду продолжения;
- ограничения;
- backlog по влиянию.

Не пиши «всё завершено», если это неправда.

---

# Главный принцип

Система должна перестать быть просто конвертером пикселей.

Она должна стать:

> программной AI-анимационной студией, которая понимает драматическую задачу, предлагает режиссёрские решения, придумывает актёрскую игру, создаёт ключевые позы, синтезирует движение, собирает нативную сцену Harmony, критикует собственный результат, генерирует альтернативы и учится на исправлениях художника.

Не заменяй талант декларацией.

Заменяй конкретные художественные и производственные решения конкретными алгоритмами, строгими схемами, проверяемыми вариантами, честными метриками и рабочим кодом.
