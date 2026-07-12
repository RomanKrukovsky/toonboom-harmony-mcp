import fs from 'fs';
import path from 'path';
import { HarmonySceneCompiler } from '../dist/adapters/harmonySceneCompiler.js';

function prepareIntegrationPackage() {
  const packageDir = path.resolve('output/harmony-integration-package');
  console.log(`Создание переносимого интеграционного пакета в: ${packageDir}`);

  // Очищаем/создаем директорию
  if (fs.existsSync(packageDir)) {
    fs.rmSync(packageDir, { recursive: true, force: true });
  }
  fs.mkdirSync(packageDir, { recursive: true });

  // 1. Ищем существующий манифест демо-версии
  const demoCacheDir = path.resolve('output/reconstruction-demo/cache');
  let manifestPath = '';
  if (fs.existsSync(demoCacheDir)) {
    const jobs = fs.readdirSync(demoCacheDir);
    if (jobs.length > 0) {
      manifestPath = path.join(demoCacheDir, jobs[0], 'manifest.json');
    }
  }

  let manifest;
  if (manifestPath && fs.existsSync(manifestPath)) {
    console.log(`Использование реального демо-манифеста из: ${manifestPath}`);
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } else {
    console.log('Демо-манифест не найден. Создание синтетического манифеста для переноса...');
    manifest = {
      schemaVersion: '1.0',
      manifestId: 'portable_demo_manifest_999888',
      createdAt: new Date().toISOString(),
      mode: 'frame_by_frame_vector',
      source: {
        videoPath: '/tmp/moving_shape.mp4',
        sha256: '9'.repeat(64),
        width: 160,
        height: 120,
        fps: 12,
        timeBase: '1/12',
        durationSeconds: 1.0,
        frameCount: 12,
        variableFrameRate: false,
        rotation: 0,
        colorSpace: 'unknown',
        hasAlpha: true
      },
      scene: { name: 'SC_001', width: 160, height: 120, fps: 12, startFrame: 1, endFrame: 12 },
      palettes: [{
        id: 'palette_main',
        name: 'SC_001_Palette',
        colors: [
          { id: 'COLOR_001', name: 'COLOR_001', rgba: [255, 0, 0, 255], originalRgba: [255, 0, 0, 255], replacementError: 0.0 }
        ]
      }],
      elements: [{
        id: 'element_main',
        name: 'SC_001_Drawings',
        nodeName: 'SC_001_READ',
        drawingIds: ['drawing_000001'],
        locked: false
      }],
      drawings: [{
        id: 'drawing_000001',
        name: 'F_000001',
        sourceFrame: 1,
        normalizedImagePath: '/tmp/rgba_frames/frame_000001.png',
        shapes: [{
          id: 'shape_1',
          colorId: 'COLOR_001',
          closed: true,
          points: [{ x: 0.25, y: 0.25 }, { x: 0.75, y: 0.25 }, { x: 0.75, y: 0.75 }, { x: 0.25, y: 0.75 }],
          area: 400.0,
          source: { frame: 1, method: 'contour_trace' }
        }],
        pointCount: 4,
        locked: false,
        provenance: 'automatic_video_reconstruction'
      }],
      exposures: [{ frame: 1, duration: 12, drawingId: 'drawing_000001' }],
      nodes: [
        { id: 'node_read', name: 'SC_001_READ', type: 'READ', autoCreated: true, locked: false },
        { id: 'node_composite', name: 'SC_001_COMPOSITE', type: 'COMPOSITE', autoCreated: true, locked: false },
        { id: 'node_display', name: 'SC_001_DISPLAY', type: 'DISPLAY', autoCreated: true, locked: false }
      ],
      connections: [
        { from: 'node_read', to: 'node_composite', fromPort: 0, toPort: 0 },
        { from: 'node_composite', to: 'node_display', fromPort: 0, toPort: 0 }
      ],
      diagnostics: {
        uniqueDrawingCount: 1,
        duplicateFrameCount: 11,
        paletteColorCount: 1,
        totalPointCount: 4,
        warnings: [],
        stageDurationsMs: {},
        capability: { vectorBackend: 'python_dom_shapes', lineArt: false, colourArt: true, nativeTvgRequired: true }
      }
    };
  }

  // 2. Генерируем HarmonyCommandPlan
  const compiler = new HarmonySceneCompiler();
  const plan = compiler.generateCommandPlan(manifest);

  // Записываем манифест и план в пакет
  fs.writeFileSync(path.join(packageDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(packageDir, 'command_plan.json'), JSON.stringify(plan, null, 2));

  // 3. Копируем пустую тестовую сцену (как fixture)
  const templateScene = path.resolve('output/test_xstage');
  const destSceneDir = path.join(packageDir, 'test_scene');
  if (fs.existsSync(templateScene)) {
    console.log(`Копирование шаблона сцены из: ${templateScene}`);
    fs.cpSync(templateScene, destSceneDir, { recursive: true });
  } else {
    // Создаем заглушку xstage
    fs.mkdirSync(destSceneDir, { recursive: true });
    fs.writeFileSync(path.join(destSceneDir, 'SC_001.xstage'), '<project/>');
  }

  // 4. Копируем мост harmony_bridge.py в пакет
  const bridgeSrc = path.resolve('scripts/python/harmony_bridge.py');
  const bridgeDest = path.join(packageDir, 'harmony_bridge.py');
  if (fs.existsSync(bridgeSrc)) {
     fs.copyFileSync(bridgeSrc, bridgeDest);
  }

  // 5. Создаем скрипт запуска run_integration.py
  const runScriptContent = `import os
import sys
import json
import subprocess

def main():
    print("=== Запуск локального интеграционного применения на машине с Harmony ===")
    
    # Задаем пути
    bridge_path = os.path.abspath("harmony_bridge.py")
    scene_path = os.path.abspath(os.path.join("test_scene", "SC_001.xstage"))
    plan_path = os.path.abspath("command_plan.json")
    
    if not os.path.exists(bridge_path):
        print("Ошибка: harmony_bridge.py не найден.")
        sys.exit(1)
        
    if not os.path.exists(scene_path):
        print("Ошибка: Шаблон сцены не найден по пути:", scene_path)
        sys.exit(1)
        
    if not os.path.exists(plan_path):
        print("Ошибка: command_plan.json не найден.")
        sys.exit(1)

    # Загружаем план команд
    with open(plan_path, "r", encoding="utf-8") as f:
        plan = json.load(f)

    # Просим указать путь к python-packages Harmony, если он не задан в окружении
    packages_path = os.environ.get("HARMONY_PYTHON_PACKAGES")
    if not packages_path:
        print("Переменная окружения HARMONY_PYTHON_PACKAGES не задана.")
        packages_path = input("Введите абсолютный путь к python-packages вашей Harmony: ").strip()
        
    if not os.path.exists(packages_path):
        print("Ошибка: Указанный путь не существует:", packages_path)
        sys.exit(1)

    payload = {
        "command": "execute_command_plan",
        "pythonPackages": packages_path,
        "args": {
            "projectPath": scene_path,
            "plan": plan
        }
    }
    
    print("Выполнение плана команд на сцене:", scene_path)
    
    # Настройка путей библиотек для macOS/Windows
    env = dict(os.environ)
    env["HARMONY_PYTHON_PACKAGES"] = packages_path
    
    # Запускаем мост
    completed = subprocess.run(
        [sys.executable, bridge_path],
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        env=env
    )
    
    print("\\n=== Вывод STDOUT ===")
    print(completed.stdout)
    print("=== Вывод STDERR ===")
    print(completed.stderr)
    
    if completed.returncode == 0:
        res = json.loads(completed.stdout)
        if res.get("status") == "success":
            print("\\nУспешно! Сцена нативно модифицирована и сохранена.")
            print("Нативный аудит:")
            print(json.dumps(res.get("nativeAudit"), indent=2))
        else:
            print("\\nКоманда завершилась ошибкой:", res.get("message"))
    else:
        print("\\nПроцесс моста завершился ошибкой с кодом:", completed.returncode)

if __name__ == "__main__":
    main()
`;
  fs.writeFileSync(path.join(packageDir, 'run_integration.py'), runScriptContent);

  // 6. Создаем README.md с чек-листом верификации (Task 11)
  const readmeContent = `# Интеграционный пакет переноса для Toon Boom Harmony

Этот самодостаточный пакет подготовлен для запуска на машине с установленной и лицензированной версией Toon Boom Harmony.

## Состав пакета
- \`manifest.json\` — манифест векторной реконструкции.
- \`command_plan.json\` — детерминированный план операций, сгенерированный компилятором.
- \`harmony_bridge.py\` — мост для выполнения команд через Python DOM.
- \`test_scene/\` — копия пустой тестовой сцены Harmony (\`SC_001.xstage\`).
- \`run_integration.py\` — скрипт запуска интеграции.

## Запуск интеграции
Выполните скрипт на машине с Toon Boom Harmony:
\`\`\`bash
python run_integration.py
\`\`\`

---

## Чек-лист ручной проверки (Integration Checklist)

После успешного выполнения скрипта, откройте модифицированную сцену \`test_scene/SC_001.xstage\` в Toon Boom Harmony и выполните следующие проверки:

### 1. Проверка нативных элементов (Drawing Elements)
- Перейдите в **Timeline** или **Xsheet**.
- Убедитесь, что появился новый слой \`SC_001_Drawings\` (или аналогичное имя из манифеста).
- Проверьте, что в столбце содержатся нативные кадры (\`F_000001\`, \`F_000002\` и т.д.).

### 2. Проверка экспозиций (Exposures)
- Временная шкала должна в точности соответствовать таймингу исходного ролика.
- Повторяющиеся кадры (holds) должны указывать на тот же самый Drawing ID в Xsheet. Изменение одного кадра должно влиять на все кадры его удержания, что доказывает отсутствие дублирования.

### 3. Проверка палитры и цветов (Palette Swatches)
- Откройте вкладку **Color**.
- Убедитесь, что появилась палитра с именем \`SC_001_Palette\`.
- Откройте любой цвет (например, \`COLOR_001\`) и поменяйте оттенок. Все векторные элементы этого цвета на сцене должны мгновенно изменить цвет.

### 4. Проверка векторной геометрии и отверстий (Holes)
- Выберите инструмент **Contour** (или горячую клавишу \`D\`) или **Select** (\`V\`).
- Выделите векторную область. Вы должны увидеть управляющие Bezier-точки.
- Попробуйте переместить одну из Bezier-точек. Геометрия должна плавно деформироваться, доказывая, что это не плоская растровая подложка.
- Если в манифесте были отверстия (например, буква O), убедитесь, что внутренняя часть прозрачна и сквозь нее виден фон (а не залит сплошным цветом).

### 5. Проверка слоев (Colour Art и Line Art)
- Проверьте, в каком слое (\`Line Art\` или \`Colour Art\`) нарисованы контуры, переключая соответствующие кнопки под рабочей областью камеры. Они должны строго соответствовать настройкам манифеста.

### 6. Preview Render
- Выберите вкладку рендеринга камеры или выполните команду preview render, чтобы подтвердить, что картинка рендерится без артефактов.
`;
  fs.writeFileSync(path.join(packageDir, 'README.md'), readmeContent);
  console.log('Интеграционный пакет успешно собран.');
}

prepareIntegrationPackage();
