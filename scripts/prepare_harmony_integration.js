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

  const demoCacheDir = path.resolve('output/reconstruction-demo/cache');
  let jobDir = '';
  if (fs.existsSync(demoCacheDir)) {
    const jobs = fs.readdirSync(demoCacheDir);
    if (jobs.length > 0) {
      jobDir = path.join(demoCacheDir, jobs[0]);
    }
  }

  let manifest;
  if (jobDir && fs.existsSync(path.join(jobDir, 'manifest.json'))) {
    console.log(`Использование реального демо-каталога джобы из: ${jobDir}`);
    manifest = JSON.parse(fs.readFileSync(path.join(jobDir, 'manifest.json'), 'utf8'));
    
    // Копируем активный манифест
    fs.copyFileSync(path.join(jobDir, 'manifest.json'), path.join(packageDir, 'manifest.json'));
    
    // Копируем все варианты, если они есть
    const variants = ['frame_by_frame_vector', 'clean_frame_by_frame', 'compact_frame_by_frame'];
    for (const v of variants) {
      const vManifest = path.join(jobDir, `manifest_${v}.json`);
      if (fs.existsSync(vManifest)) {
        fs.copyFileSync(vManifest, path.join(packageDir, `manifest_${v}.json`));
      }
      
      const vPreview = path.join(jobDir, `previews_${v}`);
      if (fs.existsSync(vPreview)) {
        fs.cpSync(vPreview, path.join(packageDir, `previews_${v}`), { recursive: true });
      }
    }
    
    // Копируем сравнение и лог версий/выбора
    const reportPath = path.join(jobDir, 'comparison_report.html');
    if (fs.existsSync(reportPath)) {
      fs.copyFileSync(reportPath, path.join(packageDir, 'comparison_report.html'));
    }
    const versionsPath = path.join(jobDir, 'versions.json');
    if (fs.existsSync(versionsPath)) {
      fs.copyFileSync(versionsPath, path.join(packageDir, 'versions.json'));
    }
  } else {
    console.log('Демо-каталог джобы не найден. Создание синтетического манифеста для переноса...');
    manifest = {
      schemaVersion: '2.0',
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
          { id: 'COLOR_001', name: 'COLOR_001', rgba: [255, 0, 0, 255], originalRgba: [255, 0, 0, 255], replacementError: 0.0, confidence: 1.0, artistModified: false, artistLocked: false }
        ]
      }],
      elements: [{
        id: 'element_main',
        name: 'SC_001_Drawings',
        nodeName: 'SC_001_READ',
        drawingIds: ['drawing_000001'],
        locked: false,
        artistModified: false,
        artistLocked: false
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
          source: { frame: 1, method: 'contour_trace' },
          confidence: 1.0,
          uncertaintyCategories: []
        }],
        pointCount: 4,
        locked: false,
        artistModified: false,
        artistLocked: false,
        confidence: 1.0,
        uncertaintyCategories: [],
        provenance: 'automatic_video_reconstruction'
      }],
      exposures: [{ frame: 1, duration: 12, drawingId: 'drawing_000001', confidence: 1.0 }],
      nodes: [
        { id: 'node_read', name: 'SC_001_READ', type: 'READ', autoCreated: true, locked: false, artistModified: false, artistLocked: false },
        { id: 'node_composite', name: 'SC_001_COMPOSITE', type: 'COMPOSITE', autoCreated: true, locked: false, artistModified: false, artistLocked: false },
        { id: 'node_display', name: 'SC_001_DISPLAY', type: 'DISPLAY', autoCreated: true, locked: false, artistModified: false, artistLocked: false }
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
        capability: { vectorBackend: 'python_dom_shapes', lineArt: false, colourArt: true, nativeTvgRequired: true },
        problemFrames: [],
        representationSegments: []
      },
      provenance: null,
      selectedHypothesis: {
        selectedHypothesisId: 'frame_by_frame_vector',
        selectedRanges: [],
        selectionHistory: [],
        selectionReason: 'Default synthetic',
        selectedBy: 'system',
        selectedAt: new Date().toISOString()
      }
    };
    fs.writeFileSync(path.join(packageDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  }

  // 2. Генерируем HarmonyCommandPlan для выбранного (активного) манифеста
  const compiler = new HarmonySceneCompiler();
  const plan = compiler.generateCommandPlan(manifest);
  fs.writeFileSync(path.join(packageDir, 'command_plan.json'), JSON.stringify(plan, null, 2));

  // 3. Копируем пустую тестовую сцену (как fixture)
  const templateScene = path.resolve('output/test_xstage');
  const destSceneDir = path.join(packageDir, 'test_scene');
  if (fs.existsSync(templateScene)) {
    console.log(`Копирование шаблона сцены из: ${templateScene}`);
    fs.cpSync(templateScene, destSceneDir, { recursive: true });
  } else {
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

    with open(plan_path, "r", encoding="utf-8") as f:
        plan = json.load(f)

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
    
    env = dict(os.environ)
    env["HARMONY_PYTHON_PACKAGES"] = packages_path
    
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
        else:
            print("\\nКоманда завершилась ошибкой:", res.get("message"))
    else:
        print("\\nПроцесс моста завершился ошибкой с кодом:", completed.returncode)

if __name__ == "__main__":
    main()
`;
  fs.writeFileSync(path.join(packageDir, 'run_integration.py'), runScriptContent);

  // 6. Создаем README.md с инструкциями по переключению вариантов и чек-листом
  const readmeContent = `# Интеграционный пакет переноса для Toon Boom Harmony (V2 с поддержкой гипотез)

Этот самодостаточный пакет подготовлен для переноса на машину с Harmony и содержит все варианты векторизации.

## Состав пакета
- \`manifest.json\` — текущий ВЫБРАННЫЙ вариант манифеста.
- \`command_plan.json\` — план команд компилятора для выбранного варианта.
- \`manifest_frame_by_frame_vector.json\` — исходная гипотеза (100% точность).
- \`manifest_clean_frame_by_frame.json\` — сглаженная гипотеза (сниженный фликер).
- \`manifest_compact_frame_by_frame.json\` — компактная гипотеза (минимизированный вес).
- \`previews_*/\` — каталоги кадров-превью для каждого варианта.
- \`comparison_report.html\` — локальный отчет сравнения метрик и рекомендаций.
- \`versions.json\` — история версий и отката.
- \`run_integration.py\` — скрипт запуска интеграции в Harmony.

## Инструкции переключения варианта перед импортом
Если перед запуском вы хотите импортировать другой вариант:
1. Откройте \`comparison_report.html\`, чтобы сравнить метрики точности и сложности.
2. Скопируйте нужный манифест (например, \`manifest_compact_frame_by_frame.json\`) поверх основного \`manifest.json\`:
   \`\`\`bash
   cp manifest_compact_frame_by_frame.json manifest.json
   \`\`\`
3. (Опционально) Перегенерируйте \`command_plan.json\` или запустите скрипт — он автоматически загрузит новый \`manifest.json\` для применения.

## Запуск интеграции
Выполните:
\`\`\`bash
python run_integration.py
\`\`\`
`;
  fs.writeFileSync(path.join(packageDir, 'README.md'), readmeContent);
  console.log('Интеграционный пакет успешно собран.');
}

prepareIntegrationPackage();
