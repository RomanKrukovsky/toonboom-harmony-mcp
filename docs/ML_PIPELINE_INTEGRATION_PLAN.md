# ML Pipeline Integration Plan

## 1. Какие модели уже реально интегрированы
Анализ текущей кодовой базы (в частности `src/schemas/ml.ts`, `src/adapters/harmonyPython.ts`, `src/tools/mlTools.ts`) показывает, что **полноценной end-to-end интеграции SOTA ML моделей (таких как See-through, SAM 2, DWPose, MotionGPT, EMAGE) в изолированном Python-рантайме на данный момент нет**. Существующий `harmony_bridge.py` работает как мост к Toon Boom Harmony, но не содержит встроенных ML-провайдеров. Присутствуют лишь схемы манифестов `ml.ts` (VideoPerception, Segmentation, PointTracking) и заглушки инструментов, которые симулируют выполнение.

## 2. Какие инструменты существуют только как заглушки (Stubs)
Инструменты из файлов `src/tools/mlTools.ts`, `src/tools/riggingEngineTools.ts`, `src/tools/actingEngineTools.ts`, `src/tools/audioEngineTools.ts` и `src/tools/modelRouterTools.ts` в большинстве своём являются заглушками. Они принимают параметры, формируют стандартный `ExecutionResult` со статусом `simulation_success`, но реальный inference не запускают, возвращая фиктивный (симулированный) PIR или JSON. 

В частности, заглушками являются инструменты, связанные с:
- `harmony.ml.decompose_character`
- `harmony.ml.segment_assets`
- `harmony.ml.estimate_skeleton`
- `harmony.ml.generate_body_motion`
- `harmony.ml.generate_speech_performance`
- `harmony.ml.align_phonemes`
- `harmony.ml.generate_line_inbetweens`

## 3. Какие модели требуют GPU
- **Grounded SAM 2** / **SAM 2.1**: Строго рекомендуется GPU (CUDA/MPS) для приемлемой скорости сегментации и инференса.
- **DWPose**: Требует GPU (CUDA/MPS) для работы в реальном времени.
- **MotionGPT**: Может работать на CPU (при малых батчах), но GPU ускоряет инференс.
- **EMAGE / PantoMatrix**: Требует CUDA (GPU) для тяжеловесной генерации мимики и жестов из аудио.
- **AnimeInbet / ToonCrafter**: Строго требует мощного GPU (CUDA/MPS) для диффузионной/графовой генерации.
- *Rhubarb* работает на CPU (С/C++ binary).
- *See-through* (single image decomposition) требует GPU для инпаинтинга.

## 4. Какие лицензии допускают коммерческое использование
- **See-through**: Код может быть MIT/Apache, но веса часто Research Only (CC-BY-NC). Требуется проверка лицензии авторов.
- **SAM 2.1 (Meta)**: Лицензия Apache 2.0, допускает коммерческое использование.
- **DWPose**: Код Apache 2.0 / MIT, допускает коммерческое использование.
- **MotionGPT**: Нужно проверять (часто исследовательские модели на базе AMASS/HumanML3D имеют строгое ограничение NC - Non-Commercial).
- **EMAGE / PantoMatrix**: Аналогично, модели обученные на BEAT2 могут наследовать академические ограничения.
- **AnimeInbet**: Академическая лицензия (NC).
- **Rhubarb Lip Sync**: MIT, коммерческое использование разрешено.
- **MFA (Montreal Forced Aligner)**: MIT, коммерческое использование разрешено.

## 5. Какие модели работают локально
Все вышеперечисленные модели (See-through, SAM 2, DWPose, MotionGPT, EMAGE, AnimeInbet, Rhubarb, MFA) предназначены для локального запуска (self-hosted). Они не требуют внешних платных API при условии наличия необходимых GPU/CPU ресурсов.

## 6. Какие требуют внешнего API
В базовой архитектуре внешние API для ML-моделей не требуются, так как создается локальный Python-рантайм `services/ml-runtime/`. Однако, модели маршрутизации (LLM Director, Scene Planner) работают через внешние API (Gemini/OpenAI/Anthropic).

## 7. Форматы входов и выходов
Каждый ML Provider должен подчиняться единому `MlExecutionContext`.
- **See-through**: Вход (Image PNG) -> Выход (Layered PSD, PNG masks, bounding boxes).
- **SAM 2**: Вход (Image + Text prompts/Coords) -> Выход (Binary masks).
- **DWPose**: Вход (Image/Video) -> Выход (2D/3D JSON Keypoints).
- **MotionGPT**: Вход (Text prompt) -> Выход (Motion sequences BVH/JSON/SMPL).
- **EMAGE**: Вход (Audio + Transcript) -> Выход (Gestures/Facial parameters in JSON).
- **Rhubarb**: Вход (Audio) -> Выход (TSV/JSON mouth shapes timelines).
- **AnimeInbet**: Вход (2 Keyframes) -> Выход (Raster frames).

Единый выходной контракт (`StandardExecutionResult` / `mlJobResponseSchema`):
```json
{
  "jobId": "...",
  "status": "success | partial_success | blocked | unsupported",
  "realInferenceExecuted": true,
  "outputArtifacts": [],
  "pirArtifacts": [],
  "confidence": 0.0
}
```

## 8. Как результаты преобразуются в PIR
ML-выходы нормализуются в строгие TypeScript-схемы (PIR), описанные в `src/schemas/pirV1.ts` и `src/schemas/ml.ts`:
- **See-through / SAM 2** -> Нормализатор -> `CharacterDecompositionPIR`
- **DWPose + Topology Ontology** -> Pivot Estimator -> `CharacterTopologyPIR`
- **Template Matching** -> Rig Template Builder -> `RigPIR`
- **MotionGPT / EMAGE** -> 2D Retargeter -> `PerformancePIR`
- **Rhubarb / MFA** -> Viseme Mapper -> `LipSyncPIR`

## 9. Какие этапы требуют Harmony
Harmony требуется исключительно для компиляции PIR в реальные ноды и проверки физического результата:
- Компиляция `RigPIR` -> Создание `.xstage` с Pegs, Deformers, Drawings, Cutters.
- Компиляция `PerformancePIR` -> Применение ключей на Timeline, замена экспозиций.
- Рендеринг (Playblast/Write node) для визуального QA.
- Запись Retake Session (`v1_before` и `v2_after`).

## 10. Какие этапы можно проверить offline
Offline (без запущенного Toon Boom Harmony) можно проверять весь конвейер вплоть до компиляции PIR:
- Разложение изображения, создание масок и скелета.
- Преобразование данных в `RigPIR`, `PerformancePIR`, `LipSyncPIR`.
- Валидация Zod-схем сгенерированных PIR артефактов.
- Генерация Harmony Command Plan (сухой прогон скриптов).
- Сравнение диффов (`ScenePatch`) между двумя Snapshot JSON.

## 11. Какие риски качества существуют
- Ошибки классификатора топологии (неправильно сопоставлены руки/ноги аниме-персонажа).
- Неверно вычисленные Pivot Points (DWPose выдает анатомический сустав, а риг требует сдвига для идеального перекрытия Autopatch).
- Конфликт моделей: MotionGPT двигает тело, EMAGE двигает тело — требуется сложный `performanceFusion`.
- Специфика стилизации: See-through обучен на аниме, может плохо работать с западным flat-design.
- OOM (Out Of Memory) на GPU при одновременной загрузке SAM 2 и диффузионных моделей.
- Отсутствие коммерческих лицензий для части моделей.

## 12. Порядок реализации (Roadmap)
1. **Фаза 1**: Создание `services/ml-runtime/` (Python), базовых провайдеров (`ProviderRegistry`), единых контрактов обмена данными и TypeScript ML Orchestrator. Разделение `simulation` и `real`.
2. **Фаза 2 (Decomposition & Segmentation)**: Интеграция See-through, SAM 2, Grounded SAM 2, DWPose. Определение масок и скелета. Формирование `CharacterTopologyPIR`.
3. **Фаза 3 (Auto-Rigging)**: Разработка `topologyRouter`, `pivotEstimator`, шаблонов ригов. Компиляция `RigPIR` в Harmony Node Graph.
4. **Фаза 4 (Performance & 2D Retargeting)**: Интеграция MotionGPT, EMAGE. Разработка 2D Retargeter и модуля `performanceFusion`.
5. **Фаза 5 (Lip-Sync)**: Интеграция Rhubarb/MFA. Отработка `LipSyncPIR` на подменах (drawing substitutions).
6. **Фаза 6 (In-betweening)**: Интеграция AnimeInbet. Пайплайн векторизации.
7. **Фаза 7 (Retake Engine)**: Реализация `Scene Diff Engine`, снимки состояний `v1_before` и `v2_after`, сбор датасета (Retrieval-first).
