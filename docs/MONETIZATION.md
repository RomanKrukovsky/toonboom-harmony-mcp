# Monetization — Moho AI Factory

**Продукт:** Moho AI Factory v2 (MCP-сервер)
**Дата:** 2026-08-31
**Версия документа:** v1.0
**Связанные документы:** [SALES_OFFER.md](./SALES_OFFER.md), [HONEST_REPLACEMENT_STATUS.md](./HONEST_REPLACEMENT_STATUS.md)

---

## 1. TL;DR

Moho AI Factory монетизируется **через три параллельных потока** с разной маржинальностью и горизонтом:

| Поток | Маржинальность | Горизонт | Цель Y1 |
|---|---:|---|---:|
| **A. Production-as-a-Service** (Starter / Studio / Pro пакеты) | 70–80% | Сейчас (Q1) | €120k |
| **B. Reference Rig + ShowBible Templates** (цифровой товар) | ~95% | Q1–Q2 | €40k |
| **C. Pilot-2-Series retainer** (recurring revenue) | 60–70% | Q2+ | €90k |

**Total target Y1:** €250k revenue при средней маржинальности ~75%.
**Target Y2:** €600k+ через повторяющиеся Studio/Pro контракты + SaaS pilot.

Документ заменяет устаревший `MONETIZATION.md` (написан под "Harmony Autopilot",
содержал нереалистичные 99.9% margin и смешивал стратегии без привязки к
текущему состоянию продукта — Sprint 7 Commercial Layer).

---

## 2. Что мы продаём (честно)

**Не продаём:** «универсальный AI-аниматор», «замену 100 аниматоров», «100% автономный продакшн без approver», «новый арт-стиль».

**Продаём:** `78% рутины анимационного конвейера автоматизировано` (см. `HONEST_REPLACEMENT_STATUS.md` §1). Супервайзер управляет 3–5× больше шотов в неделю.

Эта формулировка — **trust contract** с клиентом. Overpromise убьёт продажи после первого же неудачного пилотa.

### 2.1 Три рыночных сегмента

| Сегмент | Размер | Бюджет | Кто покупает |
|---|---|---:|---|
| **Indie-студии / фрилансеры** (1–5 человек, pilot episode) | 5–10k в мире | €2–5k | Сам founder/animator |
| **Mid-студии** (10–50 FTE, серийный контент) | 500–2k | €15–30k | Head of Production, Pipeline TD |
| **Major-студии** (50+ FTE, franchise / IP) | 100–300 | €40k+ | CTO, VP of Technology |

### 2.2 Что в frozen show (что фабрика реально умеет)

- 4 reference rig-type (humanoid, quadruped, creature, mechanical)
- 12 Preston-Blair mouth shapes
- Whitelist camera moves (3 shot sizes, 3 moves по умолчанию)
- Зафиксированная палитра через `palette.manifest.json`
- Motion grammar с библиотекой поз/жестов
- QA-gate на 16 чеков + 4 категории auto-fixable retake-патчей
- Episode-batch runner с approval-checkpoints

**Вне frozen show — hard QA rejection, не угадывание.** Это принципиальное
ограничение (см. `HONEST_REPLACEMENT_STATUS.md` §5).

---

## 3. Стратегия A — Production-as-a-Service

**Что:** фиксированные пакеты услуг с предсказуемым scope, ценой и timeline. Это **основной** revenue-поток Y1.

### 3.1 Три пакета (детально — в `SALES_OFFER.md` §5)

| Пакет | Цена | Scope | Timeline | Margin |
|---|---:|---|---|---:|
| **Starter Pilot** | €2 000–€5 000 | 1 finished shot + time-savings report + demo session | 2–3 нед | ~85% |
| **Studio Pack** | €15 000–€30 000 | 10-shot episode pipeline + 4 reference-rigа + onboarding workshop | 6–8 нед | ~75% |
| **Pro Production** | €40 000+ | Unlimited rigs + custom rig-type разработка + autopilot mode + render farm интеграция + dedicated CSM | 12–16 нед + retainer | ~70% |

### 3.2 Unit economics пакета

**Starter Pilot (€3 500 медиана):**
```
Direct cost:
  - Senior rigger/animation consultant × 0.5 нед × €1 400      = €700
  - ShowBible authoring (manual 1 день)                         = €300
  - Render credits (Moho Pro runtime, ~24 кадра × 5 сек)       = €20
  - Demo session (1 ч senior PM)                                = €140
                                                            --------
  Total COGS                                                   ≈ €1 160
  Gross margin                                                  ≈ 67%
```

**Studio Pack (€22 000 медиана):**
```
Direct cost:
  - 1 senior rigger + 1 senior animator × 6–8 нед × blended €1 200/нед
                                                                 = €14 400
  - ShowBible + 4 reference-rig кастомизация                     = €3 000
  - Onboarding workshop (2 дня, 2 senior)                        = €1 600
  - 30-дневный support (1 senior, 0.25 FTE)                      = €2 800
                                                            --------
  Total COGS                                                   ≈ €21 800
  Gross margin                                                  ≈ 1%  ← ПРОБЛЕМА
```

**Критическое наблюдение:** Studio Pack в формате «6–8 недель full-time senior
consulting» имеет near-zero margin. **Нужно переосмыслить delivery-модель:**
- Часть delivery automation (Sprint 6 orchestrator + Sprint 5 dataset loop)
  уже делает часть работы.
- Tier 2 support через shared Slack/email (не dedicated senior).
- Async delivery: заказчик получает deliverables, не consultant-часы.

**После автоматизации delivery (Sprint 8+)** Studio Pack COGS падает до ~€8k,
margin восстанавливается до ~65%.

### 3.3 Pricing tiers — что входит (Sprint 7 baseline)

| Возможность | Starter | Studio | Pro |
|---|:---:|:---:|:---:|
| Finished shots | 1 | 10 | Unlimited |
| Reference-rigs (4 типа) | 1 | 4 | 4 + 1–2 custom |
| Scene templates | 1 | 5 | 10+ |
| ShowBible authoring |  |  |  |
| Onboarding workshop | — | 2 дня | 5 дней |
| Support | — | 30 дней | 90 дней + CSM |
| Render farm integration | — | — | ✅ |
| Custom rig-type | — | — | 1–2 |
| Autopilot mode | — | — | ✅ |
| Time-savings report | ✅ | ✅ | ✅ |

### 3.4 Конверсия и воронка (target Y1)

```
20 qualified intro-звонков
  → 6 Starter Pilot контрактов (€18k revenue, margin ~67% = €12k gross)
    → 3 конверсии в Studio Pack (€66k revenue, margin post-Sprint-8 ~65% = €43k gross)
      → 1 конверсия в Pro Production (€45k revenue, margin ~70% = €32k gross)
        → 1 Pro → recurring retainer €8k/мес (€96k Y2, margin ~65% = €62k Y2)
```

**Реалистичная цель Y1:** €130k (5 Starter + 2 Studio + 0 Pro).

---

## 4. Стратегия B — Цифровые шаблоны

**Что:** reference-rigи, ShowBible-стартеры, mouth-chart паки — продаются как
digital downloads через собственный портал или Gumroad/Lemon Squeezy.

**Почему это работает:**
- 99% margin на delivery (цифровой товар, ноль marginal cost).
- Самый дешёвый entry point для инди-аниматоров.
- Каждый продавец = потенциальный клиент на Strategy A (Starter Pilot).

### 4.1 Линейка продуктов

| Продукт | Цена | Что внутри |
|---|---:|---|
| **Reference Rig Bundle v1** | €399 | 4 reference-rigа (humanoid, quadruped, creature, mechanical) + controller map + Lua emitter + интеграция с MCP |
| **ShowBible Starter Pack** | €149 | 3 готовых ShowBible для жанров: commercial (15с), shorts (60с), educational (3мин) |
| **Mouth Chart Pack** | €89 | 12 Preston-Blair + 2 stylized (chibi, realistic) + phoneme-маппинг для каждого |
| **Scene Plan Templates** | €199 | 10 готовых scene_plan.json (idle / talk / walk / fight / etc.) для разных rig-типов |
| **QA Thresholds Cookbook** | €79 | 5 настроенных `qa_thresholds.json` под разные стили (cartoon, semi-real, cinematic) |

### 4.2 Unit economics (€399 Reference Rig Bundle)

```
Direct cost:
  - Упаковка + описание (4 часа mid-level)                    = €140
  - Hosting (Gumroad/Lemon Squeezy берут 5–10%)                = €30
  - Поддержка по email (1 час на продажу в месяц, €0.50/sale)  = €0.50
                                                            --------
  Total COGS                                                   ≈ €170
  Gross margin                                                  ≈ 57%
```

При 100 продажах в Y1: €40k revenue, €23k gross.

### 4.3 Ограничения

- **Не пиратится легко** — JSON + Lua emitter'ы привязаны к MCP API key, нужна подписка для активации.
- **Не заменяет** Strategy A — шаблон даёт стартовую точку, не готовый продакшн.
- **Требует маркетинга** — нужны tutorial-видео, demo-сцены, partnerships с rigger-инфлюенсерами.

---

## 5. Стратегия C — Recurring revenue (Pilot-2-Series retainer)

**Что:** после успешного Studio/Pro пакета клиент платит ежемесячный retainer за:
- Continuous improvement (новые rig-типы, scene templates, motion grammar extensions).
- Priority support (24-hour SLA, dedicated Slack channel).
- Quarterly business review с CSM.
- Участие в roadmap (влияние на приоритеты Sprint 8+).

### 5.1 Retainer tiers

| Tier | Месячная цена | Что входит |
|---|---:|---|
| **Studio Retainer** | €2 500/мес | 10 часов consulting + priority email support + 1 custom scene template/мес |
| **Pro Retainer** | €8 000/мес | 40 часов consulting + dedicated Slack + 1 custom rig-type/квартал + quarterly review |
| **Enterprise Retainer** | €20 000/мес | 160 часов + dedicated CSM + on-site visits (2/год) + render farm integration support |

### 5.2 LTV (lifetime value)

**Pro-клиент:**
- Initial Pro пакет: €45k.
- Pro Retainer 12 мес: €96k.
- Расширения (custom rig-type €15k each, render farm €25k): €40k.
- **LTV Y1-Y2:** €180k.
- **Gross margin Y1-Y2:** ~65% × €180k = €117k.

**Это ключевая unit:** Pro-клиент с retainer = €117k gross profit за 2 года
против €12k gross profit с одного Starter Pilot.

### 5.3 Ключевая метрика

> **Net Revenue Retention (NRR) > 110%** — клиент из Pro-пакета должен либо
> расширяться, либо оставаться на том же retainer. Churn < 5% в год.

Если NRR < 100% — recurring-revenue стратегия не работает, и нужно переосмыслить product-market fit.

---

## 6. Go-to-Market план (Y1)

### 6.1 Квартал 1 (сейчас) — Foundation

| Действие | Цель | Метрика |
|---|---|---|
| Запустить Reference Rig Bundle на Gumroad | Первые 20 продаж | €8k revenue, 20 leads |
| 20 intro-звонков с mid-студиями (LinkedIn outreach) | 6 Starter Pilot контрактов | €18k revenue, 6 case studies |
| 3 публичных demo-видео (YouTube, 2–3 мин каждое) | 1k просмотров, 50 leads | Brand awareness |

### 6.2 Квартал 2 — Series conversion

| Действие | Цель | Метрика |
|---|---|---|
| 3 конверсии Starter → Studio | €66k revenue | 3 production deployments |
| Mouth Chart Pack + Scene Templates запуск | 50 продаж каждого | €14k revenue |
| 3 публикации в индустриальных изданиях (Animation Magazine, Cartoon Brew) | 100 leads | Brand authority |

### 6.3 Квартал 3–4 — Recurring revenue

| Действие | Цель | Метрика |
|---|---|---|
| 1 Studio → Pro конверсия | €45k revenue | 1 major deployment |
| 3 Pro/Enterprise retainer подписать | €10k MRR | Recurring baseline |
| Mouth Chart Pack v2 (stylized extended) | 30 продаж | €3k revenue |

### 6.4 Target Y1 revenue

| Поток | Target Y1 | Консервативный Y1 |
|---|---:|---:|
| Strategy A (Production) | €130k | €60k |
| Strategy B (Templates) | €40k | €15k |
| Strategy C (Retainer, partial year) | €60k | €0 |
| **Total** | **€230k** | **€75k** |

---

## 7. Upgrade path (клиентский journey)

```
Free demo (opencode + commercial-demo bundle)
  ↓ видит, что фабрика работает
Starter Pilot (€3.5k, 1 shot, time-savings report)
  ↓ видит 78% экономии на реальном шоте
Studio Pack (€22k, 10 shots, full deployment)
  ↓ запускает production pipeline
Pro Production (€45k, custom rig-type, autopilot)
  ↓ нуждается в continuous support
Pro Retainer (€8k/мес)
  ↓ expansion
Enterprise (custom, €50k+/год)
```

Каждый шаг — **отдельный sales motion** с отдельным sales material.

---

## 8. Что НЕ продаём (anti-promises)

Чтобы не разрушить trust contract после первого пилота:

- ❌ «Заменяем 100 аниматоров на произвольном проекте» — нет, фабрика работает **только** в frozen show.
- ❌ «Универсальный AI-аниматор для любого стиля» — нет, 4 reference-rigа + 12 mouth shapes, и не больше.
- ❌ «Полная автономия без approver» — нет, approval-checkpoint на key-pose всегда остаётся.
- ❌ «Гарантированное качество key-pose» — нет, актёрская игра остаётся человеку.
- ❌ «99.9% margin на AI compute» — нет, реальный margin 65–85% в зависимости от пакета.

(См. `HONEST_REPLACEMENT_STATUS.md` §6.4 для детальной anti-promise матрицы.)

---

## 9. Open questions для follow-up

1. **Moho Pro лицензия** — клиент должен иметь собственную. Нужно ли предлагать managed Moho-хостинг как часть пакета? Это +€500–1000/мес к Pro retainer.
2. **Render farm партнёрство** — для 1000+ шотов нужна инфраструктура. Партнёриться с Conductor Technologies / AWS Thinkbox Deadline / встроить в `MohoRenderRunner`?
3. **SaaS-Desktop** (Strategy D в старом `MONETIZATION.md`) — отложен до Y2, требует GUI-клиента. Сейчас фокус на MCP API.
4. **Pricing for indie (€29/мес)** — рационально после Y1, когда NRR > 110% и unit economics понятны. Раньше — over-investment.

---

## 10. Метрики для tracking (Y1 dashboard)

| Метрика | Целевое значение Y1 | Как измерять |
|---|---:|---|
| **# qualified leads** | 200 | Intro-звонки через LinkedIn / direct outreach |
| **# Starter Pilot closed** | 6 | CRM (HubSpot / Pipedrive) |
| **Starter → Studio conversion** | 50% | CRM pipeline stage |
| **# Studio Pack deployed** | 3 | CRM + delivery tracker |
| **# Pro Production closed** | 1 | CRM |
| **# retainers active** | 3 | Stripe subscriptions |
| **NRR (Net Revenue Retention)** | >110% | (Starting MRR + expansion - churn) / Starting MRR |
| **Gross margin (blended)** | 70% | (Revenue - COGS) / Revenue |
| **Time-to-value для Starter** | < 3 недели | Pilot delivery tracker |
| **Customer satisfaction (NPS)** | > 40 | Quarterly survey |

---

## Cross-references

- [SALES_OFFER.md](./SALES_OFFER.md) — коммерческое предложение с pricing tiers
- [HONEST_REPLACEMENT_STATUS.md](./HONEST_REPLACEMENT_STATUS.md) — honest analysis, anti-promises
- [MOHO_FACTORY_v2.md](./MOHO_FACTORY_v2.md) — техническое описание фабрики
- [COMPETITIVE_ANALYSIS.md](./COMPETITIVE_ANALYSIS.md) — сравнение с Frame.io / Cavalry / TB Producer
- [CASE_STUDY.md](./CASE_STUDY.md) — реальные (или representative) кейсы
- [PILOT_INTERVIEW_GUIDE.md](./PILOT_INTERVIEW_GUIDE.md) — гайд для первых 3 pilot-студий
