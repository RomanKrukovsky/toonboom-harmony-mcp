# Moho AI Factory v2 — Sprint 2 Consolidated README

Этот документ — сводный практический справочник по релизу **Moho AI Factory v2**:
детерминированному конвейеру от `ShotManifest` до `MohoCommandPlan`,
готового к эмиссии через `MohoLuaEmitter` (`src/services/mohoLuaEmitter/index.ts`).

Документ наследует архитектурные контракты [MOHO_FACTORY.md](./MOHO_FACTORY.md)
(Sprint 1 — ShowBible + loader) и расширяет их четырьмя новыми сервисами:

- **PerformancePIR Compiler** — `ShotManifest → MohoPerformancePIR`
- **CommandBuilder** — `MohoPerformancePIR → MohoCommandPlan`
- **Reference Rig Templates** — четыре готовых риг-шаблона под `MohoCommandPlan`
- **RetargetingResolver (Moho branch)** — мост между landmark-трекингом и bone keys

---

## 1. Что нового в v2

Sprint 2 заменяет «нейтральное HOLD-значение» Sprint 1 на полную bone-space
цепочку: каждый beat манифеста превращается в конкретные `boneKeys`,
`switchKeys`, `smartBoneActions` с собственным SHA-256 fingerprint.

| Компонент | Файл | Что даёт |
|-----------|------|----------|
| `MohoPerformancePirCompiler` | `src/services/mohoPerformancePirCompiler/index.ts` | Детерминированная компиляция `ShotManifest` + `MohoCharacterBible` → `MohoPerformancePIR`. Fail-closed при `unknown_rig_type`. |
| `MohoCommandBuilder` | `src/services/mohoCommandBuilder/index.ts` | Декларативная сборка `MohoCommandPlan[]` из PIR + bible. Все операции — whitelist v1. |
| `mohoReferenceRigTemplates` | `src/services/mohoReferenceRigTemplates/index.ts` | Четыре готовых рига (`humanoid_2leg`, `quadruped`, `creature`, `mechanical`) с костями, switch layers, smart bones, mesh layers, vitruvian groups и projected shadow. |
| `MohoRetargetingResolver` (branch) | `src/services/retargetingResolver/mohoBranch.ts` | Маппинг landmark-трекинга (4 rig types) → `boneKeys[]` с учётом `controllerRange` и bone constraints. |

Главное свойство: **тот же вход → тот же SHA-256 на выходе** на каждом этапе.
Это даёт воспроизводимый golden-path, безопасный re-run и честный QA.

---

## 2. Pipeline v2

```text
script.md (Markdown / JSON)
    │
    ▼
ShotManifest               ─ LLM-директор, ограниченный ShowBible
    │                        crossReferenceShotManifest() гейтит словарь
    ▼
PerformancePIR Compiler   ─ src/services/mohoPerformancePirCompiler
    │                        boneKeys / switchKeys / smartBoneActions /
    │                        cameraKeys / fxKeys
    ▼
MohoPerformancePIR        ─ bone-space представление шота
    │                        performanceId = "MOHO-" + sha256:16
    │
    ├──► RetargetingResolver.mohoBranch (опц.)
    │        landmarks → boneKeys
    │
    ▼
MohoCommandBuilder         ─ src/services/mohoCommandBuilder
    │                        детерминированная сортировка операций:
    │                        skeleton → switches → smart bones → keys → verify → save
    ▼
MohoCommandPlan            ─ whitelist-only операции Moho Python DOM
    │                        planId = "MOHO-" + sha256:16
    │                        sourceManifestSha256 = fingerprint(PIR + bible)
    ▼
MohoLuaEmitter             ─ идемпотентный Lua-скрипт
    ▼
real .moho scene           ─ Moho Pro 14 (Sprint 3)
```

ASCII-вариант для быстрого чтения:

```
ShotManifest ─► PerformancePIR Compiler ─► MohoPerformancePIR
                                                  │
                                  ┌───────────────┼───────────────┐
                                  ▼               ▼               ▼
                          CommandBuilder   RetargetingResolver   ReferenceRig
                                  │               │               │
                                  ▼               │               │
                          MohoCommandPlan ◄───────┘               │
                                  │                               │
                                  ▼                               ▼
                          MohoLuaEmitter                  Build-from-Template
                                  │                               │
                                  └──────────► real .moho ◄───────┘
```

---

## 3. Reference Rigs

Все четыре шаблона экспортируются из
`src/services/mohoReferenceRigTemplates/index.ts` и доступны через
`getReferenceRigTemplate(rigType)` и `buildRigFromTemplate(template, bible)`.

| rigType | templateId | Bones | Switch layers | Smart bones | Mouth shapes | Notes |
|---------|------------|-------|---------------|-------------|--------------|-------|
| `humanoid_2leg` | `ref.humanoid.v1` | **19** | 2 (`Mouth`, `Eye`) | 4 | 12 (Preston-Blair) | Root → Pelvis → Spine → Chest → Neck → Head; dual arms (Shoulder → Elbow → Wrist); dual legs (Hip → Knee → Ankle); Jaw |
| `quadruped` | `ref.quadruped.v1` | **23** | 3 (`Mouth`, `Eye`, `Tail_Pose`) | 4 | 12 (Preston-Blair) | Root → Spine_Bse → Spine_Mid → Neck → Head/Jaw; 3-segment tail; dual ears; four 3-bone legs (`FL_*`, `FR_*`, `BL_*`, `BR_*`) |
| `creature` | `ref.creature.v1` | **21** | 4 (`Mouth`, `Eye`, `Tentacle_1_Pose`, `Tentacle_2_Pose`) | 3 | 12 (Preston-Blair) | Root → Body_Core → 3-way spine (Top/Mid/Bottom); Head/Eyes/Mouth; 4 трёхсегментных щупальца (`Tentacle_N_Base/Mid/Tip`) |
| `mechanical` | `ref.mechanical.v1` | **20** | 2 (`Eye`, `Mode`) | 4 | 0 (нет рта) | Body → Head → Antenna_Base/Tip; dual 4-bone arms (Shoulder → UpperArm → Forearm → Hand); dual 3-bone legs (Hip → Leg → Foot); Cable_Front/Cable_Back |

Каждый шаблон также несёт:

- **`meshLayers[]`** — `Body_Mesh` с количеством точек (16/24/20/18 для каждого типа);
- **`vitruvianGroups[]`** — логические группы костей для интерфейса Vitruvian;
- **`projectedShadow`** — отдельный слой тени с привязкой к root bone;
- **`fingerprint`** — детерминированный SHA-256 канонизированного шаблона.

`buildRigFromTemplate(template, characterBible)` собирает готовый
`MohoCommandPlan` с порядком операций:

1. `add_bone` + `set_bone_parent` + `set_bone_constraints` для каждой кости;
2. `create_switch_layer` + `add_switch_choice` для каждого switch;
3. `create_smart_bone` + `wire_smart_bone_channel` для каждого smart bone;
4. `create_mesh_layer` + `bind_smart_warp_mesh` для каждого меша;
5. `create_vitruvian_group` + `add_vitruvian_bone` для каждой группы;
6. `create_projected_shadow`;
7. `verify_rig(expect_bones, expect_switches)`;
8. `save_document(documentPath)` — последняя операция.

`planId` для шаблонных планов имеет префикс `REFRIG-` (в отличие от
`MOHO-` у PIR-builder-а), чтобы golden-path тесты могли различать источник.

---

## 4. MCP tools v2

В Sprint 2 добавлено шесть новых MCP-инструментов
(`src/tools/mohoCompilerTools.ts`). Регистрация — рядом с
`moho.show_bible.*` в `src/mcp/server.ts`.

### 4.1. `moho.compiler.*` — PerformancePIR + CommandPlan

| Tool | Назначение |
|------|------------|
| `moho.performance_pir.compile` | Скомпилировать `MohoPerformancePIR` из `ShotManifest` + `MohoCharacterBible` (+ опц. `MohoCameraRules`, `MohoMotionGrammar`, `ShowBibleCrossRefs`). Возвращает `{pir, fingerprint, violations, warnings}`. Fail-closed при `unknown_rig_type`. |
| `moho.performance_pir.fingerprint` | Посчитать детерминированный SHA-256 fingerprint канонизированного PIR (через `fast-json-stable-stringify`). |
| `moho.performance_pir.validate` | Прогнать `MohoPerformancePIR` через `mohoPerformancePirSchema.safeParse` (`schemaVersion: "1.0"`). Возвращает `valid` или `invalid` + список ошибок zod. |
| `moho.command_plan.build` | Скомпилировать `MohoCommandPlan` из `MohoPerformancePIR` + `MohoCharacterBible` (+ опц. `documentPath`). Возвращает `{plan, fingerprint}`. Все операции валидируются `mohoCommandPlanSchema` на этапе сборки. |
| `moho.command_plan.fingerprint` | Посчитать детерминированный SHA-256 fingerprint всего CommandPlan. |
| `moho.command_plan.validate` | Прогнать `MohoCommandPlan` через `mohoCommandPlanSchema.safeParse`. |

### 4.2. `moho.retargeting.*` — landmark → bone keys

Используется `MohoRetargetingResolver` (см. `mohoBranch.ts`) для маппинга
трекинговых landmark-ов в `boneKeys[]`. Возвращает расширенный
`MohoRetargetingResult` с `pir`, `boneBindings`, `warnings`,
`unmappedLandmarks`.

### 4.3. `moho.reference_rig.*` — шаблоны

- `moho.reference_rig.list` — вернуть все 4 шаблона с bone counts;
- `moho.reference_rig.get` — получить шаблон по `rigType`;
- `moho.reference_rig.build_plan` — собрать `MohoCommandPlan` из шаблона +
  `MohoCharacterBible` через `buildRigFromTemplate`.

Все инструменты наследуют контракт **fail-closed** из
`MohoCommandPlan.provenance.compiler = 'MohoRigPlanCompiler v1'`.

Пример вызова:

```json
{
  "name": "moho.performance_pir.compile",
  "arguments": {
    "shotManifest": { "...": "..." },
    "characterBible": { "characterId": "masha", "rigType": "humanoid_2leg", "...": "..." },
    "motionGrammar": { "...": "..." },
    "crossRefs": { "...": "..." }
  }
}
```

Успешный ответ:

```json
{
  "status": "success",
  "pir": { "performanceId": "MOHO-...", "deterministicFingerprint": "sha256:...", "boneKeys": [...], "...": "..." },
  "fingerprint": "sha256:...",
  "violations": [],
  "warnings": []
}
```

---

## 5. Determinism contract

Главный инвариант v2: **один и тот же вход → один и тот же SHA-256 на
каждом этапе конвейера**. Контракт наследуется из `ShotManifestCompiler`
(Sprint 1) и зеркалируется во всех новых сервисах.

### 5.1. PerformancePIR Compiler

```ts
const stable = fastJsonStableStringify({
  schemaVersion, rigType, shotManifestRef, mohoShowBibleRef,
  boneKeys, switchKeys, smartBoneActions, cameraKeys, fxKeys,
  provenance
});
const fingerprint = sha256(stable);
performanceId = 'MOHO-' + fingerprint.slice(0, 16);
```

Правила:

- `createdAt` в `provenance` зафиксирован как `new Date(0).toISOString()`
  (а не `new Date()`) — иначе повторный прогон даст разный план;
- `boneKeys` сортируются по `(boneId, frame, channel)`;
- сортировка `cameraKeys` идёт по `frame`;
- `fxKeys` сохраняют порядок из `manifest.fx[]` (порядок = часть контракта).

### 5.2. CommandBuilder

- Сортировка операций детерминирована: `skeleton → switches → smart bones → keys → verify_rig → save_document`;
- Все `idempotencyKey` — `SHA-256(commandType + params)`;
- `sourceManifestSha256` рассчитывается как `sha256(stringify({pir, characterBible}))`;
- `createdAt` берётся из `pir.provenance.compiledAt`, не из `new Date()`.

### 5.3. RetargetingResolver (Moho)

- `performanceId` рассчитывается поверх отсортированных landmark-ов;
- `boneKeys[]` сортируются по `(boneId, frame, channel)`;
- Нормализация landmark-ов в character-space детерминирована.

### 5.4. Reference Rig Templates

- `templateFingerprint()` рассчитывается один раз при импорте модуля;
- `buildRigFromTemplate()` собирает операции в фиксированном порядке;
- `sourceManifestSha256` = `sha256(stringify({template, characterBible}))`.

### 5.5. Гарантия

> Любой повторный вызов `compile → build → emit` с теми же
> `(ShotManifest, CharacterBible)` даёт идентичный
> `pir.deterministicFingerprint`, `plan.sourceManifestSha256` и Lua-source.

Нарушение контракта считается багом уровня P0.

---

## 6. End-to-end пример

Полный pipeline от ShotManifest до идемпотентного Lua-скрипта — 5 строк:

```ts
const compiler = new MohoPerformancePirCompiler();
const builder  = new MohoCommandBuilder();
const pir      = compiler.compile({ shotManifest, characterBible, motionGrammar, crossRefs }).pir;
const plan     = builder.buildPlan({ pir, characterBible, documentPath: '/tmp/masha.moho' });
const lua      = emitMohoLua(plan, characterBible.name);
```

Что происходит на каждом шаге:

1. **`compiler.compile(...)`** — превращает `ShotManifest` (биты, эмоции,
   жесты, движения камеры, FX) в `MohoPerformancePIR` со стабильным
   `performanceId`. Возвращает `{pir, violations, warnings}`. На
   `unknown_rig_type` — fail-closed: пустые массивы + стабильный fingerprint.

2. **`builder.buildPlan(...)`** — собирает декларативный `MohoCommandPlan`
   из PIR + bible: `add_bone` + `set_bone_parent` + `set_bone_constraints`
   для каждого контроллера; `create_switch_layer` + `add_switch_choice`
   для каждого switch-слоя; `create_smart_action` +
   `set_action_channel_key` для каждого smart bone action;
   `set_action_channel_key` для каждого bone key; финальные
   `verify_rig` + `save_document`. Каждая операция проходит
   `mohoCommandPlanSchema.shape.operations.element.parse()` на этапе сборки
   — невалидные операции отклоняются сразу.

3. **`emitMohoLua(plan, characterName)`** — существующий эмиттер
   (`src/services/mohoLuaEmitter/index.ts`) превращает план в идемпотентный
   Lua-скрипт. Заголовок содержит `-- Source digest: <sha256>` для трейсинга.

Полный golden-path (Sprint 3) добавит одну строку:

```ts
await mohoPro.runScript(lua, { documentPath: '/tmp/masha.moho', save: true });
```

---

## 7. Acceptance gate

Sprint 2 считается завершённым, когда выполнены **все** gates ниже
(`tests/integration/mohoSprint2AcceptanceGate.test.ts`):

| # | Gate | Что проверяет |
|---|------|---------------|
| G1 | **Determinism** | `sha256(stableStringify(planA)) === sha256(stableStringify(planB))` для двух независимых `buildPlan()` одного и того же PIR. |
| G2 | **Round-trip fingerprint** | Lua-header содержит `-- Source digest: <sha256>` с тем же значением, что и `plan.sourceManifestSha256`. |
| G3 | **Humanoid_2leg** | 24 fps, 48 frames, 2 бита, 6 контроллеров → ровно 6 `add_bone`, 2 `set_bone_constraints` (если задан `range`), 1 `verify_rig`, 1 `save_document`. |
| G4 | **Parity with retargeting** | `RetargetingResolver.mohoBranch` для тех же входов даёт `sha256(PIR)` идентичный прямому `MohoCommandBuilder.buildPlan()` (golden-сравнение). |
| G5 | **Lua completeness** | `emitMohoLua(plan)` содержит все `commandId` в комментариях и **не содержит** `-- UNSUPPORTED OP`. |
| G6 | **Rig types** | T1–T4: humanoid_2leg / quadruped / creature / mechanical — для каждого набора контроллеров корректные `boneKeys[]` и warnings (см. `tests/unit/retargetingResolverMohoBranch.test.ts`). |
| G7 | **Negative cases** | `CrossReferenceViolation` → пустые массивы ключей + стабильный `performanceId`. Неизвестный `rigType` → `RIG_TYPE_UNSUPPORTED`, fail-closed. `MohoCommandPlan` без `sourceManifestSha256` → `INVALID_PLAN`. |
| G8 | **MCP tools smoke** | Все 6 новых `moho.compiler.*` инструментов зарегистрированы и проходят smoke-вызов на минимальном фикстуре. |

Частичное выполнение не допускается (см. `MOHO_FACTORY.md` § «Acceptance gates»
и правило «никакого mock-success»).

---

## 8. Следующий спринт — Sprint 3

Sprint 3 закрывает разрыв между планом и реальным `.moho`-файлом:

- **Headless render** — запуск `MohoLuaEmitter`-скрипта в реальной Moho Pro 14
  через `mohoPro.runScript()`, сохранение результата на диск;
- **Reopen-verification** — открыть полученный `.moho`, прокрутить
  turnaround, сохранить, переоткрыть, провалидировать иерархию костей;
- **Real FX executor** — честный исполнитель для `fxKeys[]` (сейчас —
  `reserved`);
- **Lip-sync через `MohoCharacterBible.mouthShapes`** + `MohoPerformancePIR.fxKeys`;
- **`verify_rig` в реальном Moho** (сейчас — статический аудит Lua через
  `verify_rig(expect_bones, expect_switches)`);
- **Action Recorder для Moho** — before/after + retake notes → JSONL-датасет;
- **Команда golden-path** — `npm run test:moho_factory` запускает полный
  pipeline от `script.md` до отрендеренного PNG на машине с лицензированной
  Moho.

После Sprint 3 конвейер `script → ShotManifest → PerformancePIR →
MohoCommandPlan → Lua → real .moho → render → QA → Action Recorder`
становится end-to-end на реальной Moho Pro 14.

Sprint 2 заканчивается там, где кончается детерминизм плана: после
`moho.command_plan.build` план можно скормить `MohoLuaEmitter` и получить
идемпотентный Lua-скрипт. Дальше — реальный Moho Pro, и это уже Sprint 3.

---

## Sprint 4 — Render Pipeline + QA

Sprint 4 закрывает последний отрезок golden-path: `MohoCommandPlan` →
реальные кадры на диске → визуальная сверка с эталоном → автоматический
QA-gate → генерация retake-патчей. Наследует детерминированный
`sourceManifestSha256` (см. [§ 5](#5-determinism-contract)) и
`mohoLuaEmitter` из Sprint 1+2, не дублируя их.

Все четыре новых сервиса умеют работать в **offline-режиме**:
если Moho Pro не установлен или кадры не отрендерены — они возвращают
честный статус `requires_real_moho` / `dry_run` и считают метрики от того,
что есть. Никаких mock-success.

---

### 4.S4.1. Pipeline diagram

```text
                        ┌──────────────────────────────┐
                        │  MohoCommandPlan (Sprint 2)  │
                        │  planId / sourceManifestSha256│
                        └──────────────┬───────────────┘
                                       │
                  emitMohoLua()       │   MohoRenderRunner.emitAndSaveLua
                                       ▼
                        ┌──────────────────────────────┐
                        │  build_rig.lua  (на диске)    │
                        └──────────────┬───────────────┘
                                       │
              MohoRenderManager.detectMohoExecutable
                                       │
                  ┌────────────────────┴────────────────────┐
                  │ найден                                   │ не найден
                  ▼                                          ▼
        ┌──────────────────────┐              ┌──────────────────────────┐
        │ execFile(mohoExe)    │              │ status: requires_real_   │
        │  -r plan.moho        │              │   moho                   │
        │  -start N -end M     │              │ Lua эмитнут, рендер      │
        │  -f PNG -o render.*  │              │ не выполнен              │
        └──────────┬───────────┘              └──────────────────────────┘
                   │ кадры
                   ▼
        ┌──────────────────────┐
        │ render_<planId>.*    │  baseline vs candidate
        │ png_sequence/mp4/... │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ MohoVisualDiffer     │  MSE / SSIM / pHash
        │  per-frame + агрег.  │  passes = avg ≤ pass-thr
        └──────────┬───────────┘  framesWithHighDelta[]
                   │ diffResult
                   ▼
        ┌──────────────────────┐
        │ MohoQaGate.evaluate  │  16 чеков (см. § 4.S4.5)
        │  pass / warn / fail  │  + requiresHumanApproval
        │  + findings[]        │  + детерм. fingerprint
        └──────────┬───────────┘
                   │ qaResult
                   ▼
        ┌──────────────────────┐
        │ MohoRetakeEngine     │  4 категории патчей
        │  generatePatches()   │  autoApplicable? / human?
        └──────────┬───────────┘
                   │ patches[]
                   ▼
        retake manifest (rtk_<performanceId>_<NNNN>) ─► re-run
```

ASCII-вариант для быстрого чтения:

```
MohoCommandPlan ─► MohoRenderRunner ─► build_rig.lua ─► Moho CLI
                                                         │
                                                         ▼
                                                      frames
                                                         │
                                                         ▼
                                  MohoVisualDiffer (MSE/SSIM/pHash)
                                                         │
                                                         ▼
                                                   MohoQaGate
                                                         │
                                                         ▼
                                              MohoRetakeEngine
                                                         │
                                                         ▼
                                              patches ─► re-run
```

---

### 4.S4.2. Honest status table

| Сервис | verified_real | requires_real_moho | Комментарий |
|--------|---------------|--------------------|-------------|
| `MohoRenderRunner` (`src/services/mohoRenderRunner/index.ts`) | ❌ (нет CI-лицензии Moho Pro 14) | ✅ `status: 'requires_real_moho'` при `detectedMohoPath === null` | Lua всегда эмитится и сохраняется, рендер не делается. Test-фикстуры: `mohoRenderRunner.test.ts`, `mohoRenderRunner.failure.test.ts`. |
| `MohoVisualDiffer` (`src/services/mohoVisualDiffer/index.ts`) | ✅ (PNG-декодер свой, без внешних либ) | ❌ (не зависит от Moho) | Работает на любых 8-bit PNG (RGB/RGBA/grayscale) — проверено на синтетических baseline/candidate парах. |
| `MohoQaGate` (`src/services/mohoQaGate/index.ts`) | ✅ (логика проверок чистая, детерминированная) | ❌ | Все 16 чеков покрыты `mohoQaThresholdsGate.test.ts`; fingerprint стабилен. |
| `MohoRetakeEngine` (`src/services/mohoRetakeEngine/index.ts`) | ✅ (генерация патчей детерминирована) | ❌ | `recordedAt` зафиксирован `new Date(0).toISOString()` для повторяемости fingerprint. |
| `MohoRenderManager` (CLI detector) | ⚠️ частично | ✅ на машинах без Moho | `detectMohoExecutable()` сканирует `/Applications/Moho*.app`, `Program Files`, `/usr/bin/moho` — возвращает `null` если не нашёл. |
| `RenderMetricsCollector.probeVideo` | ✅ (ffprobe-обёртка) | n/a | Используется только для не-PNG форматов; на PNG-режиме не вызывается. |

Правило: **любой вызов `moho.render.run` без Moho Pro возвращает
`status: 'requires_real_moho'` с уже записанным `build_rig.lua`** —
агенты могут продолжать QA-цепочку на синтетических кадрах, не падая.

---

### 4.S4.3. Render runner — поведение `requires_real_moho`

`MohoRenderRunner.run(opts)` (`src/services/mohoRenderRunner/index.ts:81`)
проходит три ветки:

1. **`opts.dryRun === true`** — эмитит `build_rig.lua`, собирает
   `commandLine`, **не запускает** бинарь. Возвращает
   `{status: 'dry_run', exitCode: 0, errorMessage: 'Dry run — Lua script written to ...'}`.
2. **`MohoRenderManager.detectMohoExecutable() === null`** — бинарь не
   найден. Возвращает:

   ```ts
   {
     status: 'requires_real_moho',
     detectedMohoPath: null,
     commandLine: '<fallback render-command line>',
     renderedFiles: [],
     exitCode: 1,
     errorMessage: 'Moho executable not detected. Lua script emitted to <path>; install Moho Pro to render.'
   }
   ```

   Lua-скрипт **всегда** уже записан в `outputDir/build_rig.lua` —
   на это можно опираться в downstream-сервисах.
3. **Moho найден** — `execFileAsync(mohoExePath, args, { timeout })` с
   аргументами `-r <plan> -start N -end M -f PNG -o <out> -w W -h H`
   (+ опц. `-halfsize` / `-noaa`). Возвращает `status: 'rendered'` с
   `renderedFiles[]` и (для не-PNG) `RenderMetricsCollector.probeVideo`
   → `qaFindings[]`.

`status` — это **disjoint union** литералов:
`'rendered' | 'requires_real_moho' | 'dry_run' | 'failed'`. Никаких
`mock_success` или `simulated_render`.

---

### 4.S4.4. Visual differ — формулы MSE / SSIM / pHash

`MohoVisualDiffer` (`src/services/mohoVisualDiffer/index.ts`) использует
встроенный PNG-декодер (без `sharp` / `pngjs` / `canvas`): читает IHDR,
инфлейтит IDAT, распаковывает фильтры 0–4 Paeth, валидирует
8-bit RGB/RGBA/grayscale.

**MSE** (`averageMSE`, `:217`):

```text
MSE = (1 / N) · Σ (aᵢ − bᵢ)²,    N = width · height · channels
mseNormalized = MSE / 255²         (clamped в [0, 1])
```

При `mseNormalized > DEFAULT_HIGH_DELTA_MSE_THRESHOLD (0.05)` кадр
попадает в `framesWithHighDelta[]`. `passes` требует
`averageMSE ≤ MSE_PASS_THRESHOLD (0.02)`.

**SSIM** (`averageSSIM`, `:313`) — 8×8-блочный, luminance-взвешенный
(RGB → 0.299·R + 0.587·G + 0.114·B), с константами `K1=0.01`, `K2=0.03`,
`L=255`, `C1=(K1·L)²`, `C2=(K2·L)²`:

```text
SSIM_block = (2·μₓ·μᵧ + C1)(2·σₓᵧ + C2) / ((μₓ² + μᵧ² + C1)(σₓ² + σᵧ² + C2))
SSIM       = average over non-zero blocks
```

`passes` требует `averageSSIM ≥ SSIM_PASS_THRESHOLD (0.95)`.

**pHash** (`computePerceptualHashFromImage`, `:343`):

1. downscale до 8×8 через box-filter average по luminance;
2. `mean = avg(resized)`;
3. `bit[i] = resized[i] >= mean ? '1' : '0'`;
4. `pHashDistance = hammingDistance(hash1, hash2) ∈ [0, 64]`.

`passes` требует `averagePerceptualHash ≤ PHASH_PASS_THRESHOLD (10)`.

**Дельта-классификация** (`classifyDelta`, `:391`):

| `mse` | `ssim` | `phash` | `delta` |
|-------|--------|---------|---------|
| > 0.05 | < 0.85 | > 20 | `major` |
| > 0.01 | < 0.95 | > 6  | `minor` |
| иначе | — | — | `none`  |

`passes === true` ⇔ все три средние метрики в пределах порогов **и**
`framesWithHighDelta.length === 0`.

Схема результата: `MOHO_VISUAL_DIFFER_SCHEMA_VERSION = '1.0'`. Fingerprint
— `sha256(stableStringify(result))` (через `fingerprint(payload)`).

---

### 4.S4.5. QA gate — 10 основных проверок

`MohoQaGate.evaluate(input)` (`src/services/mohoQaGate/index.ts:97`) гоняет
**16 проверок** (см. `CHECK_REGISTRY`, `:71`). Из них **10 основных**
(с `defaultSeverity`):

| # | Check | `defaultSeverity` | Что делает |
|---|-------|-------------------|------------|
| 1 | `render_failed` | `critical` | `renderResult.status === 'failed'` → finding с `exitCode`. |
| 2 | `render_dry`    | `high`     | `renderResult.status === 'requires_real_moho'` → finding `Moho executable not detected`. |
| 3 | `silhouette_quality` | `medium` | `visualDiff.silhouetteQuality < thresholds.silhouetteQualityMin`. Auto-fixable если ratio ≥ 0.7. |
| 4 | `palette_delta` | `medium`   | `visualDiff.paletteDelta (или mse) > thresholds.paletteDeltaMax`. Auto-fixable если ratio ≤ 1.5. |
| 5 | `pose_library_match` | `high` | `visualDiff.poseLibraryMatch < thresholds.poseLibraryMatchMin`. **Не auto-fixable**. |
| 6 | `switch_layer_rate` | `medium` | `changesPerSecond > thresholds.switchLayerMaxChangesPerSecond`. Auto-fixable. |
| 7 | `switch_layer_sub2f` | `medium` | Switch-смена с gap < 2f. Auto-fixable. |
| 8 | `bone_angle_tolerance` | `low` | Дельта rotation-ключей соседних кадров > `boneAngleToleranceDeg`. Auto-fixable. |
| 9 | `continuity_gap` | `medium` | Bone/camera track с gap > `continuityMaxDeltaFrames * 4` и `|valueDelta| > 1`. Auto-fixable. |
| 10 | `lipsync_drift` | `medium` | Mouth-switch gap > `lipsyncDriftMaxMs / 1000 · 24`. Auto-fixable. |

Остальные 6 (включая `orphan_bone_key`, `mesh_warp_points_moved`,
`key_pose`, `camera_move`, `dialogue_timing`, `orphan_bones_check_skipped`)
вызываются из `evaluate()` и тоже присутствуют в `CHECK_REGISTRY`, но
**не входят в core-10** (часть из них human-approval-only).

**Overall status**:

```text
findings.length === 0                                  → 'pass'
criticalFindings === 0 && mediumCount < 3              → 'warn'
иначе                                                  → 'fail'
```

`requiresHumanApproval` срабатывает на:

- любой чек из `thresholds.requireHumanApprovalFor`;
- наличие `criticalFindings > 0`, если ни один из `requireHumanApprovalFor`
  не сработал.

`fingerprint = sha256(stableStringify([{check, severity, measured, threshold, autoFixable, message}]))`.

---

### 4.S4.6. Retake engine — 4 категории патчей

`MohoRetakeEngine.generatePatches(input)` (`:65`) проходит только
**autoFixable** findings с severity ≤ `thresholds.autoFixableSeverityMax`
и раскладывает их в 4 категории (`CHECK_CATEGORY`, `:36`):

| Категория | Триггер-чеки | Что делает |
|-----------|--------------|------------|
| **lipsyncDrift** | `lipsync_drift`, `switch_layer_sub2f`, `switch_layer_rate` | Для каждого проблемного mouth-switch вставляет `MohoRetakePatch` с `channel: 'opacity'`, `newValue = shiftFrames`, `interpolation: 'step'`. Фиксирует дрейф между соседними phoneme-кадрами. |
| **boneAngleTolerance** | `bone_angle_tolerance` | Для каждой пары соседних rotation-ключей с `|delta| > tol` создаёт патч с `clamped = prev + sign(delta) · tol`, `channel: 'rotation'`, `newValue = clamped.toFixed(4)`, `interpolation: keys[i].interpolation`. |
| **meshWarp** | `mesh_warp_points_moved` | Для smart-bone action с `actions.length > meshWarpMaxPointsMoved` создаёт по патчу на каждый action с `scaleFactor = maxPoints / actions.length`, `channel: 'scale'`, `newValue = action.scaleX · scaleFactor`, `interpolation: 'ease_in_out'`. |
| **continuity** | `continuity_gap` | В bone-track с большим gap вставляет промежуточный keyframe на `prev.frame + gap/2` со средним значением `(prev.value + cur.value) / 2`, `channel: keys[i].channel`, `interpolation: keys[i].interpolation`. |

`MohoRetakePatch` (`src/schemas/mohoRetakeManifest.ts`) включает:
`patchId`, `targetRigType` (один из 4 rig-types Sprint 2),
`boneId/boneName`, `channel` (rotation/translation/scale/opacity),
`frame ≥ 1`, `newValue`, `interpolation`, `note`,
`recordedBy = 'moho-retake-engine-v1'`, `recordedAt` (детерминированный
`new Date(0).toISOString()`).

`retakeId = 'rtk_' + pir.performanceId + '_' + patches.length.padStart(4,'0')`.
`fingerprint = sha256(stableStringify({retakeId, performanceId, qaFingerprint, severity, patches[]}))`.

`canAutoApply()` (`:300`) блокирует авто-применение при `severity === 'high'`,
пустых `patches`, или rotation-патчах с `|newValue| > 180`.

---

### 4.S4.7. Новые MCP-инструменты (8 штук)

Sprint 4 добавляет **8 MCP-инструментов** в два файла:

`src/tools/mohoRenderTools.ts`:

| Tool | Назначение |
|------|------------|
| `moho.render.run` | Запустить batch-рендер по `MohoCommandPlan` → `outputDir`. `dryRun` / `requires_real_moho` / `rendered` / `failed`. |
| `moho.render.detect_moho` | Обнаружить бинарь Moho Pro (`/Applications/Moho*.app`, `Program Files`, `/usr/bin/moho`). |
| `moho.visual_diff.run` | Сравнить две директории PNG-кадров → `passes`, `framesWithHighDelta[]`, агрег. MSE/SSIM/pHash. |
| `moho.visual_diff.compute_metrics` | Сырые MSE/SSIM/pHashDistance для двух PNG-файлов (без агрегации). |

`src/tools/mohoQaGateTools.ts`:

| Tool | Назначение |
|------|------------|
| `moho.qa.evaluate` | Прогнать `MohoQaGate.evaluate({shotId, renderResult, visualDiff?, pir, thresholds, characterBible?})` → `MohoQaGateResult`. |
| `moho.qa.list_checks` | Вернуть `CHECK_REGISTRY` (16 чеков с `defaultSeverity`) для дашбордов и документации. |
| `moho.retake.generate` | Сгенерировать `MohoRetakeEngineResult` (patches + severity + fingerprint) из `pir + characterBible + qaResult + thresholds`. |
| `moho.retake.can_auto_apply` | Определить, может ли `retake` быть применён автоматически (через `MohoRetakeEngine.canAutoApply`). |

> Отдельно: `src/tools/mohoRetakeManifestTools.ts` (Sprint 4) добавляет
> ещё `moho.retake_manifest.validate`, `moho.retake_manifest.create_patch`,
> `moho.retake_manifest.can_auto_apply` — они работают на уровне Zod-схемы
> манифеста, не на уровне сервиса. В Sprint 4 core-8 это 8 инструментов
> выше; manifest-tools — отдельный sibling-блок.

Все инструменты наследуют контракт **fail-closed** и **no-mock-success**:
если вход не прошёл схему или сервис не смог отработать — возвращается
`{status: 'error', code, message}`, не поддельный `success`.

---

### 4.S4.8. End-to-end пример

```ts
import { mohoRenderTools, mohoQaGateTools } from './tools/index.js';
import type { MohoCommandPlan } from './schemas/mohoCommandPlan.js';
import type { MohoCharacterBible } from './schemas/mohoCharacterBible.js';
import type { MohoPerformancePir } from './schemas/mohoPerformancePir.js';
import type { MohoQaThresholds } from './schemas/mohoQaThresholds.js';

const commandPlan: MohoCommandPlan = builder.buildPlan({ pir, characterBible, documentPath: '/tmp/masha.moho' });
const characterBible: MohoCharacterBible = /* из Sprint 1 loader */;
const pir: MohoPerformancePir = /* из Sprint 2 compiler */;
const thresholds: MohoQaThresholds = /* из show-bible или shot manifest */;

// 1. Render
const renderResp = await mohoRenderTools
  .find(t => t.name === 'moho.render.run')!
  .handler({
    commandPlan,
    outputDir: '/tmp/masha/render',
    format: 'png_sequence',
    startFrame: 1,
    endFrame: 48,
    width: 1920,
    height: 1080,
    fps: 24,
    dryRun: false
  });

if (renderResp.status !== 'success') throw new Error(renderResp.message);
// renderResp.result.status: 'rendered' | 'requires_real_moho' | 'dry_run' | 'failed'

// 2. Visual diff (baseline = Sprint 1 golden frames)
const diffResp = await mohoRenderTools
  .find(t => t.name === 'moho.visual_diff.run')!
  .handler({
    baselineFramesDir: '/tmp/masha/baseline',
    candidateFramesDir: renderResp.result.outputDir,
    frameRange: { start: 1, end: 48 }
  });

if (diffResp.status !== 'success') throw new Error(diffResp.message);
// diffResp.result.passes, .averageMSE, .framesWithHighDelta

// 3. QA gate
const qaResp = await mohoQaGateTools
  .find(t => t.name === 'moho.qa.evaluate')!
  .handler({
    shotId: 'shot_001_masha_dialogue',
    renderResult: renderResp.result,
    visualDiff: {
      shotId: 'shot_001_masha_dialogue',
      mse: diffResp.result.averageMSE,
      silhouetteQuality: 0.94,
      paletteDelta: diffResp.result.averageMSE,
      poseLibraryMatch: 0.88,
      referencePath: '/tmp/masha/baseline',
      candidatePath: renderResp.result.outputDir
    },
    pir,
    thresholds
  });

if (qaResp.status !== 'success') throw new Error(qaResp.message);
// qaResp.result: { overallStatus, findings[], autoFixableFindings, requiresHumanApproval, fingerprint }

// 4. Retake patches (если есть autoFixable findings)
if (qaResp.result.autoFixableFindings > 0) {
  const retakeResp = await mohoQaGateTools
    .find(t => t.name === 'moho.retake.generate')!
    .handler({ pir, characterBible, qaResult: qaResp.result, thresholds });

  if (retakeResp.status !== 'success') throw new Error(retakeResp.message);
  // retakeResp.retake.patches[] — массив MohoRetakePatch,
  //   retake.severity, retake.autoApplicable, retake.fingerprint
  //   → применить через mohoLuaEmitter и re-run moho.render.run
}
```

Этот же поток покрывается end-to-end-тестами `mohoVisualFeedbackLoop.test.ts`
и `mohoVisualQaRepair.test.ts`.

---

### 4.S4.9. Cumulative test count

| Sprint | Новые тесты | Накопительный итог |
|--------|-------------|---------------------|
| Sprint 1 (ShowBible + loader) | 190 | 190 |
| Sprint 2 (PerformancePIR + CommandBuilder + ReferenceRigs) | 64 | 254 |
| **Sprint 4 (RenderRunner + VisualDiffer + QaGate + RetakeEngine)** | **53** | **307** |

**Sprint 4 = 53 теста** (по `it(`/`test(`-счётчикам в test-файлах):

- `tests/mohoRenderRunner.test.ts` — 12
- `tests/mohoRenderRunner.failure.test.ts` — 1
- `tests/mohoVisualFeedbackLoop.test.ts` — 1
- `tests/mohoVisualQaRepair.test.ts` — 1
- `tests/mohoQaThresholdsGate.test.ts` — 28
- `tests/retakeEngine.test.ts` — 5
- `tests/retakeTranslator.test.ts` — 5

Sprint 3 не существовал как отдельный milestone в репозитории — Sprint 4
продолжает нумерацию напрямую после Sprint 2, добавляя render-pipeline и
QA-инфраструктуру как самостоятельный блок.

**Итог: 307 verified_real тестов** проходят в режиме без реальной Moho Pro
(`requires_real_moho` принимается как валидный ожидаемый статус).

---

### 4.S4.10. Acceptance gate Sprint 4

Sprint 4 считается завершённым, когда выполнены **все** gates ниже
(покрыто `mohoVisualFeedbackLoop.test.ts`, `mohoQaThresholdsGate.test.ts`,
`retakeEngine.test.ts`):

| # | Gate | Что проверяет |
|---|------|---------------|
| G1 | **Render smoke** | `mohoRenderRunner.run({dryRun: true})` → `status: 'dry_run'`, `commandLine` собран, `build_rig.lua` записан. |
| G2 | **Moho missing** | `detectedMohoPath === null` → `status: 'requires_real_moho'`, `exitCode: 1`, Lua на диске. |
| G3 | **Visual diff pass** | Идентичные baseline/candidate → `passes === true`, `framesWithHighDelta === []`. |
| G4 | **Visual diff fail** | Сильно отличающиеся кадры (random noise) → `passes === false`, `framesWithHighDelta.length > 0`, `averageMSE > 0.05`. |
| G5 | **PNG decode fallback** | Неподдерживаемый bit-depth (16-bit) → `MohoVisualDiffError('PNG_DECODE_UNAVAILABLE')`. |
| G6 | **QA gate pass** | `pir` без проблем + `renderResult.status === 'rendered'` → `overallStatus: 'pass'`, `findings: []`. |
| G7 | **QA gate fail on render_dry** | `renderResult.status === 'requires_real_moho'` → finding `render_dry` с `severity: 'high'`, `overallStatus !== 'pass'`. |
| G8 | **Retake auto-applicable** | `pir` с одним `lipsync_drift` (severity: medium) → patches[] не пуст, `severity: 'medium'`, `canAutoApply: true` (если пороги разрешают). |
| G9 | **Retake human-approval** | `qaResult.requiresHumanApproval === true` → `retake.requiresHumanApproval === true`, `canAutoApply: false`. |
| G10 | **Determinism** | `generatePatches` детерминирован: `sha256(fingerprint_A) === sha256(fingerprint_B)` для двух прогонов с одинаковым `(pir, qaResult)`. |

Частичное выполнение не допускается. Нарушение любого gate — P0.