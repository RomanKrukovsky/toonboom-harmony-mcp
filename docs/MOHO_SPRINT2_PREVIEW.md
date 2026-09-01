# Moho AI Factory — Sprint 2 Preview

Этот документ анонсирует **Sprint 2** фабрики Moho Pro: детерминированную
цепочку, которая превращает зафиксированный **ShotManifest** в исполнимый
**MohoCommandPlan**, готовый к эмиссии через существующий
`MohoLuaEmitter` (см. [`src/services/mohoLuaEmitter/index.ts`](../../src/services/mohoLuaEmitter/index.ts)).

Sprint 2 наследует архитектурные контракты [ROADMAP.md](../../ROADMAP.md) и
опирается на схемы и сервисы, появившиеся в **Sprint 1** (см.
[MOHO_FACTORY.md](./MOHO_FACTORY.md)):

- `ShotManifest` + `ShotManifestCompiler`
  ([`src/services/shotManifestCompiler/index.ts`](../../src/services/shotManifestCompiler/index.ts))
- Семейство ShowBible: `mohoShowBible`, `mohoCharacterBible`,
  `mohoMotionGrammar` (см. `src/schemas/moho*.ts`)
- `MohoCommandPlan` (см.
  [`src/schemas/mohoCommandPlan.ts`](../../src/schemas/mohoCommandPlan.ts))
- `MohoLuaEmitter` (см.
  [`src/services/mohoLuaEmitter/index.ts`](../../src/services/mohoLuaEmitter/index.ts))
- `RetargetingResolver` ([`src/services/retargetingResolver/index.ts`](../../src/services/retargetingResolver/index.ts))

---

## Цель Sprint 2

Зафиксировать **детерминированную** и **обратимую** цепочку:

```
ShotManifest  +  CharacterBible  +  MohoShowBible crossRefs
            │
            ▼
   PerformancePIR Compiler
            │
            ▼
      MohoPerformancePIR          ← boneKeys / switchKeys / smartBoneActions / cameraKeys / fxKeys
            │
            ▼
   RetargetingResolver (Moho branch)
            │  ←  controllerMaps из CharacterBible, motionGrammar-правила
            ▼
      MohoCommandBuilder
            │
            ▼
   MohoCommandPlan[]              ← декларативные операции whitelist-only
            │
            ▼
      MohoLuaEmitter              ← идемпотентный Lua-скрипт для Moho Pro
```

Ключевое свойство цепочки: **тот же вход → тот же SHA-256 на выходе** на
каждом этапе. Это даёт воспроизводимый golden-path, безопасный re-run и
честный QA.

---

## 1. PerformancePIR Compiler

Файл: `src/services/mohoPerformancePirCompiler/index.ts`

Зеркало архитектуры [ShotManifestCompiler](../../src/services/shotManifestCompiler/index.ts),
но для нейтрального rig-модели Moho (bones / switch layers / smart bones).

### Вход

| Параметр | Тип | Источник |
|----------|-----|----------|
| `shotManifest` | `ShotManifest` | Sprint 1 (LLM-директор) |
| `characterBible` | `MohoCharacterBible` | `src/schemas/mohoCharacterBible.ts` |
| `crossRefs` | `ShowBibleCrossRefs` | `src/schemas/shotManifest.ts` |
| `motionGrammar` | `MohoMotionGrammar` (опц.) | `src/schemas/mohoMotionGrammar.ts` |

### Выход

`MohoPerformancePIR` (см.
[`src/schemas/mohoPerformancePir.ts`](../../src/schemas/mohoPerformancePir.ts))
со следующими массивами:

- **`boneKeys[]`** — `MohoBoneKey` для каждого `controllerId` из
  CharacterBible, привязанного к `beat.startFrame`/`beat.endFrame`. Числовой
  `value` берётся из границ `range` контроллера (или HOLD-значение, если
  beat не объявляет конкретного жеста).
- **`switchKeys[]`** — `MohoSwitchKey` для каждого `switchLayer` из
  CharacterBible, привязанного к `beat.frame`. `interpolation: 'step'`.
- **`smartBoneActions[]`** — `MohoSmartBoneActionKey` для каждого
  `expression`/`gestureLibraryEntry`, объявленного в CharacterBible и
  вызванного битом.
- **`cameraKeys[]`** — пара ключей `startFrame/endFrame` с дельтой,
  симметричной `CAMERA_MOVE_ENDPOINTS` из `ShotManifestCompiler`.
- **`fxKeys[]`** — честно объявленные эффекты из `manifest.fx[]` (без
  выдумывания значений; без executor — эмитятся как «reserved»).

### Контракт детерминизма

```ts
const stable = stringify({
  shotManifest,
  characterBible,
  rigType: characterBible.rigType,
  beatFrameMap: shotManifest.beats.map(b => ({
    beatId: b.beatId,
    startFrame: b.startFrame,
    endFrame: b.endFrame
  }))
});
const fingerprint = 'sha256:' + sha256(stable);
```

- Один и тот же `(shotManifest, characterBible)` → одинаковый
  `performanceId` и `deterministicFingerprint` на повторных прогонах.
- Контракт зеркалит `ShotManifestCompiler.derivePerformanceId()` (см.
  [`src/services/shotManifestCompiler/index.ts:279`](../../src/services/shotManifestCompiler/index.ts#L279)).
- FX, заявленные в манифесте, но без исполнителя, **не дропаются молча**:
  они попадают в `fxKeys[]` и помечаются предупреждением (см. поведение
  Sprint 1 на `src/services/shotManifestCompiler/index.ts:128`).

### Граничные правила

1. Неизвестный `characterId` → `violations[]` + пустые массивы + стабильный
   `performanceId` для воспроизводимости (как в `emptyPerformance()`).
2. `rigType` берётся **только** из `CharacterBible.rigType`, не из манифеста.
3. `boneKeys` ограничены `controllerMap[characterId]` — LLM не имеет права
   «придумывать» кости.
4. Если `MotionGrammar` не передан, используется `defaultEasing` контроллеров
   (`ease_in_out` по умолчанию, как в Sprint 1).

---

## 2. MohoCommandBuilder

Файл: `src/services/mohoCommandBuilder/index.ts`

Новый сервис, который **декларативно** собирает `MohoCommandPlan[]` из
`MohoPerformancePIR` + `controllerMaps`. Зеркало Harmony-конвейера
`RetargetingResolver + HarmonyCommandBuilder`, но в одном файле
(композиция проще, чем у Harmony, из-за единой Lua-эмиссии).

### Вход

| Параметр | Тип | Назначение |
|----------|-----|------------|
| `pir` | `MohoPerformancePIR` | выход PerformancePIR Compiler |
| `characterBible` | `MohoCharacterBible` | источник `controllers` + `switchLayers` + `gestureLibrary` |

### Выход

`MohoCommandPlan` (см.
[`src/schemas/mohoCommandPlan.ts`](../../src/schemas/mohoCommandPlan.ts)):

- `planId` — детерминированный `PLAN-<sha256:16>`.
- `sourceManifestSha256` — `pir.deterministicFingerprint`.
- `operations[]` — массив `MohoCommand`, по одному на ключ PIR:
  - `boneKeys` → `add_bone` + `set_bone_constraints` (по диапазону из
    CharacterBible) + `set_bone_color` (если задан) + `set_action_channel_key`
    с `frame`/`angleDeg`.
  - `switchKeys` → `create_switch_layer` (один раз) + `add_switch_choice`
    (один раз на уникальное имя) + `set_action_channel_key` с
    `interpolation: 'step'`.
  - `smartBoneActions` → `create_smart_bone` + `wire_smart_bone_channel`
    (по `targetBone`/`controllerId`) + `create_smart_action` +
    `set_action_channel_key`.
  - `cameraKeys` → `create_vector_layer('Camera_Peg')` + серия
    `set_action_channel_key` для камеры.
  - `fxKeys` → **не генерируют операции**; помечаются предупреждением
    «FX reserved, no executor in Sprint 2» (честно, как в Sprint 1).
- `acceptanceGates[]` — минимум 6 строк (требование схемы), например:
  1. Все `controllerId` из CharacterBible покрыты `add_bone`.
  2. Все `switchLayer.choices` покрыты `add_switch_choice`.
  3. `set_bone_constraints` применён для всех контроллеров с `range`.
  4. `verify_rig(expect_bones, expect_switches)` присутствует в конце.
  5. `save_document` — последняя операция.
  6. `sourceManifestSha256` совпадает с входным PIR.

### Контракт детерминизма

- Сортировка операций: сначала скелет (`add_bone`, `set_bone_parent`),
  затем `create_switch_layer`/`add_switch_choice`, затем
  `create_smart_bone`/`create_smart_action`, затем ключи
  (`set_action_channel_key`), затем `verify_rig`, затем `save_document`.
- Все `idempotencyKey` — детерминированный `SHA-256(commandId + params)`.
- `createdAt` берётся из `pir.provenance.compiledAt`, а не из `new Date()` —
  иначе повторный прогон даст разный план.

---

## 3. RetargetingResolver — Moho branch

Файл: `src/services/retargetingResolver/mohoBranch.ts`

Расширение существующего `RetargetingResolver` ([`index.ts`](../../src/services/retargetingResolver/index.ts))
без поломки его публичного API.

### Назначение

`ShotManifestCompiler` оставляет значения трансформов «нейтральными»
(HOLD), откладывая их разрешение до тех пор, пока не станет известна
конкретная rig-геометрия (см. комментарий в
[`src/services/shotManifestCompiler/index.ts:24`](../../src/services/shotManifestCompiler/index.ts#L24)).
Moho-branch заменяет эту нейтральную фазу и сразу работает в
bone-space Moho — потому что CharacterBible уже знает
`boneId`/`boneName`/`channel`.

### Поддержка `rigType`

| `rigType` | Поведение MohoBranch |
|-----------|----------------------|
| `humanoid_2leg` | Стандартный позвоночник (head/torso/l_arm/r_arm/l_leg/r_leg). Все boneKeys разрешаются напрямую в `controllerMap`. |
| `quadruped` | Добавляется позвоночник `spine → neck → tail`, переиспользуются `l_*`/`r_*` префиксы для конечностей. Контроллеры с префиксом `front_*`/`hind_*` мапятся на `l_*`/`r_*` bones. |
| `creature` | Поддержка многосегментного хвоста и асимметричных конечностей через `libraryRef` контроллеров; boneKeys генерируются по списку `controllerTrackRef` из `gestureLibrary`. |
| `mechanical` | Шарниры с `minAngleDeg`/`maxAngleDeg` берутся из `MotionGrammar.boneConstraints`, а не из CharacterBible (риг механический — контроллеры могут быть в `range: 'degrees'`). |

### Контракт

- На вход принимает `PerformancePIR` (от Sprint 1) **или** `MohoPerformancePIR`
  (от Sprint 2) и выбирает ветку по наличию `rigType`.
- Возвращает `RetargetingPlan` (Harmony-формат) **только** для Harmony-ветки;
  для Moho-ветки возвращает `MohoRetargetingPlan` — расширение с
  `boneKeys[]`, `switchKeys[]`, `smartBoneActions[]` (тот же shape, что
  `MohoPerformancePIR`).
- `bindingHash` рассчитывается по `characterBible.controllers[]` +
  `motionGrammar.rules[]` — повтор того же библа даёт тот же хеш.

---

## 4. Acceptance gate

Файл: `tests/integration/mohoSprint2AcceptanceGate.test.ts`

Главный invariant Sprint 2:

> SHA-256 финального `MohoCommandPlan` стабилен на повтор.

```ts
it('SHA-256 of MohoCommandPlan is stable on repeat', () => {
  const pir = compiler.compile(manifest, characterBible, refs);
  const planA = builder.build(pir, characterBible);
  const planB = builder.build(pir, characterBible);
  expect(sha256(stableStringify(planA))).toBe(sha256(stableStringify(planB)));
  // Кроме того, fingerprint должен пережить round-trip через emitter:
  const lua = emitMohoLua(planA, characterBible.name);
  expect(lua).toMatch(/-- Source digest: <sha256>/);
});
```

Все остальные acceptance gates описаны в `plan.acceptanceGates[]` (см. п. 2)
и проверяются поэлементно в golden-path тесте.

---

## 5. Новые MCP tools

Регистрируются в `src/mcp/server.ts` рядом с `moho.show_bible.*` (Sprint 1).

### `moho.performance_pir.compile`

| Поле | Значение |
|------|----------|
| Вход | `{ shotManifest: ShotManifest, characterBible: MohoCharacterBible, motionGrammar?: MohoMotionGrammar }` |
| Выход | `{ pir: MohoPerformancePIR, warnings: string[], violations: CrossReferenceViolation[] }` |
| Ошибки | `INVALID_SHOT_MANIFEST`, `INVALID_CHARACTER_BIBLE`, `CROSS_REF_VIOLATION`, `RIG_TYPE_UNSUPPORTED` (для неизвестных типов — fail-closed) |
| Side-effects | Нет. Чистый компилятор. |

### `moho.command_plan.build`

| Поле | Значение |
|------|----------|
| Вход | `{ pir: MohoPerformancePIR, characterBible: MohoCharacterBible }` |
| Выход | `{ plan: MohoCommandPlan, lua: string }` (lua — сразу через существующий `MohoLuaEmitter.emitMohoLua`) |
| Side-effects | Нет. Эмиссия Lua в строку, без записи на диск. |

### `moho.command_plan.fingerprint`

| Поле | Значение |
|------|----------|
| Вход | `{ plan: MohoCommandPlan }` |
| Выход | `{ sha256: string, planId: string, sourceManifestSha256: string }` |
| Назначение | Дешёвая проверка, что план не изменился между шагами пайплайна. Используется в acceptance gate и в golden-path тесте. |

Все три инструмента наследуют контракт **fail-closed** из
`MohoCommandPlan.provenance.compiler = 'MohoRigPlanCompiler v1'` (см.
[`src/schemas/mohoCommandPlan.ts:82`](../../src/schemas/mohoCommandPlan.ts#L82)).

---

## 6. Файлы — что создаём и что меняем

### Новые файлы

```
src/services/mohoPerformancePirCompiler/index.ts
src/services/mohoCommandBuilder/index.ts
src/services/retargetingResolver/mohoBranch.ts
tests/unit/mohoPerformancePirCompiler.test.ts
tests/unit/mohoCommandBuilder.test.ts
tests/unit/retargetingResolverMohoBranch.test.ts
tests/integration/mohoSprint2AcceptanceGate.test.ts
docs/MOHO_SPRINT2_PREVIEW.md              ← этот документ
```

### Изменяемые файлы

```
src/schemas/mohoPerformancePir.ts         ← уже существует, без правок
src/services/retargetingResolver/index.ts ← добавить диспетчер по rigType
src/mcp/server.ts                          ← зарегистрировать 3 новых tool-а
src/services/mohoShowBibleLoader/index.ts ← опционально: вернуть motionGrammar в bundle
```

### Файлы, которые **не трогаем**

```
src/services/mohoLuaEmitter/index.ts      ← уже умеет весь whitelist v1
src/services/shotManifestCompiler/index.ts ← Sprint 1, контракт стабилен
src/schemas/mohoCommandPlan.ts            ← schema уже описывает нужный shape
src/schemas/mohoCharacterBible.ts         ← уже включает controllers + switchLayers
src/schemas/mohoMotionGrammar.ts          ← уже включает boneConstraints + timing
```

---

## 7. Тест-план

### 7.1 Детерминизм-тесты

`tests/unit/mohoPerformancePirCompiler.test.ts`:

- `compile()` двух идентичных манифестов → идентичные `pir` (deep-equal).
- `fingerprint` инвариантен к порядку ключей в JSON.
- `fingerprint` меняется при изменении `characterId`, `rigType`, любого
  `beat.startFrame`/`endFrame`, любого `controller.range`.

`tests/unit/mohoCommandBuilder.test.ts`:

- `build()` двух идентичных PIR → идентичные `plan` (включая `createdAt`).
- Идемпотентность `idempotencyKey` на повторных операциях.
- Сортировка операций соответствует разделам «skeleton → switches →
  smart bones → keys → verify → save».

### 7.2 Golden-path тесты

`tests/integration/mohoSprint2AcceptanceGate.test.ts`:

- **G1**: humanoid_2leg, 24 fps, 48 frames, 2 бита, 6 контроллеров →
  эмиттится план ровно с 6 `add_bone`, 2 `set_bone_constraints` (если
  задан `range`), 1 `verify_rig`, 1 `save_document`.
- **G2**: тот же вход через `RetargetingResolver.mohoBranch` →
  результат идентичен прямому `MohoCommandBuilder.build()` (golden
  сравнение `sha256`).
- **G3**: `emitMohoLua(plan)` содержит все `commandId` в комментариях и
  не содержит `-- UNSUPPORTED OP`.

### 7.3 Retargeting-тесты по 4 rig types

`tests/unit/retargetingResolverMohoBranch.test.ts`:

- **T1 humanoid_2leg**: контроллеры `head/torso/l_hand/r_hand` →
  `boneKeys[]` для каждого, `set_bone_constraints` для тех, что имеют
  `range: degrees`.
- **T2 quadruped**: контроллеры `head/neck/spine/tail/front_l_leg/hind_r_leg` →
  `boneKeys[]` для всех, без warning о префиксах.
- **T3 creature**: контроллер с `libraryRef` →
  `boneKeys[]` генерируются через `gestureLibrary.controllerTrackRef`.
  Без библиотечной записи — `violations[]`.
- **T4 mechanical**: контроллеры с `channel: 'rotation'` →
  `boneConstraints` берутся из `MotionGrammar.boneConstraints`, **не** из
  CharacterBible. Проверка: смена `MotionGrammar` без смены CharacterBible
  меняет `set_bone_constraints.minAngleDeg`/`maxAngleDeg`.

### 7.4 Негативные тесты

- `CrossReferenceViolation` → пустые массивы ключей + стабильный
  `performanceId`.
- Неизвестный `rigType` → `RIG_TYPE_UNSUPPORTED`, fail-closed.
- `MohoCommandPlan` без `sourceManifestSha256` → `INVALID_PLAN`.

---

## 8. Что остаётся за пределами Sprint 2

Сознательно отложено в Sprint 3+ (см. нумерацию в [MOHO_FACTORY.md](./MOHO_FACTORY.md)):

- Реальный FX-исполнитель для `fxKeys` (сейчас — `reserved`).
- Lip-sync через `MohoCharacterBible.mouthShapes` + `MohoPerformancePIR.fxKeys`.
- Verify-rig в **реальном** Moho Pro (сейчас — статический аудит Lua
  через `verify_rig(expect_bones, expect_switches)`).
- Action Recorder для Moho (Sprint 4 по [MOHO_FACTORY.md](./MOHO_FACTORY.md)).
- Reopen-verification `.moho` сцены.

Sprint 2 заканчивается там, где кончается детерминизм плана: после
`moho.command_plan.build` план можно скормить `MohoLuaEmitter` и
получить идемпотентный Lua-скрипт. Дальше — реальный Moho Pro, и это
уже Sprint 3.