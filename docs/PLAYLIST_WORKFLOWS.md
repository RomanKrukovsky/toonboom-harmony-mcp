# Инструкции и Workflow для Агента: Учебный Курс Toon Boom Harmony

Документ описывает правила и последовательности вызовов MCP-инструментов на основе обучающего курса по риггингу Toon Boom Harmony (см. [playlist_knowledge_base.md](../playlist_knowledge_base.md)).

---

## Основные правила выполнения работ

1. **Проверка окружения**:
   Перед любыми массовыми действиями вызывайте `harmony.validate_environment(path, checkHarmonyPreferences=true)`.
   * `Default Separate Position` = `TRUE` (изоляция осей X, Y, Z).
   * `Disable Element Node Creation` = `TRUE` (анимационные ключи только на Pegs).

2. **Работа с пресетами паттернов**:
   * **Pivot Matching**: Использование `jointCenterMarkers` в `harmony.rig.create_pegs` для точной совмещенности центров суставов с пегами.
   * **Seamless Joint / AutoPatch**: Вызов `harmony.nodes.create_effect_chain` с `preset="seamless_autopatch_arm"` или `"simple_overlay_arm"`.
   * **Eye Cutter Mask**: Вызов `harmony.rig.create_eye_system` с `eyeCutterPreset=true` (`inverted=true` для маски зрачка под белок глаза).
   * **Kinematic Isolation**: Вставка `KinematicOutput` перед дочерними пегами с помощью `harmony.rig.create_deformers` (`kinematicIsolation=true`).
   * **Multi-Angle Deformation**: Создание изолированных цепей деформаций под каждый угол при повороте 360 через `harmony.rig360.map_drawings_to_angles`.
   * **Light Shading Pass**: Вызов `harmony.nodes.create_effect_chain` с `preset="light_shading"` для объёма.

3. **Суб-слои рисунков (Sub-layers)**:
   * `Line Art` (`L`): Контур персонажа.
   * `Color Art` (`C`): Цветная заливка (`Paint Tool`).
   * `Overlay` (`O`): Линии складок (локти, колени, шаговый шов брюк) и маски бровей.
   * `Underlay` (`U`): Вспомогательные наброски.

---

## Типовые последовательности вызовов (Workflow Recipes)

### 1. Базовая иерархия персонажа
```json
// 1. Проверка правил окружения
harmony.validate_environment({ "path": "/path/to/project.xstage", "checkHarmonyPreferences": true })

// 2. Создание рисованных слоев
harmony.drawings.create_layer({ "layerName": "Head", "nodeType": "READ" })
harmony.drawings.create_layer({ "layerName": "Torso", "nodeType": "READ" })

// 3. Создание композитов в режиме Pass Through
harmony.nodes.create({ "nodeType": "Composite", "nodeName": "Head_Comp", "mode": "Pass Through" })
harmony.nodes.create({ "nodeType": "Composite", "nodeName": "Torso_Comp", "mode": "Pass Through" })

// 4. Создание управляющих Пегов с привязкой пивотов
harmony.rig.create_pegs({ "nodePaths": ["Head", "Torso"], "pivotMatchingPreset": true })

// 5. Упаковка в группу
harmony.nodes.group({ "nodePaths": ["Head", "Torso", "Head_Comp", "Torso_Comp"], "groupName": "Morty_Rig" })
```

### 2. Оснащение руки (Seamless Arm)
```json
// Создание цепи AutoPatch + LayerSelector
harmony.nodes.create_effect_chain({
  "targetNodePath": "Top/Morty_Rig/Arm_L",
  "preset": "seamless_autopatch_arm"
})

// Создание деформера с Kinematic Isolation
harmony.rig.create_deformers({
  "nodePath": "Top/Morty_Rig/Arm_L",
  "type": "Curve",
  "kinematicIsolation": true
})
```

### 3. Оснащение ноги и таза (Leg & Pelvis Rigging)
```json
harmony.nodes.create({ "nodeType": "Composite", "nodeName": "Pelvis_Comp", "mode": "Pass Through" })
harmony.nodes.create_effect_chain({
  "targetNodePath": "Top/Morty_Rig/Leg_L",
  "preset": "seamless_autopatch_leg"
})
```

### 4. Оснащение головы и 360 Turnaround
```json
harmony.rig360.create_head_360_structure({
  "characterName": "Morty",
  "angles": ["Front", "ThreeQuarters", "Side"]
})
harmony.rig360.create_angle_controls({
  "characterName": "Morty",
  "gridMode": true
})
```

### 5. Оснащение рта и Липсинка (Mouth Chart & Lipsync)
```json
harmony.rig.create_mouth_chart({
  "layerName": "Mouth",
  "phonemes": ["A", "B", "C", "D", "E", "F", "G", "X"]
})
harmony.lipsync.import_audio({ "audioPath": "/path/to/dialogue.wav" })
harmony.lipsync.apply_mouth_chart({ "audioNode": "Dialogue_Audio" })
```

### 6. Оснащение глаза (Eye Cutter Mask)
```json
harmony.rig.create_eye_system({
  "characterName": "Morty",
  "eyeCutterPreset": true,
  "inverted": true
})
```

### 7. Аудит сцены и рига
```json
harmony.audit.scene({ "projectPath": "/path/to/project.xstage" })
harmony.rig.validate_deformers({ "projectPath": "/path/to/project.xstage" })
harmony.nodes.find_broken_connections({ "projectPath": "/path/to/project.xstage" })
```

---

## Места, требующие обязательного ручного контроля в Harmony
* **Подгонка контура ластиком**: Срез дуги сустава плеча/предплечья ластиком при использовании `Auto Patch`.
* **Проверка инверсии Cutter**: Двойной клик на ноду Cutter в Node View для удержания зрачка в белке глаза.
* **Прорисовка точек деформатора в Rigging Tool**: Выстановка вех костей и кривых мышью в Camera View.
* **Снятие замочка с папки библиотеки**: Меню `Right to Modify` в окне Library.
