# Competitive Analysis — Moho AI Factory

**Продукт:** Moho AI Factory v2 (MCP-сервер)
**Дата:** 2026-08-31
**Версия документа:** v1.0
**Связанные документы:** [SALES_OFFER.md](./SALES_OFFER.md), [MONETIZATION.md](./MONETIZATION.md), [HONEST_REPLACEMENT_STATUS.md](./HONEST_REPLACEMENT_STATUS.md)

---

## 1. TL;DR

Moho AI Factory занимает **уникальную нишу** в animation tooling: это **MCP-сервер для 2D-анимационного pipeline** с детерминированной компиляцией (`ShowBible → PerformancePIR → MohoCommandPlan`) и замкнутым retake-loop через `MohoActionRecorder`.

| Инструмент | Категория | Что делает | Чего НЕ делает | Цена (2026) |
|---|---|---|---|---:|
| **Moho AI Factory** | AI 2D-animation pipeline | 78% рутины, frozen show, 4 reference-rigа | Universal AI animator, новые стили, без human approver | €2.5k–€45k |
| **Cavalry** | Procedural 2D animation | Live-движок для моушн-графики и эффектов | Не AI, не character animation, не lipsync | €240/год |
| **Adobe Character Animator** | Real-time puppet | Live capture с веб-камеры для стилизованных puppets | Не для keyframe animation, не для сложных сцен | €60/мес (CC all apps) |
| **Toon Boom Producer** | Production management | Project tracking, asset management, render queue | Не AI, не character rig, не lipsync | Custom (€10k+/год) |
| **Frame.io** | Video review/collaboration | Комментарии к видео, version control | Не animation, не render, не rig | Custom (€20+/user/мес) |
| **Plask** | AI motion capture | 2D character animation из видео | Не production pipeline, не deterministic, не Moho-specific | $30/мес |
| **Cascadeur** | AI-assisted keyframe | Physics-aware posing для keyframe animation | Не lipsync, не 2D cut-out, не MCP-сервер | $25/мес |
| **Moho Pro** (базовый) | 2D animation software | Сам редактор с bones, mesh-warp, smart-bones | Нет AI, нет pipeline automation | $69.99 один раз |

**Главный insight:** Moho AI Factory — **не конкурент** Cavalry или Character Animator
(они решают другие задачи). Это **production pipeline поверх Moho Pro**, а не
замена редактора. Клиенты покупают **Moho Pro** для редактирования и **Moho AI
Factory** для автоматизации рутины.

---

## 2. Детальное сравнение

### 2.1 Cavalry (https://cavalry.scenegroup.co)

| Параметр | Cavalry | Moho AI Factory |
|---|---|---|
| **Категория** | Procedural motion graphics | Production pipeline для 2D characters |
| **Strengths** | Live-движок, real-time preview, скрипты на JS | Детерминированная сборка ригов, lipsync, retake loop |
| **Weaknesses** | Нет keyframe animation, нет lip-sync, нет rigged characters | Требует Moho Pro для редактирования |
| **Use case** | Music video loops, data viz, motion graphics | Сериальная 2D-анимация с персонажами |
| **AI/ML** | Нет (procedural, не AI) | ShowBible-constrained AI, lipsync через phoneme detection |
| **Determinism** | Полный (procedural engine) | Полный (SHA-256 fingerprints, 370+ тестов) |
| **Integration** | Standalone, экспорт JSON/render | MCP-сервер, интеграция с Moho через Lua + Python API |
| **Pricing** | €240/год Indie / €720/год Pro | €2.5k–€45k enterprise B2B |

**Когда клиент выбирает Cavalry:** делает music video / data viz / motion graphics без персонажей.

**Когда клиент выбирает Moho AI Factory:** делает сериальный 2D-контент с персонажами, говорит, нужно lip-sync, нужны repeatable rigs.

**Overlap:** минимальный. Cavalry и Moho решают разные задачи.

### 2.2 Adobe Character Animator (CH)

| Параметр | CH | Moho AI Factory |
|---|---|---|
| **Категория** | Real-time webcam-driven puppet | Production-grade 2D animation pipeline |
| **Strengths** | Live capture (face, body, voice), быстрый результат | Детерминированный pipeline, встроен в Moho, lipsync + retake loop |
| **Weaknesses** | Puppet-quality, не для сериальной keyframe-анимации; «uncanny valley» на сложных сценах | Требует Moho Pro лицензию; не real-time |
| **Use case** | YouTube-канал, объясняющие видео, корпоративный training | Сериальная анимация, branded content, pilot episodes |
| **AI/ML** | Live ML-модели для face/body/voice capture | ShowBible-constrained AI, lip-sync, motion grammar |
| **Determinism** | Нет (live capture всегда немного разный) | Полный (SHA-256) |
| **Pricing** | €60/мес (CC all apps) | €2.5k–€45k |

**Когда CH:** YouTube-аниматор, объясняющие ролики, internal training videos, где неважен keyframe-quality.

**Когда Moho AI Factory:** студия делает сериал / branded content, нужна актёрская игра, keyframe-качество, повторяемость между эпизодами.

**Overlap:** небольшой. CH дешевле в entry point (€60/мес vs €2.5k), но не масштабируется до production-quality.

### 2.3 Toon Boom Producer (TB Producer)

| Параметр | TB Producer | Moho AI Factory |
|---|---|---|
| **Категория** | Production management для TB Harmony | Animation pipeline (rig + animation + render + QA) |
| **Strengths** | Tracking, asset management, version control, render queue | 78% automation рутины, deterministic, AI-assisted |
| **Weaknesses** | Не делает саму анимацию; не AI; дорого для indie | Требует Moho Pro (не Harmony); production management out of scope |
| **Use case** | Управление проектом в студии 50+ FTE | Ускорение работы animator + rigger |
| **AI/ML** | Нет | Да (ShowBible-constrained) |
| **Pricing** | Custom, €10k+/год enterprise | €2.5k–€45k |

**Отношение:** **комплементарные**, не конкуренты. TB Producer управляет проектом;
Moho AI Factory ускоряет animator. Студия может использовать **оба**.

**Когда TB Producer:** нужна организация pipeline на 50+ FTE.

**Когда Moho AI Factory:** нужен throughput на одного senior animator.

**Совместное использование:** Moho AI Factory эмитит `.xstage` (через Harmony
bridge) или `.moho` файлы, TB Producer трекает их в production tracker.

### 2.4 Frame.io (Adobe-owned)

| Параметр | Frame.io | Moho AI Factory |
|---|---|---|
| **Категория** | Video review/collaboration | Animation pipeline |
| **Strengths** | Комментарии к таймлайну, approval workflow, version control | Animation rig + lipsync + retake loop |
| **Weaknesses** | Не animation, не render, не rig | Не review tool (но может экспортировать в Frame.io) |
| **Use case** | Review аппрув между режиссёром и студией | Сборка и рендер сцены |
| **Pricing** | Custom (€20+/user/мес) | €2.5k–€45k |

**Отношение:** **комплементарные**. Moho AI Factory рендерит в MP4 → Frame.io для review.

**Когда Frame.io:** студия работает с distributed team, нужен video review.

**Когда Moho AI Factory:** нужна автоматизация production, а не только review.

### 2.5 Plask (https://plask.ai)

| Параметр | Plask | Moho AI Factory |
|---|---|---|
| **Категория** | AI motion capture для 2D characters | Production pipeline |
| **Strengths** | Быстрый mocap из видео, web-based | Deterministic, MCP-API, retake loop, ShowBible constraints |
| **Weaknesses** | Не production-grade, нет pipeline automation, не deterministic | Не mocap tool |
| **Use case** | Quick mocap для YouTube, indie shorts | Сериальная анимация с повторяемостью |
| **AI/ML** | Diffusion-based mocap | ShowBible-constrained AI |
| **Determinism** | Нет (ML probabilistic) | Да (SHA-256) |
| **Pricing** | $30/мес | €2.5k–€45k |

**Когда Plask:** инди-аниматор делает YouTube-канал, нужна быстрая анимация.

**Когда Moho AI Factory:** студия делает сериал, нужна предсказуемость + retake loop.

**Overlap:** Plask рендерит в MP4 / Lottie, не в Moho. Moho AI Factory может **подключить** Plask как mocap-source через MCP integration, если будет спрос.

### 2.6 Cascadeur (https://cascadeur.com)

| Параметр | Cascadeur | Moho AI Factory |
|---|---|---|
| **Категория** | AI-assisted 3D keyframe posing | 2D production pipeline |
| **Strengths** | Physics-aware auto-posing, ML-assisted keyframe | 2D character rig + lipsync + retake loop |
| **Weaknesses** | Только 3D, не для cut-out, не для lip-sync | Не 3D |
| **Use case** | 3D character animation (game/film) | 2D cut-out animation (сериал) |
| **Pricing** | $25/мес (Pro) / $600/год | €2.5k–€45k |

**Отношение:** **разные media** (3D vs 2D), прямого overlap нет. Студия может использовать оба для разных проектов.

### 2.7 Moho Pro (базовый, без AI)

| Параметр | Moho Pro | Moho AI Factory |
|---|---|---|
| **Категория** | 2D animation software (редактор) | MCP automation поверх Moho Pro |
| **Strengths** | Bone rigging, mesh-warp, smart-bones, vector tools | Автоматизация рутины, deterministic, lipsync, retake |
| **Weaknesses** | Manual pipeline, не AI | Требует Moho Pro (не самостоятельный) |
| **Use case** | Ручная анимация | Автоматизация поверх Moho |
| **Pricing** | $69.99 (один раз) | €2.5k–€45k |

**Отношение:** Moho AI Factory — **надстройка** поверх Moho Pro. Клиент покупает оба.

**Без Moho Pro** Moho AI Factory работает только в `offline_dry_run` режиме
(компилирует PIR и CommandPlan, не выполняет рендер). Это by design — фабрика
не симулирует реальный Moho.

---

## 3. Конкурентное позиционирование

### 3.1 Матрица «AI vs Procedural vs Manual»

```
                  AI-driven
                     ↑
                     │
   Plask ●           │           ● Moho AI Factory
                     │              (но bounded ShowBible)
                     │
   ──────────────────┼──────────────────→ Production-grade
                     │
   ● Character       │           ● Cascadeur
     Animator        │             (3D keyframe AI)
                     │
   ● Cavalry         │           ● Moho Pro
     (procedural,    │             (manual, foundational)
      not AI)        │
                     │
                  Manual
```

**Moho AI Factory = единственный инструмент в правом верхнем углу:**
- AI-driven (lipsync, motion grammar, retake-translation).
- Production-grade (deterministic, MCP, episode-batch).
- Bounded (frozen show, 4 rig types).

### 3.2 Уникальное ценностное предложение (UVP)

> **«Moho AI Factory — это MCP-сервер, который превращает Moho Pro в production
> pipeline с 78% автоматизацией рутины. Супервайзер управляет 3–5× больше
> шотов в неделю, фокусируясь на актёрской игре, а не на in-betweens.»**

Три ключевых слова, которых нет у конкурентов:

1. **MCP-сервер** — programmatic API, не GUI tool. Интегрируется в любой
   production pipeline.
2. **ShowBible-bounded** — гарантированная согласованность между шотами через
   machine-readable стандарт.
3. **Retake loop** — каждое ручное исправление превращается в dataset entry
   для следующих итераций.

### 3.3 Анти-позиционирование (vs что мы НЕ)

- **Не «универсальный AI animator»** — это Cavalry / Cascadeur.
- **Не «real-time capture»** — это Character Animator.
- **Не «production management»** — это TB Producer.
- **Не «video review»** — это Frame.io.
- **Не «только для больших студий»** — Starter Pilot от €2.5k доступен indie.
- **Не «заменяет аниматора»** — заменяет рутину, оставляет творчество.

---

## 4. Когда клиент НЕ наш

Честный список анти-use-cases, чтобы sales-команда не тратила время:

| Клиент хочет | Лучший выбор | Почему не Moho AI Factory |
|---|---|---|
| Music video loop без персонажей | Cavalry | Нет keyframe character animation |
| 3D character animation | Cascadeur / Maya / Blender | Только 2D cut-out |
| YouTube channel с face puppet | Character Animator | Real-time webcam, не production |
| Video review для distributed team | Frame.io | Не animation tool |
| Enterprise production management 50+ FTE | TB Producer | Не включает production tracking |
| Quick motion capture из видео | Plask | Не deterministic, не Moho-specific |
| «AI заменит аниматоров» | (любой AI-инструмент) | Все overpromise, мы честно говорим 78% рутины |

**Sales-команда:** если клиент хочет любое из выше — politely redirect, не
пытайтесь продать. Trust contract дороже одной сделки.

---

## 5. Конкурентные риски и мониторинг

### 5.1 Кто может войти в нишу

| Потенциальный entrant | Risk | Почему ещё не вошли | Наш moat |
|---|---|---|---|
| **Adobe** (Character Animator + AI) | High | Adobe не делает cut-out / Moho integration | Moho-specific 4 reference-rigа + ShowBible |
| **Toon Boom** (Harmony AI) | High | TB сфокусирован на Harmony, не Moho | Moho-specific Lua emitter + retake loop |
| **Plask** (MCP integration) | Medium | Plask — mocap, не production pipeline | Episode-batch runner + ShowBible |
| **Cavalry** (character animation) | Low | Cavalry — procedural, не AI | AI + ShowBible-bounded |
| **Indie open-source (Blender + AI)** | Medium | Blender — 3D, нет 2D cut-out equivalent | 2D-specific 4 rig-types + lipsync |

**Главный moat:** **ShowBible как machine-readable стандарт** + **retake dataset
loop** (каждое ручное исправление улучшает систему). Это требует 2+ лет
accumulated data — новый entrant не сможет воспроизвести.

### 5.2 Метрики для мониторинга

| Метрика | Как tracking | Когда alarm |
|---|---|---|
| Появление нового AI cut-out tool | Indie animation subreddits, Animation Magazine | Если кто-то выпустит Moho AI Factory alternative |
| Cavalry character animation module | Cavalry release notes | Если Cavalry добавит keyframe character animation |
| Adobe Character Animator + Moho integration | Adobe MAX announcements | Если Adobe анонсирует Moho support |
| Toon Boom AI features | TB World Conf | Если TB выпустит AI для Harmony (тогда — threat) |

Review quarterly: Q1 / Q2 / Q3 / Q4.

---

## 6. Pricing comparison table

| Tool | Indi price | Studio price | Enterprise price | Pricing model |
|---|---:|---:|---:|---|
| **Moho AI Factory** | €399 (Rig Bundle) | €22k (Studio Pack) | €45k+ (Pro) | One-time + retainer |
| **Cavalry** | €240/год | €720/год | Custom | Subscription |
| **Character Animator** | €60/мес | €60/мес/user | Custom (CC Enterprise) | Subscription per seat |
| **TB Producer** | — | €10k+/год | Custom | Subscription per studio |
| **Frame.io** | — | €20+/user/мес | Custom | Subscription per seat |
| **Plask** | $30/мес | $60/мес | Custom | Subscription |
| **Cascadeur** | $25/мес | $50/мес | Custom | Subscription |
| **Moho Pro** | $69.99 (one-time) | $69.99 | $69.99 | Perpetual license |

**Позиционирование:** Moho AI Factory — **premium B2B** (€2.5k–€45k), не
конкурирует с €30/мес Plask или €60/мес Character Animator. Целевой клиент
готов платить за **production-grade pipeline**, не за **инди-инструмент**.

---

## 7. Sales talking points (vs каждый конкурент)

### 7.1 vs Cavalry
> «Cavalry отлично подходит для music video loop. У нас другая задача —
> сериальная 2D-анимация с персонажами, lip-sync, повторяемость между эпизодами.
> Cavalry этого не делает, и мы не пытаемся.»

### 7.2 vs Character Animator
> «Character Animator — для YouTube-канала, объясняющих роликов, internal
> training. У нас — для студий, которые делают branded content или сериалы,
> где важна актёрская игра и keyframe-качество.»

### 7.3 vs TB Producer
> «TB Producer управляет проектом, Moho AI Factory автоматизирует работу
> аниматора. Это разные задачи. Большинство наших клиентов используют оба.»

### 7.4 vs Plask
> «Plask — motion capture, мы — production pipeline. Если вам нужен быстрый
> mocap для YouTube, Plask дешевле. Если вам нужен deterministic pipeline
> для 100+ шотов с approval-checkpoint — мы.»

### 7.5 vs Cascadeur
> «Cascadeur — 3D. Moho AI Factory — 2D cut-out. Если у вас 3D-проект,
> Cascadeur; если 2D — мы.»

### 7.6 vs «просто нанять аниматоров»
> «Один senior animator + Moho AI Factory = throughput 3–5× выше, чем один
> senior + команда рутины. Если у вас уже есть команда — фабрика усиливает
> их, не заменяет. Если у вас нет команды — фабрика не поможет, нужен хотя
> бы один senior для approval-checkpoint.»

---

## 8. Резюме

**Moho AI Factory = уникальная ниша** между AI-инструментами (Plask, Cascadeur)
и production management (TB Producer, Frame.io). Это **MCP-сервер для 2D
character animation** с детерминированной компиляцией и retake-loop.

Главные конкурентные преимущества:
1. **MCP API** (programmatic, не GUI).
2. **ShowBible-bounded** (гарантированная согласованность).
3. **Retake loop** (learning от каждого ручного исправления).
4. **4 reference-rigа** (стартовая точка для нового проекта за часы).
5. **Honest positioning** (78% рутины, не 100% замены).

---

## Cross-references

- [SALES_OFFER.md](./SALES_OFFER.md) — коммерческое предложение
- [MONETIZATION.md](./MONETIZATION.md) — pricing tiers и unit economics
- [HONEST_REPLACEMENT_STATUS.md](./HONEST_REPLACEMENT_STATUS.md) — что фабрика НЕ заменяет
- [CASE_STUDY.md](./CASE_STUDY.md) — реальные/планируемые кейсы
- [PILOT_INTERVIEW_GUIDE.md](./PILOT_INTERVIEW_GUIDE.md) — как провести первые 3 pilot-интервью
