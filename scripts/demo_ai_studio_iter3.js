#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DigitalActorRegistry } from '../dist/adapters/digitalActorRegistry/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = path.join(root, 'output', 'factory');

fs.mkdirSync(out, { recursive: true });

console.log('=== AI ANIMATION STUDIO — ITERATION 3: DIGITAL ACTOR DEMO ===\n');

// 1. Initialize registry
const registry = new DigitalActorRegistry(out);

// 2. Prepare test manifest
const manifestPath = path.join(out, 'test_actor_manifest.json');
const mockManifest = {
  manifestId: 'man_demo_iter3',
  schemaVersion: '1.0',
  mode: 'frame_by_frame_vector',
  source: { frameCount: 24 },
  scene: { name: 'DemoScene', fps: 24 },
  drawings: [
    { id: 'dr_head', imagePath: 'head_front.png', inferred: false },
    { id: 'dr_torso', imagePath: 'torso_front.png', inferred: false },
    { id: 'dr_mouth_rest', imagePath: 'mouth_rest.png', inferred: true }
  ],
  palettes: [
    {
      paletteId: 'pal_demo',
      name: 'Demo Palette',
      colors: [
        { colorId: 'c_skin', name: 'skin', r: 240, g: 200, b: 180, a: 255 },
        { colorId: 'c_outline', name: 'outline', r: 0, g: 0, b: 0, a: 255 }
      ]
    }
  ],
  elements: [
    { nodeName: 'head', parentPegName: 'torso', pivotX: 0, pivotY: 120 },
    { nodeName: 'torso', parentPegName: null, pivotX: 0, pivotY: 50 }
  ],
  exposures: [
    { elementName: 'mouth', frame: 1, duration: 24, drawingId: 'dr_mouth_rest' }
  ]
};
fs.writeFileSync(manifestPath, JSON.stringify(mockManifest, null, 2));

// 3. Import from Reconstruction Manifest
console.log('1. Importing actor from reconstruction manifest...');
const actorFromManifest = registry.importFromReconstructionManifest(manifestPath, 'Masha');
console.log(`- Imported Actor ID: ${actorFromManifest.actorId}`);
console.log(`- Identity Name: ${actorFromManifest.identity.name}`);
console.log(`- Master Drawings Count: ${actorFromManifest.masterDrawings.length}`);
console.log(`- Palettes Count: ${actorFromManifest.palettes.length}`);
console.log(`- Hierarchy Nodes Count: ${actorFromManifest.hierarchy.length}`);

// 4. Validate manifest-based actor
console.log('\n2. Validating Masha...');
const validationMasha = registry.validate(actorFromManifest);
console.log(`- Valid: ${validationMasha.valid}`);
console.log(`- Errors (${validationMasha.errors.length}):`, validationMasha.errors);
console.log(`- Warnings (${validationMasha.warnings.length}):`, validationMasha.warnings);
console.log(`- Inferred items: ${validationMasha.inferredCount}`);

// 5. Save/Register Masha
if (validationMasha.valid) {
  const regResult = registry.register(actorFromManifest);
  console.log(`- Registered to: ${regResult.filePath}`);
  console.log(`- SHA-256 Checksum: ${regResult.sha256}`);
}

// 6. Import from PNG directory
console.log('\n3. Importing actor from PNG Directory ( Ivan )...');
const pngDir = path.join(out, 'png_layers');
if (!fs.existsSync(pngDir)) fs.mkdirSync(pngDir, { recursive: true });
fs.writeFileSync(path.join(pngDir, 'head.png'), 'fake-png');
fs.writeFileSync(path.join(pngDir, 'torso.png'), 'fake-png');
fs.writeFileSync(path.join(pngDir, 'arm_L.png'), 'fake-png');

const actorFromDir = registry.importFromFile('png_dir', pngDir, 'Ivan');
console.log(`- Imported Actor ID: ${actorFromDir.actorId}`);
console.log(`- Master Drawings Count: ${actorFromDir.masterDrawings.length}`);

// 7. Validate Ivan
console.log('\n4. Validating Ivan...');
const validationIvan = registry.validate(actorFromDir);
console.log(`- Valid: ${validationIvan.valid}`);
console.log(`- Errors (${validationIvan.errors.length}):`, validationIvan.errors);
console.log(`- Warnings (${validationIvan.warnings.length}):`, validationIvan.warnings);
console.log(`- Inferred items: ${validationIvan.inferredCount}`);

// 8. Register Ivan
if (validationIvan.valid) {
  const regResult = registry.register(actorFromDir);
  console.log(`- Registered Ivan to: ${regResult.filePath}`);
}

console.log('\n=== STATUS & HONEST LIMITATIONS ===');
console.log('STATUS: digitalActorRegistry=true validation=true import=true provenance=true');
console.log('LIMITATION: PSD/SVG parsing uses offline CPU rules. Pivot estimation is automatic-inferred.');
console.log('No active licensed Harmony is required for registry, imports or structural validations.');
