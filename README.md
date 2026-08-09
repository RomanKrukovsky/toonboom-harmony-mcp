<p align="center">
  <img src="docs/images/harmony_mcp_interface.png" alt="Toon Boom Harmony MCP Server" width="900"/>
</p>

# Toon Boom Harmony MCP Server

MCP-сервер (Model Context Protocol) промышленного уровня для автоматизации работы с Toon Boom Harmony и Harmony Server.

## Честный статус проекта

> **Умный офлайн-планировщик и каркас анимационного компилятора, который видит Harmony, но ещё не доказал управление сценой внутри неё.**

Реальная интеграция с Harmony (CLI, Control Center Telnet/Batch, Python API) покрывает часть инструментов; остальные работают в режиме симуляции и честно помечают результат `simulation_success` / `simulated: true`. Полный разбор того, что доказано на реальной Harmony, а что нет:
- [REALITY_CHECK.md](docs/REALITY_CHECK.md) — статус продукта и границы возможностей
- [VERIFIED_CURRENT_STATE.md](docs/VERIFIED_CURRENT_STATE.md) — проверенное состояние по подсистемам
- [VERIFIED_TOOL_MATRIX.md](docs/VERIFIED_TOOL_MATRIX.md) — матрица верификации инструментов

## Архитектура и рабочий процесс

<p align="center">
  <img src="docs/images/harmony_mcp_workflow_ui.png" alt="Toon Boom Harmony MCP Server Workflow" width="900"/>
</p>

Сервер выступает интеллектуальным мостом, позволяющим AI-ассистентам (таким как Claude, Cursor и др.) напрямую взаимодействовать с инструментами автоматизации Toon Boom Harmony:
- **Интеграция с Control Center (Telnet/Batch)**: для работы с серверной инфраструктурой сцен и проектов.
- **Harmony Python API**: для манипуляций с нодами, таймлайном и параметрами сцены.
- **SQLite БД**: для независимого локального трекинга задач и пайплайна.

## Функциональные возможности

- **Интеграция с Control Center (Telnet и Batch)**: Безопасное создание окружений, проектов (jobs), сцен, управление версиями, блокировка сцен, а также импорт и экспорт архивных пакетов.
- **Интеграция с Harmony Python API**: Управление локальным деревом нод, связывание портов, изменение значений атрибутов, проставление ключевых кадров на таймлайне и сохранение сцен.
- **Управление рендерингом**: Добавление сцен в очередь Harmony Server и запуск локального рендеринга и фоновой автовекторизации рисунков.
- **Локальный трекер задач (SQLite)**: Легковесный инструмент отслеживания статусов производства (проекты, эпизоды, сиквенсы, кадры, задачи, ресурсы, заметки) в условиях отсутствия Toon Boom Producer.
- **Многоуровневая безопасность**: Ограничение путей файловой системы (`HARMONY_ALLOWED_ROOTS`), симуляция выполнения (dry-run по умолчанию) и токены подтверждения для опасных (деструктивных) операций.
- **Scene Intelligence и AI Director**: разбор драматических битов и создание разных вариантов постановки.
- **Voice & Performance**: локальный анализ WAV, пауз, энергии и высоты голоса; создание вариантов взгляда, жестов, мимики, дыхания и реакций. Это постановочные планы, а не готовая нативная анимация.

## Автоматизация production-пайплайна

<p align="center">
  <img src="docs/images/harmony_mcp_production_ui.png" alt="Toon Boom Harmony MCP Server Production Pipeline" width="900"/>
</p>

## Быстрый старт

### 1. Установка зависимостей и сборка
```bash
npm ci
npm run build
python3.9 -m venv .venv-reconstruction
.venv-reconstruction/bin/pip install -r services/reconstruction-core/requirements.lock
.venv-reconstruction/bin/pip install -e services/reconstruction-core --no-deps
```

### 2. Запуск тестов
```bash
npm test
npm run test:python
```

### 3. Запуск MCP-сервера
```bash
npm run start
```

## Два хоста: Harmony и Moho

Сервер обслуживает два пакета анимации. Активный выбирается переменной
`ANIM_HOST` при запуске:

```bash
npm run start        # 570 тулов harmony.* (по умолчанию)
npm run start:moho   #  59 тулов moho.*
```

Скрипт `start:moho` просто задаёт `ANIM_HOST=moho`. На Windows префикс
переменной перед командой не работает — пропишите `ANIM_HOST=moho` в `.env`
либо используйте `set ANIM_HOST=moho && npm run start`.

Отдаётся ровно один набор, никогда оба. Причина простая: 629 описаний тулов
уходят в контекст модели при каждом запуске и ухудшают выбор тула, а человек
всё равно работает в одном пакете.

Опечатка в `ANIM_HOST` останавливает запуск с явным сообщением — тихий откат к
Harmony означал бы 570 чужих тулов вместо запрошенных 59 без объяснения.

Установка Lua-плагина в Moho и прогон только Moho-тестов:

```bash
npm run install:moho-plugin
npm run test:moho
```

Про режим Moho: папка обмена, подтверждение разрушающих операций и **что
именно проверено, а что нет** — в [docs/MOHO.md](docs/MOHO.md). Подключение
сервера к клиенту — в [docs/MCP_SETUP.md](docs/MCP_SETUP.md).


Для реконструкции видео сначала запустите отдельный CPU core:

```bash
npm run reconstruction:core
```

Проверяемое демо без Harmony:

```bash
npm run demo:reconstruction
npm run demo:ai_studio_iter1
npm run demo:ai_studio_iter2
npm run demo:factory:phase1
```

Демо создаёт настоящий MP4, извлекает кадры, строит уникальные векторные drawings, палитру, exposures и валидный манифест. Если Harmony не установлена, результат честно помечается `harmonyApplied: false`.

Демо Iteration 2 создаёт тестовый WAV, реально измеряет его энергию и высоту, строит три варианта актёрской игры и сохраняет автономный HTML-отчёт в `output/ai_studio/iteration2_demo_report.html`.

## Как запустить мост Control Center MCP

Для работы в режиме Harmony Server запустите сервер сценариев Control Center на хост-машине:

**Linux / macOS**:
```bash
export TOONBOOM_REMOTE_SCRIPT=1234
Controlcenter -script -tcpPort 1234
```

**Windows**:
```bat
SET TOONBOOM_REMOTE_SCRIPT=1234
Controlcenter.exe -script -tcpPort 1234
```

Настройте параметры подключения в файле `.env`:
```env
HARMONY_CC_HOST=127.0.0.1
HARMONY_CC_PORT=1234
HARMONY_CC_USER=usabatch
HARMONY_DRY_RUN_DEFAULT=true
HARMONY_ALLOW_DESTRUCTIVE=false
```

> [!WARNING]
> **Никогда не удаляйте и не переименовывайте пользователя `usabatch`!** Данная системная учетная запись используется внутренними службами Harmony для выполнения пакетных задач рендеринга и векторизации.

## Документация (на русском языке)

Подробное руководство находится в папке [docs](docs/):
- [База Знаний Курса по Риггингу (13 Уроков)](docs/internal/research/playlist_knowledge_base.md)
- [Инструкции и Workflow Плейлиста для Агента](docs/PLAYLIST_WORKFLOWS.md)
- [Инструкция по установке](docs/INSTALL.md)
- [Руководство по конфигурации](docs/CONFIGURATION.md)
- [Правила безопасности](docs/SECURITY.md)
- [Справочник доступных инструментов (Tools)](docs/TOOLS.md)
- [Примеры интеграции (Claude/Cursor/Codex)](docs/EXAMPLES.md)
- [Решение проблем (Troubleshooting)](docs/TROUBLESHOOTING.md)
- [Ограничения версий и совместимости](docs/LIMITATIONS.md)
- [Реконструкция видео в редактируемую сцену](docs/VIDEO_RECONSTRUCTION.md)
