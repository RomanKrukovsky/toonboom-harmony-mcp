# CHECKPOINT — 2026-07-12 (AI ANIMATION STUDIO — ITERATION 5)

## Iteration 5 — COMPLETED (Part Decomposition & Hybrid Routing)

В рамках Iteration 5 реализована система декомпозиции персонажа на части и интеллектуального выбора представлений:

### CharacterPartDecomposer (CPU heuristic baseline)
- **Декомпозиция**: разбивает персонажа на 22 стандартные части (humanoid template: head, torso, arms, legs, hands, feet, hair, clothing, accessories, props)
- **Motion clusters**: автоматически определяет тип движения для каждой части (rigid/articulated/deformable/static)
- **Occlusion graph**: строит граф окклюзий на основе depth ordering
- **Problem ranges**: обнаруживает проблемные диапазоны (окклюзия, низкая уверенность)
- **Articulation hints**: вычисляет подсказки артикуляции из паттернов движения
- **Identity continuity**: оценивает непрерывность идентичности частей

### RepresentationRouterV3
- **Интеллектуальный выбор**: для каждой части выбирает оптимальное представление (Peg Transform, Curve Deformer, Envelope Deformer, Bone Deformer, Drawing Substitution, Frame-by-frame Vector)
- **Факторы**: учитывает motion type, silhouette change, occlusion, topology change, line stability, editability
- **Studio profiles**: поддерживает профили студии (preferred representation, editability priority, frameByFrame allowed)
- **Artist locks**: уважает блокировки художника (confidence=1.0 для locked parts)
- **Alternatives**: предоставляет альтернативные варианты с confidence scores
- **Explanations**: генерирует объяснения для каждого решения

### Zod схемы
- `src/schemas/partDecomposition.ts` — PartDecomposition, PartTrack, PartFrameState, OcclusionEdge, MaskRegion
- `src/schemas/representationRouter.ts` — RoutingPlan, RoutingDecision, RepresentationType

### MCP инструменты
- `harmony.ai_studio.decompose_character_parts` — декомпозиция персонажа на части
- `harmony.ai_studio.route_representations` — выбор представлений для частей

### Тесты
- 22 новых unit-теста в `tests/partDecomposition.test.ts` полностью зеленые
- Проверяют декомпозицию, motion clusters, occlusion detection, routing logic, artist locks, studio profiles
- Обновлены существующие тесты (sceneIntelligence, mcpCoexistence) для учета 10 инструментов (было 8)

### Demo
- `npm run demo:ai_studio_iter5` демонстрирует полный pipeline
- Генерирует HTML report с визуализацией частей, motion clusters, routing decisions
- Сохраняет JSON artifacts (decomposition.json, routing_plan.json)
- Результат: 22 части, 3 типа представлений (peg_transform: 11, frame_by_frame_vector: 2, reference_only: 9)

### Проверки
- `npm run build` — PASS
- `npm test` — 226 passed, 6 skipped (Harmony integration)
- Demo — PASS, генерирует 11,820 bytes HTML report

### Честные ограничения
- CPU heuristic baseline — нет ML segmenter
- Позиции частей оценены из humanoid template, не наблюдаются из видео
- Occlusion graph вычислен из depth ordering, не из реального pixel overlap
- Representation routing rule-based, не обучен на studio preferences
- Harmony не применялась — все вычисления offline

Команда демонстрации: `npm run demo:ai_studio_iter5`
Честный статус: CPU heuristic baseline, no ML segmenter, no Harmony applied.

---

## Iteration 4 — COMPLETED (Key Poses & Motion)

Код и тесты Phase 2 полностью реализованы, проверены локально через офлайн-валидацию и зафиксированы коммитом. Офлайн-валидация и сборка переносимого пакета `output/harmony-phase2-offline-bundle` с 44 командами, контрольными суммами и Python-раннером работают. Jest тесты и Python тесты проходят.

## Iteration 4 — COMPLETED (Key Poses & Motion)

В рамках Iteration 4 спроектированы и реализованы модули планирования и интерполяции движений:
- **Zod-схемы**: в `src/schemas/keyPoseMotion.ts` определены структуры для описания storytelling key poses (`KeyPose`, `BreakdownPose`, `ExtremePose`, `AnticipationPose`, `OvershootPose`, `SettlePose`, `SmearPose`, `HoldPose`), а также transform tracks, keyframes, timing interpolations и сжатия.
- **KeyPoseGenerator**: в `src/adapters/keyPoseGenerator/index.ts` автоматически расставляет позы подготовки (anticipation), акцентов (extreme), перехлестов (overshoot), успокоения (settle) и удержания (hold) на основе драматических пауз и голосовых пиков производительности.
- **MotionSynthesizer**: в `src/adapters/motionSynthesizer/index.ts` производит интерполяцию по кривым (linear, ease-in, ease-out, overshoot, settle) для всех костей/частей тела, формирует exposure blocks и drawing substitutions, а также выполняет сжатие ключевых кадров (keyframe reduction) по алгоритму RDP с контролем погрешности.
- **MCP Tools**: зарегистрированы инструменты `harmony.ai_studio.generate_key_poses` и `harmony.ai_studio.synthesize_motion`.
- **Тесты**: новые тесты в `tests/keyPoseMotion.test.ts` полностью зеленые (проверяют планирование поз по кадрам и сжатие траекторий в пределах допуска погрешности).
- **Demo**: `npm run demo:ai_studio_iter4` демонстрирует полный цикл планирования и интерполяции сжатия для персонажа Masha (torso rotation сжато в 36 раз с нулевой ошибкой).

Команда демонстрации: `npm run demo:ai_studio_iter4`.
Честный статус: все анимационные расчеты траекторий выполняются на стороне MCP; для планирования live Harmony не требуется.

## Iteration 3 — COMPLETED (Digital Actor Registry)

В рамках Iteration 3 полностью спроектирован и реализован реестр Digital Actor:
- **Zod-схемы**: в `src/schemas/digitalActor.ts` определены детальные структуры `DigitalActor` и `DigitalActorValidation` для персистентного описания персонажа.
- **Registry**: `DigitalActorRegistry` в `src/adapters/digitalActorRegistry/index.ts` поддерживает импорт из PSD, SVG, PNG layers, Harmony template, Harmony scene или reconstruction manifest.
- **Validation**: встроенные проверки на missing views (по 8 ракурсам 360), conflicting palette IDs, invalid hierarchy (циклы в графе частей тела), missing pivots и incomplete substitutions. Все сгенерированные/приблизительные параметры помечаются как `inferred: true` или с origin `generated`.
- **MCP Tool**: добавлен `harmony.ai_studio.build_digital_actor`.
- **Тесты**: 8 новых unit-тестов в `tests/digitalActor.test.ts` полностью зеленые (проверяют импорт, валидацию, детекцию циклов, сохранение и чтение).
- **Demo**: `npm run demo:ai_studio_iter3` импортирует Masha (из манифеста) и Ivan (из папки PNG), валидирует, проверяет warnings/errors и сохраняет в `output/factory/actors/`.

Команда демонстрации: `npm run demo:ai_studio_iter3`.
Честный статус: PSD/SVG импорт и расчет pivots реализованы через офлайн CPU fallback; live Harmony не требуется.

---

## Phase 1 — Foundation acceptance

Phase 1 завершена в пределах dev/on-prem baseline. Реализованы и проверены:

- единый MCP control plane с namespace `harmony.factory.*`;
- durable SQLite jobs, DAG steps, checkpoints, cancel и повторное открытие состояния;
- model/dataset registry;
- content-addressed artifact store с SHA-256;
- token RBAC (`viewer` → `system_admin`), authenticated demo;
- job metrics и worker endpoints `/health/live`, `/health/ready`, `/metrics`;
- реальный вертикальный срез MP4 + WAV → OpenCV observation → retargeting → 24 SVG preview;
- 26 проверенных артефактов и полный provenance.

Команда: `npm run demo:factory:phase1`.

Артефакт: `output/factory/phase1_real_demo/factory_job_result.json`.

Проверки: TypeScript typecheck PASS, build PASS, Jest 21/21 suites и 187/193 tests PASS (6 Harmony tests skipped), Python 33/34 PASS (1 Harmony skipped).

Честный статус: OpenCV baseline — реальный, но грубый silhouette inference, не анатомическая pose-модель. SQLite/local storage только dev backend. Native TVG и Harmony round-trip не проверены. Система не промышленная. Phase 2 нельзя считать завершённой без licensed Harmony runner.

---

# История: AI Animation Studio — Iteration 2

## Итог Iteration 2

Реализован первый рабочий слой AI Actor:

```text
WAV + transcript + SceneUnderstanding
→ CPU-анализ голоса
→ слова, приблизительные фонемы, паузы, энергия, pitch, темп и акценты
→ 3+ разных performance-варианта
→ позы, взгляд, мимика, жесты, моргание, дыхание, перенос веса, реакции и holds
→ автономный HTML-отчёт
```

### Что реально работает

- `VoicePerformanceAnalyzer` читает PCM/float WAV без внешнего сервиса.
- Считает RMS-энергию, простую автокорреляционную оценку pitch, паузы и активные интервалы.
- Привязывает слова к участкам с речевой энергией. Без WAV использует честный proportional fallback.
- Строит приблизительные фонемные группы, ударения, breath points, reaction windows и proxy-пики.
- `PerformanceGenerator` поддерживает `restrained`, `energetic`, `sarcastic`, `anxious`, `aggressive`, `comedic`, `custom`.
- Варианты отличаются правилами, а не случайным шумом.
- Можно смешать общую игру из A, тайминг жестов из B и позы из C.
- Добавлены MCP-инструменты `harmony.ai_studio.analyze_voice`, `generate_performances`, `mix_performance`.
- Демо: `npm run demo:ai_studio_iter2`.

### Проверяемый результат демо

- `output/ai_studio/iteration2_demo_voice.wav` — настоящий 16-bit PCM WAV.
- `output/ai_studio/iteration2_demo_report.html` — слова, голосовые признаки и три performance-плана.
- На тестовом WAV: 9 слов, 2 паузы, 120 energy samples, 48 pitch samples.

### Проверки

- `npm run build` — PASS.
- `npm test -- --runInBand tests/voicePerformance.test.ts` — 9/9 PASS.
- Python reconstruction core — 32 PASS, 1 SKIPPED.
- Полный Jest-прогон: 18 suites PASS; 2 сторонних новых suite не компилируются из-за незавершённых изменений контрактов `config/security/webcc`. Iteration 2 эти файлы не меняла.

### Честные ограничения

- Alignment приблизительный: это energy-guided CPU baseline, а не Montreal Forced Aligner.
- Фонемы являются группами букв, а не акустически распознанными фонемами.
- Эмоциональные пики — гипотеза. Они не выдаются за достоверную эмоцию.
- Performance — редактируемый план. Он пока не создаёт ключевые позы, motion tracks или TVG.
- Harmony не применялась; `harmonyApplied=false`.
- Turn-taking для одного входного трека поддерживает один speaker segment; полноценный overlap/interruption требует раздельных дорожек или diarization.

### Новые файлы

- `src/schemas/voicePerformance.ts`
- `src/adapters/voicePerformanceAnalyzer/index.ts`
- `src/adapters/performanceGenerator/index.ts`
- `src/adapters/voicePerformanceReport/index.ts`
- `tests/voicePerformance.test.ts`
- `scripts/demo_ai_studio_iter2.js`

### Следующий этап

Iteration 3 — `DigitalActorRegistry`: импорт, постоянные части, иерархия, pivots, substitutions, pose families и проверка полноты ассета.

---

# История: Iteration 1 — Scene Intelligence

## Что было сделано в этой итерации

Iteration 1 AI Animation Studio (Master Prompt §27) — **Scene Intelligence**:

`Сценарий + реплики + персонажи → SceneUnderstandingEngine → Dramatic Beats, Emotion Curve, Attention → ScriptDirector → ≥3 режиссёрских варианта → HTML report`

Это первая итерация согласно мастер-промпту. Она реализует разделы §1 (Scene Understanding Engine) и §2 (AI Director) и закладывает фундамент для Iteration 2 (Voice & Performance), Iteration 4 (Key Poses & Motion) и Iteration 7 (Critic & Tournament).

Конечные пользовательские сценарии Iteration 1:

```text
Сценарий «Ты действительно думал, что я ничего не узнаю?»
+ реплики Masha / Ivan
+ режиссёрские ограничения
+ локация
→ SceneUnderstanding (intent=reveal, confidence=62%)
→ 3 Director variant (restrained_dialogue / commercial_dynamic / dramatic_closeup)
→ output/ai_studio/iteration1_demo_report.html
```

## Статус реализации по разделам Master Prompt

| Раздел Мастер-Промпта | Реализован? | Как проверено | Нужна Harmony? |
| :--- | :---: | :---: | :---: |
| **§1 SceneUnderstandingEngine** (rule-based) | Да | 9 unit-тестов в `tests/sceneIntelligence.test.ts` | Нет |
| **§2 ScriptDirector** (≥8 стратегий, ≥3 варианта) | Да | 7 unit-тестов + demo | Нет |
| **§18 Harmony Manifest V3** | Частично — внедрена подсхема SceneUnderstanding и DirectorPlan (`schemaVersion: '1.0'`), интегрировать в Manifest V3 будет Iteration 8 | Тесты схем Zod | Нет |
| **§27 Iteration 1** | Полностью завершена | Полный набор тестов-green, demo-green | Нет |
| **§28 Mandatory demo** | Да — `npm run demo:ai_studio_iter1` | Реальный запуск | Нет |

## Что реально работает end-to-end (без Harmony)

1. **SceneUnderstandingEngine.analyze(input)** — принимает script + dialogue + characters + director constraints, возвращает Zod-валидный `SceneUnderstanding` с:
   - `sceneIntent` (агрегированный по beats, взвешенный importance × confidence);
   - `characters[]` с role, stance, goalInScene, emotionalArc, hasDialogue, speaksFirst, receivesReaction;
   - `beats[]`: один beat на реплику с intent / emotion / action / importance / suggestedPauseBefore / beatKind / confidence / assumptionIds;
   - `actionBeats[]` (энергия per line) и `reactionBeats[]` (silent_listen реактивный beats);
   - `emotionCurve[]` (valence/arousal samples на каждый beat);
   - `attentionTargets[]` (где фокус в каждом кадре);
   - `continuity[]` (eyeline, screen_direction, screen_position);
   - `assumptions[]` (каждая inference явно записана с confidence и falsifiable=true);
   - `uncertainties[]` (всё, что выведено без lexical cue — помечено; например, fallback emotion, отсутствие location, отсутствие constraints).
2. **ScriptDirector.generate(scene, strategy)** — производит Zod-валидный `DirectorPlan` с:
   - `shots[]` (аттрибуция beat → shot с framing / cameraMove / staging / eyeline / rationale);
   - `camera` pushIn on climax;
   - `blocking[]` для каждого персонажа (стабильные позиции left/right);
   - `attention[]` (focus per shot);
   - `editDecisions[]` (типы катов: L_cut / hard / match_action / match_on_look / smash);
   - `pauses[]` (увеличенные по `pauseBias` стратегии);
   - `dramaticEmphasisBeatIds` (close-up / push-in моменты);
   - `reactionShotCount` (отношение реакции varies от 0.0 single_take до 0.8 commercial_dynamic).
3. **ScriptDirector.generateVariants(scene, count, strategies?)** — генерирует ≥3 читаемо-различающихся вариантов (default 3: restrained_dialogue / commercial_dynamic / dramatic_closeup). Число можно запросить до 8 — все стратегии проходят Zod-валидацию (тест в `tests/sceneIntelligence.test.ts`).
4. **MCP tools** (зарегистрированы в `src/index.ts`):
   - `harmony.ai_studio.analyze_scene` — выполняет engine.analyze(input), опционально пишет HTML-отчёт с уже сгенерированными 3 дефолтными вариантами для preview. Возвращает поля `honestLimitations` (Master Prompt §"Честные ограничения").
   - `harmony.ai_studio.generate_director_variants` — выполняет director.generateVariants, опционально пишет HTML. Принимает либо готовое `sceneUnderstanding`, либо (script+characters+dialogue) — движок пересчитает Scene из входных.
5. **HTML report** (`SceneIntelligenceReportBuilder`) — однопроходный статичный HTML без внешних CSS/JS. Показывает scene intent + characters + beats timeline + emotion curve + attention + continuity + assumptions + uncertainties + каждый director variant (shots, blocking, edit decisions, pauses). Файл `output/ai_studio/iteration1_demo_report.html` реален и валиден.

## Что НЕ реализовано в этой итерации (честно)

- **Harmony Manifest V3 (Master Prompt §18)** — полная семантика Manifest с `keyPoses`, `motionTracks`, `cameraTracks`, `criticReports` и migrations. В Iteration 1 создан только foundation (`SceneUnderstanding` и `DirectorPlan` подсхемы). Это сознательно не делается здесь — Iteration 4/7/8 добавят ключевые позы, motion и critic accordingly.
- **Harmony Command Plan V3 (Master Prompt §19)** — Iteration 8.
- **Генерация нативного TVG / применение bridge** — Iteration 8 (на Mac без Harmony недоказуемо).
- **AI Actor, key poses, motion synthesis, critic, tournament, taste model** — Iterations 2–10.
- **LLM-adapter для scene understanding** — не подключён. rule-baseline полностью рабочий и самодостаточный. LLM adapter обязателен к подключению через adapter по схеме Master Prompt §1 — но не в этой итерации.
- **Импорт PSD/SVG/PNG для Digital Actor** — Iteration 3.

## Что является mock-only / skipped

- Harmony integration test остаётся skipped — на Mac нет Harmony (как и предыдущих итерациях). После выполнения workflow ничего не считает `harmonyApplied: true`.

## Честные ограничения (Master Prompt §30 — запрещённые ложные завершения)

- Iteration 1 не объявляет AI Director «готовым» (он только планирует shot decomposition; Performance Generator — Iteration 2). Реальная режиссура требует LLM-adapter или тру-актора (недоступно здесь).
- Iteration 1 не создаёт нативный TVG, не генерирует манифест V3 целиком и не ренderит Harmony.
- Emotion analysis — это **proxy**, не достоверное прочтение актёрской эмоции. Каждая запись в `assumptions` и `uncertainties` явно помечает это.
- `sceneIntent` — это **гипотеза**, выведенная из lexical cues. Когда lexical evidence отсутствует, движок честно возвращает `intent='speak'` с `confidence<0.4` и записывает assumption, а не фабрикует «уверенное» прочтение.

## Файлы созданы / изменены

**Новые:**
- `src/schemas/sceneIntelligence.ts` — Zod-схемы для SceneUnderstanding, DramaticBeat, CharacterIntent, EmotionCurve, AttentionTarget, ContinuityConstraint, Uncertainty, Assumption, DirectorPlan, ShotPlan, CameraPlan, BlockingPlan, AttentionPlan, EditDecision, DirectorVariantSet.
- `src/adapters/sceneUnderstanding/index.ts` — `SceneUnderstandingEngine` (rule-based).
- `src/adapters/scriptDirector/index.ts` — `ScriptDirector` (8 стратегий, генерация ≥3 variants).
- `src/adapters/sceneIntelligenceReport/index.ts` — `SceneIntelligenceReportBuilder` (HTML report).
- `src/tools/aiStudioTools.ts` — MCP tools `harmony.ai_studio.analyze_scene` и `harmony.ai_studio.generate_director_variants`.
- `scripts/demo_ai_studio_iter1.js` — end-to-end demo (Master Prompt §28).
- `tests/sceneIntelligence.test.ts` — 24 unit-теста.
- `output/ai_studio/iteration1_demo_report.html` — сгенерированный отчёт.

**Изменены (минимально):**
- `src/index.ts` — регистрация `aiStudioTools`.
- `tests/reconstruction.test.ts` — добавлено `transformTracks: []` в fixture (исправлен pre-existing failure после добавления поля в V2 addendum).
- `package.json` — добавлен script `demo:ai_studio_iter1`.

## Фактически выполненные проверки

```text
npm ci                              PASS (440 packages)
npm run build                       PASS
npm test -- --runInBand             PASS: 15 suites, 133 tests (было 14/109)
.venv-reconstruction pytest          PASS: 24 tests, 1 skipped
npm run demo:ai_studio_iter1        PASS
                                     → output/ai_studio/iteration1_demo_report.html
                                       18,639 bytes, HTML валиден
```

До Iteration 1: 14 suites / 109 tests / 1 failing
После Iteration 1: 15 suites / 133 tests / 0 failing (+24 новых тестов Iter1)

## Главные ограничения этой итерации

1. Harmony integration не запускалась (нет лицензии на Mac).
2. Emotion и intent — это proxy, не достоверно восстановленное авторское прочтение.
3. Director планы — это shot decomposition без actor performance; actor performance — Iteration 2.
4. Amodal inference, ML-сегментатор и pose estimation — не подключены (Iteration 3+).
5. LLM-adapter для scene understanding определён интерфейсом в `SceneUnderstandingInput`, но сама интеграция с конкретной LLM-api не сделана в Iteration 1 (rule-baseline полностью рабочий путь).

## Точная команда запуска на машине разработки

```bash
cd /Users/romanmolodyko/Documents/toon-boom-harmony-mcp
npm ci
npm run build
python3.9 -m venv .venv-reconstruction
.venv-reconstruction/bin/pip install -r services/reconstruction-core/requirements.lock
.venv-reconstruction/bin/pip install -e services/reconstruction-core --no-deps
npm test -- --runInBand
.venv-reconstruction/bin/pytest services/reconstruction-core/tests -v
npm run demo:ai_studio_iter1                       # NEW Iteration 1 demo
open output/ai_studio/iteration1_demo_report.html  # Посмотреть отчёт
npm run demo:reconstruction                         # Существующий reconstruction demo
npm run reconstruction:prepare-harmony-integration # Существующий portable bundle
```

## Следующая итерация (Iteration 2 — Voice & Performance)

Перейти к Iteration 2 только после того, как Iteration 1 завершена кодом, тестами, demo и этим честным CHECKPOINT.
Iteration 2 планирует:

- `VoicePerformanceAnalyzer` (forced alignment, energy envelope, pitch estimation, pause detection);
- speech features → gesture events;
- `PerformanceGenerator` (restrained / energetic / sarcastic / anxious / aggressive / comedic / custom);
- variants;
- тесты + HTML отчет.

Импорт Iteration 2 не сломает Iteration 1: все типы и инструменты Iteration 1 остаются working Зod-валидными контрактом для downstream.
