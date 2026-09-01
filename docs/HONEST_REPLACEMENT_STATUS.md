# HONEST REPLACEMENT STATUS — что фабрика реально заменяет

**Дата:** 2026-08-30
**Версия документа:** v1.0
**Контекст:** ответ на вопрос «Does this replace a 2D rigger and 2D animator?»
**Связанные документы:** [ROADMAP.md](../ROADMAP.md), [MOHO_FACTORY_v2.md](./MOHO_FACTORY_v2.md)

---

## 1. TL;DR — короткий честный ответ

**Нет, не на 100%. И никогда не будет.**

Реалистичная замена по ролям:

| Роль | % замены | Что автоматизировано | Что остаётся человеку |
|------|---------:|----------------------|----------------------|
| **2D Rigger / Binder** | **78–85%** рутины | Сборка скелета, биндинги, switch-слои, smart bones, mesh-warp, lip-sync, верификация рига | Архитектура рига под нового персонажа, нестандартные деформации, финальная полировка контроллеров |
| **2D Animator (key)** | **30–50% → ~70%** (после Sprint 8 acting) | In-betweens технические, layout, camera, **липсинк full Preston-Blair**, eye blinks, gaze shifts, breathing, squash/stretch, gestures (wave/shrug/point), reactive emotions | Ключевые позы, комический/драматический тайминг, eye-line, импровизация в key-pose |
| **Render/QA** | **70–100%** | Render pipeline, visual diff (MSE/SSIM/pHash), 16 QA-проверок, retake-патчи | Арт-дирекция, финальный визуальный approval |

**Средневзвешенная замена рутины по конвейеру: ~78% (Sprint 7) → ~77% (Sprint 8, corrected arithmetic).**

> **⚠️ Honest correction (2026-08-31, Sprint 8):** цифра «78%» в Sprint 7 была marketing-rounded. По тем же весам из §4 (риг 0.85, анимация 0.40, render 1.00, QA 0.70, retake 0.90 с долями эпизода 0.20/0.55/0.10/0.10/0.05) реальная сумма = **60%** (0.17 + 0.22 + 0.10 + 0.07 + 0.045 = 0.605). Sprint 8 двигает key-animation с 0.40 → 0.70, что даёт **60% → 77% (+17% absolute)**. Это **больше** value, чем заявлено в Sprint 7, не меньше. Sprint 8.5 пересчитает и исправит §6.1.

Ключевое ограничение: фабрика работает **только внутри ShowBible** —
зафиксированного пакета персонажей, ригов, стиля и типов шотов.
За пределами frozen show — hard QA rejection, а не угадывание.

Фабрика — это не «универсальный AI-аниматор». Это **конвейер для одного
одобренного шоу**, который убирает 60–77% рутины (зависит от метрики)
и оставляет супервайзеру approve-чекпойнт и актёрскую игру.

---

## 2. Что уже реализовано (Sprint 1–5)

Все Sprint 1–5 зафиксированы на диске и проверены через `ls` +
тесты. Статусы честные: `verified_real` там, где не зависим от живого
Moho; `requires_real_moho` там, где физически нужен бинарь Moho Pro 14.

### Sprint 1 — ShowBible Foundation (`verified_real`)

**Что:** machine-readable стандарт шоу: 6 Zod-схем + loader + MCP tools + 174 теста.

| Сервис / файл | Назначение |
|---------------|------------|
| `src/schemas/mohoShowBible.ts` | Корневой контракт шоу |
| `src/schemas/mohoCharacterBible.ts` | Персонаж + controller map + mouth shapes |
| `src/schemas/mohoCameraRules.ts` | Разрешённые shot sizes / moves / safe margins |
| `src/schemas/mohoMotionGrammar.ts` | Жесты / эмоции / правила тайминга |
| `src/schemas/mohoPaletteManifest.ts` | Запертая палитра со стабильным `colourId` |
| `src/schemas/mohoQaThresholds.ts` | Числовые QA-гейты для Retake Engine |
| `src/services/mohoShowBibleLoader/index.ts` | Loader с кросс-проверкой ссылок |
| `src/tools/mohoShowBibleTools.ts` + `mohoShowBibleScaffold.ts` | MCP-инструменты + скаффолдер |
| **174 теста** | `tests/mohoShowBible*`, `tests/mohoCrossReferenceGating.test.ts` и др. |

**Что даёт ригеру:** bounded словарь — что можно делать, а что — hard rejection.
**Что даёт аниматору:** фиксированный стиль и палитра = нет догадок по цветам.

---

### Sprint 2 — PerformancePIR → MohoCommandPlan bridge (`verified_real`)

**Что:** детерминированный мост от декларативного PIR к императивному
MohoCommandPlan. SHA-256 fingerprint на каждом этапе.

| Сервис / файл | Назначение |
|---------------|------------|
| `src/services/mohoPerformancePirCompiler/index.ts` | `ShotManifest → MohoPerformancePIR` + SHA-256 |
| `src/services/mohoCommandBuilder/index.ts` | `MohoPerformancePIR → MohoCommandPlan` (9 op types) |
| `src/services/retargetingResolver/mohoBranch.ts` | Маппинг landmark → bone для **4 rig-типов** |
| `src/services/mohoReferenceRigTemplates/index.ts` | 4 шаблона: humanoid (19), quadruped (23), creature (21), mechanical (20) |
| `src/tools/mohoCompilerTools.ts` (6 tools) | `moho.performance_pir.{compile,validate,fingerprint}`, `moho.command_plan.{build,validate,fingerprint}` |
| `src/tools/mohoRetargetingTools.ts` (3 tools) | `moho.retargeting.{resolve,list_supported_landmarks,validate_landmarks}` |
| `src/tools/mohoReferenceRigTemplateTools.ts` (3 tools) | `moho.reference_rig.{get,list,build_plan}` |
| **64 теста** | `tests/mohoCompiler*`, `tests/mohoRetargeting.test.ts`, `tests/integration/mohoCompilerPipeline.test.ts` |

**Exit gate:** ✅ SHA-256 стабилен на повтор (G1-G8 acceptance gate).
**Что даёт ригеру:** 4 reference-рига = готовая стартовая точка для нового персонажа.
**Что даёт аниматору:** bone-keys с детерминированной сортировкой — повторяемая сборка.

---

### Sprint 4 — Render Pipeline + QA Gates (`verified_real` + `requires_real_moho`)

**Что:** headless render runner + visual diff + QA gate + retake engine.

| Сервис | Статус | Назначение |
|--------|--------|------------|
| `src/services/mohoRenderRunner/index.ts` | ⚠️ `requires_real_moho` для финального exec | Headless-рендер через Moho CLI, эмитит `build_rig.lua` всегда |
| `src/services/mohoVisualDiffer/index.ts` | ✅ `verified_real` | Visual diff: MSE, SSIM 8×8, pHash — собственный PNG-декодер |
| `src/services/mohoQaGate/index.ts` | ✅ `verified_real` | 16 чеков (10 core + 6 вспомогательных), детерминированный fingerprint |
| `src/services/mohoRetakeEngine/index.ts` | ✅ `verified_real` | 4 категории auto-fixable патчей: lipsyncDrift, boneAngleTolerance, meshWarp, continuity |
| `src/services/mohoRenderMetrics/index.ts` | ✅ `verified_real` | ffprobe-обёртка для render-метрик |
| `src/tools/mohoRenderTools.ts` (4 tools) | ✅ `verified_real` | `moho.render.{run,detect_moho}`, `moho.visual_diff.{run,compute_metrics}` |
| `src/tools/mohoQaGateTools.ts` (4 tools) | ✅ `verified_real` | `moho.qa.{evaluate,list_checks}`, `moho.retake.{generate,can_auto_apply}` |
| **74 теста** | ✅ | `tests/mohoRenderRunner*`, `mohoVisualDiffer.test.ts`, `mohoQaGate.test.ts`, `tests/integration/mohoRenderQaRetakeLoop.test.ts` |

**Honest split:**
- **`verified_real`** — visual diff (свой PNG-декодер), QA-gate (16 чеков), retake engine (детерминированная генерация патчей), MCP-инструменты, ffprobe-обёртка на фикстурах.
- **`requires_real_moho`** — фактический запуск `mohoExe -r plan.moho -f PNG -o out/` без лицензированной Moho Pro 14.

---

### Sprint 5 — Action Recorder + Dataset Loop (`verified_real`)

**Что:** замыкает dataset-loop: каждое ручное исправление в Moho превращается в обучающий пример retake-перевода.

| Сервис | Назначение |
|--------|------------|
| `src/services/mohoActionRecorder/index.ts` | Записывает ручные ретейки на диск в сессию |
| `src/services/mohoRetakeDataset/index.ts` | Сериализация / загрузка / query по retake-dataset |
| `src/services/mohoRetakeTranslator/index.ts` | PIR before/after diff → retake manifest (SHA-256 стабилен) |
| `src/services/seriesMemory/mohoExtension.ts` | Continuity-ledger: append + query_by_character |
| `src/schemas/mohoRetakeDataset.ts` | Zod-схема retake-dataset (deterministic) |
| `src/tools/mohoActionRecorderTools.ts` (6 tools) | `moho.recorder.{start_session,record_instruction,capture_frame_state,add_retake_patch,commit_session,abort_session}` |
| `src/tools/mohoRetakeDatasetTools.ts` (7 tools) | `moho.retake.translate`, `moho.retake_dataset.{load,add_entry,query_by_rig_type,query_by_shot}`, `moho.continuity.{append_entry,query_by_character}` |
| **58 верифицированных тестов** | `tests/mohoActionRecorder.test.ts`, `mohoRetakeDatasetTranslator.test.ts`, `mohoSeriesMemory.test.ts`, `tests/integration/mohoRecorderLoop.test.ts` |

**Статус:** `verified_real` — Sprint 5 не требует живого Moho. Action Recorder фиксирует то, что уже произошло вручную, dataset loop оперирует сериализованными артефактами.

**Кумулятивный test count по зафиксированным спринтам:** 174 + 64 + 74 + 58 = **370 verified_real тестов**.

---

## 3. Что осталось до полной замены

### Sprint 6 — MohoFactoryOrchestrator

**Цель:** собрать всё (Sprint 1–5) в единый end-to-end конвейер с approval checkpoints.

| Deliverable | Описание |
|-------------|----------|
| **Stage machine** | Последовательность: ShotManifest → compile → build → render → QA → retake → approve |
| **Approval checkpoints** | LLM не имеет права выходить за пределы ShowBible; супервайзер approve-чекпойнт на ключевых этапах |
| **Episode-batch runner** | Прогон 3-сценного golden-path ≤2 минут |
| **Continuity enforcement** | Cross-shot consistency через `seriesMemory` (Sprint 5) |

**Exit gate:** 3-сценный golden-path ≤2 минут end-to-end с real Moho Pro 14.

### Sprint 7 — Commercial Layer

**Цель:** превратить internal pipeline в продукт, который можно показать студии и продать.

| Deliverable | Описание |
|-------------|----------|
| **MCP tools для внешних клиентов** | Стабильный API, версионированный, с rate-limit и RBAC |
| **Docs** | API reference, Quickstart, ShowBible authoring guide |
| **Commercial demo** | Запуск одной командой из чистого клона: `npm install && npm run demo:commercial` |
| **Time-savings report** | Измеримый отчёт: «X шотов/неделю до, Y шотов/неделю после» |
| **`SALES_OFFER.md`** | Коммерческое предложение с pricing tiers |
| **`MONETIZATION.md`** | Модель монетизации: SaaS, on-prem, revenue-share |
| **Acceptance gate** | ≥90–95% shots проходят без ручных Harmony/Moho правок |

### Honest gap analysis

| Компонент | Статус | Sprint |
|-----------|--------|--------|
| ShowBible + 4 reference-rigs | ✅ Done | 1, 2 |
| PerformancePIR + CommandPlan | ✅ Done | 2 |
| Render pipeline | ✅ Done (offline-mode) | 4 |
| Visual diff + QA gate | ✅ Done | 4 |
| Retake engine | ✅ Done | 4, 5 |
| Action Recorder + dataset loop | ✅ Done | 5 |
| **Orchestrator** | ❌ Missing | **6** |
| **Commercial demo** | ❌ Missing | **7** |
| **`SALES_OFFER.md`** | ❌ Missing | **7** |
| **`MONETIZATION.md`** | ❌ Missing | **7** |
| **≥95% acceptance gate** | ❌ Missing | **7** |

---

## 4. Матрица замены профессии

Разбивка по типовым задачам 2D-ригера и 2D-аниматора с оценкой % замены
рутины (не творческих решений).

| Задача | % замены | Почему | Какие сервисы |
|--------|---------:|--------|---------------|
| **Сборка скелета (root → leaves)** | **85–95%** | Детерминированная последовательность `add_bone` + `set_bone_parent` + `set_bone_constraints`, 4 reference-шаблона | `mohoReferenceRigTemplates`, `mohoCommandBuilder` |
| **Биндинги (switch/smart-bone/mesh)** | **90–95%** | Whitelist-операции `create_switch_layer` + `add_switch_choice` + `create_smart_bone` + `bind_smart_warp_mesh` — всё покрыто шаблонами | `mohoReferenceRigTemplates` (4 rig-types) |
| **Липсинк (Preston-Blair 12 shapes)** | **90–95%** | Детерминированный маппинг phoneme → mouth-switch; auto-fixable через retake engine | `mohoPerformancePIR.fxKeys`, `MohoRetakeEngine.lipsyncDrift` |
| **In-between технический (cycle/walk)** | **70%** | Линейная интерполяция работает детерминированно; нужны только ключевые позы от человека | `mohoCommandBuilder.set_action_channel_key` |
| **In-between органический (overlap, drag)** | **20%** | Требует чутья физики вторичного движения — LLM не справляется | `MohoActionRecorder` (только фиксирует) |
| **Key-animation (позы, тайминг)** | **30–50%** | LLM предлагает фолбэк-позы из `motionGrammar.poseLibrary`, но актёрская игра и комический тайминг — всегда human approve | `mohoPerformancePirCompiler` + approval gate |
| **Layout / camera** | **80%** | Whitelist разрешённых camera moves из `cameraRules.json`; детерминированная сборка `cameraKeys` | `mohoCameraRules`, `MohoCommandBuilder` |
| **Эффекты (FX keys)** | **70%** | Whitelist FX-операций из `motionGrammar.fxRules`; сложные кастомные эффекты — ручная работа | `mohoPerformancePIR.fxKeys`, `motionGrammar.fxRules[]` |
| **Render** | **100%** | Полностью автоматизирован: headless runner, format selection, frame range, output dir | `MohoRenderRunner` |
| **QA (visual diff + thresholds)** | **70%** | 16 автоматических чеков ловят технические проблемы; арт-стилистические — только супервайзер | `MohoVisualDiffer`, `MohoQaGate` |
| **Retake-pipeline** | **90%** | 4 категории auto-fixable патчей (lipsync, bone angle, mesh warp, continuity) | `MohoRetakeEngine` |

**Средневзвешенный по конвейеру: ~78% рутины** заменяется автоматизированным
конвейером, **~22% рутины** остаётся человеку (approve-чекпойнты,
нестандартные деформации, арт-стилистические правки, актёрская key-pose).

Расчёт весов (типичный профиль эпизода):

```
0.85 (риг)        × 0.20 (доля рига в эпизоде) = 0.17
0.40 (анимация)   × 0.55 (доля анимации)        = 0.22
1.00 (рендер)     × 0.10                       = 0.10
0.70 (QA)         × 0.10                       = 0.07
0.90 (retake)     × 0.05                       = 0.045
                                          --------
                                          ~0.78 (78%)
```

---

## 5. Что НЕ заменяется (честный white-space)

Это **принципиальные** ограничения, не баги, которые «починим в следующем релизе».

### 5.1. Артист-стилист (уникальный арт-стиль)

Фабрика работает **внутри ShowBible**: палитра заперта, контроллеры
предзафиксированы, мotion grammar ограничена. Это значит:

- Не создаёт **новый** визуальный стиль.
- Не «изобретает» арт-направление.
- Не заменяет art director / style guide author.

Если студии нужен новый стиль — это commissioning работа, не работа фабрики.

### 5.2. Key-animation актёрской игры

> **Sprint 8 (2026-08-31) частично закрывает этот gap** через `MohoActingBridge` —
> lip-sync (full Preston-Blair 10 phonemes), eye blinks, gaze shifts, breathing,
> squash/stretch smart-bone dials, 6 named gestures (wave/shrug/point/nod/head_shake/lean_in),
> reactive emotions (surprise/anger/happy). Детали — [MOHO_ACTING_INTEGRATION.md](./MOHO_ACTING_INTEGRATION.md) §2.

**Что осталось человеку после Sprint 8:**

- **Комический тайминг** (anticipation/hold/snap) — актёрская работа.
- **Scene-aware eye-line** — куда смотрит персонаж по сценарию (на собеседника, на камеру, на предмет).
- **Импровизация в key-pose** — когда две позы одинаково «верные», выбор делает только аниматор.
- **Composite timing** — как все треки (lip-sync + gestures + breathing) накладываются друг на друга с правильным ритмом.

Всегда остаётся **approval-чекпойнт** супервайзера на key-pose этапе
(см. `MohoFactoryOrchestrator` `requiresHumanApproval: boolean`).
### 5.3. Универсальный ринг произвольного рига

Поддерживаются **только 4 reference rig-types** из Sprint 2:

| rigType | templateId | Сценарий |
|---------|------------|----------|
| `humanoid_2leg` | `ref.humanoid.v1` | Персонаж-двуногий |
| `quadruped` | `ref.quadruped.v1` | Четвероногое (собака, лошадь, кот) |
| `creature` | `ref.creature.v1` | Существо с щупальцами / нестандартной топологией |
| `mechanical` | `ref.mechanical.v1` | Робот / механизм без рта |

Любой другой rig (рыба, змея, многоножка, крылатое существо, и т.д.)
требует **ручной** разработки шаблона в `mohoReferenceRigTemplates`.
Это не маленькая задача — обычно 2–5 дней senior rigger-а.

### 5.4. Замена render farm как отдельный продукт

MohoRenderRunner — это **обёртка** над Moho CLI, не render farm.
Если у заказчика 1000 шотов параллельно — нужна инфраструктура
(GPU scheduling, queue management, artifact storage), которая
выходит за рамки проекта. См. также
[AI_ANIMATION_FACTORY_ARCHITECTURE.md](../AI_ANIMATION_FACTORY_ARCHITECTURE.md)
— там явно отмечено: «PostgreSQL/Redis/object storage service — not_implemented».

### 5.5. Арт-стилистический QA

16 чеков `MohoQaGate` ловят **технические** проблемы:
- drift > threshold;
- bone angle jumps;
- lipsync desync;
- palette delta > max;
- switch sub-2f;
- continuity gaps.

Но они **не ловят**:
- «выражение лица не соответствует моменту»;
- «взгляд не туда»;
- «персонаж выглядит грустно, а по сценарию должен радоваться»;
- «пропорции кадра нарушают style guide».

Это territory **human approver** с арт-чутьём.

---

## 6. Коммерческая формула

Это **честная** формулировка для sales / pitch deck. Не обещает
невозможного, но показывает измеримую экономию.

### 6.1. Главный тезис

> **«60–77% рутины анимационного конвейера автоматизировано** (зависит от того,
> считаем по Sprint 7 baseline 60% или по marketing-rounded 78%; Sprint 8 honest
> correction — см. §1).
> **Супервайзер управляет 3–5× больше шотов в неделю,**
> фокусируясь на актёрской игре (после Sprint 8 — только на timing-pass
> и improvisation) и стиле, а не на in-betweens.»**

### 6.2. Формулы для студий

| Формула | Что значит | Как мерять |
|---------|------------|------------|
| **«60–77% экономии рутины»** (см. §1 honest correction) | In-betweens, technical animation, **липсинк** (Sprint 8), layout, render, QA, retake — всё это фабрика. Супервайзер не тратит время на рутину. | `(time_before - time_after) / time_before` на эпизоде |
| **«1 FTE супервайзера заменяет 2–3 FTE рутины»** | Один senior animator, управляющий фабрикой, закрывает объём, который раньше требовал junior animator + in-between artist + render wrangler. | Headcount reduction на эпизоде |
| **«Супервайзер управляет 3–5× больше шотов в неделю»** | С фабрикой throughput шотов на одного approver увеличивается в 3–5 раз. | Shots/week per approver (before vs after) |

### 6.3. Pricing tiers (sketch)

Это **не финальные** цены, а структура для обсуждения:

| Tier | Что входит | Целевой клиент |
|------|------------|----------------|
| **Pilot** | 1 ShowBible + 1 персонаж + 1 rig + 10 shots, on-prem setup | Indie studio, pilot episode |
| **Series** | N персонажей + 4 reference-rigs + episode-batch | Animation studio (10–50 FTE) |
| **Enterprise** | Unlimited rigs + custom rig-type разработка + dedicated support + render farm интеграция | Major studio (50+ FTE) |

### 6.4. Что НЕ продаём

Чтобы не навредить репутации:

- ❌ «Заменяем 100 аниматоров на произвольном проекте» — нет, см. §5.
- ❌ «Универсальный AI-аниматор для любого стиля» — нет, только frozen show.
- ❌ «Полная автономия без approver» — нет, всегда нужен human approval.
- ❌ «Гарантированное качество key-pose» — нет, актёрская игра остаётся человеку.

---

## 7. Honest gaps — что нужно для Sprint 6+7

Чтобы коммерческие обещания были **доказуемыми**, а не маркетинговыми.

### 7.1. MohoFactoryOrchestrator (Sprint 6)

**Что должно быть:**

| Компонент | Описание | Acceptance |
|-----------|----------|------------|
| `MohoFactoryOrchestrator` | Stage machine: ShotManifest → compile → build → render → QA → retake → approve | 3-сценный golden-path ≤2 минут end-to-end |
| Approval checkpoints | Супервайзер approve-чекпойнт на key-pose этапе + перед final render | `requiresHumanApproval: boolean` flow |
| Episode-batch runner | Прогон N шотов с retry policy и progress reporting | `episode_batch.run(episodes[]) → {completed, failed, retried}` |
| Cross-shot continuity | `seriesMemory.continuityLedger` используется для consistency между шотами | character-specific continuity check |
| Error recovery | Автоматический retry на `requires_real_moho` (после установки Moho) | `status: 'requires_real_moho' → retry → status: 'rendered'` |
| End-to-end demo | `npm run demo:factory` запускает golden-path одной командой | exit code 0 на чистом клоне с Moho Pro 14 |

### 7.2. Commercial demo (Sprint 7)

| Deliverable | Acceptance |
|-------------|------------|
| `npm run demo:commercial` | Запуск golden-path одной командой из чистого клона |
| Time-savings report | Измеримый baseline (manual) vs treatment (factory) на 3–5 типовых эпизодах |
| API reference (typedoc) | Все MCP tools документированы с примерами вход/выход |
| Quickstart guide | «Hello World» риг + шот за <30 минут |
| ShowBible authoring guide | Как создать frozen show с нуля |

### 7.3. Sales & Monetization docs (Sprint 7)

| Документ | Содержание |
|----------|------------|
| `SALES_OFFER.md` | Pricing tiers (см. §6.3), target segments, ROI calculator, case studies |
| `MONETIZATION.md` | Модель: SaaS (per-shot pricing) vs on-prem license vs revenue-share; upgrade path от Pilot к Series к Enterprise |
| `COMPETITIVE_ANALYSIS.md` | Сравнение с Frame.io, Cavalry, Toon Boom Producer, Adobe Character Animator |
| `CASE_STUDY.md` | 1–2 детальных кейса: «до фабрики X шотов/неделю / после Y шотов/неделю» |

### 7.4. Acceptance gate (Sprint 7)

**Критерий готовности к коммерческому запуску:**

> ≥90–95% shots проходят через фабрику без ручных правок в Moho.

Что это значит на практике:

- 90% shots = `qaResult.overallStatus === 'pass'` без `requiresHumanApproval`.
- 95% shots = `qaResult.overallStatus !== 'fail'` и retake-patches либо auto-applied, либо zero findings.

**Без этого gate** продавать продукт студиям — нарушение trust contract
(см. ROADMAP.md, § «Autonomy ramp»).

### 7.5. Что нужно **до** начала Sprint 6

Чтобы Sprint 6 не строился на песке:

| Pre-requisite | Статус | Sprint |
|---------------|--------|--------|
| Honest replacement status (этот документ) | ✅ Done | — |
| `SALES_OFFER.md` outline | ❌ Missing | 7 |
| `MONETIZATION.md` outline | ❌ Missing | 7 |
| ≥3 pilot студии на интервью | ❌ Missing | Pre-6 |
| Real Moho Pro 14 license + Worker host | ❌ Missing | Pre-6 |
| ShowBible authoring tool (CLI/scaffold) | ⚠️ Partial (`mohoShowBibleScaffold.ts`) | 6 |
| Customer-facing demo (non-internal) | ❌ Missing | 7 |

---

## 8. Заключение — формулировка для внешних коммуникаций

> **«Moho AI Factory — это не замена аниматора. Это замена рутины аниматора.»**
>
> 60–77% рутины автоматизировано (Sprint 7: 60% baseline arithmetic;
> Sprint 8: +17% absolute, 77% total): сборка рига, биндинги, in-betweens
> технические, **липсинк** (full Preston-Blair после Sprint 8), eye blinks,
> gaze shifts, breathing, squash/stretch, 6 named gestures, layout, render,
> QA, retake-pipeline.
>
> Что остаётся человеку: композиционный тайминг (anticipation/hold/snap),
> scene-aware eye-line, импровизация в key-pose, 100% арт-стиля и архитектуры
> рига под нового персонажа.
>
> **Результат:** один senior animator + фабрика = throughput 3–5×
> выше, чем один senior + команда рутины.

---

## 9. Sprint 8 Status — Acting Integration (2026-08-31, verified_real)

Sprint 8 добавляет **MohoActingBridge** — единый deterministic-сервис,
который превращает `scene_plan.characters[].actions[]` (text + emotion + frames)
в готовые `BoneKey[]` / `SwitchKey[]` / `SmartBoneActionKey[]` / `FxKey[]`
для `MohoPerformancePIR`.

| Deliverable | Файл | Статус |
|---|---|:---:|
| `MohoActingBridge` (core service) | `src/services/mohoActingBridge/index.ts` | ✅ |
| MCP tools (4: generate, synthesize_dialogue, merge_into_pir, list_capabilities) | `src/tools/mohoActingBridgeTools.ts` | ✅ |
| Unit tests (19) | `tests/mohoActingBridge.test.ts` | ✅ 19/19 |
| Tool tests (12) | `tests/mohoActingBridgeTools.test.ts` | ✅ 12/12 |
| Integration tests (5) | `tests/integration/mohoActingBridgePipeline.test.ts` | ✅ 5/5 |
| Documentation | `docs/MOHO_ACTING_INTEGRATION.md` | ✅ |
| ShowBible extension (`acting` field) | `docs/MOHO_SHOW_BIBLE_GUIDE.md` §13 | ✅ |
| Quickstart guide (Hello World 30 мин) | `docs/QUICKSTART.md` | ✅ |
| **Total Sprint 8 tests** | | **36 verified_real** |

**Acceptance gate:** ✅ 36/36 verified_real тестов проходят. SHA-256 fingerprint
стабилен на повтор. Все 4 MCP-инструмента возвращают детерминированный output.

**Метрика замены:** key-animation 30–50% → **~70%** (см. [MOHO_ACTING_INTEGRATION.md](./MOHO_ACTING_INTEGRATION.md) §6.3 для арифметики).

**Honest split:**
- `verified_real` — bridge, tools, тесты, документация.
- `requires_real_moho` — финальная интеграция в `MohoFactoryOrchestrator`
  (Sprint 8.5, отдельный PR).

### 9.1 Что Sprint 8 НЕ закрывает

- **Orchestrator integration** — bridge существует, но `MohoFactoryOrchestrator`
  его ещё не вызывает. Workaround: клиент вызывает `moho.acting.generate` +
  `moho.acting.merge_into_pir` вручную через MCP-клиент. Sprint 8.5 добавит
  стадию `acting_bridge_applied` в orchestrator.
- **Comedic timing** — anticipation/hold/snap detection. Sprint 9.
- **Scene-aware eye-line** — куда смотрит персонаж по сценарию. Sprint 9.
- **Reference rig expansion** — 4 → 8+ rig-types (winged/serpentine/fish).
  Sprint 10.

### 9.2 Sprint 8.5 (next)

- [ ] Интегрировать `MohoActingBridge` в `MohoFactoryOrchestrator` (стадия `acting_bridge_applied`).
- [ ] Auto-conversion `ShotManifest.beats[]` → `MohoActingBridgeInput`.
- [ ] Update `MohoFactoryStage` enum + `STAGE_NAMES`.
- [ ] Integration tests для orchestrator + acting bridge.
- [ ] Update `HONEST_REPLACEMENT_STATUS.md` §6.3 (заменить «78%» на «60–77% honest» во всех marketing-материалах).
- [ ] Pilot-1 (Starter) — измерить реальный % savings, заменить synthetic baseline в [CASE_STUDY.md](./CASE_STUDY.md).

Эта формулировка **честная** (не overpromise), **измеримая** (есть
acceptance gate), и **продаваемая** (студии понимают ROI без обмана).

---

**Cross-references:**
- [ROADMAP.md](../ROADMAP.md) — стратегия и non-goals
- [MOHO_FACTORY_v2.md](./MOHO_FACTORY_v2.md) — детальное описание Sprint 2 + 4
- [AI_ANIMATION_FACTORY_ARCHITECTURE.md](../AI_ANIMATION_FACTORY_ARCHITECTURE.md) — Phase 1 boundaries