# MCP ML PERCEPTION STACK — MASTER INSTALLATION & INTEGRATION PROMPT

## Роль

Ты — senior ML/platform engineer, computer-vision engineer, Python/TypeScript architect и технический руководитель проекта `toonboom-harmony-mcp`.

Твоя задача — провести аудит репозитория, установить реально работоспособный набор ML-моделей и датасетов, создать отдельный ML-сервис и полноценно подключить его к существующему MCP-серверу.

Главный принцип архитектуры:

```text
ChatGPT / Codex / другой внешний MCP-клиент
= рассуждение, режиссура и оркестрация

Локальные ML-модели
= техническое восприятие видео, изображения и звука

Детерминированная математика проекта
= геометрия, IK, factorization, key reduction, fidelity

Harmony compiler / bridge
= создание редактируемой структуры Toon Boom Harmony
```

Не устанавливай локальную LLM или VLM вроде Qwen для рассуждений. Она не нужна в основном pipeline. Внешняя нейросеть будет вызывать MCP-инструменты и получать строгий JSON.

Не ограничивайся планом, интерфейсами или mock-реализацией. Установи доступные компоненты, скачай подходящие checkpoints и небольшие воспроизводимые датасетные samples, запусти реальный end-to-end demo и добавь интеграционные тесты.

---

# 0. Обязательный контекст и аудит

Сначала полностью прочитай:

1. `HARMONY_VIDEO_RECONSTRUCTION_TASK.md`
2. `HARMONY_NEURAL_RECONSTRUCTION_V2_ADDENDUM.md`
3. `AI_ANIMATION_STUDIO_MASTER_IMPLEMENTATION_PROMPT.md`
4. `DATASET_AND_ML_INTEGRATION_IMPLEMENTATION_PROMPT.md`, если файл существует
5. `CHECKPOINT.md`
6. `README.md`
7. весь `src/`
8. весь `services/reconstruction-core/`
9. текущие schemas, MCP tools, FastAPI endpoints, tests, demos
10. Motion Factorization
11. Motion Retargeting
12. Scene Intelligence
13. HarmonyCommandPlan и `harmony_bridge.py`

Выполни:

```bash
git status
git branch --show-current
git log --oneline --decorate --graph -30
git diff
npm run build
npm test -- --runInBand
.venv-reconstruction/bin/pytest services/reconstruction-core/tests -v
```

Не доверяй предыдущим walkthrough без проверки кода.

Создай baseline-таблицу:

| Компонент | Реальный код | Реальный inference | Synthetic-only | Mock-only | Нужна Harmony |
|---|---:|---:|---:|---:|---:|

Не удаляй и не перезаписывай существующие реализации. Все новые модули должны интегрироваться без regression.

---

# 1. Hardware & Environment Audit

Перед установкой автоматически определи:

- macOS / Linux / Windows;
- Apple Silicon или Intel Mac;
- модель CPU;
- доступную RAM;
- свободное место;
- наличие NVIDIA GPU;
- CUDA version;
- доступность Apple MPS;
- доступность ONNX Runtime CoreML;
- Python versions;
- Node.js version;
- Homebrew;
- ffmpeg / ffprobe;
- git-lfs;
- uv;
- micromamba / conda;
- cmake;
- ninja;
- rust toolchain при необходимости.

Создай:

```text
scripts/ml_detect_system.py
output/ml_setup/system_report.json
output/ml_setup/system_report.html
```

Тип:

```text
MLHardwareProfile
```

Пример:

```json
{
  "os": "macos",
  "architecture": "arm64",
  "appleSilicon": true,
  "mpsAvailable": true,
  "cudaAvailable": false,
  "onnxProviders": ["CoreMLExecutionProvider", "CPUExecutionProvider"],
  "ramGb": 32,
  "freeDiskGb": 180,
  "recommendedProfile": "apple_silicon_balanced"
}
```

Не предполагай CUDA на Mac.

---

# 2. Профили исполнения

Поддержи четыре профиля:

## `apple_silicon_balanced`

- MediaPipe;
- RTMPose/RTMW через ONNX Runtime;
- CoreML EP, если реально доступен;
- SAM 2 через MPS, только если smoke test проходит;
- иначе SAM 2 CPU или remote provider;
- OpenCV KLT fallback;
- Whisper через наиболее стабильный локальный backend;
- MFA в отдельном micromamba environment.

## `cpu_portable`

- MediaPipe;
- RTMPose ONNX CPU;
- OpenCV KLT;
- lightweight segmentation fallback;
- Whisper small/base;
- все тяжёлые providers optional.

## `nvidia_cuda`

- SAM 2.1 CUDA;
- RTMPose;
- TAPIR или CoTracker;
- Cutie;
- Whisper;
- batch inference;
- mixed precision.

## `remote_gpu_worker`

Локальный MCP вызывает отдельный ML worker по HTTP.

Нужны:

- API token;
- timeout;
- retries;
- request checksum;
- resumable jobs;
- no raw paths outside allowlist;
- local/remote provider parity.

---

# 3. Изоляция окружений

Не устанавливай всё в одно Python-окружение.

Создай:

```text
.venv-ml-core/
.venv-ml-torch/
.venv-ml-jax/          # только если реально нужен TAPIR JAX
.envs/mfa/             # micromamba environment
```

Рекомендуемая схема:

- `uv` — основной Python dependency manager;
- `micromamba` — только для MFA и конфликтующих бинарных зависимостей;
- pinned lockfiles;
- hashes;
- отдельные requirements по профилям.

Добавь:

```text
services/ml-core/pyproject.toml
services/ml-core/uv.lock
services/ml-core/requirements/base.txt
services/ml-core/requirements/apple-silicon.txt
services/ml-core/requirements/cpu.txt
services/ml-core/requirements/cuda.txt
scripts/install_ml_stack.sh
scripts/install_ml_stack.ps1
scripts/verify_ml_stack.py
```

Скрипт должен быть:

- idempotent;
- resumable;
- без `sudo`, если это возможно;
- без опасного shell interpolation;
- с понятным логом;
- с exit code;
- с dry-run;
- с выбором профиля.

Пример:

```bash
./scripts/install_ml_stack.sh \
  --profile auto \
  --download-models \
  --dataset-budget-gb 20 \
  --run-smoke-tests
```

---

# 4. Основной набор моделей

## 4.1. Video/Image Segmentation

### Primary: SAM 2.1

Назначение:

- маска персонажа;
- маска объекта;
- маска части тела;
- video propagation;
- occlusion handling;
- persistent object IDs.

Создай provider:

```text
SAM2VideoSegmentationProvider
```

Поддержи несколько checkpoint sizes:

- tiny/small — default для Mac;
- base-plus;
- large — только для подходящего GPU.

Проверь реальным inference smoke test:

```text
image + point prompt → mask
short video + first-frame mask → propagated masks
```

Если MPS вызывает ошибку или даёт некорректный результат:

1. не скрывай ошибку;
2. пометь backend `unavailable`;
3. попробуй CPU;
4. предложи remote GPU provider;
5. не возвращай пустую маску как success.

### Optional: Grounding DINO

Назначение:

- текстовый запрос `person`, `left hand`, `guitar`, `chair`;
- bounding boxes для SAM 2.

Provider:

```text
GroundingDetectorProvider
```

На Mac установка optional. Если CUDA extension или сборка не поддерживаются, MCP должен позволять:

- ручной box/point prompt;
- внешний detector provider;
- MediaPipe-derived boxes.

Grounding DINO не должен блокировать весь pipeline.

### Long-term VOS: Cutie

Provider:

```text
CutieMaskTrackingProvider
```

Использовать, если он реально устанавливается и проходит smoke test.

Поскольку официальный проект в первую очередь тестировался на Ubuntu, на macOS не выдавай наличие файлов за рабочий inference. При неудаче:

- оставить adapter;
- поставить статус `installed_unverified` или `unavailable`;
- использовать SAM 2 video predictor;
- не ломать pipeline.

### Fallback

```text
OpenCVGrabCutProvider
ColorRegionSegmentationProvider
```

Fallback нужен для тестов и воспроизводимости, но не должен называться AI-segmentation.

---

## 4.2. Pose Estimation

### Baseline: MediaPipe Pose Landmarker

Provider:

```text
MediaPipePoseProvider
```

Использовать для:

- 33 body landmarks;
- world coordinates, если доступны;
- confidence;
- быстрый CPU inference;
- Motion Retargeting.

Обязательно сделать реальный путь:

```text
MP4 → frames → MediaPipe → PoseSequence
```

Не подменять MP4 заранее подготовленным JSON.

### Primary enhanced pose: RTMPose / RTMW through ONNX

Использовать `rtmlib` или официальный MMPose/MMDeploy ONNX export, выбрав реально стабильный вариант для машины.

Provider:

```text
RTMPoseOnnxProvider
RTMWWholeBodyProvider
```

Назначение:

- multi-person;
- body;
- hands;
- face;
- whole-body landmarks;
- higher-quality tracking observations.

Backend priority:

```text
CoreMLExecutionProvider
→ CUDAExecutionProvider
→ CPUExecutionProvider
```

Но выбирай только после реального benchmark, а не по наличию строки в списке providers.

---

## 4.3. Point Tracking

### Primary high-quality: TAPIR

Provider:

```text
TAPIRPointTrackingProvider
```

Использовать официальный checkpoint и официальный код, если он запускается.

Поддержи:

- offline mode;
- query points;
- visibility;
- occlusion;
- confidence;
- chunked long-video inference.

На Mac, если JAX backend нестабилен:

- CPU mode;
- отдельный isolated environment;
- либо optional remote GPU;
- pipeline не должен падать полностью.

### Optional: CoTracker3

Provider:

```text
CoTrackerPointTrackingProvider
```

Установить только как optional backend.

Провести реальный smoke test. Не считать import доказательством работы.

### Deterministic fallback: OpenCV KLT

Provider:

```text
OpenCVKLTPointTrackingProvider
```

Использовать для:

- быстрых тестов;
- fallback;
- сравнения ML tracker vs classical tracker.

---

## 4.4. Audio & Speech

### Transcription

Provider:

```text
WhisperTranscriptionProvider
```

Выбрать backend автоматически:

- `openai-whisper`;
- либо `whisper.cpp` на Apple Silicon;
- либо remote provider.

Режимы:

- tiny/base для smoke tests;
- small/medium для production baseline;
- язык auto или заданный;
- word timestamps;
- confidence;
- no fake transcript.

### Forced Alignment

Provider:

```text
MFAForcedAlignmentProvider
```

Установить MFA в отдельное micromamba environment.

Поддержать:

- Russian;
- English;
- automatic model download only after listing exact model;
- transcript normalization;
- word intervals;
- phoneme intervals;
- failure report;
- fallback на word-level timestamps Whisper.

Не возвращать эвристический syllable split как forced alignment.

### Acoustic features

Без отдельной тяжёлой модели вычислять:

- energy;
- pitch;
- pauses;
- speech rate;
- accent peaks;
- breath-like silence candidates.

Provider:

```text
AcousticFeatureProvider
```

---

## 4.5. Embeddings and Retrieval

Локальная LLM не нужна, но нужен поиск по датасету.

Добавь:

```text
VisualEmbeddingProvider
TextEmbeddingProvider
```

Допустимые реализации:

- OpenCLIP/SigLIP для визуального сходства;
- sentence-transformers для текстовых metadata;
- либо remote embeddings provider.

Использовать Qdrant local mode или существующий vector index проекта.

Не выдавать embedding similarity за художественное понимание.

---

# 5. Model Registry

Создай:

```text
services/ml-core/ml_core/model_registry.py
data/models/registry/models.parquet
data/models/checkpoints/
data/models/cache/
```

Типы:

```text
ModelDefinition
ModelCheckpoint
ModelInstallStatus
ModelRuntimeStatus
ModelBenchmark
ModelProvenance
```

Обязательные поля:

```json
{
  "modelId": "sam2.1_hiera_small",
  "provider": "sam2",
  "task": "video_segmentation",
  "sourceRevision": "...",
  "checkpointPath": "...",
  "checkpointSha256": "...",
  "backend": "mps",
  "precision": "float32",
  "installed": true,
  "importVerified": true,
  "inferenceVerified": true,
  "averageLatencyMs": 0,
  "peakMemoryMb": 0,
  "lastVerifiedAt": "...",
  "status": "ready"
}
```

Допустимые статусы:

- `not_installed`;
- `downloading`;
- `installed_unverified`;
- `ready`;
- `degraded`;
- `unavailable`;
- `failed`.

Никогда не ставь `ready` после одного успешного import.

---

# 6. Dataset Stack

Создай Dataset Registry и adapters.

## Small datasets / samples, которые нужно реально подключить

### Cartoon Set

Для:

- facial component experiments;
- color/component retrieval;
- identity consistency fixtures.

Скачать небольшой sample, не обязательно весь набор.

### TAP-Vid small subset

Для:

- point tracking benchmark;
- visibility;
- occlusion.

### DAVIS small subset

Для:

- video object segmentation;
- masks;
- occlusion;
- multi-object tracking.

### MPI Sintel sample

Для:

- optical flow;
- camera motion;
- animation-like rendered motion.

### AnimeRun small sample

Для:

- cartoon optical flow;
- stylized correspondence;
- temporal consistency benchmark.

### BEAT / BEAT2

На первом проходе:

- metadata adapter;
- license/provenance record;
- small accessible sample, если официальный download допускает;
- не скачивать десятки гигабайт без оценки и бюджета.

### Internal Harmony Dataset

Создай adapter:

```text
InternalHarmonyDatasetAdapter
```

Он должен индексировать:

- project;
- renders;
- node graph metadata;
- drawings;
- palettes;
- Peg keys;
- deformers;
- substitutions;
- exposures;
- audio;
- scripts;
- automatic version;
- artist correction;
- accepted/rejected.

При отсутствии настоящих Harmony-проектов создай synthetic fixture, но явно пометь его.

---

# 7. Dataset Download Manager

Создай:

```text
services/ml-core/ml_core/datasets/
├── registry.py
├── downloader.py
├── checksums.py
├── extract.py
├── adapters/
└── reports.py
```

Возможности:

- estimate download size;
- estimate extracted size;
- free-disk check;
- resumable downloads;
- checksum;
- retry;
- archive safety;
- partial download cleanup;
- sample mode;
- full mode;
- dataset budget;
- provenance;
- DVC tracking.

Environment:

```text
ML_DATA_ROOT
ML_MODEL_ROOT
ML_CACHE_ROOT
ML_DOWNLOAD_BUDGET_GB
ML_ALLOW_REMOTE_GPU
ML_REMOTE_GPU_URL
ML_REMOTE_GPU_TOKEN
```

По умолчанию:

```text
sample-first
ML_DOWNLOAD_BUDGET_GB=20
```

Не скачивать полный набор, если он не укладывается в бюджет. Создать точную команду для последующего полного download.

---

# 8. Новый ML Core Service

Создай отдельный сервис:

```text
services/ml-core/
├── ml_core/
│   ├── api.py
│   ├── config.py
│   ├── jobs.py
│   ├── hardware.py
│   ├── model_registry.py
│   ├── dataset_registry.py
│   ├── cache.py
│   ├── manifests.py
│   ├── reports.py
│   ├── providers/
│   │   ├── base.py
│   │   ├── sam2_provider.py
│   │   ├── grounding_provider.py
│   │   ├── mediapipe_pose.py
│   │   ├── rtmpose_onnx.py
│   │   ├── tapir_tracker.py
│   │   ├── cotracker_tracker.py
│   │   ├── cutie_tracker.py
│   │   ├── opencv_klt.py
│   │   ├── whisper_provider.py
│   │   ├── mfa_provider.py
│   │   └── embeddings.py
│   ├── pipelines/
│   │   ├── video_perception.py
│   │   ├── retargeting_perception.py
│   │   ├── reconstruction_perception.py
│   │   ├── voice_performance.py
│   │   └── dataset_indexing.py
│   └── datasets/
├── tests/
├── fixtures/
├── pyproject.toml
└── README.md
```

Node.js MCP-сервер не должен загружать модели в свой процесс.

---

# 9. Job System

Все тяжёлые операции — job-based.

Типы:

```text
MLJobRequest
MLJobStatus
MLJobProgress
MLJobArtifact
MLJobError
```

Статусы:

```text
queued
preparing
downloading
loading_model
processing
writing_artifacts
completed
failed
cancelled
```

Обязательные возможности:

- cancellation;
- timeout;
- resume;
- deterministic cache key;
- logs;
- progress;
- partial artifact cleanup;
- per-model concurrency limit;
- memory guard;
- disk guard.

---

# 10. Строгие манифесты

Создай Pydantic и Zod schemas:

```text
MLSystemManifest
ModelRegistryManifest
DatasetRegistryManifest
VideoPerceptionManifest
SegmentationManifest
PoseSequence
PointTrackingManifest
MaskTrackingManifest
SpeechAnalysisManifest
ForcedAlignmentManifest
MLPipelineManifest
```

Каждый результат содержит:

- source file checksum;
- model ID;
- model revision;
- checkpoint checksum;
- backend;
- device;
- precision;
- parameters;
- start/end time;
- per-frame confidence;
- warnings;
- failed ranges;
- artifacts;
- provenance.

---

# 11. FastAPI Endpoints

Добавь:

```text
GET  /v1/ml/system
GET  /v1/ml/models
POST /v1/ml/models/install
POST /v1/ml/models/verify

GET  /v1/ml/datasets
POST /v1/ml/datasets/estimate
POST /v1/ml/datasets/download
POST /v1/ml/datasets/index

POST /v1/ml/segment
POST /v1/ml/pose
POST /v1/ml/track/points
POST /v1/ml/track/masks
POST /v1/ml/transcribe
POST /v1/ml/align
POST /v1/ml/perceive-video
POST /v1/ml/benchmark

GET  /v1/ml/jobs/{jobId}
POST /v1/ml/jobs/{jobId}/cancel
GET  /v1/ml/jobs/{jobId}/artifacts
```

Все inputs должны проверяться allowlisted paths.

---

# 12. MCP Integration

Добавь Node.js:

```text
src/schemas/ml.ts
src/clients/mlClient.ts
src/tools/mlTools.ts
src/adapters/mlProviderRegistry/
```

Новые MCP-инструменты:

```text
harmony.ml.get_system_profile
harmony.ml.list_models
harmony.ml.install_models
harmony.ml.verify_models

harmony.ml.list_datasets
harmony.ml.estimate_dataset_download
harmony.ml.download_dataset
harmony.ml.build_dataset_index

harmony.ml.segment_video
harmony.ml.estimate_pose
harmony.ml.track_points
harmony.ml.track_masks
harmony.ml.transcribe_audio
harmony.ml.align_phonemes
harmony.ml.perceive_video
harmony.ml.run_benchmark
harmony.ml.get_job
harmony.ml.cancel_job
```

Главный инструмент:

```text
harmony.ml.perceive_video
```

Вход:

```json
{
  "videoPath": "...",
  "tasks": [
    "scene_split",
    "segmentation",
    "pose",
    "point_tracking",
    "mask_tracking",
    "transcription",
    "forced_alignment"
  ],
  "profile": "auto",
  "quality": "balanced",
  "characterHints": [],
  "objectHints": [],
  "language": "auto",
  "dryRun": false
}
```

Выход:

```text
VideoPerceptionManifest
```

Внешний ChatGPT/Codex получает структурированные результаты и решает, какие следующие MCP tools вызвать.

---

# 13. Интеграция с текущими модулями

## Motion Retargeting

Заменить synthetic-only путь реальным:

```text
MP4
→ PoseProvider
→ PoseSequence
→ Retargeting Core
→ IK / foot lock / smoothing
→ RetargetingManifest
→ HarmonyCommandPlan
```

Оставить `JsonPoseProvider` и `SyntheticPoseProvider` только для tests/reproducibility.

## Reconstruction

Добавить:

```text
SAM2 masks
+ point tracks
+ mask tracks
→ persistent objects/parts
→ vectorization
→ factorization
→ representation routing
```

## Scene Intelligence

Не использовать локальную LLM.

Добавить только factual observations:

- shot boundaries;
- speaker timings;
- number of visible characters;
- gaze estimates;
- movement intensity;
- object tracks;
- pauses;
- camera motion.

Внешний MCP-клиент строит режиссёрскую интерпретацию.

## Voice-to-Performance

```text
Whisper
→ MFA
→ energy/pitch
→ SpeechAnalysisManifest
→ deterministic gesture/lipsync events
→ external MCP reasoning for performance decisions
```

## Animation Critic

Добавить детерминированные сигналы:

- jitter;
- foot slip;
- mask drift;
- landmark loss;
- frozen motion;
- acceleration spikes;
- silhouette instability;
- phoneme/exposure mismatch.

---

# 14. Provider Router

Реализуй автоматический выбор backend.

Пример:

```text
pose:
  RTMW ONNX CoreML if verified
  else MediaPipe
  else fail

segmentation:
  SAM2 MPS if verified
  else SAM2 CPU
  else remote SAM2
  else OpenCV fallback with degraded status

point tracking:
  TAPIR if verified
  else CoTracker if verified
  else OpenCV KLT

mask tracking:
  Cutie if verified
  else SAM2 video
  else frame-wise segmentation

transcription:
  whisper.cpp/openai-whisper
  else remote
  else fail

forced alignment:
  MFA
  else Whisper word timestamps with degraded status
```

Router учитывает:

- verified runtime;
- latency;
- memory;
- video duration;
- resolution;
- requested quality;
- fallback policy.

Никогда не выбирай backend, который только импортируется, но не прошёл smoke test.

---

# 15. Кэширование

Cache key:

```text
sha256(
  inputChecksum
  + task
  + modelId
  + checkpointChecksum
  + parameters
  + codeRevision
)
```

Кэшировать:

- frames;
- audio;
- masks;
- landmarks;
- tracks;
- transcript;
- phonemes;
- embeddings;
- previews.

Добавить:

- cache size report;
- LRU cleanup;
- pin important artifacts;
- never delete source;
- atomic writes.

---

# 16. Безопасность

Запрещено:

- `trust_remote_code=True` без explicit allowlist;
- исполнение скриптов из датасетов;
- raw shell от MCP arguments;
- path traversal;
- archive extraction без validation;
- скачивание executable из неизвестного URL;
- загрузка пользовательских видео наружу без opt-in;
- возврат fake success;
- пустые masks/transcripts как completed;
- silent model fallback.

Сохраняй:

- download source;
- revision;
- checksum;
- install log;
- runtime log;
- model provenance.

---

# 17. Тесты

## Unit

- hardware detection;
- provider selection;
- model registry transitions;
- cache key;
- path validation;
- job cancellation;
- timeout;
- download resume;
- checksum mismatch;
- archive safety;
- provider fallback;
- no fake success;
- schemas Zod/Pydantic parity.

## Smoke tests with real models

Минимум:

1. MediaPipe на реальном коротком MP4.
2. RTMPose ONNX на одном изображении и коротком видео.
3. SAM 2 на изображении.
4. SAM 2 video propagation на 5–10 кадрах.
5. Point tracker на движущейся точке.
6. Whisper на реальном WAV.
7. MFA на коротком известном transcript, если установлен.
8. Embedding retrieval на маленьком наборе.

## Integration

```text
real MP4
→ ML perceive_video
→ PoseSequence
→ RetargetingManifest
→ local SVG preview
```

```text
real MP4
→ SAM2 masks
→ point/mask tracks
→ reconstruction observations
→ vector/factorization pipeline
```

```text
audio + transcript
→ Whisper/MFA
→ phoneme timeline
→ VoicePerformance observations
```

## Regression

Все существующие Jest/Pytest tests должны проходить.

---

# 18. Реальные demo fixtures

Создай или используй собственные короткие безопасные fixtures:

1. `arm_gesture.mp4`
2. `walk_and_stop.mp4`
3. `two_objects_occlusion.mp4`
4. `short_russian_phrase.wav`
5. `short_english_phrase.wav`
6. `cartoon_shape_motion.mp4`

Каждый fixture должен иметь checksum и происхождение.

Не использовать заранее подготовленные landmarks как единственное доказательство.

---

# 19. End-to-End Demo

Создай:

```text
scripts/demo_ml_stack.py
scripts/demo_ml_mcp.js
output/ml_stack_demo/
```

Demo должно:

1. Показать hardware profile.
2. Показать установленные модели.
3. Показать real inference status.
4. Запустить `harmony.ml.perceive_video`.
5. Извлечь:
   - shots;
   - masks;
   - pose;
   - tracks;
   - speech;
   - phonemes.
6. Передать pose в Motion Retargeting.
7. Передать masks/tracks в Reconstruction.
8. Создать:
   - manifests;
   - SVG/HTML previews;
   - side-by-side GIF/MP4;
   - confidence graph;
   - timing report;
   - benchmark report;
   - HarmonyCommandPlan.
9. Показать, что Harmony application остаётся `implemented_unverified`.
10. Сгенерировать `ML_STACK_WALKTHROUGH.md`.

---

# 20. Acceptance Criteria

Итерация считается завершённой только если:

- hardware profile реально определён;
- install script воспроизводим;
- минимум MediaPipe, RTMPose ONNX и Whisper реально выполняют inference;
- SAM 2 выполняет реальный inference либо честно помечен unavailable с рабочим fallback/remote path;
- point tracker реально выполняет inference;
- MCP tools зарегистрированы;
- `harmony.ml.perceive_video` работает end-to-end;
- настоящий MP4 превращается в PoseSequence без заранее подготовленного JSON;
- Motion Retargeting использует real pose provider;
- dataset registry создан;
- small dataset samples реально скачаны и индексированы;
- model checksums сохранены;
- все outputs содержат provenance;
- полный test suite проходит;
- старые demos не сломаны;
- нет fake success;
- нет claim о настоящей Harmony verification.

---

# 21. Что нельзя считать завершением

Не считать задачу выполненной, если:

- созданы только adapters;
- модели только скачаны;
- `import` прошёл, но inference не запускался;
- использован только SyntheticPoseProvider;
- вместо SAM 2 возвращается старая fixture mask;
- Whisper возвращает hardcoded transcript;
- MFA заменён syllable heuristic без пометки degraded;
- MCP tool зарегистрирован, но endpoint не работает;
- demo читает старые output-файлы;
- тяжёлый provider падает, а ошибка проглатывается;
- command plan назван реальной сценой Harmony.

---

# 22. Финальный отчёт

Создай:

```text
ML_STACK_WALKTHROUGH.md
```

В нём укажи:

- текущую ветку и commit;
- hardware;
- профиль;
- установленные системные зависимости;
- Python environments;
- модель;
- checkpoint;
- checksum;
- backend;
- device;
- import status;
- inference status;
- latency;
- memory;
- downloaded datasets;
- sample/full;
- размеры;
- registry paths;
- MCP tools;
- FastAPI endpoints;
- tests;
- demos;
- artifacts;
- known failures;
- degraded fallbacks;
- что requires remote GPU;
- что requires Harmony;
- точные команды запуска;
- точные команды повторной установки;
- точную команду продолжения.

Финальная таблица:

| Provider | Installed | Import Verified | Inference Verified | Production Route |
|---|---:|---:|---:|---|

Не пиши «всё завершено», если какой-либо основной provider только описан интерфейсом.

---

# 23. Команда начала выполнения

Начни прямо сейчас:

1. аудит;
2. hardware detection;
3. создание install plan;
4. установка системных зависимостей;
5. создание изолированных environments;
6. установка лёгких providers;
7. реальные smoke tests;
8. установка тяжёлых providers;
9. model registry;
10. dataset samples;
11. ML service;
12. MCP integration;
13. end-to-end demo;
14. regression tests;
15. walkthrough.

Не останавливайся после составления `Implementation Plan`.
