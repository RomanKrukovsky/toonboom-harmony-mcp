# Примеры интеграции и использования

Ниже приведены шаблоны конфигурации для интеграции MCP-сервера в ваши редакторы и агенты.

## 1. Конфигурация Claude Desktop

Добавьте следующую запись в ваш файл `claude_desktop_config.json` (находится по пути `~/Library/Application Support/Claude/claude_desktop_config.json` на macOS или `%APPDATA%\Claude\claude_desktop_config.json` на Windows):

```json
{
  "mcpServers": {
    "toonboom-harmony": {
      "command": "node",
      "args": ["/Users/romanmolodyko/Documents/toon-boom-harmony-mcp/dist/index.js"],
      "env": {
        "HARMONY_DRY_RUN_DEFAULT": "true",
        "HARMONY_ALLOW_DESTRUCTIVE": "false",
        "HARMONY_ALLOWED_ROOTS": "/Users/romanmolodyko/Documents/toon-boom-harmony-mcp,/tmp"
      }
    }
  }
}
```

## 2. Настройка Cursor IDE

В настройках Cursor перейдите в раздел **Features -> MCP**, нажмите кнопку **+ Add New MCP Server**:
- **Name**: `toonboom-harmony`
- **Type**: `stdio`
- **Command**: `node /Users/romanmolodyko/Documents/toon-boom-harmony-mcp/dist/index.js`

## 3. Пример сценария работы: Получение списка сцен из Control Center

Схема вызовов и обмена данными при выполнении запроса `harmony.cc.list_scenes`:

1. Сервер генерирует тело Qt Script:
   ```javascript
   var env = ControlCentre.environment("MyEnv");
   var job = ControlCentre.job(env, "MyJob");
   var sceneList = ControlCentre.scenes(job);
   // вывод результатов внутри тегов [RESULT]
   ```
2. Отправляет команду на `localhost:1234` по протоколу TCP.
3. Разбирает полученную строку `[RESULT]` и возвращает список сцен в формате JSON.
