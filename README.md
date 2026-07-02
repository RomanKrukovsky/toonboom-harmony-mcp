# Toon Boom Harmony MCP Server

MCP-сервер (Model Context Protocol) промышленного уровня для автоматизации работы с Toon Boom Harmony и Harmony Server.

## Функциональные возможности

- **Интеграция с Control Center (Telnet и Batch)**: Безопасное создание окружений, проектов (jobs), сцен, управление версиями, блокировка сцен, а также импорт и экспорт архивных пакетов.
- **Интеграция с Harmony Python API**: Управление локальным деревом нод, связывание портов, изменение значений атрибутов, проставление ключевых кадров на таймлайне и сохранение сцен.
- **Управление рендерингом**: Добавление сцен в очередь Harmony Server и запуск локального рендеринга и фоновой автовекторизации рисунков.
- **Локальный трекер задач (SQLite)**: Легковесный инструмент отслеживания статусов производства (проекты, эпизоды, сиквенсы, кадры, задачи, ресурсы, заметки) в условиях отсутствия Toon Boom Producer.
- **Многоуровневая безопасность**: Ограничение путей файловой системы (`HARMONY_ALLOWED_ROOTS`), симуляция выполнения (dry-run по умолчанию) и токены подтверждения для опасных (деструктивных) операций.

## Быстрый старт

### 1. Установка зависимостей и сборка
```bash
npm install
npm run build
```

### 2. Запуск тестов
```bash
npm test
```

### 3. Запуск MCP-сервера
```bash
npm run start
```

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
- [Инструкция по установке](docs/INSTALL.md)
- [Руководство по конфигурации](docs/CONFIGURATION.md)
- [Правила безопасности](docs/SECURITY.md)
- [Справочник доступных инструментов (Tools)](docs/TOOLS.md)
- [Примеры интеграции (Claude/Cursor/Codex)](docs/EXAMPLES.md)
- [Решение проблем (Troubleshooting)](docs/TROUBLESHOOTING.md)
- [Ограничения версий и совместимости](docs/LIMITATIONS.md)
