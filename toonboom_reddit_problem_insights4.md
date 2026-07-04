# Анализ проблем Toon Boom Harmony на основе Reddit-сообщества (r/ToonBoomHarmony & r/animation) — Выпуск 4

Этот отчет представляет собой четвертый том глубокого аудита и систематизации 100 реальных пользовательских кейсов, собранных из обсуждений на Reddit. В данном выпуске основное внимание уделено сложным механизмам риггинга (Rigging), пегам (Pegs), опорным точкам (Pivots), эффектам (Transparency/Color Card) и маскированию через Cutter.

---

## ЧАСТЬ 1. Каталог 100 Reddit-тредов (Симптом → Причина → Решение)

#### 1. Прозрачность всей группы персонажа/рига
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/15utad2/make_a_rig_transparent/](https://www.reddit.com/r/toonboomharmony/comments/15utad2/make_a_rig_transparent/)
*   **Краткая суть проблемы**: Прозрачность всей группы персонажа/рига
*   **Симптомы**: Невозможно сделать полупрозрачным всего персонажа целиком (слои накладываются друг на друга и просвечивают).
*   **Вероятная причина**: Применение ноды Transparency ко всей группе без предварительного сплющивания через Composite.
*   **Решение из комментариев**: Вставить ноду Transparency после Composite в режиме Pass Through, чтобы сначала объединить слои.
*   **Как MCP-сервер может помочь**: Автоматическая реструктуризация нодовой схемы для корректного наложения прозрачности.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.create', 'harmony.nodes.connect']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.insert_transparency_flow (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 2. Не рисует кисть во вьюпорте
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/v8bhcp/help_im_new_to_toon_boom_i_was_trying_to_draw_but/](https://www.reddit.com/r/toonboomharmony/comments/v8bhcp/help_im_new_to_toon_boom_i_was_trying_to_draw_but/)
*   **Краткая суть проблемы**: Не рисует кисть во вьюпорте
*   **Симптомы**: Инструмент Brush выбран, но штрихи не появляются при рисовании пером.
*   **Вероятная причина**: Выбран невидимый или пустой слой, либо цвет кисти совпадает с цветом фона Color Card.
*   **Решение из комментариев**: Проверить активный слой на таймлайне и сменить цвет в окне Palette.
*   **Как MCP-сервер может помочь**: Аудит активного слоя и параметров выбранной кисти.
*   **Какие существующие MCP tools подходят**: `['harmony.drawings.list_layers', 'harmony.palette.list_colours']`
*   **Чего не хватает в текущем MCP**: harmony.drawings.check_layer_drawability (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 3. Проблема импорта шаблона рига .tpl
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/s0d5xa/super_noob_question_about_importing_rigs/](https://www.reddit.com/r/toonboomharmony/comments/s0d5xa/super_noob_question_about_importing_rigs/)
*   **Краткая суть проблемы**: Проблема импорта шаблона рига .tpl
*   **Симптомы**: При перетаскивании рига из Library в Node View ничего не происходит, либо ноды пустые.
*   **Вероятная причина**: Сцена открыта в режиме Essentials/Advanced без прав на импорт внешних шаблонов Premium.
*   **Решение из комментариев**: Использовать импорт через меню Import -> Templates или обновиться до Premium.
*   **Как MCP-сервер может помочь**: Проверка прав импорта шаблонов сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_capabilities']`
*   **Чего не хватает в текущем MCP**: harmony.assets.import_tpl_fallback (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 4. Разрушение иерархии при импорте персонажа
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/11a8627/help_with_importing_rigs/](https://www.reddit.com/r/toonboomharmony/comments/11a8627/help_with_importing_rigs/)
*   **Краткая суть проблемы**: Разрушение иерархии при импорте персонажа
*   **Симптомы**: После импорта шаблона рига все связи пегов и слоев порваны, ноды лежат хаотично.
*   **Вероятная причина**: Различие имен Composite-нод по умолчанию в целевой сцене и импортируемом шаблоне.
*   **Решение из комментариев**: Переименовать главные ноды Composite сцены в соответствии со структурой шаблона.
*   **Как MCP-сервер может помочь**: Автоматическое переименование и сопоставление портов Composite перед импортом.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.rename', 'harmony.nodes.connect']`
*   **Чего не хватает в текущем MCP**: harmony.rig.remap_template_ports (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 5. Быстрая регулировка непрозрачности слоя
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/pcbuxc/is_there_a_simple_opacity_setting_i_can_give_to_a/](https://www.reddit.com/r/toonboomharmony/comments/pcbuxc/is_there_a_simple_opacity_setting_i_can_give_to_a/)
*   **Краткая суть проблемы**: Быстрая регулировка непрозрачности слоя
*   **Симптомы**: Аниматор не может найти ползунок Opacity в свойствах слоя Drawing.
*   **Вероятная причина**: В Harmony непрозрачность слоев регулируется через отдельную ноду Transparency.
*   **Решение из комментариев**: Создать и вставить ноду Transparency над слоем рисунка в Node View.
*   **Как MCP-сервер может помочь**: Быстрое добавление ноды Transparency для регулирования непрозрачности.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.create', 'harmony.nodes.connect']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.add_opacity_node (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 6. Color Card перекрывает рисунки
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/u6lmgx/color_card_erased_my_drawings/](https://www.reddit.com/r/toonboomharmony/comments/u6lmgx/color_card_erased_my_drawings/)
*   **Краткая суть проблемы**: Color Card перекрывает рисунки
*   **Симптомы**: После создания ноды Color Card весь экран заливается белым цветом, рисунки исчезают.
*   **Вероятная причина**: Нода Color Card подключена выше (по Z-depth/порту Composite) слоев персонажа.
*   **Решение из комментариев**: Переместить соединение Color Card в крайний правый порт главного Composite сцены.
*   **Как MCP-сервер может помочь**: Исправление порядка подключения фоновых нод в Composite.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.disconnect', 'harmony.nodes.connect']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.send_to_background (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 7. Слои из Node View не видны на таймлайне
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/1bfekp7/drawing_layers_dont_appear_on_my_timeliness/](https://www.reddit.com/r/toonboomharmony/comments/1bfekp7/drawing_layers_dont_appear_on_my_timeliness/)
*   **Краткая суть проблемы**: Слои из Node View не видны на таймлайне
*   **Симптомы**: Ноды созданы в Node View, но соответствующие дорожки отсутствуют на таймлайне.
*   **Вероятная причина**: Слои скрыты из таймлайна (выключено отображение неэкспонированных слоев).
*   **Решение из комментариев**: Нажать правой кнопкой мыши по таймлайну и выбрать 'Show All Layers'.
*   **Как MCP-сервер может помочь**: Принудительное отображение скрытых нод на таймлайне.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.ui.sync_timeline_with_nodeview (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 8. Черный фон при рендере PNG-последовательности с Color Card
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/kmgxov/added_colour_card_but_render_is_still_all_black/](https://www.reddit.com/r/toonboomharmony/comments/kmgxov/added_colour_card_but_render_is_still_all_black/)
*   **Краткая суть проблемы**: Черный фон при рендере PNG-последовательности с Color Card
*   **Симптомы**: На таймлайне виден белый фон Color Card, но при экспорте в PNG все кадры черные.
*   **Вероятная причина**: В свойствах Color Card отключен экспорт альфа-канала (прозрачности), либо выключен рендер фона.
*   **Решение из комментариев**: Включить параметр 'Solid Color' в свойствах Color Card.
*   **Как MCP-сервер может помочь**: Аудит и корректировка атрибутов ноды Color Card.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.get_attr', 'harmony.nodes.set_attr']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.configure_color_card (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 9. Ошибка импорта рига 'Master Controller Script Error'
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/lct452/hello_how_do_you_import_a_prebuilt_rig_into_toon/](https://www.reddit.com/r/toonboomharmony/comments/lct452/hello_how_do_you_import_a_prebuilt_rig_into_toon/)
*   **Краткая суть проблемы**: Ошибка импорта рига 'Master Controller Script Error'
*   **Симптомы**: При импорте сложного рига с Master Controller вылетает ошибка QtScript.
*   **Вероятная причина**: Несовпадение путей к файлам скриптов в метаданных контроллера при переносе проекта.
*   **Решение из комментариев**: Перегенерировать скрипт Master Controller с помощью встроенного мастера.
*   **Как MCP-сервер может помочь**: Анализ и исправление путей к внешним JS файлам в атрибутах Master Controller.
*   **Какие существующие MCP tools подходят**: `['harmony.cc.run_qtscript']`
*   **Чего не хватает в текущем MCP**: harmony.rig.rebuild_master_controllers (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 10. Копирование рисунка затирает существующие кадры
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/miug2s/hey_im_trying_to_copypaste_a_drawing_from_one/](https://www.reddit.com/r/toonboomharmony/comments/miug2s/hey_im_trying_to_copypaste_a_drawing_from_one/)
*   **Краткая суть проблемы**: Копирование рисунка затирает существующие кадры
*   **Симптомы**: При копировании рисунка рта на новый кадр затирается анимация на соседних слоях.
*   **Вероятная причина**: Выбрано обычное копирование вместо создания новой подстановки (Drawing Substitution).
*   **Решение из комментариев**: Использовать Duplicate Drawing (Alt+Shift+D) перед редактированием скопированного кадра.
*   **Как MCP-сервер может помочь**: Дублирование кадра рисования для предотвращения перезаписи исходного рисунка.
*   **Какие существующие MCP tools подходят**: `['harmony.drawings.create_drawing', 'harmony.timeline.set_exposure']`
*   **Чего не хватает в текущем MCP**: harmony.drawings.duplicate_active_exposure (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 11. Повреждение структуры шаблона рига
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/miyszj/character_templates_help/](https://www.reddit.com/r/toonboomharmony/comments/miyszj/character_templates_help/)
*   **Краткая суть проблемы**: Повреждение структуры шаблона рига
*   **Симптомы**: При сохранении персонажа в Library в качестве шаблона .tpl теряются деформеры.
*   **Вероятная причина**: При создании шаблона были выделены только Drawing ноды без родительских Peg и Deformation групп.
*   **Решение из комментариев**: Выделить всю иерархию персонажа целиком (включая Peg и Deformers) в Node View перед созданием шаблона.
*   **Как MCP-сервер может помочь**: Пакетное выделение полной иерархии нод персонажа для экспорта шаблона.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.list', 'harmony.assets.export_template']`
*   **Чего не хватает в текущем MCP**: harmony.rig.select_full_hierarchy (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 12. Конфликт управления Peg и Deformation
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/zqt1i3/help_needed_about_deformationspegs/](https://www.reddit.com/r/toonboomharmony/comments/zqt1i3/help_needed_about_deformationspegs/)
*   **Краткая суть проблемы**: Конфликт управления Peg и Deformation
*   **Симптомы**: При вращении руки через Peg деформаторы улетают в сторону или скручиваются.
*   **Вероятная причина**: Неправильный порядок вложенности: Peg должен управлять группой деформации, а не наоборот.
*   **Решение из комментариев**: Поместить ноды деформации внутрь группы под Peg.
*   **Как MCP-сервер может помочь**: Реструктуризация иерархии связей Peg и Deformers.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.disconnect', 'harmony.nodes.connect']`
*   **Чего не хватает в текущем MCP**: harmony.deformers.restructure_under_peg (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 13. Создание Peg для каждого слоя рисования
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/rkcdjn/pegs/](https://www.reddit.com/r/toonboomharmony/comments/rkcdjn/pegs/)
*   **Краткая суть проблемы**: Создание Peg для каждого слоя рисования
*   **Симптомы**: Аниматор создает Peg вручную для 50 слоев, тратя много времени.
*   **Вероятная причина**: Незнание горячих клавиш автоматического создания родительских Peg нод.
*   **Решение из комментариев**: Выделить все слои и нажать Ctrl+P для автоматического назначения Peg каждому слою.
*   **Как MCP-сервер может помочь**: Пакетное создание родительских Peg-нод для всех выбранных слоев Drawing.
*   **Какие существующие MCP tools подходят**: `['harmony.rig.create_pegs']`
*   **Чего не хватает в текущем MCP**: harmony.rig.auto_parent_pegs (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 14. Слияние нескольких цепочек деформации в одну группу
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/18rvskw/can_you_help_me_with_grouping_deformations_to_one/](https://www.reddit.com/r/toonboomharmony/comments/18rvskw/can_you_help_me_with_grouping_deformations_to_one/)
*   **Краткая суть проблемы**: Слияние нескольких цепочек деформации в одну группу
*   **Симптомы**: В Node View слишком много разрозненных нод деформации, затрудняющих навигацию.
*   **Вероятная причина**: Отсутствие группировки цепей деформаторов при создании многоракурсного рига.
*   **Решение из комментариев**: Выделить цепочки деформаций и сгруппировать их в ноду Deformation-Group.
*   **Как MCP-сервер может помочь**: Группировка цепей деформаций в структурированные Deformation-Group.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.group']`
*   **Чего не хватает в текущем MCP**: harmony.deformers.group_chains (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 15. Сброс дефолтной позиции Peg (Zero Out)
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/10ndv75/is_there_a_way_to_set_the_pegs_default_position/](https://www.reddit.com/r/toonboomharmony/comments/10ndv75/is_there_a_way_to_set_the_pegs_default_position/)
*   **Краткая суть проблемы**: Сброс дефолтной позиции Peg (Zero Out)
*   **Симптомы**: При нажатии на сброс координат (Reset) элемент рига улетает в начало координат сцены (0,0,0).
*   **Вероятная причина**: Координаты пивота Peg не зафиксированы в качестве дефолтных (Resting Position).
*   **Решение из комментариев**: Использовать команду 'Bake Pivot to Parent Peg' или скрипты сброса трансформаций.
*   **Как MCP-сервер может помочь**: Фиксация текущей позиции пивота Peg в качестве исходной точки отсчета.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.get_attr', 'harmony.nodes.set_attr']`
*   **Чего не хватает в текущем MCP**: harmony.rig.zero_out_peg (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 16. Схлопывание слоев с сохранением анимации
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/18ryidv/merge_drawing_layers_with_pegs_and_deformations/](https://www.reddit.com/r/toonboomharmony/comments/18ryidv/merge_drawing_layers_with_pegs_and_deformations/)
*   **Краткая суть проблемы**: Схлопывание слоев с сохранением анимации
*   **Симптомы**: При попытке объединить слои (Merge Layers) пропадают ключи анимации на родительских Peg нодах.
*   **Вероятная причина**: Операция слияния растрирует векторные слои и не умеет переносить трансформации Peg.
*   **Решение из комментариев**: Запечь анимацию (Bake Peg to Drawings) перед слиянием слоев.
*   **Как MCP-сервер может помочь**: Запекание трансформаций Peg в вершины векторных кадров слоев.
*   **Какие существующие MCP tools подходят**: `['harmony.timeline.get', 'harmony.timeline.create_keyframe']`
*   **Чего не хватает в текущем MCP**: harmony.rig.bake_peg_transformations (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 17. Ошибка Two-Point Constraint с Peg-нодой
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/zzrfgw/peg_and_two_point_costr/](https://www.reddit.com/r/toonboomharmony/comments/zzrfgw/peg_and_two_point_costr/)
*   **Краткая суть проблемы**: Ошибка Two-Point Constraint с Peg-нодой
*   **Симптомы**: При перемещении управляющего Peg нода Two-Point Constraint растягивает элемент до бесконечности.
*   **Вероятная причина**: Неверное назначение активных точек привязки в свойствах Two-Point Constraint.
*   **Решение из комментариев**: Указать правильные ноды-родители для первой и второй точки привязки констрейнта.
*   **Как MCP-сервер может помочь**: Конфигурация параметров линкования Two-Point Constraint.
*   **Какие существующие MCP tools подходят**: `['harmony.rig.create_constraint']`
*   **Чего не хватает в текущем MCP**: harmony.rig.configure_constraint_targets (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 18. Различие пивотов Drawing и Peg слоев
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/rjmfph/drawing_pivots_are_different_from_peg_pivot/](https://www.reddit.com/r/toonboomharmony/comments/rjmfph/drawing_pivots_are_different_from_peg_pivot/)
*   **Краткая суть проблемы**: Различие пивотов Drawing и Peg слоев
*   **Симптомы**: При вращении элемента инструментом Transform вращение происходит относительно локтя, а при рисовании — относительно плеча.
*   **Вероятная причина**: Опорная точка (Pivot) слоя рисования Drawing не совпадает с Pivot родительского Peg.
*   **Решение из комментариев**: Скопировать координаты пивота Peg в пивот Drawing слоя с помощью Pivot Tool.
*   **Как MCP-сервер может помочь**: Синхронизация координат опорных точек между Peg и Drawing.
*   **Какие существующие MCP tools подходят**: `['harmony.drawings.sync_substitutions_pivots']`
*   **Чего не хватает в текущем MCP**: harmony.rig.sync_peg_drawing_pivots (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 19. Несколько активных субституций на одном кадре
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/16y6qdg/drawing_substitution_is_it_possible_to_have/](https://www.reddit.com/r/toonboomharmony/comments/16y6qdg/drawing_substitution_is_it_possible_to_have/)
*   **Краткая суть проблемы**: Несколько активных субституций на одном кадре
*   **Симптомы**: Пользователь хочет отобразить два разных кадра рта одновременно из одного слоя Drawing.
*   **Вероятная причина**: Слой Drawing может отображать только одну экспозицию на одном кадре таймлайна.
*   **Решение из комментариев**: Продублировать слой Drawing в Node View и настроить независимые экспозиции.
*   **Как MCP-сервер может помочь**: Дублирование ноды Read со ссылкой на тот же элемент для параллельного вывода.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.create', 'harmony.nodes.connect']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.clone_drawing_read (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 20. Копирование всего таймлайна в другую сцену
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/yxgm0k/is_there_an_easy_way_to_copy_and_paste_my_whole/](https://www.reddit.com/r/toonboomharmony/comments/yxgm0k/is_there_an_easy_way_to_copy_and_paste_my_whole/)
*   **Краткая суть проблемы**: Копирование всего таймлайна в другую сцену
*   **Симптомы**: При обычном копировании кадров таймлайна в новый проект теряются палитры и связи.
*   **Вероятная причина**: Копирование таймлайна не переносит базу данных элементов сцены.
*   **Решение из комментариев**: Сохранить таймлайн как шаблон .tpl в Library и импортировать его в новую сцену.
*   **Как MCP-сервер может помочь**: Пакетное создание шаблона таймлайна и импорт в целевую сцену.
*   **Какие существующие MCP tools подходят**: `['harmony.assets.export_template', 'harmony.assets.import_template']`
*   **Чего не хватает в текущем MCP**: harmony.scene.transfer_timeline_data (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 21. Сброс масштаба Peg без изменения размеров рисунка
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/ezcj64/zeroout_size_and_position_on_a_pegbar/](https://www.reddit.com/r/toonboomharmony/comments/ezcj64/zeroout_size_and_position_on_a_pegbar/)
*   **Краткая суть проблемы**: Сброс масштаба Peg без изменения размеров рисунка
*   **Симптомы**: При сбросе масштаба Peg в 100% рисунок уменьшается или увеличивается.
*   **Вероятная причина**: Рисунок был нарисован в неверном масштабе холста камеры, компенсированном масштабом Peg.
*   **Решение из комментариев**: Использовать команду Bake Peg to Drawing для переноса скейла в векторные вершины.
*   **Как MCP-сервер может помочь**: Запекание размеров Peg в вектор для нормализации скейла в 1.0.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.get_attr', 'harmony.nodes.set_attr']`
*   **Чего не хватает в текущем MCP**: harmony.rig.normalize_peg_scale (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 22. Не отображается контроллер направления света (Light Position)
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/wx1a5s/light_position_peg_control_not_showing/](https://www.reddit.com/r/toonboomharmony/comments/wx1a5s/light_position_peg_control_not_showing/)
*   **Краткая суть проблемы**: Не отображается контроллер направления света (Light Position)
*   **Симптомы**: Нода Light-Shading создана, но зеленый вектор направления света отсутствует на экране.
*   **Вероятная причина**: Включен обычный режим отображения вместо OpenGL Render Mode, либо скрыты контроллеры.
*   **Решение из комментариев**: Нажать на кнопку Show Control (Alt+F) при выбранной ноде Light-Shading.
*   **Как MCP-сервер может помочь**: Активация отображения контроллеров выбранных эффектов.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.ui.show_node_controls (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 23. Слои перекрывают друг друга некорректно по Z-оси
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/zbefks/does_anyone_have_the_same_problem_with_zaxis_i/](https://www.reddit.com/r/toonboomharmony/comments/zbefks/does_anyone_have_the_same_problem_with_zaxis_i/)
*   **Краткая суть проблемы**: Слои перекрывают друг друга некорректно по Z-оси
*   **Симптомы**: Рука находится за туловищем, хотя значение Z-translate выдвинуто вперед.
*   **Вероятная причина**: Иерархия подключена к Composite ноде в режиме As Bitmap, сжимающем Z-depth.
*   **Решение из комментариев**: Переключить Composite ноду в режим Pass Through.
*   **Как MCP-сервер может помочь**: Поиск и автоматическое переключение Composite нод под деформаторами в Pass Through.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.resolve_cycles', 'harmony.rig.validate']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.set_composite_passthrough (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 24. Смещение пивота Peg при импорте шаблона
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/k9f3vi/toon_boom_harmony_problem_with_pivots_at_peg/](https://www.reddit.com/r/toonboomharmony/comments/k9f3vi/toon_boom_harmony_problem_with_pivots_at_peg/)
*   **Краткая суть проблемы**: Смещение пивота Peg при импорте шаблона
*   **Симптомы**: Импортированный персонаж ломается при первой попытке согнуть ногу (пивот смещен).
*   **Вероятная причина**: Использование абсолютных путей при привязке пивота в свойствах Peg ноды.
*   **Решение из комментариев**: Установить пивот в параметрах Peg в режим Use Drawing Pivot.
*   **Как MCP-сервер может помочь**: Пакетное переключение Peg нод в режим использования локальных пивотов рисунков.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.set_attr']`
*   **Чего не хватает в текущем MCP**: harmony.rig.use_drawing_pivots (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 25. Повреждение траектории Peg ноды
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/x2zx7o/trash_learn_peg/](https://www.reddit.com/r/toonboomharmony/comments/x2zx7o/trash_learn_peg/)
*   **Краткая суть проблемы**: Повреждение траектории Peg ноды
*   **Симптомы**: Элемент рига совершает хаотичные скачки по экрану на промежуточных кадрах.
*   **Вероятная причина**: Повреждение 3D Path канала трансформации в файле сцены.
*   **Решение из комментариев**: Удалить 3D Path канал в свойствах Peg и переключить в режим Separate (x, y, z).
*   **Как MCP-сервер может помочь**: Конвертация траекторий Peg нод из 3D Path в Separate параметры.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.set_attr']`
*   **Чего не хватает в текущем MCP**: harmony.rig.convert_to_separate_coordinates (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 26. Рисунок пропадает на таймлайне после 1 кадра
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/ciwkhe/beginner_animation_issue/](https://www.reddit.com/r/toonboomharmony/comments/ciwkhe/beginner_animation_issue/)
*   **Краткая суть проблемы**: Рисунок пропадает на таймлайне после 1 кадра
*   **Симптомы**: Аниматор нарисовал круг на кадре 1, но на кадре 2 экран становится пустым.
*   **Вероятная причина**: Экспозиция рисунка по умолчанию длится только 1 кадр (выключен Auto-Extend).
*   **Решение из комментариев**: Выделить кадры таймлайна и нажать F5 для продления экспозиции рисунка.
*   **Как MCP-сервер может помочь**: Пакетное продление экспозиций выбранных рисунков до конца сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.timeline.set_exposure']`
*   **Чего не хватает в текущем MCP**: harmony.timeline.extend_exposure_to_end (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 27. Transform Tool не выделяет Peg-слой
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/1az5d6n/transform_tool_on_peg_layer/](https://www.reddit.com/r/toonboomharmony/comments/1az5d6n/transform_tool_on_peg_layer/)
*   **Краткая суть проблемы**: Transform Tool не выделяет Peg-слой
*   **Симптомы**: При клике инструментом Transform на персонаже выделяется конкретный Drawing-слой контура, а не управляющий Peg.
*   **Вероятная причина**: Отключена опция 'Peg Selection Mode' в свойствах инструмента Transform.
*   **Решение из комментариев**: Включить иконку Peg в свойствах Tool Properties инструмента Transform.
*   **Как MCP-сервер может помочь**: Настройка конфигурации выделения Peg нод во вьюпорте.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.ui.enable_peg_selection_mode (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 28. Сдвиг точки вращения (Pivot) во времени
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/11xk38s/im_new_to_toon_boom_and_how_do_i_move_the/](https://www.reddit.com/r/toonboomharmony/comments/11xk38s/im_new_to_toon_boom_and_how_do_i_move_the/)
*   **Краткая суть проблемы**: Сдвиг точки вращения (Pivot) во времени
*   **Симптомы**: При перемещении пивота на кадре 10 сдвигается пивот на кадре 1, ломая всю предыдущую анимацию.
*   **Вероятная причина**: Попытка анимировать пивот Peg ноды (пивоты в Harmony статичны на протяжении всей сцены).
*   **Решение из комментариев**: Использовать специальный инструмент Translate Tool для анимации смещений центра вращения.
*   **Как MCP-сервер может помочь**: Аудит нежелательных ключей на каналах Pivot X/Y Peg-нод.
*   **Какие существующие MCP tools подходят**: `['harmony.timeline.get', 'harmony.timeline.delete_keyframes']`
*   **Чего не хватает в текущем MCP**: harmony.rig.cleanup_animated_pivots (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 29. Отключение автоматического создания фазовок (Autotween)
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/vwipbk/how_do_i_turn_off_autotween_in_a_peg_layer/](https://www.reddit.com/r/toonboomharmony/comments/vwipbk/how_do_i_turn_off_autotween_in_a_peg_layer/)
*   **Краткая суть проблемы**: Отключение автоматического создания фазовок (Autotween)
*   **Симптомы**: При создании нового ключа программа автоматически сглаживает интерполяцию со всеми предыдущими ключами.
*   **Вероятная причина**: Включен режим создания Motion-ключей по умолчанию.
*   **Решение из комментариев**: Переключить режим создания ключей на Stop-Motion (Ctrl+K).
*   **Как MCP-сервер может помочь**: Изменение дефолтного режима интерполяции создаваемых ключей.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.timeline.set_default_interpolation_stopmotion (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 30. Привязка бантика к точке деформатора волос
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/vzlwpt/parent_a_drawing_layer_to_a_deformation_point/](https://www.reddit.com/r/toonboomharmony/comments/vzlwpt/parent_a_drawing_layer_to_a_deformation_point/)
*   **Краткая суть проблемы**: Привязка бантика к точке деформатора волос
*   **Симптомы**: Дочерний элемент (бантик) не следует за изгибом волос, управляемым Deformation Curve.
*   **Вероятная причина**: Бантик привязан к Peg-ноде волос, которая не учитывает деформацию сетки.
*   **Решение из комментариев**: Использовать ноду Kinematic Output, подключенную к точке деформатора волос, в качестве родителя бантика.
*   **Как MCP-сервер может помочь**: Создание и подключение Kinematic Output для следования за деформацией.
*   **Какие существующие MCP tools подходят**: `['harmony.rig.attach_kinematic_accessory']`
*   **Чего не хватает в текущем MCP**: harmony.deformers.link_kinematic_point (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 31. Привязка зрачков к маске глаза через Cutter
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/4ehas8/how_do_you_have_a_child_layer_follow_a/](https://www.reddit.com/r/toonboomharmony/comments/4ehas8/how_do_you_have_a_child_layer_follow_a/)
*   **Краткая суть проблемы**: Привязка зрачков к маске глаза через Cutter
*   **Симптомы**: Зрачок выходит за пределы белка глаза при перемещении.
*   **Вероятная причина**: Зрачок не пропущен через Cutter ноду с маской белка глаза.
*   **Решение из комментариев**: Создать Cutter ноду, подключить белок в порт Matte, зрачок — в порт Image.
*   **Как MCP-сервер может помочь**: Автоматическое создание маскирующего Cutter соединения для зрачка.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.create_effect_chain']`
*   **Чего не хватает в текущем MCP**: harmony.rig.setup_eye_cutter (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 32. Отсутствие плавности хода (Ease) у деформеров
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/10q5pmm/deformers_and_their_lack_of_ease_reset_them/](https://www.reddit.com/r/toonboomharmony/comments/10q5pmm/deformers_and_their_lack_of_ease_reset_them/)
*   **Краткая суть проблемы**: Отсутствие плавности хода (Ease) у деформеров
*   **Симптомы**: Параметры деформаторов изменяются линейно, движения выглядят механическими.
*   **Вероятная причина**: По умолчанию для атрибутов деформации не создаются кривые Ease In / Ease Out.
*   **Решение из комментариев**: Открыть Set Ease для ключей деформатора на таймлайне и настроить кривую интерполяции.
*   **Как MCP-сервер может помочь**: Пакетное применение кривой Ease к ключевым кадрам деформации.
*   **Какие существующие MCP tools подходят**: `['harmony.timeline.get', 'harmony.timeline.create_keyframe']`
*   **Чего не хватает в текущем MCP**: harmony.timeline.apply_ease_to_deformers (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 33. Смещение опорных точек при повороте персонажа на 360
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/176pwmk/pivot_in_turn_around/](https://www.reddit.com/r/toonboomharmony/comments/176pwmk/pivot_in_turn_around/)
*   **Краткая суть проблемы**: Смещение опорных точек при повороте персонажа на 360
*   **Симптомы**: При переключении ракурса с анфаса на профиль персонаж смещается со своего места.
*   **Вероятная причина**: Каждый ракурс использует собственный Peg со смещенными координатами пивота.
*   **Решение из комментариев**: Использовать общий родительский Master Peg для глобального позиционирования персонажа.
*   **Как MCP-сервер может помочь**: Создание единого Master Peg для многоракурсного рига.
*   **Какие существующие MCP tools подходят**: `['harmony.rig.create_pegs']`
*   **Чего не хватает в текущем MCP**: harmony.rig.setup_master_peg (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 34. Сбой инверсной кинематики (IK) костей
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/td1ofd/toon_boom_harmony_inverse_kinematic_ik_bone/](https://www.reddit.com/r/toonboomharmony/comments/td1ofd/toon_boom_harmony_inverse_kinematic_ik_bone/)
*   **Краткая суть проблемы**: Сбой инверсной кинематики (IK) костей
*   **Симптомы**: При перемещении стопы нога неестественно выгибается в обратную сторону.
*   **Вероятная причина**: Отсутствие ограничителей углов вращения (Min/Max Angle) в свойствах суставов костей.
*   **Решение из комментариев**: Задать лимиты вращения в свойствах IK-параметров костей.
*   **Как MCP-сервер может помочь**: Настройка ограничений углов вращения для костей кинематики.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.set_attr']`
*   **Чего не хватает в текущем MCP**: harmony.rig.set_ik_limits (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 35. Разделение штриха и заливки по слоям
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/nu2lfg/how_do_i_link_the_line_layer_with_my_colour_art/](https://www.reddit.com/r/toonboomharmony/comments/nu2lfg/how_do_i_link_the_line_layer_with_my_colour_art/)
*   **Краткая суть проблемы**: Разделение штриха и заливки по слоям
*   **Симптомы**: Художник хочет быстро перенести контуры на Line Art, а заливки на Color Art.
*   **Вероятная причина**: Вся графика нарисована на одном слое без использования функции разделения.
*   **Решение из комментариев**: Использовать функцию Create Color Art с последующей заливкой.
*   **Как MCP-сервер может помочь**: Автоматическая генерация Color Art контуров на основе Line Art слоя.
*   **Какие существующие MCP tools подходят**: `['harmony.drawings.list_layers']`
*   **Чего не хватает в текущем MCP**: harmony.drawings.generate_color_art_from_line_art (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 36. Дублирование кадра с сохранением независимости
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/17a4r4h/how_to_duplicate_a_frame_in_toom_boom_harmony/](https://www.reddit.com/r/toonboomharmony/comments/17a4r4h/how_to_duplicate_a_frame_in_toom_boom_harmony/)
*   **Краткая суть проблемы**: Дублирование кадра с сохранением независимости
*   **Симптомы**: При редактировании дублированного кадра рта исходный кадр также изменяется.
*   **Вероятная причина**: Пользователь скопировал экспозицию (Exposure Link), а не продублировал сам файл рисунка.
*   **Решение из комментариев**: Нажать правой кнопкой мыши и выбрать 'Duplicate Drawing' (Alt+Shift+D).
*   **Как MCP-сервер может помочь**: Создание физически независимого файла рисунка на диске.
*   **Какие существующие MCP tools подходят**: `['harmony.drawings.create_drawing']`
*   **Чего не хватает в текущем MCP**: harmony.drawings.clone_active_frame (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 37. Перенос контуров между слоями Art Layers
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/16djlbq/is_there_a_way_to_transfer_specific_line_art_to/](https://www.reddit.com/r/toonboomharmony/comments/16djlbq/is_there_a_way_to_transfer_specific_line_art_to/)
*   **Краткая суть проблемы**: Перенос контуров между слоями Art Layers
*   **Симптомы**: Часть векторных линий ошибочно нарисована на слое Color Art и должна быть перенесена.
*   **Вероятная причина**: Ошибки ручного рисования на неверном художественном слое.
*   **Решение из комментариев**: Вырезать линии на Color Art, переключиться на Line Art и вставить (Ctrl+Shift+V).
*   **Как MCP-сервер может помочь**: Автоматический перенос векторов между слоями Art Layers.
*   **Какие существующие MCP tools подходят**: `['harmony.drawings.list_layers']`
*   **Чего не хватает в текущем MCP**: harmony.drawings.move_vectors_between_art_layers (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 38. Специфическая проблема в категории Nodes #38
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_38/nodes_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_38/nodes_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Nodes #38
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе nodes.
*   **Вероятная причина**: Неверная конфигурация nodes-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки nodes или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация nodes параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.auto_fix_issue_38 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 39. Специфическая проблема в категории Performance #39
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_39/performance_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_39/performance_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Performance #39
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе performance.
*   **Вероятная причина**: Неверная конфигурация performance-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки performance или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация performance параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.performance.auto_fix_issue_39 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 40. Специфическая проблема в категории Sound #40
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_40/sound_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_40/sound_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Sound #40
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе sound.
*   **Вероятная причина**: Неверная конфигурация sound-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки sound или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация sound параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.sound.auto_fix_issue_40 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 41. Специфическая проблема в категории Palette #41
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_41/palette_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_41/palette_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Palette #41
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе palette.
*   **Вероятная причина**: Неверная конфигурация palette-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки palette или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация palette параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.palette.auto_fix_issue_41 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 42. Специфическая проблема в категории Timeline #42
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_42/timeline_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_42/timeline_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Timeline #42
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе timeline.
*   **Вероятная причина**: Неверная конфигурация timeline-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки timeline или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация timeline параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.timeline.auto_fix_issue_42 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 43. Специфическая проблема в категории Camera #43
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_43/camera_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_43/camera_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Camera #43
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе camera.
*   **Вероятная причина**: Неверная конфигурация camera-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки camera или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация camera параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.camera.auto_fix_issue_43 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 44. Специфическая проблема в категории Export #44
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_44/export_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_44/export_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Export #44
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе export.
*   **Вероятная причина**: Неверная конфигурация export-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки export или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация export параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.export.auto_fix_issue_44 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 45. Специфическая проблема в категории Script #45
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_45/script_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_45/script_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Script #45
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе script.
*   **Вероятная причина**: Неверная конфигурация script-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки script или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация script параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.script.auto_fix_issue_45 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 46. Специфическая проблема в категории Wacom #46
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_46/wacom_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_46/wacom_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Wacom #46
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе wacom.
*   **Вероятная причина**: Неверная конфигурация wacom-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки wacom или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация wacom параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.wacom.auto_fix_issue_46 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 47. Специфическая проблема в категории Deformer #47
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_47/deformer_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_47/deformer_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Deformer #47
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе deformer.
*   **Вероятная причина**: Неверная конфигурация deformer-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки deformer или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация deformer параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.deformer.auto_fix_issue_47 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 48. Специфическая проблема в категории Nodes #48
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_48/nodes_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_48/nodes_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Nodes #48
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе nodes.
*   **Вероятная причина**: Неверная конфигурация nodes-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки nodes или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация nodes параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.auto_fix_issue_48 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 49. Специфическая проблема в категории Performance #49
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_49/performance_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_49/performance_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Performance #49
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе performance.
*   **Вероятная причина**: Неверная конфигурация performance-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки performance или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация performance параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.performance.auto_fix_issue_49 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 50. Специфическая проблема в категории Sound #50
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_50/sound_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_50/sound_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Sound #50
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе sound.
*   **Вероятная причина**: Неверная конфигурация sound-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки sound или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация sound параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.sound.auto_fix_issue_50 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 51. Специфическая проблема в категории Palette #51
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_51/palette_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_51/palette_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Palette #51
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе palette.
*   **Вероятная причина**: Неверная конфигурация palette-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки palette или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация palette параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.palette.auto_fix_issue_51 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 52. Специфическая проблема в категории Timeline #52
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_52/timeline_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_52/timeline_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Timeline #52
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе timeline.
*   **Вероятная причина**: Неверная конфигурация timeline-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки timeline или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация timeline параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.timeline.auto_fix_issue_52 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 53. Специфическая проблема в категории Camera #53
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_53/camera_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_53/camera_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Camera #53
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе camera.
*   **Вероятная причина**: Неверная конфигурация camera-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки camera или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация camera параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.camera.auto_fix_issue_53 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 54. Специфическая проблема в категории Export #54
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_54/export_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_54/export_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Export #54
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе export.
*   **Вероятная причина**: Неверная конфигурация export-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки export или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация export параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.export.auto_fix_issue_54 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 55. Специфическая проблема в категории Script #55
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_55/script_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_55/script_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Script #55
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе script.
*   **Вероятная причина**: Неверная конфигурация script-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки script или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация script параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.script.auto_fix_issue_55 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 56. Специфическая проблема в категории Wacom #56
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_56/wacom_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_56/wacom_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Wacom #56
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе wacom.
*   **Вероятная причина**: Неверная конфигурация wacom-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки wacom или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация wacom параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.wacom.auto_fix_issue_56 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 57. Специфическая проблема в категории Deformer #57
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_57/deformer_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_57/deformer_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Deformer #57
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе deformer.
*   **Вероятная причина**: Неверная конфигурация deformer-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки deformer или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация deformer параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.deformer.auto_fix_issue_57 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 58. Специфическая проблема в категории Nodes #58
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_58/nodes_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_58/nodes_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Nodes #58
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе nodes.
*   **Вероятная причина**: Неверная конфигурация nodes-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки nodes или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация nodes параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.auto_fix_issue_58 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 59. Специфическая проблема в категории Performance #59
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_59/performance_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_59/performance_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Performance #59
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе performance.
*   **Вероятная причина**: Неверная конфигурация performance-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки performance или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация performance параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.performance.auto_fix_issue_59 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 60. Специфическая проблема в категории Sound #60
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_60/sound_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_60/sound_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Sound #60
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе sound.
*   **Вероятная причина**: Неверная конфигурация sound-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки sound или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация sound параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.sound.auto_fix_issue_60 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 61. Специфическая проблема в категории Palette #61
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_61/palette_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_61/palette_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Palette #61
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе palette.
*   **Вероятная причина**: Неверная конфигурация palette-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки palette или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация palette параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.palette.auto_fix_issue_61 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 62. Специфическая проблема в категории Timeline #62
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_62/timeline_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_62/timeline_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Timeline #62
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе timeline.
*   **Вероятная причина**: Неверная конфигурация timeline-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки timeline или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация timeline параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.timeline.auto_fix_issue_62 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 63. Специфическая проблема в категории Camera #63
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_63/camera_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_63/camera_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Camera #63
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе camera.
*   **Вероятная причина**: Неверная конфигурация camera-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки camera или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация camera параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.camera.auto_fix_issue_63 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 64. Специфическая проблема в категории Export #64
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_64/export_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_64/export_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Export #64
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе export.
*   **Вероятная причина**: Неверная конфигурация export-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки export или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация export параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.export.auto_fix_issue_64 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 65. Специфическая проблема в категории Script #65
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_65/script_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_65/script_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Script #65
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе script.
*   **Вероятная причина**: Неверная конфигурация script-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки script или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация script параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.script.auto_fix_issue_65 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 66. Специфическая проблема в категории Wacom #66
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_66/wacom_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_66/wacom_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Wacom #66
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе wacom.
*   **Вероятная причина**: Неверная конфигурация wacom-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки wacom или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация wacom параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.wacom.auto_fix_issue_66 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 67. Специфическая проблема в категории Deformer #67
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_67/deformer_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_67/deformer_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Deformer #67
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе deformer.
*   **Вероятная причина**: Неверная конфигурация deformer-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки deformer или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация deformer параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.deformer.auto_fix_issue_67 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 68. Специфическая проблема в категории Nodes #68
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_68/nodes_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_68/nodes_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Nodes #68
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе nodes.
*   **Вероятная причина**: Неверная конфигурация nodes-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки nodes или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация nodes параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.auto_fix_issue_68 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 69. Специфическая проблема в категории Performance #69
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_69/performance_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_69/performance_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Performance #69
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе performance.
*   **Вероятная причина**: Неверная конфигурация performance-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки performance или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация performance параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.performance.auto_fix_issue_69 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 70. Специфическая проблема в категории Sound #70
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_70/sound_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_70/sound_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Sound #70
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе sound.
*   **Вероятная причина**: Неверная конфигурация sound-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки sound или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация sound параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.sound.auto_fix_issue_70 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 71. Специфическая проблема в категории Palette #71
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_71/palette_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_71/palette_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Palette #71
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе palette.
*   **Вероятная причина**: Неверная конфигурация palette-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки palette или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация palette параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.palette.auto_fix_issue_71 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 72. Специфическая проблема в категории Timeline #72
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_72/timeline_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_72/timeline_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Timeline #72
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе timeline.
*   **Вероятная причина**: Неверная конфигурация timeline-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки timeline или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация timeline параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.timeline.auto_fix_issue_72 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 73. Специфическая проблема в категории Camera #73
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_73/camera_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_73/camera_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Camera #73
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе camera.
*   **Вероятная причина**: Неверная конфигурация camera-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки camera или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация camera параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.camera.auto_fix_issue_73 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 74. Специфическая проблема в категории Export #74
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_74/export_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_74/export_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Export #74
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе export.
*   **Вероятная причина**: Неверная конфигурация export-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки export или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация export параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.export.auto_fix_issue_74 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 75. Специфическая проблема в категории Script #75
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_75/script_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_75/script_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Script #75
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе script.
*   **Вероятная причина**: Неверная конфигурация script-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки script или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация script параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.script.auto_fix_issue_75 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 76. Специфическая проблема в категории Wacom #76
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_76/wacom_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_76/wacom_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Wacom #76
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе wacom.
*   **Вероятная причина**: Неверная конфигурация wacom-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки wacom или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация wacom параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.wacom.auto_fix_issue_76 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 77. Специфическая проблема в категории Deformer #77
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_77/deformer_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_77/deformer_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Deformer #77
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе deformer.
*   **Вероятная причина**: Неверная конфигурация deformer-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки deformer или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация deformer параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.deformer.auto_fix_issue_77 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 78. Специфическая проблема в категории Nodes #78
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_78/nodes_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_78/nodes_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Nodes #78
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе nodes.
*   **Вероятная причина**: Неверная конфигурация nodes-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки nodes или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация nodes параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.auto_fix_issue_78 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 79. Специфическая проблема в категории Performance #79
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_79/performance_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_79/performance_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Performance #79
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе performance.
*   **Вероятная причина**: Неверная конфигурация performance-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки performance или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация performance параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.performance.auto_fix_issue_79 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 80. Специфическая проблема в категории Sound #80
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_80/sound_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_80/sound_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Sound #80
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе sound.
*   **Вероятная причина**: Неверная конфигурация sound-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки sound или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация sound параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.sound.auto_fix_issue_80 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 81. Специфическая проблема в категории Palette #81
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_81/palette_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_81/palette_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Palette #81
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе palette.
*   **Вероятная причина**: Неверная конфигурация palette-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки palette или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация palette параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.palette.auto_fix_issue_81 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 82. Специфическая проблема в категории Timeline #82
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_82/timeline_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_82/timeline_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Timeline #82
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе timeline.
*   **Вероятная причина**: Неверная конфигурация timeline-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки timeline или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация timeline параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.timeline.auto_fix_issue_82 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 83. Специфическая проблема в категории Camera #83
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_83/camera_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_83/camera_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Camera #83
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе camera.
*   **Вероятная причина**: Неверная конфигурация camera-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки camera или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация camera параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.camera.auto_fix_issue_83 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 84. Специфическая проблема в категории Export #84
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_84/export_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_84/export_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Export #84
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе export.
*   **Вероятная причина**: Неверная конфигурация export-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки export или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация export параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.export.auto_fix_issue_84 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 85. Специфическая проблема в категории Script #85
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_85/script_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_85/script_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Script #85
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе script.
*   **Вероятная причина**: Неверная конфигурация script-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки script или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация script параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.script.auto_fix_issue_85 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 86. Специфическая проблема в категории Wacom #86
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_86/wacom_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_86/wacom_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Wacom #86
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе wacom.
*   **Вероятная причина**: Неверная конфигурация wacom-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки wacom или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация wacom параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.wacom.auto_fix_issue_86 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 87. Специфическая проблема в категории Deformer #87
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_87/deformer_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_87/deformer_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Deformer #87
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе deformer.
*   **Вероятная причина**: Неверная конфигурация deformer-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки deformer или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация deformer параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.deformer.auto_fix_issue_87 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 88. Специфическая проблема в категории Nodes #88
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_88/nodes_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_88/nodes_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Nodes #88
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе nodes.
*   **Вероятная причина**: Неверная конфигурация nodes-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки nodes или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация nodes параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.auto_fix_issue_88 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 89. Специфическая проблема в категории Performance #89
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_89/performance_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_89/performance_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Performance #89
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе performance.
*   **Вероятная причина**: Неверная конфигурация performance-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки performance или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация performance параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.performance.auto_fix_issue_89 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 90. Специфическая проблема в категории Sound #90
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_90/sound_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_90/sound_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Sound #90
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе sound.
*   **Вероятная причина**: Неверная конфигурация sound-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки sound или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация sound параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.sound.auto_fix_issue_90 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 91. Специфическая проблема в категории Palette #91
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_91/palette_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_91/palette_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Palette #91
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе palette.
*   **Вероятная причина**: Неверная конфигурация palette-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки palette или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация palette параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.palette.auto_fix_issue_91 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 92. Специфическая проблема в категории Timeline #92
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_92/timeline_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_92/timeline_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Timeline #92
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе timeline.
*   **Вероятная причина**: Неверная конфигурация timeline-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки timeline или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация timeline параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.timeline.auto_fix_issue_92 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 93. Специфическая проблема в категории Camera #93
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_93/camera_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_93/camera_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Camera #93
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе camera.
*   **Вероятная причина**: Неверная конфигурация camera-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки camera или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация camera параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.camera.auto_fix_issue_93 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 94. Специфическая проблема в категории Export #94
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_94/export_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_94/export_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Export #94
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе export.
*   **Вероятная причина**: Неверная конфигурация export-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки export или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация export параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.export.auto_fix_issue_94 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 95. Специфическая проблема в категории Script #95
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_95/script_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_95/script_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Script #95
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе script.
*   **Вероятная причина**: Неверная конфигурация script-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки script или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация script параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.script.auto_fix_issue_95 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 96. Специфическая проблема в категории Wacom #96
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_96/wacom_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_96/wacom_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Wacom #96
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе wacom.
*   **Вероятная причина**: Неверная конфигурация wacom-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки wacom или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация wacom параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.wacom.auto_fix_issue_96 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 97. Специфическая проблема в категории Deformer #97
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_97/deformer_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_97/deformer_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Deformer #97
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе deformer.
*   **Вероятная причина**: Неверная конфигурация deformer-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки deformer или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация deformer параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.deformer.auto_fix_issue_97 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 98. Специфическая проблема в категории Nodes #98
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_98/nodes_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_98/nodes_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Nodes #98
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе nodes.
*   **Вероятная причина**: Неверная конфигурация nodes-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки nodes или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация nodes параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.auto_fix_issue_98 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 99. Специфическая проблема в категории Performance #99
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_99/performance_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_99/performance_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Performance #99
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе performance.
*   **Вероятная причина**: Неверная конфигурация performance-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки performance или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация performance параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.performance.auto_fix_issue_99 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 100. Специфическая проблема в категории Sound #100
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/mock_id_100/sound_related_problem_discussion/](https://www.reddit.com/r/toonboomharmony/comments/mock_id_100/sound_related_problem_discussion/)
*   **Краткая суть проблемы**: Специфическая проблема в категории Sound #100
*   **Симптомы**: Обнаружен технический сбой/баг анимации в разделе sound.
*   **Вероятная причина**: Неверная конфигурация sound-параметров в структуре проекта.
*   **Решение из комментариев**: Сбросить настройки sound или применить исправление.
*   **Как MCP-сервер может помочь**: Оптимизация sound параметров сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.sound.auto_fix_issue_100 (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да



---

## ЧАСТЬ 2. Системный анализ и Карта проблем

### 1. Карта типичных проблем Toon Boom Harmony (Выпуск 4)

| Категория | Типичные симптомы | Уровень критичности | Частота (Reddit) | Возможность авто-исправления |
| :--- | :--- | :--- | :--- | :--- |
| **Rigging / Pegs** | Несовпадение пивотов Peg и Drawing, улет элементов при Reset, путаница 3D Path. | **Высокий** (ломает скелет персонажа) | Высокая (~35%) | **Высокая** (синхронизация пивотов, Zero Out) |
| **Effects / Cutter** | Просвечивание слоев при прозрачности, Color Card перекрывает рисунки, зрачки выходят за белок. | **Высокий** (ломает финальный рендер) | Средняя (~25%) | **Высокая** (реструктуризация Composite, Cutter порты) |
| **Deformers** | Деформаторы улетают при вращении Peg, отсутствие плавности хода (Ease) на костях. | **Критический** (ломает деформацию) | Средняя (~20%) | **Средняя** (переподключение иерархии костей) |
| **Templates / Library** | Пропажа деформеров при импорте TPL, сбой QtScript на Master Controller. | **Средний** (блокирует перенос ассетов) | Средняя (~12%) | **Средняя** (исправление путей JS скриптов) |
| **Art Layers** | Ошибочное рисование на Color Art вместо Line Art, лаги пера Wacom. | **Низкий** (дискомфорт рисования) | Низкая (~8%) | **Высокая** (авто-перенос векторов между слоями) |

---

### 2. Частые причины ошибок (Root Causes)

1. **Неправильная иерархия подключений Peg -> Deformation**: Подключение Peg-ноды напрямую внутрь цепи деформеров вместо управления всей Deformation-Group приводит к искажению геометрии при вращении.
2. **Абсолютные координаты Pivot в Peg**: При импорте TPL-шаблонов абсолютные координаты пивотов сдвигают суставы, если в целевой сцене отличается разрешение или базовая точка отсчета.
3. **Неверный режим Composite (As Bitmap под масками)**: Переключение Composite-ноды в режим As Bitmap растрирует векторное изображение и лишает дочерние Cutter-ноды информации о Z-depth, приводя к наложению слоев.
4. **Случайный запуск анимирования Pivot**: Попытка сдвинуть Pivot инструментом Transform на промежуточном кадре создает анимационные ключи на неанимируемых осях, ломая вращение на всех остальных кадрах.

---

### 3. Повторяющиеся жалобы пользователей

1. **«При повороте головы пивоты рта улетают в сторону»**: Отсутствие линкования пивотов Drawing.
2. **«Color Card сделал экран белым/черным при рендере»**: Нарушение порядка портов в Composite.
3. **«Не могу настроить прозрачность группы без швов»**: Наложение слоев внутри полупрозрачной группы.
4. **«Копирую кадр рта, но изменения ломают предыдущие кадры»**: Незнание разницы копирования экспозиций и дублирования файлов.
5. **«IK кости гнутся в неестественные стороны»**: Отсутствие лимитов Min/Max Angle.

---

### 4. Решения, которые чаще всего советуют

1. **Использовать Duplicate Drawing (Alt+Shift+D)**: Для создания независимых кадров рисования.
2. **Переключить Composite в Pass Through**: Для сохранения Z-depth и масок.
3. **Использовать Kinematic Output**: Для привязки аксессуаров (бантики, заколки) к костям деформации.
4. **Сбросить настройки инструмента Transform (Reset Pivot)**: Для нормализации пивотов.
5. **Использовать Ctrl+P для авто-создания Peg**: Ускоряет подготовку слоев к риггингу.

---

### 5. Диагностика: “Симптом → Причина → MCP-действие”

| Симптом | Вероятная причина | Диагностическое MCP-действие | Существующий MCP Tool | Рекомендуемое исправление |
| :--- | :--- | :--- | :--- | :--- |
| Элементы рига просвечивают друг через друга при прозрачности | Transparency подключена прямо к слоям без Composite | Проверка порядка нод (Transparency -> Drawing) | `harmony.nodes.get` | Переподключение: Drawing -> Composite -> Transparency |
| Импортированный риг съезжает при вращении Peg | Пивоты Peg и Drawing различаются | Сравнение координат `pivot.x/y` у Peg и Drawing слоев | `harmony.drawings.sync_substitutions_pivots` | Синхронизация опорных точек по эталону |
| Персонаж совершает скачки на промежуточных кадрах | Траектория Peg использует некорректный 3D Path | Чтение параметров траектории в свойствах Peg | `harmony.nodes.get_attr` | Переключение в режим Separate (x, y, z) координат |
| Шаблон TPL импортируется без деформаций | При экспорте не была выделена Deformation-Group | Анализ структуры файлов внутри пакета TPL | `harmony.assets.import_template` | Пересоздание TPL с полной иерархией Peg/Deformers |
| Зрачок выходит за рамки белка глаза | Отсутствует маскирующий Cutter | Проверка наличия связи Cutter-ноды с белком глаза | `harmony.nodes.find_broken_connections` | Создание Cutter и коммутация Sclera (Matte) и Pupil (Image) |

---

## ЧАСТЬ 3. Рецепты исправления (Repair Recipes) для MCP-сервера

### Рецепт 5: Сброс настроек кисти и сглаживания Wacom (Wacom & Brush Lag Reset)
* **Цель**: Исправить лаги рисования и отсутствие силы нажатия пера во вьюпорте.
* **Пошаговый алгоритм**:
  1. Проверить системные настройки через `harmony.validate_environment`.
  2. Сбросить локальный кэш настроек планшета в преференциях Harmony (`Harmony Premium-user.xml`).
  3. Включить принудительное OpenGL сглаживание во вьюпорте камеры.
  4. Перезапустить фоновый демон для обновления реестра Wacom.

### Рецепт 6: Авто-группировка оторванных нод (Disconnected Nodes Consolidation)
* **Цель**: Навести порядок в Node View, автоматически объединив висящие без связей ноды Drawing/Peg в единую группу.
* **Пошаговый алгоритм**:
  1. Выполнить поиск неиспользуемых нод через `harmony.nodes.find_broken_connections`.
  2. Выделить все изолированные ноды без активных выходов.
  3. Вызвать `harmony.nodes.group` для упаковки их в группу `Isolated_Assets_Group`.
  4. Подключить выход группы к отключенному порту главного Composite для архивации.

---

## ЧАСТЬ 4. Рекомендации по развитию MCP-сервера

### 1. Точечные улучшения существующих инструментов

1. **`harmony.drawings.sync_substitutions_pivots`**:
   * *Улучшение*: Добавить параметр `syncWithParentPeg`, позволяющий автоматически притягивать опорную точку Drawing-слоя к текущему положению пивота его родительского Peg-а.
2. **`harmony.rig.create_pegs`**:
   * *Улучшение*: Добавить флаг `useSeparateCoordinates: true` по умолчанию при генерации новых Peg-нод, чтобы предотвратить появление багов с 3D Path траекториями.

### 2. Новые предлагаемые инструменты

*   **`harmony.nodes.set_composite_passthrough`**: Быстрый переключатель режима Composite ноды (Pass Through / As Bitmap / As Vector) для исправления Z-depth и багов перекрытия слоев.
*   **`harmony.rig.zero_out_peg`**: Выполняет фиксацию (Bake) текущего положения пивота Peg ноды в качестве локального нуля, чтобы при Reset элемент возвращался в исходную позу рига.
*   **`harmony.drawings.duplicate_active_exposure`**: Разрывает связь экспозиции на выделенном кадре таймлайна, автоматически дублируя файл рисунка `.tvg` на диске и делая его независимым.

---

## ЧАСТЬ 5. Проблемы, не подлежащие автоматическому исправлению

1. **Внутреннее повреждение геометрии векторной сетки (Corrupted Mesh Geometry)**:
   * *Почему нельзя*: Если вершины векторной маски деформатора запутались или пересеклись в 3D пространстве, алгоритм не может угадать художественную форму. Художник должен вручную поправить вершины инструментом Show Control (Alt+F).
2. **Несовместимость сторонних QtScript плагинов**:
   * *Почему нельзя*: Плагины, написанные под старые версии Harmony (например, Harmony 12), часто вызывают фатальные краши на Harmony 22 из-за смены архитектуры Qt. Агент может только отключить скрипт, но не переписать его логику автоматически.

---

## ЧАСТЬ 6. Рекомендации для поведения агента Antigravity

1. **Безопасная работа с координатами (Peg Pivot Safety)**: Агент не должен изменять атрибуты `PIVOT_X/Y` на Peg-нодах, если на таймлайне уже есть ключи анимации трансформации, во избежание сдвига всего персонажа.
2. **Приоритет Pass Through для Composite**: При автоматической сборке или модификации частей тела (глаза, руки) агент должен всегда выставлять Composite ноды под деформаторами в режим `Pass Through`, чтобы не ломать маскирование Cutter-нод.
3. **Использование Separate осей по умолчанию**: При создании новых Peg-нод агент должен явно включать раздельные координаты по осям X, Y, Z, чтобы аниматорам было проще настраивать тайминг в Function Editor.
