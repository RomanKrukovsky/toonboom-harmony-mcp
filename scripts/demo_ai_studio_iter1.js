#!/usr/bin/env node
/**
 * AI Animation Studio — Iteration 1 demo (Master Prompt §28).
 *
 * Mandatory end-to-end pipeline without Harmony:
 *   script + dialogue + characters
 *     → SceneUnderstanding
 *     → 3 Director variants (restrained_dialogue / commercial_dynamic / dramatic_closeup)
 *     → HTML report at output/ai_studio/iteration1_demo_report.html
 *
 * Run:
 *   npm run demo:ai_studio_iter1
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { SceneUnderstandingEngine } from '../dist/adapters/sceneUnderstanding/index.js';
import { ScriptDirector } from '../dist/adapters/scriptDirector/index.js';
import { SceneIntelligenceReportBuilder } from '../dist/adapters/sceneIntelligenceReport/index.js';

const DEMO_SCRIPT = `Masha: Ты действительно думал, что я ничего не узнаю?
Ivan: Я… нет, я ничего не скрывал.
Masha: Молчи. Я видела тебя у двери.`;

const DIALOGUE = [
  { speaker: 'Masha', text: 'Ты действительно думал, что я ничего не узнаю?', startSec: 0.3, endSec: 3.6 },
  { speaker: 'Ivan', text: 'Я… нет, я ничего не скрывал.', startSec: 3.9, endSec: 5.7 },
  { speaker: 'Masha', text: 'Молчи. Я видела тебя у двери.', startSec: 6.4, endSec: 8.8 }
];

function main() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const outDir = path.resolve(here, '..', 'output', 'ai_studio');
  fs.mkdirSync(outDir, { recursive: true });

  const engine = new SceneUnderstandingEngine();
  const scene = engine.analyze({
    script: DEMO_SCRIPT,
    sceneName: 'Interrogation',
    sceneId: 'iteration1_demo',
    fps: 24,
    durationSeconds: 9,
    characters: [
      { name: 'Masha', role: 'protagonist', stance: 'standing', visibleOnScreen: true },
      { name: 'Ivan', role: 'antagonist', stance: 'standing', visibleOnScreen: true }
    ],
    dialogue: DIALOGUE,
    location: 'Комната с дверью слева',
    directorConstraints: ['Не урезать паузу перед репликой Masha в третьем бите']
  });

  const director = new ScriptDirector();
  const variants = director.generateVariants(scene, 3);
  const reportBuilder = new SceneIntelligenceReportBuilder();
  const reportPath = reportBuilder.buildToFile(
    { scene, variantSet: variants },
    path.join(outDir, 'iteration1_demo_report.html')
  );

  console.log('══════════════════════════════════════════════════════════════════');
  console.log('  AI ANIMATION STUDIO — ITERATION 1: SCENE INTELLIGENCE');
  console.log('══════════════════════════════════════════════════════════════════');
  console.log(`Scene:           ${scene.sceneName}  (${scene.sceneId})`);
  console.log(`Duration:        ${scene.totalDurationSeconds.toFixed(2)}s  (${scene.startFrame}–${scene.endFrame} @ ${scene.fps}fps)`);
  console.log(`Scene intent:    ${scene.sceneIntent}  (confidence ${(scene.sceneIntentConfidence * 100).toFixed(0)}%)`);
  console.log(`Characters:      ${scene.characters.map((c) => c.name).join(', ')}`);
  console.log(`Beats:           ${scene.beats.length}`);
  console.log(`Emotion samples: ${scene.emotionCurve.length}`);
  console.log(`Assumptions:     ${scene.assumptions.length}`);
  console.log(`Uncertainties:   ${scene.uncertainties.length}`);
  console.log('─'.repeat(64));
  console.log('Beats:');
  for (const b of scene.beats) {
    const reactor = scene.characters.find((c) => c.characterId === b.reactionTarget)?.name ?? '—';
    console.log(
      `  ${b.beatId}  t=${b.startTime.toFixed(2)}–${b.endTime.toFixed(2)}s  ` +
      `${b.primaryCharacter} → intent='${b.intent}'  emotion='${b.emotion}'  ` +
      `action='${b.action}'  imp=${(b.importance * 100).toFixed(0)}%  → react ${reactor}`
    );
  }
  console.log('─'.repeat(64));
  console.log(`Director variants: ${variants.variants.length}`);
  for (const v of variants.variants) {
    console.log(
      `  [${v.strategy}]  ${v.shotCount} shots, ${v.reactionShotCount} reaction shots, ` +
      `${v.totalDurationFrames}f total, confidence ${(v.confidence * 100).toFixed(0)}%`
    );
    for (const s of v.shots) {
      console.log(
        `    ${s.shotId}  beat=${s.beatId ?? '—'}  ${s.framing}/${s.cameraMove}  ` +
        `${s.startFrame}–${s.endFrame}  focus=${s.primaryFocusCharacterId}  stag=${s.staging}`
      );
    }
  }
  console.log('─'.repeat(64));
  console.log(`HTML report: ${reportPath}`);
  console.log('══════════════════════════════════════════════════════════════════');
  console.log('  STATUS:  pipelineBuilt=true  manifestGenerated=false  harmonyApplied=false');
  console.log('  Honest limitation: this iteration produces scene understanding + director');
  console.log('  variants only. Key poses, motion, and Harmony native TVG are Iteration 2+.');
  console.log('══════════════════════════════════════════════════════════════════');
}

main();