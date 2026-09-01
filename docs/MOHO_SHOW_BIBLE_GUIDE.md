# Moho ShowBible Guide

## 1. Введение

**Moho ShowBible** — это канонический набор JSON-документов, описывающих визуальный и анимационный стиль сериала, который производится в Moho (Anime Studio / Smith Micro Moho Pro). Это «контракт шоу»: единый источник правды о палитре, ригах персонажей, разрешённых деформациях, движениях камеры и допустимых порогах QA, который используется всеми downstream-инструментами MCP-сервера (Moho-аниматор, сцен-компилятор, визуальный QA-репейр и др.).

Зачем он нужен:

- **Стилистическая согласованность** — LLM-аниматор не может «отсебятить» цвет, толщину линии, шот или ракурс: всё, что разрешено, перечислено явно.
- **Юридическая дисциплина** — `forbiddenSources` и `asset_license.json` отсекают NC-лицензии и сторонние серии до старта продакшена.
- **Кросс-проверки** — загрузчик бандла (`mohoShowBibleLoader`) сверяет ссылки (`ref`) и подтверждает, что каждый `colourId`/`rigType` существует и не выходит за рамки.
- **QA-гейты** — `qa_thresholds.json` превращает субъективное «выглядит ок» в измеримые пороги (drift, continuity, boneAngleToleranceDeg).
- **Версионируемость** — `schemaVersion: "1.0"` фиксируется в каждом файле; апгрейд схемы — это миграция, а не хак.

В отличие от «классического» `show_bible.json` (который описывает стиль для Toon Boom Harmony и общих пайплайнов), `moho_show_bible.json` понимает Moho-специфику: `bone_deformer`, `smart_bone_dial`, `mesh_warp`, `vitruvian_group`, `mohoColourIndex`, `mohoCameraRigType` (perspective vs orthographic) и `boneAngleToleranceDeg`.

## 2. Структура семейства из 6 файлов

Moho ShowBible — это **6 связанных JSON-документов**. Один из них (top-level) и пять подчинённых:

```
                      ┌────────────────────────────────┐
                      │      moho_show_bible.json      │  (top-level)
                      │  schemaVersion / showId / …    │
                      └────────────────┬───────────────┘
                                       │
        ┌──────────────────────────────┼────────────────────────────────┐
        │                              │                                │
        ▼                              ▼                                ▼
┌───────────────────┐      ┌─────────────────────────┐      ┌────────────────────────┐
│ character_*.json  │      │      palette.json       │      │     camera_rules.json  │
│ (1+ на персонажа) │      │  colourId + mohoColour… │      │  FoV / shot sizes / …  │
└─────────┬─────────┘      └──────────┬──────────────┘      └───────────┬────────────┘
          │                           │                                │
          │                           │                                │
          ▼                           ▼                                ▼
   paletteRef → palette         character lineRules.lineColourId   character motionGrammarRef
          │                                                       │
          │                                                       ▼
          │                                            ┌──────────────────────────┐
          │                                            │   motion_grammar.json    │
          │                                            │   gestures / easing      │
          │                                            └──────────────────────────┘
          │
          ▼
   ┌──────────────────────────┐
   │   qa_thresholds.json     │  ← gate-уровень: измеримые пороги
   │   boneAngleToleranceDeg  │
   └──────────────────────────┘

   ┌──────────────────────────┐
   │   asset_license.json     │  ← юридический gate (не используется
   │   contract / redistribution │    moho_show_bible.json напрямую,
   └──────────────────────────┘    но обязателен в production-бандле)
```

Зависимости (по `ref` / `colourId`):

| From                                 | To                                | Поле                              |
|--------------------------------------|-----------------------------------|-----------------------------------|
| `moho_show_bible.json`               | `character_*.json`                | `characterBibles[].ref`           |
| `moho_show_bible.json`               | `palette.json`                    | `paletteManifestRef`              |
| `moho_show_bible.json`               | `camera_rules.json`               | `cameraRulesRef`                  |
| `moho_show_bible.json`               | `motion_grammar.json`             | `motionGrammarRef`                |
| `moho_show_bible.json`               | `qa_thresholds.json`              | `qaThresholdsRef`                 |
| `character_*.json`                   | `palette.json`                    | `paletteRef` (paletteId)          |
| `character_*.json`                   | `asset_license.json`              | `provenance.licensePath`          |
| `moho_show_bible.json` + персонажи   | `palette.json`                    | `lineRules.lineColourId`, `fillColourId`, `lineColourId` |

Загрузчик `mohoShowBibleLoader` пробегает по всем ссылкам и кидает `Error`, если, например, `colourId` объявлен в bible, но отсутствует в палитре.

## 3. moho_show_bible.json (top-level)

Top-level файл задаёт идентичность шоу, общие правила линий и освещения, белый/чёрный список деформаций и типов ригов, а также ссылки на пять подчинённых документов. Все поля обязательны, кроме `forbiddenSources` и `provenance.notes`.

```json
{
  "schemaVersion": "1.0",
  "showId": "demo_humanoid_speaker_v1",
  "title": "Demo Humanoid Speaker",
  "logLine": "A friendly humanoid character delivers a 5-second line with full lip-sync",
  "fps": 24,
  "resolution": {
    "width": 1920,
    "height": 1080
  },
  "visualStyle": "Stylized 2D broadcast cut-out, clean Bezier linework, 5-color palette",
  "lineRules": {
    "defaultThicknessPt": 2.5,
    "lineColourId": "char_line",
    "fillColourId": "char_skin_base"
  },
  "lighting": {
    "type": "soft_top_left",
    "shadowColourId": "char_shadow"
  },
  "allowedDeformations": [
    "peg_transform",
    "bone_deformer",
    "drawing_substitution",
    "smart_bone_dial",
    "mesh_warp",
    "vitruvian_group"
  ],
  "allowedRigTypes": [
    "humanoid_2leg"
  ],
  "characterBibles": [
    {
      "characterId": "speaker",
      "ref": "./character_speaker.json"
    }
  ],
  "paletteManifestRef": "./palette.json",
  "cameraRulesRef": "./camera_rules.json",
  "motionGrammarRef": "./motion_grammar.json",
  "qaThresholdsRef": "./qa_thresholds.json",
  "forbiddenSources": [
    "third_party_NC_licensed"
  ],
  "provenance": {
    "approver": "demo-artist",
    "approvedAt": "2026-01-01T00:00:00.000Z",
    "notes": "Demo frozen show"
  }
}
```

Пояснение по полям:

- **`schemaVersion`** — литерал `"1.0"`. Любая другая строка → ошибка версии.
- **`showId`** — стабильный slug (например, `polygon_show_v1`). Используется как namespace для всех дочерних id и в логах.
- **`title`** / **`logLine`** — человекочитаемые, нужны для генерации синопсисов.
- **`fps`** — целое положительное; по умолчанию `24`.
- **`resolution.width/height`** — целевой размер кадра. Moho-рендер пойдёт именно в нём.
- **`visualStyle`** — короткое описание стиля; LLM использует его как constraint при генерации шотов.
- **`lineRules.defaultThicknessPt`** — толщина контура по умолчанию в pt.
- **`lineRules.lineColourId` / `fillColourId`** — `colourId` из `palette.json`. Они обязаны там существовать — иначе loader кинет ошибку.
- **`lighting.type`** — произвольная строка-метка (`flat`, `soft_top_left`, `rim`, `three_point`).
- **`lighting.shadowColourId`** — тоже `colourId` из палитры.
- **`allowedDeformations`** — белый список Moho-деформаций. LLM-аниматор не может, например, применить `curve_deformer`, если его тут нет. Полный список enum:
  `peg_transform`, `curve_deformer`, `envelope_deformer`, `bone_deformer`, `drawing_substitution`, `frame_by_frame_vector`, `smart_bone_dial`, `mesh_warp`, `vitruvian_group`.
- **`allowedRigTypes`** — белый список типов ригов. Загрузчик сверяет, что `character_bible.rigType` каждого персонажа входит в этот список.
- **`characterBibles[]`** — массив `{ characterId, ref }`; минимум один.
- **`paletteManifestRef` / `cameraRulesRef` / `motionGrammarRef` / `qaThresholdsRef`** — пути или URI к соответствующим документам.
- **`forbiddenSources`** — список запрещённых источников (например, `"NC"`, `"third_party_series"`); LLM должен отказываться генерировать что-либо, помеченное этими тегами.
- **`provenance`** — кто и когда зафиксировал bible (`approver`, `approvedAt` ISO-8601 datetime, опционально `notes`).

Файл строгий (`.strict()` в zod) — лишние поля вызовут ошибку валидации.

## 4. character_*.json — по одному на каждого персонажа

`character_*.json` — паспорт конкретного персонажа: путь к ригу, контроллеры (маппинг smart-bone-дисков на кости), switch-слои, mouth chart, expressions, gesture library.

```json
{
  "schemaVersion": "1.0",
  "characterId": "speaker",
  "name": "Speaker",
  "role": "protagonist",
  "rigType": "humanoid_2leg",
  "rigPath": "./rigs/speaker.moho",
  "turnaroundViews": ["front", "front_3q_left", "side_left", "front_3q_right", "side_right"],
  "proportions": { "headHeightRatio": 0.25, "armSpanRatio": 1.0 },
  "lineRules": { "lineThicknessPt": 2.5, "lineColourId": "char_line" },
  "controllers": [
    {
      "controllerId": "HEAD_ROT",
      "boneId": 1,
      "boneName": "head_bone",
      "purpose": "Head rotation and tilt",
      "range": { "min": -45, "max": 45, "units": "degrees" },
      "channel": "rotation"
    }
  ],
  "switchLayers": [
    {
      "switchId": "mouth_switch",
      "layerName": "mouth_switch_layer",
      "choices": [
        { "choiceId": "rest", "drawingName": "mouth_rest" },
        { "choiceId": "a",    "drawingName": "mouth_a" }
      ]
    }
  ],
  "mouthShapes": [
    { "shapeId": "Rest", "drawingName": "mouth_rest", "phonemes": ["sil"] },
    { "shapeId": "A",    "drawingName": "mouth_a",    "phonemes": ["AA", "AE", "AH"] }
  ],
  "expressions": [
    { "expressionId": "happy", "drawingName": "expr_happy",
      "controllerOverrides": [ { "controllerId": "MOUTH_DIAL", "value": 0.3 } ] }
  ],
  "gestureLibrary": [
    { "gestureId": "nod", "durationFrames": 18, "controllerTrackRef": "./gestures/speaker_nod.lua" }
  ],
  "paletteRef": "demo_palette",
  "provenance": {
    "approver": "demo-rigger",
    "approvedAt": "2026-01-01T00:00:00.000Z",
    "rigAuthor": "demo",
    "licensePath": "./asset_license.json"
  }
}
```

Ключевые блоки:

- **`controllers[]` (маппинг контроллеров на кости)** — обязателен, минимум один. Каждый binding связывает:
  - `controllerId` (стабильный slug, например `HEAD_ROT`, `MOUTH_DIAL`, `EYE_BLINK`);
  - `boneId` (целое ≥ 0, индекс кости в Moho-риге);
  - `boneName` (человекочитаемое имя в риге);
  - `purpose` — назначение;
  - `range` (опционально): `{ min, max, units: "degrees" | "normalized" | "pixels" }` — для QA-валидации перекрутов;
  - `channel`: `rotation | translation | scale | opacity`;
  - `libraryRef` (опционально) — путь к gesture-библиотеке.

- **`switchLayers[]`** — описание switch-слоёв в Moho (один switch = одноимённый switch-слой с набором drawingSubstitution). Каждый имеет `switchId`, `layerName` и массив `choices: [{ choiceId, drawingName }]`. Пример — `mouth_switch` с `rest/a/b/c/d/e/f/g/l/o/smile/frown`.

- **`mouthShapes[]`** — mouth chart для lip-sync. `shapeId` обязан входить в enum `['Rest', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'L', 'O', 'Smile', 'Frown']` (Preston Blair + расширения), `drawingName` — имя TVG-drawing в риге, `phonemes[]` — список фонем, которые триггерят эту форму.

- **`expressions[]`** — заготовки выражений лица. Каждое выражение может иметь `drawingName` (switch-рисунок) и `controllerOverrides[]` (подкрутить конкретные контроллеры, например `MOUTH_DIAL` = `0.3` для лёгкой улыбки).

- **`gestureLibrary[]`** — именованные клипы: `{ gestureId, durationFrames, controllerTrackRef }`. `controllerTrackRef` — путь к Lua-скрипту или action-файлу.

- **`provenance.licensePath`** — ссылка на `asset_license.json`; без неё loader считает bible неполным для production.

## 5. palette.json

`palette.json` — зафиксированный набор цветов сериала. Каждый цвет имеет стабильный `colourId` (на который ссылаются риги и `lineRules`) и Moho-специфичный `mohoColourIndex` (слот в палитре Moho, 0–65535).

```json
{
  "schemaVersion": "1.0",
  "paletteId": "demo_palette",
  "name": "Demo Speaker Palette",
  "colours": [
    { "colourId": "char_skin_base", "name": "Character Skin Base",
      "rgba": "#F2C6A0FF", "usage": "skin",  "locked": true, "mohoColourIndex": 0 },
    { "colourId": "char_hair",      "name": "Character Hair",
      "rgba": "#3A2A1FFF", "usage": "hair",  "locked": true, "mohoColourIndex": 1 },
    { "colourId": "char_line",      "name": "Character Line",
      "rgba": "#1A1A1AFF", "usage": "line",  "locked": true, "mohoColourIndex": 2 },
    { "colourId": "char_shadow",    "name": "Character Shadow",
      "rgba": "#7A4A3AFF", "usage": "shadow","locked": true, "mohoColourIndex": 3 },
    { "colourId": "char_eye",       "name": "Character Eye",
      "rgba": "#2C5F8DFF", "usage": "eye",   "locked": true, "mohoColourIndex": 4 }
  ],
  "paletteType": "rgb",
  "maxColours": 256,
  "provenance": {
    "approver": "demo-artist",
    "approvedAt": "2026-01-01T00:00:00.000Z",
    "notes": "Demo 5-color locked palette"
  }
}
```

Что важно:

- **`rgba`** — строка из 8 hex-символов (`#RRGGBBAA` или `RRGGBBAA`). Регулярка: `^#?[0-9a-fA-F]{8}$`.
- **`locked: true`** — LLM не имеет права «слегка подвинуть» оттенок. Это защита от дрейфа палитры между эпизодами.
- **`mohoColourIndex`** — индекс слота в Moho (0–65535). Если риг уже собран, эти индексы должны совпадать с тем, что лежит в `.moho`-файле.
- **`usage`** — свободная строка-метка (`skin`, `hair`, `line`, `shadow`, `eye`, …); используется в QA-отчётах.
- **`paletteType`** — `rgb | indexed | gradient`. Для broadcast 2D обычно `rgb`.
- **`maxColours`** — потолок числа слотов (по умолчанию `256`, как в Moho).
- **`gradientRef`** (опционально) — ссылка на градиент, если цвет не плоский.

## 6. camera_rules.json

`camera_rules.json` фиксирует, какие **шоты** и **камерные движения** LLM может ставить на шоу, плюс Moho-специфичные параметры камеры.

```json
{
  "schemaVersion": "1.0",
  "rulesId": "demo_humanoid_speaker_v1_camera_rules",
  "allowedShotSizes": ["close_up", "medium_shot", "medium_close_up"],
  "allowedCameraMoves": ["static", "dolly_in", "pan_right"],
  "defaultShotSize": "medium_close_up",
  "safeMargins": { "top": 0.05, "bottom": 0.05, "left": 0.05, "right": 0.05 },
  "forbiddenMoves": ["roll", "whip_pan", "handheld_shake"],
  "mohoCameraRigType": "perspective",
  "maxFieldOfViewDeg": 45,
  "allowCameraShake": false,
  "provenance": {
    "approver": "demo-cinematographer",
    "approvedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

- **`allowedShotSizes`** — enum: `extreme_close_up`, `close_up`, `medium_close_up`, `medium_shot`, `medium_full_shot`, `full_shot`, `long_shot`, `extreme_long_shot`.
- **`allowedCameraMoves`** — enum: `static`, `pan_left/right`, `tilt_up/down`, `dolly_in/out`, `truck_left/right`, `pedestal_up/down`, `zoom_in/out`, `arc_left/right`, `crane_up/down`. (`roll`, `whip_pan`, `handheld_shake` — нет в enum, поэтому их нет в белом списке; они попадают в `forbiddenMoves` для человекочитаемости.)
- **`defaultShotSize`** — что ставить, если shot не указан явно.
- **`safeMargins`** — четыре дроби `0..1` от ширины/высоты кадра, в которые не должны залезать важные элементы.
- **`mohoCameraRigType`** — **Moho-специфика**: `perspective` (3D-камера с глубиной и FoV) или `orthographic` (плоский 2D-фрэндли-режим без перспективных искажений).
- **`maxFieldOfViewDeg`** — максимальный FoV (1–179°). Большой FoV даёт «рыбий глаз», маленький — длиннофокусную плоскую картинку. По умолчанию `45°`.
- **`allowCameraShake`** — разрешена ли point-layer-driven тряска камеры (в Moho Pro это делается через point-слой, привязанный к камере).
- **`provenance`** — кто и когда зафиксировал правила.

## 7. motion_grammar.json

`motion_grammar.json` описывает «грамматику движения»: какие жесты, эмоции и физические каналы разрешены для каждого правила, плюс timing- и bone-constraints.

```json
{
  "schemaVersion": "1.0",
  "grammarId": "demo_humanoid_speaker_v1_motion_grammar",
  "rules": [
    {
      "ruleId": "general_dialogue",
      "description": "Default dialogue motion: subtle idle sway, controlled head/eye motion, mouth driven by lip-sync.",
      "allowedGestures": ["nod", "head_shake", "hand_raise"],
      "forbiddenGestures": ["full_body_jump", "spin"],
      "allowedEmotions": ["neutral", "happy", "surprise"],
      "poseLibraryRefs": ["./poses/speaker_idle_01.png"],
      "timing": {
        "minHoldFrames": 2,
        "maxHoldFrames": 48,
        "anticipationFrames": 4,
        "followThroughFrames": 6
      },
      "boneConstraints": [
        { "boneName": "head_bone",   "minAngleDeg": -30, "maxAngleDeg": 30 },
        { "boneName": "left_arm_bone", "minAngleDeg": -90, "maxAngleDeg": 180 }
      ],
      "physicsChannels": ["spring", "damping"]
    }
  ],
  "defaultTiming": { "fps": 24, "minBeatFrames": 2, "maxBeatFrames": 96 },
  "defaultEasing": "ease_in_out",
  "provenance": {
    "approver": "demo-animator",
    "approvedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

Поля:

- **`rules[]`** — массив правил; минимум одно. У каждого:
  - `allowedGestures` / `forbiddenGestures` — slug-идентификаторы из `character_*.json.gestureLibrary[].gestureId`.
  - `allowedEmotions` — slug-идентификаторы из `character_*.json.expressions[].expressionId`.
  - `poseLibraryRefs[]` — пути к PNG-позам для pose-matching.
  - **`timing`** — рамки удержания позы и принципы анимации: `minHoldFrames` / `maxHoldFrames` (между сменами позы), `anticipationFrames` (замах перед действием), `followThroughFrames` (инерция после).
  - **`boneConstraints[]`** — допустимые диапазоны углов для конкретных костей: `{ boneName, minAngleDeg, maxAngleDeg }`. За пределами — QA fail.
  - **`physicsChannels[]`** — какие физические каналы Moho можно включать на риге: `spring`, `damping`, `mass`, `gravity`. Например, вторичные волосы — `spring + damping`.
- **`defaultTiming`** — глобальный fps и длительность бита для всего шоу.
- **`defaultEasing`** — глобальная интерполяция по умолчанию: `linear | ease_in | ease_out | ease_in_out | custom`.

## 8. qa_thresholds.json

`qa_thresholds.json` превращает «выглядит ок» в измеримые gate-значения. Каждый параметр — порог, выше/ниже которого кадр считается провалившим QA.

```json
{
  "schemaVersion": "1.0",
  "thresholdsId": "demo_humanoid_speaker_v1_qa_thresholds",
  "silhouetteQualityMin": 0.7,
  "lipsyncDriftMaxMs": 80,
  "continuityMaxDeltaFrames": 2,
  "lineThicknessTolerancePt": 0.5,
  "paletteDeltaMax": 0.02,
  "poseLibraryMatchMin": 0.85,
  "autoFixableSeverityMax": "medium",
  "requireHumanApprovalFor": ["key_pose", "camera_move", "dialogue_timing"],
  "boneAngleToleranceDeg": 2.0,
  "meshWarpMaxPointsMoved": 8,
  "switchLayerMaxChangesPerSecond": 6,
  "forbidOrphanBones": true,
  "provenance": {
    "approver": "demo-qa-lead",
    "approvedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

Базовые гейты:

- **`silhouetteQualityMin`** (0–1) — минимальное качество силуэта.
- **`lipsyncDriftMaxMs`** — допустимый дрейф lip-sync в миллисекундах.
- **`continuityMaxDeltaFrames`** — максимальное отклонение по continuity между соседними кадрами.
- **`lineThicknessTolerancePt`** — допуск толщины линии (в pt).
- **`paletteDeltaMax`** (0–1) — допустимое отклонение цвета от палитры.
- **`poseLibraryMatchMin`** (0–1) — минимальное совпадение с pose library.
- **`autoFixableSeverityMax`** — `low | medium`. Выше — нужен человек.
- **`requireHumanApprovalFor[]`** — список операций, которые нельзя автофиксить (`key_pose`, `camera_move`, `dialogue_timing` и т. п.).

Moho-специфика:

- **`boneAngleToleranceDeg`** (0–45) — допуск отклонения угла кости от ожидаемого значения. Если LLM выставил контроллер, а кость ушла больше этого порога — fail. По умолчанию `2°`.
- **`meshWarpMaxPointsMoved`** — максимум точек mesh-варпа, которые можно сдвинуть за один кадр (защита от дикого morph).
- **`switchLayerMaxChangesPerSecond`** — лимит на количество переключений switch-слоя (например, mouth shape) в секунду. Защищает от «дёрганых» ртов.
- **`forbidOrphanBones`** — запрет «осиротевших» костей в риге (без parent или без skinning).

## 9. asset_license.json

`asset_license.json` — юридический gate. Описывает, **на каких правах** ассеты (риги, палитры, позы) могут использоваться в шоу. Сам `moho_show_bible.json` на него не ссылается напрямую, но loader считает bible неполным, если `character_*.json.provenance.licensePath` не указывает на валидный license-файл.

```json
{
  "schemaVersion": "1.0",
  "licenseId": "demo_speaker_asset_license_v1",
  "type": "exclusive_commercial",
  "modificationAllowed": true,
  "datasetUseAllowed": true,
  "redistributionAllowed": false,
  "contractPath": "./contracts/speaker.pdf",
  "provenance": {
    "approver": "demo-legal",
    "approvedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

Поля:

- **`type`** — тип лицензии (`exclusive_commercial`, `royalty_free`, `internal_only`, …).
- **`modificationAllowed`** — можно ли модифицировать риг/палитру.
- **`datasetUseAllowed`** — можно ли использовать ассеты для обучения ML-моделей.
- **`redistributionAllowed`** — можно ли передавать ассеты третьим лицам.
- **`contractPath`** — путь к PDF-контракту (для юридического аудита).

Если `type` или `redistributionAllowed` конфликтуют с `moho_show_bible.forbiddenSources`, продакшен-гейт не пройдёт.

## 10. Как создать с нуля

Чтобы не набивать 6 файлов руками, есть инструмент **`moho.show_bible.scaffold`** (`src/tools/mohoShowBibleScaffold.ts`). Он генерирует валидный стартовый бандл, который потом нужно наполнить реальными данными.

Пример вызова (MCP tool):

```json
{
  "tool": "moho.show_bible.scaffold",
  "arguments": {
    "outputDir": "./fixtures/my_show_v1",
    "showId": "my_show_v1",
    "title": "My New Show",
    "rigTypes": ["humanoid_2leg", "creature"],
    "includeCharacterTemplate": true,
    "dryRun": false
  }
}
```

Параметры:

- **`outputDir`** — директория для записи (создаётся рекурсивно).
- **`showId`** — стабильный slug шоу (например, `polygon_show_v1`).
- **`title`** — человекочитаемое название.
- **`rigTypes[]`** — массив из `humanoid_2leg | quadruped | creature | mechanical`; минимум один. Под каждый тип создаётся заглушка character bible.
- **`includeCharacterTemplate`** — если `true`, дополнительно создаётся `character_template.json` со скелетной character_bible для первого персонажа.
- **`includeExamples`** — зарезервировано, сейчас игнорируется.
- **`dryRun`** — если `true`, файлы не пишутся, возвращается список `filesToWrite`.

Возвращает:

- `status: "success"` + `filesWritten[]` + `fingerprint` (SHA-256 канонизированного бандла — пригодится для аудита «не изменился ли bible»).
- `status: "dry_run"` + `filesToWrite[]`.
- `status: "error"` с кодом и сообщением.

После скаффолда необходимо вручную:

1. Заполнить `approver` / `approvedAt` в `provenance` каждого файла.
2. Прописать реальные `rigPath`, gesture-пути, controllers, switch-слои и mouth chart.
3. Заменить цвета палитры и зафиксировать `mohoColourIndex` под реальный Moho-риг.
4. Привязать `character_*.json.provenance.licensePath` к реальному `asset_license.json`.

## 11. Валидация

После заполнения бандла прогоняется **`moho.show_bible.validate`** (`src/tools/mohoShowBibleTools.ts`). Он:

1. Парсит `moho_show_bible.json` через `mohoShowBibleSchema` (zod, `.strict()`).
2. По ссылкам загружает все 5 подчинённых документов.
3. Каждый проверяет соответствующей zod-схемой (`mohoCharacterBibleSchema`, `mohoPaletteManifestSchema`, `mohoCameraRulesSchema`, `mohoMotionGrammarSchema`, `mohoQaThresholdsSchema`).
4. Прогоняет кросс-проверки:
   - каждый `colourId` из `moho_show_bible.lineRules`, `lighting.shadowColourId` и всех `character_*.json.lineRules.lineColourId` существует в `palette.json`;
   - `character_*.json.rigType` каждого персонажа входит в `moho_show_bible.allowedRigTypes`;
   - `paletteRef` каждого персонажа совпадает с `paletteId` палитры;
   - `motionGrammarRef` указывает на grammar, в котором есть хотя бы одно rule;
   - `provenance.licensePath` каждого персонажа указывает на читаемый `asset_license.json`.

Пример вызова:

```json
{
  "tool": "moho.show_bible.validate",
  "arguments": {
    "showBiblePath": "./fixtures/my_show_v1/moho_show_bible.json"
  }
}
```

Ответ — JSON-отчёт со списком ошибок и предупреждений. Любая ошибка делает bible непригодным для продакшена.

Помимо этого есть вспомогательные tools:

- **`moho.show_bible.load`** — загрузить и вернуть весь бандл как объект.
- **`moho.show_bible.fingerprint`** — SHA-256 канонизированного бандла (полезно для CI-гейта «не изменился ли bible»).
- **`moho.show_bible.get_cross_refs`** — карта всех ссылок между документами.
- **`moho.show_bible.list_allowed_rig_types`** — белый список `allowedRigTypes` (для предварительного решения, можно ли вообще запускать пайплайн с текущим типом рига).

## 12. Версионирование

Все 6 файлов начинаются с `"schemaVersion": "1.0"`. Семантика версии:

- **major (1)** — ломающие изменения структуры (новые обязательные поля, удаление полей, смена enum-значений). Loader кинет `Error: Unsupported moho_show_bible schemaVersion major X. This server supports major 1.`
- **minor** — вперёд-совместимые дополнения (новые опциональные поля, новые enum-значения). Проверяется ассертом `assertMohoShowBibleVersion` и коллегами.

Что делать при апгрейде:

1. **Проверить `major`**. Если у вас `1.x` и сервер поддерживает `1.x` — миграция не нужна, minor игнорируется.
2. **При смене major**:
   - Обновить все 6 файлов: новое обязательное поле → новый `schemaVersion`.
   - Прогнать `moho.show_bible.validate` на каждом шоу в репозитории.
   - Обновить `examples/moho_show_bible/*` под новую схему (они служат каноническим референсом).
3. **При добавлении поля в схему**:
   - Сделать его **опциональным** (`.default()` или `.optional()`).
   - Внести новый пример в `examples/moho_show_bible/`.
   - Задокументировать в этом гайде и в `CHANGELOG`.
4. **При удалении или переименовании поля** — это breaking change, требует major bump и явной миграции подуще.
5. **Поле `provenance.approvedAt`** — ISO-8601 datetime. Любая правка bible должна обновлять этот таймстамп и `approver`, чтобы аудит-трейл был честным.

Канонические ссылки на пример: `examples/moho_show_bible/moho_show_bible.json` + 5 сателлитов. Любые правки схемы должны оставлять эти файлы валидными.

---

## 13. Acting integration (Sprint 8, добавлено 2026-08-31)

Sprint 8 добавляет опциональное поле в `character_bible.json` для актёрских
параметров, которые использует `MohoActingBridge`:

```json
{
  "schemaVersion": "1.0",
  "characterId": "speaker",
  "rigType": "humanoid_2leg",
  "acting": {
    "supportedActionTypes": ["talk", "gesture", "react", "idle", "walk", "look_at"],
    "defaultEmotion": "neutral",
    "supportedEmotions": ["neutral", "happy", "angry", "sad", "surprised", "scheming", "sarcastic"],
    "gestureLibrary": ["wave", "shrug", "point", "nod", "head_shake", "lean_in"],
    "phonemeSet": ["Rest", "A_I", "E", "O", "U", "F_V", "L", "W_Q", "M_B_P", "Smile"],
    "blinkFramesInterval": 36,
    "breathingEnabled": true,
    "squashStretch": {
      "head": { "neutral": 1.0, "squash": 1.35, "stretch": 0.75 },
      "body": { "neutral": 1.0, "squash": 1.25, "stretch": 0.85 }
    }
  }
}
```

**Поведение по умолчанию:** если `acting` поле отсутствует, `MohoActingBridge`
использует safe defaults (10 Preston-Blair phonemes, 6 named gestures, 5 emotion
emums, 36-frame blink interval).

**Cross-reference:** см. [MOHO_ACTING_INTEGRATION.md](./MOHO_ACTING_INTEGRATION.md)
для детальной архитектуры bridge, тестов и метрик замены рутины (60% → 77%).