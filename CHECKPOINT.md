# CHECKPOINT — 2026-07-12 (V2 ADDENDUM UPDATE)

## Текущий результат

Завершён первый вертикальный этап и первая итерация требований V2 Addendum:

`MP4 → FFmpeg lossless frames → temporal cleanup → общая палитра → дедупликация → замкнутые векторные формы → анализ Problem Frames & Local Render Comparison → HarmonyReconstructionManifest V2.0 → безопасный Harmony Python DOM compiler`

На текущей машине путь реально проверен до валидированного манифеста и через MCP-инструмент в режиме dry-run. Реальное создание TVG в Harmony здесь не проверено: настроенный путь `/Applications/Harmony 25 Premium.app` отсутствует, `HARMONY_BIN` и `HARMONY_PYTHON_PACKAGES` не существуют. Поэтому нигде не выставлялось `realSceneCreated: true` для фактического запуска.

---

## Таблица статуса фич (Status Matrix v2.0)

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
| **Локальный Render Comparison** | Да | Реальный тест (`test_problems_and_versions.py`) | Нет |
| **Детекция Problem Frames** | Да | Реальный тест (`test_problems_and_versions.py`) | Нет |
| **RepresentationSegments** | Да | Реальный тест (`test_problems_and_versions.py`) | Нет |
| **artistModified & artistLocked** | Да | Реальный тест (`test_problems_and_versions.py`) | Нет |
| **Локальный refine_range** | Да | Реальный тест (`test_problems_and_versions.py`) | Нет |
| **Версионирование и откат (Rollback)** | Да | Реальный тест (`test_problems_and_versions.py`) | Нет |
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

## Что было сделано в этой итерации (V2 Addendum)

1. **Schema Versioning & Provenance**:
   - Манифест переведен на версию `2.0`.
   - Внедрен блок `provenance` с фиксацией параметров запуска конвейера и временной меткой.

2. **Confidence & Uncertainty**:
   - Добавлены поля `confidence` и `uncertaintyCategories` для рисунков, фигур и экспозиций.

3. **Problem Frames & Local Render Comparison**:
   - Внедрена локальная растеризация векторных кривых с помощью `cv2.fillPoly` и вычисление абсолютного расхождения.
   - Реализована детекция проблемных кадров (скачки числа контуров, потеря цветов, неустойчивый winding, высокая ошибка разницы, экстремальное движение).
   - Для каждого проблемного кадра сохраняются source, vector и difference PNG-превью в каталоге джобы.

4. **artistLocked & refine_range**:
   - Элементы, рисунки и палитры могут быть помечены как `artistLocked`.
   - Добавлен метод `local_refine_range`, перевекторизующий выбранный диапазон кадров с защитой заблокированных элементов.

5. **Версионирование и откат**:
   - История версий сохраняется в `versions.json`.
   - Доступен откат к любой сохраненной версии манифеста и планов команд через `rollback_to_version`.

6. **MCP-инструменты**:
   - `harmony.reconstruct.get_problem_frames`
   - `harmony.reconstruct.get_problem_frame`
   - `harmony.reconstruct.refine_range`
   - `harmony.reconstruct.lock_elements`
   - `harmony.reconstruct.unlock_elements`
   - `harmony.reconstruct.list_versions`
   - `harmony.reconstruct.rollback_version`

---

## Фактически выполненные проверки

```text
npm ci                              PASS (440 packages)
npm run build                       PASS
npm test -- --runInBand             PASS: 14 suites, 109 tests
npm run test:python                 PASS: 15 tests, 1 skipped
npm run demo:reconstruction         PASS
npm run reconstruction:prepare...   PASS (Пакет успешно собран)
HTTP /health                        PASS, FFmpeg/FFprobe/OpenCV ready, CUDA 0
HTTP ReconstructionClient           PASS
MCP tool handler dry-run            PASS
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
