# CHECKPOINT — 2026-07-12

## Текущий результат

Завершён первый вертикальный этап:

`MP4 → FFmpeg lossless frames → temporal cleanup → общая нормализованная палитра → temporal dedup → уникальные замкнутые векторные drawings → exposures → HarmonyReconstructionManifest → безопасный Harmony Python DOM compiler`

На текущей машине путь реально проверен до валидированного манифеста и через MCP-инструмент в режиме dry-run. Реальное создание TVG в Harmony здесь не проверено: настроенный путь `/Applications/Harmony 25 Premium.app` отсутствует, `HARMONY_BIN` и `HARMONY_PYTHON_PACKAGES` не существуют. Поэтому нигде не выставлялось `realSceneCreated: true` для фактического запуска.

---

## Таблица статуса фич (Status Matrix)

| Фича / Компонент | Реализована в коде? | Как проверена? | Нужна живая Harmony/Лицензия? |
| :--- | :---: | :---: | :---: |
| **Декодирование MP4 через FFmpeg** | Да | Реальный тест (`test_pipeline.py`) | Нет |
| **Извлечение кадров с таймингом** | Да | Реальный тест (`test_pipeline.py`) | Нет |
| **Сохранение альфа-канала** | Да | Реальный тест (`test_reconstruction_details.py`) | Нет |
| **Исключение прозрачных пикселей** | Да | Реальный тест (`test_reconstruction_details.py`) | Нет |
| **Временная дедупликация (ones/twos)** | Да | Реальный тест (`test_reconstruction_details.py`) | Нет |
| **Восстановление exposures/holds** | Да | Реальный тест (`test_reconstruction_details.py`) | Нет |
| **Глобальная кластеризация палитры** | Да | Реальный тест (`test_palette_vectorize.py`) | Нет |
| **Векторизация цветовых областей** | Да | Реальный тест (`test_palette_vectorize.py`) | Нет |
| **Поддержка внутренних контуров (holes)** | Да | Реальный тест (`test_reconstruction_details.py`) | Нет |
| **Обход контуров (winding directions)** | Да | Реальный тест (`test_reconstruction_details.py`) | Нет |
| **Генерация кубических кривых Безье** | Да | skipped / mock | Да (нативный `create_bezier_fit`) |
| **Line Art vs Colour Art** | Да | skipped / mock | Да (применение через DOM) |
| **HarmonyReconstructionManifest (Zod)** | Да | Реальный тест (`reconstruction.test.ts`) | Нет |
| **ReconstructionClient** | Да | Реальный тест (`reconstruction.test.ts`) | Нет |
| **MCP-инструменты** | Да | Реальный тест (`reconstruction.test.ts`) | Нет |
| **HarmonySceneCompiler (Command Plan)** | Да | Реальный тест (`reconstruction.test.ts`) | Нет |
| **Команды в `harmony_bridge.py`** | Да | skipped / mock | Да (выполнение планов в Harmony) |
| **Проверка DrawingAccess и BezierPath** | Да | skipped / mock | Да |
| **Dry-run режим** | Да | Реальный тест (`reconstruction.test.ts`) | Нет |
| **Защита путей (Path safety)** | Да | Реальный тест (`security.test.ts`) | Нет |
| **Портативный интеграционный пакет** | Да | Реальный тест (сборка пакета) | Нет |

---

## Что было сделано в текущей итерации

1. **Анализ прозрачности (RGBA) и палитры**:
   - Настроен OpenCV для считывания альфа-канала с `IMREAD_UNCHANGED`.
   - Настроена дедупликация и кластеризация палитры, игнорирующая прозрачные пиксели (`alpha < 127`).
   - Исправлен крэш OpenCV при обработке BGRA-изображений в расчёте сигнатур дедупликатора.

2. **Поддержка отверстий (Holes)**:
   - Внедрено сохранение иерархии внутренних контуров (`hierarchy[0][i][3] != -1`).
   - Настроено противоположное направление обхода (winding direction) для внешних контуров и отверстий.
   - Разработан локальный SVG-рендерер (`preview.py`) для контроля отверстий через правило `fill-rule="evenodd"`.

3. **HarmonyCommandPlan**:
   - Внедрена строгая Zod-схема для последовательного плана команд (`HarmonyCommandPlan`), исключающая свободный запуск Python-кода.
   - Реализована детерминированная компиляция в `HarmonySceneCompiler.ts` с проверкой порядка операций (сначала палитры, затем элементы, затем рисунки, пути и экспозиции).
   - В `harmony_bridge.py` добавлена виртуальная машина `execute_command_plan`, выполняющая операции пошагово.

4. **Интеграционный пакет для переноса**:
   - Реализована команда `npm run reconstruction:prepare-harmony-integration`.
   - Она автоматически собирает автономный пакет в `output/harmony-integration-package/`, включая манифест, сгенерированный план, мост `harmony_bridge.py`, пустую тестовую сцену, скрипт запуска `run_integration.py` и подробный README-чеклист для ручной проверки на целевой машине с Harmony.

5. **Исключение ложных статусов успеха**:
   - В случае отсутствия Harmony на Mac, MCP-инструменты `video_to_editable_scene` и `apply_manifest` больше не кидают ошибку или ложный `success`. Вместо этого возвращается статус `ready_for_external_harmony_integration` со всеми промежуточными результатами.

---

## Фактически выполненные проверки

```text
npm ci                              PASS (440 packages)
npm run build                       PASS
npm test -- --runInBand             PASS: 14 suites, 107 tests
npm run test:python                 PASS: 10 tests, 1 skipped
npm run demo:reconstruction         PASS
npm run reconstruction:prepare...   PASS (Пакет успешно собран)
HTTP /health                        PASS, FFmpeg/FFprobe/OpenCV ready, CUDA 0
HTTP ReconstructionClient           PASS
MCP tool handler dry-run            PASS
Pydantic manifest → Zod manifest    PASS
```

## Главные ограничения

1. Применение bridge-кода не запускалось в лицензированной Harmony на этой машине разработки из-за отсутствия лицензии и ПО.
2. Локальный просмотр геометрии без Harmony выполняется с помощью сгенерированных SVG-превью в кэше заданий.

## Точная команда запуска на машине разработки

```bash
cd /Users/romanmolodyko/Documents/toon-boom-harmony-mcp
npm ci
npm run build
python3.9 -m venv .venv-reconstruction
.venv-reconstruction/bin/pip install -r services/reconstruction-core/requirements.lock
.venv-reconstruction/bin/pip install -e services/reconstruction-core --no-deps
npm test -- --runInBand
.venv-reconstruction/bin/pytest services/reconstruction-core/tests -v
npm run reconstruction:prepare-harmony-integration
```
