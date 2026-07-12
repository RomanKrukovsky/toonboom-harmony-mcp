#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DigitalActorRegistry } from '../dist/adapters/digitalActorRegistry/index.js';
import { KeyPoseGenerator } from '../dist/adapters/keyPoseGenerator/index.js';
import { MotionSynthesizer } from '../dist/adapters/motionSynthesizer/index.js';
import { SceneUnderstandingEngine } from '../dist/adapters/sceneUnderstanding/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = path.join(root, 'output', 'factory');

fs.mkdirSync(out, { recursive: true });

console.log('=== AI ANIMATION STUDIO — ITERATION 4: KEY POSES & MOTION DEMO ===\n');

// 1. Initialize registry and load Masha
const registry = new DigitalActorRegistry(out);
let actor;
try {
  actor = registry.getActor('actor_masha');
} catch (e) {
  // If not registered, create a quick mock actor
  const mockActor = {
    schemaVersion: '3.0',
    actorId: 'actor_masha',
    identity: { name: 'Masha', description: 'Masha', tags: [] },
    modelSheets: [],
    palettes: [],
    masterDrawings: [
      { drawingId: 'head_front', name: 'head_front', path: 'head.png', inferred: false },
      { drawingId: 'torso_front', name: 'torso_front', path: 'torso.png', inferred: false }
    ],
    headViews: ['front'],
    bodyViews: ['front'],
    eyes: ['eyes'],
    brows: [],
    mouths: ['rest'],
    hands: [],
    props: [],
    pivots: [
      { partId: 'head', x: 0, y: 120, inferred: false },
      { partId: 'torso', x: 0, y: 50, inferred: false }
    ],
    hierarchy: [
      { partId: 'head', parentId: 'torso' },
      { partId: 'torso', parentId: null }
    ],
    deformRules: [],
    substitutions: [
      { partId: 'head', drawingId: 'head_front', name: 'front' },
      { partId: 'torso', drawingId: 'torso_front', name: 'front' }
    ],
    poseFamilies: [],
    gestureLibrary: [],
    actingProfile: { defaultStyle: 'restrained', tempoBias: 1.0, gestureRate: 0.5 },
    provenance: { importedFrom: 'test', importedAt: new Date().toISOString(), inferredParts: [] },
    origin: 'planned'
  };
  registry.register(mockActor);
  actor = registry.getActor('actor_masha');
}

// 2. Generate scene understanding
console.log('1. Analyzing scene dramatic beats...');
const sceneUnderstanding = new SceneUnderstandingEngine().analyze({
  script: 'Masha: Ты всё знал?',
  sceneId: 'sc_demo_iter4',
  sceneName: 'Dialogue Scene',
  fps: 24,
  durationSeconds: 5,
  characters: [
    { characterId: 'actor_masha', name: 'Masha', role: 'protagonist', stance: 'standing', visibleOnScreen: true }
  ],
  dialogue: [
    { speaker: 'Masha', text: 'Ты всё знал?', startSec: 1.0, endSec: 4.0 }
  ]
});
console.log(`- Scene: ${sceneUnderstanding.sceneName} (${sceneUnderstanding.fps} fps, duration ${sceneUnderstanding.totalDurationSeconds}s, endFrame: ${sceneUnderstanding.endFrame})`);

// 3. Generate mock Performance Plan with a gesture and a blink
const performancePlan = {
  schemaVersion: '1.0',
  planId: 'perf_demo_iter4',
  sceneId: 'sc_demo_iter4',
  characterId: 'actor_masha',
  style: 'restrained',
  styleDescription: 'Restrained dialogue style',
  events: [
    {
      eventId: 'evt_g1',
      kind: 'gesture',
      startTime: 1.5,
      endTime: 3.5,
      intensity: 0.8,
      target: null,
      bodyPart: 'arm_R',
      description: 'pointing finger',
      confidence: 0.9,
      provenance: 'style_rule',
      relatedBeatId: null,
      alternatives: []
    },
    {
      eventId: 'evt_b1',
      kind: 'blink',
      startTime: 0.8,
      endTime: 0.9,
      intensity: 0.6,
      target: null,
      bodyPart: 'eyes',
      description: 'eyelid blink',
      confidence: 0.95,
      provenance: 'text_rule',
      relatedBeatId: null,
      alternatives: []
    }
  ],
  eventCount: 2,
  confidence: 0.92,
  assumptions: [],
  provenance: { engine: 'rule_based PerformanceGenerator v1', createdAt: new Date().toISOString() }
};

// 4. Generate Key Poses
console.log('\n2. Planning Storytelling Key Poses...');
const keyPoseGenerator = new KeyPoseGenerator();
const poseSet = keyPoseGenerator.generate(sceneUnderstanding, performancePlan, actor);
console.log(`- Total Poses Planned: ${poseSet.poseCount}`);
for (const pose of poseSet.poses) {
  console.log(`  * Frame ${String(pose.frame).padStart(3)}: [${pose.type.padEnd(16)}] ${pose.description}`);
}

// 5. Synthesize Motion and interpolate curves
console.log('\n3. Interpolating curves and synthesizing motion tracks...');
const motionSynthesizer = new MotionSynthesizer();
const tolerance = 0.02; // Tolerance for key reduction
const motionPlan = motionSynthesizer.synthesize(sceneUnderstanding, poseSet, actor, tolerance);
console.log(`- Generated Transform Tracks: ${motionPlan.tracks.length}`);
console.log(`- Drawing Substitutions Count: ${motionPlan.drawingSubstitutions.length}`);
console.log(`- Exposure Blocks Count: ${motionPlan.exposureBlocks.length}`);

// Print key reduction metrics for torso rotation
const torsoRotTrack = motionPlan.tracks.find(t => t.partId === 'torso' && t.property === 'rotation');
if (torsoRotTrack && torsoRotTrack.keyReductionMetrics) {
  const m = torsoRotTrack.keyReductionMetrics;
  console.log('\n4. Keyframe Reduction Profile (Torso Rotation):');
  console.log(`- Original Dense Keyframes: ${m.originalKeyCount}`);
  console.log(`- Compressed/Reduced Keyframes: ${m.reducedKeyCount}`);
  console.log(`- Compression Ratio: ${m.compressionRatio}x`);
  console.log(`- Maximum Residual Error: ${m.maxError} (tolerance: ${tolerance})`);
}

// Save output
const outputFilePath = path.join(out, 'motion_synthesis_plan.json');
fs.writeFileSync(outputFilePath, JSON.stringify(motionPlan, null, 2));
console.log(`\n- Motion plan written to: ${outputFilePath}`);

console.log('\n=== STATUS & HONEST LIMITATIONS ===');
console.log('STATUS: keyPoseGenerator=true motionSynthesizer=true keyReduction=true bezierSplines=inferred');
console.log('LIMITATION: Timing is generated as pure 2D transform tracks. No 3D bone projection is applied.');
console.log('No active licensed Harmony is required for planning storytelling poses or synthesizing curves.');
