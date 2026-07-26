# Реконструкция видео в редактируемую сцену Harmony

## Что работает сейчас

Рабочий режим `frame_by_frame_vector` выполняет такой путь:

`MP4 → lossless PNG → temporal cleanup → общая палитра → дедупликация → замкнутые векторные формы → HarmonyReconstructionManifest → TVG Drawing Element → exposures`

Python core работает отдельным процессом. Он не загружает OpenCV и кадры в Node.js. Большие файлы остаются в `RECONSTRUCTION_CACHE_ROOT`; MCP возвращает только статус, метрики и пути.

Готовый JSON-манифест не считается готовой сценой. Поле `realSceneCreated: true` появляется только после того, как Harmony Python DOM сохранил сцену, повторно открыл её, подтвердил TVG element, непустые drawings, палитру, exposures, READ/Composite/Display/Write и создал настоящий preview render.

## Установка

Нужны Node.js 20+, Python 3.9–3.12 и FFmpeg. Для базового CPU-пути CUDA не нужна.

```bash
npm ci
npm run build
python3.9 -m venv .venv-reconstruction
.venv-reconstruction/bin/pip install -r services/reconstruction-core/requirements.lock
.venv-reconstruction/bin/pip install -e services/reconstruction-core --no-deps
```

Запуск core и MCP в разных терминалах:

```bash
npm run reconstruction:core
npm start
```

Для удалённого core задайте `RECONSTRUCTION_CORE_URL` у MCP. Пути `videoPath` и `manifestPath` должны указывать на одно и то же контролируемое shared storage на обеих машинах; передача больших кадров через MCP намеренно не реализована.

Проверка core:

```bash
curl http://127.0.0.1:8765/health
```

## Пример MCP

Сначала безопасный полный dry-run. Он действительно декодирует видео и создаёт валидный манифест, но не меняет Harmony:

```json
{
  "name": "harmony.reconstruct.video_to_editable_scene",
  "arguments": {
    "videoPath": "/allowed/input/shot.mp4",
    "mode": "frame_by_frame_vector",
    "maxColors": 12,
    "maxPointsPerShape": 120,
    "dedupThreshold": 0.035,
    "cleanupProfile": "production_cleanup",
    "dryRun": true
  }
}
```

Для настоящего применения нужна существующая тестовая `.xstage` и отдельный новый каталог результата. Исходная сцена не меняется:

```json
{
  "name": "harmony.reconstruct.video_to_editable_scene",
  "arguments": {
    "videoPath": "/allowed/input/shot.mp4",
    "targetProjectPath": "/allowed/base/empty_scene.xstage",
    "outputProjectPath": "/allowed/output/shot_v001/shot_v001.xstage",
    "mode": "frame_by_frame_vector",
    "dryRun": false,
    "confirm": true,
    "confirmationText": "Я понимаю, что это действие изменит базу данных Harmony"
  }
}
```

Выходной каталог должен отсутствовать или быть пустым. Компилятор копирует `.xstage`, `elements`, `palette-library` и `audio`, затем работает только с копией.

## Проверка на машине с Harmony

```bash
export HARMONY_PYTHON_PACKAGES="/path/to/Harmony/python-packages"
export HARMONY_INTEGRATION_SCENE="/allowed/test-copy/scene.xstage"
export HARMONY_INTEGRATION_MANIFEST="/allowed/cache/job/manifest.json"
export HARMONY_INTEGRATION_OUTPUT="/allowed/output/integration/scene.xstage"
npm run reconstruction:core
```

В другом терминале с теми же переменными:

```bash
npm run test:harmony-integration
# либо тот же harness через pytest:
npm run test:python -- -m integration
```

Harness сначала получает capability matrix через `detect`, затем применяет манифест к безопасной копии, повторно открывает сцену, проверяет нативные drawings, палитру, exposures и связи нод. После этого документированный `HarmonyRenderHandler` создаёт 1–3 PNG через callback rendered Cel, а reconstruction core проверяет сигнатуру, размеры и простые метрики различия. Интеграционный pytest пропускается, если переменные не заданы. Это не фиктивный успех: без установленной и лицензированной Harmony нативный TVG не считается проверенным.

Минимально требуемые возможности установленной версии: `session`, `open_project`, `close_project`, `DrawingAccess`, `BezierPath`, `DrawingVectorColour` и `project.create_render_handler`. Фактические версия продукта, путь приложения, версия Python и доступность каждого API печатаются в JSON результата. `ExportOGLFramesSettings` не используется внешним harness, потому что официальная документация ограничивает OGL export внутренним Python процессом Harmony.

## Безопасность

- Все пути MCP проходят `HARMONY_ALLOWED_ROOTS`, проверку границ каталога и реальных путей символических ссылок.
- Исходное видео нельзя использовать как выходной проект.
- Core запускает FFmpeg только массивом аргументов. Путь к бинарнику берётся из настроенного окружения сервиса, а не из MCP-запроса.
- Манифест валидируется Pydantic и Zod. Harmony bridge принимает только фиксированную команду и типизированные данные; произвольный Python или QtScript запрещён.
- Реальное применение требует глобального `HARMONY_ALLOW_DESTRUCTIVE=true` и точной фразы подтверждения.
- На macOS перед загрузкой Harmony Python packages выполняется Gatekeeper assessment. Bundle с недействительной или сторонней подписью отклоняется без запуска executable.

## Ограничения

- Гарантирован только `frame_by_frame_vector` для простых 2D-роликов с плоскими цветами и чёткими контурами.
- Цветовые области создаются в Colour Art как замкнутые формы. Центровые Line Art strokes пока не восстанавливаются.
- Отверстия внутри сложных форм и прозрачный фон обрабатываются ограниченно.
- `clean_frame_by_frame`, `hybrid` и `clean_rig` намеренно возвращают `UNSUPPORTED_BY_VERSION`, пока базовый путь не проверен в настоящей Harmony.
- Preview render и простое сравнение реализованы, но считаются доказательством только после настоящего запуска в лицензированной Harmony.

## Решение проблем

- `FFmpeg не найден`: установите `ffmpeg` и задайте `FFMPEG_PATH`/`FFPROBE_PATH` в окружении Python core.
- `RECONSTRUCTION_CORE_UNAVAILABLE`: запустите `npm run reconstruction:core` и проверьте `RECONSTRUCTION_CORE_URL`.
- `PYTHON_API_UNAVAILABLE`: задайте `HARMONY_PYTHON_PACKAGES` от установленной Harmony.
- Ошибка лицензии Harmony: исправьте лицензию; система не переключится в mock и не объявит сцену готовой.
- GPU отсутствует: это нормально для текущего CPU-пути. `/health` покажет `cudaDeviceCount: 0`.
