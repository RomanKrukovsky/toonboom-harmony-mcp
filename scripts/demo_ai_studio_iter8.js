#!/usr/bin/env node
/**
 * Iteration 8 Demo: Harmony Native Build
 *
 * Demonstrates:
 * - Compile Harmony Manifest V3 from AI Studio outputs
 * - Generate Command Plan V3 (whitelist-only operations)
 * - Create Portable Integration Package
 * - Apply Manifest to Harmony (simulated - no real Harmony required)
 * - Native audit verification
 */

import { HarmonyManifestV3Compiler } from '../dist/adapters/harmonyManifestV3/index.js';
import { HarmonyCommandPlanV3Generator } from '../dist/adapters/harmonyCommandPlanV3Generator/index.js';
import { PortableIntegrationPackageGenerator } from '../dist/adapters/portableIntegrationPackage/index.js';
import { harmonyManifestV3Schema } from '../dist/schemas/harmonyManifestV3.js';
import { commandPlanV3Schema } from '../dist/schemas/harmonyCommandPlanV3.js';
import fs from 'fs';
import path from 'path';

const outputDir = path.join(process.cwd(), 'output', 'iteration8');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('🎬 Iteration 8 Demo: Harmony Native Build\n');

// Step 1: Compile Harmony Manifest V3
console.log('Step 1: Compiling Harmony Manifest V3...');

const manifestCompiler = new HarmonyManifestV3Compiler();

const mockSceneUnderstanding = {
  schemaVersion: '1.0',
  sceneId: 'scene_01',
  sceneName: 'Test Scene',
  sourceScript: 'Test script',
  totalDurationSeconds: 6,
  endFrame: 144,
  sceneIntent: 'Character A accuses Character B',
  sceneIntentConfidence: 0.8,
  characters: [
    { characterId: 'c1', name: 'Masha', goalInScene: 'Accuse', emotionalArc: 'calm -> tense', hasDialogue: true, role: 'protagonist', stance: 'standing', visibleOnScreen: true },
    { characterId: 'c2', name: 'Ivan', goalInScene: 'Defend', emotionalArc: 'calm -> defensive', hasDialogue: true, role: 'antagonist', stance: 'standing', visibleOnScreen: true }
  ],
  beats: [
    { beatId: 'beat_1', startTime: 0, endTime: 2, primaryCharacter: 'c1', intent: 'accuse', emotion: 'controlled_anger', action: 'points_to_door', importance: 0.9 },
    { beatId: 'beat_2', startTime: 2, endTime: 4, primaryCharacter: 'c2', intent: 'defend', emotion: 'surprised', action: 'steps_back', importance: 0.7, reactionTarget: 'c1' },
    { beatId: 'beat_3', startTime: 4, endTime: 6, primaryCharacter: 'c1', intent: 'reveal', emotion: 'resolute', action: 'holds_evidence', importance: 1.0 }
  ],
  provenance: { engine: 'rule_based SceneUnderstandingEngine v1', createdAt: new Date().toISOString() }
};

const mockKeyPoses = {
  schemaVersion: '1.0',
  sceneId: 'scene_01',
  poseCount: 4,
  createdAt: new Date().toISOString(),
  poses: [
    { poseId: 'p1', characterId: 'c1', frame: 1, type: 'AnticipationPose', confidence: 0.85, description: 'Masha leans forward, pointing', mode: 'generated_pose', provenance: 'demo', features: { storytellingPose: 'accusation', silhouetteQuality: 0.8, lineOfAction: 'C-curve', balance: 'forward', weightDistribution: 'front_heavy', facialExpression: 'determined', handShape: 'pointing', gazeDirection: 'at_ivan', relationToCamera: 'facing' } },
    { poseId: 'p2', characterId: 'c1', frame: 48, type: 'KeyPose', confidence: 0.9, description: 'Masha holds evidence', mode: 'generated_pose', provenance: 'demo', features: { storytellingPose: 'revelation', silhouetteQuality: 0.85, lineOfAction: 'straight', balance: 'centered', weightDistribution: 'even', facialExpression: 'serious', handShape: 'holding', gazeDirection: 'at_evidence', relationToCamera: 'three_quarter' } },
    { poseId: 'p3', characterId: 'c2', frame: 96, type: 'OvershootPose', confidence: 0.8, description: 'Ivan recoils', mode: 'generated_pose', provenance: 'demo', features: { storytellingPose: 'shock', silhouetteQuality: 0.75, lineOfAction: 'reverse_C', balance: 'off_center', weightDistribution: 'back_heavy', facialExpression: 'surprised', handShape: 'open', gazeDirection: 'at_evidence', relationToCamera: 'profile' } },
    { poseId: 'p4', characterId: 'c1', frame: 144, type: 'SettlePose', confidence: 0.85, description: 'Masha stands firm', mode: 'generated_pose', provenance: 'demo', features: { storytellingPose: 'resolution', silhouetteQuality: 0.8, lineOfAction: 'vertical', balance: 'stable', weightDistribution: 'even', facialExpression: 'calm', handShape: 'relaxed', gazeDirection: 'at_ivan', relationToCamera: 'facing' } }
  ]
};

const mockCameraLayout = {
  schemaVersion: '1.0',
  sceneId: 'scene_01',
  shots: [
    { shotId: 'shot_1', sceneId: 'scene_01', beatIds: ['beat_1'], characterIds: ['c1', 'c2'], startTime: 0, endTime: 2, duration: 2, shotSize: 'medium_shot', cameraPosition: { x: 0, y: 0, z: 12 }, cameraScale: 1, cameraMovement: 'static', framingRules: ['rule_of_thirds', 'headroom', 'look_room'], focusOfAttention: { x: 0, y: 0 }, safeMargins: { top: 0.1, bottom: 0.1, left: 0.1, right: 0.1 }, eyelines: [{ fromCharacterId: 'c1', toCharacterId: 'c2', direction: 0 }], continuityNotes: ['Establish spatial relationship'], confidence: 0.85, explanation: 'Two-shot for confrontation' },
    { shotId: 'shot_2', sceneId: 'scene_01', beatIds: ['beat_2'], characterIds: ['c2'], startTime: 2, endTime: 4, duration: 2, shotSize: 'close_up', cameraPosition: { x: 0, y: 0, z: 8 }, cameraScale: 1.5, cameraMovement: 'dolly_in', framingRules: ['rule_of_thirds', 'headroom'], focusOfAttention: { x: 0, y: 0 }, safeMargins: { top: 0.1, bottom: 0.1, left: 0.1, right: 0.1 }, eyelines: [{ fromCharacterId: 'c2', toCharacterId: 'c1', direction: 180 }], continuityNotes: ['Dolly in on Ivan reaction'], confidence: 0.8, explanation: 'Close-up on reaction' },
    { shotId: 'shot_3', sceneId: 'scene_01', beatIds: ['beat_3'], characterIds: ['c1'], startTime: 4, endTime: 6, duration: 2, shotSize: 'medium_close_up', cameraPosition: { x: -2, y: 0, z: 10 }, cameraScale: 1.2, cameraMovement: 'static', framingRules: ['rule_of_thirds', 'leading_space'], focusOfAttention: { x: 0, y: 0 }, safeMargins: { top: 0.1, bottom: 0.1, left: 0.1, right: 0.1 }, eyelines: [{ fromCharacterId: 'c1', toCharacterId: 'c2', direction: 0 }], continuityNotes: ['Masha holds evidence'], confidence: 0.9, explanation: 'Reveal shot' }
  ],
  cameraTrack: {
    trackId: 'cam_1', sceneId: 'scene_01', movementType: 'static',
    keyframes: [
      { frame: 1, position: { x: 0, y: 0, z: 12 }, rotation: 0, scale: 1, interpolation: 'ease_in_out' },
      { frame: 48, position: { x: 0, y: 0, z: 8 }, rotation: 0, scale: 1.5, interpolation: 'ease_in_out' },
      { frame: 144, position: { x: -2, y: 0, z: 10 }, rotation: 0, scale: 1.2, interpolation: 'ease_in_out' }
    ],
    totalDuration: 6
  },
  blockingPlans: [
    { planId: 'block_1', sceneId: 'scene_01', shotId: 'shot_1', positions: [
      { characterId: 'c1', position: { x: -3, y: 0 }, preset: 'left', scale: 1, facing: 15 },
      { characterId: 'c2', position: { x: 3, y: 0 }, preset: 'right', scale: 1, facing: -15 }
    ], continuityConstraints: ['Maintain eye line'] }
  ],
  summary: { totalShots: 3, averageShotDuration: 2, cameraMovements: { static: 2, dolly_in: 1 }, shotSizes: { medium_shot: 1, close_up: 1, medium_close_up: 1 }, totalKeyframes: 3 },
  provenance: { engine: 'rule_based CameraLayoutDirector v1', createdAt: new Date().toISOString(), method: 'rule_based' }
};

const manifest = manifestCompiler.compile({
  sceneId: 'scene_01',
  sceneUnderstanding: mockSceneUnderstanding,
  keyPoses: mockKeyPoses,
  cameraLayout: mockCameraLayout,
  iterations: [1, 2, 3, 4, 5, 6, 7, 8]
});

console.log(`✓ Manifest compiled: ${manifest.manifestId}`);
console.log(`  Scene ID: ${manifest.sceneId}`);
console.log(`  Schema Version: ${manifest.schemaVersion}`);
console.log(`  Key Poses: ${manifest.keyPoses?.poses?.length || 0}`);
console.log(`  Camera Shots: ${manifest.cameraLayout?.shots?.length || 0}`);
console.log(`  Motion Tracks: ${manifest.motionTracks?.length || 0}`);
console.log(`  Drawings: ${manifest.drawings?.length || 0}`);
console.log(`  Palettes: ${manifest.palettes?.length || 0}`);

// Validate with Zod
const manifestValidation = harmonyManifestV3Schema.safeParse(manifest);
console.log(`  Zod Validation: ${manifestValidation.success ? 'PASS' : 'FAIL'}`);

// Step 2: Generate Command Plan V3
console.log('\nStep 2: Generating Command Plan V3...');

const commandPlanGenerator = new HarmonyCommandPlanV3Generator();
const commandPlan = commandPlanGenerator.generate(manifest);

console.log(`✓ Command Plan generated: ${commandPlan.planId}`);
console.log(`  Manifest ID: ${commandPlan.manifestId}`);
console.log(`  Total Operations: ${commandPlan.totalOperations}`);
console.log(`  Estimated Execution Time: ${commandPlan.estimatedExecutionTimeMs}ms`);
console.log(`  Requires Harmony: ${commandPlan.requiresHarmony}`);
console.log(`  Whitelist Only: ${commandPlan.whitelistOnly}`);

// Validate with Zod
const planValidation = commandPlanV3Schema.safeParse(commandPlan);
console.log(`  Zod Validation: ${planValidation.success ? 'PASS' : 'FAIL'}`);

// Show operation breakdown
const opCounts = commandPlan.operations.reduce((acc, op) => {
  acc[op.operation] = (acc[op.operation] || 0) + 1;
  return acc;
}, {});
console.log('  Operations:');
for (const [op, count] of Object.entries(opCounts)) {
  console.log(`    ${op}: ${count}`);
}

// Step 3: Generate Portable Integration Package
console.log('\nStep 3: Generating Portable Integration Package...');

const packageGenerator = new PortableIntegrationPackageGenerator();
const packageResult = await packageGenerator.generate({
  manifest,
  commandPlan,
  outputDir,
  packageName: 'scene_01_harmony_package'
});

console.log(`✓ Package generated at: ${packageResult.packagePath}`);
console.log(`  Files: ${packageResult.files.length}`);
console.log(`  Total Size: ${packageResult.totalSize} bytes`);

// List generated files
for (const file of packageResult.files) {
  const relPath = path.relative(packageResult.packagePath, file);
  console.log(`  - ${relPath}`);
}

// Step 4: Read and verify package contents
console.log('\nStep 4: Verifying Package Contents...');

const manifestPath = path.join(packageResult.packagePath, 'manifest', 'harmony_manifest_v3.json');
const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
const parsedManifest = JSON.parse(manifestContent);
console.log(`✓ Manifest verified: ${parsedManifest.manifestId}`);

const planPath = path.join(packageResult.packagePath, 'command_plan', 'harmony_command_plan_v3.json');
const planContent = fs.readFileSync(planPath, 'utf-8');
const parsedPlan = JSON.parse(planContent);
console.log(`✓ Command Plan verified: ${parsedPlan.planId} (${parsedPlan.totalOperations} ops)`);

const readmePath = path.join(packageResult.packagePath, 'README.md');
const readmeContent = fs.readFileSync(readmePath, 'utf-8');
console.log(`✓ README generated (${readmeContent.length} chars)`);

// Step 5: Simulate applying to Harmony (without real Harmony)
console.log('\nStep 5: Simulating Apply to Harmony...');

console.log('  Since no real Harmony instance is available, this simulates:');
console.log('  1. Loading manifest and command plan');
console.log('  2. Executing whitelist operations in order');
console.log('  3. Generating native audit');
console.log('  4. Verifying vector type, palette linkage, exposure timing, editable geometry');

const simulatedAudit = {
  status: 'success',
  verified: true,
  nativeAudit: {
    elementId: 'element_001',
    vectorType: 'TVG',
    drawingCount: 4,
    nonemptyDrawingCount: 4,
    colourArtStrokeCount: 12,
    lineArtStrokeCount: 8,
    paletteName: 'scene_01_palette',
    paletteColorCount: 8,
    paletteLinked: true,
    exposureFrameCount: 144,
    exposureTimingMatches: true,
    actualExposureDrawings: ['p1', 'p2', 'p3', 'p4'],
    expectedExposureDrawings: ['p1', 'p2', 'p3', 'p4'],
    repeatedDrawingsReused: true,
    nodeExists: true,
    compositeExists: true,
    displayExists: true,
    writeExists: true,
    readToCompositeLinked: true,
    compositeToDisplayLinked: true,
    compositeToWriteLinked: true,
    editableVectorGeometry: true,
    colourArtVerified: true,
    externalRasterUsedAsDrawing: false,
    externalSvgUsedAsFinal: false
  }
};

console.log('\n  Simulated Native Audit Results:');
console.log(`    Vector Type: ${simulatedAudit.nativeAudit.vectorType}`);
console.log(`    Drawing Count: ${simulatedAudit.nativeAudit.drawingCount}`);
console.log(`    Non-empty Drawings: ${simulatedAudit.nativeAudit.nonemptyDrawingCount}`);
console.log(`    Palette Linked: ${simulatedAudit.nativeAudit.paletteLinked}`);
console.log(`    Exposure Timing Matches: ${simulatedAudit.nativeAudit.exposureTimingMatches}`);
console.log(`    Editable Vector Geometry: ${simulatedAudit.nativeAudit.editableVectorGeometry}`);
console.log(`    Verified: ${simulatedAudit.verified ? 'YES ✓' : 'NO ✗'}`);

// Step 6: Summary
console.log('\n═══════════════════════════════════════════════════');
console.log('Iteration 8 Demo Complete!');
console.log('═══════════════════════════════════════════════════');
console.log('\nOutputs:');
console.log(`  Manifest: ${manifestPath}`);
console.log(`  Command Plan: ${planPath}`);
console.log(`  Package: ${packageResult.packagePath}`);
console.log('\nHonest Status:');
console.log('  pipelineBuilt: true');
console.log('  manifestGenerated: true');
console.log('  commandPlanGenerated: true');
console.log('  localPreviewGenerated: true');
console.log('  harmonyAvailable: false');
console.log('  harmonyApplied: false');
console.log('  nativeDrawingVerified: false');
console.log('  previewRenderedByHarmony: false');
console.log('  status: ready_for_external_harmony_integration');