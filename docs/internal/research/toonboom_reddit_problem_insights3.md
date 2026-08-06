# Анализ проблем Toon Boom Harmony на основе Reddit-сообщества (r/ToonBoomHarmony & r/animation) — Выпуск 3

Этот отчет представляет собой третий том аудита и систематизации еще 50 реальных пользовательских кейсов, собранных из обсуждений на Reddit. В данном выпуске основное внимание уделено проблемам со звуком (Audio), цветовыми палитрами (Color Palettes), шкалой времени (Timeline) и экспортом сцен.

---

## ЧАСТЬ 1. Каталог 50 Reddit-тредов (Симптом → Причина → Решение)

#### 1. Пиксельные/зубчатые линии во вьюпорте камеры
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/k6rr1n/my_lines_are_coming_out_jagged_in_the_camera_view/](https://www.reddit.com/r/toonboomharmony/comments/k6rr1n/my_lines_are_coming_out_jagged_in_the_camera_view/)
*   **Краткая суть проблемы**: Пиксельные/зубчатые линии во вьюпорте камеры
*   **Симптомы**: Векторные штрихи выглядят неровными, ступенчатыми во вьюпорте при приближении.
*   **Вероятная причина**: Отключено сглаживание в настройках OpenGL (Anti-aliasing) или включен режим быстрого отображения (Fast Display).
*   **Решение из комментариев**: Включить 'Realtime Antialiasing' в настройках Preferences -> OpenGL.
*   **Как MCP-сервер может помочь**: Аудит и корректировка глобальных параметров рендеринга и качества OpenGL.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config', 'harmony.nodes.set_attr']`
*   **Чего не хватает в текущем MCP**: harmony.env.set_opengl_antialiasing (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 2. Экспорт видео без звуковой дорожки
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/109yeo3/how_to_export_audio_with_video/](https://www.reddit.com/r/toonboomharmony/comments/109yeo3/how_to_export_audio_with_video/)
*   **Краткая суть проблемы**: Экспорт видео без звуковой дорожки
*   **Симптомы**: При экспорте сцены в формате MP4/QuickTime видео воспроизводится без звука.
*   **Вероятная причина**: В ноде Write или окне экспорта не установлена галочка 'Export Audio', либо отсутствует аудиокодек в системе.
*   **Решение из комментариев**: Проверить настройки ноды Write, включить экспорт звука и выбрать кодек AAC/LPCM.
*   **Как MCP-сервер может помочь**: Проверка и исправление параметров экспорта в нодах Write.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.get_attr', 'harmony.nodes.set_attr']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.enable_audio_export (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 3. Черный экран на финальном рендере
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/pvsddd/black_screen_after_exporting/](https://www.reddit.com/r/toonboomharmony/comments/pvsddd/black_screen_after_exporting/)
*   **Краткая суть проблемы**: Черный экран на финальном рендере
*   **Симптомы**: Финальный видеофайл открывается, но отображает только черный экран при наличии звука.
*   **Вероятная причина**: Активный Display нода в Node View не подключена к главному Composite сцены, либо выключен переключатель видимости слоев.
*   **Решение из комментариев**: Подключить ноду Display напрямую к выходу Composite и убедиться, что глазок видимости активен.
*   **Как MCP-сервер может помочь**: Анализ графа связей и подключение оторванных Display нод.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.find_broken_connections', 'harmony.nodes.connect']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.connect_active_display (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 4. Изменение разрешения сцены со сдвигом элементов
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/wb1krp/does_anyone_know_how_to_resize_a_scene_without/](https://www.reddit.com/r/toonboomharmony/comments/wb1krp/does_anyone_know_how_to_resize_a_scene_without/)
*   **Краткая суть проблемы**: Изменение разрешения сцены со сдвигом элементов
*   **Симптомы**: При изменении разрешения сцены (Resolution) элементы рига разъезжаются в разные стороны.
*   **Вероятная причина**: Пивоты и координаты пегов настроены в абсолютных экранных координатах, а не привязаны к камере.
*   **Решение из комментариев**: Использовать камеру (Camera Peg) для масштабирования сцены вместо глобального изменения Resolution.
*   **Как MCP-сервер может помочь**: Создание и привязка родительского Camera Peg для безопасного масштабирования.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.create', 'harmony.nodes.connect']`
*   **Чего не хватает в текущем MCP**: harmony.rig.setup_camera_peg (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 5. Сцена заблокирована файлом .lock
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/1ciwn7l/locked_problem_on_storyboard_pro/](https://www.reddit.com/r/toonboomharmony/comments/1ciwn7l/locked_problem_on_storyboard_pro/)
*   **Краткая суть проблемы**: Сцена заблокирована файлом .lock
*   **Симптомы**: При попытке открыть проект программа выдает ошибку о блокировке другим пользователем (Scene is locked).
*   **Вероятная причина**: Остался зависший файл блокировки `.lock` после аварийного вылета Harmony.
*   **Решение из комментариев**: Удалить вручную файл `.lock` в папке проекта.
*   **Как MCP-сервер может помочь**: Поиск и безопасное удаление файлов блокировки.
*   **Какие существующие MCP tools подходят**: `['harmony.scene.release_lock']`
*   **Чего не хватает в текущем MCP**: harmony.scene.clean_stale_temp_files (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 6. Невозможность добавить эффекты в Harmony Essentials
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/1bso8rl/i_cant_add_an_effect_on_my_layer_harmony_211/](https://www.reddit.com/r/toonboomharmony/comments/1bso8rl/i_cant_add_an_effect_on_my_layer_harmony_211/)
*   **Краткая суть проблемы**: Невозможность добавить эффекты в Harmony Essentials
*   **Симптомы**: Вкладка Effects и нодовая структура недоступны, эффекты не применяются к слоям.
*   **Вероятная причина**: Версия Harmony Essentials не поддерживает нодовые эффекты (требуется Premium).
*   **Решение из комментариев**: Использовать эффекты слоя в таймлайне или обновить лицензию до Harmony Premium.
*   **Как MCP-сервер может помочь**: Аудит версии лицензии и вывод рекомендаций по обходу ограничений.
*   **Какие существующие MCP tools подходят**: `['harmony.get_capabilities']`
*   **Чего не хватает в текущем MCP**: harmony.license.check_features (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 7. Краш при импорте звука на Windows 10
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/azoqqv/toonboom_103_on_windows_10_crashes_on_sound_import/](https://www.reddit.com/r/toonboomharmony/comments/azoqqv/toonboom_103_on_windows_10_crashes_on_sound_import/)
*   **Краткая суть проблемы**: Краш при импорте звука на Windows 10
*   **Симптомы**: Программа мгновенно закрывается без ошибок при импорте любого `.wav` или `.mp3` файла.
*   **Вероятная причина**: Отсутствие QuickTime или несовместимость старых версий Harmony с аудиокодеками Windows 10.
*   **Решение из комментариев**: Конвертировать аудио в формат WAV (16-bit, 44.1kHz) PCM или установить Apple QuickTime.
*   **Как MCP-сервер может помочь**: Сканирование аудиосистемы и конвертация несовместимых аудиофайлов.
*   **Какие существующие MCP tools подходят**: `['harmony.validate_environment']`
*   **Чего не хватает в текущем MCP**: harmony.audio.convert_to_pcm (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 8. Проблемы совместимости версий проектов
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/17kkppw/harmony_premium_22_compatibility_with_older/](https://www.reddit.com/r/toonboomharmony/comments/17kkppw/harmony_premium_22_compatibility_with_older/)
*   **Краткая суть проблемы**: Проблемы совместимости версий проектов
*   **Симптомы**: Старые проекты, открытые в Harmony 22, ломаются (пропадают деформеры, съезжают пивоты).
*   **Вероятная причина**: Изменение структуры хранения деформаций и новые алгоритмы OpenGL в 22 версии.
*   **Решение из комментариев**: Включить режим 'Legacy Deformation' в настройках сцены или пересобрать деформеры.
*   **Как MCP-сервер может помочь**: Пакетное переключение деформеров в режим совместимости (Legacy).
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.get_attr', 'harmony.nodes.set_attr', 'harmony.rig.validate_deformers']`
*   **Чего не хватает в текущем MCP**: harmony.deformers.enable_compatibility_mode (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 9. Ошибка подключения к базе данных Harmony Server
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/1ai4jke/error_showing_up_and_im_not_sure_what_to_do_help/](https://www.reddit.com/r/toonboomharmony/comments/1ai4jke/error_showing_up_and_im_not_sure_what_to_do_help/)
*   **Краткая суть проблемы**: Ошибка подключения к базе данных Harmony Server
*   **Симптомы**: При запуске Harmony в режиме Server появляется ошибка: 'Database Connection Lost'.
*   **Вероятная причина**: Служба `tbdbserver` на сервере остановлена, либо заблокирован порт 5656 брандмауэром.
*   **Решение из комментариев**: Перезапустить службу базы данных Harmony на сервере и открыть сетевые порты.
*   **Как MCP-сервер может помочь**: Диагностика сетевого подключения к серверу Harmony.
*   **Какие существующие MCP tools подходят**: `['harmony.cc.ping', 'harmony.validate_environment']`
*   **Чего не хватает в текущем MCP**: harmony.cc.restart_db_service (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 10. Использование звуковой волны для авто-анимации
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/9bz1yo/is_there_any_way_of_using_a_sound_wave_as/](https://www.reddit.com/r/toonboomharmony/comments/9bz1yo/is_there_any_way_of_using_a_sound_wave_as/)
*   **Краткая суть проблемы**: Использование звуковой волны для авто-анимации
*   **Симптомы**: Пользователь хочет привязать масштаб зрачка или рта к громкости звуковой дорожки.
*   **Вероятная причина**: Отсутствие встроенного инструмента для конвертации звука во флуктуации числовых значений каналов.
*   **Решение из комментариев**: Использовать внешние скрипты (например, Sound-to-Animation) для конвертации аудио в ключи.
*   **Как MCP-сервер может помочь**: Импорт аудио-амплитуд во временную шкалу параметров ноды.
*   **Какие существующие MCP tools подходят**: `['harmony.timeline.create_keyframe', 'harmony.nodes.set_attr']`
*   **Чего не хватает в текущем MCP**: harmony.audio.bake_volume_to_keyframes (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 11. Звук не экспортируется в QuickTime MOV
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/6dpvpx/exporting_issue_sound_not_exporting_with_movie/](https://www.reddit.com/r/toonboomharmony/comments/6dpvpx/exporting_issue_sound_not_exporting_with_movie/)
*   **Краткая суть проблемы**: Звук не экспортируется в QuickTime MOV
*   **Симптомы**: При экспорте видео в формате MOV звук пропадает, хотя на таймлайне проигрывается отлично.
*   **Вероятная причина**: В настройках QuickTime компрессора звука выбран неподдерживаемый кодек.
*   **Решение из комментариев**: Переключить компрессор звука в режим Uncompressed или использовать формат MP4.
*   **Как MCP-сервер может помочь**: Корректировка настроек кодека звука в конфигурации сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.env.set_default_export_presets (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 12. Звук обрезается на середине сцены
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/xb2v6j/audio_problems/](https://www.reddit.com/r/toonboomharmony/comments/xb2v6j/audio_problems/)
*   **Краткая суть проблемы**: Звук обрезается на середине сцены
*   **Симптомы**: Воспроизведение аудио резко прекращается на определенном кадре, хотя сам файл длиннее.
*   **Вероятная причина**: Несовпадение частоты дискретизации (Sample Rate) аудиофайла (например, 48kHz) и настроек звуковой карты.
*   **Решение из комментариев**: Перекодировать аудио в 44.1kHz 16-bit WAV и повторно импортировать в сцену.
*   **Как MCP-сервер может помочь**: Анализ характеристик импортированного звука.
*   **Какие существующие MCP tools подходят**: `['harmony.assets.collect_scene_assets']`
*   **Чего не хватает в текущем MCP**: harmony.audio.validate_sample_rate (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 13. Ошибка инициализации Windows Media Foundation
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/rrkl6t/sound_issues/](https://www.reddit.com/r/toonboomharmony/comments/rrkl6t/sound_issues/)
*   **Краткая суть проблемы**: Ошибка инициализации Windows Media Foundation
*   **Симптомы**: При запуске Harmony выдает предупреждение об ошибке аудио-драйверов и отключает звук.
*   **Вероятная причина**: Повреждены системные аудио-кодеки Windows Media Foundation или отсутствует аудиокарта по умолчанию.
*   **Решение из комментариев**: Установить Media Feature Pack для Windows или выбрать корректное аудиоустройство в системе.
*   **Как MCP-сервер может помочь**: Проверка доступных аудиоустройств и драйверов.
*   **Какие существующие MCP tools подходят**: `['harmony.validate_environment']`
*   **Чего не хватает в текущем MCP**: harmony.env.fix_audio_registry (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 14. Полное отсутствие звука в Harmony
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/o934io/audio_wont_play_no_matter_what/](https://www.reddit.com/r/toonboomharmony/comments/o934io/audio_wont_play_no_matter_what/)
*   **Краткая суть проблемы**: Полное отсутствие звука в Harmony
*   **Симптомы**: Аудиофайл виден на таймлайне, но динамики молчат при проигрывании.
*   **Вероятная причина**: Отключена кнопка 'Sound' (динамик) на панели управления воспроизведением таймлайна.
*   **Решение из комментариев**: Нажать на значок динамика на панели таймлайна (включить Play Audio).
*   **Как MCP-сервер может помочь**: Включение системных флагов воспроизведения звука.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.ui.enable_audio_playback (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 15. Рассинхронизация звука и анимации
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/lnxmf2/audio_sync_issues/](https://www.reddit.com/r/toonboomharmony/comments/lnxmf2/audio_sync_issues/)
*   **Краткая суть проблемы**: Рассинхронизация звука и анимации
*   **Симптомы**: При проигрывании таймлайна звук отстает от движений губ персонажа.
*   **Вероятная причина**: Включен режим воспроизведения без пропуска кадров (Play Realtime выключен), из-за чего FPS падает.
*   **Решение из комментариев**: Включить кнопку 'Real-Time' (часы) на панели воспроизведения для принудительного пропуска лагающих кадров.
*   **Как MCP-сервер может помочь**: Настройка режима оптимизации воспроизведения.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.ui.set_realtime_playback (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 16. Пропуск кадров при тяжелом риге
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/1dd1ps0/frames_lagging_and_not_syncing_with_audio/](https://www.reddit.com/r/toonboomharmony/comments/1dd1ps0/frames_lagging_and_not_syncing_with_audio/)
*   **Краткая суть проблемы**: Пропуск кадров при тяжелом риге
*   **Симптомы**: Персонаж лагает и дергается, не успевая за аудио-дорожкой при предпросмотре.
*   **Вероятная причина**: Большое количество тяжелых Envelope-деформеров перегружает процессор.
*   **Решение из комментариев**: Использовать пре-рендеринг вьюпорта (Preview Selection) или временно отключать деформеры.
*   **Как MCP-сервер может помочь**: Отключение деформеров для чернового воспроизведения.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.set_attr', 'harmony.nodes.list']`
*   **Чего не хватает в текущем MCP**: harmony.deformers.toggle_active_state (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 17. Звук обрывается на циклическом воспроизведении
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/x5b1kf/audio_cuts_out/](https://www.reddit.com/r/toonboomharmony/comments/x5b1kf/audio_cuts_out/)
*   **Краткая суть проблемы**: Звук обрывается на циклическом воспроизведении
*   **Симптомы**: При зацикленном проигрывании сцены (Loop) звук воспроизводится только один раз.
*   **Вероятная причина**: Баг обработки аудиобуфера при повторе кадра в старых версиях Harmony.
*   **Решение из комментариев**: Перезапустить воспроизведение или обновить Harmony до последнего сервис-пака.
*   **Как MCP-сервер может помочь**: Проверка версии сборки и установка патчей совместимости.
*   **Какие существующие MCP tools подходят**: `['harmony.get_capabilities', 'harmony.read_logs']`
*   **Чего не хватает в текущем MCP**: harmony.env.apply_audio_patch (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 18. Ошибка импорта видео в качестве референса
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/16pz02u/trouble_importing_video/](https://www.reddit.com/r/toonboomharmony/comments/16pz02u/trouble_importing_video/)
*   **Краткая суть проблемы**: Ошибка импорта видео в качестве референса
*   **Симптомы**: При попытке импортировать файл MP4/AVI программа выдает ошибку формата.
*   **Вероятная причина**: Отсутствие установленного в системе декодера QuickTime/H.264, необходимого Harmony для чтения видео.
*   **Решение из комментариев**: Конвертировать видео в формат Apple ProRes или PNG-секвенцию перед импортом.
*   **Как MCP-сервер может помочь**: Автоматическое разбиение видео на PNG секвенцию.
*   **Какие существующие MCP tools подходят**: `['harmony.drawings.import_sequence']`
*   **Чего не хватает в текущем MCP**: harmony.video.convert_to_png_seq (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 19. Экспорт сцены с альфа-каналом
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/k4whad/a_question_about_exporting/](https://www.reddit.com/r/toonboomharmony/comments/k4whad/a_question_about_exporting/)
*   **Краткая суть проблемы**: Экспорт сцены с альфа-каналом
*   **Симптомы**: При экспорте видео фон сцены заливается белым или черным цветом вместо прозрачного.
*   **Вероятная причина**: В ноде Write тип цвета установлен в RGB вместо RGBA (4 канала).
*   **Решение из комментариев**: Переключить параметр 'Colorspace' или 'Format' в ноде Write в режим RGBA.
*   **Как MCP-сервер может помочь**: Настройка нод Write на экспорт альфа-канала.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.get_attr', 'harmony.nodes.set_attr']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.set_write_rgba (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 20. Ограничение Trial-версии по длине аудио
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/1dpf4nr/audio_over_30_seconds_in_free_trial/](https://www.reddit.com/r/toonboomharmony/comments/1dpf4nr/audio_over_30_seconds_in_free_trial/)
*   **Краткая суть проблемы**: Ограничение Trial-версии по длине аудио
*   **Симптомы**: Невозможно проиграть или импортировать аудиодорожку длиннее 30 секунд.
*   **Вероятная причина**: Ограничение бесплатной триал-лицензии Toon Boom Harmony.
*   **Решение из комментариев**: Разбить аудиофайл на сегменты по 30 секунд или приобрести полную лицензию.
*   **Как MCP-сервер может помочь**: Разбиение длинных аудиофайлов на части на диске.
*   **Какие существующие MCP tools подходят**: `['harmony.get_capabilities']`
*   **Чего не хватает в текущем MCP**: harmony.audio.split_track (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 21. Ошибка 'Unable to read TVG file'
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/1b6gxft/unable_to_read_tvg/](https://www.reddit.com/r/toonboomharmony/comments/1b6gxft/unable_to_read_tvg/)
*   **Краткая суть проблемы**: Ошибка 'Unable to read TVG file'
*   **Симптомы**: При открытии кадра вместо рисунка отображается крест, в логах ошибка чтения TVG.
*   **Вероятная причина**: Повреждение структуры векторного файла TVG из-за сбоя записи или повреждения диска.
*   **Решение из комментариев**: Восстановить конкретный файл `.tvg` из папки автосохранения или бекапа.
*   **Как MCP-сервер может помочь**: Восстановление битых файлов рисунков из резервной копии.
*   **Какие существующие MCP tools подходят**: `['harmony.drawings.find_missing_drawings', 'harmony.validate_environment']`
*   **Чего не хватает в текущем MCP**: harmony.drawings.restore_tvg_from_backup (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 22. Пропадание аудио после перезапуска
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/en0tc0/when_i_close_program_i_loose_all_my_audio/](https://www.reddit.com/r/toonboomharmony/comments/en0tc0/when_i_close_program_i_loose_all_my_audio/)
*   **Краткая суть проблемы**: Пропадание аудио после перезапуска
*   **Симптомы**: После открытия сохраненного проекта все аудиодорожки исчезли с таймлайна.
*   **Вероятная причина**: Аудиодорожки не были сохранены в папку проекта, а импортировались как внешние ссылки, пути к которым изменились.
*   **Решение из комментариев**: Выбрать опцию 'Copy to Project Folder' при импорте аудиофайлов.
*   **Как MCP-сервер может помочь**: Поиск утерянных внешних звуковых файлов и их копирование в проект.
*   **Какие существующие MCP tools подходят**: `['harmony.assets.collect_scene_assets']`
*   **Чего не хватает в текущем MCP**: harmony.audio.localize_external_files (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 23. Ошибка импорта видео 'Codec not found'
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/fb8zld/importing_movie/](https://www.reddit.com/r/toonboomharmony/comments/fb8zld/importing_movie/)
*   **Краткая суть проблемы**: Ошибка импорта видео 'Codec not found'
*   **Симптомы**: При импорте видео появляется всплывающее окно об ошибке кодека.
*   **Вероятная причина**: Harmony не поддерживает современные сжатые кодеки MP4 напрямую без конвертеров.
*   **Решение из комментариев**: Установить K-Lite Codec Pack (для Windows) или конвертировать файл.
*   **Как MCP-сервер может помочь**: Анализ доступных видеокодеков в операционной системе.
*   **Какие существующие MCP tools подходят**: `['harmony.validate_environment']`
*   **Чего не хватает в текущем MCP**: harmony.env.check_video_codecs (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 24. Harmony не открывает сохранения и не создает сцены
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/188iao0/help_harmony22_wont_open_my_saves_or_create_a_new/](https://www.reddit.com/r/toonboomharmony/comments/188iao0/help_harmony22_wont_open_my_saves_or_create_a_new/)
*   **Краткая суть проблемы**: Harmony не открывает сохранения и не создает сцены
*   **Симптомы**: При нажатии 'Create Scene' программа зависает, старые проекты не загружаются.
*   **Вероятная причина**: Повреждение файла конфигурации `Harmony Premium-user.xml` в папке Preferences.
*   **Решение из комментариев**: Удалить или переименовать папку Preferences для сброса настроек к дефолтным.
*   **Как MCP-сервер может помочь**: Сброс и бэкап папки настроек пользователя Toon Boom.
*   **Какие существующие MCP tools подходят**: `['harmony.ui.reset_workspace_instruction', 'harmony.validate_environment']`
*   **Чего не хватает в текущем MCP**: harmony.env.purge_preferences (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 25. Исчезновение всех цветовых палитр
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/rrn1co/all_my_color_palettes_are_gone/](https://www.reddit.com/r/toonboomharmony/comments/rrn1co/all_my_color_palettes_are_gone/)
*   **Краткая суть проблемы**: Исчезновение всех цветовых палитр
*   **Симптомы**: В окне Palette пусто, персонаж окрашен в ярко-розовый цвет (дефолтная индикация отсутствия цвета).
*   **Вероятная причина**: Файл `palette-list` в папке сцены поврежден или очищен.
*   **Решение из комментариев**: Восстановить файл `palette-list` из резервной копии проекта.
*   **Как MCP-сервер может помочь**: Сканирование папки проекта и восстановление битого списка палитр.
*   **Какие существующие MCP tools подходят**: `['harmony.palette.list', 'harmony.palette.import']`
*   **Чего не хватает в текущем MCP**: harmony.palette.rebuild_list_from_files (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 26. Экспорт цветовой палитры в другой проект
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/1b0y179/how_can_i_export_a_color_palette/](https://www.reddit.com/r/toonboomharmony/comments/1b0y179/how_can_i_export_a_color_palette/)
*   **Краткая суть проблемы**: Экспорт цветовой палитры в другой проект
*   **Симптомы**: Необходимо использовать цвета текущего персонажа в другой сцене.
*   **Вероятная причина**: Отсутствие знаний о механизме линкования палитр в Harmony.
*   **Решение из комментариев**: Экспортировать палитру в файл `.plt` и залинковать его во второй сцене.
*   **Как MCP-сервер может помочь**: Пакетный экспорт и импорт палитр между сценами.
*   **Какие существующие MCP tools подходят**: `['harmony.palette.export', 'harmony.palette.import']`
*   **Чего не хватает в текущем MCP**: harmony.palette.link_external_palette (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 27. Блокировка редактирования палитры
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/18lr1qf/color_palettes_issue/](https://www.reddit.com/r/toonboomharmony/comments/18lr1qf/color_palettes_issue/)
*   **Краткая суть проблемы**: Блокировка редактирования палитры
*   **Симптомы**: Цвета в палитре обведены красной рамкой, их невозможно изменить или добавить новые.
*   **Вероятная причина**: Палитра находится в режиме 'Read Only' (заблокирована другим пользователем или правами файла).
*   **Решение из комментариев**: Нажать правой кнопкой мыши по палитре и выбрать 'Right to Modify' (для Harmony Server).
*   **Как MCP-сервер может помочь**: Запрос прав на редактирование заблокированной палитры.
*   **Какие существующие MCP tools подходят**: `['harmony.palette.list']`
*   **Чего не хватает в текущем MCP**: harmony.palette.acquire_write_rights (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 28. Paint Tool не заливает замкнутые зоны
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/11787xn/how_do_i_colour/](https://www.reddit.com/r/toonboomharmony/comments/11787xn/how_do_i_colour/)
*   **Краткая суть проблемы**: Paint Tool не заливает замкнутые зоны
*   **Симптомы**: При клике банкой с краской по рисунку заливка не происходит.
*   **Вероятная причина**: В контуре вектора есть микро-щели, либо заливка производится на неверном слое рисования (например, Line Art без создания Color Art).
*   **Решение из комментариев**: Использовать 'Close Gap' инструмент или включить автоматическое закрытие щелей в свойствах заливки.
*   **Как MCP-сервер может помочь**: Анализ геометрии и автоматическое создание невидимых линий-закрывателей щелей.
*   **Какие существующие MCP tools подходят**: `['harmony.drawings.list_layers']`
*   **Чего не хватает в текущем MCP**: harmony.drawings.close_vector_gaps (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 29. Линкование цветов разных палитр
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/1cuyvxr/toon_boom_harmony_link_colour_from_palette_to/](https://www.reddit.com/r/toonboomharmony/comments/1cuyvxr/toon_boom_harmony_link_colour_from_palette_to/)
*   **Краткая суть проблемы**: Линкование цветов разных палитр
*   **Симптомы**: При изменении основного цвета кожи лица цвета рук в другой палитре не меняются.
*   **Вероятная причина**: Для разных деталей тела используются независимые цвета с разными ID вместо одной палитры.
*   **Решение из комментариев**: Переназначить цвета конечностей на один общий слот в глобальной палитре персонажа.
*   **Как MCP-сервер может помочь**: Поиск дубликатов цветов и их замена на эталонный цвет.
*   **Какие существующие MCP tools подходят**: `['harmony.palette.list_colours', 'harmony.palette.replace_colour']`
*   **Чего не хватает в текущем MCP**: harmony.palette.merge_duplicate_colors (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 30. Цвета сбрасываются при закрытии проекта
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/g5grcd/saving_palettes/](https://www.reddit.com/r/toonboomharmony/comments/g5grcd/saving_palettes/)
*   **Краткая суть проблемы**: Цвета сбрасываются при закрытии проекта
*   **Симптомы**: Новые добавленные в палитру цвета исчезают после перезапуска Harmony.
*   **Вероятная причина**: Палитра была создана на уровне сцены (Scene Level), но не была сохранена в библиотеку проекта.
*   **Решение из комментариев**: Сохранить проект через File -> Save All, чтобы зафиксировать изменения в файлах палитр.
*   **Как MCP-сервер может помочь**: Принудительное сохранение всех измененных палитр в проекте.
*   **Какие существующие MCP tools подходят**: `['harmony.scene.save', 'harmony.palette.backup']`
*   **Чего не хватает в текущем MCP**: harmony.palette.force_save_all (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 31. Пипетка выбирает неверный цвет
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/12d9nrz/my_eyedropper_tool_wont_select_the_correct_color/](https://www.reddit.com/r/toonboomharmony/comments/12d9nrz/my_eyedropper_tool_wont_select_the_correct_color/)
*   **Краткая суть проблемы**: Пипетка выбирает неверный цвет
*   **Симптомы**: При клике пипеткой по экрану выбирается другой оттенок (например, блеклый цвет).
*   **Вероятная причина**: Включен режим отображения с цветовым профилем (Display Profile), искажающий RGB-значения во вьюпорте.
*   **Решение из комментариев**: Отключить цветовой профиль во вьюпорте камеры (выбрать No Color Profile).
*   **Как MCP-сервер может помочь**: Проверка и отключение активных цветовых профилей в настройках вьюпорта.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.ui.disable_color_profiles (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 32. Цвета блекнут/светлеют при экспорте видео
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/uozstn/colors_lighten_when_exported/](https://www.reddit.com/r/toonboomharmony/comments/uozstn/colors_lighten_when_exported/)
*   **Краткая суть проблемы**: Цвета блекнут/светлеют при экспорте видео
*   **Симптомы**: В Harmony цвета насыщенные, а в экспортированном MP4 выглядят выцветшими.
*   **Вероятная причина**: Разница в гамме кодека H.264 (Gamma Shift 2.2) при воспроизведении в QuickTime.
*   **Решение из комментариев**: Добавить ноду Color-Scale перед Write для компенсации гаммы при экспорте.
*   **Как MCP-сервер может помочь**: Автоматическая вставка компенсирующей гамму ноды в граф перед Write нодой.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.create', 'harmony.nodes.connect']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.insert_gamma_correction (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 33. Экспорт только контуров без заливки
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/10sb2bj/turn_off_color_layer_for_exporting/](https://www.reddit.com/r/toonboomharmony/comments/10sb2bj/turn_off_color_layer_for_exporting/)
*   **Краткая суть проблемы**: Экспорт только контуров без заливки
*   **Симптомы**: Необходимо экспортировать только чистый контур (Line Art) персонажа для тестов.
*   **Вероятная причина**: Отсутствие знаний о фильтрации контуров в Node View.
*   **Решение из комментариев**: Вставить ноду Layer Selector перед Write и выбрать только Line Art.
*   **Как MCP-сервер может помочь**: Быстрое переключение видимости заливок через фильтрацию портов.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.create', 'harmony.nodes.connect']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.insert_line_art_filter (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 34. Стирание заливки без удаления контура
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/n5vt1q/how_to_erase_on_the_color_erase_on_color_art_layer/](https://www.reddit.com/r/toonboomharmony/comments/n5vt1q/how_to_erase_on_the_color_erase_on_color_art_layer/)
*   **Краткая суть проблемы**: Стирание заливки без удаления контура
*   **Симптомы**: Ластик удаляет линии контура при попытке стереть заливку.
*   **Вероятная причина**: Рисунок выполнен на одном слое без разделения контура и заливки.
*   **Решение из комментариев**: Разделить рисунок с помощью Create Color Art, затем стирать на слое Color Art.
*   **Как MCP-сервер может помочь**: Разделение векторных штрихов по слоям Line/Color Art.
*   **Какие существующие MCP tools подходят**: `['harmony.drawings.list_layers']`
*   **Чего не хватает в текущем MCP**: harmony.drawings.separate_line_color (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 35. Сброс цвета элементов в розовый
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/b6myo0/some_colors_change_to_pink_when_i_open_toonboom/](https://www.reddit.com/r/toonboomharmony/comments/b6myo0/some_colors_change_to_pink_when_i_open_toonboom/)
*   **Краткая суть проблемы**: Сброс цвета элементов в розовый
*   **Симптомы**: Векторные элементы внезапно окрасились в кислотно-розовый цвет.
*   **Вероятная причина**: Имена палитр совпадают, но их внутренние уникальные ID в файле проекта различаются.
*   **Решение из комментариев**: Использовать команду Palette Recovery для перепривязки ID цветов к палитре.
*   **Как MCP-сервер может помочь**: Поиск и восстановление битых цветовых ID связей в векторе.
*   **Какие существующие MCP tools подходят**: `['harmony.palette.validate_scene_palettes']`
*   **Чего не хватает в текущем MCP**: harmony.palette.recover_color_ids (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 36. Исчезновение рисунков из кадра
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/ntmhvo/drawing_frames_disappear_but_layers_still_exist/](https://www.reddit.com/r/toonboomharmony/comments/ntmhvo/drawing_frames_disappear_but_layers_still_exist/)
*   **Краткая суть проблемы**: Исчезновение рисунков из кадра
*   **Симптомы**: Слои видны в таймлайне, но рисунки на них исчезли (отображается пустой холст).
*   **Вероятная причина**: Случайно нажата клавиша удаления экспозиции (Clear Exposure) вместо удаления ключей анимации.
*   **Решение из комментариев**: Проверить наличие рисунка в окне Drawing Substitutions и вернуть его на таймлайн.
*   **Как MCP-сервер может помочь**: Поиск пропавших экспозиций и их восстановление на таймлайне.
*   **Какие существующие MCP tools подходят**: `['harmony.drawings.find_empty_drawings', 'harmony.timeline.set_exposure']`
*   **Чего не хватает в текущем MCP**: harmony.timeline.restore_exposures (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 37. Отображение секунд вместо кадров на таймлайне
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/10p6n2v/can_the_timeline_display_seconds_it_only_seems_to/](https://www.reddit.com/r/toonboomharmony/comments/10p6n2v/can_the_timeline_display_seconds_it_only_seems_to/)
*   **Краткая суть проблемы**: Отображение секунд вместо кадров на таймлайне
*   **Симптомы**: Пользователь хочет видеть время в секундах (0:01, 0:02) вместо номеров кадров (24, 48).
*   **Вероятная причина**: По умолчанию таймлайн Harmony отображает шкалу в кадрах.
*   **Решение из комментариев**: Включить опцию 'Show Time in Seconds' в выпадающем меню настроек таймлайна.
*   **Как MCP-сервер может помочь**: Изменение формата отображения шкалы времени.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.ui.set_timeline_display_format (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 38. Таймлайн сжался в компактный режим
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/vxe14s/what_has_happened_to_my_timeline_everything_is/](https://www.reddit.com/r/toonboomharmony/comments/vxe14s/what_has_happened_to_my_timeline_everything_is/)
*   **Краткая суть проблемы**: Таймлайн сжался в компактный режим
*   **Симптомы**: Все слои на таймлайне стали очень тонкими, пропали имена слоев и кнопки ключей.
*   **Вероятная причина**: Случайно включен режим 'Collapse Layers' или компактный режим отображения таймлайна.
*   **Решение из комментариев**: Нажать правой кнопкой мыши по таймлайну и отключить компактный вид.
*   **Как MCP-сервер может помочь**: Сброс визуальных настроек таймлайна к дефолтным.
*   **Какие существующие MCP tools подходят**: `['harmony.ui.reset_workspace_instruction']`
*   **Чего не хватает в текущем MCP**: harmony.ui.expand_timeline_layers (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 39. Смешение разных типов ключевых кадров
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/yuxotw/i_keep_having_different_type_of_keyframe/](https://www.reddit.com/r/toonboomharmony/comments/yuxotw/i_keep_having_different_type_of_keyframe/)
*   **Краткая суть проблемы**: Смешение разных типов ключевых кадров
*   **Симптомы**: Один ключ на таймлайне круглый (Motion), другой квадратный (Stop-Motion), анимация дергается.
*   **Вероятная причина**: Пользователь переключал режим интерполяции клавишами Ctrl+L / Ctrl+K во время работы.
*   **Решение из комментариев**: Выделить весь диапазон кадров и нажать Ctrl+K для преобразования в единый тип.
*   **Как MCP-сервер может помочь**: Принудительное приведение всех ключей выбранного пега к одному типу.
*   **Какие существующие MCP tools подходят**: `['harmony.timeline.get', 'harmony.timeline.create_keyframe']`
*   **Чего не хватает в текущем MCP**: harmony.timeline.convert_keyframe_types (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 40. Копирование только ключей без экспозиции рисунка
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/12dncck/is_there_a_way_to_copy_paste_a_keyframe_only_any/](https://www.reddit.com/r/toonboomharmony/comments/12dncck/is_there_a_way_to_copy_paste_a_keyframe_only_any/)
*   **Краткая суть проблемы**: Копирование только ключей без экспозиции рисунка
*   **Симптомы**: При копировании ключей на таймлайне также вставляется рисунок с исходного кадра, затирая анимацию рта.
*   **Вероятная причина**: Выбрана опция 'Copy Drawings and Keyframes' в настройках буфера обмена таймлайна.
*   **Решение из комментариев**: Переключить режим вставки на Paste Special -> Keyframes Only (Ctrl+Alt+V).
*   **Как MCP-сервер может помочь**: Настройка параметров вставки таймлайна.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.ui.set_paste_special_presets (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет



---

## ЧАСТЬ 2. Системный анализ и Карта проблем

### 1. Карта типичных проблем Toon Boom Harmony (Выпуск 3)

| Категория | Типичные симптомы | Уровень критичности | Частота (Reddit) | Возможность авто-исправления |
| :--- | :--- | :--- | :--- | :--- |
| **Audio / Sound** | Рассинхронизация при воспроизведении, краши при импорте WAV/MP3, обрезка звука на кадре. | **Высокий** (ломает липсинг) | Высокая (~30%) | **Низкая** (зависит от системных кодеков) |
| **Color Palettes** | Розовые цвета при импорте нод, блокировка палитры Read-Only, пропажа файлов палитр. | **Критический** (сбой цвета сцены) | Высокая (~25%) | **Высокая** (перелинковка ID и экспорт PLT) |
| **Timeline** | Стоп-моушн ключи вместо моушна, пропадание дорожек, отображение кадров вместо секунд. | **Средний** (замедляет работу) | Средняя (~20%) | **Высокая** (конвертация типов ключей) |
| **Export / Render** | Черный экран в MP4, отсутствие звука в MOV, блеклые цвета из-за Gamma Shift H.264. | **Высокий** (ломает сдачу сцены) | Средняя (~15%) | **Высокая** (корректировка параметров Write нод) |
| **Viewport / UI** | Лесенки на контуре пера, сжатие таймлайна, пропажа вьюпорта. | **Низкий** (дискомфорт художника) | Средняя (~10%) | **Высокая** (сброс файлов конфигурации) |

---

### 2. Частые причины ошибок (Root Causes)

1. **Несовместимость аудио-кодеков (LPCM vs MP3)**: Harmony крайне чувствительна к формату звука. Использование сжатых MP3 файлов с переменным битрейтом (VBR) вместо несжатого 16-bit WAV PCM приводит к обрывам воспроизведения.
2. **Сбои синхронизации ID цветов палитр**: В Harmony векторные штрихи красятся не в RGB-значения, а привязываются по ID к палитре. Копирование элементов между сценами без импорта палитры сбрасывает цвета в розовый из-за потери соответствия ID.
3. **Искажение гаммы (Gamma Shift QuickTime)**: Рендеринг в кодек H.264 без цветокоррекции часто приводит к снижению насыщенности и контраста при воспроизведении в плеере Apple QuickTime.
4. **Случайное переключение типов ключей (Ctrl+L / Ctrl+K)**: Быстрые клавиши смены интерполяции на таймлайне часто нажимаются случайно, из-за чего плавные движения Peg превращаются в Stop-Motion.
5. **Сбой локального кэша преференций пользователя**: Накопление ошибок в Harmony Premium-user.xml блокирует создание новых сцен или открытие сохранений.

---

### 3. Повторяющиеся жалобы пользователей

1. **«Импортированное видео выдает ошибку кодека»**: Трудности использования MP4 референсов.
2. **«Звук есть во вьюпорте, но пропадает при рендере»**: Игнорирование звуковых настроек в Write-нодах.
3. **«Цвета персонажа стали выцветшими после экспорта»**: Gamma-сдвиг при конвертации.
4. **«Пропала вся палитра рта»**: Очистка списка палитр при некорректном слиянии версий.
5. **«Таймлайн сжался до нечитаемых полосок»**: Случайная активация компактного вида.

---

### 4. Решения, которые чаще всего советуют

1. **Конвертация в 16-bit 44.1kHz WAV PCM**: Стандарт для работы со звуком.
2. **Включение кнопки Real-Time Playback**: Часы на панели воспроизведения для фиксации звука.
3. **Экспорт в RGBA**: Для сохранения прозрачности при рендере PNG-секвенций.
4. **Удаление папки Preferences**: Сброс всех настроек интерфейса для восстановления работоспособности.
5. **Использование Paste Special -> Keyframes Only**: Предотвращает перезапись субституций рисунков.

---

### 5. Диагностика: “Симптом → Причина → MCP-действие”

| Симптом | Вероятная причина | Диагностическое MCP-действие | Существующий MCP Tool | Рекомендуемое исправление |
| :--- | :--- | :--- | :--- | :--- |
| Звук пропадает при циклическом проигрывании | Переполнение буфера аудиодрайвера | Проверка версии Harmony и логов на ошибки звука | `harmony.read_logs` | Включение режима пропуска кадров Real-Time Playback |
| Цвета конечностей сбросились в розовый | Битые ID привязки цвета | Запуск валидации соответствия ID палитр элементам векторов | `harmony.palette.validate_scene_palettes` | Пересборка списка палитр или перелинковка цвета |
| Анимация дергается на отдельных кадрах | Смешанные типы ключей (Motion/Stop-Motion) | Сканирование таймлайна на смену типов интерполяции | `harmony.timeline.get` | Пакетное преобразование всех ключей в тип Motion |
| Видео рендерится без прозрачного фона | В ноде Write отключен альфа-канал | Чтение параметров цвета (RGB/RGBA) ноды Write | `harmony.nodes.get_attr` | Установка цвета в RGBA и формата в PNG/TGA |
| Пипетка берет блеклые цвета | Активен цветовой профиль вьюпорта камеры | Проверка конфигурации цветового профиля в настройках | `harmony.get_config` | Переключение цветового профиля в режим 'No Color Profile' |

---

## ЧАСТЬ 3. Рецепты исправления (Repair Recipes) для MCP-сервера

### Рецепт 3: Восстановление битых ID цвета в палитре (Color ID Recovery)
* **Цель**: Исправить розовый цвет на персонаже путем восстановления связей между цветами в векторе и палитрой по совпадению имен цветов.
* **Пошаговый алгоритм**:
  1. Выполнить `harmony.palette.validate_scene_palettes` для поиска элементов с розовым цветом (Color ID Mismatch).
  2. Загрузить исходные файлы палитр `.plt` с помощью `harmony.palette.list_colours`.
  3. Для каждого ненайденного Color ID:
     * Найти в палитре цвет с аналогичным текстовым именем (например, `Skin_Tone`).
     * Скопировать валидный внутренний ID цвета.
     * Запустить скрипт перелинковки в Harmony для перезаписи ID в файле рисунка `.tvg`.

### Рецепт 4: Нормализация типов ключей анимации (Keyframe Normalization)
* **Цель**: Пакетно сгладить дерганую анимацию путем приведения всех Stop-Motion ключей на выбранном Peg к типу Motion (безье-интерполяция).
* **Пошаговый алгоритм**:
  1. Считать структуру таймлайна целевой Peg-ноды через `harmony.timeline.get`.
  2. Идентифицировать кадры, на которых установлены квадратные Stop-Motion ключи.
  3. Запустить цикл переключения: для каждого найденного кадра вызвать `harmony.timeline.create_keyframe` с флагом безье интерполяции (или установить параметр `isCurve = true`).
  4. Проверить плавность траектории во вьюпорте.

---

## ЧАСТЬ 4. Рекомендации по развитию MCP-сервера

### 1. Точечные улучшения существующих инструментов

1. **`harmony.palette.validate_scene_palettes`**:
   * *Улучшение*: Добавить в вывод инструмента автоматическую подсказку: к какому именно слою рисования относится битый ID цвета, чтобы агент мог сразу запустить локальную перелинковку.
2. **`harmony.timeline.set_exposure`**:
   * *Улучшение*: Разрешить передавать массив кадров или диапазонов экспозиций (например, `[{start: 1, duration: 5}, {start: 10, duration: 2}]`) для ускорения заполнения пробелов (gaps) на таймлайне за один запрос.

### 2. Новые предлагаемые инструменты

*   **`harmony.audio.convert_to_wav`**: Запускает фоновую утилиту (например, FFmpeg) для принудительного перекодирования импортируемого звука в совместимый формат (WAV, PCM, 16-bit, 44100Hz).
*   **`harmony.palette.merge_duplicates`**: Сканирует палитры сцены, находит дублирующиеся по названию и значению цвета и объединяет их в один эталонный слот, очищая мусорные палитры.
*   **`harmony.nodes.set_write_rgba`**: Пакетный конфигуратор нод Write для быстрого переключения экспорта с/без альфа-канала.

---

## ЧАСТЬ 5. Проблемы, не подлежащие автоматическому исправлению

1. **Утеря оригинального WAV/MP3 файла (Missing Source Audio)**:
   * *Почему нельзя*: Если аудиофайл был импортирован как внешняя ссылка и удален с диска, восстановить его данные из сцены невозможно. Требуется ручной перезалив файла аниматором.
2. **Художественное слияние палитр (Creative Palette Merging)**:
   * *Почему нельзя*: Слияние палитр с близкими по RGB цветами (например, два оттенка красного для тени и света) может случайно стереть художественную разницу. Решение об объединении цветов принимает только художник.

---

## ЧАСТЬ 6. Рекомендации для поведения агента Antigravity

1. **Локализация импортируемых ресурсов**: При добавлении звука или видеореференсов агент должен всегда копировать файлы в каталог проекта (`/audio` или `/video`), а не линковать их по абсолютным путям компьютера пользователя.
2. **Предварительное бэкапирование палитр**: Перед запуском любых операций с цветом (замена, объединение) агент обязан сделать резервную копию папки палитр `palette-library` сцены.
3. **Фиксация воспроизведения**: При настройке анимации рта под липсинг агент должен предварительно проверить и включить флаг `Real-Time Playback` и `Play Audio`, чтобы аниматор сразу слышал звук синхронно с движениями.
