#!/usr/bin/env node
/**
 * Run final package lock for the moonshot demo.
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.join(__dirname, '../..'));

const DEMO_PROMPT = 'Сделай 2-минутную пилотную серию про нервного студента и безумного профессора в научной лаборатории. Стиль — высококачественная 2D/3D-hybrid телевизионная анимация, выразительная актёрка, динамичная камера, комедийный sci-fi тон.';

(async () => {
  const { onePromptTools } = await import(path.join(process.cwd(), 'dist/tools/onePromptTools.js'));
  const tool = onePromptTools.find(t => t.name === 'harmony.oneprompt.run_to_final_package');
  if (!tool) {
    console.error('Tool harmony.oneprompt.run_to_final_package not found');
    process.exit(1);
  }

  const outputDir = path.join(process.cwd(), 'examples/moonshot-demo/output');

  console.log('Finalizing and locking the production package...');
  const result = await tool.handler({
    prompt: DEMO_PROMPT,
    targetDurationMinutes: 2,
    outputDir,
    mode: 'moonshot',
    humanApproved: true
  });

  fs.writeFileSync(path.join(outputDir, '_demo_final_lock_result.json'), JSON.stringify(result, null, 2));

  console.log('Final package lock completed.');
  console.log('Status:', result.status);
  console.log('Locked:', result.locked);
  console.log('Lock Path:', result.lockPath);
  console.log('Truth:', result.truth);
})();
