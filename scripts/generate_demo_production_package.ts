import path from 'path';
import { AutonomousStudioOrchestrator } from '../src/orchestrators/autonomousStudio/index.js';

async function main() {
  const orchestrator = new AutonomousStudioOrchestrator();
  const demoPrompt = "Создай 45-секундную оригинальную комедийную сцену. Два персонажа находятся в небольшой космической мастерской. Молодой механик пытается починить говорящего робота, но робот считает, что механик сам нуждается в ремонте. Используй ограниченную телевизионную 2D-анимацию, три плана камеры, липсинк, простую жестикуляцию, одну реакционную сцену, движение камеры и финальный звуковой эффект.";

  const outputRoot = path.join(process.cwd(), 'examples');
  
  console.log('[Demo Runner] Starting production run for demo...');
  const res = await orchestrator.runProduction({
    prompt: demoPrompt,
    projectName: 'autonomous_episode_demo',
    outputRoot,
    engineMode: 'simulation',
    durationSeconds: 45,
    episodeCount: 1,
    targetAudience: 'general',
    genre: 'comedy',
    visualStyle: 'limited_tv_2d',
    animationStyle: 'cutout',
    resolution: { width: 1920, height: 1080 },
    fps: 24,
    aspectRatio: '16:9',
    language: 'ru',
    qualityPreset: 'broadcast',
    budgetPreset: 'tv_series',
    deadlinePreset: 'balanced',
    allowGeneratedAssets: true,
    allowPlaceholderAssets: true,
    allowUiAutomation: false,
    allowExperimentalOperations: false,
    maximumIterations: 3,
    humanApprovalPolicy: 'approve_critical'
  });

  console.log('[Demo Runner] Production run completed!');
  console.log('Result Status:', res.status);
  console.log('Correlation ID:', res.correlationId);
  console.log('Artifacts created:', res.artifacts.length);
}

main().catch(err => {
  console.error('[Demo Runner Error]:', err);
  process.exit(1);
});
