#!/usr/bin/env node

import fs from 'node:fs';

import { HarmonyPython } from '../dist/adapters/harmonyPython.js';
import { HarmonySceneCompiler } from '../dist/adapters/harmonySceneCompiler.js';
import { reconstructionManifestSchema } from '../dist/schemas/reconstruction.js';

const required = [
  'HARMONY_INTEGRATION_SCENE',
  'HARMONY_INTEGRATION_MANIFEST',
  'HARMONY_INTEGRATION_OUTPUT',
  'HARMONY_PYTHON_PACKAGES'
];
const missing = required.filter(name => !process.env[name]);
if (missing.length) throw new Error(`Не заданы обязательные переменные: ${missing.join(', ')}`);

// Каждый этап запускается отдельным Python-процессом. Audit и render не могут
// случайно использовать объекты DOM, оставшиеся после применения манифеста.
process.env.HARMONY_PERSISTENT_MODE = 'false';

try {
  const manifest = reconstructionManifestSchema.parse(JSON.parse(
    fs.readFileSync(process.env.HARMONY_INTEGRATION_MANIFEST, 'utf8')
  ));
  const detection = await HarmonyPython.runCommand('detect', {
    projectPath: process.env.HARMONY_INTEGRATION_SCENE
  });
  const capabilities = detection.capabilities ?? {};
  const requiredCapabilities = [
    'has_session',
    'has_open_project',
    'has_close_project',
    'has_drawing_access',
    'has_bezier_path',
    'has_vector_colour',
    'has_render_handler'
  ];
  const unavailable = requiredCapabilities.filter(name => capabilities[name] !== true);
  if (detection.status !== 'success' || unavailable.length) {
    throw new Error(`Установленная Harmony не поддерживает нужный Python DOM: ${unavailable.join(', ')}`);
  }
  const result = await new HarmonySceneCompiler().compile(manifest, {
    targetProjectPath: process.env.HARMONY_INTEGRATION_SCENE,
    outputProjectPath: process.env.HARMONY_INTEGRATION_OUTPUT,
    dryRun: false
  });
  if (!result.realSceneCreated || !result.editableNativeDrawings || !result.previewPaths?.length) {
    throw new Error(`Integration harness не получил проверенный реальный результат: ${JSON.stringify(result)}`);
  }
  console.log(JSON.stringify({ capabilities, ...result }, null, 2));
} finally {
  HarmonyPython.killDaemon();
}
