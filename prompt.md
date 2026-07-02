Ты — senior pipeline TD, backend engineer и разработчик MCP-серверов для анимационных студий. Твоя задача — создать полноценный production-grade MCP server для Toon Boom Harmony, с помощью которого AI-агент сможет максимально полно управлять Toon Boom Harmony и Harmony Server через официальные и поддерживаемые интерфейсы программы.

Нужно создать не демо, не игрушку, а нормальный локальный MCP-сервер для реальной студийной работы: создание сцен, jobs, environments, импорт/экспорт, запуск скриптов, анализ сцен, управление нодами, рендеринг, batch-processing, работа с WebCC/Control Center, интеграция с Python API Harmony, безопасные ограничения и документация.

Главная идея архитектуры:

1. MCP server не должен пытаться «ломать» Harmony или кликать по интерфейсу вслепую.
2. Управление должно идти через официальные точки автоматизации:

   * Control Center Scripting;
   * Control Center Telnet Script Server;
   * Harmony Qt Script;
   * Harmony Extended Scripting Interface;
   * Harmony Python Interface;
   * Harmony command-line utilities;
   * Harmony Server database structure;
   * WebCC как дополнительный слой для remote/offline checkout, если доступен.
3. Сервер должен уметь работать в двух режимах:

   * Standalone/offline scene mode: управление `.xstage` / локальными проектами через Python API Harmony.
   * Harmony Server mode: управление production database через Control Center scripting и Telnet server.
4. Всё разрушительное должно иметь dry-run, подтверждение, логирование и allowlist.

Известные факты о Toon Boom Harmony, которые нужно учесть:

* Harmony Server централизует производство в базе данных Harmony scenes.
* Harmony Server позволяет создавать, управлять, batch-vectorize и batch-render сцены, сохранять и загружать сцены с сетевого хранилища, делиться palettes, drawings, templates и assets, отслеживать production/approval stages.
* Harmony Server включает приложения Harmony, Play, Paint, Scan, Control Center, WebCC и License Wizard.
* В режиме Harmony Server сцены нужно создавать через Control Center, а не напрямую в Harmony.
* Control Center используется для создания environments, jobs, scenes, users, а также для import/export scene packages.
* Control Center напрямую управляет server database.
* Иерархия базы: environment → job → scene → version.
* В Control Center scripting основной объект для изменения базы — `ControlCentre`. Остальные классы в основном являются data objects.
* Control Center scripting может запускаться в batch mode:
  `Controlcenter -runScript <script_file> -user <user_name>`
* В batch mode скрипт не должен оборачиваться в `TB_BeginScript` / `TB_EndScript`.
* Control Center может запускаться как script server:
  `Controlcenter -script`
  или:
  `Controlcenter -script -tcpPort 1234`
* Порт также может задаваться через переменную окружения:
  `TOONBOOM_REMOTE_SCRIPT=1234`
* В Telnet/script-server mode многострочные скрипты должны быть обёрнуты:
  `TB_BeginScript`
  `...script body...`
  `TB_EndScript`
* В конце скриптов нужно получать и выводить:
  `ControlCentre.messageLog()`
  `ControlCentre.printToConsole(log)`
* Дефолтный пользователь Harmony Server — `usabatch`. Его нельзя удалять, потому что он используется batch processing.
* Порты Harmony Database Server по умолчанию: 5678 и 5680. Их можно менять через `/USA_DB/Dbserver.conf`.
* WebCC позволяет удалённым пользователям через браузер скачивать сцены, работать локально и загружать изменения обратно.
* Batch Processing в Harmony Server используется для vectorizing и rendering. Машины добавляются в machine list, на них ставится batch processing service, затем задаётся schedule.
* Harmony Python Interface предоставляет модуль `ToonBoom.harmony`.
* Python API доступен внутри Harmony Python Script Console и из внешнего Python interpreter.
* Внешний Python interpreter должен добавить путь к `python-packages` Harmony:

  * Windows: `$HARMONY_INSTALL/win64/bin/python-packages`
  * macOS: `$HARMONY_INSTALL/Contents/tba/macosx/lib/python-packages`
  * Linux: `$HARMONY_INSTALL/lnx86_64/lib/python-packages`
* Пример Python API:
  `from ToonBoom import harmony`
  `current_session = harmony.session()`
  `project = current_session.project`
* Внешний Python может открыть проект:
  `harmony.open_project("Path/To/Project/file.xstage")`
* Изменения в сцене не сохраняются автоматически. Нужно явно вызывать сохранение проекта.
* В Python API операции с DOM сцены должны выполняться на главном потоке или под lock. Нужно использовать механизмы вроде `run_on_main()` / `thread_lock()`, если доступны.
* Harmony включает PySide6, что позволяет создавать GUI-расширения, но MCP-сервер должен быть headless-first.
* Harmony scripting использует Qt Script, язык на основе ECMAScript, похожий на JavaScript.
* Скрипты Harmony имеют расширение `.js`.

Твоя задача:

Создай репозиторий `toonboom-harmony-mcp` с полноценной реализацией MCP server.

Выбери TypeScript/Node.js как основной язык MCP-сервера, потому что MCP SDK стабилен и удобен для tool schemas. Для операций, где нужен Python API Harmony, создай Python bridge scripts, которые вызываются из Node.js через child_process. Для Control Center scripting создай Qt Script generator и Telnet adapter.

Архитектура должна быть такой:

`src/index.ts`

* входная точка MCP-сервера;
* регистрация tools/resources/prompts;
* stdio transport;
* в будущем возможность SSE/HTTP transport, но по умолчанию stdio.

`src/config.ts`

* чтение `.env`;
* автоопределение путей Harmony;
* проверка OS;
* переменные:

  * `HARMONY_INSTALL`
  * `HARMONY_CC_BIN`
  * `HARMONY_BIN`
  * `HARMONY_PYTHON_PACKAGES`
  * `HARMONY_CC_HOST`
  * `HARMONY_CC_PORT`
  * `HARMONY_CC_USER`
  * `HARMONY_SCRIPT_TIMEOUT_MS`
  * `HARMONY_DRY_RUN_DEFAULT`
  * `HARMONY_ALLOW_DESTRUCTIVE`
  * `HARMONY_ALLOWED_ROOTS`
  * `HARMONY_LOG_DIR`

`src/security.ts`

* path allowlist;
* запрет на выполнение произвольного shell без allowlist;
* dry-run для destructive actions;
* required confirmation token для delete/overwrite;
* логирование всех операций;
* redaction секретов;
* защита от path traversal;
* лимит размера выводов;
* timeout для всех subprocess/telnet операций.

`src/adapters/controlCenterTelnet.ts`

* подключение к Control Center script server по TCP/Telnet;
* отправка скрипта с `TB_BeginScript` / `TB_EndScript`;
* чтение ответа;
* timeout;
* reconnect;
* parser messageLog;
* нормализация ошибок;
* метод `runScript(script: string, options)`.

`src/adapters/controlCenterBatch.ts`

* создание временного `.js` файла;
* запуск:
  `Controlcenter -runScript <script_file> -user <user_name>`
* сбор stdout/stderr;
* cleanup временных файлов;
* поддержка dry-run.

`src/adapters/qtScriptBuilder.ts`

* безопасная генерация Qt Script для Control Center;
* escaping строк;
* шаблоны:

  * list users;
  * add user;
  * list environments;
  * create environment;
  * list jobs;
  * create job;
  * list scenes;
  * create scene;
  * rename scene;
  * import scene;
  * export scene;
  * list versions;
  * list locked scenes;
  * print messageLog.

`src/adapters/harmonyPython.ts`

* запуск Python bridge scripts;
* передача JSON input;
* получение JSON output;
* автопоиск Harmony python-packages;
* поддержка external Python interpreter;
* обработка ошибок импорта `ToonBoom.harmony`.

`scripts/python/harmony_bridge.py`

* универсальный Python bridge;
* принимает JSON через stdin;
* команды:

  * `detect`
  * `open_project`
  * `inspect_project`
  * `list_nodes`
  * `get_node_attrs`
  * `set_node_attr`
  * `create_node`
  * `connect_nodes`
  * `disconnect_nodes`
  * `list_palettes`
  * `import_asset`
  * `save_project`
  * `render_preview`, если возможно через доступные API/CLI;
* обязательно проверять, какие методы реально есть в установленной версии Harmony;
* если метода нет, возвращать структурированную ошибку с рекомендацией.

`src/tools/systemTools.ts`
Tools:

* `harmony.health_check`
* `harmony.detect_installation`
* `harmony.get_capabilities`
* `harmony.get_config`
* `harmony.validate_environment`
* `harmony.read_logs`

`src/tools/controlCenterTools.ts`
Tools:

* `harmony.cc.start_script_server_command`

  * не запускает скрыто бесконтрольно, а возвращает правильную команду запуска под OS;
* `harmony.cc.ping`
* `harmony.cc.run_qtscript`

  * raw script allowed only if config allows it;
* `harmony.cc.list_users`
* `harmony.cc.create_user`
* `harmony.cc.list_environments`
* `harmony.cc.create_environment`
* `harmony.cc.list_jobs`
* `harmony.cc.create_job`
* `harmony.cc.list_scenes`
* `harmony.cc.create_scene`
* `harmony.cc.rename_scene`
* `harmony.cc.list_versions`
* `harmony.cc.list_locked_scenes`
* `harmony.cc.import_scene_package`
* `harmony.cc.export_scene_package`

`src/tools/sceneTools.ts`
Tools:

* `harmony.scene.open_project`
* `harmony.scene.inspect`
* `harmony.scene.list_nodes`
* `harmony.scene.search_nodes`
* `harmony.scene.get_node`
* `harmony.scene.create_node`
* `harmony.scene.delete_node`
* `harmony.scene.connect_nodes`
* `harmony.scene.disconnect_nodes`
* `harmony.scene.get_attribute`
* `harmony.scene.set_attribute`
* `harmony.scene.set_keyframe`
* `harmony.scene.list_palettes`
* `harmony.scene.import_asset`
* `harmony.scene.save`
* `harmony.scene.export_preview`

`src/tools/renderTools.ts`
Tools:

* `harmony.render.queue_scene`
* `harmony.render.render_local`
* `harmony.render.list_queue`
* `harmony.render.cancel_job`
* `harmony.render.collect_outputs`
* `harmony.vectorize.queue_drawings`
* `harmony.vectorize.list_queue`

Важно: если точный официальный API для конкретного действия отличается между версиями Harmony, реализуй capability detection. Не выдумывай вызовы. Сначала проверь локальные docs/API/reflection. Если действие невозможно в текущей версии, tool должен честно вернуть `unsupported`, а не имитировать успех.

`src/tools/assetTools.ts`
Tools:

* `harmony.assets.list_templates`
* `harmony.assets.import_template`
* `harmony.assets.export_template`
* `harmony.assets.list_palettes`
* `harmony.assets.backup_palette`
* `harmony.assets.import_palette`
* `harmony.assets.collect_scene_assets`

`src/tools/workflowTools.ts`
Tools:

* `harmony.workflow.create_production`
* `harmony.workflow.create_episode`
* `harmony.workflow.create_sequence`
* `harmony.workflow.create_shot`
* `harmony.workflow.assign_status`
* `harmony.workflow.get_status_report`
* `harmony.workflow.generate_production_report`

Если Toon Boom Producer API недоступен, сделай локальный lightweight production tracker на SQLite:

* productions;
* episodes;
* sequences;
* shots;
* tasks;
* assets;
* users;
* statuses;
* notes;
* links to Harmony env/job/scene/version.
  Это не должно заменять Harmony Server, а должно быть дополнительным metadata layer.

`src/resources.ts`
MCP resources:

* `harmony://config`
* `harmony://capabilities`
* `harmony://logs/latest`
* `harmony://docs/control-center-scripting-notes`
* `harmony://docs/python-api-notes`
* `harmony://production/status`

`src/prompts.ts`
MCP prompts:

* `create_harmony_scene_from_brief`
* `inspect_scene_and_suggest_cleanup`
* `build_cutout_rig_plan`
* `prepare_batch_render_plan`
* `create_episode_structure`
* `troubleshoot_harmony_server`

`docs/`

* `README.md`
* `INSTALL.md`
* `CONFIGURATION.md`
* `SECURITY.md`
* `HARMONY_SETUP.md`
* `TOOLS.md`
* `EXAMPLES.md`
* `TROUBLESHOOTING.md`
* `LIMITATIONS.md`

`examples/`

* Claude Desktop config;
* Cursor config;
* Codex/OpenHands usage;
* sample `.env.example`;
* sample scripts:

  * start Control Center script server;
  * list environments;
  * create job;
  * create scene;
  * inspect local `.xstage`.

Обязательные требования к качеству:

1. TypeScript strict mode.
2. Zod schemas для всех MCP tool inputs.
3. Структурированные ответы JSON.
4. Нормальные error codes:

   * `HARMONY_NOT_INSTALLED`
   * `CONTROL_CENTER_NOT_FOUND`
   * `CONTROL_CENTER_UNREACHABLE`
   * `SCRIPT_TIMEOUT`
   * `PYTHON_API_UNAVAILABLE`
   * `UNSUPPORTED_BY_VERSION`
   * `DESTRUCTIVE_ACTION_REQUIRES_CONFIRMATION`
   * `PATH_NOT_ALLOWED`
   * `INVALID_HARMONY_OBJECT`
5. Логи в JSONL.
6. Unit tests для script builder, config detection, security path checks.
7. Integration tests должны быть skip-able, если Harmony не установлен.
8. Все tools должны иметь `dryRun`.
9. Все destructive tools должны требовать `confirm: true` и `confirmationText`, например:
   `I understand this will modify the Harmony database`
10. Нельзя выполнять произвольный пользовательский shell.
11. Raw Qt Script execution выключен по умолчанию.
12. Telnet script server должен быть доступен только на localhost или доверенном host.
13. Не хранить пароли в логах.
14. Не делать вид, что действие выполнено, если Harmony API не подтвердил успех.

Реализуй MCP tools максимально аккуратно.

Минимальный MVP, который должен реально работать без полного доступа ко всей программе:

1. `harmony.detect_installation`
2. `harmony.health_check`
3. `harmony.cc.start_script_server_command`
4. `harmony.cc.ping`
5. `harmony.cc.list_environments`
6. `harmony.cc.list_jobs`
7. `harmony.cc.list_scenes`
8. `harmony.cc.run_qtscript` в safe mode
9. `harmony.scene.open_project`
10. `harmony.scene.inspect`
11. `harmony.scene.list_nodes`
12. `harmony.scene.save`

После MVP реализуй расширенные tools.

Сгенерируй весь проект полностью:

* `package.json`
* `tsconfig.json`
* `src/index.ts`
* все adapters;
* все tools;
* Python bridge;
* docs;
* tests;
* `.env.example`;
* README с командами запуска.

Команды должны быть такими:

```bash
npm install
npm run build
npm test
npm run start
```

Пример Claude Desktop config:

```json
{
  "mcpServers": {
    "toonboom-harmony": {
      "command": "node",
      "args": ["/absolute/path/to/toonboom-harmony-mcp/dist/index.js"],
      "env": {
        "HARMONY_DRY_RUN_DEFAULT": "true"
      }
    }
  }
}
```

Важно: не используй псевдокод. Если какая-то часть зависит от реально установленной Harmony, сделай слой abstraction и честную ошибку при отсутствии Harmony. Но структура проекта, сервер MCP, валидация, adapters, dry-run, logging и docs должны быть полноценными.

Также добавь в README раздел «Как запустить Control Center MCP bridge»:

Для Harmony Server mode:

```bash
# Linux/macOS
export TOONBOOM_REMOTE_SCRIPT=1234
Controlcenter -script -tcpPort 1234
```

```bat
REM Windows
SET TOONBOOM_REMOTE_SCRIPT=1234
Controlcenter -script -tcpPort 1234
```

И `.env`:

```env
HARMONY_CC_HOST=127.0.0.1
HARMONY_CC_PORT=1234
HARMONY_CC_USER=usabatch
HARMONY_DRY_RUN_DEFAULT=true
HARMONY_ALLOW_DESTRUCTIVE=false
```

Добавь предупреждение: `usabatch` нельзя удалять.

Нужно сделать MCP-сервер, который в перспективе сможет управлять полной production pipeline в Toon Boom Harmony:

* production setup;
* users;
* environments;
* jobs;
* scenes;
* versions;
* locks;
* import/export scene packages;
* local/offline scene inspection;
* node graph manipulation;
* palettes;
* templates;
* assets;
* batch vectorization;
* batch render;
* production status reports;
* safe AI automation.

Сначала создай репозиторий и код. Потом выведи краткое описание архитектуры и команды запуска.
