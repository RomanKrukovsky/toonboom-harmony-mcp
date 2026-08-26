# Журнал — только факты и доказательства

Формат: дата / что сделано / чем доказано. Никаких оценок зрелости.

## 2026-08-25

**Библиотека эталонных ригов** (датасет от живых ригеров):
- 26 ригов скопированы в fixtures/rig_library/ (Girl 297 костей / 4503 аним-канала,
  astronaft 165/3691, Pioneer Pesel 199, Dad body 140, Among, Normann, Skelet,
  Ilya_muromets, alien, mannequin, referee, Rytsar, Robo, Test leg, Ball,
  Mr.Stu, Cuddles, Huggy Wuggy, football_player, Litle girl, Tsianid.anime).
- Каталог: fixtures/rig_library/_catalog.json (слои/кости/свитчи/анимация по каждому).
- 19 ригов извлечены в PIR: fixtures/rig_library/pir/*.pir.json.
- Формат .anime (Anime Studio, предок Moho) — тот же zip, Project.animeproj;
  экстрактор пока ждёт mohoproj (Tsianid не извлечён — в списке дел).

**Механика смарт-костей вскрыта на живых файлах**:
- Диал = кость, у anim_angle есть "actions": [{name, pose{when[], val[]}}] —
  ключевые углы диала (у Girl их 37: Mouth/Eyes/Brows/Pupils/Head/Foot rol/
  Leg bend/Skirt/jacket Switch...).
- Связь: у switch_keys свитча те же "actions" с тем же именем — на позе диала
  свитч показывает заданное состояние (дословный пример из Girl: диал "jacket"
  поза 0 -> "Join jacket 2 R", поза 2 -> "Join 2 R").
- Экстрактор и эмиттер обновлены: dial_actions костей и switch_dial_actions
  свитчей сохраняются в PIR и возвращаются при сборке (round-trip Gramps — PASS).
- Следствие: автогенерация «рты/глаза в умных костях» теперь кодируется
  формулой: состояния рисунка -> свитч -> диал с actions -> связь по имени.

**Ходьба Gramps (замкнутый круг в живой Moho)**:
- v1: дефекты — ноги скользят, колени ломаются, корпус дёргается.
- Причина скольжения найдена математикой: размах бедра ±0.31 рад давал шаг
  0.49 ед. при скорости корпуса 0.317 ед./полушаг.
- v2 (Goofy): stride = 2*L*sin(0.24) = 0.38 = скорости корпуса; колено гнётся
  только в переносе; движение равномерно (ключи каждые 6 кадров, v1=v2=0);
  руки ±0.4 с локтевым форсом, кивок головы с запаздыванием, наклон в ходьбу.
- Приёмка пользователем в живой Moho: «дефекты ушли, добавить характера».
- Анимация вживлена в fixtures/moho_reference/gramps_rig.moho (инъекция
  только каналов; бэкап gramps_rig.moho.bak).

**Инфраструктура**: мост MohoMCP работает, но лениво (poll только при
перерисовке UI); document.screenshot с width/height ронял старый Moho
(крэш-отчёт 18:21, FileRender00) — использовать без кастомных размеров.
Скриншоты поз через мост пока не получены (сервер в свежем инстансе
не стартовался штатно) — в списке дел.

## 2026-08-24

**Инвентаризация реальности** (аудит репозитория):
- «Harmony Python API» из README — существует. `ToonBoom.harmony` импортируется
  homebrew python3.9 из бандла Harmony 25 Premium (доказано запуском, вывод:
  `IMPORT OK`, полный список классов Node/GroupNode/PegNode/ReadNode/HarmonyScene).
  Но: `harmony.session()` → `RuntimeError: Harmony is not currently running` —
  программе нужна лицензия FlexNet, её на машине нет. Живых успешных операций
  с Harmony в логах за всю историю проекта: 0 (мост 12.07 упал на session()).
- Язык скриптования Harmony — TBScript/QtScript (JS). CLI `-batch -script`
  запускается и умирает на проверке лицензии (~1.1 c, exit не 0).
- Moho Pro 14: приложение удалено с машины. Формат .moho разобран на живых
  файлах: zip, внутри Project.mohoproj = JSON. В юзерских скриптах найден
  готовый MohoMCP-мост (JSON-RPC через файлы, ~/Library/Application Support/Moho/scripts/menu/).
- Маркетинг и самооценка (12 файлов) перемещены в _archive/marketing/,
  замороженная реконструкция видео — в _archive/frozen-scope/. Не удалены.
- Нарезанного персонажа в репо не было (fixtures/character.png — фото NASA).
  Взят Gramps из контента Moho: gramps.psd (нарезанный) + Tutorial 3.04 Final
  (готовый риг, 13 костей) + Tutorial 5.01 (SwitchLayer рта, 5 состояний).
  Копии в fixtures/moho_reference/.

**Построено** (код: pipeline/):
- PIR v0 (pipeline/pir/schema.py) — промежуточное описание рига:
  кости иерархией, части (mesh/image/switch/group), каналы, z-order.
- Извлечение .moho → PIR (pipeline/moho/extract.py).
- Сборка PIR → .moho по шаблонам живых документов
  (pipeline/moho/emit.py, шаблоны в pipeline/moho/templates/ — дословно
  из Moho 14 туториалов, не выдуманы).
- Структурный ревизор (pipeline/tools/structural_audit.py): сравнивает кости
  (имя/родитель/длина/позиция/угол), дерево слоёв, mesh-геометрию,
  switch-каналы, transforms. Негативный контроль: разные файлы различает (FAIL),
  позитивный: копия против оригинала — PASS.

**Доказано запуском**:
- Round-trip Gramps: fixtures/moho_reference/gramps_rig.moho → PIR
  (output/pipeline_roundtrip/gramps.pir.json) → gramps_regenerated.moho →
  STRUCTURAL AUDIT: PASS (кости, дерево, mesh, transforms идентичны).
- Round-trip mouth_switch.moho (рот, 5 состояний): PASS.

**Не доказано (честно)**:
- Сгенерированный .moho не открывался в живой Moho — приложения нет на машине.
  Ждёт переустановки Moho Pro 14.
- Рендер не выполнялся.
- Сторона Harmony не работает: нет лицензии. Переводчик PIR→Harmony не начат.

## 2026-08-25 (вечер) — PIR v1 + Standard V1

- Форензика 20/20 ригов: fixtures/rig_library/forensics/*.forensics.json
  (полное дерево слоёв, кости со всеми полями, диалы, связи диал→свитч по
  имени action, маски, анимация, словарь имён).
- Кросс-анализ: binding_mode=1 (20/20); head-turn стандарт 9 поз −45..270°
  с картой видов (Girl=alien=astronaft=mannequin); start/end кривые
  деформеры (6 ригов); маски 8..104 на риг; словарь имён switch/start/end/
  deformer/squash/order; ik_lock — дефолт Moho (не паттерн); динамика
  скелетом целиком у Girl — случайность.
- Написаны 5 артефактов + отчёт: docs/rig_standard/
  MOHO_PRODUCTION_RIG_STANDARD_V1.md, MOHO_REFERENCE_RIG_DATABASE_V1.md,
  MOHO_RIG_MODULE_LIBRARY_V1.md, MOHO_RIG_DECISION_RULES_V1.md,
  MOHO_RIG_QA_STANDARD_V1.md, FINAL_REPORT_V1.md.
- PIR v1 (pipeline/pir/schema.py): добавлены Bone.is_dial, is_flexi_endpoint,
  flexi_pair, flexi_chain; Part.is_head_turn, head_turn_views, mask_layer_id;
  Rig.dial_links (DialLink). extract.py: авто-детект диалов, пар start/end,
  head-turn свитчей, сбор dial_links. emit.py: round-trip сохраняет всё.
- Round-trip 20/20: все эталоны проходят structural_audit после extract→emit.
- PIR v1 база: fixtures/rig_library/pir_v1/ (20 файлов), loader load_from_file.
- Ограничение честно зафиксировано: визуальные стресс-тесты поз диалов
  не выполнены (мост ленивый, screenshot с размерами роняет Moho).
  Структурная часть стандарта — доказана файлами; визуальная — ждёт мост.

## 2026-08-25 (ночь) — Генератор ригов v1 (riggen)

- binding_mode: extract сохраняет из источника, emit пишет обратно
  (был хардкод 2); новые сборки — дефолт 1 по стандарту. gramps=2→2,
  Girl/mannequin=1→1, audit PASS.
- emit: диалы без angle_channel теперь собираются (anim_angle из base+actions).
- pipeline/riggen/: skeleton.py (стандартное дерево 15 костей, конвенция
  координат auto_rig — проверена живым Moho), modules.py (make_image/switch/
  wire_dial + дословные константы Girl для HEAD_TURN: constraints −135..180°,
  9 углов, ступенчатый interp свитча im:0), build.py (спецификация → Rig).
- pipeline/tools/qa_check.py — секция 1 QA-стандарта: binding_mode, корни,
  диалы без actions, висячие связи, безымянные кости, части без кости.
  База эталонов: FAIL=0 WARN=20 (мультикорень и B-кости — WARN, не FAIL:
  referee/football_player/flet_devoka доказали валидность мультикорня).
- pipeline/examples/build_dial_demo.py → output/riggen/dial_demo.moho:
  скелет 16 костей + HEAD_TURN (2 синтетических вида красный/синий) +
  диал с картой Girl. qa PASS, round-trip audit PASS, ре-экстракция
  подтверждает: constraints/углы/карту/связь по имени.
- Ждёт живой приемки: открыть dial_demo.moho в Moho, повернуть диал
  Head Switch (красный↔синий через 8 позиций).

## 2026-08-25 (ночь, продолжение) — Gramps через riggen + CLI

- pipeline/riggen/psd.py: PSD → спецификация (экспорт PNG, суставы из
  bbox-геометрии, z-order эталонной схемы).
- output/riggen/gramps_std.moho: QA PASS; сверка со старым auto_rig —
  15/15 имён костей совпали, расхождений len/ang = 0 (две независимые
  сборки дали идентичный скелет).
- pipeline/tools/build_rig.py: CLI манифест→.moho с QA-гейтом
  (FAIL отменяет запись файла). Проверен на gramps_std.spec.json.
- Живой приёмке ждут: dial_demo.moho (диал↔свитч) и gramps_std.moho.

## 2026-08-26 — Авто-биндинг вскрыт, генератор уточнён

- ФАКТ: во всех тяжёлых продах ноль явных привязок. Girl/Dad/astronaft:
  362/294/474 арт-слоёв, все parent_bone=-1 при binding_mode=1 — Moho
  назначает влияние сам (радиус = strength кости). Явный parent_bone —
  путь туториалов (gramps, mode=2).
- Механизм смарт-каналов (mannequin): любой канал несёт actions
  [{name,pose{when,val}}] — так диалы двигают scale/angle/pos костей и
  switch_keys слоёв; bones_groups[].active_bone с actions = переключение
  IK-цели диалом. Кости-деформеры: hidden/shy/strength=0/ignored_by_ik.
- mannequin архитектура декодирована полностью: голова = SwitchLayer с
  8 группами-видами; Body Switch двигает anim_pos ключевых костей.
- Стандарт V1 §3 переписан: два режима биндинга + смарт-каналы.
- riggen: spec.binding.mode (1=авто без parent_bone, 2=явный, дефолт 2
  для растра); qa_check принимает оба режима, mode=2 без костей = WARN.
- dial_demo и gramps_std пересобраны (mode=2): QA PASS, сходимость
  скелетов 15/15 сохранена. Эталонная QA: FAIL=0 WARN=20.

## 2026-08-26 (продолжение) — flexi-пары, простые диалы, полные связи

- Формула флекси-пары из mannequin дословно: оба родителя = кость
  конечности; start pos=(0,0) ang=0; end pos=(0.85L,0) ang=π;
  strength=0/hidden/shy/ignored_by_ik у обоих. Внедрена в riggen
  (make_flexi_pair), поля Bone.hidden/shy/ignored_by_ik в PIR v1 + emit.
- Простые диалы: make_simple_dial (N состояний равномерно ±spread,
  constraints, ступенчатый interp свитча).
- build.py: spec.flexi (список костей) и spec.simple_switches.
- extract: dial_links теперь собирает ВСЕ диал→свитч связи (не только
  голову). Girl: 43 связи — сходится с форензикой один-в-один
  (jacket 11, Body 5, Eyes 5, Brows 5, Foot R/L 3+3, Mouth 3, Head 2...).
- output/riggen/modules_demo.moho: 25 костей (15 скелет + 8 flexi +
  Head Dial + Mouth Dial), 2 свитча; QA PASS; round-trip audit PASS.
- Полный регресс: round-trip 20/20 PASS, QA FAIL=0 WARN=20,
  pir_v1 база перегенерирована с полными связями.

## 2026-08-26 (вечер) — Понимание ртов, MOUTH v2

- Канон фонем найден: anim_ref.moho — свитч Mouth с 23 состояниями
  A..W/TH/Closed = родной алфавит липсинка Moho (аудиоанализ ставит ключи
  по именам состояний).
- Разборка лиц по 7 источникам: рот живёт внутри групп видов и существует
  только где виден (Girl: Front+3/4 R/L из 8); один диал двигает все виды
  сразу (одно имя экшена на всех свитчах лица); Dad закрывает стык челюсти
  маской на профилях; глаза Girl — 8 состояний, зрачок в рисунке.
- riggen v2 лица: wire_dial разделён на dial_ensure_action +
  switch_attach_action (общие диалы); head_turn строит группы-виды,
  face.mouth/eyes/brows вставляют свитчи в нужные виды; PHONEMES_FULL/
  PHONEMES_COMPACT константы.
- modules_demo пересобран: Front=череп+рот(Closed/A/O), Back=только череп;
  QA PASS, round-trip PASS, связи Head Switch + Mouth Switch подтверждены.
- docs/rig_standard/MOUTH_AND_FACE_STANDARD_V1.md — принципы + рецепт.

## 2026-08-26 (вечер, продолжение) — Канальные экшены + IK-группы

- Фиделити-дыра закрыта: mannequin терял при round-trip 6 из 23 смарт-
  каналов (anim_scale целиком, anim_pos с экшенами, bones_groups/active_bone).
  Теперь: Bone.scale_channel_raw / pos_channel_raw / extra_channels_raw
  (дословно), Rig.extras.bones_groups; extract+emit симметричны.
  Контроль: mannequin 23/23 PASS по типам каналов.
- riggen: spec.bone_actions — генерация ответных экшенов на каналах костей
  (scale/pos/angle) с авто-созданием диала. Демо: Body Squash
  (scale 1.0/0.75/1.25) + Head Turn Tilt (angle-ответ). QA PASS.
- qa_check уточнён: constraints требуем только у контроллеров
  (имя по схеме Switch/Dial/Rol/Bend/Squash/Order); ответные кости
  (Head с tilt-реакцией) не диалы.
- Регресс: raw-каналы 20/20, QA FAIL=0 WARN=20.

## 2026-08-26 (ночь) — Полный автогенератор: машина рисует сама

- pipeline/riggen/artgen.py — машинная отрисовка персонажа по правилам
  MOUTH_AND_FACE_STANDARD_V1: 8 видов головы из единой геометрической
  модели (профильные носы, сжатие черт по ракурсам, спина без лица),
  6 ртов-фонем, глаза 8 состояний × 5 видов, брови 4 × 5 видов, тело.
  Консистентность ракурсов гарантирована построением. face_visible
  соблюдён: лицо только на видах, где оно видно (принцип Girl).
- build.py: face-конфиг поддерживает states_by_view/centers_by_view —
  свой набор арта фичи на каждый вид (как Eye/Eye2/Eye3 у Girl), общий
  диал на все виды сохранён.
- pipeline/examples/build_autogen.py: арт → спека → риг → .moho без
  единого ручного файла. Результат output/riggen/autogen_char.moho:
  28 костей (15 скелет + 8 flexi + 5 диалов), 8 видов, 13 свитчей лица,
  14 связей, Body Squash. QA PASS, round-trip PASS.
- Контакт-лист: output/riggen/contact_sheet.png (проверен взглядом:
  профили, ракурсы, виземы читаемы; арт геометрически простой).
- Багфиксы: слэш в именах видов ("1/4") ломал пути — _safe()-санитизация;
  глаза/брови больше не рисуются для видов без лица.

## 2026-08-26 (ночь) — БАГ LIVE-ОТКРЫТИЯ НАЙДЕН И ПОЧИНЕН

- Симптом от пользователя: ни один сгенерированный .moho не открывался,
  ошибка «Could not open file. Type mismatch got int expected double».
- Рентген: сравнение типов всех числовых листьев наших файлов против
  union 20 эталонов. Виновник: origin.x/y групп видов — целые из спеки
  ([200,135]) писались в JSON как int; Moho требует double.
- Фикс в три слоя: emit._coerce_doubles (глобальная санитизация
  геометрии/каналов int→float, кроме String/Int каналов и известных
  int-полей), float-центры в build.view_part, литералы бисекта.
- Проверка: все 12 файлов (4 риггена + 8 бисект) ЧИСТЫ по int/double.
- Урок: статического round-trip недостаточно — типовая дисциплина JSON
  Moho строгая; чекер типов теперь часть инструментария.
