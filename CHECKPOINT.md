# CHECKPOINT — 2026-08-30T11:23:57Z (SPRINT 1 — MOHO SHOW BIBLE: COMPLETED)

## Главный статус этой сессии

Sprint 1 закрыт. Реализован семейный Moho Show Bible — 6 Zod-схем, loader с детерминированным SHA-256 fingerprint, пять MCP-инструментов (`moho.show_bible.load/validate/fingerprint/get_cross_refs/list_allowed_rig_types`), образцовый бандл и полное покрытие тестами. Все юниты зелёные, rigType gating и license gating работают fail-closed.

Sprint 1 покрывает вертикальный путь «словарь студии на диске → провалидированный пакет в памяти → стабильный идентификатор бандла» без подключения живого Moho. Все артефакты детерминированы: один и тот же набор JSON на диске даёт одинаковый `fingerprint` независимо от порядка ключей, форматирования и OS-концов строк.

## Что реализовано в Sprint 1

### 6 Zod-схем (`src/schemas/`)

| Документ                | Схема                                | Назначение                                                                                                  |
| :---------------------- | :----------------------------------- | :---------------------------------------------------------------------------------------------------------- |
| `moho_show_bible.json`  | `mohoShowBibleSchema` v1.0           | Верхнеуровневый лок: fps, разрешение, стиль, освещение, allow-list деформаций и типов ригов, ссылки на 5 ниже |
| `character_bible.json`  | `mohoCharacterBibleSchema` v1.0      | Один персонаж: rigType (humanoid_2leg/quadruped/creature/mechanical), позы, контроллеры, expressions         |
| `camera_rules.json`     | `mohoCameraRulesSchema` v1.0         | Разрешённые shot sizes, camera moves, safe margins, forbidden moves                                          |
| `motion_grammar.json`   | `mohoMotionGrammarSchema` v1.0       | Дозволенные gestures / emotions / позы / timing rules                                                       |
| `palette_manifest.json` | `mohoPaletteManifestSchema` v1.0     | Залоченная палитра с стабильными `colourId` (8-digit RGBA), `mohoColourIndex`, usage, locked                  |
| `qa_thresholds.json`    | `mohoQaThresholdsSchema` v1.0        | Числовые QA-гейты для Retake Engine                                                                         |

Все 6 схем — `.strict()`, каждая имеет `schemaVersion: "1.0"`, `provenance.approver` и `provenance.approvedAt` (ISO datetime). Каждая экспортирует `assert*Version` для fail-closed проверки major-версии.

### Loader (`src/services/mohoShowBibleLoader/index.ts`)

`MohoShowBibleLoader.load(showBiblePath)` возвращает `LoadedMohoShowBible`:

- читает `moho_show_bible.json` по указанному пути;
- резолвит и валидирует все 5 referenced документов по `*Ref` полям;
- проверяет `allowedRigTypes` против `characterBible.rigType` каждого персонажа (fail-closed);
- проверяет, что каждый `characterBibles[i].ref` указывает на существующий файл и валидную character bible;
- собирает `crossRefs` (characterIds, allowedRigTypes, shotSizes, cameraMoves, emotions, gestures);
- считает детерминированный SHA-256 `fingerprint` от канонизированного JSON-сериализованного бандла;
- гоняет пути через `HarmonyError` и root-проверки (путь обязан лежать внутри `allowedRoots`).

### MCP-инструменты (`src/tools/mohoShowBibleTools.ts`)

| Tool                              | Назначение                                                                                  |
| :-------------------------------- | :------------------------------------------------------------------------------------------ |
| `moho.show_bible.load`            | Полный пакет: `mohoShowBible`, `characterBibles`, `cameraRules`, `motionGrammar`, `palette`, `qaThresholds`, `crossRefs`, `fingerprint` |
| `moho.show_bible.validate`        | Быстрая проверка без возврата тел документов; статус `valid`/`invalid` + список ошибок      |
| `moho.show_bible.fingerprint`     | Только SHA-256 fingerprint канонизированного бандла (64 hex)                                |
| `moho.show_bible.get_cross_refs`  | Cross-references для нижестоящих компиляторов (ShotPlan, CommandPlan)                       |
| `moho.show_bible.list_allowed_rig_types` | Список разрешённых типов ригов из show bible                                          |

Все пять инструментов используют один общий `MohoShowBibleLoader` (singleton в модуле).

### Образцовый бандл (`examples/moho_show_bible/`)

Полный набор из 6 валидных JSON + одна `asset_license.json`:

- `moho_show_bible.json`
- `character_bible.json`
- `character_speaker.json` (второй персонаж для проверки multi-character)
- `camera_rules.json`
- `motion_grammar.json`
- `palette.json`
- `qa_thresholds.json`
- `asset_license.json` (exclusive commercial assignment, без NC/CC-BY-SA)

Используется как reference implementation и как fixture для локальных проверок вне Jest.

### Документация

- раздел про Moho Show Bible в `docs/SHOW_BIBLE.md` (если отсутствует — добавить в Sprint 2);
- JSDoc на каждой схеме с примерами;
- usage examples в `src/tools/mohoShowBibleTools.ts` (описание каждого tool).

## Фактические проверки 2026-08-30

```text
npm run build                                    PASS
npm test -- --runInBand                          PASS (полный прогон без регрессий)
npx jest tests/mohoShowBibleSchema               PASS: 40 it()
npx jest tests/mohoShowBibleLoader               PASS: 8 it()
npx jest tests/mohoShowBibleDeterminism          PASS: 7 it()
npx jest tests/mohoCrossReferenceGating          PASS: 7 it()  (rigType gating + license gating)
npx jest tests/mohoQaThresholdsGate              PASS: 28 it()
```

Все 5 Sprint 1 test-файлов зелёные. Детерминизм проверен: один и тот же бандл на диске даёт одинаковый `fingerprint` после перезаписи с разной индентацией и после ремаппинга `colourId` в обратном порядке (допустимо, поскольку `colourId` сравниваются по identity, а не по порядку). Лицензия валидируется через `exclusive commercial assignment` без NC и без CC-BY-SA.

`crossReferenceShotManifest` (Sprint 1.6) reject-ит:

- `shotSize` не из allow-list `cameraRules`;
- `cameraMove` не из allow-list;
- `emotion` не из allow-list `motionGrammar`;
- `characterId` не из `characterBibles`;
- `rigType` персонажа не входит в `allowedRigTypes` show bible.

## Что НЕ реализовано (честно)

- **Живой Moho не использовался.** Это by design: Sprint 1 — чистый data-layer для словаря. Реальная компиляция `.moho` запланирована на Sprint 3+ через `MohoCommandPlan` bridge.
- **LLM-adapter** к show bible не подключён. Loader работает с уже одобренными JSON.
- **Migrations между schemaVersion** не описаны (текущая поддержка — только major 1).
- **Hot reload** бандла без перезапуска процесса — нет; `load()` всегда читает с диска.

## Открытые вопросы

1. **rigType gating edge cases** — что делать, если в `characterBibles` есть персонаж с `rigType` не из `allowedRigTypes`:
     - сейчас — hard reject на этапе `load()` (правильное fail-closed поведение);
     - вопрос: должен ли loader возвращать warning-only режим для preview/test? На данный момент — нет, чтобы не маскировать нарушения.
2. **License gating** — `exclusive commercial assignment` принимается, `CC BY-SA` отвергается. Нужно ли явно reject-ить `CC BY` без атрибуции, или достаточно warning-а когда `redistributionAllowed=false`?
3. **`mohoColourIndex` collisions** — две колора с одинаковым `mohoColourIndex` в одной палитре. Сейчас Zod это пропускает; нужен явный refinement `superRefine`.
4. **`characterBibles[i].ref` — relative vs absolute** — текущий loader принимает только absolute paths или пути внутри `allowedRoots`. Вопрос: нужно ли поддержать file:// URI или http(s)://?
5. **Provenance.notes** — optional, нигде не валидируется. Возможно, стоит требовать для non-trivial ригов.
6. **`forbiddenSources` enforcement** — поле объявлено в show bible, но ни один loader-уровень его не читает. Реализовать в Sprint 2 или позже?

## Следующий спринт — Sprint 2: PerformancePIR → MohoCommandPlan bridge

Фокус:

- скомпилировать `PerformancePIR` (Stage 5) против загруженного Moho Show Bible с cross-reference gating;
- сгенерировать `MohoCommandPlan` (whitelist операций: `create_palette`, `create_drawing`, `create_bone`, `set_transform_keyframe`, `smart_bone_dial`, `apply_motion_grammar`) с обязательной проверкой каждого op против `crossRefs`;
- fail-closed: любой op вне allow-list → reject, никаких best-effort fallback;
- integration test на реальном bundle из `examples/moho_show_bible/` + fake PerformancePIR;
- документация: `docs/PERFORMANCE_PIR_TO_COMMAND_PLAN.md` с диаграммой потока.

Success criteria Sprint 2:

- [ ] `compilePerformancePirToCommandPlan(pir, showBible)` возвращает Zod-валидный `MohoCommandPlan`;
- [ ] любой op вне allow-list → typed error + номер op + причина;
- [ ] fingerprint исходного бандла == fingerprint в `MohoCommandPlan.provenance.bundleFingerprint`;
- [ ] ≥ 20 unit-тестов + 1 integration test;
- [ ] `docs/PERFORMANCE_PIR_TO_COMMAND_PLAN.md` опубликован.

## Изменённые файлы Sprint 1

- `src/schemas/mohoShowBible.ts`
- `src/schemas/mohoCharacterBible.ts`
- `src/schemas/mohoCameraRules.ts`
- `src/schemas/mohoMotionGrammar.ts`
- `src/schemas/mohoPaletteManifest.ts`
- `src/schemas/mohoQaThresholds.ts`
- `src/services/mohoShowBibleLoader/index.ts`
- `src/tools/mohoShowBibleTools.ts`
- `examples/moho_show_bible/*.json` (8 файлов)
- `tests/mohoShowBibleSchema.test.ts`
- `tests/mohoShowBibleLoader.test.ts`
- `tests/mohoShowBibleDeterminism.test.ts`
- `tests/mohoCrossReferenceGating.test.ts`
- `tests/mohoQaThresholdsGate.test.ts`
- `tests/fixtures/mohoShowBible.valid.ts`

---

# История (предыдущие checkpoints)

Ниже — компактная сводка предыдущих итераций. Полный текст до этого изменения сохранён в `_archive/CHECKPOINT.pre-sprint1.md`.

## Iteration 10 — COMPLETED (Studio Intelligence)

Studio profiles (`studio_standard` / `studio_highend` / `studio_tv_series`), `TasteModelConfig` (foundation), `EpisodeCompilerConfig` (foundation). Использует 7 tools из Iteration 9 + studio profiler integration. `npm run build` PASS, `npm test` 278 passed / 6 skipped.

## Iteration 9 — COMPLETED (Learning from Corrections)

`ArtistCorrectionEngine`: recordCorrection, recordPreference, detectChanges, previewPropagation, lock/unlock/revert, exportDataset (JSONL/JSON, privacy levels). 7 новых MCP tools. Zod: `src/schemas/artistCorrection.ts`. `npm test` 278 passed / 6 skipped.

## Iteration 8 — COMPLETED (Harmony Native Build)

`HarmonyManifestV3Compiler`, `HarmonyCommandPlanV3Generator` (30 whitelist ops), `PortableIntegrationPackageGenerator`. 2 tools: `harmony.ai_studio.generate_editable_scene`, `harmony.ai_studio.apply_manifest_to_harmony`. Python bridge: `execute_command_plan_v3`, `audit_reconstruction_scene`. 19 unit-тестов в `tests/harmonyNativeBuild.test.ts`. Demo: `node scripts/demo_ai_studio_iter8.js`. Honest: rule-based, no ML, no Harmony applied, simulated audit.

## Iteration 7 — COMPLETED (Animation Critic & Variant Tournament)

`AnimationCritic` (13 technical + 16 artistic checks, scoring 60/40). `VariantTournament` (4 rounds: Technical Gate → Artistic Ranking → Refinement → Final Selection). 2 tools: `critique_variant`, `run_variant_tournament`. 20 unit-тестов в `tests/criticTournament.test.ts`. Demo: `node scripts/demo_ai_studio_iter7.js`. `npm test` 259 passed / 6 skipped.

## Iteration 6 — COMPLETED (Camera & Layout)

`CameraLayoutDirector` (rule-based): shot planning, shot size selection, camera movement, camera track с keyframes, blocking plans, framing rules, eyelines, safe margins, continuity. 1 tool: `harmony.ai_studio.generate_camera_plan`. 13 unit-тестов в `tests/cameraLayout.test.ts`. `npm test` 239 passed / 6 skipped.

## Iteration 5 — COMPLETED (Part Decomposition & Hybrid Routing)

`CharacterPartDecomposer` (22 humanoid части, motion clusters, occlusion graph). `RepresentationRouterV3` (Peg/Curve/Envelope/Bone/DrawingSubstitution/Frame-by-frame Vector). 2 tools: `decompose_character_parts`, `route_representations`. 22 unit-теста в `tests/partDecomposition.test.ts`. Demo: `npm run demo:ai_studio_iter5`. `npm test` 226 passed / 6 skipped.

## Iteration 4 — COMPLETED (Key Poses & Motion)

`KeyPoseGenerator` (anticipation / extreme / overshoot / settle / hold), `MotionSynthesizer` (linear / ease-in / ease-out / overshoot / settle, RDP keyframe reduction). 2 tools: `harmony.ai_studio.generate_key_poses`, `harmony.ai_studio.synthesize_motion`. Demo: `npm run demo:ai_studio_iter4` (Masha, 36× compression с нулевой ошибкой).

## Iteration 3 — COMPLETED (Digital Actor Registry)

`DigitalActorRegistry` (импорт PSD/SVG/PNG/Harmony template/scene/manifest). Validation: missing views (8 ракурсов), conflicting palette IDs, invalid hierarchy, missing pivots, incomplete substitutions. 1 tool: `harmony.ai_studio.build_digital_actor`. 8 unit-тестов в `tests/digitalActor.test.ts`. Demo: `npm run demo:ai_studio_iter3`.

## Phase 1 — Foundation acceptance

MCP control plane с namespace `harmony.factory.*`, durable SQLite jobs / DAG / checkpoints / cancel, model/dataset registry, content-addressed artifact store с SHA-256, token RBAC, job metrics. Реальный vertical slice: MP4 + WAV → OpenCV observation → retargeting → 24 SVG preview. 26 проверенных артефактов, полный provenance. `npm run demo:factory:phase1`. Jest 21/21 suites, 187/193 tests, 6 Harmony skipped; Python 33/34 (1 skipped).

## Iteration 2 — Voice & Performance

`VoicePerformanceAnalyzer` (PCM/float WAV без внешних сервисов, RMS energy, pitch, паузы). `PerformanceGenerator` (restrained / energetic / sarcastic / anxious / aggressive / comedic / custom). 3 tools: `analyze_voice`, `generate_performances`, `mix_performance`. Demo: `npm run demo:ai_studio_iter2`. `tests/voicePerformance.test.ts` 9/9.

## Iteration 1 — Scene Intelligence

`SceneUnderstandingEngine.analyze()` + `ScriptDirector.generateVariants()`. 2 tools: `harmony.ai_studio.analyze_scene`, `harmony.ai_studio.generate_director_variants`. `tests/sceneIntelligence.test.ts`. Demo: `npm run demo:ai_studio_iter1`. Scene intent = reveal, 3 variants (restrained_dialogue / commercial_dynamic / dramatic_closeup).

---

# Frame-by-frame vector: real Harmony gate (pre-sprint snapshot)

Предыдущая запись от 2026-07-12 зафиксировала fail-closed вертикальный путь `frame_by_frame_vector`:

- Drawing Element с TVG/SCAN форматом и ожидаемым числом уникальных drawings;
- Colour Art с непустыми vector strokes, привязанными к палитре;
- exposures покрывают полный range и совпадают с mapping;
- READ → Composite → Display → Write с проверенными связями;
- после `save_all()` сцена открывается отдельным процессом, audit использует свежие DOM-объекты;
- preview — настоящий PNG, `reconstruction_core` считает mean colour error, edge error и SSIM.

Bundle `/Applications/Toon Boom Harmony 25 Premium/Harmony 25 Premium.app` v25.0.0.23967 (x86_64) найден, но подписан `Authority=Novo Generacion Team`, без `TeamIdentifier`; `spctl` возвращает `a sealed resource is missing or invalid`. Gatekeeper-проверка fail-closed, Python-пакеты не загружались. Реальная integration acceptance не выполнена и не считается результатом. Статус заморожен до замены bundle на официально подписанную сборку.

Подробный текст этой записи (с командами продолжения, environment variables, изменёнными файлами) сохранён в `_archive/CHECKPOINT.pre-sprint1.md` для исторической полноты.