#!/usr/bin/env node
/**
 * Moonshot demo — calls harmony.oneprompt.run_to_preview_episode directly
 * without spinning up the full MCP server.
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.join(__dirname, '../..'));

const DEMO_PROMPT = 'Сделай 2-минутную пилотную серию про нервного студента и безумного профессора в научной лаборатории. Стиль — высококачественная 2D/3D-hybrid телевизионная анимация, выразительная актёрка, динамичная камера, комедийный sci-fi тон.';

(async () => {
  const { onePromptTools } = await import(path.join(process.cwd(), 'dist/tools/onePromptTools.js'));
  const tool = onePromptTools.find(t => t.name === 'harmony.oneprompt.run_to_preview_episode');
  if (!tool) {
    console.error('Tool harmony.oneprompt.run_to_preview_episode not found');
    process.exit(1);
  }

  const outputDir = path.join(process.cwd(), 'examples/moonshot-demo/output');
  fs.mkdirSync(outputDir, { recursive: true });

  const result = await tool.handler({
    prompt: DEMO_PROMPT,
    targetDurationMinutes: 2,
    outputDir,
    mode: 'moonshot'
  });

  fs.writeFileSync(path.join(outputDir, '_demo_result.json'), JSON.stringify(result, null, 2));

  console.log('Moonshot demo completed.');
  console.log('Output directory:', result.outputDir);
  console.log('Scene plans:', result.scenePlanCount);
  console.log('Final score:', result.finalScore);
  console.log('Truth:', result.truth);
})();
