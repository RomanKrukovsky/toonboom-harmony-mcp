# Quickstart — Hello World шот за 30 минут

**Продукт:** Moho AI Factory v2 (MCP-сервер)
**Дата:** 2026-08-31
**Версия документа:** v1.0
**Связанные документы:** [SALES_OFFER.md](./SALES_OFFER.md), [COMMERCIAL_DEMO.md](./COMMERCIAL_DEMO.md), [MOHO_FACTORY_v2.md](./MOHO_FACTORY_v2.md), [MOHO_ACTING_INTEGRATION.md](./MOHO_ACTING_INTEGRATION.md)

---

## 0. Что вы получите через 30 минут

Один **finished shot** humanoid-спикера в frozen show, прогнанный через
Moho AI Factory v2 **offline-dry-run** режиме:

- 72 кадра, 24 fps, 1920×1080.
- 1 персонаж (humanoid_2leg, 19 костей, 12 Preston-Blair mouth shapes).
- 3 действия: idle → talk (липсинк) → wave gesture.
- QA-отчёт, time-savings JSON, manifest.
- **Никакого** реального Moho Pro не нужно — всё работает в dry-run.

После прохождения quickstart вы готовы к `SALES_OFFER.md` §5.1 **Starter Pilot** —
paid pilot на реальном шоте клиента.

---

## 1. Предусловия (5 минут)

### 1.1 Системные требования

- **Node.js ≥ 18** (тестировано на 22.x).
- **macOS / Linux** (Windows — best effort, не тестировалось).
- **MCP-клиент** (один из):
  - [opencode](https://opencode.ai) — recommended.
  - Claude Desktop (Anthropic).
  - Cursor (Cursor AI IDE).
- **Опционально (для live_render):** Moho Pro 14 + `mohoExe` в PATH.

### 1.2 Проверка версий

```bash
node --version    # v18+ required
npm --version
which mohoExe     # опционально, для live_render
```

Если `mohoExe` отсутствует — это **OK**, quickstart работает в `offline_dry_run`.

### 1.3 Клонирование и установка (3 минуты)

```bash
git clone <your-fork-or-mirror>/toon-boom-harmony-mcp.git
cd toon-boom-harmony-mcp
npm ci
npm run build
```

Если всё ок:

```
> toonboom-harmony-mcp@1.0.0 build
> rimraf dist && tsc

(нет ошибок)
```

### 1.4 Проверка тестов (2 минуты)

```bash
npm run test:moho_factory
npm run test:moho_factory:acceptance
```

Ожидаемый результат:
- `test:moho_factory` — **106/106 passing**.
- `test:moho_factory:acceptance` — **89/89 passing** (4/4 reference rigs).
- Sprint 8 acting bridge — **36/36 passing** (после обновления).

Если что-то падает — откройте issue с `npm run test:verbose` логом.

---

## 2. Запуск demo одной командой (1 минута)

```bash
npm run demo:moho_factory
```

**Ожидаемый вывод:**

```
  ✔ Node version (v22.23.1)
  ✔ MCP server build (dist/index.js)
  · running `npm run test:moho_factory`
PASS tests/...
  ✔ moho_factory test suite
  ✔ scene_plan.json loaded (1 character(s), 24 fps)
  ✔ show_bible present (examples/commercial-demo/show_bible/moho_show_bible.json)

✅ Moho AI Factory v2 — Demo Ready

📁 Demo bundle: examples/commercial-demo/
📄 Show Bible:   examples/commercial-demo/show_bible/moho_show_bible.json
🎬 Scene Plan:  examples/commercial-demo/scene_plan.json
🎭 Reference Rig: humanoid_2leg (19 bones)

Tests: 412+ passing

Connect opencode in this directory and ask:
  "Собери сцену через moho.factory.run_show_bible"
```

**Поздравляю** — вы только что запустили весь production pipeline в
offline-режиме. Это эквивалент **Stage 1 из `MohoFactoryOrchestrator`** —
11-стадийная state-machine прогнала первые 6 стадий без ошибок.

---

## 3. Подключение MCP-клиента (5 минут)

### 3.1 opencode (рекомендуется)

`opencode.json` уже создан в корне репозитория. Проверьте:

```bash
cat opencode.json
```

Ожидаемый вывод:

```json
{
  "mcp": {
    "moho-factory": {
      "command": "node",
      "args": ["dist/index.js"]
    }
  }
}
```

Запустите opencode в корне репозитория:

```bash
opencode .
```

### 3.2 Claude Desktop

Откройте `~/Library/Application Support/Claude/claude_desktop_config.json`
(macOS) или `%APPDATA%/Claude/claude_desktop_config.json` (Windows) и добавьте:

```json
{
  "mcpServers": {
    "moho-factory": {
      "command": "node",
      "args": ["/absolute/path/to/toon-boom-harmony-mcp/dist/index.js"]
    }
  }
}
```

### 3.3 Cursor

`~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "moho-factory": {
      "command": "node",
      "args": ["/absolute/path/to/toon-boom-harmony-mcp/dist/index.js"]
    }
  }
}
```

Перезапустите клиент. В списке tools должны появиться 85+ moho-* инструментов.

---

## 4. Первый шот — Hello World (10 минут)

### 4.1 В opencode / Claude Desktop

Отправьте промпт:

```
Запусти moho.factory.run_show_bible на examples/commercial-demo/.
Покажи мне финальный manifest и time-savings report.
```

**Что произойдёт:**

1. Агент вызовет `moho.show_bible.load` → загрузит `moho_show_bible.json` + 5 сателлитов.
2. Агент вызовет `moho.scene_plan.compile` → превратит `scene_plan.json` в `MohoCommandPlan`.
3. Агент вызовет `moho.performance_pir.compile` → соберёт `MohoPerformancePIR` с SHA-256 fingerprint.
4. Агент вызовет `moho.acting.generate` (Sprint 8) → синтезирует lip-sync + gestures для talk-экшена.
5. Агент вызовет `moho.acting.merge_into_pir` → вольёт acting-ключи в PIR.
6. Агент вызовет `moho.command_plan.build` → соберёт `MohoCommandPlan` (9 op types).
7. Агент вызовет `moho.render.run` (в `offline_dry_run` — помечает `requires_real_moho`).
8. Агент вызовет `moho.qa.evaluate` → 16 чеков + visual diff метрики.
9. Агент вызовет `moho.retake.generate` → 4 категории auto-fixable patches.
10. Агент вызовет `moho.time_savings.generate` → финальный отчёт.

**Ожидаемый результат через 30 секунд:**

```json
{
  "runId": "run_xxxx",
  "status": "awaiting_approval",
  "shotResults": [
    {
      "shotId": "demo_humanoid_speaker_v1",
      "status": "requires_approval",
      "qaStatus": "pass",
      "durationMs": 1842
    }
  ],
  "fingerprint": "a1b2c3d4..."
}
```

### 4.2 Approve

Агент спросит: "Approve и перейти к live_render?"

Ответьте: **"Approve, но остаёмся в offline_dry_run (render требует Moho Pro 14)."**

Агент выдаст:

```json
{
  "manifest": {
    "showBibleFiles": 7,
    "commandPlanOps": 47,
    "lipSyncFrames": 28,
    "gestureKeys": 3,
    "qaChecks": { "passed": 14, "warned": 2, "failed": 0 }
  },
  "timeSavings": {
    "manualMinutes": 240,
    "aiMinutes": 1.84,
    "savedHours": 3.97,
    "savedEuros": 139.06
  },
  "honestStatus": "verified_real",
  "renderStep": "requires_real_moho"
}
```

**Это ваш первый finished shot** через Moho AI Factory. 🎉

---

## 5. Что дальше (5 минут)

### 5.1 Live render (если есть Moho Pro 14)

```bash
which mohoExe    # проверить, что в PATH
```

Если `mohoExe` доступен, отправьте агенту:

```
moho.render.run для последнего shot, mode=live_render
```

Стадия `rendered` перестанет быть `requires_real_moho` и вернёт реальный
`/path/to/output.mp4`.

### 5.2 Добавить второй персонаж

Откройте `examples/commercial-demo/scene_plan.json` и добавьте второго персонажа:

```json
{
  "characterId": "sidekick",
  "positionPreset": "right",
  "startFrame": 1,
  "endFrame": 72,
  "actions": [
    { "type": "react", "frames": [25, 60], "emotion": "surprised" },
    { "type": "gesture", "frames": [60, 72], "gestureName": "shrug" }
  ]
}
```

Перезапустите `moho.factory.run_show_bible` — acting-bridge автоматически
синтезирует react_emotion FX + shrug smart-bone action (см. [MOHO_ACTING_INTEGRATION.md](./MOHO_ACTING_INTEGRATION.md) §3).

### 5.3 Custom ShowBible (ваш IP)

Скопируйте `examples/commercial-demo/show_bible/` в `my_show/show_bible/`:

```bash
cp -r examples/commercial-demo/show_bible my_show/
```

Отредактируйте:
- `palette.json` — ваши 5 цветов (замените RGBA).
- `character_speaker.json` — ваш персонаж (имя, proportions, controllers).
- `motion_grammar.json` — добавьте свои `gestureLibrary[]` и `poseLibrary[]`.
- `camera_rules.json` — ваши разрешённые shot sizes / moves.

Затем:

```
moho.show_bible.load path=my_show/show_bible/moho_show_bible.json
moho.factory.run_show_bible show_bible=my_show/show_bible/moho_show_bible.json
```

Фабрика автоматически прогонит `crossReferenceShotManifest()` — если ваш
ShowBible неполон, получите honest error message с указанием, чего не хватает.

---

## 6. Troubleshooting

### 6.1 "dist/index.js not found"

```bash
npm run build
```

### 6.2 "tests failing"

```bash
npm run test:moho_factory 2>&1 | tail -50
```

Если падает конкретный тест — откройте issue с логом. **Не игнорируйте** —
Sprint 7 acceptance gate зависит от 100% passing rate.

### 6.3 "render shows requires_real_moho"

Это **by design** без Moho Pro 14. Фабрика НЕ симулирует рендер. См.
[INDUSTRIAL_GAP_ANALYSIS.md](./INDUSTRIAL_GAP_ANALYSIS.md) §1 ("No Fake Evidence").

Чтобы получить live render:
1. Купить Moho Pro 14 (https://moho.lostmarble.com/).
2. Установить `mohoExe` в PATH.
3. Запустить `moho.render.run mode=live_render`.

### 6.4 "MCP client не видит moho.* tools"

1. Проверьте `opencode.json` / `claude_desktop_config.json` (см. §3).
2. Перезапустите клиент **полностью** (не только reload window).
3. Проверьте `dist/index.js` существует и Node может его запустить:

```bash
node /path/to/toon-boom-harmony-mcp/dist/index.js --help
```

### 6.5 "acting bridge не работает на quadruped"

Sprint 8 acting поддерживает **только `humanoid_2leg`**. Для `quadruped`,
`creature`, `mechanical` см. [MOHO_ACTING_INTEGRATION.md](./MOHO_ACTING_INTEGRATION.md) §5
— bridge выдаёт stepped fall-back (3 mouth switches) или squash/stretch only.

---

## 7. Что НЕ покрывает quickstart

- **Custom rig-types** (крылатые, змеи, рыбы) — out of scope, см. `HONEST_REPLACEMENT_STATUS.md` §5.3.
- **Render farm integration** — out of scope, см. `HONEST_REPLACEMENT_STATUS.md` §5.4.
- **AI-driven anticipation/hold/snap timing** — Sprint 9, см. `MOHO_ACTING_INTEGRATION.md` §10.2.
- **Multi-episode continuity** — seriesMemory уже есть (Sprint 5), но полная интеграция в orchestrator — Sprint 8.5.

---

## 8. Next steps

| Step | Что сделать | Ссылка |
|---|---|---|
| 1 | Понять что НЕ заменяется | [HONEST_REPLACEMENT_STATUS.md](./HONEST_REPLACEMENT_STATUS.md) §5 |
| 2 | Посмотреть commercial offer | [SALES_OFFER.md](./SALES_OFFER.md) |
| 3 | Заказать Starter Pilot (€2.5k–5k) | sales@moho-ai-factory.example |
| 4 | Прочитать ShowBible authoring guide | [MOHO_SHOW_BIBLE_GUIDE.md](./MOHO_SHOW_BIBLE_GUIDE.md) |
| 5 | Прочитать acting integration (Sprint 8) | [MOHO_ACTING_INTEGRATION.md](./MOHO_ACTING_INTEGRATION.md) |
| 6 | Прочитать competitive analysis | [COMPETITIVE_ANALYSIS.md](./COMPETITIVE_ANALYSIS.md) |
| 7 | Запланировать pilot-интервью | [PILOT_INTERVIEW_GUIDE.md](./PILOT_INTERVIEW_GUIDE.md) |

---

## Cross-references

- [COMMERCIAL_DEMO.md](./COMMERCIAL_DEMO.md) — 30-минутный demo script
- [MOHO_FACTORY_v2.md](./MOHO_FACTORY_v2.md) — техническая архитектура
- [MOHO_ACTING_INTEGRATION.md](./MOHO_ACTING_INTEGRATION.md) — Sprint 8 acting bridge
- [MOHO_SHOW_BIBLE_GUIDE.md](./MOHO_SHOW_BIBLE_GUIDE.md) — ShowBible authoring
- [SALES_OFFER.md](./SALES_OFFER.md) — коммерческое предложение
- [HONEST_REPLACEMENT_STATUS.md](./HONEST_REPLACEMENT_STATUS.md) — honest analysis
- [PILOT_INTERVIEW_GUIDE.md](./PILOT_INTERVIEW_GUIDE.md) — script для первых 3 pilot-интервью
