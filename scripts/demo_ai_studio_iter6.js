#!/usr/bin/env node
/**
 * Iteration 6 Demo: Camera & Layout
 *
 * Demonstrates the complete camera and layout planning pipeline:
 * - SceneUnderstanding → CameraLayoutDirector → ShotPlan + CameraTrack + BlockingPlan
 * - Generates HTML report with shot breakdown and camera movements
 */

import { SceneUnderstandingEngine } from '../dist/adapters/sceneUnderstanding/index.js';
import { CameraLayoutDirector } from '../dist/adapters/cameraLayoutDirector/index.js';
import { generateCameraLayoutReport } from '../dist/adapters/cameraLayoutReport/index.js';
import fs from 'fs';
import path from 'path';

const outputDir = path.join(process.cwd(), 'output', 'iteration6');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('🎬 Iteration 6 Demo: Camera & Layout\n');

// Step 1: Create SceneUnderstanding
console.log('Step 1: Analyzing scene...');
const engine = new SceneUnderstandingEngine();

const script = `
INT. OFFICE - DAY

Masha enters the room, looking determined.

MASHA
I found the documents you hid.

Ivan looks up, surprised.

IVAN
What are you talking about?

MASHA
Don't play dumb. The contract with fake signatures.

IVAN
(defensive)
I can explain...

MASHA
There's nothing to explain. You forged them.

Ivan stands up, angry.

IVAN
You have no proof!

MASHA
(calm)
I have the original. And it has your fingerprints.

Ivan sinks back into his chair, defeated.
`;

const characters = [
  { characterId: 'masha', name: 'Masha', role: 'protagonist', stance: 'standing', visibleOnScreen: true },
  { characterId: 'ivan', name: 'Ivan', role: 'antagonist', stance: 'standing', visibleOnScreen: true }
];

const sceneUnderstanding = engine.analyze({ script, characters });
console.log(`✓ SceneUnderstanding created: ${sceneUnderstanding.beats.length} beats\n`);

// Step 2: Generate Camera Layout Plan
console.log('Step 2: Planning camera and layout...');
const director = new CameraLayoutDirector();

const cameraLayoutPlan = director.generate({
  sceneUnderstanding,
  fps: 24,
  style: 'dramatic'
});

console.log(`✓ CameraLayoutPlan created:`);
console.log(`  - ${cameraLayoutPlan.shots.length} shots`);
console.log(`  - ${cameraLayoutPlan.cameraTrack.keyframes.length} camera keyframes`);
console.log(`  - ${cameraLayoutPlan.blockingPlans.length} blocking plans`);
console.log(`  - Average shot duration: ${cameraLayoutPlan.summary.averageShotDuration.toFixed(2)}s`);
console.log(`  - Camera movements: ${Object.keys(cameraLayoutPlan.summary.cameraMovements).join(', ')}\n`);

// Step 3: Generate HTML report
console.log('Step 3: Generating HTML report...');
const report = generateCameraLayoutReport(cameraLayoutPlan);
const reportPath = path.join(outputDir, 'camera_layout_report.html');
fs.writeFileSync(reportPath, report);
console.log(`✓ Report saved to: ${reportPath}\n`);

// Step 4: Save JSON artifacts
console.log('Step 4: Saving JSON artifacts...');
const planPath = path.join(outputDir, 'camera_layout_plan.json');
fs.writeFileSync(planPath, JSON.stringify(cameraLayoutPlan, null, 2));
console.log(`✓ Plan saved to: ${planPath}\n`);

// Summary
console.log('═══════════════════════════════════════════════════');
console.log('Iteration 6 Demo Complete!');
console.log('═══════════════════════════════════════════════════');
console.log('\nGenerated files:');
console.log(`  📄 ${reportPath}`);
console.log(`  📋 ${planPath}`);
console.log('\nCamera Layout Summary:');
console.log(`  🎥 Total shots: ${cameraLayoutPlan.summary.totalShots}`);
console.log(`  ⏱️  Average duration: ${cameraLayoutPlan.summary.averageShotDuration.toFixed(2)}s`);
console.log(`  🎬 Camera movements: ${Object.entries(cameraLayoutPlan.summary.cameraMovements).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
console.log(`  📐 Shot sizes: ${Object.entries(cameraLayoutPlan.summary.shotSizes).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
console.log(`  🔑 Total keyframes: ${cameraLayoutPlan.summary.totalKeyframes}`);
console.log('\n✨ Next: Iteration 7 - Animation Critic\n');
