import fs from 'fs';
import path from 'path';
import { RealSceneExecutor } from '../src/adapters/realSceneExecutor/index.js';
import { RenderOutputValidator } from '../src/adapters/renderValidator/index.js';

async function main() {
  console.log('=== REAL HARMONY SINGLE SLICE VERIFICATION ===');
  
  const outputDir = path.join(process.cwd(), 'output', 'real_harmony_slice');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // 1. Create real test character and background PNGs (100x100 pixels)
  const bgPath = path.join(outputDir, 'background_real.png');
  const charPath = path.join(outputDir, 'character_real.png');

  // Minimal valid 1x1 PNGs
  const pngBuffer = Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C63000100000500010D0A2DB40000000049454E44AE426082', 'hex');
  fs.writeFileSync(bgPath, pngBuffer);
  fs.writeFileSync(charPath, pngBuffer);

  const scenePlan = {
    sceneId: 'VERIFY_SCENE_001',
    sceneName: 'VERIFY_SCENE_001',
    durationFrames: 48,
    fps: 24,
    background: { file: bgPath },
    characters: [
      { name: 'HeroReal', positionPreset: 'center', scale: 1.0 }
    ],
    camera: { preset: 'slow_push_in' }
  };

  const projectPath = path.join(outputDir, 'harmony_project', 'VERIFY_SCENE_001.xstage');

  console.log('[Slice Verification] Executing RealSceneExecutor in REAL mode...');
  const executor = new RealSceneExecutor();
  const res = await executor.executeScenePlan(scenePlan, {
    mode: 'real',
    projectPath,
    outputDir
  });

  console.log('\n--- VERIFICATION RESULT ---');
  console.log('Mode:', res.mode);
  console.log('Is Real Harmony Execution:', res.isRealHarmonyExecution);
  console.log('Success Status:', res.ok);
  console.log('Performed Steps:', res.performedSteps);
  console.log('Skipped Steps:', res.skippedSteps);
  console.log('Warnings:', res.warnings);
  console.log('Nodes Created:', res.nodesCreated);
  console.log('Connections Created:', res.connectionsCreated);
  console.log('Keyframes Created:', res.keyframesCreated);

  console.log('\n--- PROJECT FILE VERIFICATION ---');
  const projectExists = fs.existsSync(projectPath);
  console.log('Project .xstage file path:', projectPath);
  console.log('Project .xstage exists:', projectExists);

  if (res.preview?.path) {
    console.log('\n--- RENDER OUTPUT VALIDATION ---');
    console.log('Preview Path:', res.preview.path);
    console.log('Rendered:', res.preview.rendered);
    console.log('File Exists:', res.preview.fileExists);
    console.log('File Size (bytes):', res.preview.fileSizeBytes);

    const validator = new RenderOutputValidator();
    const valResult = validator.validate(res.preview.path, 'harmony_cli');
    console.log('Validator Details:', valResult);
  }

  if (res.error) {
    console.error('\n[Error Details]:', res.error);
  }
}

main().catch(err => {
  console.error('[Slice Verification Error]:', err);
  process.exit(1);
});
