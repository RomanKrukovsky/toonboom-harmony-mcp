# Справочник доступных инструментов (Tools)

MCP-сервер Toon Boom Harmony регистрирует набор инструментов автоматизации, разделенный по пространствам имен.

## 1. Системное администрирование (`harmony.*`)

- `harmony.health_check`: Проверка путей и доступности зависимостей.
- `harmony.detect_installation`: Вывод путей установки бинарных файлов и пакетов Python.
- `harmony.get_capabilities`: Проверка доступных интерфейсов автоматизации.
- `harmony.get_config`: Получение текущих параметров конфигурации (без паролей).
- `harmony.validate_environment`: Проверка папок и прав записи.
- `harmony.read_logs`: Чтение логов операций сервера.

## 2. Управление базой данных Control Center (`harmony.cc.*`)

- `harmony.cc.start_script_server_command`: Получение CLI-команд запуска сервера скриптов.
- `harmony.cc.ping`: Проверка связи с базой данных.
- `harmony.cc.run_qtscript`: Запуск сырых Qt-скриптов (если разрешено).
- `harmony.cc.list_users` / `create_user`: Просмотр и создание пользователей базы данных.
- `harmony.cc.list_environments` / `create_environment`: Управление окружениями.
- `harmony.cc.list_jobs` / `create_job`: Управление проектами (jobs).
- `harmony.cc.list_scenes` / `create_scene` / `rename_scene`: Управление сценами.
- `harmony.cc.list_versions`: Просмотр версий сцены.
- `harmony.cc.list_locked_scenes`: Просмотр текущих блокировок сцен пользователями.
- `harmony.cc.import_scene_package` / `export_scene_package`: Перенос архивных пакетов сцен (.zip/pkg).

## 3. Локальные изменения сцены (`harmony.scene.*`)

- `harmony.scene.open_project`: Открытие файла .xstage.
- `harmony.scene.inspect`: Получение параметров разрешения, частоты кадров, длительности.
- `harmony.scene.list_nodes` / `search_nodes` / `get_node`: Просмотр структуры графа нод и атрибутов.
- `harmony.scene.create_node` / `delete_node`: Добавление и удаление узлов графа.
- `harmony.scene.connect_nodes` / `disconnect_nodes`: Соединение входов и выходов портов нод.
- `harmony.scene.get_attribute` / `set_attribute` / `set_keyframe`: Чтение, изменение значений и расстановка ключей анимации.
- `harmony.scene.list_palettes`: Получение списка палитр.
- `harmony.scene.import_asset`: Импорт аудио- и графических ресурсов в сцену.
- `harmony.scene.save`: Сохранение изменений в файлах проекта.
- `harmony.scene.export_preview`: Рендеринг кадра компоновки.

## 4. Очереди рендеринга и векторизации (`harmony.render.*` / `harmony.vectorize.*`)

- `harmony.render.queue_scene` / `list_queue` / `cancel_job`: Управление сетевой очередью рендеринга Harmony Server.
- `harmony.render.render_local`: Запуск локального рендеринга через командную строку `HarmonyPremium`.
- `harmony.render.collect_outputs`: Получение путей к готовым отрендеренным кадрам.
- `harmony.vectorize.queue_drawings` / `list_queue`: Управление очередью фоновой векторизации растра.

## 5. Библиотека ресурсов (`harmony.assets.*`)

- `harmony.assets.list_templates` / `import_template` / `export_template`: Управление шаблонами элементов (.tpl).
- `harmony.assets.list_palettes` / `backup_palette` / `import_palette`: Управление и бэкап файлов палитр (.plt).
- `harmony.assets.collect_scene_assets`: Сбор всех рисунков, аудиозаписей и палитр в папке проекта.

## 6. Локальный трекер производства (`harmony.workflow.*`)

- `harmony.workflow.create_production` / `create_episode` / `create_sequence` / `create_shot`: Создание иерархической структуры задач в SQLite.
- `harmony.workflow.assign_status`: Изменение статусов кадров и задач.
- `harmony.workflow.get_status_report` / `generate_production_report`: Получение отчетов по статусам производства.
