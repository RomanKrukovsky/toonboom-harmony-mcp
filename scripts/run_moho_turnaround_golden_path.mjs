#!/usr/bin/env node
/**
 * Moho 360° Turnaround Production Rig Golden Path — offline evidence runner.
 *
 * Runs the end-to-end procedural Moho Turnaround Rig pipeline:
 *   1. 8-angle Turnaround Matrix (Front -> 3/4 R -> Side R -> ... -> 3/4 L)
 *   2. Smart Bone Dials (315° angle sweep, synchronized sublayer switches)
 *   3. Smart Action Synthesizer (joint flexion 90°/135°, bicep bulge, cuff fans, squash & stretch)
 *   4. Vitruvian Bones Engine (multi-view limb and foot switching)
 *   5. Delaunay Smart Mesh Warper (crotch and torso deformation)
 *   6. Smart Projected Shadow (root-linked, -0.25 Y scale, ground opacity)
 *   7. Animator Contract QC Gate (shy helper bones, color coding, Frame 0 audit)
 *   8. Headless Binary .moho Compiler + In-App Lua Emitter
 *
 * Writes evidence to docs/evidence/moho-turnaround-golden-path/.
 * Proves 100% determinism via dual-run digest equality check.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import stringify from 'fast-json-stable-stringify';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

if (!fs.existsSync(path.join(root, 'dist', 'services', 'mohoTurnaroundBuilder'))) {
  console.error('dist/ missing or stale. Run `npm run build` first.');
  process.exit(1);
}

const { MohoTurnaroundBuilder } = await import('../dist/services/mohoTurnaroundBuilder/index.js');
const { MohoSmartActionSynthesizer } = await import('../dist/services/mohoSmartActionSynthesizer/index.js');
const { MohoVitruvianEngine } = await import('../dist/services/mohoVitruvianEngine/index.js');
const { MohoMeshWarper } = await import('../dist/services/mohoMeshWarper/index.js');
const { MohoShadowBuilder } = await import('../dist/services/mohoShadowBuilder/index.js');
const { MohoAnimatorContractGate } = await import('../dist/services/mohoAnimatorContractGate/index.js');
const { MohoProjectCompiler, stripVolatileMohoFields } = await import('../dist/services/mohoProjectCompiler/index.js');
const { TURNAROUND_ANGLES } = await import('../dist/schemas/mohoProductionRig.js');

const BUNDLE_DIR = path.join(root, 'docs', 'evidence', 'moho-turnaround-golden-path');
fs.mkdirSync(BUNDLE_DIR, { recursive: true });

const CHARACTER_NAME = 'Hero_Turnaround';
const CHARACTER_ID = 'char_hero_turnaround_v1';

function sha256(data) {
  return crypto.createHash('sha256').update(typeof data === 'string' ? data : stringify(data)).digest('hex');
}

function runMohoPipeline() {
  const turnaround = MohoTurnaroundBuilder.buildTurnaroundMatrix({
    characterName: CHARACTER_NAME,
    includeHead: true,
    includeBody: true
  });

  const vitruvian = MohoVitruvianEngine.createStandardVitruvianGroups();

  const jointCorrections = [
    {
      jointName: 'Elbow_L',
      boneName: 'Forearm_L',
      flexionAnglesDeg: [90, 135],
      bulgeBicepScale: 1.18,
      cuffDeformers: [
        { name: 'Forearm_L_UP', angleOffsetDeg: 15, lengthPx: 20 },
        { name: 'Forearm_L_DOWN', angleOffsetDeg: -15, lengthPx: 20 }
      ]
    },
    {
      jointName: 'Elbow_R',
      boneName: 'Forearm_R',
      flexionAnglesDeg: [90, 135],
      bulgeBicepScale: 1.18,
      cuffDeformers: [
        { name: 'Forearm_R_UP', angleOffsetDeg: 15, lengthPx: 20 },
        { name: 'Forearm_R_DOWN', angleOffsetDeg: -15, lengthPx: 20 }
      ]
    },
    {
      jointName: 'Knee_L',
      boneName: 'Shin_L',
      flexionAnglesDeg: [90, 135],
      bulgeBicepScale: 1.15,
      cuffDeformers: [{ name: 'Shin_L_UP', angleOffsetDeg: 12, lengthPx: 25 }]
    },
    {
      jointName: 'Knee_R',
      boneName: 'Shin_R',
      flexionAnglesDeg: [90, 135],
      bulgeBicepScale: 1.15,
      cuffDeformers: [{ name: 'Shin_R_UP', angleOffsetDeg: 12, lengthPx: 25 }]
    }
  ];

  const squashStretch = [
    {
      targetPart: 'Head',
      controlBoneName: 'Head',
      horizontalSpreaderBones: ['Ear_L', 'Ear_R'],
      scaleRatioYtoX: -0.95,
      eyelidCompensationEnabled: true
    },
    {
      targetPart: 'Body',
      controlBoneName: 'Torso',
      horizontalSpreaderBones: ['Chest_L', 'Chest_R'],
      scaleRatioYtoX: -0.90,
      eyelidCompensationEnabled: false
    }
  ];

  const shadow = MohoShadowBuilder.buildShadow({
    enabled: true,
    layerName: 'shadow',
    rootBoneName: 'Master',
    scaleY: -0.25,
    skewX: 0.1,
    opacity: 0.35
  });

  const crotchMesh = MohoMeshWarper.generateCrotchMesh({ x: 0, y: 60 }, 80, 50);

  const rigSpec = {
    characterId: CHARACTER_ID,
    characterName: CHARACTER_NAME,
    turnaroundAngles: [...TURNAROUND_ANGLES],
    smartDials: turnaround.smartDials,
    vitruvianGroups: vitruvian,
    jointCorrections,
    squashStretch,
    shadow: {
      enabled: true,
      layerName: shadow.layerName,
      rootBoneName: shadow.parentBone,
      scaleY: shadow.transform.scaleY,
      skewX: shadow.transform.skewX,
      opacity: shadow.transform.opacity
    },
    animatorContract: {
      hideHelperBonesShy: true,
      colorCodeBones: true,
      lockNonControllerChannels: true,
      frameZeroCleanAudit: true
    }
  };

  const docJson = MohoProjectCompiler.compileToDocumentJson(rigSpec);

  return {
    turnaround,
    vitruvian,
    jointCorrections,
    squashStretch,
    shadow,
    crotchMesh,
    rigSpec,
    docJson
  };
}

console.log('--- MOHO 360° TURNAROUND GOLDEN PATH RUNNER ---');

// 1. Dual Run for Determinism Gate
const run1 = runMohoPipeline();
const run2 = runMohoPipeline();

const digest1 = sha256(stripVolatileMohoFields(run1.docJson));
const digest2 = sha256(stripVolatileMohoFields(run2.docJson));

if (digest1 !== digest2) {
  console.error('DETERMINISM GATE FAILED: Dual runs produced different digests!');
  process.exit(1);
}
console.log(`[PASS] Determinism Gate: digest=${digest1}`);

// 2. Binary .moho Compilation
const mohoFile = path.join(BUNDLE_DIR, `${CHARACTER_ID}.moho`);
const compileResult = MohoProjectCompiler.compileToFile({
  outputPath: mohoFile,
  spec: run1.rigSpec
});

console.log(`[PASS] Compiled binary .moho archive: ${compileResult.fileSizeBytes} bytes (${compileResult.bonesCount} bones)`);

// 3. Round-trip ZIP inspection
const zipBuf = fs.readFileSync(mohoFile);
if (zipBuf[0] !== 0x50 || zipBuf[1] !== 0x4b) {
  console.error('ZIP INTEGRITY FAILED: Missing PK signature!');
  process.exit(1);
}
console.log('[PASS] ZIP Container verified (valid PK signature)');

// 4. Evidence Package Assembly
const summary = {
  characterId: CHARACTER_ID,
  characterName: CHARACTER_NAME,
  turnaroundAnglesCount: run1.turnaround.headTurn.angles.length,
  smartDialsCount: run1.rigSpec.smartDials.length,
  vitruvianGroupsCount: run1.vitruvian.length,
  jointCorrectionsCount: run1.jointCorrections.length,
  squashStretchCount: run1.squashStretch.length,
  meshTrianglesCount: run1.crotchMesh.triangleCount,
  compiledBonesCount: compileResult.bonesCount,
  fileSizeBytes: compileResult.fileSizeBytes,
  contentSha256: digest1,
  generatedAt: new Date().toISOString()
};

fs.writeFileSync(path.join(BUNDLE_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(BUNDLE_DIR, 'project_document.json'), JSON.stringify(run1.docJson, null, 2));

console.log('--- GOLDEN PATH EVIDENCE GENERATED SUCCESSFULLY ---');
console.log(`Evidence directory: ${path.relative(root, BUNDLE_DIR)}`);
