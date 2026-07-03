# Format Description: scene_plan.json

Для запуска автоматической сборки сцены через `harmony.autopilot.run_scene_plan` необходимо передать путь к файлу формата `scene_plan.json`. 

## Пример структуры файла

```json
{
  "production": "DemoSeries",
  "episode": "EP_001",
  "sceneName": "SC_001",
  "resolution": {
    "width": 1920,
    "height": 1080
  },
  "fps": 24,
  "durationFrames": 192,
  "workspaceTemplate": "default_scene_template",
  "background": {
    "file": "assets/backgrounds/lab.png",
    "layerName": "BG_Lab",
    "position": { "x": 0, "y": 0, "z": 0 },
    "scale": 1
  },
  "characters": [
    {
      "name": "Scientist",
      "rig": "assets/rigs/scientist.tpl",
      "positionPreset": "left",
      "startFrame": 1,
      "endFrame": 192,
      "actions": [
        {
          "type": "talk",
          "frames": [49, 150],
          "audio": "audio/sc_001.wav",
          "mouthChart": "standard_mouth_chart"
        }
      ]
    }
  ],
  "camera": {
    "preset": "slow_push_in",
    "startFrame": 1,
    "endFrame": 192
  },
  "effects": [
    {
      "type": "glow",
      "target": "Portal_FX",
      "frames": [150, 192]
    }
  ],
  "render": {
    "preview": true,
    "format": "mp4",
    "quality": "low"
  }
}
```

## Описание полей

* **production**: Название проекта или сериала.
* **episode**: Код эпизода.
* **sceneName**: Код текущей сцены.
* **resolution**: (Опционально) Разрешение сцены (width, height).
* **fps**: (Опционально) Количество кадров в секунду.
* **durationFrames**: Длительность сцены в кадрах.
* **workspaceTemplate**: Путь или имя шаблона, на основе которого создается сцена.
* **background**: Параметры фонового слоя (путь к файлу, имя слоя на таймлайне, масштаб).
* **characters**: Массив используемых персонажей. Каждый персонаж содержит путь к ригу `.tpl` и массив действий. Действия со свойством `audio` и `mouthChart` автоматически генерируют анимацию ртов (липсинк).
* **camera**: (Опционально) Пресет анимации камеры (наезд, тряска).
* **effects**: (Опционально) Визуальные шейдерные эффекты, подключаемые к нодовой сети.
* **render**: (Опционально) Параметры создания превью-видео.
