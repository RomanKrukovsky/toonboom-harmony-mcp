# Client Onboarding

Добро пожаловать в **Harmony Autopilot MCP**. Этот документ проведёт вас через все этапы онбординга — от первого клона репозитория до production-пайплайна на реальном эпизоде.

---

## Что вы получаете

В рамках клиентского пакета:

- **MCP-сервер** для управления Moho Pro из opencode через протокол Model Context Protocol
- **Reference rigs** четырёх типов: humanoid, quadruped, creature, mechanical
- **ShowBible / Character Bible** шаблоны для сериализуемых продакшен-данных
- **Lua-emitter**, который генерирует готовый риг прямо в Moho Pro
- **QA-контур** с авто-evaluate, retake-генерацией и recorder для ручных правок
- **Time-savings report** после каждого прогона — измеримая экономия в часах

---

## Pre-requisites

Перед началом убедитесь, что у вас есть:

| Компонент | Минимум |
|-----------|---------|
| Moho Pro | 14+ (лицензированный) |
| ОС | macOS или Windows |
| RAM | 8 GB |
| Node.js | 18+ |
| Диск | 10 GB свободного места под проекты и логи |

> Если какой-то пункт отсутствует — обратитесь в поддержку (см. раздел **Support** ниже), поможем подобрать окружение.

---

## Setup

### Step 1 — Clone & Build

Скопируйте репозиторий и установите зависимости:

```bash
git clone https://github.com/your-org/harmony-autopilot-mcp.git
cd harmony-autopilot-mcp
npm install
npm run build
```

### Step 2 — Configure paths

Создайте `.env` в корне репозитория и задайте пути к своим проектам через переменную `HARMONY_ALLOWED_ROOTS` (это белый список директорий, в которые MCP-серверу разрешено писать):

```ini
HARMONY_ALLOWED_ROOTS="/Users/you/moho_projects,/Users/you/mcp_workspace"
HARMONY_LOG_DIR="./logs"
```

> Никогда не выставляйте наружу корневую директорию `/` или домашнюю папку целиком — сервер рассчитан на явные project roots.

### Step 3 — Connect MCP

Откройте ваш `opencode.json` (или `~/.config/opencode/opencode.json` для глобальной установки) и добавьте секцию `mcp`:

```json
{
  "mcp": {
    "harmony-autopilot": {
      "type": "stdio",
      "command": "node",
      "args": ["./dist/index.js"],
      "cwd": "/absolute/path/to/harmony-autopilot-mcp"
    }
  }
}
```

Перезапустите opencode — в списке инструментов должны появиться `moho.*`.

### Step 4 — Verify

Запустите фабрику тестов и убедитесь, что все зелёные:

```bash
npm run test:moho_factory
```

Ожидаемый результат: **412+ тестов passed**. Если что-то красное — приложите вывод к баг-репорту в GitHub Issues.

---

## First Scene Tutorial

Самый быстрый путь увидеть систему в работе — прогнать демо-сцену.

1. Скопируйте папку `examples/commercial-demo/` в свой рабочий проект:

   ```bash
   cp -r examples/commercial-demo ~/moho_projects/my_first_scene
   ```

2. Откройте свой проект в Moho Pro и подставьте реальные `ShowBible` и `Character Bible` вместо placeholder-ов (см. следующий раздел).

3. Через opencode вызовите:

   ```
   moho.factory.run_show_bible
   ```

4. В ответе вы получите **preview** отрендеренной сцены и **time-savings report** с метриками: planned minutes vs actual minutes, доля авто-планирования, число retake-ов.

> Если time-savings report пустой — значит фабрика работала, но Mojo-движок не вернул кадров. Проверьте `HARMONY_ALLOWED_ROOTS` и наличие лицензии Moho Pro.

---

## ShowBible Setup

ShowBible — это контракт между арт-дирекцией и автоматизацией. Описывает визуальный язык эпизода: turnaround, palette, mouth chart, lighting keys.

1. **Сгенерируйте шаблон:**

   ```
   moho.show_bible.scaffold
   ```

   Сохраните результат в `assets/show_bible/<your_show>.json`.

2. **Заполните с артист-стилистом.** Минимум:

   - `turnaround` — три четверти / front / side для каждого персонажа
   - `palette` — основной + акцентный + нейтральный цвета
   - `mouth chart` — phoneme → shape маппинг (A, E, I, O, U, M, F, L, S, Rest)
   - `lighting_keys` — 3 ключевых света и их углы

3. **Утвердите у продюсера.** В файле ShowBible у каждой секции есть поле `provenance.approver` — заполните его именем продюсера. Без approver фабрика откажется использовать этот байбл в production-прогоне.

4. **Сохраните** итоговый JSON в `assets/show_bible/` и закоммитьте в git. Это источник правды для всей команды.

---

## Reference Rig Adoption

Когда у вас есть Character Bible, нужно выбрать и построить reference rig.

1. **Выберите тип** под вашего персонажа:

   - `humanoid` — двуногие люди, гуманоиды
   - `quad` — четвероногие (собаки, кони, волки)
   - `creature` — нестандартная анатомия (крылья, хвосты, щупальца)
   - `mechanical` — роботы, машины, твёрдая поверхность

2. **Постройте план:**

   ```
   moho.reference_rig.build_plan
   ```

   Передайте Character Bible как вход — получите JSON-план со списком костей, landmark-ами и контроллерами.

3. **Запустите Lua-emitter.** Он сгенерирует `.moho`-совместимый файл и откроет Moho Pro с готовым ригом:

   ```
   moho.reference_rig.emit_lua
   ```

4. **Проверьте через retargeting:**

   ```
   moho.retargeting.validate_landmarks
   ```

   Все landmark-и должны иметь уникальные имена и попадать в ожидаемые зоны (глаза, рот, плечи, локти, кисти — для humanoid).

---

## Production Workflow

Цикл одного шота выглядит так:

1. **LLM-планирование.** opencode читает скрипт эпизода и вызывает:

   ```
   moho.scene_plan.fingerprint
   ```

   На выходе — уникальный отпечаток сцены (composition, framing, beat timing), который дальше используется как ключ кеша.

2. **Production-прогон.**

   ```
   moho.factory.run_show_bible
   ```

   Фабрика применяет ShowBible ко всем шотам эпизода, использует reference rigs для персонажей и сохраняет `.tvscene` файлы.

3. **QA.**

   ```
   moho.qa.evaluate
   ```

   Авто-оценка по чек-листу (silhouette readable, mouth matches audio, no limb pop). Если что-то не прошло — генерация retake-задач:

   ```
   moho.retake.generate
   ```

4. **Ручные правки.** Для сложных случаев используется recorder — система записывает ваши клики/перетаскивания в Moho Pro и превращает их в воспроизводимые lua-скрипты:

   ```
   moho.recorder.start
   moho.recorder.stop
   moho.recorder.replay
   ```

---

## Support

| Канал | Когда использовать | SLA |
|-------|--------------------|-----|
| **GitHub Issues** | bug reports, feature requests | — |
| **Discord** | real-time help, общение с командой | — |
| **Email enterprise@…** | коммерческие клиенты, NDA-чувствительные темы | — |
| **Pro support** | стандартный SLA | 48 hours response |
| **Enterprise support** | приоритетный SLA | 24 hours response |

При обращении всегда прикладывайте:

- версию MCP-сервера (`npm run --silent version`)
- вывод `moho.system.diagnose`
- последние 200 строк из `HARMONY_LOG_DIR`

---

## Migration Path

Если вы приходите с **manual workflow** (аниматоры рисуют каждый кадр руками в Moho Pro), рекомендуем поэтапный план на 4 недели:

### Week 1 — Foundation

- Поднимите **один reference rig** под вашего главного персонажа
- Прогоните **golden-path**: от Character Bible до готового `.tvscene` с одной сценой
- Оцените time-savings report — должно быть видно сокращение ручных часов

### Week 2 — Proof of concept

- Соберите **3-шотный demo эпизод** (intro → action → outro)
- Привлеките одного аниматора к работе через MCP-контур
- Зафиксируйте метрики: planned minutes vs actual, доля retake-ов

### Week 3 — Pipeline integration

- Свяжите MCP с вашим существующим пайплайном студии (ShotGrid / ftrack / собственный tracker)
- Добавьте auto-export финальных кадров в render-farm
- Настройте ночные прогоны фабрики для bulk-эпизодов

### Week 4 — Full production

- Запустите **30-шотный эпизод** полностью через автоматизацию
- Удерживайте долю ручных правок ниже 20%
- Задокументируйте lessons learned и поделитесь с командой

> После Week 4 у вас будет полностью работающий production-контур. Дальше — масштабирование на остальные шоу и серии.

---

Добро пожаловать на борт. Если что-то пойдёт не так — мы рядом.