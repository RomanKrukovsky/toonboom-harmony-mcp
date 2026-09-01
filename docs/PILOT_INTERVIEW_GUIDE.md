# Pilot Interview Guide — Moho AI Factory

**Продукт:** Moho AI Factory v2
**Дата:** 2026-08-31
**Версия документа:** v1.0
**Связанные документы:** [SALES_OFFER.md](./SALES_OFFER.md), [CASE_STUDY.md](./CASE_STUDY.md), [MONETIZATION.md](./MONETIZATION.md)

---

## 1. Зачем этот документ

Перед запуском коммерческих продаж нужно **3+ pilot-интервью** с реальными
студиями (см. `HONEST_REPLACEMENT_STATUS.md` §7.5 — "Pre-requisite до Sprint 6").
Без них:

- Невозможно доказать acceptance gate (≥90–95% shots без ручных правок).
- ROI claims остаются synthetic baseline (см. `CASE_STUDY.md`).
- Risk: первая сделка окажется неподходящим клиентом → публичный failure case.

**Цель:** провести 3 интервью в Q4 2026, получить commitment на Starter Pilot
от 1–2 из них.

---

## 2. Target segments (кого ищем)

### 2.1 Приоритет 1 — Indie animation house (1–5 FTE)

| Параметр | Target |
|---|---|
| **Размер** | 1–5 FTE |
| **Текущий pipeline** | Moho Pro 14 (single license) |
| **Production** | Pilot episode, YouTube shorts, indie shorts |
| **Budget** | €3–5k на experiment |
| **Decision maker** | Founder/owner + 1 senior animator |
| **Где искать** | r/animation, r/moho, Animation At Work Discord, LinkedIn (фильтр: "Moho animator") |
| **Количество** | 5–10 intro-звонков → 2 pilot commitment |

### 2.2 Приоритет 2 — Mid-студия (10–50 FTE)

| Параметр | Target |
|---|---|
| **Размер** | 10–50 FTE |
| **Текущий pipeline** | Moho Pro 14 (multi-license) или Harmony |
| **Production** | TV series, branded content, kids' shows |
| **Budget** | €15–30k на Studio Pack |
| **Decision maker** | Head of Production / Pipeline TD / CTO |
| **Где искать** | Animation Magazine, Cartoon Brew, LinkedIn Sales Navigator, Crunchbase (фильтр: "animation studio" + "Moho" OR "Harmony") |
| **Количество** | 10–20 intro-звонков → 1 pilot commitment |

### 2.3 Приоритет 3 — Major studio (50+ FTE)

| Параметр | Target |
|---|---|
| **Размер** | 50+ FTE |
| **Текущий pipeline** | Harmony Server + Producer |
| **Production** | Franchise, theatrical, streaming original |
| **Budget** | €40k+ на Pro Production |
| **Decision maker** | VP of Technology, CTO |
| **Где искать** | SIGGRAPH attendee list, FMX conference, Animation World Network |
| **Количество** | 5–10 intro-звонков → 0–1 pilot (низкая конверсия, но high value) |

**Фокус Q4 2026:** Priority 1 + 2 (3+ интервью). Priority 3 — Q1+ 2027.

---

## 3. Intro-звонок (30 минут) — script

### 3.1 Прежде чем позвонить

| Step | Действие | Time |
|---|---|---|
| 1 | Research студии: посмотреть последние 3 проекта, headcount, текущий pipeline | 30 мин |
| 2 | Найти decision maker через LinkedIn (не отправлять в "info@" — игнорируют) | 15 мин |
| 3 | Подготовить 1-page teaser (SALES_OFFER.md §1) | 15 мин |
| 4 | Outreach через LinkedIn InMail или email (шаблон в §6.1) | 15 мин |
| **Total prep** | | **~75 мин на студию** |

### 3.2 Структура звонка (30 мин)

| Минуты | Тема | Что спрашиваем | Что НЕ спрашиваем |
|---|---|---|---|
| **0–5** | Их context | "Расскажите про текущий pipeline: какие инструменты, сколько человек, какой объём?" | Не упоминаем AI/MCP — слушаем |
| **5–15** | Их pain points | "Что отнимает больше всего времени в эпизоде? Где bottleneck?" | Не предлагаем решение |
| **15–20** | Наш контекст (КРАТКО) | Показываем `examples/commercial-demo/` (5 мин demo) | Не продаём, не давим |
| **20–25** | Их reaction | "Что из этого применимо к вашему pipeline? Что точно не подходит?" | Не отвечаем на критику, а записываем |
| **25–28** | Next steps | "Хотели бы провести 1 finished shot через фабрику как paid pilot?" | Не даём скидку сразу |
| **28–30** | Q&A + close | Отвечаем на вопросы, договариваемся о follow-up | Не даём обещаний вне scope |

### 3.3 Что НЕ говорим (anti-pitch)

- ❌ «Мы заменяем аниматоров» — overpromise, получим pushback от senior.
- ❌ «100% automation» — есть, и это расстроит клиента после первого же сложного шота.
- ❌ «AI делает всё сам» — звучит как vaporware.
- ❌ «Дешевле чем нанять инди-аниматора» — обесценивает их существующую команду.
- ❌ «Используем ChatGPT-4 для анимации» — нет, мы ShowBible-bounded, не LLM-chaos.

**Что говорим:**
- ✅ «Moho AI Factory автоматизирует 78% рутины в frozen show».
- ✅ «Один senior + фабрика = throughput 3–5×».
- ✅ «Первый shot — paid pilot, не commitment на долгосрочный контракт».
- ✅ «Мы honest про limitations — есть документ HONEST_REPLACEMENT_STATUS.md».

---

## 4. Pilot-проект (2–3 недели) — структура

### 4.1 Что входит

| Deliverable | Что это | Acceptance |
|---|---|---|
| **1 finished shot** | Полный production shot (72–120 frames), humanoid_2leg | Rendered, QA-passed, арт-approved |
| **Time-savings report** | `MohoTimeSavings` с baseline vs treatment | PDF + JSON с fingerprint |
| **Demo session** (60 мин) | Показ команде студии, как работала фабрика | Recording + slides |
| **ShowBible authoring session** | Совместная разработка frozen show для их IP | Validated `moho_show_bible.json` |
| **Recommendations memo** | 1-2 страницы: что автоматизируется в их pipeline, что нет | PDF |

### 4.2 Что НЕ входит (важно проговорить)

- ❌ «Бесплатный доступ к production-версии» — нет, это paid pilot.
- ❌ «Гарантия ROI» — нет, мы измеряем baseline + treatment, не гарантируем экономию.
- ❌ «Поддержка после pilot» — нет, 30 дней support только в Studio Pack.
- ❌ «Кастомизация ригов вне 4 reference types» — это Pro Production, не Starter.

### 4.3 Timeline (2–3 недели)

| Week | Действие | Кто делает |
|---|---|---|
| **1** | Setup: ShowBible authoring, 1 reference-rig кастомизация, baseline measurement | Мы + студия |
| **2** | Factory run: 1 shot через `moho.factory.run_one_shot` (offline_dry_run, потом live_render если есть Moho Pro) | Мы |
| **2** | QA + retake-loop: 16 чеков + auto-fixable patches | Factory |
| **3** | Demo session (60 мин) + time-savings report delivery | Мы |
| **3** | Follow-up: что дальше (Studio Pack, Pro Production, или стоп) | Совместно |

### 4.4 Cost

**Starter Pilot:** €3 500 (median) — см. `MONETIZATION.md` §3.1.
**COGS:** ~€1 160 (consultant 0.5 нед + render credits).

**Margin:** ~67%.

**Если pilot провалился** (клиент недоволен, ROI не подтвердился):
- Refund 50% (€1 750) — partial credit за setup work.
- Или free Pilot 2 (дополнительный shot) — но не infinite iteration.

**Anti-pattern:** не давать infinite pilots "чтобы клиент был доволен". Это
убьёт margin и не даст learning о product-market fit.

---

## 5. Метрики успеха pilot-проекта

### 5.1 Для нас (Moho AI Factory team)

| Метрика | Target | Failure |
|---|---|---|
| **Pilot conversion rate** | ≥ 50% (2 из 3 pilots → Studio Pack) | < 25% |
| **Time-savings delivered** | ≥ 50% (synthetic baseline показывает 57%, реально ожидаем ±20%) | < 30% |
| **Customer NPS** | ≥ 7/10 | < 5/10 |
| **ShowBible reusable** | ≥ 1 элемент (палитра / motion grammar / camera rules) переиспользуется в Studio Pack | 0 |
| **Honest gap surface** | 0 unannounced limitations обнаружено клиентом | ≥ 1 |

### 5.2 Для клиента (что они оценивают)

| Метрика | Как измеряет клиент |
|---|---|
| **Throughput per senior** | Shots/week до pilot vs после pilot |
| **Cost per finished minute** | Direct labor + render + overhead |
| **Quality consistency** | Арт-стилистическая оценка (subjective) |
| **Time-to-deliver** | Days from "script approved" to "final render" |
| **Senior animator satisfaction** | "Я хочу использовать это каждый день" vs "Это не для меня" |

### 5.3 Decision framework после pilot

**Если NPS ≥ 7 И time-savings ≥ 50%:**
→ Close Studio Pack (€22k), запланировать Studio deployment (6–8 нед).

**Если NPS 5–6 И time-savings 30–50%:**
→ Iterate: 1 дополнительный pilot на другом шоте с улучшениями. Не close Studio ещё.

**Если NPS < 5 И time-savings < 30%:**
→ Honest post-mortem. Не пытаться force close. Записать failure case, улучшить product.

**Если unannounced limitation всплыло:**
→ Refund, исправить `HONEST_REPLACEMENT_STATUS.md`, добавить в sales training.

---

## 6. Outreach templates

### 6.1 LinkedIn InMail (target: Head of Production, mid-studio)

```
Subject: Question about [Studio Name]'s 2D pipeline

Hi [Name],

I'm [Your Name], working on Moho AI Factory — an MCP server that automates
~78% of routine work in 2D cut-out animation pipelines (rigging, in-betweens,
lip-sync, QA, retake).

I saw [Studio Name]'s work on [specific project] — really loved [specific
detail]. Noticed you're running on [Moho / Harmony] with [X] FTE.

Curious: in your current pipeline, what's the biggest bottleneck per episode?
Rigger time, in-between artist hours, QA cycles, or something else?

I'm running paid pilots (€3.5k, 1 finished shot, 2-3 weeks) with 3 studios
to validate the model. If you're curious, happy to do a 30-min intro call
to see if it's a fit.

[Calendly link]

Best,
[Your Name]
```

**Ключевые принципы:**
- Personalized (упомянуть их конкретный проект).
- Короткий (InMail — не email, 3 абзаца максимум).
- Конкретный CTA (Calendly, не "let me know").
- Не упоминать AI/MCP buzzwords в первом касании.

### 6.2 Cold email (target: indie animator / founder)

```
Subject: 78% of your in-between time back?

Hi [Name],

Saw your [specific project] on [Vimeo/YouTube] — really cool [detail].

Quick question: how much of your week goes to technical in-betweens vs
actual acting/posing? Most Moho animators I talk to say 60-70% of their
time is on the technical layer, not the creative one.

I'm running a paid pilot for Moho animators: €3.5k, 2-3 weeks, 1 finished
shot end-to-end through our MCP pipeline. You keep the rendered shot for
your reel; we get measurable time-savings data.

If you're curious, 30-min intro call: [Calendly].

Not a fit if you only do frame-by-frame traditional animation — we focus
on 2D cut-out with bones. But if you rig → key → in-between, we should
talk.

[Your Name]
Moho AI Factory
```

---

## 7. Post-pilot follow-up (вне зависимости от outcome)

### 7.1 Сразу после demo session

| Действие | Когда |
|---|---|
| Отправить thank-you email + recording | В течение 24ч |
| Отправить time-savings report (PDF + JSON) | В течение 48ч |
| Спросить honest feedback (5 мин survey) | В течение 1 недели |
| Запланировать follow-up звонок | Через 2 недели |

### 7.2 Через 2 недели

| Outcome | Действие |
|---|---|
| **Happy pilot** (NPS ≥ 7) | Close Studio Pack, запланировать kickoff |
| **Neutral pilot** (NPS 5–6) | Iterate: предложить дополнительный pilot-шот с улучшениями |
| **Failed pilot** (NPS < 5) | Honest post-mortem звонок, refund, записать learning |
| **No response** | 1 follow-up email через 2 нед, потом archive |

### 7.3 В случае failed pilot

**Не пытаться:** force close, давать infinite discounts, обещать features которых нет.

**Делать:**
- Honest exit interview (30 мин, "что пошло не так?").
- Refund в полном объёме или 50% (зависит от того, сколько было сделано).
- Записать case study (anonymized) в `docs/FAILURE_CASES.md` (новый файл).
- Использовать learning для Sprint 8+ improvements.

---

## 8. Pilot-1 candidate profile (representative)

Для internal reference — какой профиль клиента подходит для первого pilot:

| Критерий | Ideal | Acceptable | Reject |
|---|---|---|---|
| **Size** | 1–5 FTE | 10–20 FTE | 50+ FTE (Pro tier, не Starter) |
| **Pipeline** | Moho Pro 14 | Moho + Harmony mix | Только Harmony (out of scope Y1) |
| **Style** | 2D cut-out с bones | 2D + традиционная mixed | 3D / motion graphics / live action |
| **Episode type** | Pilot episode / YouTube series | Branded content | Theatrical feature (over-scope) |
| **Decision maker** | Founder/owner | Head of Production | Producer (out of decision loop) |
| **Timeline pressure** | Pilot в Q4 2026 / Q1 2027 | Pilot в Q2 2027 | "Может быть в следующем году" (cold) |
| **Tech savviness** | High (понимает MCP / API) | Medium (понимает JSON) | Low (только GUI) |
| **Budget** | €3–5k готовы потратить | €10k+ готовы на Studio | < €1k (price mismatch) |

**Reject list (явно):**
- Студия без Moho Pro лицензии (фабрика не сможет рендерить).
- Студия с frame-by-frame традиционной анимацией (фабрика — для cut-out).
- Студия, которая ищет "AI замену аниматора" (anti-pitch).
- Студия >50 FTE на первом контакте (Pro tier, не Starter).

---

## 9. Internal tracking — pilot pipeline CRM

Минимальный CRM-трекинг (Google Sheet или Notion DB):

| Studio name | Contact | Priority | Intro call date | Pilot started | Pilot outcome | Time-savings | NPS | Next step |
|---|---|---|---|---|---|---:|---|---|
| Studio A | Jane Doe | 1 (Indie) | 2026-10-15 | 2026-10-22 | success | 62% | 8 | Studio Pack $22k |
| Studio B | John Smith | 2 (Mid) | 2026-11-05 | 2026-11-15 | failed | 25% | 4 | Refund, post-mortem |
| Studio C | Alex Lee | 1 (Indie) | 2026-12-01 | — | — | — | — | Awaiting decision |

**Review weekly.** Pilot pipeline visibility — главный risk mitigation.

---

## 10. Pilot budget (Y1)

| Item | Q4 2026 | Q1 2027 | Total Y1 |
|---|---:|---:|---:|
| **Intro call prep (research + outreach)** | 30 hours | 20 hours | 50 hours |
| **Pilot execution (consultant 0.5 нед × 3 pilots)** | 1.5 нед | 1 нед | 2.5 нед |
| **Demo session prep** | 6 hours | 4 hours | 10 hours |
| **Time-savings report writing** | 9 hours | 6 hours | 15 hours |
| **Total internal hours** | ~75 hours | ~50 hours | ~125 hours |
| **Total internal cost (€100/ч blended)** | €7 500 | €5 000 | €12 500 |
| **Expected revenue (3 pilots × €3.5k)** | €7 000 (2 pilots) | €3 500 (1 pilot) | €10 500 |
| **Net (Q4)** | −€500 | +€3 500 | +€3 000 |

**Per pilot:** near-breakeven на Y1. Strategic value = real case studies + product-market fit signal.

**Real ROI:** Q2+ 2027, когда первые 2 pilot-клиента конвертируются в Studio Pack (€22k × 2 = €44k revenue).

---

## Cross-references

- [SALES_OFFER.md](./SALES_OFFER.md) — что продаём, pricing
- [MONETIZATION.md](./MONETIZATION.md) — unit economics, conversion funnel
- [CASE_STUDY.md](./CASE_STUDY.md) — synthetic baseline (обновится после pilot)
- [HONEST_REPLACEMENT_STATUS.md](./HONEST_REPLACEMENT_STATUS.md) — что не обещаем
- [COMPETITIVE_ANALYSIS.md](./COMPETITIVE_ANALYSIS.md) — как позиционировать vs конкурентов
