# Moho AI Factory v2

Этот документ — практический справочник по **Moho AI Factory v2**: пакету
детерминированных компиляторов и MCP-инструментов, который превращает
зафиксированный «один шоу» в реальные `.moho`-сцены. Moho AI Factory — это
тот же конвейер, что описан в [ROADMAP.md](../../ROADMAP.md) и
[AI_ANIMATION_FACTORY_ARCHITECTURE.md](../../AI_ANIMATION_FACTORY_ARCHITECTURE.md),
адаптированный под Moho Pro 14 и сжатый до серии из семи спринтов.

## Цель документа

Зафиксировать:

1. Состав семейства **ShowBible** из шести JSON-документов и где они живут на
   диске.
2. Канонический конвейер от сценария до рендера и его ASCII-диаграмму.
3. Четыре reference rig-типа, которые компилятор умеет строить.
4. Статус по семи спринтам (Sprint 1 завершён, 2–7 в плане).
5. Пять свеже-добавленных MCP-инструментов `moho.show_bible.*`.
6. Acceptance gates, без которых релиз спринта не считается.
7. Команду запуска golden-path теста `npm run test:moho_factory`.

Все ссылки на исходные документы — `ROADMAP.md`,
`AI_ANIMATION_FACTORY_ARCHITECTURE.md`, `CHECKPOINT.md` и файлы в
`docs/rig_standard/`.

---

## ShowBible family

Moho AI Factory v2 наследует дисциплину ShowBible из [ROADMAP.md](../../ROADMAP.md):
LLM имеет право принимать директорские решения **только внутри объявленного
словаря**. Всё, что не объявлено — это жёсткий QA-reject, а не догадка.

Семейство состоит из шести машиночитаемых JSON-документов. Корневой документ
ссылается на пять дочерних по относительным путям; loader каскадно открывает
и валидирует каждый из них (`src/services/mohoShowBibleLoader/index.ts`).

### 1. `moho_show_bible.json` — top-level lock

Корневой документ сериала. Содержит `schemaVersion: "1.0"`, `showId`,
`title`, `logLine`, `fps`, `resolution`, `visualStyle`, `lineRules`,
`lighting`, `allowedDeformations`, `allowedRigTypes`, `characterBibles[]`
(только ссылки), ссылки на пять остальных JSON-ов и блок `provenance` с
именем approver-а и ISO-таймстампом.

Схема: `src/schemas/mohoShowBible.ts` → `mohoShowBibleSchema`.

Минимальный пример:

```json
{
  "schemaVersion": "1.0",
  "showId": "polygon_show_v1",
  "title": "Polygon Show",
  "logLine": "Two friends in flat-shaded poly-land, learning to listen.",
  "fps": 24,
  "resolution": { "width": 1920, "height": 1080 },
  "visualStyle": "flat polygons, soft rim light, 24fps TV-safe",
  "lineRules": {
    "defaultThicknessPt": 2.0,
    "lineColourId": "ink_900",
    "fillColourId": "paper_50"
  },
  "lighting": {
    "type": "soft_top_left",
    "shadowColourId": "shadow_30"
  },
  "allowedDeformations": [
    "peg_transform",
    "curve_deformer",
    "bone_deformer",
    "frame_by_frame_vector",
    "mesh_warp"
  ],
  "allowedRigTypes": ["humanoid_2leg", "quadruped"],
  "characterBibles": [
    { "characterId": "masha",   "ref": "characters/masha.json" },
    { "characterId": "ivan",    "ref": "characters/ivan.json" }
  ],
  "paletteManifestRef": "palette.json",
  "cameraRulesRef":     "camera_rules.json",
  "motionGrammarRef":   "motion_grammar.json",
  "qaThresholdsRef":    "qa_thresholds.json",
  "forbiddenSources": ["third_party_series_xyz"],
  "provenance": {
    "approver": "studio_lead@example.com",
    "approvedAt": "2026-08-30T12:00:00.000Z",
    "notes": "Initial freeze for v2 sprint 1."
  }
}
```

`mohoShowBibleLoader` на загрузке проверяет:

- все `characterBibles[].ref` и пять одиночных ссылок разрешимы относительно
  каталога, в котором лежит `moho_show_bible.json`;
- каждый `characterId` ссылается на существующий файл и Zod-валиден;
- `lineRules.lineColourId`, `lineRules.fillColourId`,
  `lighting.shadowColourId` присутствуют в `palette.json`;
- `character_bible[*].rigType` входит в `allowedRigTypes`;
- лицензии всех ассетов проходят проверку `forbiddenSources`.

### 2. `character_<id>.json` — per-character bible

Один файл на каждого персонажа сериала. Содержит `characterId`, `rigType`
(один из четырёх reference-типов), `turnaroundViews`, `controllerMap` со
стабильными `controllerId` (например `head_yaw`, `mouth_open`,
`brow_raise_l`), `mouthShapes[]` (обычно канон Moho `A B C D E … TH Closed`,
см. `docs/rig_standard/MOUTH_AND_FACE_STANDARD_V1.md`), `expressions[]`,
`gestureLibraryRef`, `pivots`, `substitutions`.

`controllerMap` — самая важная часть: каждое последующее движение
ссылается на `controllerId`, а не на конкретную кость. Это позволяет
`MotionValueResolver` детерминированно мапить ключевые позы в реальные
трансформации Moho независимо от внутренней нумерации костей.

### 3. `palette.json` — зафиксированная палитра

Запертые цвета сериала. У каждого цвета стабильный `colourId`
(например `ink_900`, `paper_50`, `shadow_30`) и 8-значное RGBA-значение.
Любой стиль, заливка, обводка и тень в проекте обязаны ссылаться на
`colourId`, а не на сырое значение.

`mohoShowBibleLoader.assertPaletteRefs()` падает на загрузке, если
`lineColourId` / `fillColourId` / `shadowColourId` корневого документа
отсутствуют в палитре. Это удерживает рендер в рамках визуального стиля.

### 4. `camera_rules.json` — правила камеры

Разрешённые `shotSize` (close_up, medium_shot, full_shot, two_shot,
over_the_shoulder, …), разрешённые `cameraMove` (static, pan_right,
pan_left, dolly_in, dolly_out, tilt_up, tilt_down, hold), безопасные
границы кадра и список **запрещённых** движений. ShotManifestCompiler
отвергает любой `ShotManifest`, в котором `shotSize` или `cameraMove` не
входит в этот словарь.

### 5. `motion_grammar.json` — словарь движений

Разрешённые жесты, эмоции и ссылки на pose-библиотеки
(`gestureLibraryRef`), а также правила тайминга (например,
`minHoldFrames: 4`, `maxAnticipationFrames: 12`,
`overshootCurve: "ease_out"`). Используется `MotionValueResolver`-ом при
расстановке ключей между `anticipation → extreme → overshoot → settle →
hold`.

### 6. `qa_thresholds.json` — численные QA-гейты

Числовые пороги, по которым Retake Engine решает, проходит ли сцена
приёмочный контроль. Например: `silhouetteCoverage.min: 0.85`,
`edgeLeak.maxPx: 1.5`, `keyframeReduction.maxErrorPx: 0.4`,
`temporalStability.maxFlicker: 0.05`. Документ иммутабелен до
следующего `provenance.approvedAt`.

### 7. `asset_license.json` — юридический гейт

Сам по себе файл не входит в каскад из шести, но для каждого ассета
(риг, палитра, библиотека жестов, фоновый PSD) обязателен
`sibling-asset_license.json` со структурой, описанной в
[ROADMAP.md](../../ROADMAP.md) § «Asset licensing». Loader вызывает
`assertLicenseAllowed(license, forbiddenSources)` и отказывается
открывать сериал, если в нём есть NC-лицензия или источник из
`forbiddenSources`.

```json
{
  "assetId": "character_masha_rig_v1",
  "creator": "Anna Petrov",
  "source": "commission",
  "license": "exclusive commercial assignment",
  "commercialUse": true,
  "modificationAllowed": true,
  "datasetUseAllowed": true,
  "redistributionAllowed": false,
  "contractPath": "legal/contracts/rig_masha.pdf"
}
```

---

## Pipeline

Конвейер — точная копия дисциплины из
[ROADMAP.md](../../ROADMAP.md) § «The factory pipeline», но переписанная
на Moho-цепочку: реальный `.moho` вместо `.xstage`, и `MohoCommandPlan`
вместо Harmony V4.

```text
script.md (Markdown или JSON)
   │
   ▼
ShotManifest            — LLM-директор, ограниченный ShowBible
   │                     crossReferenceShotManifest() гейтит словарь
   ▼
PerformancePIR          — MohoShotManifestCompiler, deterministic
   │                     SHA-256 fingerprint = performanceId
   ▼
MohoCommandPlan         — whitelist операций Moho Python DOM
   │                     (create_bone_layer, create_bone, create_smart_bone,
   │                      add_action, set_keyframe, link_parent, …)
   ▼
editable .moho scene    — реальный файл, открывается в Moho Pro 14
   │
   ▼
render + QA             — Moho native render → PNG signature →
   │                     reconstruction-core metrics →
   │                     Retake Engine (qa_thresholds.json)
   ▼
Action Recorder         — before/after + retake notes → dataset
```

Шесть ключевых инвариантов конвейера (наследуются из
[ROADMAP.md](../../ROADMAP.md)):

- LLM не генерирует ничего, что не объявлено в ShowBible;
- один и тот же `(ShotManifest, ShowBible)` даёт один и тот же
  `performanceId` (SHA-256);
- `MohoCommandPlan` состоит только из whitelist-операций;
- результат — настоящий `.moho`, который открывается в Moho Pro 14;
- render-comparison считает per-frame mean colour error, edge error и
  простой SSIM;
- любой `NC`-ассет или источник из `forbiddenSources` останавливает
  loader ещё до компиляции.

---

## Reference rigs

`moho_show_bible.allowedRigTypes` обязан быть одним из четырёх типов;
любой другой риг loader отвергнет на этапе `assertRigTypeRefs`. Шаблоны
для каждого типа лежат в `pipeline/moho/templates/` и
`docs/rig_standard/`.

| Тип               | Назначение                          | Ключевые контроллеры                                                                                 | Стандарт                              |
|-------------------|-------------------------------------|------------------------------------------------------------------------------------------------------|---------------------------------------|
| `humanoid_2leg`   | Главный герой, диалоги, эмоции      | `head_yaw/pitch/roll`, `torso_yaw`, `brow_*`, `mouth_*`, `l_shoulder/r_shoulder`, `l_hip/r_hip`        | `MOHO_RIG_MODULE_LIBRARY_V1.md`        |
| `quadruped`       | Животные-компаньоны, фоновые звери  | `spine_root`, `neck_yaw`, `tail_base/tip`, `l_front/r_front`, `l_back/r_back`                         | `MOHO_REFERENCE_RIG_DATABASE_V1.md`    |
| `creature`        | Стилизованные существа, монстры     | `core_bend`, `l_tentacle_a/b`, `r_tentacle_a/b`, `mouth_open`, `eye_l/eye_r`                          | `MOHO_RIG_DECISION_RULES_V1.md`        |
| `mechanical`      | Роботы, машины, оснастка            | `body_pitch/yaw/roll`, `armor_plate_*`, `antenna_*`, `light_*`, `wheel_l/wheel_r`                     | `MOHO_PRODUCTION_RIG_STANDARD_V1.md`   |

Правила, общие для всех четырёх типов, перечислены в
`docs/rig_standard/MOHO_RIG_QA_STANDARD_V1.md`. Решение, какой шаблон
применить к конкретному персонажу, принимается по полной карточке из
`MOHO_RIG_DECISION_RULES_V1.md`.

---

## Статус по спринтам

План рассчитан на семь спринтов; Sprint 1 уже закрыт, 2–7 — в плане.
Детальный лог текущего состояния см. в [CHECKPOINT.md](../../CHECKPOINT.md).

### Sprint 1 — DONE: ShowBible family + loader + MCP tools

- Схема `moho_show_bible.json` (`src/schemas/mohoShowBible.ts`) с
  `schemaVersion: "1.0"`, перечислением `allowedDeformations` и
  `allowedRigTypes` из четырёх значений.
- Шесть Zod-схем: `mohoShowBible`, `characterBible`, `cameraRules`,
  `motionGrammar`, `paletteManifest`, `qaThresholds`.
- Каскадный loader `MohoShowBibleLoader`
  (`src/services/mohoShowBibleLoader/index.ts`) с проверками
  `assertPaletteRefs`, `assertRigTypeRefs`, `assertLicenseAllowed`.
- Пять MCP-инструментов `moho.show_bible.*` (см. следующий раздел).
- Детерминированный SHA-256 fingerprint канонизированного бандла.
- Unit-тесты loader-а и схем зелёные в локальном прогоне.

### Sprint 2 — PLAN: ShotManifest → PerformancePIR (Moho compiler)

- `MohoShotManifestCompiler` — детерминированная компиляция
  `ShotManifest` в `PerformancePIR` с `beatFrameMap` и стабильным
  `performanceId = SHA-256(manifest)`.
- Гейтинг словаря через `crossReferenceShotManifest()` —
  отвергать неизвестные shot sizes / camera moves / emotions /
  characters.
- Тест на стабильность `performanceId` (1000 итераций → один и тот же
  fingerprint).

### Sprint 3 — PLAN: Moho CommandPlan + whitelist operations

- Zod-схема `MohoCommandPlan` со whitelist-операциями для Moho Python
  DOM (`create_bone_layer`, `create_bone`, `create_smart_bone`,
  `add_action`, `set_keyframe`, `link_parent`, `set_mouth_shape`).
- Генератор `MohoCommandPlanGenerator` из `PerformancePIR`.
- Rollback plan: `restore_snapshot` + обязательное `save_as` до
  применения.

### Sprint 4 — PLAN: Reference rigs (4 типа)

- Импорт четырёх reference-ригов (`humanoid_2leg`, `quadruped`,
  `creature`, `mechanical`) из `docs/rig_standard/` в
  `pipeline/moho/templates/`.
- Привязка `controllerMap` каждого типа к стабильным `controllerId`.
- Acceptance: открыть каждый шаблон в реальной Moho Pro 14,
  прокрутить turnaround, сохранить, переоткрыть.

### Sprint 5 — PLAN: Retake Engine + Action Recorder

- `RetakeEngine` против `qa_thresholds.json`: `silhouetteCoverage`,
  `edgeLeak`, `keyframeReduction`, `temporalStability`.
- `ActionRecorder` записывает до/после + retake notes → JSONL-датасет.
- Acceptance: на синтетическом шоте движок даёт устойчивое «PASS» за
  ≤3 итерации.

### Sprint 6 — PLAN: End-to-end golden path на реальной Moho

- Скрипт `npm run test:moho_factory` запускает полный pipeline от
  `script.md` до отрендеренного PNG на машине с лицензированной Moho.
- Гейт: `realSceneCreated: true`, `editableNativeDrawings: true`,
  `reopenedFromDisk: true`, реальные `previewPaths`,
  `renderComparison` (см. чек-лист из
  [CHECKPOINT.md](../../CHECKPOINT.md)).

### Sprint 7 — PLAN: Studio integration + autonomy ramp

- Профили студии (см. Iteration 10 в
  [CHECKPOINT.md](../../CHECKPOINT.md)) — `studio_standard`,
  `studio_highend`, `studio_tv_series` — применимы к
  `moho_show_bible.allowedDeformations` и `palette.json`.
- Artist Correction Engine + pairwise preferences для taste-model.
- Autonomy ramp по [ROADMAP.md](../../ROADMAP.md) § «Autonomy ramp»:
  цель ≥ 90–95 % шотов без ручной правки Harmony/Moho.

---

## MCP tools

В Sprint 1 добавлено пять инструментов в namespace `moho.show_bible.*`.
Реализация — `src/tools/mohoShowBibleTools.ts`; loader используется
общий, `MohoShowBibleLoader`.

| Tool                                          | Назначение                                                                                                           |
|-----------------------------------------------|------------------------------------------------------------------------------------------------------|
| `moho.show_bible.load`                        | Загрузить шесть документов с диска, провалидировать все ссылки и вернуть полный объединённый пакет.      |
| `moho.show_bible.validate`                    | Быстрая проверка словаря. Возвращает `valid` + SHA-256 fingerprint или `invalid` + список ошибок Zod.   |
| `moho.show_bible.fingerprint`                 | Посчитать детерминированный SHA-256 fingerprint канонизированного бандла (64 hex).                      |
| `moho.show_bible.get_cross_refs`              | Получить `crossRefs`: `characterIds`, `allowedRigTypes`, разрешённые shot sizes / camera moves / emotions / gestures. |
| `moho.show_bible.list_allowed_rig_types`      | Вернуть `allowedRigTypes` (подмножество `humanoid_2leg / quadruped / creature / mechanical`).          |

Пример вызова `moho.show_bible.load`:

```json
{
  "name": "moho.show_bible.load",
  "arguments": {
    "showBiblePath": "fixtures/show_bible/moho_polygon_v1/moho_show_bible.json"
  }
}
```

Успешный ответ — `{ status: "success", loaded: { mohoShowBible, characterBibles, cameraRules, motionGrammar, paletteManifest, qaThresholds, crossRefs, fingerprint } }`.
При ошибке валидации — `{ status: "error", code: "MOHO_SHOW_BIBLE_LOAD_FAILED", message: "..." }`.

---

## Acceptance gates

Спринт считается завершённым только когда выполнены **все** gates ниже.
Частичное выполнение не допускается — это сознательное ограничение из
[CHECKPOINT.md](../../CHECKPOINT.md) и из правила
«никакого mock-success» в
`docs/superpowers/specs/2026-08-29-autonomous-moho-rigger-animator-design.md`.

1. **Схемы зелёные** — `npm run build` PASS, все Zod-схемы валидны на
   минимальных примерах из этого документа.
2. **Loader зелёный** — unit-тесты на
   `assertPaletteRefs`, `assertRigTypeRefs`, `assertLicenseAllowed`
   падают на негативных кейсах и проходят на позитивных.
3. **Fingerprint стабилен** — один и тот же набор JSON-ов даёт один и
   тот же SHA-256 после 1000 перезагрузок.
4. **MCP-инструменты зарегистрированы** — пять `moho.show_bible.*`
   инструментов появляются в реестре MCP и проходят smoke-вызов на
   минимальном фикстуре.
5. **Спринт 6+** — реальный `.moho` открывается в Moho Pro 14,
   сохраняется, переоткрывается без потерь; preview render — настоящий
   PNG нужного размера; reconstruction-core метрики (mean colour error,
   edge error, простой SSIM) считаются на каждом кадре.
6. **Лицензия чистая** — ни один ассет в `assets/` не имеет
   `license: NC*` и не входит в `moho_show_bible.forbiddenSources`.

---

## Как запустить golden-path

После того как Sprint 6 будет завершён и зафиксирован в
[CHECKPOINT.md](../../CHECKPOINT.md), golden-path тест будет запускаться
одной командой:

```bash
npm run test:moho_factory
```

До Sprint 6 команда зарезервирована, но не зарегистрирована в
`package.json`. На текущем этапе (Sprint 1) можно вручную проверить
пять MCP-инструментов и loader:

```bash
# 1. Сборка и unit-тесты
npm run build
npx jest tests/mohoShowBible --runInBand

# 2. Smoke-вызов loader через CLI-обёртку
node scripts/demo_moho_show_bible_loader.js
```

После Sprint 2 команда `npm run test:moho_factory` будет гонять полный
конвейер `script → ShotManifest → PerformancePIR → Moho CommandPlan →
.moho → render → QA → Action Recorder` и падать при любом отклонении от
Acceptance gates выше.