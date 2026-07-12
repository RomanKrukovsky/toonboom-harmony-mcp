# CHECKPOINT — 2026-07-12 (AI ANIMATION STUDIO — ITERATION 1: SCENE INTELLIGENCE)

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