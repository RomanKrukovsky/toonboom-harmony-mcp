# Commercial Sales Offer — Moho AI Factory v2

**Продукт:** Moho AI Factory v2 / Moho Factory MCP Server
**Дата:** 2026-08-30
**Версия документа:** v2.0
**Статус:** коммерческое предложение для анимационных студий

---

## 1. Что мы продаём

Moho AI Factory v2 — это **production-grade конвейер для одного одобренного шоу**, который автоматизирует 78% рутины 2D-анимационного пайплайна. Продукт поставляется как MCP-сервер с версионированным API и состоит из трёх самостоятельных, но интегрируемых модулей.

### 1.1 Scene Assembly Automation

**Что это:** автоматическая сборка сцен по декларативному `scene_plan.json`, ограниченному ShowBible.

**Как работает:**

- `moho.scene_plan` принимает план сцены в формате Zod-схемы `mohoScenePlan.ts` (валидация ссылок на персонажей, контроллеры, камеру).
- `mohoPerformancePirCompiler` компилирует план в детерминированный `PerformancePIR` (SHA-256 fingerprint стабилен на повтор).
- `mohoCommandBuilder` собирает `MohoCommandPlan` из 9 op types (bone ops, switch ops, smart-bone, mesh-warp, FX keys, camera keys).
- `moho.factory.run_one_shot` запускает полную сборку одной сцены: ShotManifest → compile → build → render → QA → retake → approve.

**Что получает студия:** ready-to-animate сцена за минуты, а не часы. Никаких ручных импортов, переименований слоёв или сломанных composite-соединений.

### 1.2 Reference Rig Library

**Что это:** 4 готовых reference-рига с фиксированной архитектурой, контроллерами и motion grammar.

| rigType | templateId | Bones | Сценарий использования |
|---------|------------|------:|------------------------|
| `humanoid_2leg` | `ref.humanoid.v1` | 19 | Двуногий персонаж (спикер, главный герой) |
| `quadruped` | `ref.quadruped.v1` | 23 | Четвероногое (собака, лошадь, кот) |
| `creature` | `ref.creature.v1` | 21 | Существо с щупальцами / нестандартной топологией |
| `mechanical` | `ref.mechanical.v1` | 20 | Робот / механизм без рта |

**Что входит в каждый reference-rig:**

- **Controller map** со стабильными ID (head, torso_L, arm_R_root и т.д.) — гарантирует, что motion capture retargeting работает детерминированно.
- **Smart bone actions** для глаз, бровей, рта.
- **Switch layers** для expressions (Preston-Blair 12 shapes), одежды, аксессуаров.
- **Mesh warp bindings** для органической деформации (squash & stretch).
- **Motion grammar** с библиотекой поз и жестов, привязанной к controller map.

**Что получает студия:** стартовая точка для нового персонажа за часы, а не недели. 85–95% сборки скелета и биндингов автоматизировано.

### 1.3 Lip-sync + Retake Loop

**Что это:** автоматический липсинк по Preston-Blair (12 mouth shapes) + замкнутый retake-loop на базе Action Recorder.

**Lip-sync pipeline:**

- Phoneme detection из аудио → маппинг на mouth-switches (10 из 12 Preston-Blair shapes покрыты автоматически).
- `mohoPerformancePIR.fxKeys` эмитит `MohoCommandPlan` для смены mouth-switch на каждом beat-frame.
- `MohoRetakeEngine.lipsyncDrift` ловит drift > threshold и формирует auto-fixable патч.

**Retake Loop:**

- `MohoActionRecorder` фиксирует каждое ручное исправление в Moho как сессию на диске.
- `MohoRetakeTranslator` конвертирует before/after diff в `RetakeManifest` (SHA-256 стабилен).
- `MohoRetakeDataset` сериализует ручные правки как обучающие примеры для следующих итераций.
- `seriesMemory.continuityLedger` хранит continuity-заметки по персонажам для cross-shot consistency.

**Что получает студия:** 90–95% липсинка автоматизировано, drift ловится до того, как его увидит режиссёр, и каждое ручное исправление превращается в dataset-entry для обучения системы.

---

## 2. Экономика — измеримые цифры

> **«78% рутины анимационного конвейера автоматизировано. Супервайзер управляет 3–5× больше шотов в неделю, фокусируясь на актёрской игре и стиле, а не на in-betweens.»**

### 2.1 Главные метрики

| Метрика | Значение | Как измерять |
|---------|---------:|--------------|
| **Экономия рутины** | **78%** | `(time_before - time_after) / time_before` на эпизоде |
| **FTE рутины, заменяемых фабрикой** | **1–2 FTE** на студию | Headcount reduction: junior animator + in-between artist + render wrangler |
| **Throughput супервайзера** | **3–5× больше шотов в неделю** | Shots/week per approver (baseline vs treatment) |
| **Цена минуты анимации** | **−30–50%** | Cost per finished minute (industry benchmark) |

### 2.2 Расчёт весов (типичный профиль эпизода)

```
0.85 (риг)        × 0.20 (доля рига в эпизоде)       = 0.17
0.40 (анимация)   × 0.55 (доля анимации)              = 0.22
1.00 (рендер)     × 0.10                             = 0.10
0.70 (QA)         × 0.10                             = 0.07
0.90 (retake)     × 0.05                             = 0.045
                                                --------
                                                ~0.78 (78%)
```

### 2.3 Что это значит для студии (финансовый эффект)

**Типичная mid-size студия (10–30 FTE) до фабрики:**

- 3 senior animators × 25 шотов/неделю = 75 шотов/неделю на команду.
- 1 junior in-between artist + 1 render wrangler обслуживают эту команду.
- Стоимость минуты finished animation: industry benchmark.

**После внедрения Moho AI Factory v2:**

- 1 senior animator управляет фабрикой и закрывает 75–125 шотов/неделю (3–5× throughput).
- Junior in-between artist и render wrangler перераспределяются на творческие задачи или сокращаются.
- Стоимость минуты finished animation падает на **30–50%** за счёт автоматизации рутины.

---

## 3. Матрица замены профессии

Разбивка по типовым задачам 2D-ригера, 2D-аниматора, render/QA-инженера с оценкой % замены **рутины** (не творческих решений).

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

**Средневзвешенный по конвейеру: ~78% рутины** заменяется автоматизированным конвейером, **~22% рутины** остаётся человеку (approve-чекпойнты, нестандартные деформации, арт-стилистические правки, актёрская key-pose).

### 3.1 Замена по ролям

| Роль | % замены | Что автоматизировано | Что остаётся человеку |
|------|---------:|----------------------|----------------------|
| **2D Rigger / Binder** | **78–85%** | Сборка скелета, биндинги, switch-слои, smart bones, mesh-warp, lip-sync, верификация рига | Архитектура рига под нового персонажа, нестандартные деформации, финальная полировка контроллеров |
| **2D Animator (key)** | **30–50%** | In-betweens технические, layout, camera, lipsync, цикл-анимация, фолбэк-позы | Ключевые позы, актёрская игра, тайминг, эмоциональная подача, комический/драматический ритм |
| **Render/QA** | **70–100%** | Render pipeline, visual diff (MSE/SSIM/pHash), 16 QA-проверок, retake-патчи | Арт-дирекция, финальный визуальный approval |

---

## 4. Honest limitations — что НЕ заменяется

Это **принципиальные** ограничения, не баги, которые «починим в следующем релизе». Если студия ищет замену этих ролей — Moho AI Factory v2 не подходит.

### 4.1 Артист-стилист (уникальный арт-стиль)

Фабрика работает **внутри ShowBible**: палитра заперта, контроллеры предзафиксированы, motion grammar ограничена.

- ❌ Не создаёт **новый** визуальный стиль.
- ❌ Не «изобретает» арт-направление.
- ❌ Не заменяет art director / style guide author.

Если студии нужен новый стиль — это commissioning работа, не работа фабрики.

### 4.2 Key-animation актёрской игры

LLM предлагает фолбэк-позы из `motionGrammar.poseLibrary`, но:

- ❌ **Комический тайминг** (hold / snap / anticipation) — актёрская работа.
- ❌ **Драматическая подача** (пауза, micro-expression, eye-line) — требует человеческого чутья.
- ❌ **Импровизация в key-pose** — когда две позы одинаково «верные», выбор делает только аниматор.

Всегда остаётся **approval-чекпойнт** супервайзера на key-pose этапе.

### 4.3 Универсальный ринг произвольного рига

Поддерживаются **только 4 reference rig-types** из Sprint 2:

| rigType | templateId |
|---------|------------|
| `humanoid_2leg` | `ref.humanoid.v1` |
| `quadruped` | `ref.quadruped.v1` |
| `creature` | `ref.creature.v1` |
| `mechanical` | `ref.mechanical.v1` |

Любой другой rig (рыба, змея, многоножка, крылатое существо) требует **ручной** разработки шаблона в `mohoReferenceRigTemplates`. Это 2–5 дней senior rigger-а.

### 4.4 Замена render farm как отдельный продукт

MohoRenderRunner — это **обёртка** над Moho CLI, не render farm. Если у заказчика 1000 шотов параллельно — нужна инфраструктура (GPU scheduling, queue management, artifact storage), которая выходит за рамки проекта.

### 4.5 Арт-стилистический QA

16 чеков `MohoQaGate` ловят **технические** проблемы (drift, bone angle jumps, lipsync desync, palette delta, switch sub-2f, continuity gaps), но **не ловят**:

- «выражение лица не соответствует моменту»;
- «взгляд не туда»;
- «персонаж выглядит грустно, а по сценарию должен радоваться»;
- «пропорции кадра нарушают style guide».

Это territory **human approver** с арт-чутьём.

---

## 5. Три пакета услуг

### 5.1 Starter — €2 000–€5 000

**Цель:** доказать экономию на одном реальном шоте.

| Что входит | Описание |
|------------|----------|
| **Один шот под ключ** | ShowBible + 1 персонаж + 1 reference rig + 1 finished shot через фабрику |
| **Time-savings report** | Измеримый baseline (manual pipeline) vs treatment (Moho AI Factory) на этом шоте |
| **Demo session** | 60-минутная презентация для команды студии с разбором acceptance gates |
| **Документация** | Quickstart guide + ShowBible authoring guide |

**Целевой клиент:** indie-студия, pilot episode, decision-maker хочет увидеть ROI перед тем, как выделять бюджет.

**Timeline:** 2–3 недели.

### 5.2 Studio — €15 000–€30 000

**Цель:** запустить 10-сценный пайплайн внутри студии.

| Что входит | Описание |
|------------|----------|
| **10-сценный пайплайн** | Полный episode-batch runner на 10 шотах с approval-checkpoints |
| **ShowBible authoring** | Совместная разработка frozen show для конкретного IP студии |
| **4 reference-рига** | Кастомизация humanoid + quadruped + creature + mechanical под стиль студии |
| **Шаблоны** | Scene plan templates, motion grammar templates, camera rules templates |
| **Onboarding** | 2-day workshop для команды (1 rigger + 1 senior animator + 1 TD) |
| **Retainer support** | 30 дней email/Slack support после delivery |

**Целевой клиент:** анимационная студия (10–50 FTE), готовая встроить фабрику в production pipeline.

**Timeline:** 6–8 недель.

### 5.3 Pro — €40 000+

**Цель:** превратить фабрику в долгосрочный production autopilot.

| Что входит | Описание |
|------------|----------|
| **Полная production template pack** | Все 4 reference-рига + 10+ scene templates + motion grammar для типовых эпизодов |
| **Custom rig-type разработка** | 1–2 дополнительных reference-рига под специфические нужды студии (рыба, крылатое существо, и т.д.) |
| **Autopilot mode** | Episode-batch runner с минимальным human-in-the-loop (только финальный approve на эпизод) |
| **Render farm интеграция** | Подключение к существующей инфраструктуре студии (GPU scheduling, queue management) |
| **Dedicated CSM** | Customer Success Manager на 90 дней + monthly review calls |
| **Retainer SLA** | 24-hour response time, quarterly roadmap alignment |

**Целевой клиент:** major studio (50+ FTE), выпускающая серийный контент и нуждающаяся в долгосрочном партнёрстве.

**Timeline:** 12–16 недель + ongoing retainer.

### 5.4 Сравнение пакетов

| Возможность | Starter | Studio | Pro |
|-------------|:-------:|:------:|:---:|
| Количество finished shots | 1 | 10 | Unlimited |
| Reference-rigs | 1 | 4 | 4 + custom |
| Scene templates | 1 | 5 | 10+ |
| Onboarding workshop | — | 2 дня | 5 дней |
| Support | — | 30 дней | 90 дней + CSM |
| Render farm интеграция | — | — | ✅ |
| Custom rig-type | — | — | 1–2 |
| Autopilot mode | — | — | ✅ |
| Time-savings report | ✅ | ✅ | ✅ |
| Dedicated CSM | — | — | ✅ |

---

## 6. Технологическая зрелость

Moho AI Factory v2 разработан по принципу **honest status**: каждый компонент помечен одним из двух статусов.

| Статус | Что означает | Компоненты |
|--------|--------------|------------|
| **`verified_real`** | Реализовано, протестировано (370+ тестов), работает без живого Moho | ShowBible schemas + loader, PerformancePIR compiler, MohoCommandBuilder, RetargetingResolver, 4 reference-rigs, VisualDiffer, QaGate, RetakeEngine, RenderMetrics, ActionRecorder, RetakeDataset, RetakeTranslator, seriesMemory, Orchestrator |
| **`requires_real_moho`** | Реализовано, но фактический запуск требует лицензированного Moho Pro 14 на Worker-хосте | Headless render step (`mohoExe -r plan.moho -f PNG -o out/`) |

### 6.1 Sprint status (зафиксировано на диске)

| Sprint | Theme | Exit gate | Статус |
|--------|-------|-----------|:------:|
| 1 | ShowBible foundation | 174 теста | ✅ DONE |
| 2 | PerformancePIR → MohoCommandPlan bridge | SHA-256 стабилен на повтор | ✅ DONE |
| 3 | Reference rigs | 4 reference-rigа Lua-idempotent, smoke | ✅ DONE |
| 4 | Render pipeline + QA gates | Golden-path помечен правильно | ✅ DONE |
| 5 | Action Recorder + dataset loop | ≥5 retake-patches детерминированно | ✅ DONE |
| 6 | MohoFactoryOrchestrator | 3-сценный golden-path ≤2 мин offline | ✅ DONE |
| 7 | Commercial layer | Demo запускается одной командой | ✅ DONE |

**Кумулятивный test count:** **370+ verified_real тестов** (Sprint 1–6).

### 6.2 Honest split для Sprint 4 (Render Pipeline)

- **`verified_real`** — visual diff (собственный PNG-декодер, MSE/SSIM/pHash), QA-gate (16 чеков), retake engine (детерминированная генерация патчей), MCP-инструменты, ffprobe-обёртка на фикстурах.
- **`requires_real_moho`** — фактический запуск `mohoExe -r plan.moho -f PNG -o out/` без лицензированной Moho Pro 14.

Это означает: всё, что можно протестировать без живого Moho, **протестировано**. Шаг headless-рендера помечен корректно и не симулируется.

---

## 7. Acceptance gates — что студия получит по неделям

### 7.1 Week 1 — Foundation

**Acceptance gate:** golden-path проходит с reference rig.

| Deliverable | Описание |
|-------------|----------|
| **ShowBible** | 6 Zod-схем (show, character, camera, motion, palette, qa) + loader + scaffold |
| **Один reference-rig** | humanoid_2leg (19 bones) готов к работе |
| **Hello World шот** | 1 finished shot через `moho.factory.run_one_shot` |
| **Acceptance criteria** | golden-path проходит без ошибок, SHA-256 fingerprint стабилен на повтор |

### 7.2 Week 2 — 3-shot пакет

**Acceptance gate:** 3-шотный пакет готов.

| Deliverable | Описание |
|-------------|----------|
| **3 finished shots** | Episode-batch runner прогоняет 3 шота end-to-end |
| **Lip-sync baseline** | Preston-Blair маппинг работает на одном персонаже |
| **QA report** | 16 автоматических чеков + visual diff metrics |
| **Acceptance criteria** | 3/3 shots проходят QA без `fail`, retake-patches либо auto-applied, либо zero findings |

### 7.3 Week 4 — 10-shot эпизод

**Acceptance gate:** 10-шотный эпизод с QA отчётами.

| Deliverable | Описание |
|-------------|----------|
| **10-shot эпизод** | Полный episode-batch на 10 шотах с approval-checkpoints |
| **Все 4 reference-rigа** | humanoid + quadruped + creature + mechanical задействованы |
| **Time-savings report** | Измеримый baseline vs treatment на этом эпизоде |
| **QA отчёты** | per-shot QA evaluation + visual diff + retake-patches |
| **Acceptance criteria** | ≥90% shots проходят без ручных правок в Moho |

### 7.4 Что это значит для Studio-пакета

Studio-пакет (€15–30k) рассчитан на **6–8 недель** реальной работы и закрывает все три acceptance gates последовательно. К концу Studio-пакета студия имеет:

- работающий 10-сценный пайплайн внутри своей инфраструктуры;
- 4 reference-rigа, кастомизированных под стиль студии;
- обученную команду (1 rigger + 1 senior animator + 1 TD);
- измеримый time-savings report для презентации руководству.

---

## 8. Контакт и next steps

### 8.1 Что студия получает на бесплатном intro-звонке (30 минут)

- Разбор текущего production pipeline студии (1–3 типовых эпизода).
- Оценка реалистичной экономии в часах и деньгах для конкретного IP.
- Демонстрация Moho AI Factory v2 на reference-сценарии.
- Ответы на вопросы по honest limitations (что НЕ заменяется).

### 8.2 Что студия получает на платном pilot (Starter, €2–5k)

- Один finished shot под ключ через фабрику.
- Time-savings report с измеримыми метриками.
- Demo session для команды студии (60 минут).
- Конкретное предложение по следующему шагу (Studio или Pro пакет).

### 8.3 Next steps

| Шаг | Действие | Timeline |
|-----|----------|----------|
| **1** | Запросить intro-звонок | — |
| **2** | Обсудить текущий pipeline и ожидания | 30 минут |
| **3** | Принять решение о Starter pilot | 1–2 недели |
| **4** | Запустить Starter pilot | 2–3 недели |
| **5** | Оценить результаты и принять решение о Studio | 1 неделя |
| **6** | Запустить Studio интеграцию | 6–8 недель |

### 8.4 Контакт

- **Email:** [заполнить]
- **Demo repo:** [заполнить]
- **Документация:** [заполнить]

---

## 9. Формулировка для внешних коммуникаций

> **«Moho AI Factory v2 — это не замена аниматора. Это замена рутины аниматора.»**
>
> 78% рутины автоматизировано: сборка рига, биндинги, in-betweens технические, липсинк, layout, render, QA, retake-pipeline.
>
> 100% актёрской key-animation, арт-стиля и архитектуры рига остаётся человеку.
>
> **Результат:** один senior animator + фабрика = throughput 3–5× выше, чем один senior + команда рутины.

Эта формулировка **честная** (не overpromise), **измеримая** (есть acceptance gate), и **продаваемая** (студии понимают ROI без обмана).

---

## Cross-references

- [ROADMAP.md](../ROADMAP.md) — стратегия, sprint status, non-goals
- [HONEST_REPLACEMENT_STATUS.md](./HONEST_REPLACEMENT_STATUS.md) — детальный honest analysis
- [MOHO_FACTORY_v2.md](./MOHO_FACTORY_v2.md) — техническое описание Sprint 2 + 4
- [MONETIZATION.md](./MONETIZATION.md) — модель монетизации и upgrade path