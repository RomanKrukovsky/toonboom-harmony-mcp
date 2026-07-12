# CHECKPOINT — 2026-07-12 (V2 ADDENDUM UPDATE — TEMPORAL FIDELITY)

## Текущий результат

Завершён аудит точности движения и реализована вторая итерация требований V2 Addendum (Temporal Fidelity & ReconstructionHypothesisManager):

`MP4 → key-pose protection deduplication → foreground-aware & temporal metrics → hard constraints validation → HTML comparison report`

В ходе аудита было установлено, что прошлая реализация дедупликатора для гипотезы `compact_frame_by_frame` "срезала углы" (cheating): она сокращала число уникальных рисунков с 3 до 1, полностью останавливая движение объекта на экране. Обычная средняя ошибка по кадру (`meanPixelDifference`) не детектировала эту потерю движения, так как площадь объекта составляет всего **11.3%** от площади кадра, и ошибка маскировалась статичным фоном. 

Для исправления этого:
1. Реализована система **Key-Pose Protection**, запрещающая слияние кадров при изменении положения центроида (>1.5 px), площади переднего плана (>15%) или низком IoU силуэтов (<0.85).
2. Внедрены 8 пространственных метрик переднего плана (foreground-aware) и 8 временных метрик (temporal fidelity), включая автовычисление траектории, скорости, ускорения и количества потерянных движений (`numberOfLostMotionEvents`).
3. Менеджер рекомендаций (`compare_hypotheses`) переведён на жесткие ограничения (Hard Constraints). Варианты, теряющие движение, автоматически отбраковываются (`eligible = False`, статус `FAILED`) и штрафуются.

---

## Таблица статуса фич (Status Matrix v2.0)

| Фича / Компонент | Реализована в коде? | Как проверена? | Нужна живая Harmony/Лицензия? |
| :--- | :---: | :---: | :---: |
| **Декодирование MP4 через FFmpeg** | Да | Реальный тест (`test_pipeline.py`) | Нет |
| **Извлечение кадров с таймингом** | Да | Реальный тест (`test_pipeline.py`) | Нет |
| **Сохранение альфа-канала** | Да | Реальный тест (`test_reconstruction_details.py`) | Нет |
| **Временная дедупликация (ones/twos)** | Да | Реальный тест (`test_reconstruction_details.py`) | Нет |
| **Векторизация и палитры** | Да | Реальный тест (`test_palette_vectorize.py`) | Нет |
| **Менеджер гипотез (HypothesisManager)** | Да | Тест (`test_hypotheses.py`) | Нет |
| **Метрики переднего плана (Foreground)** | Да | Тест (`test_synthetic_temporal_fidelity_cases`) | Нет |
| **Временные метрики (Temporal Fidelity)** | Да | Тест (`test_synthetic_temporal_fidelity_cases`) | Нет |
| **Защита ключевых поз (Key-Pose Protection)** | Да | Тест (`test_synthetic_temporal_fidelity_cases`) | Нет |
| **Проверка жестких ограничений (Hard Constraints)** | Да | Тест (`test_synthetic_temporal_fidelity_cases`) | Нет |
| **Интерактивный HTML-отчёт сравнения** | Да | Генерация `comparison_report.html` в демо | Нет |
| **RepresentationSegments & Версионирование** | Да | Тест (`test_problems_and_versions.py`) | Нет |
| **Портативный интеграционный пакет** | Да | Сборка всех вариантов в zip/папку | Нет |

---

## Что было сделано в этой итерации (V2 Addendum — Temporal Fidelity)

1. **Разработка метрик переднего плана (Foreground-Aware)**:
   - Внедрен автодетектор цвета фона по периметру кадра.
   - Вычисляются: `fullFrameMeanError`, `foregroundMeanError`, `silhouetteIoU`, `contourDistance`, `centroidError`, `boundingBoxError`, `areaError`.

2. **Разработка временных метрик (Temporal Fidelity)**:
   - Вычисляются траектории, скорость и ускорение центроидов.
   - Внедрены: `frameDifferencePreservation`, `opticalFlowConsistency` (CPU fallback), `frozenMotionRatio` и `numberOfLostMotionEvents` (детекция застывания анимации).

3. **Key-Pose Protection**:
   - В `deduplicate` добавлен анализ сдвига центроидов, площадей и пересечения силуэтов. При значительных изменениях дедупликация жестко блокируется, сохраняя уникальный `drawing`.

4. **Система жестких ограничений (Hard Constraints)**:
   - В `compare_hypotheses` добавлены проверки: `silhouetteIoU >= 0.80`, `foregroundMeanError <= 25.0`, `centroidTrajectoryError <= 4.0 px`, `numberOfLostMotionEvents == 0`.
   - Не соответствующие требованиям гипотезы получают статус `FAILED` и не рекомендуются.

5. **Обновление HTML-отчёта и Демо**:
   - Отчёт `comparison_report.html` теперь отображает детальные метрики точности, статусы ограничений и причины отклонения (подсвечиваются красным).
   - Демо-отчёт выводит траектории и lost-motion аудит. Для `moving_shape.mp4` гипотеза `compact` теперь корректно сохраняет все 3 фазы движения и проходит тесты.

---

## Фактически выполненные проверки

```text
npm ci                              PASS (440 packages)
npm run build                       PASS
npm test -- --runInBand             PASS: 14 suites, 109 tests
.venv-reconstruction pytest          PASS: 18 tests, 1 skipped
npm run demo:reconstruction         PASS
npm run reconstruction:prepare...   PASS (Пакет успешно собран со всеми гипотезами)
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
npm run demo:reconstruction
npm run reconstruction:prepare-harmony-integration
```
