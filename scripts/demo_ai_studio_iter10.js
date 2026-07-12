#!/usr/bin/env node
/**
 * Iteration 10 Demo: Studio Intelligence
 *
 * Demonstrates:
 * - Studio profiles (standard, high-end, TV series)
 * - Profile validation against manifests
 * - Artist correction engine integration
 * - Training dataset export
 */

import { StudioProfiler } from '../dist/adapters/studioProfiler/index.js';
import { ArtistCorrectionEngine } from '../dist/adapters/artistCorrectionEngine/index.js';
import fs from 'fs';
import path from 'path';

const outputDir = path.join(process.cwd(), 'output', 'iteration10');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('🏢 Iteration 10 Demo: Studio Intelligence\n');

// Step 1: Studio Profiler
console.log('Step 1: Loading Studio Profiles...');
const profiler = new StudioProfiler();
const allProfiles = profiler.getAllProfiles();

console.log(`✓ Loaded ${allProfiles.length} studio profiles:`);
for (const profile of allProfiles) {
  console.log(`  - ${profile.profileId}: ${profile.name}`);
  console.log(`    Editability priority: ${profile.editability.priority}`);
  console.log(`    Preferred representation: ${profile.editability.preferredRepresentation}`);
  console.log(`    Max deformers/part: ${profile.editability.maxDeformersPerPart}`);
  console.log(`    Requires TVG: ${profile.qualityThresholds?.requireVectorTypeTVG}`);
  console.log();
}

// Step 2: Validate a mock manifest against profiles
console.log('Step 2: Validating mock manifest against profiles...');

const mockManifest = {
  diagnostics: {
    capability: {
      vectorBackend: 'python_dom_shapes',
      lineArt: true,
      colourArt: true
    }
  },
  nodes: [
    { id: 'n1', name: 'peg_character', type: 'PEG' },
    { id: 'n2', name: 'drw_head', type: 'READ' }
  ]
};

for (const profile of allProfiles) {
  const validation = profiler.validateAgainstProfile(mockManifest, profile.profileId);
  console.log(`  ${profile.profileId}: ${validation.passed ? '✅ PASS' : '❌ FAIL'}`);
  if (!validation.passed) {
    for (const issue of validation.issues) {
      console.log(`    Issue: ${issue}`);
    }
  }
}
console.log();

// Step 3: Artist Correction Engine
console.log('Step 3: Artist Correction Engine...\n');

const correctionEngine = new ArtistCorrectionEngine(path.join(outputDir, 'artist_corrections.json'));

// Record a correction
const correction = correctionEngine.recordCorrection({
  sceneId: 'scene_01',
  versionBefore: 'v1',
  versionAfter: 'v2',
  delta: {
    'keyPoses.poses[0].features.silhouetteQuality': { before: 0.7, after: 0.85 },
    'keyPoses.poses[1].features.balance': { before: 'forward', after: 'centered' }
  },
  comment: 'Adjusted pose to improve silhouette clarity',
  scope: 'key_poses',
  type: 'keyframe_value',
  affectedParts: ['character_head', 'character_torso'],
  affectedFrames: [1, 48],
  chosenRepresentation: 'peg_transform',
  timeSpentMinutes: 15
});

console.log(`✓ Recorded correction: ${correction.correctionId}`);
console.log(`  Scene: ${correction.sceneId}`);
console.log(`  Scope: ${correction.scope}`);
console.log(`  Accepted: ${correction.accepted}\n`);

// Record pairwise preference
const preference = correctionEngine.recordPreference({
  sceneId: 'scene_01',
  versionA: 'v1_restrained',
  versionB: 'v2_dramatic',
  preferredVersion: 'v1_restrained',
  criteria: ['Better pose readability', 'More natural timing'],
  confidence: 0.9
});

console.log(`✓ Recorded preference: ${preference.preferenceId}`);
console.log(`  Preferred: ${preference.preferredVariant} (score: ${preference.score})\n`);

// Detect changes between versions
const v1 = { keyPoses: { poses: [{ poseId: 'p1', features: { silhouetteQuality: 0.7 } }] } };
const v2 = { keyPoses: { poses: [{ poseId: 'p1', features: { silhouetteQuality: 0.85 } }] } };
const delta = correctionEngine.detectChanges(v1, v2);
console.log(`✓ Detected ${Object.keys(delta).length} changes between versions`);
console.log(`  Delta:`, JSON.stringify(delta, null, 2).substring(0, 200) + '...\n');

// Preview propagation
const propagated = correctionEngine.previewPropagation(correction, v1);
console.log(`✓ Preview propagation shows changes applied to target manifest\n`);

// Step 4: Lock/Unlock/Revert
console.log('Step 4: Correction workflow...');

correctionEngine.lockCorrection(correction.correctionId);
console.log(`✓ Locked correction ${correction.correctionId}`);

// Unlock
correctionEngine.unlockCorrection(correction.correctionId);
console.log(`✓ Unlocked correction ${correction.correctionId}`);

// Step 5: Export training dataset
console.log('\nStep 5: Exporting training dataset...');

const exportResult = correctionEngine.exportDataset({
  sceneIds: ['scene_01'],
  format: 'jsonl',
  includeCorrections: true,
  includePreferences: true,
  includeCriticReports: false,
  privacyLevel: 'studio_only',
  outputPath: path.join(outputDir, 'training_dataset.jsonl')
});

console.log(`✓ Exported dataset: ${exportResult.exportId}`);
console.log(`  Path: ${exportResult.path}`);
console.log(`  Items: ${exportResult.count}\n`);

// Step 6: Statistics
console.log('Step 6: Correction statistics...');
const stats = correctionEngine.getStats();
console.log(`✓ Total corrections: ${stats.totalCorrections}`);
console.log(`✓ Total preferences: ${stats.totalPreferences}`);
console.log(`✓ Total training samples: ${stats.totalSamples}`);
console.log(`✓ Scenes with corrections: ${stats.scenesWithCorrections}\n`);

console.log('═══════════════════════════════════════════════════');
console.log('Iteration 10 Demo Complete!');
console.log('═══════════════════════════════════════════════════');
console.log('\nOutputs:');
console.log(`  Corrections: ${outputDir}/artist_corrections.json`);
console.log(`  Training dataset: ${outputDir}/training_dataset.jsonl`);
console.log('\nNext: Full production pipeline integration\n');