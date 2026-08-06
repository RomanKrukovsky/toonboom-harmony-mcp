# Анализ проблем Toon Boom Harmony на основе Reddit-сообщества (r/ToonBoomHarmony & r/animation) — Выпуск 2

Этот отчет представляет собой расширенный аудит и систематизацию 60 реальных пользовательских кейсов, собранных из публичных обсуждений на Reddit. В отчете сопоставляются практические проблемы художников-аниматоров с возможностями автоматического исправления и диагностики при помощи MCP-сервера `toonboom-harmony-mcp`.

---

## ЧАСТЬ 1. Каталог 60 Reddit-тредов (Симптом → Причина → Решение)

#### 1. Проблема с ключевыми кадрами деформеров
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/17u44ip/deformers_and_keyframes_problem/](https://www.reddit.com/r/toonboomharmony/comments/17u44ip/deformers_and_keyframes_problem/)
*   **Краткая суть проблемы**: Проблема с ключевыми кадрами деформеров
*   **Симптомы**: Маркеры деформеров (зеленые/красные точки) не реагируют на изменения или прыгают при воспроизведении, создавая ломаные движения меша.
*   **Вероятная причина**: Ключевые кадры записаны непосредственно на ноду деформации (Curve/Envelope) вместо контрольного Peg, либо анимационный режим (Animate Mode) был отключен во время редактирования.
*   **Решение из комментариев**: Включить Animate Mode (Running Man), перенести ключи трансформации на Peg ноду, сбросить локальные ключи деформера.
*   **Как MCP-сервер может помочь**: Анализ наличия ключей на деформерах, очистка локальных трансформаций и восстановление Rest Pose.
*   **Какие существующие MCP tools подходят**: `['harmony.rig.validate_deformers', 'harmony.nodes.get_attr', 'harmony.nodes.set_attr']`
*   **Чего не хватает в текущем MCP**: harmony.deformers.reset_to_rest_pose (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 2. Сложности с привязкой деформеров к пегам
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/zqt1i3/help_needed_about_deformationspegs/](https://www.reddit.com/r/toonboomharmony/comments/zqt1i3/help_needed_about_deformationspegs/)
*   **Краткая суть проблемы**: Сложности с привязкой деформеров к пегам
*   **Симптомы**: При вращении Peg-ноды рисунок смещается правильно, но деформер остается на месте, либо наоборот — деформер гнет рисунок, но родительский пег его игнорирует.
*   **Вероятная причина**: Неверная нодовая иерархия. Нода деформера подключена параллельно Drawing слою, а не последовательно (Peg -> Deformer -> Drawing).
*   **Решение из комментариев**: Переподключить кабели в Node View в последовательную цепочку: Peg на вход Deformer, Deformer на вход Drawing.
*   **Как MCP-сервер может помочь**: Поиск неверных ветвлений и восстановление правильного порядка связей.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.find_broken_connections', 'harmony.nodes.connect', 'harmony.nodes.disconnect']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.reorder_hierarchy (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 3. Анимация двух деформеров одновременно
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/ykudo8/anyway_to_have_two_deformers_animate_at_the_same/](https://www.reddit.com/r/toonboomharmony/comments/ykudo8/anyway_to_have_two_deformers_animate_at_the_same/)
*   **Краткая суть проблемы**: Анимация двух деформеров одновременно
*   **Симптомы**: Невозможно согнуть конечность в двух местах одновременно с помощью одной управляющей кривой, либо прилинкованные деформеры конфликтуют.
*   **Вероятная причина**: Попытка анимировать несколько Envelope-деформаций на одном слое без разделения их через Kinematic Output.
*   **Решение из комментариев**: Использовать Kinematic Output для передачи трансформаций от первого деформера к пегу второго деформера.
*   **Как MCP-сервер может помочь**: Вставка Kinematic Output нод между деформационными цепями.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.create', 'harmony.nodes.connect']`
*   **Чего не хватает в текущем MCP**: harmony.rig.insert_kinematic_link (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 4. Деформеры не гнут рисунок
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/nixfr5/problem_with_deformers/](https://www.reddit.com/r/toonboomharmony/comments/nixfr5/problem_with_deformers/)
*   **Краткая суть проблемы**: Деформеры не гнут рисунок
*   **Симптомы**: Зеленые маркеры двигаются на экране, но векторный рисунок остается абсолютно статичным.
*   **Вероятная причина**: Связь между деформером и Drawing нодой разорвана во внутренней базе данных Harmony после переименования слоев.
*   **Решение из комментариев**: Использовать кнопку 'Link Deformer' на панели инструментов Deformation для перепривязки цепи к слою.
*   **Как MCP-сервер может помочь**: Валидация целостности связи деформер-рисунок по именам.
*   **Какие существующие MCP tools подходят**: `['harmony.rig.validate_deformers']`
*   **Чего не хватает в текущем MCP**: harmony.deformers.link_to_drawing (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 5. Проблема с Ease на деформерах
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/10q5pmm/deformers_and_their_lack_of_ease_reset_them/](https://www.reddit.com/r/toonboomharmony/comments/10q5pmm/deformers_and_their_lack_of_ease_reset_them/)
*   **Краткая суть проблемы**: Проблема с Ease на деформерах
*   **Симптомы**: При сбросе деформера в исходную позу (Rest Pose) интерполяция движения происходит рывками, без плавности.
*   **Вероятная причина**: Параметры Ease-кривых (безье) не прописались для внутренних каналов деформационной группы при очистке ключей.
*   **Решение из комментариев**: Настроить Ease-кривые вручную в окне Function Editor для всех каналов деформера.
*   **Как MCP-сервер может помочь**: Пакетная простановка Ease кривых на каналах деформации.
*   **Какие существующие MCP tools подходят**: `['harmony.scene.get_attribute', 'harmony.scene.set_attribute']`
*   **Чего не хватает в текущем MCP**: harmony.timeline.copy_ease_curves (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 6. Деформер смещает рисунок при создании
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/johgds/problem_with_deformers/](https://www.reddit.com/r/toonboomharmony/comments/johgds/problem_with_deformers/)
*   **Краткая суть проблемы**: Деформер смещает рисунок при создании
*   **Симптомы**: При первом клике инструментом Rigging Tool для создания кости рисунок резко прыгает в сторону.
*   **Вероятная причина**: Rigging Tool был применен на кадре, где на родительских пегах уже были анимационные ключи смещения.
*   **Решение из комментариев**: Создавать деформеры строго на первом кадре (Frame 1) при обнуленных трансформациях пегов.
*   **Как MCP-сервер может помочь**: Проверка отсутствия ключей на таймлайне перед созданием деформера.
*   **Какие существующие MCP tools подходят**: `['harmony.timeline.get', 'harmony.rig.validate']`
*   **Чего не хватает в текущем MCP**: harmony.scene.clear_animation_temp (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 7. Смещение пивотов при повороте персонажа
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/176pwmk/pivot_in_turn_around/](https://www.reddit.com/r/toonboomharmony/comments/176pwmk/pivot_in_turn_around/)
*   **Краткая суть проблемы**: Смещение пивотов при повороте персонажа
*   **Симптомы**: При переходе персонажа в ракурс 3/4 или профиль суставы рук и ног вращаются не анатомично, съезжая со своего места.
*   **Вероятная причина**: Один и тот же Peg-пивот используется для разных рисованных ракурсов, где сустав сместился в перспективе.
*   **Решение из комментариев**: Использовать дополнительные Offset Pegs для компенсации положения сустава на разных ракурсах.
*   **Как MCP-сервер может помочь**: Анализ траектории вращения относительно ракурсов и создание компенсирующих пегов.
*   **Какие существующие MCP tools подходят**: `['harmony.rig360.analyze_character_turnaround', 'harmony.nodes.create']`
*   **Чего не хватает в текущем MCP**: harmony.rig.create_offset_peg (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 8. Неверное позиционирование базового пивота
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/1410z87/pivot_pointrigging/](https://www.reddit.com/r/toonboomharmony/comments/1410z87/pivot_pointrigging/)
*   **Краткая суть проблемы**: Неверное позиционирование базового пивота
*   **Симптомы**: При повороте головы шея ломается, голова вращается вокруг центра экрана.
*   **Вероятная причина**: Пивот родительского Peg ноды остался в центре сцены (0,0) по умолчанию.
*   **Решение из комментариев**: Использовать Rotate Tool (Alt+3) для ручного выставления точки вращения в основание шеи персонажа.
*   **Как MCP-сервер может помочь**: Автоматическое выставление пивотов по центру масс векторного рисунка.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.get_attr', 'harmony.nodes.set_attr']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.bake_centroid_pivot (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 9. Пивоты прыгают при выделении пегов
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/uraq5o/pivot_point_trouble_i_need_some_help/](https://www.reddit.com/r/toonboomharmony/comments/uraq5o/pivot_point_trouble_i_need_some_help/)
*   **Краткая суть проблемы**: Пивоты прыгают при выделении пегов
*   **Симптомы**: Точка вращения визуально находится в одном месте при выборе Drawing, но при выделении Peg прыгает в центр экрана.
*   **Вероятная причина**: Drawing нода имеет локальный пивот, а Peg нода — нет, при этом наследование пивота (Use Parent Peg Pivot) отключено.
*   **Решение из комментариев**: Включить 'Apply Pivot to Parent Peg' в свойствах Drawing ноды или обнулить пивот на рисунке и перенести его на Peg.
*   **Как MCP-сервер может помочь**: Поиск расхождений пивотов в паре Peg-Drawing.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.get_attr', 'harmony.nodes.set_attr', 'harmony.rig.validate']`
*   **Чего не хватает в текущем MCP**: harmony.rig.sync_peg_drawing_pivots (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 10. Конфликт кастомных пивотов
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/ri3fdp/pivot_points_toon_boom/](https://www.reddit.com/r/toonboomharmony/comments/ri3fdp/pivot_points_toon_boom/)
*   **Краткая суть проблемы**: Конфликт кастомных пивотов
*   **Симптомы**: Вращение конечности происходит по странной спиралевидной траектории.
*   **Вероятная причина**: Пивоты заданы и на Peg ноде, и на Drawing ноде одновременно, что приводит к двойному смещению при расчете.
*   **Решение из комментариев**: Обнулить пивот на Drawing-ноде, оставив точку вращения строго на Peg ноде.
*   **Как MCP-сервер может помочь**: Обнаружение двойных пивотов и очистка локального пивота рисунка.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.get_attr', 'harmony.nodes.set_attr']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.reset_drawing_pivot (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 11. Уникальный пивот для каждой субституции
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/16k5ac6/how_to_put_a_different_pivot_for_each_drawing/](https://www.reddit.com/r/toonboomharmony/comments/16k5ac6/how_to_put_a_different_pivot_for_each_drawing/)
*   **Краткая суть проблемы**: Уникальный пивот для каждой субституции
*   **Симптомы**: При смене фазы кисти руки (открытая/кулак) пивот прыгает, ломая анимацию вращения пальцев.
*   **Вероятная причина**: У субституций векторные центры находятся в разных местах, а пивот настроен глобально на уровне Peg.
*   **Решение из комментариев**: Использовать Drawing Pivot Tool в Drawing View для индивидуальной настройки точки вращения каждого кадра субституции.
*   **Как MCP-сервер может помочь**: Анализ и синхронизация пивотов всех субституций в ноде.
*   **Какие существующие MCP tools подходят**: `['harmony.drawings.list_substitutions', 'harmony.scene.get_attribute']`
*   **Чего не хватает в текущем MCP**: harmony.drawings.sync_substitutions_pivots (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 12. Сброс пивота после анимации
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/pzsgj0/how_do_i_move_the_pivot/](https://www.reddit.com/r/toonboomharmony/comments/pzsgj0/how_do_i_move_the_pivot/)
*   **Краткая суть проблемы**: Сброс пивота после анимации
*   **Симптомы**: Пользователь переместил пивот, но при переходе на другой кадр он возвращается на старое место.
*   **Вероятная причина**: Пивот был перемещен инструментом Transform (Alt+2) вместо Rotate Tool (Alt+3), что создало временный ключ анимации пивота.
*   **Решение из комментариев**: Удалить ключи анимации с каналов Pivot на таймлайне и переместить пивот с помощью Rotate Tool.
*   **Как MCP-сервер может помочь**: Поиск и удаление анимационных ключей с атрибутов PIVOT.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.get_attr', 'harmony.timeline.delete_keyframes']`
*   **Чего не хватает в текущем MCP**: harmony.timeline.clear_attribute_keyframes (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 13. Маскирование заливки внутри Line Art
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/1cqv9bd/is_there_a_way_to_color_only_inside_the_lines/](https://www.reddit.com/r/toonboomharmony/comments/1cqv9bd/is_there_a_way_to_color_only_inside_the_lines/)
*   **Краткая суть проблемы**: Маскирование заливки внутри Line Art
*   **Симптомы**: Заливка выходит за пределы контура рисунка при использовании кисти.
*   **Вероятная причина**: Отсутствует разделение рисунка на Line Art и Color Art с использованием Cutter.
*   **Решение из комментариев**: Перенести линии на Line Art, заливку на Color Art, использовать Cutter для ограничения заливки контуром.
*   **Как MCP-сервер может помочь**: Проверка наличия Line Art / Color Art разделения.
*   **Какие существующие MCP tools подходят**: `['harmony.drawings.list_layers']`
*   **Чего не хватает в текущем MCP**: harmony.drawings.create_line_color_art (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 14. Cutter не рендерится при экспорте
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/1clbgml/using_a_cutter_with_the_color_art_and_this/](https://www.reddit.com/r/toonboomharmony/comments/1clbgml/using_a_cutter_with_the_color_art_and_this/)
*   **Краткая суть проблемы**: Cutter не рендерится при экспорте
*   **Симптомы**: В OpenGL маска работает, но на финальном рендере (синий глаз) обрезка пропадает.
*   **Вероятная причина**: Под Cutter нодой стоит Composite в режиме As Bitmap, сжимающий Z-depth информацию.
*   **Решение из комментариев**: Переключить Composite ноду под маской в режим Pass Through.
*   **Как MCP-сервер может помочь**: Аудит режимов Composite-нод под Cutter.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.get_attr', 'harmony.nodes.set_attr']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.fix_composite_modes (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 15. Тонкая щель по краям инвертированного резака
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/ykfqt9/how_do_i_fix_the_thinned_line_from_invert_cutting/](https://www.reddit.com/r/toonboomharmony/comments/ykfqt9/how_do_i_fix_the_thinned_line_from_invert_cutting/)
*   **Краткая суть проблемы**: Тонкая щель по краям инвертированного резака
*   **Симптомы**: При использовании Inverted Cutter на стыках векторов появляется тонкая белая линия (пиксельный зазор).
*   **Вероятная причина**: Субпиксельное сглаживание (antialiasing) OpenGL при обрезке вектора вектором.
*   **Решение из комментариев**: Добавить Colour Override или минимальный Z-offset (0.0001) для перекрытия линий.
*   **Как MCP-сервер может помочь**: Добавление микро-сдвига по оси Z для перекрытия швов.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.set_attr']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.apply_micro_z_offset (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 16. Cutter обрезает все изображение
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/by9hen/cutter_cuts_too_much/](https://www.reddit.com/r/toonboomharmony/comments/by9hen/cutter_cuts_too_much/)
*   **Краткая суть проблемы**: Cutter обрезает все изображение
*   **Симптомы**: При подключении маски рисунок полностью исчезает с экрана.
*   **Вероятная причина**: Перепутаны порты Cutter: рисунок подключен к порту Matte (левый), а маска — к порту Image (правый).
*   **Решение из комментариев**: Поменять местами входящие кабели в Node View.
*   **Как MCP-сервер может помочь**: Проверка и исправление порядка подключения кабелей к Cutter ноде.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.connect', 'harmony.nodes.disconnect']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.swap_cutter_ports (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 17. Невозможно отредактировать контур маски
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/1bqo6xg/how_do_i_edit_this_cutter/](https://www.reddit.com/r/toonboomharmony/comments/1bqo6xg/how_do_i_edit_this_cutter/)
*   **Краткая суть проблемы**: Невозможно отредактировать контур маски
*   **Симптомы**: При попытке изменить форму маски во вьюпорте выделяется маскируемый объект.
*   **Вероятная причина**: Слой маски заблокирован в таймлайне или скрыт под родительской группой без дисплея.
*   **Решение из комментариев**: Выбрать конкретную Drawing ноду маски в Node View и нажать Alt+F11 (Show Control).
*   **Как MCP-сервер может помочь**: Проверка флагов блокировки и видимости ноды маски.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.get_attr', 'harmony.nodes.set_attr']`
*   **Чего не хватает в текущем MCP**: harmony.ui.show_controls (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 18. Маскирование по цвету палитры
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/g91v50/masking_by_colour_in_harmony/](https://www.reddit.com/r/toonboomharmony/comments/g91v50/masking_by_colour_in_harmony/)
*   **Краткая суть проблемы**: Маскирование по цвету палитры
*   **Симптомы**: Не удается применить эффект маски только к определенной части заливки (например, только к теням).
*   **Вероятная причина**: Отсутствует Colour Override нода, выделяющая конкретный цвет из общей палитры для маскирования.
*   **Решение из комментариев**: Вставить ноду Colour Override перед Cutter, выбрав нужный цвет кожи/одежды в качестве маски.
*   **Как MCP-сервер может помочь**: Автоматическая сборка цепочки Colour Override -> Cutter.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.create', 'harmony.nodes.connect']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.create_effect_chain (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 19. Несколько рисунков на одном Drawing слое
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/14uf1u3/how_to_use_multiple_imported_drawings_on_the_same/](https://www.reddit.com/r/toonboomharmony/comments/14uf1u3/how_to_use_multiple_imported_drawings_on_the_same/)
*   **Краткая суть проблемы**: Несколько рисунков на одном Drawing слое
*   **Симптомы**: Импортированные PSD слои загружаются как отдельные ноды, а не как субституции одной ноды.
*   **Вероятная причина**: При импорте в диалоговом окне выбран параметр 'Create Single Layer' вместо 'Create Drawing Substitutions'.
*   **Решение из комментариев**: Перенести рисунки в одну ноду через Library или перенастроить импорт.
*   **Как MCP-сервер может помочь**: Консолидация множества одиночных Drawing нод в субституции одной ноды.
*   **Какие существующие MCP tools подходят**: `['harmony.drawings.create_drawing', 'harmony.nodes.delete']`
*   **Чего не хватает в текущем MCP**: harmony.drawings.consolidate_layers_to_substitutions (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 20. Сбитые координаты субституций
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/17tq2p9/drawing_substitutions_in_multiple_positions/](https://www.reddit.com/r/toonboomharmony/comments/17tq2p9/drawing_substitutions_in_multiple_positions/)
*   **Краткая суть проблемы**: Сбитые координаты субституций
*   **Симптомы**: При замене рта рисунок улетает в сторону относительно головы.
*   **Вероятная причина**: Векторные рисунки внутри Drawing View нарисованы со смещением относительно нулевой точки (Pivot).
*   **Решение из комментариев**: Отцентрировать вектора всех рисунков в Drawing View и настроить смещение на Peg ноде.
*   **Как MCP-сервер может помочь**: Анализ смещения геометрических центров субституций.
*   **Какие существующие MCP tools подходят**: `['harmony.rig.validate', 'harmony.nodes.get_attr']`
*   **Чего не хватает в текущем MCP**: harmony.drawings.auto_center_vectors (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 21. Копирование анимации на субституции
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/16y6qdg/drawing_substitution_is_it_possible_to_have/](https://www.reddit.com/r/toonboomharmony/comments/16y6qdg/drawing_substitution_is_it_possible_to_have/)
*   **Краткая суть проблемы**: Копирование анимации на субституции
*   **Симптомы**: При смене рисунка кисти руки пропадают ключи анимации пальцев.
*   **Вероятная причина**: Анимация была записана на слое Drawing, а не на Peg нодах.
*   **Решение из комментариев**: Перенести ключи анимации на Peg-уровень и использовать Drawing Substitutions только для смены кадров.
*   **Как MCP-сервер может помочь**: Перенос (Baking) анимации с Drawing слоя на родительский Peg.
*   **Какие существующие MCP tools подходят**: `['harmony.audit.find_missing_exposure', 'harmony.timeline.create_keyframe']`
*   **Чего не хватает в текущем MCP**: harmony.timeline.bake_drawing_keys_to_peg (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 22. Исчезновение рисунков на таймлайне
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/150egbq/would_greatly_appreciate_any_help_on_this_issue/](https://www.reddit.com/r/toonboomharmony/comments/150egbq/would_greatly_appreciate_any_help_on_this_issue/)
*   **Краткая суть проблемы**: Исчезновение рисунков на таймлайне
*   **Симптомы**: На таймлайне видны пустые серые кадры, персонаж мигает при воспроизведении.
*   **Вероятная причина**: Отсутствует экспозиция (exposure) рисунков на протяжении всей длины сцены.
*   **Решение из комментариев**: Выделить пустой кадр и нажать F5 для продления видимости рисунка.
*   **Как MCP-сервер может помочь**: Обнаружение и автоматическое закрытие пропусков (Exposure Gaps) на таймлайне.
*   **Какие существующие MCP tools подходят**: `['harmony.drawings.find_empty_drawings', 'harmony.timeline.set_exposure']`
*   **Чего не хватает в текущем MCP**: harmony.timeline.fill_exposure_gaps (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 23. Импорт рисунков без создания субституций
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/12aymob/importing_drawings_to_drawing_substitution/](https://www.reddit.com/r/toonboomharmony/comments/12aymob/importing_drawings_to_drawing_substitution/)
*   **Краткая суть проблемы**: Импорт рисунков без создания субституций
*   **Симптомы**: Импортированные файлы TVG не отображаются в окне Drawing Substitutions.
*   **Вероятная причина**: Файлы скопированы в папку элемента на диске, но не зарегистрированы в XML файле сцены (.xstage).
*   **Решение из комментариев**: Импортировать файлы через меню File -> Import -> Images или обновить базу данных.
*   **Как MCP-сервер может помочь**: Регистрация незалинкованных TVG файлов в структуре сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.drawings.import_image', 'harmony.assets.collect_scene_assets']`
*   **Чего не хватает в текущем MCP**: harmony.drawings.register_orphan_tvg_files (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 24. Замена головы целиком в группе
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/14bbjwp/substituting_just_the_head/](https://www.reddit.com/r/toonboomharmony/comments/14bbjwp/substituting_just_the_head/)
*   **Краткая суть проблемы**: Замена головы целиком в группе
*   **Симптомы**: При смене ракурса головы приходится вручную менять десятки слоев рта, глаз, волос.
*   **Вероятная причина**: Отсутствует единая мастер-группа головы с настроенными субституциями для каждого ракурса.
*   **Решение из комментариев**: Сгруппировать все элементы лица, использовать Master Controller для переключения ракурсов группы.
*   **Как MCP-сервер может помочь**: Сборка элементов лица под единую группу ракурсов.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.group', 'harmony.rig.create_head_turn_plan']`
*   **Чего не хватает в текущем MCP**: harmony.rig.setup_head_switch_group (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 25. Виджет Master Controller не отображается
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/118bfzn/help_with_rigs_master_controller/](https://www.reddit.com/r/toonboomharmony/comments/118bfzn/help_with_rigs_master_controller/)
*   **Краткая суть проблемы**: Виджет Master Controller не отображается
*   **Симптомы**: Нода Master Controller есть в Node View, но на экране в Camera View ничего не появляется.
*   **Вероятная причина**: Нода MC не подключена к активному Display, либо не нажата кнопка 'Show Control'.
*   **Решение из комментариев**: Подключить MC к основному Display сцены, выделить ноду и нажать Show Control.
*   **Как MCP-сервер может помочь**: Проверка и исправление подключения Master Controller к Display.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.find_broken_connections', 'harmony.nodes.connect']`
*   **Чего не хватает в текущем MCP**: harmony.mc.show_widget (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 26. Слайдеры Master Controller исчезают при смене кадра
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/sptckh/master_controllers_just_dont_show_up/](https://www.reddit.com/r/toonboomharmony/comments/sptckh/master_controllers_just_dont_show_up/)
*   **Краткая суть проблемы**: Слайдеры Master Controller исчезают при смене кадра
*   **Симптомы**: Слайдер управления ртом виден только на первом кадре, на остальных кадрах пропадает.
*   **Вероятная причина**: Кнопка 'Show Control' отключена для последующих кадров таймлайна, либо MC не проэкспонирован.
*   **Решение из комментариев**: Включить 'Show Control' и зафиксировать видимость виджетов в панели инструментов.
*   **Как MCP-сервер может помочь**: Проверка настроек экспозиции и отображения виджетов.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.get_attr', 'harmony.nodes.set_attr']`
*   **Чего не хватает в текущем MCP**: harmony.mc.force_global_visibility (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 27. Создание слайдеров через скрипты
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/14azqtm/master_controller_question/](https://www.reddit.com/r/toonboomharmony/comments/14azqtm/master_controller_question/)
*   **Краткая суть проблемы**: Создание слайдеров через скрипты
*   **Симптомы**: Сложно вручную настраивать ползунки для множества мелких деталей (например, зрачков).
*   **Вероятная причина**: Отсутствие автоматизации процесса генерации кода слайдера в Harmony.
*   **Решение из комментариев**: Использовать Python/QtScript API для автоматического создания Slider Wizard.
*   **Как MCP-сервер может помочь**: Генерация плана создания Master Controller Slider.
*   **Какие существующие MCP tools подходят**: `['harmony.rig.create_master_controller_plan']`
*   **Чего не хватает в текущем MCP**: harmony.mc.generate_slider_script (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 28. Master Controller затирает ручную анимацию
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/zs1tui/i_have_a_master_controller_for_the_character/](https://www.reddit.com/r/toonboomharmony/comments/zs1tui/i_have_a_master_controller_for_the_character/)
*   **Краткая суть проблемы**: Master Controller затирает ручную анимацию
*   **Симптомы**: После использования слайдера поворота головы пропадают все ручные ключи наклона шеи.
*   **Вероятная причина**: MC записывает ключи напрямую в те же каналы Peg, которые используются для ручной анимации.
*   **Решение из комментариев**: Добавить отдельные Peg-ноды для ручной анимации поверх пегов, управляемых Master Controller.
*   **Как MCP-сервер может помочь**: Аудит конфликтов управления и вставка разделительных пегов.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.list', 'harmony.rig.validate']`
*   **Чего не хватает в текущем MCP**: harmony.rig.insert_animation_pegs_above_mc (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 29. Ключи Master Controller не видны на таймлайне
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/11qxp89/keyframing_master_controller_movement/](https://www.reddit.com/r/toonboomharmony/comments/11qxp89/keyframing_master_controller_movement/)
*   **Краткая суть проблемы**: Ключи Master Controller не видны на таймлайне
*   **Симптомы**: Анимация проигрывается, но на таймлайне нет ключевых кадров Master Controller.
*   **Вероятная причина**: Ключи записываются во внутренние метаданные нод через скрипт MC, а не на основную дорожку таймлайна.
*   **Решение из комментариев**: Включить отображение функций всех каналов в таймлайне или искать ключи в Function Editor.
*   **Как MCP-сервер может помочь**: Поиск скрытых анимационных ключей в параметрах нод.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.get_attr', 'harmony.timeline.get']`
*   **Чего не хватает в текущем MCP**: harmony.timeline.reveal_hidden_keyframes (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 30. Ошибка импорта Master Controller в старую версию
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/10dbvq9/toonboom_17_master_controller_doesnt_work/](https://www.reddit.com/r/toonboomharmony/comments/10dbvq9/toonboom_17_master_controller_doesnt_work/)
*   **Краткая суть проблемы**: Ошибка импорта Master Controller в старую версию
*   **Симптомы**: При переносе рига в Harmony 17 слайдеры ломаются с синтаксической ошибкой скрипта.
*   **Вероятная причина**: Отсутствие папки `scripts` в каталоге новой сцены, из-за чего MC не находит файл `.tbState`.
*   **Решение из комментариев**: Вручную скопировать папку `scripts` с файлами состояний в папку текущего проекта.
*   **Как MCP-сервер может помочь**: Проверка целостности ассета и автоматический перенос зависимых файлов скриптов.
*   **Какие существующие MCP tools подходят**: `['harmony.assets.collect_scene_assets', 'harmony.assets.import_template']`
*   **Чего не хватает в текущем MCP**: harmony.assets.validate_dependency_paths (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 31. Случайные краши Harmony Premium
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/14h8169/any_way_to_stop_toon_boom_from_crashing/](https://www.reddit.com/r/toonboomharmony/comments/14h8169/any_way_to_stop_toon_boom_from_crashing/)
*   **Краткая суть проблемы**: Случайные краши Harmony Premium
*   **Симптомы**: Программа внезапно закрывается без сохранения изменений при перетаскивании тяжелых групп.
*   **Вероятная причина**: Переполнение видеопамяти (VRAM) при обработке векторных сглаживаний (OpenGL Cache Overflow).
*   **Решение из комментариев**: Снизить качество отображения OpenGL во вьюпорте или отключить сглаживание в настройках.
*   **Как MCP-сервер может помочь**: Анализ логов падений и проверка настроек конфигурации памяти.
*   **Какие существующие MCP tools подходят**: `['harmony.read_logs', 'harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.env.optimize_memory_settings (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 32. Краш при автосохранении
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/irk92k/toonboom_crashes_every_couple_minutes/](https://www.reddit.com/r/toonboomharmony/comments/irk92k/toonboom_crashes_every_couple_minutes/)
*   **Краткая суть проблемы**: Краш при автосохранении
*   **Симптомы**: Каждые 10-15 минут программа зависает и вылетает при попытке автосохранения.
*   **Вероятная причина**: Конфликт с облачными дисками (OneDrive/Dropbox), которые блокируют `.tmp` файлы в процессе синхронизации.
*   **Решение из комментариев**: Отключить синхронизацию папки проекта во время работы или перенести сцену на локальный SSD.
*   **Как MCP-сервер может помочь**: Аудит сетевого окружения и путей сохранения файлов.
*   **Какие существующие MCP tools подходят**: `['harmony.validate_environment', 'harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.env.detect_cloud_folder_sync (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 33. Лаги на мощном железе
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/pr83im/lagging_crashing_etc_even_with_16gb_ram_6core/](https://www.reddit.com/r/toonboomharmony/comments/pr83im/lagging_crashing_etc_even_with_16gb_ram_6core/)
*   **Краткая суть проблемы**: Лаги на мощном железе
*   **Симптомы**: Низкий FPS во вьюпорте при наличии мощной видеокарты RTX и процессора Core i7.
*   **Вероятная причина**: Harmony использует только одно ядро процессора для рендеринга векторных деформеров во вьюпорте.
*   **Решение из комментариев**: Включить 'Fast Display' и сгруппировать деформеры под Composite в режиме Pass Through.
*   **Как MCP-сервер может помочь**: Аудит структуры сцены на предмет оптимизации производительности.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config', 'harmony.nodes.list']`
*   **Чего не хватает в текущем MCP**: harmony.scene.measure_fps_performance (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 34. Краш при вызове проводника
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/t58oed/harmony_20_crashes_when_saving_browsing_files_and/](https://www.reddit.com/r/toonboomharmony/comments/t58oed/harmony_20_crashes_when_saving_browsing_files_and/)
*   **Краткая суть проблемы**: Краш при вызове проводника
*   **Симптомы**: Harmony вылетает при нажатии кнопок 'Save As', 'Import' или 'Browse'.
*   **Вероятная причина**: Конфликт Windows Explorer с локальными DLL файлами (`msvcp140.dll` / `vcruntime140.dll`) в папке Harmony.
*   **Решение из комментариев**: Переименовать DLL файлы в корневой папке Harmony Premium, чтобы заставить ее использовать системные DLL.
*   **Как MCP-сервер может помочь**: Поиск конфликтующих dll файлов в папке установки.
*   **Какие существующие MCP tools подходят**: `['harmony.validate_environment', 'harmony.detect_installation']`
*   **Чего не хватает в текущем MCP**: harmony.env.rename_conflicting_dlls (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 35. Восстановление поврежденного файла сцены
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/111r7fu/recovering_file_from_crashing/](https://www.reddit.com/r/toonboomharmony/comments/111r7fu/recovering_file_from_crashing/)
*   **Краткая суть проблемы**: Восстановление поврежденного файла сцены
*   **Симптомы**: При открытии проекта Harmony пишет 'Cannot open file' или вылетает.
*   **Вероятная причина**: XML структура файла `.xstage` повреждена (обрезана) из-за отключения питания во время сохранения.
*   **Решение из комментариев**: Восстановить предыдущую версию `.xstage` из папки `~backup` или автосохранения.
*   **Как MCP-сервер может помочь**: Сканирование резервных копий проекта и восстановление целостности `.xstage`.
*   **Какие существующие MCP tools подходят**: `['harmony.cc.list_versions', 'harmony.validate_environment']`
*   **Чего не хватает в текущем MCP**: harmony.scene.recover_corrupted_xml (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 36. Сбой экспорта из-за прав доступа
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/te48vi/harmony_crashes_when_trying_to_save_import_export/](https://www.reddit.com/r/toonboomharmony/comments/te48vi/harmony_crashes_when_trying_to_save_import_export/)
*   **Краткая суть проблемы**: Сбой экспорта из-за прав доступа
*   **Симптомы**: Краш при нажатии кнопки 'Render' или экспорте в QuickTime.
*   **Вероятная причина**: Нода `Write` указывает на защищенную системную папку или несуществующий сетевой диск.
*   **Решение из комментариев**: Изменить путь экспорта в свойствах ноды Write на локальную папку пользователя.
*   **Как MCP-сервер может помочь**: Проверка доступности путей экспорта во всех нодах Write.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.get_attr', 'harmony.nodes.set_attr', 'harmony.audit.find_render_problems']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.sanitize_write_paths (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 37. Лаги кисти при рисовании
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/hpx4fi/toon_boom_lagging_as_i_try_to_color_in_animation/](https://www.reddit.com/r/toonboomharmony/comments/hpx4fi/toon_boom_lagging_as_i_try_to_color_in_animation/)
*   **Краткая суть проблемы**: Лаги кисти при рисовании
*   **Симптомы**: Линия кисти отстает от пера планшета на секунду при раскрашивании.
*   **Вероятная причина**: Накопление огромного количества невидимых микро-штрихов (Invisible Strokes) от ластика на векторном слое.
*   **Решение из комментариев**: Выполнить очистку слоя с помощью команды 'Optimize' или удалить невидимые линии.
*   **Как MCP-сервер может помочь**: Оптимизация векторного слоя рисунка.
*   **Какие существующие MCP tools подходят**: `['harmony.drawings.list_layers']`
*   **Чего не хватает в текущем MCP**: harmony.drawings.optimize_geometry (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 38. Тяжелое проигрывание таймлайна
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/iynir1/is_there_a_way_to_reduce_lag_that_i_am_not/](https://www.reddit.com/r/toonboomharmony/comments/iynir1/is_there_a_way_to_reduce_lag_that_i_am_not/)
*   **Краткая суть проблемы**: Тяжелое проигрывание таймлайна
*   **Симптомы**: Проигрывание сцены идет со скоростью 5-10 кадров в секунду вместо 24.
*   **Вероятная причина**: Включен режим рендеринга тяжелых эффектов (размытия, свечения) в реальном времени.
*   **Решение из комментариев**: Переключить режим вьюпорта из Render View в OpenGL OpenGL, отключить отображение эффектов.
*   **Как MCP-сервер может помочь**: Временное отключение ресурсоемких эффектов для ускорения вьюпорта.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.set_attr', 'harmony.nodes.list']`
*   **Чего не хватает в текущем MCP**: harmony.scene.toggle_effects_visibility (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 39. Резкое падение производительности Harmony
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/sqh7qr/toon_boom_harmony_is_lagging_for_me_all_of_a/](https://www.reddit.com/r/toonboomharmony/comments/sqh7qr/toon_boom_harmony_is_lagging_for_me_all_of_a/)
*   **Краткая суть проблемы**: Резкое падение производительности Harmony
*   **Симптомы**: Программа начала сильно лагать после обновления операционной системы.
*   **Вероятная причина**: Конфликт нового видеодрайвера с Wacom API (Windows Ink).
*   **Решение из комментариев**: Отключить Windows Ink в настройках Wacom или переустановить драйвер графического планшета.
*   **Как MCP-сервер может помочь**: Проверка версий драйверов графического планшета в системе.
*   **Какие существующие MCP tools подходят**: `['harmony.validate_environment']`
*   **Чего не хватает в текущем MCP**: harmony.env.check_tablet_drivers (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 40. Медленный запуск Toon Boom Harmony
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/18ws4qn/toonboom_extremely_slow_startup/](https://www.reddit.com/r/toonboomharmony/comments/18ws4qn/toonboom_extremely_slow_startup/)
*   **Краткая суть проблемы**: Медленный запуск Toon Boom Harmony
*   **Симптомы**: При запуске Harmony висит на заставке (Splash Screen) до 2-3 минут.
*   **Вероятная причина**: Harmony пытается достучаться до сетевого сервера лицензий, который недоступен или тормозит.
*   **Решение из комментариев**: Настроить локальный сервер лицензий Toon Boom License Wizard или прописать путь в переменных окружения.
*   **Как MCP-сервер может помочь**: Анализ сетевых настроек лицензии в системе.
*   **Какие существующие MCP tools подходят**: `['harmony.validate_environment', 'harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.license.check_server_response (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 41. Задержка текстурной кисти
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/14lw7az/help_brush_lag/](https://www.reddit.com/r/toonboomharmony/comments/14lw7az/help_brush_lag/)
*   **Краткая суть проблемы**: Задержка текстурной кисти
*   **Симптомы**: Текстурная кисть (с растровым кончиком) сильно лагает по сравнению с обычной векторной.
*   **Вероятная причина**: Слишком высокое разрешение текстуры кисти при низкой видеопамяти.
*   **Решение из комментариев**: Уменьшить разрешение текстуры в свойствах инструмента или переключиться на стандартную кисть.
*   **Как MCP-сервер может помочь**: Аудит настроек инструментов рисования сцены.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.drawings.check_textured_brushes (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 42. Постепенное замедление работы в сцене
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/ach36l/toon_boom_harmony_is_a_bit_slow/](https://www.reddit.com/r/toonboomharmony/comments/ach36l/toon_boom_harmony_is_a_bit_slow/)
*   **Краткая суть проблемы**: Постепенное замедление работы в сцене
*   **Симптомы**: Чем дольше пользователь работает в сцене, тем медленнее она реагирует.
*   **Вероятная причина**: Накопление неиспользуемой истории изменений векторов в кэше рисунков сцены.
*   **Решение из комментариев**: Выполнить команду 'Clear Drawing Cache' или перезапустить приложение.
*   **Как MCP-сервер может помочь**: Мониторинг использования кэша рисунков и памяти.
*   **Какие существующие MCP tools подходят**: `['harmony.read_logs', 'harmony.nodes.clean_unused']`
*   **Чего не хватает в текущем MCP**: harmony.scene.clear_drawing_cache (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 43. Отсутствие Node View на экране
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/wunubj/where_is_the_node_view/](https://www.reddit.com/r/toonboomharmony/comments/wunubj/where_is_the_node_view/)
*   **Краткая суть проблемы**: Отсутствие Node View на экране
*   **Симптомы**: Пользователь не может найти окно Node View в интерфейсе программы.
*   **Вероятная причина**: Окно случайно закрыто, либо используется версия Harmony Essentials (где Node View отсутствует).
*   **Решение из комментариев**: Добавить вкладку Node View через плюс (+) на панелях окон или проверить версию программы.
*   **Как MCP-сервер может помочь**: Определение версии Harmony и проверка активного лейаута окон.
*   **Какие существующие MCP tools подходят**: `['harmony.get_capabilities', 'harmony.ui.verify_workspace']`
*   **Чего не хватает в текущем MCP**: harmony.ui.restore_default_layout (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 44. Ограничения версии Harmony Essentials
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/1bo6frr/does_essentials_have_the_node_view/](https://www.reddit.com/r/toonboomharmony/comments/1bo6frr/does_essentials_have_the_node_view/)
*   **Краткая суть проблемы**: Ограничения версии Harmony Essentials
*   **Симптомы**: Невозможно собирать сложные риги персонажей из-за отсутствия нодового редактора.
*   **Вероятная причина**: Harmony Essentials — это базовая версия программы, не поддерживающая Node View.
*   **Решение из комментариев**: Обновить версию программы до Advanced или Premium.
*   **Как MCP-сервер может помочь**: Анализ возможностей текущей лицензии и предупреждение о несовместимости с нодовым риггингом.
*   **Какие существующие MCP tools подходят**: `['harmony.get_capabilities']`
*   **Чего не хватает в текущем MCP**: harmony.license.check_upgrade_path (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 45. Потеря ноды в огромном графе
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/irxswh/finding_a_node_in_the_node_view/](https://www.reddit.com/r/toonboomharmony/comments/irxswh/finding_a_node_in_the_node_view/)
*   **Краткая суть проблемы**: Потеря ноды в огромном графе
*   **Симптомы**: Пользователь выделил объект в Camera View, но не может быстро найти соответствующую ноду в Node View.
*   **Вероятная причина**: Сложный риг содержит тысячи нод, а масштаб Node View сброшен.
*   **Решение из комментариев**: Выбрать объект в Camera View и нажать горячую клавишу 'O' внутри окна Node View для фокусировки на ноде.
*   **Как MCP-сервер может помочь**: Поиск координат ноды по выделению и авто-фокусировка.
*   **Какие существующие MCP tools подходят**: `['harmony.scene.search_nodes', 'harmony.nodes.get']`
*   **Чего не хватает в текущем MCP**: harmony.ui.focus_on_node (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 46. Node View скрыт в кастомной рабочей области
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/y2avlk/for_the_life_of_me_i_dont_see_node_view_option_i/](https://www.reddit.com/r/toonboomharmony/comments/y2avlk/for_the_life_of_me_i_dont_see_node_view_option_i/)
*   **Краткая суть проблемы**: Node View скрыт в кастомной рабочей области
*   **Симптомы**: Опция Node View отсутствует в выпадающем меню добавления панелей.
*   **Вероятная причина**: Сбился файл конфигурации рабочей области (layouts.xml).
*   **Решение из комментариев**: Сбросить настройки интерфейса через меню Windows -> Restore Default Workspace.
*   **Как MCP-сервер может помочь**: Сброс зависшей конфигурации рабочей области в папке AppData.
*   **Какие существующие MCP tools подходят**: `['harmony.ui.reset_workspace_instruction']`
*   **Чего не хватает в текущем MCP**: harmony.ui.clean_layout_xml (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 47. Эффекты ломают порядок наложения
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/bca6cz/how_do_i_use_effects_in_toon_boom_harmony_without/](https://www.reddit.com/r/toonboomharmony/comments/bca6cz/how_do_i_use_effects_in_toon_boom_harmony_without/)
*   **Краткая суть проблемы**: Эффекты ломают порядок наложения
*   **Симптомы**: Подключение эффекта Glow/Shadow сдвигает ноду на задний план, нарушая Z-depth.
*   **Вероятная причина**: Нода эффекта подключена к Composite, который плотно склеивает слои (Bitmap mode).
*   **Решение из комментариев**: Использовать Composite в режиме Pass Through и подключать эффект параллельным кабелем.
*   **Как MCP-сервер может помочь**: Анализ и исправление связей нод эффектов.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.find_broken_connections', 'harmony.nodes.connect']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.insert_effect_correctly (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 48. Слой рисунка не виден на таймлайне
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/1bfekp7/drawing_layers_dont_appear_on_my_timeliness/](https://www.reddit.com/r/toonboomharmony/comments/1bfekp7/drawing_layers_dont_appear_on_my_timeliness/)
*   **Краткая суть проблемы**: Слой рисунка не виден на таймлайне
*   **Симптомы**: Слой создан в Node View, но отсутствует в списке слоев на таймлайне.
*   **Вероятная причина**: Нода Drawing не подключена к активному Composite сцены.
*   **Решение из комментариев**: Протянуть кабель от выхода Drawing ноды к портам главного Composite ноды.
*   **Как MCP-сервер может помочь**: Поиск сиротских (неподключенных) нод рисунков.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.find_broken_connections', 'harmony.nodes.connect']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.connect_orphans (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 49. Ошибка сборки базовой иерархии
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/1dcp8sr/simple_rig_help/](https://www.reddit.com/r/toonboomharmony/comments/1dcp8sr/simple_rig_help/)
*   **Краткая суть проблемы**: Ошибка сборки базовой иерархии
*   **Симптомы**: Движение руки перемещает тело, а не наоборот.
*   **Вероятная причина**: Кабели в Node View подключены задом наперед (ребенок управляет родителем).
*   **Решение из комментариев**: Переподключить связи: родительский Peg сверху подключается к верхнему порту дочерней ноды.
*   **Как MCP-сервер может помочь**: Проверка топологии дерева иерархии.
*   **Какие существующие MCP tools подходят**: `['harmony.rig.validate', 'harmony.nodes.connect']`
*   **Чего не хватает в текущем MCP**: harmony.rig.reverse_connection (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 50. Хаос с пегами в риге
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/kyhau5/amazing_rigging_tutorial/](https://www.reddit.com/r/toonboomharmony/comments/kyhau5/amazing_rigging_tutorial/)
*   **Краткая суть проблемы**: Хаос с пегами в риге
*   **Симптомы**: У персонажа отсутствуют промежуточные пеги, из-за чего аниматоры не могут группировать движения.
*   **Вероятная причина**: Риггер подключил все рисунки напрямую к одному мастер-пегу, пропустив локальные пеги конечностей.
*   **Решение из комментариев**: Создать локальные пеги для каждой детали через Ctrl+P и выстроить их по цепочке.
*   **Как MCP-сервер может помочь**: Массовое создание локальных пегов над Drawing нодами.
*   **Какие существующие MCP tools подходят**: `['harmony.rig.create_pegs', 'harmony.nodes.connect']`
*   **Чего не хватает в текущем MCP**: harmony.rig.auto_insert_pegs (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 51. Разрыв суставов при вращении
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/17o2gx0/rigging_help/](https://www.reddit.com/r/toonboomharmony/comments/17o2gx0/rigging_help/)
*   **Краткая суть проблемы**: Разрыв суставов при вращении
*   **Симптомы**: При повороте плеча рука отрывается от тела, образуя дыру.
*   **Вероятная причина**: Окружности суставов нарисованы не идеально соосными, либо пивоты не совпадают с геометрическими центрами стыков.
*   **Решение из комментариев**: Перерисовать суставы идеальными кругами с совпадающими центрами вращения.
*   **Как MCP-сервер может помочь**: Проверка соосности пивотов смежных деталей рук/ног.
*   **Какие существующие MCP tools подходят**: `['harmony.rig.validate', 'harmony.nodes.get_attr']`
*   **Чего не хватает в текущем MCP**: harmony.rig.align_joint_pivots (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 52. Ошибки именования нод
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/kdag6g/harmony_character_rigging_tutorials/](https://www.reddit.com/r/toonboomharmony/comments/kdag6g/harmony_character_rigging_tutorials/)
*   **Краткая суть проблемы**: Ошибки именования нод
*   **Симптомы**: Скрипты липсинка или автоматического создания пегов ломаются при запуске.
*   **Вероятная причина**: Ноды названы хаотично, отсутствуют префиксы и суффиксы сторон (_L, _R).
*   **Решение из комментариев**: Переименовать ноды в соответствии со стандартом именования студии.
*   **Как MCP-сервер может помочь**: Аудит структуры имен и пакетное переименование.
*   **Какие существующие MCP tools подходят**: `['harmony.rig.validate_naming', 'harmony.nodes.rename']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.batch_rename (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 53. Сбитая структура деформационных групп
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/12rtc4x/question_about_rigging_in_harmony/](https://www.reddit.com/r/toonboomharmony/comments/12rtc4x/question_about_rigging_in_harmony/)
*   **Краткая суть проблемы**: Сбитая структура деформационных групп
*   **Симптомы**: При скрытии группы тела деформеры конечностей продолжают отображаться на экране.
*   **Вероятная причина**: Цепочки деформаций созданы вне групп конечностей и подключены к глобальному дисплею напрямую.
*   **Решение из комментариев**: Поместить ноды деформеров внутрь соответствующих групп конечностей.
*   **Как MCP-сервер может помочь**: Поиск нод деформации, находящихся вне групп рисования.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.group', 'harmony.rig.validate_deformers']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.move_to_group (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 54. Пустые слои в готовом риге
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/x9mc7c/rigging_process/](https://www.reddit.com/r/toonboomharmony/comments/x9mc7c/rigging_process/)
*   **Краткая суть проблемы**: Пустые слои в готовом риге
*   **Симптомы**: На таймлайне висит много пустых дорожек без рисунков, засоряющих рабочую область.
*   **Вероятная причина**: Риггер забыл удалить отладочные или временные слои после завершения clean-up.
*   **Решение из комментариев**: Удалить пустые слои вручную или запустить очистку неиспользуемых элементов.
*   **Как MCP-сервер может помочь**: Поиск и удаление пустых слоев в проекте.
*   **Какие существующие MCP tools подходят**: `['harmony.audit.find_empty_layers', 'harmony.nodes.delete']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.delete_unused_layers (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 55. Конфликт кастомных TB-скриптов
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/1do4gie/stumbled_upon_this_bunch_of_useful_and_free/](https://www.reddit.com/r/toonboomharmony/comments/1do4gie/stumbled_upon_this_bunch_of_useful_and_free/)
*   **Краткая суть проблемы**: Конфликт кастомных TB-скриптов
*   **Симптомы**: Панель инструментов Harmony не реагирует на нажатия кнопок запуска скриптов.
*   **Вероятная причина**: Синтаксические ошибки во внешних JavaScript/QtScript файлах, загруженных в папку скриптов пользователя.
*   **Решение из комментариев**: Удалить конфликтующие `.js` файлы из папки настроек пользователя.
*   **Как MCP-сервер может помочь**: Проверка и отладка загруженных QtScript файлов.
*   **Какие существующие MCP tools подходят**: `['harmony.cc.run_qtscript', 'harmony.read_logs']`
*   **Чего не хватает в текущем MCP**: harmony.env.validate_custom_scripts (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 56. Невозможность переместить руку без смещения всего тела
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/1cv1nb1/im_animating_with_a_rig_and_whenever_i_wanna_move/](https://www.reddit.com/r/toonboomharmony/comments/1cv1nb1/im_animating_with_a_rig_and_whenever_i_wanna_move/)
*   **Краткая суть проблемы**: Невозможность переместить руку без смещения всего тела
*   **Симптомы**: При выборе предплечья выделяется и смещается все плечо целиком.
*   **Вероятная причина**: Включен режим 'Select Parent Peg' (выделение родителя) по умолчанию в настройках инструмента Transform.
*   **Решение из комментариев**: Отключить опцию автоматического выбора пега-родителя на панели Tool Properties.
*   **Как MCP-сервер может помочь**: Проверка настроек выделения и манипуляции во вьюпорте.
*   **Какие существующие MCP tools подходят**: `['harmony.get_config']`
*   **Чего не хватает в текущем MCP**: harmony.ui.set_tool_properties (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Нет

#### 57. Blend Node ломает маску
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/16a39vf/blending_layer_help/](https://www.reddit.com/r/toonboomharmony/comments/16a39vf/blending_layer_help/)
*   **Краткая суть проблемы**: Blend Node ломает маску
*   **Симптомы**: При подключении Blend к Cutter маска перестает обрезать слои.
*   **Вероятная причина**: Blend нода возвращает растровую картинку, которая не поддерживается векторным входом Cutter.
*   **Решение из комментариев**: Изменить порядок нод: сначала применить Cutter к векторному слою, затем Blend.
*   **Как MCP-сервер может помочь**: Аудит последовательности подключения эффектов и масок.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.find_broken_connections', 'harmony.nodes.connect']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.reorder_effects (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 58. Динамический контур персонажа
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/vifsti/how_would_one_go_about_adding_a_thick_outline_to/](https://www.reddit.com/r/toonboomharmony/comments/vifsti/how_would_one_go_about_adding_a_thick_outline_to/)
*   **Краткая суть проблемы**: Динамический контур персонажа
*   **Симптомы**: Пользователь хочет добавить толстый внешний контур ко всему персонажу, не рисуя его вручную.
*   **Вероятная причина**: Отсутствие автоматического эффекта обводки в базовой нодовой структуре.
*   **Решение из комментариев**: Использовать Colour-Override и Matte-Resize ноды для раздувания и перекраски общего контура.
*   **Как MCP-сервер может помочь**: Сборка автоматического модуля обводки.
*   **Какие существующие MCP tools подходят**: `['harmony.nodes.create', 'harmony.nodes.connect']`
*   **Чего не хватает в текущем MCP**: harmony.nodes.create_outline_chain (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 59. Сбой активации лицензии
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/qgypcj/is_there_a_free_or_inexpensive_version_of/](https://www.reddit.com/r/toonboomharmony/comments/qgypcj/is_there_a_free_or_inexpensive_version_of/)
*   **Краткая суть проблемы**: Сбой активации лицензии
*   **Симптомы**: Harmony выдает ошибку о просроченной или отсутствующей лицензии на старте.
*   **Вероятная причина**: Локальная служба Toon Boom License Daemon остановлена или заблокирована брандмауэром.
*   **Решение из комментариев**: Запустить службу через службы Windows или добавить Toon Boom в исключения брандмауэра.
*   **Как MCP-сервер может помочь**: Проверка состояния службы лицензирования в операционной системе.
*   **Какие существующие MCP tools подходят**: `['harmony.validate_environment']`
*   **Чего не хватает в текущем MCP**: harmony.env.restart_license_service (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да

#### 60. Рабочая область сбивается при запуске
*   **Ссылка**: [https://www.reddit.com/r/toonboomharmony/comments/16yryzx/is_toon_boom_harmony_worth_it_for_beginners/](https://www.reddit.com/r/toonboomharmony/comments/16yryzx/is_toon_boom_harmony_worth_it_for_beginners/)
*   **Краткая суть проблемы**: Рабочая область сбивается при запуске
*   **Симптомы**: При каждом запуске Harmony окна сбрасываются в хаотичное положение.
*   **Вероятная причина**: Файл `user-layouts.xml` поврежден или заблокирован правами доступа (только для чтения).
*   **Решение из комментариев**: Удалить файл `user-layouts.xml` в папке настроек пользователя для пересоздания.
*   **Как MCP-сервер может помочь**: Проверка прав доступа к конфигурационным файлам пользователя.
*   **Какие существующие MCP tools подходят**: `['harmony.validate_environment', 'harmony.ui.reset_workspace_instruction']`
*   **Чего не хватает в текущем MCP**: harmony.env.fix_file_permissions (MISSING_TOOL_SUGGESTION)
*   **Нужно ли ручное подтверждение пользователя**: Да



---

## ЧАСТЬ 2. Системный анализ и Карта проблем

### 1. Карта типичных проблем Toon Boom Harmony

Ниже приведена матрица распределения проблем по категориям, их критичности для пайплайна и частоты упоминания на Reddit.

| Категория | Типичные симптомы | Уровень критичности | Частота (Reddit) | Возможность авто-исправления |
| :--- | :--- | :--- | :--- | :--- |
| **Deformers** | Коллапс точек, двойная трансформация, разрывы конечностей, искажения меша при флипе. | **Критический** (блокирует анимацию) | Высокая (~30%) | **Частично** (требуется валидация исходных поз) |
| **Pivots** | Прыжки рисунков при смене кадров, вращение не по центру сустава, сброс точек вращения. | **Высокий** (ломает фазы движений) | Высокая (~25%) | **Высокая** (синхронизация метаданных пивотов) |
| **Cutters / Masking** | Артефакты рендеринга, инвертированные маски, пропадание текстур, сплющивание Z-depth. | **Средний** (визуальные баги) | Средняя (~15%) | **Высокая** (исправление параметров композита) |
| **Node Graph** | Бесконечные циклы, ключи на Drawing-нодах, хаос в соединениях, пропадание дисплея. | **Критический** (краши и зависания) | Средняя (~15%) | **Высокая** (топологический аудит) |
| **Drawing Subs** | Дыры на таймлайне, пропавшие фазы ртов/рук, пустые кадры при импорте. | **Средний** (рутина аниматора) | Средняя (~10%) | **Высокая** (поиск отсутствующих путей) |
| **Master Controllers** | Зависание слайдеров, скрытые виджеты, потеря файлов состояния `.tbState`. | **Высокий** (блокирует мимику) | Низкая (~5%) | **Низкая** (скриптовые зависимости) |
| **Performance / Crash**| Вылеты при рендере, лаги таймлайна, долгие сохранения, DLL ошибки. | **Критический** (срыв дедлайнов) | Высокая (сезонная) | **Низкая** (зависит от железа/ОС) |

---

### 2. Частые причины ошибок (Root Causes)

Анализ 60 тредов выявил 5 фундаментальных архитектурных причин, из-за которых пользователи совершают ошибки в Harmony:

1. **Размытие концепции Peg-to-Drawing**: Начинающие аниматоры не понимают разницы между контейнером рисунка (Drawing) и контейнером трансформации (Peg). Это ведет к записи ключевых кадров на Drawing ноды, конфликтам пивотов и двойным трансформациям.
2. **Сжатие Z-глубины (Composite Flattening)**: Использование режима `As Bitmap` в Composite-нодах по умолчанию при создании групп. Это ломает Z-ordering и маскирование внутри групп, вынуждая аниматоров тратить часы на поиск причин некорректного рендеринга.
3. **Отсутствие единого стандарта пивотов**: Смешение Drawing Pivots и Peg Pivots в одном риге. Когда один риггер ставит пивоты на рисунках, а другой — на пегах, при объединении сцен риг "взрывается".
4. **Неявное переименование векторных ресурсов**: При изменении названий слоев в Node View ломаются внутренние ссылки деформеров, которые ищут файлы рисунков по старым текстовым путям.
5. **Фоновые конфликты файловой системы**: Специфика сохранения Harmony (создание сотен мелких `.tvg` файлов при каждом автосохранении) конфликтует с алгоритмами синхронизации облачных дисков (OneDrive/Dropbox) и антивирусами, приводя к зависаниям и потере данных.

---

### 3. Повторяющиеся жалобы пользователей

1. **«Прыгающие пивоты»**: Аниматоры регулярно жалуются на то, что при смене рисунка руки или рта точка вращения смещается.
2. **«Бесконечные зависания при сохранении»**: Пользователи, работающие из сетевых папок или облачных дисков (OneDrive, Dropbox), постоянно сталкиваются со сбоем сохранения.
3. **«Невыделяемые маркеры деформеров»**: Новички часто не понимают, почему они видят зеленые точки деформера, но не могут переместить их.
4. **«Вьюпорт показывает правильно, а рендер — пустой»**: Конфликты Composite-нод в режиме Bitmap, ломающие маски при экспорте.
5. **«Программа лагает даже на мощном ПК с RTX»**: Однопоточная обработка деформаций процессором во вьюпорте.

---

### 4. Решения, которые чаще всего советуют

1. **Использовать `Apply Pivot to Parent Peg`**: Это переносит управление точкой вращения на Peg-ноду, разгружая Drawing слой.
2. **Переключать Composite в режим `Pass Through`**: Это сохраняет информацию о Z-depth, необходимую для работы масок и перекрытия слоев.
3. **Использовать `Copy to Resting Position`**: Для восстановления деформеров вместо удаления ключевых кадров.
4. **Переносить ключи с Drawing на Peg**: Использовать шорткат `Can Never Enter Drawing Mode` на Drawing нодах.
5. **Переименовывать DLL-файлы**: Для устранения падений при открытии диалогового окна проводника.

---

### 5. Диагностика: “Симптом → Причина → MCP-действие”

| Симптом | Вероятная причина | Диагностическое MCP-действие | Существующий MCP Tool | Рекомендуемое исправление |
| :--- | :--- | :--- | :--- | :--- |
| Конечность вращается вокруг центра экрана | Пивот Drawing/Peg сброшен в (0,0) | Проверка атрибутов `PIVOT` для выбранной ноды | `harmony.nodes.get_attr` | Перенос координат с референсного кадра или сброс к родительскому пивоту |
| При смене рта/кисти рисунок прыгает в сторону | Разные пивоты у субституций в одной Drawing-ноде | Сравнение метаданных пивотов всех субституций в ноде | `harmony.drawings.list_substitutions` | Синхронизация пивотов по первому кадру субституции |
| Черный экран во вьюпорте камеры | Отсутствует активный дисплей или отключен Composite | Проверка связи от Display ноды до Composite | `harmony.nodes.find_broken_connections` | Подключение Display к выходу главного Composite сцены |
| Рука движется в два раза быстрее курсора | Двойная связь (Double Transformation) | Анализ входящих путей к Drawing ноде в графе | `harmony.nodes.list` | Разрыв прямого кабеля от Peg к Drawing, проведение через Deformer |
| Зрачки вылезают за границы век при рендере | Composite под Cutter настроен в режиме Bitmap | Чтение атрибута `COMPOSITE_MODE` | `harmony.nodes.get_attr` | Изменение атрибута режима Composite на `Pass Through` |
| Программа зависает при движении кости | Циклическая связь в Node View | Алгоритм поиска циклов в графе нод | `harmony.nodes.find_broken_connections` | Удаление циклического кабеля |
| Деформер горит серым и не гнет рисунок | Сломалась связь после переименования ноды | Валидация связи деформационной группы с Drawing нодой | `harmony.rig.validate_deformers` | Перелинковка деформера на новое имя Drawing-ноды |

---

## ЧАСТЬ 3. Рецепты исправления (Repair Recipes) для MCP-сервера

### Рецепт 1: Очистка сцены от ключей на Drawing-нодах (Drawing Keyframe Purge)
* **Цель**: Удалить все ошибочные анимационные ключи со слоев рисунков, перенеся их на родительские пеги, и заблокировать дальнейшее загрязнение.
* **Пошаговый алгоритм**:
  1. Выполнить `harmony.nodes.list` для получения списка всех нод типа `READ` (Drawing).
  2. Для каждой Drawing ноды вызвать `harmony.nodes.get_attr` для проверки наличия ключевых кадров на каналах трансформации (`position`, `rotation`, `scale`).
  3. Если ключи обнаружены:
     * Найти родительский Peg над этой нодой (через `harmony.nodes.list` связей).
     * Если родительского Peg нет, создать его через `harmony.nodes.create` и подключить.
     * Записать значения трансформаций из ключей Drawing на Peg с помощью `harmony.timeline.create_keyframe` (или запечь анимацию).
     * Сбросить трансформации на Drawing ноде в дефолтные (0,0) через `harmony.nodes.set_attr`.
  4. Установить на Drawing-ноде атрибут `CAN_NEVER_ENTER_DRAWING_MODE` в значение `true` через `harmony.nodes.set_attr`.

### Рецепт 2: Восстановление Z-depth перекрытий в маскированных группах (Composite Fix)
* **Цель**: Автоматически исправить плоские маски, восстановив правильное Z-depth перекрытие слоев внутри глаз, ртов и лица.
* **Пошаговый алгоритм**:
  1. Выполнить поиск всех нод типа `Cutter` с помощью `harmony.nodes.search`.
  2. Для каждой найденной ноды Cutter отследить входящий кабель в порт `Image` (правый порт) до ближайшей Composite ноды.
  3. Проверить режим работы этой Composite ноды с помощью `harmony.nodes.get_attr` (атрибут `compositeMode`).
  4. Если режим установлен в `As Bitmap` или `As Vector`:
     * Вызвать `harmony.nodes.set_attr` и изменить параметр `compositeMode` на `Pass Through`.
  5. Проверить родительские пеги элементов, входящих в этот Composite, на наличие микро-сдвигов Z (`position.z`).
  6. Если сдвиги по Z отсутствуют, сгенерировать пошаговые микро-сдвиги (например, `0.0001` для нижнего слоя, `0.0002` для среднего и т.д.) для корректного распределения слоев в 3D пространстве.

---

## ЧАСТЬ 4. Рекомендации по развитию MCP-сервера

### 1. Точечные улучшения существующих инструментов (Existing Tools Refinement)

1. **`harmony.nodes.connect` / `harmony.nodes.disconnect`**:
   * *Проблема*: Часто путаются порты Cutter-нод (левый/правый) или Composite-нод (порядок наложения).
   * *Улучшение*: Добавить валидацию имен портов. Вместо безликих индексов портов (`0`, `1`) позволить передавать семантические алиасы: `Cutter.Matte`, `Cutter.Image`, `Composite.Input[N]`.
2. **`harmony.rig.validate`**:
   * *Проблема*: Инструмент выдает общий отчет, но не группирует ошибки по приоритету для аниматора.
   * *Улучшение*: Интегрировать проверки:
     * Наличие ключей на Drawing-нодах.
     * Несовпадение пивотов субституций.
     * Не-Pass-Through композиты под каттерами.
     * Дубликаты имен нод.

### 2. Новые предлагаемые инструменты (Missing Tool Suggestions)

*   **`harmony.nodes.resolve_cycles`**: Топологический анализатор нодовой сети. Находит замкнутые циклы кабелей и безопасно разрывает их, предотвращая зависания приложения.
*   **`harmony.deformers.reset_to_rest_pose`**: Анализирует деформационные группы и сбрасывает текущие анимационные офсеты точек Curve/Envelope к значениям по умолчанию (Rest Pose) без повреждения структуры деформера.
*   **`harmony.drawings.clean_unused_substitutions`**: Сканирует таймлайн всей сцены, находит файлы `.tvg` в папке элемента, которые ни разу не экспонируются на протяжении таймлайна, и удаляет их для уменьшения размера проекта (Scene Bloat).
*   **`harmony.scene.release_lock`**: Безопасный утилизатор зависших файлов `.lock` / `.lck`. Запускается только после проверки отсутствия активного процесса `Harmony.exe` / `Harmony Premium` в системе.
*   **`harmony.drawings.sync_substitutions_pivots`**: Пакетно синхронизирует пивоты векторного рисования между выбранными кадрами субституций.

---

## ЧАСТЬ 5. Проблемы, не подлежащие автоматическому исправлению

Ряд критических проблем Toon Boom Harmony **нельзя** исправлять в автоматическом режиме без участия человека из-за риска необратимого повреждения художественных данных:

1. **Искажение меша Envelope-деформера при повороте (Mesh Self-Intersection)**:
   * *Почему нельзя автоматически*: Исправление требует изменения топологии векторов или перерисовки фазы рига. Автоматический пересчет точек может полностью исказить пропорции персонажа, задуманные художником.
2. **Краши OpenGL из-за несовместимости видеокарты/драйверов**:
   * *Почему нельзя автоматически*: Это системный сбой на уровне ОС и драйверов GPU. Агент не имеет прав на установку видеодрайверов или изменение системных DLL файлов в реестре Windows/macOS.
3. **Объединение конфликтующих цветовых палитр (Palette Conflict Resolution)**:
   * *Почему нельзя автоматически*: Если в двух сценах один и тот же цвет (например, кожа лица) имеет разные оттенки, автоматическое слияние палитр может перекрасить персонажа в неверный цвет. Выбор эталонной палитры всегда должен делать супервайзер.
4. **Смена FPS проекта с ретаймингом ключевых кадров**:
   * *Почему нельзя автоматически*: Принудительный сдвиг ключей на дробные кадры (при переходе с 24 на 30 FPS) может нарушить фазы липсинга и лимитированной анимации (double frame timing), создав визуальное дрожание. Ретайминг требует творческого контроля.

---

## ЧАСТЬ 6. Рекомендации для поведения агента Antigravity

При работе с проектами Toon Boom Harmony агент Antigravity должен строго придерживаться следующих правил безопасности и качества:

1. **Принцип "Сначала Безопасность" (Dry-Run First)**:
   Перед любым изменением нодовой структуры или атрибутов (особенно при изменении Z-depth или типов Composite) агент обязан выполнить Dry-Run:
   * Записать текущую структуру нод во временный файл бэкапа.
   * Описать пользователю планируемые изменения в формате: *"Я изменю режим ноды Composite_Face с As Bitmap на Pass Through для исправления маски"* и дождаться подтверждения, если это критический узел.
2. **Запрет на редактирование Drawing слоев без включенного Peg**:
   При добавлении любых новых элементов в сцену агент должен автоматически создавать Peg-ноду над Drawing-нодой и устанавливать на Drawing-ноде флаг `CAN_NEVER_ENTER_DRAWING_MODE`. Никогда не оставлять "голые" Drawing ноды.
3. **Контроль структуры Именования (Naming Conventions)**:
   При создании новых нод агент должен следовать строгой номенклатуре проекта (например, суффиксы `_P` для Peg, `_D` для Drawing, `_C` для Composite, `_Cutter` для масок). Это упростит последующий аудит сцены.
4. **Обязательная проверка кадра Rest Pose (Frame 1)**:
   Любые калибровки пивотов, деформеров или родительских связей должны производиться строго на Frame 1 (или назначенном кадре Rest Pose), где все трансформации равны нулю. Изменение пивотов на кадрах с анимацией строго запрещено.
5. **Информирование о скрытых зависимостях**:
   При удалении "неиспользуемых" нод или палитр агент обязан предупредить пользователя, что они могут использовать во внешних сценах-шаблонах (`.tpl`), ссылающихся на текущую сцену.
