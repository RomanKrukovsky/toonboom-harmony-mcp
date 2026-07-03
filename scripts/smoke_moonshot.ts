import { onePromptTools } from '../src/tools/onePromptTools.js';

async function main() {
  const tool = onePromptTools.find(t => t.name === 'harmony.oneprompt.run_to_preview_episode');
  if (!tool) throw new Error('Tool not found');
  const r = await tool.handler({
    prompt: 'Сделай 2-минутную пилотную серию про нервного студента и безумного профессора в научной лаборатории.',
    targetDurationMinutes: 2,
    mode: 'moonshot',
    outputDir: '/tmp/moonshot_smoke'
  });
  console.log(JSON.stringify({ status: r.status, scenePlanCount: r.scenePlanCount, finalScore: r.finalScore, truth: r.truth }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
