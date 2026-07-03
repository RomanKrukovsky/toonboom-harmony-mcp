# Client Onboarding & Deployment Guide

Инструкция по развертыванию **Harmony Autopilot MCP** в окружении новой студии.

## Шаг 1. Системные требования
* Операционная система: Windows 10/11, macOS 12+, Linux (CentOS/Ubuntu).
* Установленный пакет Toon Boom Harmony Premium 22 или 24.
* Node.js v18+.
* Python 3.10+ (с установленным модулем `ToonBoom.harmony`, поставляемым с программой).

## Шаг 2. Конфигурация переменных окружения
Создайте или отредактируйте файл `.env` в корневой директории MCP-сервера:
```ini
# Пути к установленной Harmony
HARMONY_INSTALL="/Applications/Toon Boom Harmony 24 Premium"
HARMONY_BIN="/Applications/Toon Boom Harmony 24 Premium/HarmonyPremium.app/Contents/tba/macosx/bin/HarmonyPremium"
HARMONY_PYTHON_PACKAGES="/Applications/Toon Boom Harmony 24 Premium/HarmonyPremium.app/Contents/tba/macosx/lib/python-packages"

# Сетевой Control Center
HARMONY_CC_HOST="127.0.0.1"
HARMONY_CC_PORT=1234
HARMONY_CC_USER="usabatch"

# Настройки безопасности
HARMONY_ALLOW_DESTRUCTIVE=true
HARMONY_ALLOWED_ROOTS="/Users/username/harmony_projects,/Users/username/mcp_workspace"
HARMONY_LOG_DIR="./logs"

# Режим автоматизации
HARMONY_UI_SIMULATE=false
```

## Шаг 3. Установка реальных библиотек автоматизации UI
Для переключения из режима симуляции в реальный режим управления интерфейсом выполните установку библиотек контроля мыши и клавиатуры:
```bash
npm install @nut-tree/nut-js
# или
npm install robotjs
```
*Примечание*: На macOS потребуется выдать права доступности (Accessibility) для терминала или IDE, из которой запускается MCP-сервер, чтобы разрешить отправку кликов и хоткеев.

## Шаг 4. Проверка развертывания
Запустите диагностику окружения:
* Вызовите инструмент `harmony.health_check`.
* Убедитесь, что `controlCenterAvailable` и `pythonApiAvailable` вернули `true`.
* Вызовите `harmony.ui.verify_workspace` для проверки видимости окон Harmony.
