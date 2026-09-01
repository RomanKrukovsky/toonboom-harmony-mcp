# Case Study — Moho AI Factory (Representative Baseline)

**Продукт:** Moho AI Factory v2
**Дата:** 2026-08-31
**Версия документа:** v1.0
**Связанные документы:** [SALES_OFFER.md](./SALES_OFFER.md), [MONETIZATION.md](./MONETIZATION.md), [HONEST_REPLACEMENT_STATUS.md](./HONEST_REPLACEMENT_STATUS.md)

---

## ⚠️ Honest disclaimer

**До проведения 3+ реальных pilot-проектов (см. `PILOT_INTERVIEW_GUIDE.md`)**
все цифры в этом документе — **synthetic baseline**, основанный на:

- `HONEST_REPLACEMENT_STATUS.md` §4 (матрица замены профессии).
- `examples/commercial-demo/` bundle (72 кадра, 24fps, humanoid_2leg, 12 mouth shapes).
- `MohoTimeSavings` calculator (`src/services/mohoTimeSavings/index.ts`).
- Industry benchmarks из 2D animation studios (AWN, Animation Magazine публикации).

**Цифры будут заменены на реальные** после первых 3 пилотов (target: Q4 2026).

---

## 1. Synthetic Case Study — Pilot Episode Production

### 1.1 Setup (representative)

| Параметр | Значение |
|---|---|
| **Студия** | Synthetic Studio (representative mid-studio) |
| **Проект** | 10-минутный pilot episode, 30 fps, 1920×1080 |
| **Количество шотов** | 80 shots |
| **Стиль** | 2D cut-out, humanoid_2leg, 12 mouth shapes |
| **Длительность** | 8 weeks (40 рабочих дней) |
| **Reference-rigа** | 1 (humanoid_2leg) — 1 главный персонаж |
| **ShowBible** | Frozen show, locked palette (5 colors), 3 camera shot sizes, 3 camera moves |

### 1.2 Baseline (manual pipeline)

**Команда:**
- 1 senior rigger (4 дня на риг персонажа).
- 2 senior animators (по 30 shots каждый).
- 1 junior in-between artist (помощь с in-betweens).
- 1 render wrangler (рендер-очередь, форматы, проверка).

**Время (representative industry benchmark):**

| Этап | Часы | Кто делает |
|---|---:|---|
| Rigger: сборка скелета, биндинги, switches, smart-bones | 32 ч | Senior rigger |
| Animator A: 30 shots × 4 ч/shot (key + in-betweens) | 120 ч | Senior animator |
| Animator B: 30 shots × 4 ч/shot (key + in-betweens) | 120 ч | Senior animator |
| Junior: помощь с in-betweens (50% shots × 1.5 ч) | 60 ч | Junior in-between |
| Lip-sync (Preston-Blair 12 shapes) | 16 ч | Animator A |
| Layout + camera | 12 ч | Animator B |
| Render queue management | 8 ч | Render wrangler |
| QA (visual review + fix) | 24 ч | All team |
| **Total manual labor** | **392 ч** | |

**Стоимость (при €35/час blended):**
```
392 ч × €35/ч = €13 720 direct labor
+ Overhead (office, software, 25%)      = €3 430
                                            --------
Total episode cost (manual)                = €17 150
Per finished minute: €17 150 / 10 min     = €1 715/мин
Per shot: €17 150 / 80 shots              = €214/shot
```

### 1.3 Treatment (Moho AI Factory pipeline)

**Команда (та же studio, с фабрикой):**
- 1 senior rigger (1 день на кастомизацию reference-rigа под стиль студии).
- 1 senior animator (теперь senior = "approver" + key-pose author).
- 0.5 junior in-between artist (только для сложных organic cases, которые фабрика не покрывает).
- 0.25 render wrangler (только финальный QA, не queue management).

**Время:**

| Этап | Часы | Кто делает | % автоматизации |
|---|---:|---|---:|
| Rigger: кастомизация reference-rigа humanoid_2leg (1 персонаж) | 8 ч | Senior rigger | 75% (vs 32 ч) |
| Factory: автоматическая сборка рига из template (4×humanoid bones, switches, smart-bones) | 0.5 ч (factory runtime) | Moho AI Factory | 100% |
| Animator: key-pose + approval на 80 shots (1.5 ч/shot) | 120 ч | Senior animator | — (human only) |
| Factory: technical in-betweens (cycle/walk/talk motion) | 1.5 ч (factory runtime) | Moho AI Factory | 100% |
| Factory: lip-sync через phoneme detection + 12 mouth shapes | 0.5 ч (factory runtime) | Moho AI Factory | 100% |
| Factory: layout + camera (whitelist from `camera_rules.json`) | 0.2 ч (factory runtime) | Moho AI Factory | 100% |
| Junior: 20% shots требуют ручной in-between (organic, drag, overlap) | 16 ч | Junior | 50% (vs 60 ч) |
| Factory: render queue, format selection, frame range | 0.3 ч (factory runtime) | Moho AI Factory | 100% |
| QA: visual diff + 16 чеков + auto-fixable retake patches | 0.5 ч (factory runtime) | Moho AI Factory | 70% (vs 24 ч) |
| Senior: арт-стилистический approval + retake-фикс | 12 ч | Senior animator | — (human only) |
| **Total labor** | **157 ч человеческих + ~3.5 ч factory runtime** | | |

**Стоимость:**
```
157 ч × €35/ч (senior) + 16 ч × €22/ч (junior)        = €5 847
Factory compute (3.5 ч GPU/CPU × €0.50/ч)              = €2
Render credits (Moho Pro 14 runtime, 80 shots)         = €80
Overhead (25%)                                         = €1 482
                                                            --------
Total episode cost (factory)                              = €7 411
Per finished minute: €7 411 / 10 min                    = €741/мин
Per shot: €7 411 / 80 shots                            = €93/shot
```

### 1.4 Сравнение baseline vs treatment

| Метрика | Baseline (manual) | Treatment (factory) | Δ |
|---|---:|---:|---:|
| **Total labor hours** | 392 ч | 157 ч человеческих + 3.5 ч factory | **−60%** |
| **Total cost (blended)** | €17 150 | €7 411 | **−57%** |
| **Cost per finished minute** | €1 715/мин | €741/мин | **−57%** |
| **Cost per shot** | €214/shot | €93/shot | **−57%** |
| **Animator headcount required** | 2 senior + 1 junior + 1 rigger + 1 render | 1 senior + 0.5 junior + 0.25 rigger (только setup) | **−50% FTE** |
| **Throughput per senior/week** | 8 shots/week (40 ч / 5 ч/shot) | 16–25 shots/week (factory-assisted) | **2–3×** |
| **Cycle time** | 8 weeks | 5 weeks (фабрика экономит ~3 недели) | **−38%** |
| **Quality consistency** | Variable (depends on animator) | High (frozen show, ShowBible gates) | qualitative ↑ |

**Synthetic savings per episode:** €17 150 − €7 411 = **€9 739 saved per 10-min episode**.

**For a 13-episode season:** €9 739 × 13 = **€126 607 saved per season**.

### 1.5 What stays human (the non-automated 22%)

| Задача | Часов | Что не автоматизировано |
|---|---:|---|
| Senior: key-pose author | 120 ч | Актёрская игра, комический/драматический тайминг |
| Senior: арт-стилистический approval | 12 ч | "Персонаж выглядит грустно, а по сценарию должен радоваться" |
| Senior: финальный retake-фикс | 8 ч | Сложные organic in-betweens, manual fixes после QA |
| Junior: сложные organic cases | 16 ч | Drag, overlap, secondary motion в нестандартных сценах |
| Senior rigger: кастомизация reference-rigа | 8 ч | Архитектура рига под нового персонажа (не humanoid) |
| **Total human-only labor** | **164 ч** | |

**Из 392 ч → 157 ч автоматизировано (78.5%), 164 ч осталось человеку (21.5%).**

Это совпадает с матрицей замены из `HONEST_REPLACEMENT_STATUS.md` §1 (78% замены рутины).

---

## 2. ROI Calculator (для sales)

### 2.1 Inputs

Студия сообщает:
- Episodes per year (e.g., 13 for a season, 26 for half-season, 52 for weekly show).
- Minutes per episode (e.g., 11 min, 22 min, 44 min).
- Shots per minute (e.g., 8 shots/min для typical 2D episode).
- Current cost per shot (e.g., €214 baseline).
- Animator headcount.

### 2.2 Formula

```
savings_per_episode = (manual_cost_per_shot − factory_cost_per_shot) × shots_per_episode
                     = €121 × shots_per_episode

annual_savings = savings_per_episode × episodes_per_year
factory_investment = €22 000 (Studio Pack)  // initial
payback_period_months = factory_investment / (annual_savings / 12)
```

### 2.3 Примеры (3 сценария)

| Сценарий | Episodes/yr | Shots/ep | Annual savings | Investment | Payback |
|---|---:|---:|---:|---:|---:|
| **Indie — короткометражка** | 2 | 80 | €19 478 | €3 500 (Starter Pilot) | 2.2 мес |
| **Mid-studio — 13-episode season** | 13 | 80 | €126 607 | €22 000 (Studio Pack) | 2.1 мес |
| **Major — weekly show** | 52 | 80 | €506 428 | €45 000 (Pro Production) | 1.1 мес |

**Продажная формулировка:** «фабрика окупается за 1–2 месяца для любого
сценария, потом экономит €100k+/год для типичной mid-студии».

### 2.4 Honest caveat (обязательно сказать клиенту)

> **«Synthetic baseline.** Реальная экономия может отличаться на ±20% в
> зависимости от стиля студии, готовности ригов, опыта команды. После Starter
> Pilot вы получаете измеримый time-savings report на вашем реальном шоте —
> не на synthetic baseline.»

---

## 3. Pilot-проект (планируется Q4 2026)

### 3.1 Target pilot-студии

| Studio type | Episodes/yr | Headcount | Ожидаемый first pilot |
|---|---|---:|---|
| **Indie animation house** | 1–3 | 1–5 | 1 finished shot (Starter) |
| **Mid-studio (TV series)** | 13–26 | 10–50 | 10-shot episode (Studio) |
| **Major studio (franchise)** | 26+ | 50+ | 1 episode + 1 custom rig (Pro) |

### 3.2 Что фиксируется в pilot

| Метрика | Как измеряется | Целевое значение |
|---|---|---|
| **Manual time per shot** | Time tracking on 3 reference shots | baseline |
| **Factory time per shot** | `MohoTimeSavings` report | < 5 min/shot |
| **% shots passing QA without retake** | `MohoQaGate.overallStatus === 'pass'` | ≥ 90% |
| **% shots requiring human fix** | `MohoRetakeEngine.can_auto_apply` ratio | < 10% |
| **Cost per finished minute** | (Labor + render + overhead) / minutes | ≤ €800/мин |
| **Cycle time per episode** | From "script approved" to "final render" | ≤ 4 weeks (target) |
| **Senior animator satisfaction** | Post-pilot survey (NPS) | ≥ 7/10 |

### 3.3 Real Case Study (post-pilot)

После завершения первого пилота этот документ обновляется:

```diff
- ## 1. Synthetic Case Study — Pilot Episode Production
+ ## 1. Real Case Study — [Studio Name] (Q4 2026)

+ | Параметр | Значение |
+ |---|---|
+ | **Студия** | [Real studio name] |
+ | **Проект** | [Real episode name] |
+ | **Manual baseline** | [X ч / €Y per shot] |
+ | **Factory treatment** | [X ч / €Y per shot] |
+ | **Savings** | [X% / €Y] |
+ | **NPS** | [N] |
+ | **Key insights** | [3-5 bullets] |
```

### 3.4 Anti-claims (что НЕ обещаем клиенту)

> ❌ «Вы получите 57% экономии» — это synthetic baseline. Реальная экономия
> будет ±20% от этого значения. После Starter Pilot вы получите **измеримое**
> значение на вашем шоте.
>
> ❌ «Фабрика сразу заменит 50% команды» — нет. Senior animator остаётся для
> key-pose + approval. Junior in-between artist остаётся для organic cases.
> Фабрика усиливает команду, не сокращает её напрямую.
>
> ❌ «8 weeks → 5 weeks cycle time» — это synthetic, реально может быть 6–7
> weeks (фабрика ускоряет, но не магически).

---

## 4. Cumulative Case Studies Roadmap

| Пилот # | Тип студии | Quarter | Что измеряем | Когда публикуем |
|---:|---|---|---|---|
| **Pilot 1** | Indie | Q4 2026 | Starter baseline, 1 shot | После Q4 2026 |
| **Pilot 2** | Mid-studio | Q1 2027 | Studio baseline, 10 shots | После Q1 2027 |
| **Pilot 3** | Major | Q2 2027 | Pro baseline, 1 episode + 1 custom rig | После Q2 2027 |
| **Pilot 4–6** | Mixed | Q3–Q4 2027 | Aggregate metrics, NRR, churn | После Q4 2027 |

**Target Q4 2027:** 3+ real case studies в этом документе, заменяющие synthetic baseline.

---

## Cross-references

- [SALES_OFFER.md](./SALES_OFFER.md) — коммерческое предложение, time-savings claim
- [MONETIZATION.md](./MONETIZATION.md) — pricing, ROI targets
- [HONEST_REPLACEMENT_STATUS.md](./HONEST_REPLACEMENT_STATUS.md) — что остаётся человеку
- [PILOT_INTERVIEW_GUIDE.md](./PILOT_INTERVIEW_GUIDE.md) — как провести pilot-интервью
- [examples/commercial-demo/](../examples/commercial-demo/) — synthetic demo bundle для reproducible benchmarks
- `src/services/mohoTimeSavings/index.ts` — реализация time-savings calculator
